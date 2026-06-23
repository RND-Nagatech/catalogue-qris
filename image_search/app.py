"""
FastAPI server untuk image search.
"""
from dotenv import load_dotenv
load_dotenv()

import os
import io
import sys
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Query

sys.path.insert(0, os.path.dirname(__file__))

from embedder import get_embedder
from qdrant_store import get_client, ensure_collection, search_similar

app = FastAPI(title="Image Search Engine", version="1.0.0")

# Init di startup
embedder = None
qdrant = None
collection_name = None


@app.on_event("startup")
async def startup():
    global embedder, qdrant, collection_name
    print("[app] Starting up...")
    embedder = get_embedder()
    qdrant = get_client()
    collection_name = ensure_collection(qdrant)
    print("[app] Ready.")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": embedder.model_name if embedder else "not loaded",
        "device": embedder.device if embedder else "N/A",
        "vector_size": embedder.vector_size if embedder else 0,
    }


@app.post("/search")
async def search_image(
    file: UploadFile = File(...),
    top_k: int = Query(default=20, ge=1, le=100),
    firebase_code: str = Query(default=None),
):
    """Search similar products by image."""
    if embedder is None:
        raise HTTPException(503, "Model not loaded")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # Extract embedding
        vec = embedder.embed(image)

        # Search Qdrant
        results = search_similar(
            qdrant,
            vec,
            top_k=top_k,
            collection_name=collection_name,
            filter_firebase_code=firebase_code,
        )

        return {"success": True, "data": results, "meta": {"top_k": top_k}}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Search failed: {str(e)}")


# ---- Index Builder API ----
import threading
import glob

index_progress = {"running": False, "total": 0, "indexed": 0, "skipped": 0, "errors": 0, "current_file": ""}

def _run_index(reset: bool = False):
    global index_progress, embedder, qdrant, collection_name
    index_progress = {"running": True, "total": 0, "indexed": 0, "skipped": 0, "errors": 0, "current_file": ""}

    try:
        from qdrant_store import barcode_to_id, insert_vectors

        sync_dir = os.path.abspath(os.getenv("SYNC_IMAGES_DIR", "../backend/sync_images"))
        if reset:
            try:
                qdrant.delete_collection(collection_name)
            except Exception:
                pass
        collection_name = ensure_collection(qdrant)

        # Load existing IDs
        existing_ids = set()
        try:
            offset = None
            while True:
                pts, offset = qdrant.scroll(collection_name=collection_name, limit=1000, with_payload=False, with_vectors=False, offset=offset)
                if pts:
                    for p in pts:
                        existing_ids.add(p.id)
                if offset is None:
                    break
        except Exception:
            pass

        all_files = sorted(glob.glob(os.path.join(sync_dir, "**", "*.jpg"), recursive=True))
        index_progress["total"] = len(all_files)

        batch_vecs, batch_payloads = [], []
        for i, filepath in enumerate(all_files):
            index_progress["current_file"] = os.path.basename(filepath)
            try:
                parts = filepath.replace(sync_dir, "").lstrip("/").split("/")
                if len(parts) >= 3:
                    firebase_code, barcode = parts[0], os.path.splitext(parts[-1])[0]
                else:
                    firebase_code, barcode = "UNKNOWN", os.path.splitext(os.path.basename(filepath))[0]

                pid = barcode_to_id(barcode)
                if pid in existing_ids:
                    index_progress["skipped"] += 1
                    continue

                img = Image.open(filepath)
                vec = embedder.embed(img)
                batch_vecs.append(vec)
                batch_payloads.append({"barcode": barcode, "firebaseCode": firebase_code, "localPath": filepath, "source": firebase_code})

                if len(batch_vecs) >= 100:
                    insert_vectors(qdrant, np.stack(batch_vecs, axis=0), batch_payloads, collection_name=collection_name, batch_size=100)
                    index_progress["indexed"] += len(batch_vecs)
                    batch_vecs, batch_payloads = [], []
            except Exception as e:
                index_progress["errors"] += 1

        if batch_vecs:
            insert_vectors(qdrant, np.stack(batch_vecs, axis=0), batch_payloads, collection_name=collection_name, batch_size=len(batch_vecs))
            index_progress["indexed"] += len(batch_vecs)

    except Exception as e:
        index_progress["errors"] += 1
        index_progress["current_file"] = str(e)
    finally:
        index_progress["running"] = False


@app.post("/index/start")
async def start_index(reset: bool = Query(default=False)):
    if index_progress["running"]:
        raise HTTPException(409, "Index build already running")
    threading.Thread(target=_run_index, args=(reset,), daemon=True).start()
    return {"success": True, "message": "Index build started", "reset": reset}


@app.get("/index/status")
async def index_status():
    return {"success": True, "data": index_progress}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3751"))
    uvicorn.run(app, host="0.0.0.0", port=port)

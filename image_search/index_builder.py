"""
Build index: baca sync_images → DINOv2 embed → insert ke Qdrant per 100 batch.
Jalankan setelah sync gambar selesai. Bisa dijalankan ulang — hanya proses gambar baru.

Usage:
  python index_builder.py
  python index_builder.py --reset   (hapus index lama & rebuild dari awal)
"""
from dotenv import load_dotenv
load_dotenv()

import os
import sys
import glob
import argparse
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))

from embedder import get_embedder
from qdrant_store import get_client, ensure_collection, insert_vectors, barcode_to_id

INSERT_BATCH = 100  # Insert ke Qdrant setiap N gambar


def build_index(reset: bool = False):
    sync_dir = os.getenv("SYNC_IMAGES_DIR", "../backend/sync_images")
    sync_dir = os.path.abspath(sync_dir)

    if not os.path.isdir(sync_dir):
        print(f"[index] ERROR: sync_images dir not found: {sync_dir}")
        return

    # Init embedder & Qdrant
    embedder = get_embedder()
    qdrant = get_client()

    if reset:
        collection = os.getenv("QDRANT_COLLECTION", "products")
        try:
            qdrant.delete_collection(collection)
            print(f"[index] Deleted collection '{collection}'")
        except Exception:
            pass

    collection = ensure_collection(qdrant)

    # Load existing point IDs dari Qdrant untuk skip
    print("[index] Loading existing index...")
    existing_ids = set()
    try:
        offset = None
        while True:
            points, offset = qdrant.scroll(
                collection_name=collection,
                limit=1000,
                with_payload=False,
                with_vectors=False,
                offset=offset,
            )
            if points:
                for p in points:
                    existing_ids.add(p.id)
            if offset is None:
                break
        print(f"[index] Found {len(existing_ids)} existing points. Will skip already indexed.")
    except Exception:
        print("[index] Could not load existing points — will index all.")

    # Cari semua .jpg
    pattern = os.path.join(sync_dir, "**", "*.jpg")
    all_files = sorted(glob.glob(pattern, recursive=True))
    total = len(all_files)
    print(f"[index] Found {total} images total in {sync_dir}")

    if not all_files:
        print("[index] No images to index.")
        return

    # Proses & insert per batch
    batch_vecs = []
    batch_payloads = []
    indexed = 0
    skipped = 0
    errors = 0

    for i, filepath in enumerate(all_files):
        try:
            # Parse path: sync_images/{firebaseCode}/foto_produk/{barcode}.jpg
            parts = filepath.replace(sync_dir, "").lstrip("/").split("/")
            if len(parts) >= 3:
                firebase_code = parts[0]
                barcode = os.path.splitext(parts[-1])[0]
            else:
                firebase_code = "UNKNOWN"
                barcode = os.path.splitext(os.path.basename(filepath))[0]

            point_id = barcode_to_id(barcode)

            # Skip jika sudah ada di Qdrant
            if point_id in existing_ids:
                skipped += 1
                # Print progress tetap tiap 500
                if (i + 1) % 500 == 0:
                    print(f"[index] Scanned {i+1}/{total} | indexed: {indexed} | skipped: {skipped} | errors: {errors}")
                continue

            img = Image.open(filepath)
            vec = embedder.embed(img)

            batch_vecs.append(vec)
            batch_payloads.append({
                "barcode": barcode,
                "firebaseCode": firebase_code,
                "localPath": filepath,
                "source": firebase_code,
            })

            # Insert batch setiap INSERT_BATCH gambar baru
            if len(batch_vecs) >= INSERT_BATCH:
                vectors = np.stack(batch_vecs, axis=0)
                insert_vectors(qdrant, vectors, batch_payloads, collection_name=collection, batch_size=INSERT_BATCH)
                indexed += len(batch_vecs)
                batch_vecs = []
                batch_payloads = []
                print(f"[index] ✅ Batch inserted | Progress: {i+1}/{total} | indexed: {indexed} | skipped: {skipped}")

        except Exception as e:
            errors += 1
            print(f"[index] ERROR {filepath}: {e}")

    # Insert sisa
    if batch_vecs:
        vectors = np.stack(batch_vecs, axis=0)
        insert_vectors(qdrant, vectors, batch_payloads, collection_name=collection, batch_size=len(batch_vecs))
        indexed += len(batch_vecs)

    print(f"[index] 🎉 Done! Indexed: {indexed} | Skipped: {skipped} | Errors: {errors} | Total: {total}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset existing index & rebuild all")
    args = parser.parse_args()
    build_index(reset=args.reset)

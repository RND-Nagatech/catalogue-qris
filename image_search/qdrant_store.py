"""
Qdrant wrapper — insert & search vectors.
"""
import os
import hashlib
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

def barcode_to_id(barcode: str) -> int:
    """Convert barcode string to deterministic unsigned 64-bit integer."""
    h = hashlib.sha256(barcode.encode()).digest()
    return int.from_bytes(h[:8], 'big') % (2**63)


def get_client() -> QdrantClient:
    url = os.getenv("QDRANT_URL", "http://localhost:6333")
    return QdrantClient(url=url)


def ensure_collection(
    client: QdrantClient,
    collection_name: str = None,
    vector_size: int = None,
):
    """Buat collection jika belum ada."""
    name = collection_name or os.getenv("QDRANT_COLLECTION", "products")
    size = vector_size or int(os.getenv("VECTOR_SIZE", "768"))

    collections = [c.name for c in client.get_collections().collections]
    if name not in collections:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=size, distance=Distance.COSINE),
        )
        print(f"[qdrant] Created collection '{name}' (size={size}, distance=Cosine)")
    return name


def insert_vectors(
    client: QdrantClient,
    vectors: np.ndarray,
    payloads: list[dict],
    collection_name: str = None,
    batch_size: int = 500,
):
    """Insert vectors ke Qdrant dalam batch."""
    name = collection_name or os.getenv("QDRANT_COLLECTION", "products")
    total = len(vectors)

    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        points = [
            PointStruct(
                id=barcode_to_id(payloads[i]["barcode"]),
                vector=vectors[i].tolist(),
                payload=payloads[i],
            )
            for i in range(start, end)
        ]
        client.upsert(collection_name=name, points=points)
        print(f"[qdrant] Inserted {start + 1}-{end} / {total}")

    print(f"[qdrant] Done — {total} vectors inserted.")


def search_similar(
    client: QdrantClient,
    query_vector: np.ndarray,
    top_k: int = None,
    collection_name: str = None,
    filter_firebase_code: str = None,
) -> list[dict]:
    """Search similar vectors di Qdrant. Return [{barcode, firebaseCode, score, ...}]."""
    name = collection_name or os.getenv("QDRANT_COLLECTION", "products")
    k = top_k or int(os.getenv("TOP_K", "20"))

    qdrant_filter = None
    if filter_firebase_code:
        qdrant_filter = Filter(
            must=[
                FieldCondition(
                    key="firebaseCode",
                    match=MatchValue(value=filter_firebase_code),
                )
            ]
        )

    # Versi qdrant-client terbaru pakai query_points
    results = client.query_points(
        collection_name=name,
        query=query_vector.tolist(),
        limit=k,
        with_payload=True,
    )

    return [
        {
            "barcode": r.payload.get("barcode"),
            "firebaseCode": r.payload.get("firebaseCode"),
            "source": r.payload.get("source"),
            "localPath": r.payload.get("localPath"),
            "score": round(float(r.score), 4),
        }
        for r in results.points
    ]

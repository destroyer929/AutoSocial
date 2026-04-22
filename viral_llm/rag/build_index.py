import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "instagram_viral.json"
INDEX_FILE = BASE_DIR / "viral_index.faiss"
DOCS_FILE = BASE_DIR / "viral_docs.json"

# Lightweight + high quality for your GPU
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def reel_to_text(reel: dict) -> str:
    """Convert reel metadata into a single semantic string"""
    parts = [
        f"Topic: {reel.get('topic', '')}",
        f"Hook: {reel.get('hook', '')}",
        f"Caption: {reel.get('caption', '')}",
        f"Hashtags: {' '.join(reel.get('hashtags', []))}",
        f"Audio: {reel.get('audio', '')}",
        f"Notes: {reel.get('notes', '')}",
    ]
    return " | ".join(parts)


def build_faiss_index():
    print("Loading dataset...")
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    texts = [reel_to_text(reel) for reel in data]

    print("Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL)

    print("Embedding reels...")
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        normalize_embeddings=True
    )

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # cosine similarity
    index.add(np.array(embeddings).astype("float32"))

    print(f"Saving FAISS index → {INDEX_FILE}")
    faiss.write_index(index, str(INDEX_FILE))

    print(f"Saving documents → {DOCS_FILE}")
    DOCS_FILE.write_text(json.dumps(texts, indent=2), encoding="utf-8")

    print("RAG index build complete ✅")


if __name__ == "__main__":
    build_faiss_index()

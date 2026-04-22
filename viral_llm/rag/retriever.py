import json
import faiss
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).parent
INDEX_FILE = BASE_DIR / "viral_index.faiss"
DOCS_FILE = BASE_DIR / "viral_docs.json"

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


class ViralRetriever:
    def __init__(self):
        self.model = SentenceTransformer(EMBEDDING_MODEL)
        self.index = faiss.read_index(str(INDEX_FILE))
        self.docs = json.loads(DOCS_FILE.read_text(encoding="utf-8"))

    def search(self, query: str, top_k: int = 5):
        query_embedding = self.model.encode(
            [query],
            normalize_embeddings=True
        ).astype("float32")

        scores, indices = self.index.search(query_embedding, top_k)

        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx < len(self.docs):
                results.append(self.docs[idx])

        return results


# 🔥 Singleton retriever (loaded ONCE)
_retriever = ViralRetriever()


def retrieve_viral_examples(query: str, k: int = 3):
    """
    Functional wrapper used by orchestrator
    """
    return _retriever.search(query, top_k=k)

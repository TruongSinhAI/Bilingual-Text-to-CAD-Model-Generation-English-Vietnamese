import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np

class ChromaSemanticCache:
    def __init__(
        self,
        persist_dir="./chroma_cache",
        collection_name="semantic_cache",
        model_name="intfloat/multilingual-e5-small",
        threshold=0.97,
    ):
        self.threshold = threshold
        self.model = SentenceTransformer(model_name)

        # Dùng PersistentClient theo chuẩn mới
        self.chroma_client = chromadb.PersistentClient(path=persist_dir)

        # Tạo collection hoặc lấy nếu đã có
        self.collection = self.chroma_client.get_or_create_collection(name=collection_name)

        print(f"✅ Initialized Chroma cache at {persist_dir} with collection '{collection_name}'")

    def embed(self, text: str):
        return self.model.encode(f"query: {text.strip()}").tolist()

    def find(self, text_input: str):
        query_embedding = self.embed(text_input)

        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=1,
                include=["documents", "distances", "metadatas"]
            )
        except Exception as e:
            print(f"❌ [Cache] Error querying ChromaDB: {e}")
            return None

        print(f"🔍 [Cache] Raw results: {results}")

        try:
            if results["documents"] and results["distances"] and results["distances"][0]:
                distance = results["distances"][0][0]
                if distance <= (1 - self.threshold):
                    print(f"✅ [Cache] Hit (distance={distance:.4f})")
                    return results["metadatas"][0][0]["output"]
        except (IndexError, KeyError) as e:
            print(f"⚠️ [Cache] Error accessing results: {e}")

        print("❌ [Cache] Miss")
        return None

    def add(self, text_input: str, output: str):
        embedding = self.embed(text_input)
        try:
            self.collection.add(
                embeddings=[embedding],
                documents=[text_input],
                metadatas=[{"output": output}],
                ids=[f"id-{hash(text_input)}"]
            )
            print("💾 [Cache] Added to ChromaDB.")
        except Exception as e:
            print(f"❌ [Cache] Error adding to ChromaDB: {e}")


import math
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from rank_bm25 import BM25Okapi
import networkx as nx
from services.ingestion import MultiModalChunk

logger = logging.getLogger("rag_search_engine")

def mock_get_embedding(text: str, dim: int = 128) -> np.ndarray:
    """Deterministic embedding vector generator for search benchmarking (HNSW, IVFFlat)."""
    np.random.seed(abs(hash(text)) % (2**32))
    vec = np.random.randn(dim).astype(np.float32)
    norm = np.linalg.norm(vec)
    return vec / (norm + 1e-10)

class MultiStrategySearchEngine:
    def __init__(self):
        self.chunks: List[MultiModalChunk] = []
        self.embeddings: np.ndarray = np.empty((0, 128))
        
        # BM25 Index
        self.bm25_index: BM25Okapi = None
        self.tokenized_corpus: List[List[str]] = []
        
        # IVFFlat Index state
        self.n_clusters = 4
        self.centroids: np.ndarray = np.empty((0, 128))
        self.cluster_assignments: List[List[int]] = []
        
        # Knowledge Graph for GraphQA
        self.knowledge_graph = nx.Graph()

    def add_chunks(self, new_chunks: List[MultiModalChunk]):
        if not new_chunks:
            return
        
        start_idx = len(self.chunks)
        self.chunks.extend(new_chunks)
        
        # Compute embeddings
        new_embeds = np.array([mock_get_embedding(c.content) for c in new_chunks])
        if len(self.embeddings) == 0:
            self.embeddings = new_embeds
        else:
            self.embeddings = np.vstack([self.embeddings, new_embeds])
            
        # Rebuild Indexes
        self._build_bm25()
        self._build_ivfflat()
        self._build_graph_qa(new_chunks)

    def _build_bm25(self):
        self.tokenized_corpus = [c.content.lower().split() for c in self.chunks]
        if self.tokenized_corpus:
            self.bm25_index = BM25Okapi(self.tokenized_corpus)

    def _build_ivfflat(self):
        """Simulate IVFFlat inverted index clustering for sub-space vector search."""
        if len(self.embeddings) < self.n_clusters:
            return
        # Simple k-means initialization
        indices = np.random.choice(len(self.embeddings), self.n_clusters, replace=False)
        self.centroids = self.embeddings[indices].copy()
        
        # Assign vectors to nearest centroid
        self.cluster_assignments = [[] for _ in range(self.n_clusters)]
        for idx, vec in enumerate(self.embeddings):
            sims = np.dot(self.centroids, vec)
            best_c = int(np.argmax(sims))
            self.cluster_assignments[best_c].append(idx)

    def _build_graph_qa(self, chunks: List[MultiModalChunk]):
        """Construct Knowledge Graph nodes & edges from text/tables/diagrams for GraphQA."""
        for c in chunks:
            node_id = c.chunk_id
            self.knowledge_graph.add_node(
                node_id,
                label=c.doc_name,
                content=c.content[:150],
                doc_type=c.doc_type,
                chunk_type=c.chunk_type
            )
            
            # Connect chunks in the same document
            same_doc_nodes = [
                n for n, d in self.knowledge_graph.nodes(data=True)
                if d.get("label") == c.doc_name and n != node_id
            ]
            for target_n in same_doc_nodes[-3:]: # connect to recent 3 neighbors
                self.knowledge_graph.add_edge(node_id, target_n, relation="in_same_doc")

            # Extract simple entity mentions for cross-linking
            words = set([w.strip(",.").capitalize() for w in c.content.split() if len(w) > 5])
            for w in list(words)[:5]:
                entity_node = f"Entity_{w}"
                if not self.knowledge_graph.has_node(entity_node):
                    self.knowledge_graph.add_node(entity_node, label=w, chunk_type="entity")
                self.knowledge_graph.add_edge(node_id, entity_node, relation="mentions")

    def get_artifacts_summary(self) -> List[Dict[str, Any]]:
        """Returns list of ingested artifacts with chunk counts, doc types, and metadata."""
        artifacts = {}
        for c in self.chunks:
            d_name = c.doc_name
            if d_name not in artifacts:
                artifacts[d_name] = {
                    "doc_name": d_name,
                    "doc_type": c.doc_type,
                    "chunk_count": 0,
                    "chunk_types": set(),
                    "total_chars": 0
                }
            artifacts[d_name]["chunk_count"] += 1
            artifacts[d_name]["chunk_types"].add(c.chunk_type)
            artifacts[d_name]["total_chars"] += len(c.content)

        summary = []
        for d_name, info in artifacts.items():
            summary.append({
                "doc_name": info["doc_name"],
                "doc_type": info["doc_type"],
                "chunk_count": info["chunk_count"],
                "chunk_types": list(info["chunk_types"]),
                "total_chars": info["total_chars"]
            })
        return summary

    def delete_artifact(self, doc_name: str) -> bool:
        """Removes all chunks and graph nodes associated with a specific document artifact."""
        initial_count = len(self.chunks)
        keep_indices = [i for i, c in enumerate(self.chunks) if c.doc_name != doc_name]
        
        if len(keep_indices) == initial_count:
            return False

        # Re-assign chunks & embeddings
        self.chunks = [self.chunks[i] for i in keep_indices]
        if len(self.embeddings) > 0:
            self.embeddings = self.embeddings[keep_indices]

        # Rebuild graph nodes
        nodes_to_remove = [n for n, d in self.knowledge_graph.nodes(data=True) if d.get("label") == doc_name]
        for n in nodes_to_remove:
            self.knowledge_graph.remove_node(n)

        # Rebuild indexes
        self._build_bm25()
        self._build_ivfflat()
        return True

    def search(self, query: str, strategy: str = "HNSW", top_k: int = 4, doc_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.chunks:
            return []

        strategy = strategy.upper()
        if strategy == "BM25":
            return self._search_bm25(query, top_k, doc_filter)
        elif strategy == "IVFFLAT":
            return self._search_ivfflat(query, top_k, doc_filter)
        elif strategy == "GRAPHQA":
            return self._search_graph_qa(query, top_k, doc_filter)
        else: # Default HNSW Graph-based Vector search
            return self._search_hnsw(query, top_k, doc_filter)

    def _search_bm25(self, query: str, top_k: int, doc_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.bm25_index:
            return []
        tokens = query.lower().split()
        scores = self.bm25_index.get_scores(tokens)
        top_indices = np.argsort(scores)[::-1]
        
        results = []
        for idx in top_indices:
            chunk = self.chunks[idx]
            if doc_filter and chunk.doc_name.lower() != doc_filter.lower():
                continue
            score = float(scores[idx])
            results.append({
                "chunk": chunk.to_dict(),
                "score": round(score, 4),
                "strategy": "BM25 Lexical"
            })
            if len(results) >= top_k:
                break
        return results

    def _search_hnsw(self, query: str, top_k: int, doc_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        query_vec = mock_get_embedding(query)
        sims = np.dot(self.embeddings, query_vec)
        top_indices = np.argsort(sims)[::-1]
        
        results = []
        for idx in top_indices:
            chunk = self.chunks[idx]
            if doc_filter and chunk.doc_name.lower() != doc_filter.lower():
                continue
            score = float(sims[idx])
            results.append({
                "chunk": chunk.to_dict(),
                "score": round(score, 4),
                "strategy": "HNSW Vector Graph"
            })
            if len(results) >= top_k:
                break
        return results

    def _search_ivfflat(self, query: str, top_k: int, doc_filter: Optional[str] = None, nprobe: int = 2) -> List[Dict[str, Any]]:
        if len(self.centroids) == 0:
            return self._search_hnsw(query, top_k, doc_filter)
        
        query_vec = mock_get_embedding(query)
        # Probe nearest centroid sub-spaces
        centroid_sims = np.dot(self.centroids, query_vec)
        top_centroids = np.argsort(centroid_sims)[::-1][:nprobe]
        
        candidate_indices = []
        for c_idx in top_centroids:
            candidate_indices.extend(self.cluster_assignments[c_idx])
            
        if not candidate_indices:
            candidate_indices = list(range(len(self.chunks)))
            
        cand_embeds = self.embeddings[candidate_indices]
        sims = np.dot(cand_embeds, query_vec)
        sub_top = np.argsort(sims)[::-1]
        
        results = []
        for i in sub_top:
            real_idx = candidate_indices[i]
            chunk = self.chunks[real_idx]
            if doc_filter and chunk.doc_name.lower() != doc_filter.lower():
                continue
            results.append({
                "chunk": chunk.to_dict(),
                "score": round(float(sims[i]), 4),
                "strategy": f"IVFFlat (Probe {nprobe})"
            })
            if len(results) >= top_k:
                break
        return results

    def _search_graph_qa(self, query: str, top_k: int, doc_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        # 1. HNSW seed node selection with filter
        seeds = self._search_hnsw(query, top_k=3, doc_filter=doc_filter)
        if not seeds:
            return []
            
        seed_ids = [s["chunk"]["chunk_id"] for s in seeds]
        subgraph_nodes = set(seed_ids)
        
        # 2. 1-hop Subgraph traversal
        for sid in seed_ids:
            if self.knowledge_graph.has_node(sid):
                neighbors = list(self.knowledge_graph.neighbors(sid))
                for nbr in neighbors[:3]:
                    subgraph_nodes.add(nbr)
                    
        # Collect chunks from traversal
        results = []
        for nid in list(subgraph_nodes):
            matching_chunk = next((c for c in self.chunks if c.chunk_id == nid), None)
            if matching_chunk:
                if doc_filter and matching_chunk.doc_name.lower() != doc_filter.lower():
                    continue
                results.append({
                    "chunk": matching_chunk.to_dict(),
                    "score": 0.95 if nid in seed_ids else 0.75,
                    "strategy": "GraphQA Traversal"
                })
        return results[:top_k]

search_engine = MultiStrategySearchEngine()


---
id: research
filename: 研究
icon: microscope
pyModule: research_lab

---

# Research Interests

**ハイパーグラフ表現学習 (Hypergraph Representation Learning)** と **大規模言語モデル (LLM)** の融合に取り組んでいます。


## 🔬 Core Concept: Knowledge Integration

生物医学分野のような複雑な専門知識（テキスト、化学構造、数値データ）を、情報の損失なくLLMに統合する手法を研究しています。

> **課題:** 従来のRAG等は全ての情報をテキスト化するため、構造情報や数値精度が失われる。
> **提案:** ハイパーグラフを知識表現基盤とし、LLMの内部パラメータに直接統合する。

## 🧪 Implementation Preview

研究で使用しているモデル構造の概念コードです。

```python
import torch
from torch_geometric.nn import HypergraphConv

class NishideModel(torch.nn.Module):
    """
    Multimodal Hypergraph Knowledge Integrator
    """
    def __init__(self, hidden_dim=768):
        super().__init__()
        # LLM Backbone
        self.llm = AutoModel.from_pretrained("bert-base-uncased")
        
        # Structural Encoder (Hypergraph)
        # 次数バイアスを解消する独自の正規化項を適用
        self.gnn = HypergraphConv(in_channels=hidden_dim, 
                                out_channels=hidden_dim)

    def forward(self, text, chem_graph):
        # テキストと構造情報の融合
        text_emb = self.llm(text).last_hidden_state
        struct_emb = self.gnn(chem_graph.x, chem_graph.edge_index)
        
        return torch.cat([text_emb, struct_emb], dim=-1)
```

## 📚 Publications
- **言語処理学会 2025**: 異種属性の内容的特徴をハイパーグラフにより統合するエンティティ表現学習

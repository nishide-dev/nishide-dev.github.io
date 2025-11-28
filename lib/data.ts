export type FileData = {
  id: string
  filename: string
  path: string
  icon: string // We'll map this to Lucide icons in the component
  pyModule: string
  lang: "markdown" | "python" | "javascript" | "json" | "typescript"
  content: string
}

export const fileSystem: Record<string, FileData> = {
  "/about": {
    id: "about",
    filename: "profile.md",
    path: "docs > profile.md",
    icon: "user-circle",
    pyModule: "profile",
    lang: "markdown",
    content: `
# Profile & Philosophy

私は **「食わず嫌いをしない (Voracious Learner)」** エンジニアです。
研究領域であるAIだけでなく、フロントエンド、バックエンド、インフラまで、課題解決に必要な技術は領域を問わず貪欲に習得します。

---

## 👨‍💻 Engineering Identity

技術を深く理解し、適切に使いこなすことを重視しています。以下は私のスキルセットの定義です。

\`\`\`python
class Engineer(Student):
    def __init__(self):
        self.name = "Ryusei Nishide"
        self.role = "M1 Student @ TTI"
        
        # 実務経験年数とスキル
        self.skills = {
            "Research": ["PyTorch", "PyG", "Transformers", "DGL"],
            "Web": ["Next.js", "TypeScript", "TailwindCSS"],
            "Infra": ["AWS", "Azure", "Docker", "GitHub Actions"]
        }

    def philosophy(self):
        """
        一次情報を参照し、技術のインデックスを広げ続ける。
        """
        return "Bridging Theory and Implementation"
\`\`\`

## 🚀 Background

- **Microbase Inc.** (2.5y): リードエンジニアとして行政システム開発を牽引
- **JPHACKS / 技育CAMP**: ハッカソン受賞歴多数
- **Toyota Technological Institute**: 知能情報メディア研究室
`,
  },
  "/research": {
    id: "research",
    filename: "research.py",
    path: "docs > research.md",
    icon: "microscope",
    pyModule: "research_lab",
    lang: "python",
    content: `
# Research Interests

**ハイパーグラフ表現学習 (Hypergraph Representation Learning)** と **大規模言語モデル (LLM)** の融合に取り組んでいます。

---

## 🔬 Core Concept: Knowledge Integration

生物医学分野のような複雑な専門知識（テキスト、化学構造、数値データ）を、情報の損失なくLLMに統合する手法を研究しています。

> **課題:** 従来のRAG等は全ての情報をテキスト化するため、構造情報や数値精度が失われる。
> **提案:** ハイパーグラフを知識表現基盤とし、LLMの内部パラメータに直接統合する。

## 🧪 Implementation Preview

研究で使用しているモデル構造の概念コードです。

\`\`\`python
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
\`\`\`

## 📚 Publications
- **言語処理学会 2025**: 異種属性の内容的特徴をハイパーグラフにより統合するエンティティ表現学習
`,
  },
  "/works": {
    id: "works",
    filename: "works.tsx",
    path: "docs > works.md",
    icon: "briefcase",
    pyModule: "portfolio",
    lang: "javascript",
    content: `
# Works & Projects

理論の実践（Implementation）としての開発実績です。

---

## 🏢 Microbase Inc.
**Lead Engineer (Long-term Intern)**

国土交通省 Project LINKS における行政文書自動構造化システムを開発。
要件定義からインフラ構築、独自LLMの実装までをフルサイクルで担当しました。

- **Stack**: Python, AWS (ECS/Lambda), LLM Agents
- **Impact**: 複雑な行政文書の構造化精度を大幅に向上

## 🏆 Disaster Relief App
**TechCamp 2024 Effort Award**

通信遮断下でも動作するローカルLLM搭載の災害時支援アプリケーション。
エッジデバイス上での推論最適化を実現しました。

\`\`\`javascript
// Edge AI Implementation Concept
const runInference = async (input) => {
  // Offline-first approach
  if (!network.isConnected) {
    return await localLLM.generate(input, { quantized: true });
  }
  return await cloudAPI.generate(input);
};
\`\`\`

## 🎓 University Projects
- **Syllabus Chatbot**: Agentic RAGを用いた学内用チャットボット
- **Lab Website**: デザインからインフラまで一貫して構築
`,
  },
  "/contact": {
    id: "contact",
    filename: "contact.json",
    path: "docs > contact.md",
    icon: "envelope",
    pyModule: "contact",
    lang: "json",
    content: `
# Contact

開発や研究に関するご相談は、以下のチャネルからご連絡ください。

---

## 📬 Channels

- **GitHub**: [github.com/nishide-dev](https://github.com/nishide-dev)
- **X (Twitter)**: [@nishide_dev](https://twitter.com)
- **Email**: ryusei.nishide@example.com

\`\`\`json
{
  "status": "Open to collaboration",
  "location": "Nagoya, Japan",
  "interests": ["Generative AI", "Hypergraphs", "System Design"]
}
\`\`\`
`,
  },
}

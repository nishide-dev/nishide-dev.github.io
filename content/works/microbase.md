---
id: works/microbase
filename: microbase
icon: briefcase
pyModule: works.microbase

---

# Project LINKS (Microbase Inc.)

**Role**: Lead Engineer
**Period**: 2022 - Present

国土交通省 Project LINKS における行政文書自動構造化システムを開発。
要件定義からインフラ構築、独自LLMの実装までをフルサイクルで担当しました。

## Tech Stack
- **Frontend**: Next.js, TypeScript, TailwindCSS
- **Backend**: Python (FastAPI), Go
- **Infrastructure**: AWS (ECS, Lambda, RDS, S3), Terraform
- **AI**: OpenAI API, LangChain, Custom LLM Agents

## Key Achievements
- 複雑な行政文書の構造化精度を98%まで向上
- 処理時間を従来比50%削減
- チーム開発フローの整備（CI/CD, Code Review）

```javascript
// Example of the document processing pipeline
const processDocument = async (doc) => {
  const text = await ocr.extract(doc);
  const structure = await llm.analyze(text);
  return db.save(structure);
};
```

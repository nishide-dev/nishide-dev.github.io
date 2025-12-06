---
id: works/resq-link
filename: resq-link
icon: briefcase
pyModule: works.resq_link

tags: ["JavaScript", "Edge AI"]
---

# ResQ-Link

**TechCamp 2024 Effort Award**

通信遮断下でも動作するローカルLLM搭載の災害時支援アプリケーション。
エッジデバイス上での推論最適化を実現しました。

## Features
- **Offline-First**: 通信なしで動作
- **Local LLM**: 端末内で状況判断とアドバイス生成
- **Mesh Network**: 端末間通信による情報共有

```javascript
// Edge AI Implementation Concept
const runInference = async (input) => {
  // Offline-first approach
  if (!network.isConnected) {
    return await localLLM.generate(input, { quantized: true });
  }
  return await cloudAPI.generate(input);
};
```

# nishide-dev.github.io

個人ポートフォリオサイト。React + Vite の静的サイトとしてビルドし、GitHub Pages で配信する。

構成は [`nishide-dev/react-template`](https://github.com/nishide-dev/react-template) を基盤にしている。

## 開発

```bash
pnpm install
pnpm dev        # 開発サーバー (http://localhost:5173)
pnpm build      # 型チェック + 本番ビルド → dist/
pnpm preview    # dist/ をローカルで確認
pnpm lint       # Biome check
pnpm format     # Biome check --write
pnpm typecheck  # tsc --noEmit
pnpm test       # Vitest
```

package manager は pnpm のみを使用する。

## 技術構成

- React 19 / Vite / TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui + Base UI
- Biome (lint / format)
- Vitest + React Testing Library
- lefthook (pre-commit で Biome を実行)

## ロードマップ

再構築の全体像と個別タスクは Issue [#1](https://github.com/nishide-dev/nishide-dev.github.io/issues/1) を参照。

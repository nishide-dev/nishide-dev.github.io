# nishide-dev.github.io

個人ポートフォリオサイト。React + [Vite+](https://viteplus.dev) の静的サイトとしてビルドし、GitHub Pages で配信する。

ルーターを持たない単一ページで、`index.html` → `src/main.tsx` → `src/App.tsx` が入口の全て。構成は
[`nishide-dev/react-template`](https://github.com/nishide-dev/react-template) を基盤にしている。

## 開発

```bash
pnpm install
pnpm dev        # 開発サーバー (http://localhost:5173)
pnpm build      # 本番ビルド → dist/
pnpm preview    # dist/ をローカルで確認
pnpm lint       # oxlint
pnpm format     # oxfmt + 安全な lint 自動修正
pnpm typecheck  # 型チェック (oxlint の type-aware / tsgolint)
pnpm test       # Vitest
pnpm fonts      # src/styles/fonts.css を再生成
```

package manager は **pnpm のみ**を使用する。`vp` をグローバルに入れていても、リポジトリと CI が
同じバージョンを使うように **npm script 経由で叩く**こと。

`pnpm build` は型チェックをしない。4 つのゲート（lint / typecheck / test / build）は CI が個別に
実行し、typecheck が build より前に走る。

## 技術構成

- React 19 / TypeScript (strict)
- **Vite+** — Vite・Vitest・oxlint・oxfmt・tsgolint を 1 つのバイナリに統合したツールチェイン (MIT)
- Tailwind CSS v4
- shadcn/ui + Base UI
- Vitest + React Testing Library
- pre-commit フックは `vp hooks`（整形のみ。lint のゲートは CI）

ツールの設定は **`vite.config.ts` に集約**されている。`biome.json` も `lefthook.yml` も
`.oxlintrc.json` も無い。

## ドキュメント

設計判断の理由、やってはいけないこと、過去に踏んだ罠は [`CLAUDE.md`](./CLAUDE.md) にある。
コードを変える前にそちらを読むこと。

## ロードマップ

再構築の全体像は Issue [#1](https://github.com/nishide-dev/nishide-dev.github.io/issues/1)（完了・クローズ済み）。
以降の作業は個別の Issue で追う。

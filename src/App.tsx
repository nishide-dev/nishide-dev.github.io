export function App() {
  return (
    <main className="mx-auto max-w-page px-5 pt-10 pb-16 sm:px-6">
      <h1 className="font-medium text-title">nishide-dev</h1>

      <p className="mt-8 text-lead text-muted-foreground">
        React + Vite
        への移行中です。デザインシステムを適用しました。レイアウト、Timeline、GitHub
        Activity は後続の Issue で実装します。
      </p>

      <section className="mt-section">
        <h2 className="font-mono text-label text-muted-foreground uppercase">
          Links
        </h2>
        <ul className="mt-3">
          <li>
            <a
              className="font-mono text-micro"
              href="https://github.com/nishide-dev"
              rel="noreferrer"
              target="_blank"
            >
              GitHub ↗
            </a>
          </li>
        </ul>
      </section>
    </main>
  )
}

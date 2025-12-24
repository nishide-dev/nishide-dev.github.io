import Image from "next/image"

export function ProfileHeader() {
  return (
    <div className="flex items-center gap-6 mb-8 not-prose">
      <div className="relative w-24 h-24 shrink-0 rounded-full overflow-hidden border-2 border-ide-accent/20">
        <Image
          src="/profile/profile.png"
          alt="Ryusei Nishide"
          fill
          className="object-cover"
          priority
        />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-ide-text mb-1">Ryusei Nishide</h1>
        <p className="text-ide-muted text-lg">
          Engineer / Researcher{" "}
          <a
            href="https://www.toyota-ti.ac.jp/lab/kde"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ide-accent transition-colors"
          >
            @TTI KDE Lab.
          </a>
        </p>
      </div>
    </div>
  )
}

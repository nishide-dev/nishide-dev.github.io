import { Bell, Bolt, CheckCircle, Eye, Leaf } from "lucide-react"

interface StatusBarProps {
  lang?: string
}

export function StatusBar({ lang }: StatusBarProps) {
  let name = "Ruff"
  let Icon = CheckCircle

  if (lang === "python") {
    name = "Ruff"
    Icon = Bolt
  } else if (lang === "javascript" || lang === "json" || lang === "typescript") {
    name = "Biome"
    Icon = Leaf
  }

  return (
    <div className="h-6 bg-ide-accent text-white text-[10px] flex items-center px-3 justify-between shrink-0 select-none shadow-[0_-1px_2px_rgba(0,0,0,0.1)] z-50">
      <div className="flex gap-4">
        <span className="cursor-pointer hover:opacity-80 flex items-center transition-all">
          <Icon size={12} className="mr-1" />
          {name}
        </span>
        <span className="cursor-pointer hover:opacity-80 flex items-center">
          <Eye size={12} className="mr-1" />
          Preview
        </span>
      </div>
      <div className="flex gap-4 opacity-90">
        <span className="cursor-pointer hover:opacity-80">Spaces: 4</span>
        {/* <span className="cursor-pointer hover:opacity-80">UTF-8</span> */}
        <span className="cursor-pointer hover:opacity-80">Python 3.12 (uv)</span>
        <span className="cursor-pointer hover:opacity-80">
          <Bell size={12} />
        </span>
      </div>
    </div>
  )
}

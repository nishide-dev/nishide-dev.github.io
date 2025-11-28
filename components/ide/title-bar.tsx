import { Columns, Search, Settings } from "lucide-react"

export function TitleBar() {
  return (
    <div className="h-8 bg-ide-panel border-b border-ide-border flex items-center justify-between px-3 shrink-0 z-50 text-xs select-none">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 hover:bg-green-500 transition-colors cursor-pointer" />
        </div>
        <span className="text-ide-text font-bold opacity-70">
          Nishide's Code — Portfolio Workspace
        </span>
      </div>
      <div className="flex gap-4 text-ide-muted">
        <span className="hover:text-ide-text cursor-pointer">
          <Search size={14} />
        </span>
        <span className="hover:text-ide-text cursor-pointer">
          <Columns size={14} />
        </span>
        <span className="hover:text-ide-text cursor-pointer">
          <Settings size={14} />
        </span>
      </div>
    </div>
  )
}

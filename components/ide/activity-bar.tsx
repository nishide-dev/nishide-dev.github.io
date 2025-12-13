import { Copy, GitBranch, Search, Settings, UserCircle } from "lucide-react"

import { useIdeContext } from "@/components/ide/ide-context"

export function ActivityBar() {
  const { setPaletteOpen } = useIdeContext()
  return (
    <div className="w-12 h-full bg-ide-panel border-r border-ide-border flex flex-col items-center py-3 gap-5 text-ide-muted shrink-0 z-40">
      <div
        title="Explorer"
        className="cursor-pointer border-l-2 border-ide-accent pl-3 -ml-3 box-content"
      >
        <Copy className="text-ide-text" size={20} />
      </div>
      <Search
        className="hover:text-ide-text cursor-pointer transition-colors"
        size={20}
        onClick={() => setPaletteOpen(true)}
      />
      <GitBranch className="hover:text-ide-text cursor-pointer transition-colors" size={20} />
      <div className="mt-auto flex flex-col gap-5">
        <UserCircle className="hover:text-ide-text cursor-pointer transition-colors" size={20} />
        <Settings className="hover:text-ide-text cursor-pointer transition-colors" size={20} />
      </div>
    </div>
  )
}

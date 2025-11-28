"use client"

import { Briefcase, ChevronRight, Columns, Mail, Microscope, UserCircle, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { fileSystem } from "@/lib/data"

// Map icon strings to components
const IconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "user-circle": UserCircle,
  microscope: Microscope,
  briefcase: Briefcase,
  envelope: Mail,
}

interface EditorAreaProps {
  openTabs: string[]
  activeTabId: string | null
  onTabClick: (id: string) => void
  onTabClose: (id: string) => void
}

export function EditorArea({ openTabs, activeTabId, onTabClick, onTabClose }: EditorAreaProps) {
  const activeFile = activeTabId
    ? Object.values(fileSystem).find((f) => f.id === activeTabId)
    : null

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Tabs Bar */}
      <div className="h-9 bg-ide-panel border-b border-ide-border flex items-end px-0 select-none overflow-x-auto">
        {openTabs.map((tabId) => {
          const file = Object.values(fileSystem).find((f) => f.id === tabId)
          if (!file) return null
          const isActive = tabId === activeTabId
          const Icon = IconMap[file.icon] || UserCircle

          return (
            <button
              type="button"
              key={tabId}
              onClick={() => onTabClick(tabId)}
              className={`h-full px-4 flex items-center gap-2 text-xs cursor-pointer select-none min-w-fit border-r border-ide-border group bg-transparent border-none ${
                isActive
                  ? "bg-ide-bg text-ide-text border-t-2 border-t-ide-accent font-medium"
                  : "bg-ide-panel text-ide-muted hover:bg-ide-bg/50 transition-colors"
              }`}
            >
              <Icon size={14} className={isActive ? "text-ide-accent" : "text-ide-muted"} />
              <span>{file.filename}</span>
              <X
                size={12}
                className={`ml-2 p-0.5 rounded-md hover:bg-ide-border/50 ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tabId)
                }}
              />
            </button>
          )
        })}
      </div>

      {/* Editor Content Wrapper */}
      <div className="flex-1 relative bg-ide-bg overflow-hidden flex flex-col">
        {!activeFile ? (
          /* Empty State */
          <div className="absolute inset-0 flex flex-col items-center justify-center text-ide-muted opacity-100 transition-opacity duration-300 z-10 bg-ide-bg">
            <div className="w-20 h-20 mb-6 text-ide-accent opacity-20">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <title>Zen Mode Logo</title>
                <path d="M12 2L2 19h20L12 2zm0 3.8L18.4 17H5.6L12 5.8z" />
              </svg>
            </div>
            <p className="text-sm tracking-[0.2em] uppercase opacity-60 font-bold text-ide-accent">
              RYUSEI NISHIDE
            </p>
            <p className="text-[10px] mt-3 opacity-40 font-mono">
              Full-Cycle Engineer / Researcher
            </p>
            <p className="text-[10px] mt-1 opacity-30 font-mono">Type /about to start</p>
          </div>
        ) : (
          /* Document Container */
          <div className="absolute inset-0 flex flex-col z-20 bg-ide-bg animate-fade-in">
            {/* Breadcrumbs */}
            <div className="h-8 flex items-center px-4 text-xs text-ide-muted border-b border-ide-border/50 shrink-0 bg-ide-bg select-none font-mono">
              <span className="mr-2 opacity-50">nishide-portfolio</span>
              <ChevronRight size={10} className="mr-2 opacity-50" />
              <div className="flex items-center">
                {activeFile.path.split(">").map((p, i, arr) => {
                  const isLast = i === arr.length - 1
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Breadcrumbs have no unique ID
                    <div key={i} className="flex items-center">
                      <span
                        className={
                          isLast
                            ? "text-ide-text font-medium"
                            : "hover:text-ide-text cursor-pointer transition-colors"
                        }
                      >
                        {p.trim()}
                      </span>
                      {!isLast && <ChevronRight size={10} className="mx-2 opacity-50" />}
                    </div>
                  )
                })}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">
                  Preview
                </span>
                <Columns size={14} className="text-ide-muted hover:text-ide-text cursor-pointer" />
              </div>
            </div>

            {/* Markdown Body */}
            <div className="flex-1 overflow-auto p-8 md:p-12">
              <div className="markdown-body max-w-3xl mx-auto">
                <ReactMarkdown>{activeFile.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

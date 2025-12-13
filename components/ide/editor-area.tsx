"use client"
import { Briefcase, ChevronRight, Columns, Mail, Microscope, UserCircle, X } from "lucide-react"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import { PageNavigation } from "@/components/ide/page-navigation"
import type { FileData } from "@/lib/data"

// Map icon strings to components
const IconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "user-circle": UserCircle,
  microscope: Microscope,
  briefcase: Briefcase,
  envelope: Mail,
}

interface EditorAreaProps {
  fileSystem: Record<string, FileData>
  openTabs: string[]
  activeTabId: string | null
  onTabClick: (id: string) => void
  onTabClose: (id: string) => void
  onOpenFile: (id: string) => void
}

function syntaxHighlight(code: string, lang: string) {
  let html = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  if (lang === "python") {
    html = html
      .replace(/(#.*)/g, '<span class="token-comment">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span class="token-string">$1</span>')
      .replace(
        /\b(import|from|class|def|return|if|else|super|try|except|with|as)\b/g,
        '<span class="token-keyword">$1</span>'
      )
      .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="token-class">$1</span>')
      .replace(/(@[a-zA-Z0-9_]+)/g, '<span class="token-decorator">$1</span>')
      .replace(/\b([a-z_][a-zA-Z0-9_]*)(?=\()/g, '<span class="token-function">$1</span>')
  } else if (lang === "javascript" || lang === "json" || lang === "typescript") {
    html = html
      .replace(/(\/\/.*)/g, '<span class="token-comment">$1</span>')
      .replace(/(".*?")/g, '<span class="token-string">$1</span>')
      .replace(
        /\b(import|from|const|let|var|return|export|default|function|async|await)\b/g,
        '<span class="token-keyword">$1</span>'
      )
      .replace(/:/g, '<span class="text-ide-muted">:</span>')
  }
  return html
}

export function EditorArea({
  fileSystem,
  openTabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onOpenFile,
}: EditorAreaProps) {
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
              className={`h-full px-4 flex items-center gap-2 text-xs cursor-pointer select-none min-w-fit border-r border-ide-border group bg-transparent border-none ${isActive
                  ? "bg-ide-bg text-ide-text border-t-2 border-t-ide-accent font-medium"
                  : "bg-ide-panel text-ide-muted hover:bg-ide-bg/50 transition-colors"
                }`}
            >
              <Icon size={14} className={isActive ? "text-ide-accent" : "text-ide-muted"} />
              <span>{file.filename}</span>
              <X
                size={12}
                className={`ml-2 p-0.5 rounded-md hover:bg-ide-border/50 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
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
            <div className="w-20 h-20 mb-6 text-ide-accent opacity-40 relative">
              <Image
                src="/github-avatar.png"
                alt="Zen Mode Logo"
                fill
                className="rounded-full object-cover"
              />
            </div>
            <p className="text-sm tracking-[0.2em] uppercase opacity-80 font-bold text-ide-accent">
              RYUSEI NISHIDE
            </p>
            <a
              href="https://github.com/nishide-dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] mt-3 opacity-60 font-mono hover:text-ide-text hover:opacity-100 transition-all hover:underline"
            >
              @nishide-dev
            </a>
            <p className="text-[10px] mt-1 opacity-50 font-mono">Type /about to start</p>
          </div>
        ) : (
          /* Document Container */
          <div className="absolute inset-0 flex flex-col z-20 bg-ide-bg animate-fade-in">
            {/* Breadcrumbs */}
            <div className="h-8 flex items-center px-4 text-xs text-ide-muted border-b border-ide-border/50 shrink-0 bg-ide-bg select-none font-mono">
              <span className="mr-2 opacity-50">portfolio</span>
              <ChevronRight size={10} className="mr-2 opacity-50" />
              <div className="flex items-center">
                {(() => {
                  const segments = activeFile.id.split("/")
                  return segments.map((segment, i) => {
                    const isLast = i === segments.length - 1
                    const path = segments.slice(0, i + 1).join("/")
                    const file = Object.values(fileSystem).find((f) => f.id === path)
                    const isClickable = file && !isLast

                    return (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Breadcrumbs have no unique ID
                      <div key={i} className="flex items-center">
                        <button
                          type="button"
                          className={`flex items-center bg-transparent border-none p-0 ${isLast
                              ? "text-ide-text font-medium cursor-default"
                              : isClickable
                                ? "hover:text-ide-text cursor-pointer transition-colors"
                                : "opacity-50 cursor-default"
                            }`}
                          onClick={() => {
                            if (isClickable) {
                              onOpenFile(path)
                            }
                          }}
                        >
                          {file ? file.filename : segment}
                        </button>
                        {!isLast && <ChevronRight size={10} className="mx-2 opacity-50" />}
                      </div>
                    )
                  })
                })()}
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
                {activeFile.thumbnail && (
                  <div className="mb-8 w-full h-40 md:h-64 relative rounded-lg overflow-hidden border border-ide-border">
                    <Image
                      src={activeFile.thumbnail}
                      alt={`${activeFile.filename} thumbnail`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                {activeFile.lang === "mdx" && activeFile.renderedContent ? (
                  activeFile.renderedContent
                ) : (
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => {
                        const isInternal = href?.startsWith("/")
                        return (
                          <a
                            href={href}
                            onClick={(e) => {
                              if (isInternal && href) {
                                e.preventDefault()
                                onOpenFile(href)
                              }
                            }}
                            target={isInternal ? undefined : "_blank"}
                            rel={isInternal ? undefined : "noopener noreferrer"}
                          >
                            {children}
                          </a>
                        )
                      },
                      code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || "")
                        const lang = match ? match[1] : ""
                        if (match) {
                          return (
                            <code
                              className={className}
                              // biome-ignore lint/security/noDangerouslySetInnerHtml: Syntax highlighting
                              dangerouslySetInnerHTML={{
                                __html: syntaxHighlight(String(children).replace(/\n$/, ""), lang),
                              }}
                              {...props}
                            />
                          )
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {activeFile.content}
                  </ReactMarkdown>
                )}
                <PageNavigation
                  currentId={activeFile.id}
                  fileSystem={fileSystem}
                  onOpenFile={onOpenFile}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

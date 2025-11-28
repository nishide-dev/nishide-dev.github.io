"use client"

import { Plus, Trash, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { fileSystem } from "@/lib/data"

interface TerminalProps {
  onCommand: (cmd: string) => void
  onClear: () => void
  history: { type: "command" | "output" | "error"; content: string }[]
}

export function Terminal({ onCommand, onClear, history }: TerminalProps) {
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyBoxRef = useRef<HTMLDivElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll to bottom when history changes
  useEffect(() => {
    if (historyBoxRef.current) {
      historyBoxRef.current.scrollTop = historyBoxRef.current.scrollHeight
    }
  }, [history])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    if (val.startsWith("/")) {
      const matches = Object.keys(fileSystem).filter((cmd) => cmd.startsWith(val))
      setSuggestions(matches)
      setSelectedSuggestionIndex(0)
    } else {
      setSuggestions([])
      setSelectedSuggestionIndex(-1)
    }
  }

  const handleSuggestionNavigation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length)
      return true
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      return true
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      const idx = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0
      const cmd = suggestions[idx]
      if (e.key === "Enter") {
        onCommand(cmd)
        setInput("")
        setSuggestions([])
      } else {
        setInput(cmd)
      }
      return true
    }
    return false
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (handleSuggestionNavigation(e)) return
    }

    if (e.key === "Enter") {
      const cmd = input.trim()
      if (cmd) {
        onCommand(cmd)
        setInput("")
        setSuggestions([])
      }
    }
  }

  return (
    <div className="h-[35%] bg-ide-bg flex flex-col border-t border-ide-border shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-30 relative">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ide-border bg-ide-bg text-xs select-none">
        <div className="flex gap-5">
          <span className="font-bold border-b-2 border-ide-accent pb-2 -mb-2.5 text-ide-text cursor-pointer">
            TERMINAL
          </span>
          <span className="text-ide-muted hover:text-ide-text cursor-pointer transition-colors">
            OUTPUT
          </span>
          <span className="text-ide-muted hover:text-ide-text cursor-pointer transition-colors">
            DEBUG CONSOLE
          </span>
        </div>
        <div className="flex gap-3 text-ide-muted items-center">
          <Plus size={14} className="hover:text-ide-text cursor-pointer transition-colors" />
          <button
            type="button"
            onClick={onClear}
            title="Clear Terminal"
            className="hover:text-ide-text cursor-pointer transition-colors bg-transparent border-none p-0 flex items-center"
          >
            <Trash size={14} />
          </button>
          <X size={14} className="hover:text-ide-text cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 flex flex-col overflow-hidden relative p-4 font-mono">
        {/* Decor: Claude Code Box */}
        <div className="absolute top-4 right-4 hidden md:block z-10 pointer-events-none opacity-80">
          <div className="border border-ide-accent/20 bg-ide-accent/5 rounded p-3 flex gap-3 max-w-xs shadow-sm">
            <div className="w-8 h-8 bg-ide-accent/10 rounded flex items-center justify-center text-ide-accent text-lg font-bold">
              N
            </div>
            <div>
              <div className="text-[10px] font-bold text-ide-accent uppercase tracking-wide">
                Nishide's Code v2.4
              </div>
              <div className="text-[10px] text-ide-text mt-0.5">Python environment active.</div>
            </div>
          </div>
        </div>

        {/* History */}
        <div
          ref={historyBoxRef}
          className="flex-1 overflow-y-auto space-y-1 mb-2 pr-2 text-xs font-medium"
        >
          <div className="text-ide-muted">Nishide's Code [Version 2.4.0]</div>
          <div className="text-ide-muted">(c) 2025 Ryusei Nishide. All rights reserved.</div>
          <div className="h-2" />
          <div className="text-ide-muted">
            Type{" "}
            <span className="bg-ide-selection px-1 rounded text-ide-text border border-ide-border">
              /
            </span>{" "}
            to browse docs.
          </div>
          {history.map((item, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: History items have no unique ID
              key={i}
              className={`animate-fade-in mb-1 ${
                item.type === "error"
                  ? "text-red-500 pl-6"
                  : item.type === "output"
                    ? "text-ide-muted italic pl-6"
                    : ""
              }`}
            >
              {item.type === "command" ? (
                <>
                  <span className="text-ide-accent mr-2 font-bold">&gt;&gt;&gt;</span>
                  <span className="font-bold text-ide-text">{item.content}</span>
                </>
              ) : (
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted content from system
                <span dangerouslySetInnerHTML={{ __html: item.content }} />
              )}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="shrink-0 relative">
          <div className="flex items-center">
            <span className="text-ide-accent mr-2 font-bold">&gt;&gt;&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-ide-text placeholder-ide-muted/50 font-bold"
              autoComplete="off"
              spellCheck={false}
              // biome-ignore lint/a11y/noAutofocus: Terminal input needs autofocus
              autoFocus
            />
          </div>

          {/* Suggestions Popup */}
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-6 mb-2 w-64 bg-white border border-ide-border rounded-lg shadow-xl overflow-hidden transition-all duration-200 transform z-50">
              <div className="px-3 py-1.5 text-[9px] font-bold text-ide-muted uppercase bg-ide-panel border-b border-ide-border">
                Available Documents
              </div>
              <div className="max-h-48 overflow-y-auto">
                {suggestions.map((cmd, index) => {
                  const file = fileSystem[cmd]
                  return (
                    <button
                      type="button"
                      key={cmd}
                      className={`w-full px-3 py-2 cursor-pointer flex items-center justify-between text-[11px] group transition-colors bg-transparent border-none text-left ${
                        index === selectedSuggestionIndex ? "bg-ide-selection" : ""
                      }`}
                      onClick={() => {
                        onCommand(cmd)
                        setInput("")
                        setSuggestions([])
                        inputRef.current?.focus()
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ide-accent">{cmd}</span>
                        <span className="text-ide-muted font-mono">{file.filename}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

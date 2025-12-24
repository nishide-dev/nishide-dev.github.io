"use client"

import { FileText, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { FileData } from "@/lib/data"

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  fileSystem: Record<string, FileData>
  onOpenFile: (id: string) => void
}

export function CommandPalette({ isOpen, onClose, fileSystem, onOpenFile }: CommandPaletteProps) {
  const [input, setInput] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = Object.values(fileSystem).filter((file) => {
    if (!input) return true
    return (
      file.filename.toLowerCase().includes(input.toLowerCase()) ||
      file.id.toLowerCase().includes(input.toLowerCase())
    )
  })

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      setInput("")
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (items[selectedIndex]) {
          onOpenFile(items[selectedIndex].id)
          onClose()
        }
        break
      case "Escape":
        e.preventDefault()
        onClose()
        break
    }
  }

  if (!isOpen) return null

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop click
    // biome-ignore lint/a11y/noStaticElementInteractions: Backdrop click
    <div
      className="absolute inset-0 z-[70] flex justify-center pt-[20vh] bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Modal click propagation prevention */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Modal click propagation prevention */}
      <div
        className="w-[600px] max-w-[90%] bg-ide-bg rounded-none shadow-2xl border border-ide-border flex flex-col overflow-hidden max-h-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-ide-border gap-3">
          <Search className="text-ide-muted" size={18} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-ide-text placeholder-ide-muted text-lg"
            placeholder="Search files..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="text-[10px] bg-ide-panel border border-ide-border px-1.5 py-0.5 rounded text-ide-muted font-mono">
            ESC to close
          </div>
        </div>
        <div className="overflow-y-auto py-2">
          {items.map((file, index) => (
            <button
              key={file.id}
              type="button"
              className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                index === selectedIndex ? "bg-ide-selection/30" : "hover:bg-ide-panel"
              }`}
              onClick={() => {
                onOpenFile(file.id)
                onClose()
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <FileText
                size={16}
                className={index === selectedIndex ? "text-ide-accent" : "text-ide-muted"}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium truncate Transition-colors ${index === selectedIndex ? "text-ide-accent" : "text-ide-text"}`}
                >
                  {file.filename}
                </div>
                <div className="text-xs text-ide-muted truncate font-mono opacity-60">
                  {file.id}
                </div>
              </div>
              {index === selectedIndex && (
                <div className="text-[10px] text-ide-muted font-mono">Enter</div>
              )}
            </button>
          ))}
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-ide-muted">No matching files found</div>
          )}
        </div>
      </div>
    </div>
  )
}

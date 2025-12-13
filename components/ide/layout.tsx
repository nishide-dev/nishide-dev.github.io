"use client"

import { useEffect, useState } from "react"
import { CommandPalette } from "@/components/ide/command-palette"
import type { FileData } from "@/lib/data"
import { ActivityBar } from "./activity-bar"
import { EditorArea } from "./editor-area"
import { IdeProvider } from "./ide-context"
import { StatusBar } from "./status-bar"
import { TitleBar } from "./title-bar"

interface IdeLayoutProps {
  initialFileSystem: Record<string, FileData>
}

export function IdeLayout({ initialFileSystem }: IdeLayoutProps) {
  const [fileSystem] = useState(initialFileSystem)
  const [openTabs, setOpenTabs] = useState<string[]>(["about"])
  const [activeTabId, setActiveTabId] = useState<string | null>("about")
  const [isPaletteOpen, setPaletteOpen] = useState(false)
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  // Toggle palette with Cmd+K or Ctrl+K
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault()
          setPaletteOpen((prev) => !prev)
        }
      }
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const activeFile = activeTabId
    ? Object.values(fileSystem).find((f) => f.id === activeTabId)
    : null

  const openFile = (fileId: string) => {
    // Remove leading slash if present to match ID format
    const id = fileId.startsWith("/") ? fileId.slice(1) : fileId
    // Check if file exists with or without leading slash in ID
    const file = Object.values(fileSystem).find((f) => f.id === id || f.id === fileId)

    if (file) {
      if (!openTabs.includes(file.id)) {
        setOpenTabs((prev) => [...prev, file.id])
      }
      setActiveTabId(file.id)
      return true
    }
    return false
  }

  const handleTabClose = (id: string) => {
    const newTabs = openTabs.filter((tabId) => tabId !== id)
    setOpenTabs(newTabs)

    if (newTabs.length === 0) {
      setActiveTabId(null)
    } else if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1])
    }
  }

  return (
    <IdeProvider
      value={{
        onOpenFile: openFile,
        fileSystem,
        isPaletteOpen,
        setPaletteOpen,
        isSidebarOpen,
        setSidebarOpen,
      }}
    >
      <div className="flex flex-col h-screen bg-ide-bg text-ide-text font-mono overflow-hidden">
        <TitleBar />
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Sidebar */}
          <div className="hidden md:block h-full shrink-0">
            <ActivityBar />
          </div>

          {/* Mobile Sidebar (Drawer) */}
          <div
            className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
              isSidebarOpen ? "visible opacity-100" : "invisible opacity-0"
            }`}
          >
            {/* Backdrop */}
            <button
              type="button"
              className={`absolute inset-0 w-full h-full bg-black/50 transition-opacity duration-300 border-none cursor-default ${
                isSidebarOpen ? "opacity-100" : "opacity-0"
              }`}
              onClick={() => setSidebarOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSidebarOpen(false)
              }}
              aria-label="Close sidebar"
            />
            {/* Drawer */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-12 bg-ide-panel border-r border-ide-border flex flex-col items-center z-50 transform transition-transform duration-300 ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <ActivityBar />
            </div>
          </div>
          <div className="flex-1 flex flex-col min-w-0 bg-ide-bg relative">
            <EditorArea
              fileSystem={fileSystem}
              openTabs={openTabs}
              activeTabId={activeTabId}
              onTabClick={setActiveTabId}
              onTabClose={handleTabClose}
              onOpenFile={openFile}
            />
            {/* Command Palette Overlay */}
            <CommandPalette
              isOpen={isPaletteOpen}
              onClose={() => setPaletteOpen(false)}
              fileSystem={fileSystem}
              onOpenFile={openFile}
            />
          </div>
        </div>
        <StatusBar lang={activeFile?.lang} />
      </div>
    </IdeProvider>
  )
}

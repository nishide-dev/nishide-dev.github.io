"use client"

import { useState } from "react"
import { fileSystem } from "@/lib/data"
import { ActivityBar } from "./activity-bar"
import { EditorArea } from "./editor-area"
import { StatusBar } from "./status-bar"
import { Terminal } from "./terminal"
import { TitleBar } from "./title-bar"

export function IdeLayout() {
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [history, setHistory] = useState<
    { type: "command" | "output" | "error"; content: string }[]
  >([])

  const activeFile = activeTabId
    ? Object.values(fileSystem).find((f) => f.id === activeTabId)
    : null

  const handleCommand = (cmd: string) => {
    setHistory((prev) => [...prev, { type: "command", content: cmd }])

    if (cmd === "/clear") {
      setHistory([])
      return
    }

    if (cmd === "/close") {
      setOpenTabs([])
      setActiveTabId(null)
      return
    }

    const fileKey = Object.keys(fileSystem).find((key) => key === cmd)
    if (fileKey) {
      const file = fileSystem[fileKey]
      setHistory((prev) => [
        ...prev,
        {
          type: "output",
          content: `import ${file.pyModule}... <span class="text-green-600">done</span>`,
        },
      ])

      setTimeout(() => {
        if (!openTabs.includes(file.id)) {
          setOpenTabs((prev) => [...prev, file.id])
        }
        setActiveTabId(file.id)
      }, 300)
    } else {
      setHistory((prev) => [
        ...prev,
        {
          type: "error",
          content: `Traceback (most recent call last): Command '${cmd}' not found`,
        },
      ])
    }
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
    <div className="flex flex-col h-screen bg-ide-bg text-ide-text font-mono overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <ActivityBar />
        <div className="flex-1 flex flex-col min-w-0 bg-ide-bg">
          <EditorArea
            openTabs={openTabs}
            activeTabId={activeTabId}
            onTabClick={setActiveTabId}
            onTabClose={handleTabClose}
          />
          <div className="h-1 bg-ide-border cursor-row-resize hover:bg-ide-accent transition-colors" />
          <Terminal onCommand={handleCommand} onClear={() => setHistory([])} history={history} />
        </div>
      </div>
      <StatusBar lang={activeFile?.lang} />
    </div>
  )
}

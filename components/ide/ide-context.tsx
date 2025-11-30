"use client"

import { createContext, useContext } from "react"

import type { FileData } from "@/lib/data"

interface IdeContextType {
  onOpenFile: (id: string) => void
  fileSystem: Record<string, FileData>
}

const IdeContext = createContext<IdeContextType | null>(null)

export function useIdeContext() {
  const context = useContext(IdeContext)
  if (!context) {
    throw new Error("useIdeContext must be used within an IdeProvider")
  }
  return context
}

export const IdeProvider = IdeContext.Provider

import { ChevronLeft, ChevronRight } from "lucide-react"
import type { FileData } from "@/lib/data"
import { NAVIGATION_ORDER, type NavigationId } from "@/lib/navigation"

interface PageNavigationProps {
  currentId: string
  fileSystem: Record<string, FileData>
  onOpenFile: (id: string) => void
}

export function PageNavigation({ currentId, fileSystem, onOpenFile }: PageNavigationProps) {
  // Normalize ID (remove leading slash) for comparison
  const normalizedCurrentId = currentId.startsWith("/") ? currentId.slice(1) : currentId
  const currentIndex = NAVIGATION_ORDER.indexOf(normalizedCurrentId as NavigationId)

  if (currentIndex === -1) return null

  const prevId = currentIndex > 0 ? NAVIGATION_ORDER[currentIndex - 1] : null
  const nextId =
    currentIndex < NAVIGATION_ORDER.length - 1 ? NAVIGATION_ORDER[currentIndex + 1] : null

  // Helper to get file data
  const getFile = (id: string) => {
    // Try both with and without leading slash since fileSystem keys might vary
    return fileSystem[id] || fileSystem[`/${id}`]
  }

  const prevFile = prevId ? getFile(prevId) : null
  const nextFile = nextId ? getFile(nextId) : null

  return (
    <div className="mt-16 pt-8 border-t border-ide-border grid grid-cols-2 gap-4">
      <div className="flex justify-start">
        {prevId && prevFile && (
          <button
            type="button"
            onClick={() => onOpenFile(prevId)}
            className="group flex flex-col items-start gap-1 p-4 rounded-lg hover:bg-ide-panel transition-colors text-left"
          >
            <span className="text-xs text-ide-muted flex items-center gap-1 group-hover:text-ide-accent transition-colors">
              <ChevronLeft size={12} />
              Previous
            </span>
            <span className="text-sm font-medium text-ide-text group-hover:text-ide-accent transition-colors">
              {prevFile.filename}
            </span>
          </button>
        )}
      </div>

      <div className="flex justify-end">
        {nextId && nextFile && (
          <button
            type="button"
            onClick={() => onOpenFile(nextId)}
            className="group flex flex-col items-end gap-1 p-4 rounded-lg hover:bg-ide-panel transition-colors text-right"
          >
            <span className="text-xs text-ide-muted flex items-center gap-1 group-hover:text-ide-accent transition-colors">
              Next
              <ChevronRight size={12} />
            </span>
            <span className="text-sm font-medium text-ide-text group-hover:text-ide-accent transition-colors">
              {nextFile.filename}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

"use client"

import { useIdeContext } from "@/components/ide/ide-context"
import type { FileData } from "@/lib/data"
import { ProjectCard } from "./project-card"

interface ProjectGridProps {
  projects?: FileData[]
}

export function ProjectGrid({ projects: propProjects }: ProjectGridProps) {
  const { onOpenFile, fileSystem } = useIdeContext()

  const projects =
    propProjects ||
    Object.values(fileSystem).filter((f) => f.id.startsWith("works/") && f.id !== "works")

  if (!projects.length) {
    return <div className="text-ide-muted italic">No projects found.</div>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onClick={(id) => onOpenFile(id)} />
      ))}
    </div>
  )
}

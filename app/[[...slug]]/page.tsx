import { IdeLayout } from "@/components/ide/layout"
import { getAllFiles } from "@/lib/files"

interface PageProps {
  params: Promise<{
    slug?: string[]
  }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const fileSystem = await getAllFiles()

  // Reconstruct the file ID from the slug
  // e.g. /works/microbase -> slug: ["works", "microbase"] -> id: "works/microbase"
  // e.g. / -> slug: undefined -> id: undefined (will default to "about" in layout)
  const initialActiveId = slug ? slug.join("/") : undefined

  return <IdeLayout initialFileSystem={fileSystem} initialActiveId={initialActiveId} />
}

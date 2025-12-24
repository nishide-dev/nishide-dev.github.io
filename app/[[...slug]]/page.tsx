import { IdeLayout } from "@/components/ide/layout"
import { getAllFiles } from "@/lib/files"

interface PageProps {
  params: Promise<{
    slug?: string[]
  }>
}

export async function generateStaticParams() {
  const fileSystem = await getAllFiles()
  const paths = Object.values(fileSystem).map((file) => ({
    slug: file.id.split("/"),
  }))

  return [
    { slug: [] }, // Represents "/"
    ...paths,
  ]
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

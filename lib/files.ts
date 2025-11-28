import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { serialize } from "next-mdx-remote/serialize"
import type { FileData } from "./data"

const contentDirectory = path.join(process.cwd(), "content")

export async function getAllFiles(): Promise<Record<string, FileData>> {
  const fileSystem: Record<string, FileData> = {}

  async function processFile(fullPath: string, relativePath: string) {
    const fileContent = fs.readFileSync(fullPath, "utf8")
    const { data, content } = matter(fileContent)
    const id = `/${relativePath.replace(/\.(md|mdx)$/, "")}`
    const fileId = data.id ? `/${data.id}` : id
    const isMdx = fullPath.endsWith(".mdx")

    let serializedContent: FileData["serializedContent"]
    if (isMdx) {
      serializedContent = await serialize(content)
    }

    fileSystem[fileId] = {
      id: data.id || id.replace(/^\//, ""),
      filename: data.filename || path.basename(fullPath),
      path: `${data.filename || path.basename(fullPath)}`,
      icon: data.icon || "file-text",
      pyModule: data.pyModule || "module",
      lang: (data.lang as FileData["lang"]) || (isMdx ? "mdx" : "markdown"),
      content: content,
      serializedContent,
    }
  }

  async function readDirRecursive(dir: string) {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        await readDirRecursive(fullPath)
      } else if (file.endsWith(".md") || file.endsWith(".mdx")) {
        const relativePath = path.relative(contentDirectory, fullPath)
        await processFile(fullPath, relativePath)
      }
    }
  }

  await readDirRecursive(contentDirectory)
  return fileSystem
}

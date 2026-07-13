import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

export function listFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? listFiles(root, path) : [relative(root, path)]
    })
    .sort()
}

export function compareDirectories(expectedRoot, actualRoot) {
  const expectedFiles = listFiles(expectedRoot)
  const actualFiles = listFiles(actualRoot)
  const expectedSet = new Set(expectedFiles)
  const actualSet = new Set(actualFiles)

  const missing = expectedFiles.filter((file) => !actualSet.has(file))
  const extra = actualFiles.filter((file) => !expectedSet.has(file))
  const changed = expectedFiles.filter(
    (file) => actualSet.has(file) && !readFileSync(join(expectedRoot, file)).equals(readFileSync(join(actualRoot, file))),
  )

  return { missing, extra, changed }
}

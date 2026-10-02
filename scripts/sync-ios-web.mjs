import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const buildDirectory = 'ios-dist'
const appDirectory = 'ios/PaperPlaneRun/web'

if (!existsSync(`${buildDirectory}/index.html`)) {
  throw new Error(`Missing ${buildDirectory}/index.html; run the iOS Vite build before syncing`)
}

// macOS duplicate-copy artifacts ("index 2.html") and Vite build metadata must
// never reach the app bundle: the Xcode folder reference copies everything
// verbatim. Same exclusions as generate-service-worker.mjs.
function strayArtifactPaths(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === '.vite' ? [path] : strayArtifactPaths(path)
    return / \d+\.[^/]*$/.test(entry.name) ? [path] : []
  })
}

rmSync(appDirectory, { recursive: true, force: true })
cpSync(buildDirectory, appDirectory, { recursive: true })

// The Vite build writes .vite/ manifest metadata into the outDir itself; it is
// tooling with zero runtime use, so drop it at the source too — otherwise
// verify-ios-parity rightly refuses the tree.
for (const path of strayArtifactPaths(buildDirectory)) rmSync(path, { recursive: true, force: true })

// Defense in depth: prune anything that slipped through, then refuse to exit
// clean if strays still exist so the build fails loudly instead of shipping.
const strays = strayArtifactPaths(appDirectory)
for (const path of strays) rmSync(path, { recursive: true, force: true })
if (strayArtifactPaths(appDirectory).length > 0) {
  throw new Error('sync-ios-web: duplicate-copy artifacts or .vite/ metadata remain in the app bundle after pruning')
}

console.log(`sync-ios-web: refreshed ${appDirectory} from ${buildDirectory}`)

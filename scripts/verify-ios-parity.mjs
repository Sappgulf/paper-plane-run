import { existsSync } from 'node:fs'
import { compareDirectories, listFiles } from './ios-build-files.mjs'

const buildDirectory = 'ios-dist'
const appDirectory = 'ios/PaperPlaneRun/web'
const distDirectory = 'dist'

for (const directory of [buildDirectory, appDirectory]) {
  if (!existsSync(directory)) {
    throw new Error(`Missing ${directory}; run npm run build:ios first`)
  }
}

// macOS duplicate-copy artifacts ("index 2.html") and Vite build metadata must
// never ride into the app bundle — the Xcode folder reference ships them verbatim.
const junkPattern = /(^|\/)(.* \d+\.[^/]*|\.vite\/.*)$/
for (const directory of [buildDirectory, appDirectory]) {
  const junk = listFiles(directory).filter((file) => junkPattern.test(file) || file.split('/').includes('.vite'))
  if (junk.length > 0) {
    throw new Error(`Stray duplicate-copy/build-metadata files in ${directory}:\n${junk.join('\n')}\nDelete them before verifying parity.`)
  }
}

const differences = compareDirectories(buildDirectory, appDirectory)
const differenceCount = Object.values(differences).reduce((count, files) => count + files.length, 0)

if (differenceCount > 0) {
  const details = Object.entries(differences)
    .filter(([, files]) => files.length > 0)
    .map(([kind, files]) => `${kind}: ${files.join(', ')}`)
    .join('\n')
  throw new Error(`The bundled iOS game does not match the latest iOS web build:\n${details}\nRun npm run build:ios to refresh it.`)
}

// A stale file present in the app bundle but in neither current build tree
// means junk rode through a previous sync — the byte-exact check above cannot
// catch it when ios-dist drifted the same way.
const buildSet = new Set(listFiles(buildDirectory))
const appFiles = listFiles(appDirectory)
if (existsSync(distDirectory)) {
  const distSet = new Set(listFiles(distDirectory))
  const stale = appFiles.filter((file) => !buildSet.has(file) && !distSet.has(file))
  if (stale.length > 0) {
    throw new Error(`App bundle contains files present in neither ${buildDirectory} nor ${distDirectory}:\n${stale.join('\n')}`)
  }
} else {
  const stale = appFiles.filter((file) => !buildSet.has(file))
  if (stale.length > 0) {
    throw new Error(`App bundle contains files present in neither build tree (dist/ missing for cross-check):\n${stale.join('\n')}`)
  }
}

console.log(`verify-ios-parity: ${listFiles(buildDirectory).length} files match exactly`)

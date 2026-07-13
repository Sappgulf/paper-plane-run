import { existsSync } from 'node:fs'
import { compareDirectories, listFiles } from './ios-build-files.mjs'

const buildDirectory = 'ios-dist'
const appDirectory = 'ios/PaperPlaneRun/web'

for (const directory of [buildDirectory, appDirectory]) {
  if (!existsSync(directory)) {
    throw new Error(`Missing ${directory}; run npm run build:ios first`)
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

console.log(`verify-ios-parity: ${listFiles(buildDirectory).length} files match exactly`)

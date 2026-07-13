import { cpSync, existsSync, rmSync } from 'node:fs'

const buildDirectory = 'ios-dist'
const appDirectory = 'ios/PaperPlaneRun/web'

if (!existsSync(`${buildDirectory}/index.html`)) {
  throw new Error(`Missing ${buildDirectory}/index.html; run the iOS Vite build before syncing`)
}

rmSync(appDirectory, { recursive: true, force: true })
cpSync(buildDirectory, appDirectory, { recursive: true })

console.log(`sync-ios-web: refreshed ${appDirectory} from ${buildDirectory}`)

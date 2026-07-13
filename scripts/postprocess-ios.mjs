// WKWebView loads the iOS bundle over file://, where there is no server to
// negotiate CORS. Vite's default output tags the bundled module script and
// its stylesheet with crossorigin="" so real (https://) deployments get
// proper error reporting — but under file://, WebKit fetches the resource
// fine at the network layer and then silently refuses to apply/execute it
// as a CORS-mode load, with no catchable JS error. Confirmed by inspecting
// WebKit's own network log: the .js/.css requests complete with the right
// MIME type and byte count, the page just never renders styled or scripted.
// Stripping crossorigin only from the *local* module script and stylesheet
// (not the external Google Fonts preconnect, which legitimately needs it)
// fixes this without touching the web build at all.
import { readFileSync, writeFileSync } from 'node:fs'

const path = 'ios-dist/index.html'
const html = readFileSync(path, 'utf8')
const fixed = html
  .replace(/(<script type="module") crossorigin(\s+src=)/, '$1$2')
  .replace(/(<link rel="stylesheet") crossorigin(\s+href=)/, '$1$2')

if (fixed === html) {
  console.warn('postprocess-ios: no crossorigin attributes found to strip — check if Vite output changed shape')
}
writeFileSync(path, fixed)
console.log('postprocess-ios: stripped crossorigin from local module/stylesheet tags')

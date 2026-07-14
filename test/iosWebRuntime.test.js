import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const gameViewSource = readFileSync('ios/PaperPlaneRun/Sources/GameView.swift', 'utf8')

describe('iOS web runtime', () => {
  it('loads the offline game through a same-origin custom scheme', () => {
    expect(gameViewSource).toContain('WKURLSchemeHandler')
    expect(gameViewSource).toContain('setURLSchemeHandler')
    expect(gameViewSource).toContain('paper-plane://game/index.html')
    expect(gameViewSource).not.toContain('loadFileURL')
  })

  it('covers web startup with a branded native loading view and retryable failure state', () => {
    expect(gameViewSource).toContain('private let loadingView')
    expect(gameViewSource).toContain('Paper Plane Run')
    expect(gameViewSource).toContain('func webView(_ webView: WKWebView, didFinish')
    expect(gameViewSource).toContain('hideLoadingView()')
    expect(gameViewSource).toContain('Retry')
    expect(gameViewSource).toContain('#selector(retryLoad)')
  })
})

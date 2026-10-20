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

  it('reveals a recoverable loading panel after WebKit content termination', () => {
    expect(gameViewSource).toContain('func webViewWebContentProcessDidTerminate')
    expect(gameViewSource).toContain('loadingView.layer.removeAllAnimations()')
    expect(gameViewSource).toContain('loadingView.isHidden = false')
    expect(gameViewSource).toContain('loadingView.alpha = 1')
  })

  it('implements the JS dialogs WKWebView otherwise cancels', () => {
    expect(gameViewSource).toContain('runJavaScriptAlertPanelWithMessage')
    expect(gameViewSource).toContain('runJavaScriptConfirmPanelWithMessage')
    expect(gameViewSource).toContain('runJavaScriptTextInputPanelWithPrompt')
    expect(gameViewSource).toContain('UIAlertController')
  })

  it('bridges share, copy and photo-save because custom schemes are not secure contexts', () => {
    expect(gameViewSource).toContain('name: "shareText"')
    expect(gameViewSource).toContain('name: "sharePhoto"')
    expect(gameViewSource).toContain('name: "copyText"')
    expect(gameViewSource).toContain('UIPasteboard.general.string')
    expect(gameViewSource).toContain('UIActivityViewController')
  })

  it('forwards lifecycle, thermal, low-power, and memory-pressure signals to the renderer', () => {
    expect(gameViewSource).toContain('ProcessInfo.processInfo.thermalState')
    expect(gameViewSource).toContain('ProcessInfo.processInfo.isLowPowerModeEnabled')
    expect(gameViewSource).toContain('Notification.Name.NSProcessInfoPowerStateDidChange')
    expect(gameViewSource).toContain('UIApplication.didReceiveMemoryWarningNotification')
    expect(gameViewSource).toContain('paperplane:native-runtime')
    expect(gameViewSource).toContain('evaluateJavaScript')
    expect(gameViewSource).toContain('paperplane:native-paused')
    expect(gameViewSource).toContain('isIdleTimerDisabled = false')
  })
})

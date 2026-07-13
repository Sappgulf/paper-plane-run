import SwiftUI
import WebKit

/// Hosts the exact same web build that ships at paper-plane-run.vercel.app,
/// bundled locally so the game runs fully offline. This is a deliberate
/// choice over a from-scratch native rewrite: it guarantees the iOS app is
/// pixel- and physics-identical to the live site, since it IS the live
/// site's code, not a reimplementation of it.
struct GameView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> GameViewController {
        GameViewController()
    }

    func updateUIViewController(_ uiViewController: GameViewController, context: Context) {}
}

final class GameViewController: UIViewController, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0xC8 / 255, green: 0xDF / 255, blue: 0xF5 / 255, alpha: 1)

        let contentController = WKUserContentController()
        // Bridges for browser APIs WKWebView doesn't support (navigator.vibrate
        // never shipped in any iOS WebKit), so the same game code that already
        // calls Haptic.* on the web gets real Taptic Engine feedback here.
        contentController.add(self, name: "haptics")
        #if DEBUG
        // Forwards the web build's console.* calls to Xcode's console, since
        // there's no attached Safari Web Inspector session by default. Debug
        // builds only — no reason to pay the JS override cost in release.
        contentController.add(self, name: "consoleLog")
        let consoleScript = """
        (function() {
          const send = (level, args) => {
            try { window.webkit.messageHandlers.consoleLog.postMessage(level + ': ' + Array.from(args).map(String).join(' ')) } catch (e) {}
          };
          const orig = { log: console.log, warn: console.warn, error: console.error };
          console.log = function() { send('log', arguments); orig.log.apply(console, arguments) };
          console.warn = function() { send('warn', arguments); orig.warn.apply(console, arguments) };
          console.error = function() { send('error', arguments); orig.error.apply(console, arguments) };
          window.addEventListener('error', (e) => send('error', [e.message, e.filename, e.lineno]));
        })();
        """
        contentController.addUserScript(WKUserScript(source: consoleScript, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        #endif

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        webView.allowsBackForwardNavigationGestures = false
        webView.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        loadGame()
    }

    private func loadGame() {
        guard
            let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web"),
            let webRoot = Bundle.main.url(forResource: "web", withExtension: nil)
        else {
            presentLoadFailure()
            return
        }
        webView.loadFileURL(indexURL, allowingReadAccessTo: webRoot)
    }

    private func presentLoadFailure() {
        let label = UILabel()
        label.text = "Couldn't load the game bundle.\nTry reinstalling the app."
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .darkGray
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
        ])
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "consoleLog" {
            print("[JS] \(message.body)")
            return
        }
        guard message.name == "haptics", let pattern = message.body as? String else { return }
        switch pattern {
        case "tap":
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case "collect":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "nearMiss":
            UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        case "power":
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "crash":
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        case "wind":
            UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        default:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("[Nav] provisional navigation failed: \(error)")
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("[Nav] navigation failed: \(error)")
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("[Nav] finished loading")
    }

    // MARK: - WKUIDelegate

    // The game's share/photo panel calls navigator.share / clipboard; WKWebView
    // supports both natively on iOS 15+, so no bridge is needed for those —
    // just let the system share sheet present over this view controller.
    func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
        completionHandler(nil) // no long-press context menus over game canvas
    }
}

import SwiftUI
import UniformTypeIdentifiers
import WebKit

/// Serves the bundled Vite output from one private origin. ES modules loaded
/// from `file://` are rejected by current WebKit even when their files are
/// readable, leaving the styled menu visible but without any JavaScript.
final class GameBundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private let rootURL: URL?

    override init() {
        rootURL = Bundle.main.resourceURL?.appendingPathComponent("web", isDirectory: true).standardizedFileURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
        guard
            let requestURL = urlSchemeTask.request.url,
            requestURL.scheme == "paper-plane",
            requestURL.host == "game",
            let rootURL
        else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        let requestedPath = requestURL.path == "/" ? "index.html" : String(requestURL.path.dropFirst())
        let fileURL = rootURL.appendingPathComponent(requestedPath).standardizedFileURL
        let allowedRoot = rootURL.path.hasSuffix("/") ? rootURL.path : rootURL.path + "/"

        guard fileURL.path.hasPrefix(allowedRoot), FileManager.default.isReadableFile(atPath: fileURL.path) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        do {
            let data = try Data(contentsOf: fileURL, options: .mappedIfSafe)
            let mimeType = UTType(filenameExtension: fileURL.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
            let encoding = mimeType.hasPrefix("text/") || mimeType == "application/javascript" ? "utf-8" : nil
            let response = URLResponse(
                url: requestURL,
                mimeType: mimeType,
                expectedContentLength: data.count,
                textEncodingName: encoding
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {}
}

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
    private let gameBundleSchemeHandler = GameBundleSchemeHandler()
    private let loadingView = UIView()
    private var loadingConstraintsInstalled = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0xC8 / 255, green: 0xDF / 255, blue: 0xF5 / 255, alpha: 1)
        configureLoadingView()

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
        config.setURLSchemeHandler(gameBundleSchemeHandler, forURLScheme: "paper-plane")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        // Keep touch delivery enabled so tall DOM panels (Journey, Hangar,
        // results) can scroll on compact phones. The document itself remains
        // fixed by CSS; only explicit overflow panels consume vertical pans.
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.isDirectionalLockEnabled = true
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
        view.bringSubviewToFront(loadingView)

        loadGame()
    }

    private func configureLoadingView() {
        loadingView.subviews.forEach { $0.removeFromSuperview() }
        loadingView.backgroundColor = UIColor(red: 0xC8 / 255, green: 0xDF / 255, blue: 0xF5 / 255, alpha: 1)
        loadingView.translatesAutoresizingMaskIntoConstraints = false

        let card = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialLight))
        card.layer.cornerRadius = 28
        card.clipsToBounds = true
        card.translatesAutoresizingMaskIntoConstraints = false

        let plane = UILabel()
        plane.text = "✈︎"
        plane.font = .systemFont(ofSize: 56, weight: .semibold)
        plane.textColor = UIColor(red: 0x67 / 255, green: 0x50 / 255, blue: 0xB5 / 255, alpha: 1)

        let title = UILabel()
        title.text = "Paper Plane Run"
        title.font = .systemFont(ofSize: 25, weight: .heavy)
        title.textColor = UIColor(red: 0x3D / 255, green: 0x2C / 255, blue: 0x29 / 255, alpha: 1)

        let subtitle = UILabel()
        subtitle.text = "Folding the sky…"
        subtitle.font = .systemFont(ofSize: 14, weight: .bold)
        subtitle.textColor = UIColor(red: 0x7A / 255, green: 0x64 / 255, blue: 0x60 / 255, alpha: 1)

        let spinner = UIActivityIndicatorView(style: .medium)
        spinner.color = UIColor(red: 0x67 / 255, green: 0x50 / 255, blue: 0xB5 / 255, alpha: 1)
        spinner.startAnimating()

        let stack = UIStackView(arrangedSubviews: [plane, title, subtitle, spinner])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.contentView.addSubview(stack)
        loadingView.addSubview(card)

        if !loadingConstraintsInstalled {
            view.addSubview(loadingView)
            NSLayoutConstraint.activate([
                loadingView.topAnchor.constraint(equalTo: view.topAnchor),
                loadingView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                loadingView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                loadingView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            ])
            loadingConstraintsInstalled = true
        }

        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: loadingView.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: loadingView.centerYAnchor),
            card.widthAnchor.constraint(equalToConstant: 286),
            stack.topAnchor.constraint(equalTo: card.contentView.topAnchor, constant: 28),
            stack.bottomAnchor.constraint(equalTo: card.contentView.bottomAnchor, constant: -24),
            stack.leadingAnchor.constraint(equalTo: card.contentView.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: card.contentView.trailingAnchor, constant: -20),
        ])
    }

    private func hideLoadingView() {
        UIView.animate(withDuration: 0.22, animations: {
            self.loadingView.alpha = 0
        }, completion: { _ in
            self.loadingView.isHidden = true
        })
    }

    private func loadGame() {
        loadingView.isHidden = false
        loadingView.alpha = 1
        guard let indexURL = URL(string: "paper-plane://game/index.html") else {
            presentLoadFailure()
            return
        }
        webView.load(URLRequest(url: indexURL))
    }

    private func presentLoadFailure() {
        loadingView.subviews.forEach { $0.removeFromSuperview() }
        let message = UILabel()
        message.text = "The plane couldn't unfold.\nYour progress is safe."
        message.numberOfLines = 0
        message.textAlignment = .center
        message.font = .systemFont(ofSize: 18, weight: .bold)
        message.textColor = UIColor(red: 0x3D / 255, green: 0x2C / 255, blue: 0x29 / 255, alpha: 1)
        let retry = UIButton(type: .system)
        retry.setTitle("Retry", for: .normal)
        retry.titleLabel?.font = .systemFont(ofSize: 17, weight: .heavy)
        retry.addTarget(self, action: #selector(retryLoad), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [message, retry])
        stack.axis = .vertical
        stack.spacing = 18
        stack.translatesAutoresizingMaskIntoConstraints = false
        loadingView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: loadingView.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: loadingView.centerYAnchor),
        ])
        view.bringSubviewToFront(loadingView)
    }

    @objc private func retryLoad() {
        configureLoadingView()
        loadGame()
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
        presentLoadFailure()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("[Nav] navigation failed: \(error)")
        presentLoadFailure()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("[Nav] finished loading")
        hideLoadingView()
    }

    // MARK: - WKUIDelegate

    // The game's share/photo panel calls navigator.share / clipboard; WKWebView
    // supports both natively on iOS 15+, so no bridge is needed for those —
    // just let the system share sheet present over this view controller.
    func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
        completionHandler(nil) // no long-press context menus over game canvas
    }
}

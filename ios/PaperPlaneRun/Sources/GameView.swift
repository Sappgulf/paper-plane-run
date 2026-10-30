import AVFoundation
import SwiftUI
import UIKit
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

/// WKUserContentController strongly retains its registered handlers, so
/// registering the view controller directly creates a retain cycle
/// (controller → webView → configuration → contentController → controller)
/// that leaks the whole webview. This proxy breaks it: the content controller
/// retains only the proxy, which references its delegate weakly.
final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: (any WKScriptMessageHandler)?

    init(delegate: any WKScriptMessageHandler) {
        self.delegate = delegate
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
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
    private var runtimeObservers: [NSObjectProtocol] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0xC8 / 255, green: 0xDF / 255, blue: 0xF5 / 255, alpha: 1)
        configureLoadingView()
        // The audio session and WebKit setup block the main thread for seconds on a
        // cold start. Waiting one run-loop turn lets the loading card paint first.
        DispatchQueue.main.async { [weak self] in self?.startGameSession() }
    }

    private func startGameSession() {
        // WebAudio game: .ambient silences with the Ring/Silent switch and
        // mixes with (rather than interrupts) other apps' audio.
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("[AudioSession] setup failed: \(error)")
        }

        let contentController = WKUserContentController()
        // Bridges for browser APIs WKWebView doesn't support (navigator.vibrate
        // never shipped in any iOS WebKit), so the same game code that already
        // calls Haptic.* on the web gets real Taptic Engine feedback here.
        let scriptMessageHandler = WeakScriptMessageHandler(delegate: self)
        contentController.add(scriptMessageHandler, name: "haptics")
        contentController.add(scriptMessageHandler, name: "shareBackup")
        // Custom-scheme pages are not secure contexts, so navigator.share,
        // navigator.clipboard and <a download> cannot be relied on. These
        // handlers back the web build's share/copy/save actions natively.
        contentController.add(scriptMessageHandler, name: "shareText")
        contentController.add(scriptMessageHandler, name: "sharePhoto")
        contentController.add(scriptMessageHandler, name: "copyText")
        // The web build posts true while a flight is on screen; the idle timer
        // stays off for that stretch so the screen never sleeps mid-flight.
        contentController.add(scriptMessageHandler, name: "screenAwake")
        #if DEBUG
        // Forwards the web build's console.* calls to Xcode's console, since
        // there's no attached Safari Web Inspector session by default. Debug
        // builds only — no reason to pay the JS override cost in release.
        contentController.add(scriptMessageHandler, name: "consoleLog")
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

        observeNativeRuntimeConditions()

        loadGame()
    }

    // A flight is full-bleed, so the home indicator steps back and edge swipes
    // never land on the HUD or the plane. The status bar is hidden in Info.plist.
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    deinit {
        runtimeObservers.forEach(NotificationCenter.default.removeObserver)
    }

    private func observeNativeRuntimeConditions() {
        let center = NotificationCenter.default
        let notifications: [Notification.Name] = [
            ProcessInfo.thermalStateDidChangeNotification,
            Notification.Name.NSProcessInfoPowerStateDidChange,
            UIApplication.didBecomeActiveNotification,
        ]
        runtimeObservers.append(contentsOf: notifications.map { name in
            center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                self?.sendNativeRuntimeSignal()
            }
        })
        runtimeObservers.append(center.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.sendNativeRuntimeSignal(memoryPressure: true)
        })
        // While backgrounded/resigned, stop gameplay audio and rendering so the
        // game doesn't keep playing or burning battery off-screen.
        let pauseNotifications: [Notification.Name] = [
            UIApplication.willResignActiveNotification,
            UIApplication.didEnterBackgroundNotification,
        ]
        runtimeObservers.append(contentsOf: pauseNotifications.map { name in
            center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                guard let self else { return }
                // A backgrounded game must not hold the display awake, and a
                // transient resign (Control Center, call banner) may not fire
                // visibilitychange inside WebKit — ask the engine to pause.
                UIApplication.shared.isIdleTimerDisabled = false
                self.webView?.pauseAllMediaPlayback()
                self.webView?.evaluateJavaScript(
                    "window.dispatchEvent(new Event('paperplane:native-paused'));",
                    completionHandler: nil
                )
            }
        })
    }

    private func sendNativeRuntimeSignal(memoryPressure: Bool = false) {
        let thermalState: String
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: thermalState = "nominal"
        case .fair: thermalState = "fair"
        case .serious: thermalState = "serious"
        case .critical: thermalState = "critical"
        @unknown default: thermalState = "nominal"
        }
        let payload: [String: Any] = [
            "thermalState": thermalState,
            "lowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
            "memoryPressure": memoryPressure,
        ]
        guard
            let data = try? JSONSerialization.data(withJSONObject: payload),
            let json = String(data: data, encoding: .utf8)
        else { return }
        let script = "window.dispatchEvent(new CustomEvent('paperplane:native-runtime',{detail:\(json)}));"
        webView?.evaluateJavaScript(script) { _, error in
            if let error { print("[NativeRuntime] bridge failed: \(error)") }
        }
    }

    private func configureLoadingView() {
        loadingView.subviews.forEach { $0.removeFromSuperview() }
        loadingView.backgroundColor = UIColor(red: 0x79 / 255, green: 0xA9 / 255, blue: 0xBD / 255, alpha: 1)
        loadingView.translatesAutoresizingMaskIntoConstraints = false

        let artwork = UIImageView(image: UIImage(named: "LaunchArtwork"))
        artwork.contentMode = .scaleAspectFill
        artwork.clipsToBounds = true
        artwork.translatesAutoresizingMaskIntoConstraints = false
        loadingView.addSubview(artwork)

        let title = UILabel()
        title.text = "Paper Plane Run"
        title.font = UIFont(name: "Georgia", size: 32) ?? .systemFont(ofSize: 32, weight: .medium)
        title.textColor = .white
        title.shadowColor = UIColor.black.withAlphaComponent(0.45)
        title.shadowOffset = CGSize(width: 0, height: 1)
        title.adjustsFontSizeToFitWidth = true
        title.minimumScaleFactor = 0.75

        let subtitle = UILabel()
        subtitle.text = "A LITTLE PAPER. A BIG SKY."
        subtitle.font = .systemFont(ofSize: 11, weight: .semibold)
        subtitle.textColor = .white
        subtitle.shadowColor = UIColor.black.withAlphaComponent(0.45)
        subtitle.shadowOffset = CGSize(width: 0, height: 1)

        let spinner = UIActivityIndicatorView(style: .medium)
        spinner.color = .white
        spinner.startAnimating()

        let stack = UIStackView(arrangedSubviews: [title, subtitle, spinner])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        loadingView.addSubview(stack)

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
            artwork.topAnchor.constraint(equalTo: loadingView.topAnchor),
            artwork.bottomAnchor.constraint(equalTo: loadingView.bottomAnchor),
            artwork.leadingAnchor.constraint(equalTo: loadingView.leadingAnchor),
            artwork.trailingAnchor.constraint(equalTo: loadingView.trailingAnchor),
            stack.centerXAnchor.constraint(equalTo: loadingView.centerXAnchor),
            stack.topAnchor.constraint(equalTo: loadingView.safeAreaLayoutGuide.topAnchor, constant: 48),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: loadingView.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: loadingView.trailingAnchor, constant: -20),
        ])
    }

    private func hideLoadingView() {
        UIView.animate(withDuration: 0.22, animations: {
            self.loadingView.alpha = 0
        }, completion: { finished in
            guard finished else { return }
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
        UIApplication.shared.isIdleTimerDisabled = false
        loadingView.layer.removeAllAnimations()
        loadingView.isHidden = false
        loadingView.alpha = 1
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
        if message.name == "screenAwake" {
            UIApplication.shared.isIdleTimerDisabled = (message.body as? Bool) ?? false
            return
        }
        if message.name == "consoleLog" {
            print("[JS] \(message.body)")
            return
        }
        if message.name == "shareBackup" {
            guard let backup = message.body as? String else { return }
            DispatchQueue.main.async { [weak self] in self?.presentBackupShareSheet(backup) }
            return
        }
        if message.name == "copyText" {
            guard let text = message.body as? String, text.count <= 20_000 else { return }
            UIPasteboard.general.string = text
            return
        }
        if message.name == "shareText" {
            guard
                let payload = message.body as? [String: Any],
                let text = payload["text"] as? String,
                text.count <= 20_000
            else { return }
            let urlString = (payload["url"] as? String) ?? ""
            DispatchQueue.main.async { [weak self] in self?.presentTextShareSheet(text: text, urlString: urlString) }
            return
        }
        if message.name == "sharePhoto" {
            guard
                let payload = message.body as? [String: Any],
                let dataUrl = payload["dataUrl"] as? String,
                let filename = payload["filename"] as? String
            else { return }
            DispatchQueue.main.async { [weak self] in
                self?.presentPhotoShareSheet(dataUrl: dataUrl, filename: filename)
            }
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

    private func presentBackupShareSheet(_ backup: String) {
        guard viewIfLoaded?.window != nil,
              let data = backup.data(using: .utf8),
              data.count <= 2 * 1024 * 1024,
              (try? JSONSerialization.jsonObject(with: data)) != nil
        else {
            print("[BackupShare] rejected invalid or oversized progress export")
            return
        }

        let fileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("paper-plane-progress-\(UUID().uuidString).json")
        do {
            try data.write(to: fileURL, options: .atomic)
        } catch {
            print("[BackupShare] could not stage progress export: \(error)")
            return
        }

        let controller = UIActivityViewController(activityItems: [fileURL], applicationActivities: nil)
        controller.title = "Paper Plane Run Progress"
        controller.completionWithItemsHandler = { _, _, _, _ in
            try? FileManager.default.removeItem(at: fileURL)
        }
        if let popover = controller.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        present(controller, animated: true)
    }

    // MARK: - WKNavigationDelegate

    // The bundle is a self-contained offline game; the only reachable origin is
    // our own scheme. Cancelling everything else means a stray https link (in
    // fetched content, console, etc.) can never navigate the webview away.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.request.url?.scheme == "paper-plane" {
            decisionHandler(.allow)
        } else {
            print("[Nav] blocked navigation to: \(navigationAction.request.url?.absoluteString ?? "<nil>")")
            decisionHandler(.cancel)
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        print("[Nav] web content process terminated; awaiting pilot retry")
        presentLoadFailure()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        print("[Nav] provisional navigation failed: \(error)")
        presentLoadFailure()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        print("[Nav] navigation failed: \(error)")
        presentLoadFailure()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("[Nav] finished loading")
        sendNativeRuntimeSignal()
        hideLoadingView()
    }

    private func presentTextShareSheet(text: String, urlString: String) {
        guard viewIfLoaded?.window != nil else { return }
        var items: [Any] = [text]
        if let url = URL(string: urlString), url.scheme == "https" { items.append(url) }
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        controller.title = "Paper Plane Run"
        if let popover = controller.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        topPresenter?.present(controller, animated: true)
    }

    private func presentPhotoShareSheet(dataUrl: String, filename: String) {
        guard viewIfLoaded?.window != nil else { return }
        let marker = "base64,"
        guard
            dataUrl.count <= 12 * 1024 * 1024,
            let range = dataUrl.range(of: marker),
            let data = Data(base64Encoded: String(dataUrl[range.upperBound...])),
            data.count <= 8 * 1024 * 1024
        else {
            print("[SharePhoto] rejected invalid or oversized image")
            return
        }
        let safeName = filename.replacingOccurrences(of: "/", with: "-")
        let fileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(safeName.isEmpty ? "paper-plane.png" : safeName)
        do {
            try data.write(to: fileURL, options: .atomic)
        } catch {
            print("[SharePhoto] could not stage image: \(error)")
            return
        }
        let controller = UIActivityViewController(activityItems: [fileURL], applicationActivities: nil)
        controller.title = "Paper Plane Run"
        controller.completionWithItemsHandler = { _, _, _, _ in
            try? FileManager.default.removeItem(at: fileURL)
        }
        if let popover = controller.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        topPresenter?.present(controller, animated: true)
    }

    private var topPresenter: UIViewController? {
        var top: UIViewController? = self
        while let presented = top?.presentedViewController { top = presented }
        return top
    }

    // MARK: - WKUIDelegate

    // The game's share/photo panel calls navigator.share / clipboard; WKWebView
    // supports both natively on iOS 15+, so no bridge is needed for those —
    // just let the system share sheet present over this view controller.
    func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
        completionHandler(nil) // no long-press context menus over game canvas
    }

    // WKWebView returns cancel/false when these delegate methods are absent.
    // The shell confirms restarting a Journey, so without these the button did
    // nothing at all. Present the standard UIKit panels over the game.
    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        topPresenter?.present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        topPresenter?.present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { field in field.text = defaultText }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler(alert.textFields?.first?.text)
        })
        topPresenter?.present(alert, animated: true)
    }
}

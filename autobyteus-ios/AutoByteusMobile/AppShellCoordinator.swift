import AutoByteusMobileCore
import UIKit

/// The app's routes (autobyteus-279, design `AppShellCoordinator`): start → connecting → a node's page; start → the demo;
/// `autobyteus://demo` → the demo; and, when the app becomes active, a kept share used once. The connect sequence is
/// Android's (`NodeConnectionFlow`); this class shows its screens.
@MainActor
final class AppShellCoordinator: NodeConnectionScreens {
    private let window: UIWindow
    private let savedNodeStore: SavedNodeStore
    private let pendingStore: PendingSharedInputStore
    private let validator = AppShellCoordinator.makeConnectionValidator()
    private let externalActions = ExternalActions()
    private lazy var flow: NodeConnectionFlow = {
        let flow = NodeConnectionFlow(entries: savedNodeStore, statusCheck: { [validator] entry in await validator.validate(entry: entry) })
        flow.screens = self
        return flow
    }()

    private weak var currentStart: StartViewController?

    init(window: UIWindow) {
        self.window = window
        // autobyteus-290 SM-9: the saved entries' stored keys follow the code before the store first reads them.
        SavedNodeEntryKeysMigration.run(appGroupIdentifier: SavedNodeStore.appGroupIdentifier)
        self.savedNodeStore = SavedNodeStore(appGroupIdentifier: SavedNodeStore.appGroupIdentifier)
        self.pendingStore = PendingSharedInputStore(appGroupIdentifier: SavedNodeStore.appGroupIdentifier)
    }

    /// Release builds use the validator's default (5 s) unchanged. Debug builds, which the simulator
    /// UI tests run, may raise the connection-check timeout with `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS`
    /// so a slow CI simulator does not fail the check. Invalid or non-positive values are ignored.
    nonisolated private static func makeConnectionValidator() -> ConnectionValidator {
        #if DEBUG
        let maximumSeconds: TimeInterval = 120
        if let raw = ProcessInfo.processInfo.environment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"],
           let seconds = TimeInterval(raw.trimmingCharacters(in: .whitespaces)),
           seconds.isFinite, seconds > 0 {
            return ConnectionValidator(timeoutSeconds: min(seconds, maximumSeconds))
        }
        #endif
        return ConnectionValidator()
    }

    /// Opening the app opens the last used node (as Android, REQ-013); otherwise the start screen. The demo is never
    /// reopened: a cold launch after it starts here (REQ-006).
    func start() {
        if ProcessInfo.processInfo.environment["AUTOBYTEUS_RESET_SAVED_NODES"] == "1" {
            savedNodeStore.clear()
            pendingStore.clear()
        }
        #if DEBUG
        // UI tests: `AUTOBYTEUS_UI_TEST_SHARED_TEXT` is kept as if the share extension had kept it.
        if let shared = ProcessInfo.processInfo.environment["AUTOBYTEUS_UI_TEST_SHARED_TEXT"] {
            pendingStore.store(PendingSharedInput(rawText: shared, source: "ui-test"))
        }
        #endif
        if let saved = savedNodeStore.loadSelectedEntry() {
            flow.open(saved)
        } else {
            showStart()
        }
    }

    /// The share extension's kept text, used once when the app becomes active (REQ-007).
    func consumePendingShare() {
        guard let pending = pendingStore.consume() else { return }
        // After the screen that is appearing has appeared (at launch, the first screen), so it is replaced cleanly.
        DispatchQueue.main.async { [weak self] in self?.handleShared(pending.rawText) }
    }

    /// `autobyteus://demo` opens the demo (REQ-002, the Camera app's link); `autobyteus://…?input=` carries text to use.
    func handleIncomingURL(_ url: URL) {
        if DemoLink.matches(url.absoluteString) {
            openDemo()
            return
        }
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let input = components?.queryItems?.first { $0.name == "input" || $0.name == "text" }?.value
        if let input { handleShared(input) }
    }

    /// Shared text, as Android's `connect(text, Shared)`: a pairing link connects, the demo link opens the demo, other
    /// text opens Type an address with it. Each replaces what is open, so a share arriving in the demo leaves the demo.
    private func handleShared(_ text: String) {
        switch SharedTextAction.classify(text) {
        case .connect(let pairingLink): flow.connect(pairingLink, form: .shared)
        case .openDemo: openDemo()
        case .typeAddress: flow.connect(text, form: .shared)
        case .nothing: break
        }
    }

    // MARK: The start screen

    private func showStart() {
        let start = makeStart(switchMode: false)
        setRoot(start)
        checkReachability(of: start)
    }

    /// The Switch node list over the open page (the page's node sheet, bridge `showNodeList`): back returns to the page.
    private func showSwitchNodes(over shell: WebShellViewController) {
        let list = makeStart(switchMode: true, current: shell.entry)
        list.modalPresentationStyle = .fullScreen
        shell.present(list, animated: true)
        checkReachability(of: list)
    }

    private func makeStart(switchMode: Bool, current: SavedNodeEntry? = nil) -> StartViewController {
        weak var presented: StartViewController?
        let start = StartViewController(
            entries: savedNodeStore.loadEntries(),
            currentEntryID: current?.id,
            switchMode: switchMode,
            callbacks: StartViewController.Callbacks(
                onOpenNode: { [weak self] entry in
                    if switchMode, entry.id == current?.id { presented?.dismiss(animated: true); return }
                    self?.flow.open(entry)
                },
                onMore: { [weak self] entry in self?.presentRemove(entry, from: presented) },
                onScan: { [weak self] in if let presented { self?.presentScanner(from: presented) } },
                onTypeAddress: { [weak self] in if let presented { self?.presentTypeAddress(prefill: "", from: presented) } },
                onPasteLink: { [weak self] in self?.flow.connect(UIPasteboard.general.string ?? "", form: .paste) },
                onTryDemo: { [weak self] in self?.openDemo() },
                onBack: { presented?.dismiss(animated: true) }
            )
        )
        presented = start
        if !switchMode { currentStart = start }
        return start
    }

    private func checkReachability(of start: StartViewController) {
        for entry in savedNodeStore.loadEntries() {
            Task { [weak start, validator] in
                let result = await validator.validate(entry: entry)
                await MainActor.run {
                    if case .reachable = result { start?.setReachability(entryID: entry.id, .online) } else { start?.setReachability(entryID: entry.id, .notReachable) }
                }
            }
        }
    }

    private func presentRemove(_ entry: SavedNodeEntry, from presenter: UIViewController?) {
        presenter?.present(RemoveNodeSheet(entry: entry) { [weak self] in
            self?.savedNodeStore.removeEntry(id: entry.id)
            self?.showStart()
        }, animated: true)
    }

    private func presentTypeAddress(prefill: String, from presenter: UIViewController) {
        presenter.present(TypeAddressSheet(prefill: prefill) { [weak self] address, acknowledged in
            self?.flow.connectTyped(address, httpAcknowledged: acknowledged)
        }, animated: true)
    }

    // MARK: The demo (DS-001, DS-004)

    /// Try demo, the demo code or `autobyteus://demo`: the bundled demo, never saved as a computer.
    private func openDemo() {
        flow.cancel()
        flow.abandonPendingPairing()
        setRoot(DemoWebViewController(nodeCount: savedNodeStore.loadEntries().count) { [weak self] in
            // Leave demo: the first screen; the demo's web view and its storage go with it (REQ-006).
            self?.showStart()
        })
    }

    // MARK: The scanner

    private func presentScanner(from presenter: UIViewController) {
        let scanner = QRCodeScannerViewController(
            onQRCode: { [weak self] text in presenter.dismiss(animated: true) { self?.flow.connect(text, form: .scan) } },
            onDemo: { [weak self] in presenter.dismiss(animated: true) { self?.openDemo() } },
            onClose: { presenter.dismiss(animated: true) },
            onDiagnostic: { [weak self] diagnostic in
                presenter.dismiss(animated: true) { self?.showCameraProblem(diagnostic, from: presenter) }
            }
        )
        presenter.present(scanner, animated: true)
    }

    /// The camera is not allowed or not available: the reason, and Settings when permission is what is missing.
    private func showCameraProblem(_ diagnostic: ConnectionDiagnostic, from presenter: UIViewController) {
        let alert = UIAlertController(title: diagnostic.title, message: diagnostic.message, preferredStyle: .alert)
        if diagnostic.kind == .cameraPermissionDenied {
            alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { [weak self] _ in self?.externalActions.openSettings() })
        }
        alert.addAction(UIAlertAction(title: "OK", style: .cancel))
        presenter.present(alert, animated: true)
    }

    // MARK: NodeConnectionScreens

    func showConnecting(nodeName: String) {
        setRoot(ConnectingViewController(nodeName: nodeName) { [weak self] in
            self?.flow.cancel()
            self?.showStart()
        })
    }

    func showCantReach(nodeName: String, reason: CantReachReason) {
        weak var presented: CantReachViewController?
        let screen = CantReachViewController(nodeName: nodeName, reason: reason, actions: CantReachViewController.Actions(
            onBack: { [weak self] in self?.showStart() },
            onRetry: { [weak self] in self?.flow.retry() },
            onScanAgain: { [weak self] in if let presented { self?.presentScanner(from: presented) } },
            onOpenTailscale: { [weak self] in if let presented { self?.externalActions.openTailscale(from: presented) } }
        ))
        presented = screen
        setRoot(screen)
    }

    func showTypeAddress(prefill: String) {
        showStart()
        if let start = currentStart { presentTypeAddress(prefill: prefill, from: start) }
    }

    func openPage(entry: SavedNodeEntry, url: String, pairing: Bool) {
        weak var shellRef: WebShellViewController?
        let shell = WebShellViewController(
            entry: entry,
            initialURL: url,
            onEditNode: { [weak self] in
                self?.flow.abandonPendingPairing()
                self?.showStart()
            },
            onOpenExternal: { [weak self] url, presenter in self?.externalActions.openExternal(url, from: presenter) },
            bridgeActions: WebShellViewController.BridgeActions(
                nodeCount: { [weak self] in self?.savedNodeStore.loadEntries().count ?? 0 },
                onPaired: { [weak self] nodeName in self?.flow.onPaired(pageNodeName: nodeName) },
                onShowNodeList: { [weak self] in if let shellRef { self?.showSwitchNodes(over: shellRef) } },
                onStartScan: { [weak self] in if let shellRef { self?.presentScanner(from: shellRef) } }
            )
        )
        shellRef = shell
        setRoot(shell)
    }

    private func setRoot(_ controller: UIViewController) {
        window.rootViewController?.presentedViewController?.dismiss(animated: false)
        window.rootViewController = controller
    }
}

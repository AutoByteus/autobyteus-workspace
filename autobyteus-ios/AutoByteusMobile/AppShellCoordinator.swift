import AutoByteusMobileCore
import UIKit

@MainActor
final class AppShellCoordinator {
    private let window: UIWindow
    private let savedNodeStore: SavedNodeStore
    private let pendingStore: PendingSharedInputStore
    private let inputResolver = ConnectionInputResolver()
    private let validator = AppShellCoordinator.makeConnectionValidator()
    private let externalActions = ExternalActions()

    private weak var currentWebShell: WebShellViewController?
    private weak var currentConnection: ConnectionViewController?

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

    func start() {
        if ProcessInfo.processInfo.environment["AUTOBYTEUS_RESET_SAVED_NODES"] == "1" {
            savedNodeStore.clear()
            pendingStore.clear()
        }
        if let saved = savedNodeStore.loadSelectedEntry() {
            validateAndOpen(entry: saved, webViewURL: saved.mobileURL, saveAfterValidation: false)
        } else {
            showConnection()
        }
    }

    func consumePendingSharedInputIfNeeded() {
        guard let pending = pendingStore.consume(), !pending.rawText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }
        showConnection(
            initialInput: pending.rawText,
            notice: "Shared input was saved. Review it, acknowledge private HTTP if needed, then tap Connect."
        )
    }

    func handleIncomingURL(_ url: URL) {
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let input = components?.queryItems?.first { $0.name == "input" || $0.name == "text" }?.value
        let rawInput = input?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let rawInput, !rawInput.isEmpty else { return }
        showConnection(initialInput: rawInput, notice: "Deep link input is ready to connect.")
    }

    private func showConnection(
        diagnostic: ConnectionDiagnostic? = nil,
        isBusy: Bool = false,
        initialInput: String = "",
        notice: String? = nil
    ) {
        let controller = ConnectionViewController(
            savedEntries: savedNodeStore.loadEntries(),
            diagnostic: diagnostic,
            notice: notice,
            isBusy: isBusy,
            initialInput: initialInput,
            callbacks: connectionCallbacks()
        )
        currentConnection = controller
        currentWebShell = nil
        window.rootViewController = controller
    }

    private func connectionCallbacks() -> ConnectionViewController.Callbacks {
        ConnectionViewController.Callbacks(
            onOpenSaved: { [weak self] entry in
                self?.validateAndOpen(entry: entry, webViewURL: entry.mobileURL, saveAfterValidation: false)
            },
            onRemoveSaved: { [weak self] entry in
                self?.savedNodeStore.removeEntry(id: entry.id)
                self?.showConnection()
            },
            onSubmitInput: { [weak self] rawText, httpAcknowledged in
                self?.submitInput(rawText, httpAcknowledged: httpAcknowledged)
            },
            onScanQR: { [weak self] presenter in
                self?.presentQRScanner(from: presenter)
            },
            onOpenTailscale: { [weak self] presenter in
                self?.externalActions.openTailscale(from: presenter)
            },
            onOpenSettings: { [weak self] in
                self?.externalActions.openSettings()
            }
        )
    }

    private func submitInput(_ rawText: String, httpAcknowledged: Bool) {
        switch inputResolver.resolve(rawText: rawText, httpAcknowledged: httpAcknowledged) {
        case .success(let entry, let webViewURL):
            validateAndOpen(entry: entry, webViewURL: webViewURL, saveAfterValidation: true)
        case .failure(let diagnostic):
            showConnection(diagnostic: diagnostic, initialInput: rawText)
        }
    }

    private func validateAndOpen(
        entry: SavedNodeEntry,
        webViewURL: String,
        saveAfterValidation: Bool
    ) {
        showConnection(isBusy: true, initialInput: entry.mobileURL)
        Task { [weak self] in
            guard let self else { return }
            let result = await validator.validate(entry: entry)
            await MainActor.run {
                switch result {
                case .reachable(_, let status):
                    let stable = entry.updating(
                        displayName: status.serverName,
                        httpAcknowledged: entry.httpAcknowledged
                    )
                    if saveAfterValidation || !self.savedNodeStore.loadEntries().contains(where: { $0.id == stable.id }) {
                        self.savedNodeStore.saveEntry(stable)
                    } else {
                        self.savedNodeStore.selectEntry(id: stable.id)
                    }
                    self.openWebShell(entry: stable, initialURL: webViewURL)
                case .failed(let diagnostic):
                    self.showConnection(diagnostic: diagnostic, initialInput: entry.mobileURL)
                }
            }
        }
    }

    private func openWebShell(entry: SavedNodeEntry, initialURL: String) {
        let controller = WebShellViewController(
            entry: entry,
            initialURL: initialURL,
            onEditNode: { [weak self] in self?.showConnection(initialInput: entry.mobileURL) },
            onOpenExternal: { [weak self] url, presenter in self?.externalActions.openExternal(url, from: presenter) }
        )
        currentWebShell = controller
        currentConnection = nil
        window.rootViewController = controller
    }

    private func presentQRScanner(from presenter: UIViewController) {
        let scanner = QRCodeScannerViewController(
            onQRCode: { [weak self] text in
                presenter.dismiss(animated: true) {
                    self?.submitInput(text, httpAcknowledged: false)
                }
            },
            onDiagnostic: { [weak self] diagnostic in
                presenter.dismiss(animated: true) {
                    self?.showConnection(diagnostic: diagnostic)
                }
            }
        )
        presenter.present(scanner, animated: true)
    }
}

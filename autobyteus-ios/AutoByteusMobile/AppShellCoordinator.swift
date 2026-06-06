import AutoByteusMobileCore
import UIKit

@MainActor
final class AppShellCoordinator {
    private let window: UIWindow
    private let savedNodeStore: SavedNodeStore
    private let pendingStore: PendingSharedInputStore
    private let inputResolver = ConnectionInputResolver()
    private let validator = ConnectionValidator()
    private let externalActions = ExternalActions()

    private weak var currentWebShell: WebShellViewController?
    private weak var currentConnection: ConnectionViewController?

    init(window: UIWindow) {
        self.window = window
        self.savedNodeStore = SavedNodeStore(appGroupIdentifier: SavedNodeStore.appGroupIdentifier)
        self.pendingStore = PendingSharedInputStore(appGroupIdentifier: SavedNodeStore.appGroupIdentifier)
    }

    func start() {
        if ProcessInfo.processInfo.environment["AUTOBYTEUS_RESET_SAVED_NODES"] == "1" {
            savedNodeStore.clear()
            pendingStore.clear()
        }
        if let saved = savedNodeStore.loadSelectedProfile() {
            validateAndOpen(profile: saved, webViewURL: saved.mobileURL, saveAfterValidation: false)
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
            savedProfiles: savedNodeStore.loadProfiles(),
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
            onOpenSaved: { [weak self] profile in
                self?.validateAndOpen(profile: profile, webViewURL: profile.mobileURL, saveAfterValidation: false)
            },
            onRemoveSaved: { [weak self] profile in
                self?.savedNodeStore.removeProfile(id: profile.id)
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
        case .success(let profile, let webViewURL):
            validateAndOpen(profile: profile, webViewURL: webViewURL, saveAfterValidation: true)
        case .failure(let diagnostic):
            showConnection(diagnostic: diagnostic, initialInput: rawText)
        }
    }

    private func validateAndOpen(
        profile: SavedNodeProfile,
        webViewURL: String,
        saveAfterValidation: Bool
    ) {
        showConnection(isBusy: true, initialInput: profile.mobileURL)
        Task { [weak self] in
            guard let self else { return }
            let result = await validator.validate(profile: profile)
            await MainActor.run {
                switch result {
                case .reachable(_, let status):
                    let stable = profile.updating(
                        displayName: status.serverName,
                        httpAcknowledged: profile.httpAcknowledged
                    )
                    if saveAfterValidation || !self.savedNodeStore.loadProfiles().contains(where: { $0.id == stable.id }) {
                        self.savedNodeStore.saveProfile(stable)
                    } else {
                        self.savedNodeStore.selectProfile(id: stable.id)
                    }
                    self.openWebShell(profile: stable, initialURL: webViewURL)
                case .failed(let diagnostic):
                    self.showConnection(diagnostic: diagnostic, initialInput: profile.mobileURL)
                }
            }
        }
    }

    private func openWebShell(profile: SavedNodeProfile, initialURL: String) {
        let controller = WebShellViewController(
            profile: profile,
            initialURL: initialURL,
            onEditNode: { [weak self] in self?.showConnection(initialInput: profile.mobileURL) },
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

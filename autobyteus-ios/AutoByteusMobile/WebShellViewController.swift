import AutoByteusMobileCore
import UIKit

final class WebShellViewController: UIViewController, ShellBridgeDelegate {
    /// What the node's page asks the app beyond this screen (autobyteus-279, the shell bridge's contract).
    struct BridgeActions {
        let nodeCount: () -> Int
        let onPaired: (_ nodeName: String) -> Void
        let onShowNodeList: () -> Void
        let onStartScan: () -> Void
    }

    let entry: SavedNodeEntry
    private let initialURL: String
    private let onEditNode: () -> Void
    private let onOpenExternal: (URL, UIViewController?) -> Void
    private let bridgeActions: BridgeActions
    private let fullScreen = DesktopFullScreen()
    private var webHost: AutoByteusWebViewController!
    private var overlayView: UIView?

    init(
        entry: SavedNodeEntry,
        initialURL: String,
        onEditNode: @escaping () -> Void,
        onOpenExternal: @escaping (URL, UIViewController?) -> Void,
        bridgeActions: BridgeActions
    ) {
        self.entry = entry
        self.initialURL = initialURL
        self.onEditNode = onEditNode
        self.onOpenExternal = onOpenExternal
        self.bridgeActions = bridgeActions
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override var prefersStatusBarHidden: Bool { fullScreen.isOn }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { fullScreen.supportedOrientations }

    // MARK: ShellBridgeDelegate

    func shellBridgeHello() -> ShellHello {
        ShellHello(
            nodeCount: bridgeActions.nodeCount(), deviceName: UIDevice.current.model, nodeName: entry.knownName ?? "",
            mediaPlayer: Dictionary(uniqueKeysWithValues: MediaKind.allCases.map { ($0, $0.extensions) })
        )
    }

    func shellBridge(didReceive message: ShellBridgeMessage) {
        switch message {
        case .pageReady: clearDiagnostic()
        case .paired(let nodeName): bridgeActions.onPaired(nodeName)
        case .showNodeList: bridgeActions.onShowNodeList()
        case .startScan: bridgeActions.onStartScan()
        case .desktopFullScreen(let on): fullScreen.set(on, for: self)
        case .saveFile(let fileName, let mimeType, let base64): ShellFileSaver.present(fileName: fileName, mimeType: mimeType, base64: base64, from: self)
        case .playMedia(let request):
            // The page's video or audio file in the app's player (autobyteus-574 D-4, D-5; autobyteus-642 D-2); the
            // credential lives with that screen only.
            present(NativeMediaPlayerViewController(playback: .init(
                kind: request.kind, url: request.url, title: request.title, nodeID: entry.id, nodeOrigin: entry.origin,
                credential: request.credential
            )), animated: true)
        case .hello, .leaveDemo: break
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        view.accessibilityIdentifier = "webshell.root"
        addWebHost()
    }

    private func addWebHost() {
        let host = AutoByteusWebViewController(
            entry: entry,
            initialURL: initialURL,
            onPageStarted: { [weak self] _ in self?.clearDiagnostic() },
            onPageFinished: { [weak self] _ in self?.clearDiagnostic() },
            onDiagnostic: { [weak self] diagnostic in self?.showDiagnostic(diagnostic) },
            onExternalURL: { [weak self] url in self?.onOpenExternal(url, self) },
            bridgeDelegate: self
        )
        webHost = host
        addChild(host)
        view.addSubview(host.view)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        host.didMove(toParent: self)
    }

    private func showDiagnostic(_ diagnostic: ConnectionDiagnostic) {
        clearDiagnostic()
        let overlay = overlay(diagnostic)
        overlay.accessibilityIdentifier = "webshell.recoveryOverlay"
        view.addSubview(overlay)
        overlay.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        overlayView = overlay
    }

    private func clearDiagnostic() {
        overlayView?.removeFromSuperview()
        overlayView = nil
    }

    private func overlay(_ diagnostic: ConnectionDiagnostic) -> UIView {
        let dim = UIView()
        dim.backgroundColor = UIColor.systemBackground.withAlphaComponent(0.94)
        let card = UIStackView()
        card.axis = .vertical
        card.spacing = 12
        card.isLayoutMarginsRelativeArrangement = true
        card.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 18, leading: 18, bottom: 18, trailing: 18)
        card.layer.cornerRadius = 14
        card.backgroundColor = .white
        card.addArrangedSubview(label(diagnostic.title, size: 22, weight: .semibold, color: .systemOrange))
        card.addArrangedSubview(label("\(diagnostic.message)\n\n\(diagnostic.recoveryAction)", size: 15, color: .secondaryLabel))
        card.addArrangedSubview(buttonRow())
        dim.addSubview(card)
        card.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            card.leadingAnchor.constraint(equalTo: dim.leadingAnchor, constant: 20),
            card.trailingAnchor.constraint(equalTo: dim.trailingAnchor, constant: -20),
            card.centerYAnchor.constraint(equalTo: dim.centerYAnchor)
        ])
        return dim
    }

    private func buttonRow() -> UIView {
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 10
        row.distribution = .fillEqually
        row.addArrangedSubview(button("Retry") { [weak self] in self?.webHost.retry() })
        row.addArrangedSubview(button("Edit Node") { [weak self] in self?.onEditNode() })
        row.addArrangedSubview(button("Open Browser") { [weak self] in
            guard let self, let url = URL(string: self.initialURL) else { return }
            self.onOpenExternal(url, self)
        })
        return row
    }

    private func label(_ text: String, size: CGFloat, weight: UIFont.Weight = .regular, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .systemFont(ofSize: size, weight: weight)
        label.textColor = color
        label.numberOfLines = 0
        return label
    }

    private func button(_ title: String, action: @escaping () -> Void) -> UIButton {
        let control = UIButton(type: .system)
        control.setTitle(title, for: .normal)
        control.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
        control.backgroundColor = UIColor(red: 0.91, green: 0.94, blue: 1.0, alpha: 1)
        control.layer.cornerRadius = 10
        control.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true
        control.addAction(UIAction { _ in action() }, for: .touchUpInside)
        return control
    }
}

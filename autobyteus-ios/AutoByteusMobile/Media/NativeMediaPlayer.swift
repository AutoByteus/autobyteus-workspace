import AVFoundation
import AVKit
import AutoByteusMobileCore
import UIKit

/// The app's media player (autobyteus-574 D-4, autobyteus-642 D-2): one protected node video or audio file, streamed by
/// range with the phone's credential in the header (`AuthorizedMediaLoader`), its fetched bytes kept by version
/// (`MediaRangeCache`). A wide video turns the phone to landscape with the status bar hidden; Back turns it back and
/// closes the player, which keeps its position while it rotates. An audio file stays in portrait, with its title and
/// the player's audio controls. The credential lives in memory from the page's `playMedia` until the screen closes;
/// nothing logs a URL or a header.
final class NativeMediaPlayerViewController: UIViewController {
    /// One playback: its kind, the node file, its name, the node it belongs to and the credential for this playback only.
    struct Playback: CustomStringConvertible {
        let kind: MediaKind
        let url: URL
        let title: String
        let nodeID: String
        let nodeOrigin: String
        let credential: String
        var description: String { "Playback(title: \(title), url: <redacted>, credential: <redacted>)" }
    }

    static func couldNotPlay(_ kind: MediaKind) -> String { "This \(kind.rawValue) could not be played." }

    /// The screen's kind, kept after the playback (and its credential) is dropped.
    private let kind: MediaKind
    private var playback: Playback?
    private let playerController = AVPlayerViewController()
    private var loader: AuthorizedMediaLoader?
    private var sizeObservation: NSKeyValueObservation?
    private var statusObservation: NSKeyValueObservation?
    private var landscape = false

    init(playback: Playback) {
        self.kind = playback.kind
        self.playback = playback
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    required init?(coder: NSCoder) { nil }

    override var prefersStatusBarHidden: Bool { landscape }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { landscape ? .landscape : .allButUpsideDown }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        view.accessibilityIdentifier = "media.player"
        playerController.entersFullScreenWhenPlaybackBegins = false
        addChild(playerController)
        view.addSubview(playerController.view)
        playerController.view.frame = view.bounds
        playerController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        playerController.didMove(toParent: self)
        if kind == .audio { addAudioPlaceholder(title: playback?.title ?? "") }
        addBackButton(title: playback?.title ?? "")
        guard let playback else { return showCouldNotPlay() }
        start(playback)
    }

    private func start(_ playback: Playback) {
        let http = NodeMediaHTTP(nodeOrigin: playback.nodeOrigin, credential: playback.credential)
        guard let assetURL = NodeMediaURL.assetURL(for: playback.url) else { return showCouldNotPlay() }
        Task { @MainActor [weak self] in
            do {
                let probe = try await http.probe(playback.url)
                guard let self, self.playback != nil else { return }
                let loader = AuthorizedMediaLoader(url: playback.url, nodeID: playback.nodeID, http: http, probe: probe)
                let asset = AVURLAsset(url: assetURL)
                asset.resourceLoader.setDelegate(loader, queue: loader.queue)
                self.loader = loader
                self.play(AVPlayerItem(asset: asset))
            } catch {
                NSLog("AutoByteusMedia: the file could not be opened (%@)", String(describing: type(of: error)))
                self?.showCouldNotPlay()
            }
        }
    }

    private func play(_ item: AVPlayerItem) {
        let player = AVPlayer(playerItem: item)
        playerController.player = player
        statusObservation = item.observe(\.status) { [weak self] item, _ in
            guard item.status == .failed else { return }
            Task { @MainActor in self?.showCouldNotPlay() }
        }
        // A wide video plays in landscape (574 DEC-001): the player fills the screen with the status bar hidden. Audio has
        // no picture and stays in portrait.
        if kind == .video {
            sizeObservation = item.observe(\.presentationSize) { [weak self] item, _ in
                let size = item.presentationSize
                guard size.width > 0, size.height > 0 else { return }
                Task { @MainActor in self?.setLandscape(size.width > size.height) }
            }
        }
        player.play()
    }

    private func setLandscape(_ on: Bool) {
        guard on != landscape else { return }
        landscape = on
        setNeedsStatusBarAppearanceUpdate()
        setNeedsUpdateOfSupportedInterfaceOrientations()
        view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: on ? .landscape : .portrait)) { _ in }
    }

    /// An audio file has no picture: the player shows an audio symbol and the file's name instead, over AVKit's own
    /// artwork and under its controls, which AVKit still hides while it plays and shows on a tap (autobyteus-642 SR-003 C-2).
    private func addAudioPlaceholder(title: String) {
        guard let content = playerController.contentOverlayView else { return }
        let overlay = UIView()
        overlay.backgroundColor = .black
        // A tap still reaches AVKit, which shows its controls.
        overlay.isUserInteractionEnabled = false
        overlay.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(overlay)
        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: content.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: content.bottomAnchor),
            overlay.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: content.trailingAnchor),
        ])
        let symbol = UIImageView(image: UIImage(systemName: "waveform"))
        symbol.tintColor = .lightGray
        symbol.contentMode = .scaleAspectFit
        symbol.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 72, weight: .regular)
        symbol.isAccessibilityElement = true
        symbol.accessibilityLabel = title
        symbol.accessibilityIdentifier = "media.audioSymbol"
        let name = UILabel()
        name.text = title
        name.textColor = .white
        name.font = .preferredFont(forTextStyle: .title3)
        name.textAlignment = .center
        name.numberOfLines = 2
        name.lineBreakMode = .byTruncatingMiddle
        let stack = UIStackView(arrangedSubviews: [symbol, name])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: overlay.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: overlay.trailingAnchor, constant: -24),
        ])
    }

    private func addBackButton(title: String) {
        var configuration = UIButton.Configuration.plain()
        configuration.title = "Back"
        configuration.image = UIImage(systemName: "chevron.left")
        configuration.imagePadding = 4
        configuration.baseForegroundColor = .white
        let back = UIButton(configuration: configuration, primaryAction: UIAction { [weak self] _ in self?.close() })
        back.accessibilityIdentifier = "media.back"
        let label = UILabel()
        label.text = title
        label.textColor = .white
        label.font = .preferredFont(forTextStyle: .headline)
        label.lineBreakMode = .byTruncatingMiddle
        let bar = UIStackView(arrangedSubviews: [back, label])
        bar.spacing = 8
        bar.alignment = .center
        bar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bar)
        NSLayoutConstraint.activate([
            bar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            bar.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 8),
            bar.trailingAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -8),
        ])
    }

    /// "This video could not be played." with Back: a missing or changed file, a refused credential, a network failure.
    private func showCouldNotPlay() {
        guard isViewLoaded, view.viewWithTag(Self.couldNotPlayTag) == nil else { return }
        playerController.player?.pause()
        playerController.player = nil
        setLandscape(false)
        let message = UILabel()
        message.tag = Self.couldNotPlayTag
        message.text = Self.couldNotPlay(kind)
        message.textColor = .white
        message.numberOfLines = 0
        message.textAlignment = .center
        message.accessibilityIdentifier = "media.couldNotPlay"
        message.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(message)
        NSLayoutConstraint.activate([
            message.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            message.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            message.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
        ])
    }

    private static let couldNotPlayTag = 5741

    /// Back: the player stops, the credential and the loader go, the phone returns to portrait.
    private func close() {
        setLandscape(false)
        dismiss(animated: true)
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        guard isBeingDismissed || presentingViewController == nil else { return }
        playerController.player?.pause()
        playerController.player = nil
        loader?.invalidate()
        loader = nil
        playback = nil
        sizeObservation = nil
        statusObservation = nil
    }
}

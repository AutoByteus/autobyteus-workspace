import AVFoundation
import AVKit
import AutoByteusMobileCore
import UIKit

/// The app's video player (autobyteus-574 D-4, UC-001…UC-003): one protected node video, streamed by range with the
/// phone's credential in the header (`AuthorizedMediaLoader`), its fetched bytes kept by version (`MediaRangeCache`).
/// A wide video turns the phone to landscape with the status bar hidden; Back turns it back and closes the player, which
/// keeps its position while it rotates. The credential lives in memory from the page's `playVideo` until the screen
/// closes; nothing logs a URL or a header.
final class NativeVideoPlayerViewController: UIViewController {
    /// One playback: the node file, its name, the node it belongs to and the credential for this playback only.
    struct Playback: CustomStringConvertible {
        let url: URL
        let title: String
        let nodeID: String
        let nodeOrigin: String
        let credential: String
        var description: String { "Playback(title: \(title), url: <redacted>, credential: <redacted>)" }
    }

    static let couldNotPlay = "This video could not be played."

    private var playback: Playback?
    private let playerController = AVPlayerViewController()
    private var loader: AuthorizedMediaLoader?
    private var sizeObservation: NSKeyValueObservation?
    private var statusObservation: NSKeyValueObservation?
    private var landscape = false

    init(playback: Playback) {
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
        view.accessibilityIdentifier = "video.player"
        playerController.entersFullScreenWhenPlaybackBegins = false
        addChild(playerController)
        view.addSubview(playerController.view)
        playerController.view.frame = view.bounds
        playerController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        playerController.didMove(toParent: self)
        addBackButton(title: playback?.title ?? "")
        guard let playback else { return showCouldNotPlay() }
        start(playback)
    }

    private func start(_ playback: Playback) {
        let http = NodeVideoHTTP(nodeOrigin: playback.nodeOrigin, credential: playback.credential)
        guard let assetURL = NodeVideoURL.assetURL(for: playback.url) else { return showCouldNotPlay() }
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
                NSLog("AutoByteusVideo: the video could not be opened (%@)", String(describing: type(of: error)))
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
        // A wide video plays in landscape (DEC-001): the player fills the screen with the status bar hidden.
        sizeObservation = item.observe(\.presentationSize) { [weak self] item, _ in
            let size = item.presentationSize
            guard size.width > 0, size.height > 0 else { return }
            Task { @MainActor in self?.setLandscape(size.width > size.height) }
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

    private func addBackButton(title: String) {
        var configuration = UIButton.Configuration.plain()
        configuration.title = "Back"
        configuration.image = UIImage(systemName: "chevron.left")
        configuration.imagePadding = 4
        configuration.baseForegroundColor = .white
        let back = UIButton(configuration: configuration, primaryAction: UIAction { [weak self] _ in self?.close() })
        back.accessibilityIdentifier = "video.back"
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
        message.text = Self.couldNotPlay
        message.textColor = .white
        message.numberOfLines = 0
        message.textAlignment = .center
        message.accessibilityIdentifier = "video.couldNotPlay"
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

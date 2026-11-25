import AVFoundation
import AVKit
import AutoByteusMobileCore
import UIKit

/// The app's media player (autobyteus-574 D-4, autobyteus-642 D-2, autobyteus-647 D-3): one protected node video or audio
/// file, streamed by range with the phone's credential in the header (`AuthorizedMediaLoader`), its fetched bytes kept by
/// version (`MediaRangeCache`). This screen owns the playback (the loader, the audio session, landscape, the failure) and
/// stays black underneath; once the item is ready it presents iOS's own player screen (`AVPlayerViewController`) full
/// screen, with its close button and the file's name as its title, so no bar of the app covers its controls. A wide video
/// turns the phone to landscape; an audio file stays in portrait with an audio symbol and its name. When iOS's player
/// closes (its close button or a swipe down), this screen closes too. A failure shows "could not be played" with Back
/// here. The credential lives in memory from the page's `playMedia` until the screen closes; nothing logs a URL or a header.
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
    /// Playback for media while this screen shows, so the Ring/Silent switch does not mute it (642 SR-005).
    private let audioSession = MediaAudioSession()
    private var sizeObservation: NSKeyValueObservation?
    private var statusObservation: NSKeyValueObservation?
    private var landscape = false
    /// The item is ready to show; this screen has finished appearing (only then can it present); iOS's player screen is
    /// being presented over it, and has finished appearing (only then may its going away mean it was closed).
    private var itemReady = false
    private var appeared = false
    private var playerPresented = false
    private var playerShown = false

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
        view.accessibilityIdentifier = "media.host"
        playerController.modalPresentationStyle = .fullScreen
        playerController.view.accessibilityIdentifier = "media.player"
        audioSession.begin()
        if kind == .audio { addAudioPlaceholder(title: playback?.title ?? "") }
        guard let playback else { return showCouldNotPlay() }
        start(playback)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        appeared = true
        // iOS's player closed (its close button or a swipe down) and this screen shows again: it closes as well.
        if playerShown, presentedViewController == nil, view.viewWithTag(Self.couldNotPlayTag) == nil {
            playerShown = false
            playerPresented = false
            close(animated: false)
            return
        }
        presentPlayerIfReady()
    }

    /// iOS's player screen over this one, once the item is ready and this screen has finished appearing (a fast node can
    /// have the item ready while this screen is still being presented, when UIKit would not present another). Once it
    /// shows, it is the screen whose orientations count, so landscape is asked for then.
    private func presentPlayerIfReady() {
        guard itemReady, appeared, !playerPresented, presentedViewController == nil, !isBeingDismissed,
              view.viewWithTag(Self.couldNotPlayTag) == nil else { return }
        playerPresented = true
        present(playerController, animated: true) { [weak self] in
            guard let self, self.playerPresented else { return }
            self.playerShown = true
            self.applyOrientation()
        }
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
        item.externalMetadata = [Self.titleItem(playback?.title ?? "")]
        let player = AVPlayer(playerItem: item)
        playerController.player = player
        statusObservation = item.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
            switch item.status {
            case .readyToPlay: Task { @MainActor in self?.itemReady = true; self?.presentPlayerIfReady() }
            case .failed: Task { @MainActor in self?.showCouldNotPlay() }
            default: break
            }
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

    /// The file's name as the title iOS's player screen shows.
    private static func titleItem(_ title: String) -> AVMetadataItem {
        let item = AVMutableMetadataItem()
        item.identifier = .commonIdentifierTitle
        item.value = title as NSString
        item.extendedLanguageTag = "und"
        return item.copy() as! AVMetadataItem
    }

    private func setLandscape(_ on: Bool) {
        guard on != landscape else { return }
        landscape = on
        setNeedsStatusBarAppearanceUpdate()
        setNeedsUpdateOfSupportedInterfaceOrientations()
        applyOrientation()
    }

    /// Asks the scene for the orientation `landscape` wants. The screen on top decides which orientations it may have:
    /// landscape is asked for only once iOS's player shows (it allows landscape; the page under this screen does not),
    /// portrait whenever this screen goes back to it.
    private func applyOrientation() {
        guard !landscape || (playerShown && presentedViewController === playerController) else { return }
        // While iOS's player shows full screen, this screen's view is out of the window: the scene is the player's.
        let scene = (playerShown ? playerController.view.window : view.window)?.windowScene
        scene?.requestGeometryUpdate(.iOS(interfaceOrientations: landscape ? .landscape : .portrait)) { _ in }
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

    /// "This video could not be played." with Back, on this screen: a missing or changed file, a refused credential, a
    /// network failure. iOS's player screen, when it shows, closes first.
    private func showCouldNotPlay() {
        guard isViewLoaded, view.viewWithTag(Self.couldNotPlayTag) == nil else { return }
        playerController.player?.pause()
        playerController.player = nil
        setLandscape(false)
        if playerPresented {
            playerPresented = false
            playerShown = false
            playerController.dismiss(animated: false)
        }
        let message = UILabel()
        message.tag = Self.couldNotPlayTag
        message.text = Self.couldNotPlay(kind)
        message.textColor = .white
        message.numberOfLines = 0
        message.textAlignment = .center
        message.accessibilityIdentifier = "media.couldNotPlay"
        message.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(message)
        var configuration = UIButton.Configuration.plain()
        configuration.title = "Back"
        configuration.image = UIImage(systemName: "chevron.left")
        configuration.imagePadding = 4
        configuration.baseForegroundColor = .white
        let back = UIButton(configuration: configuration, primaryAction: UIAction { [weak self] _ in self?.close(animated: true) })
        back.accessibilityIdentifier = "media.back"
        back.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(back)
        NSLayoutConstraint.activate([
            message.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            message.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            message.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            back.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 4),
            back.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 8),
        ])
    }

    private static let couldNotPlayTag = 5741

    /// This screen closes: at once after iOS's player closed (which has animated already), animated on Back after a
    /// failure. The teardown below runs, and the phone returns to portrait.
    private func close(animated: Bool) {
        setLandscape(false)
        dismiss(animated: animated)
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        guard isBeingDismissed || presentingViewController == nil else { return }
        playerController.player?.pause()
        playerController.player = nil
        loader?.invalidate()
        loader = nil
        // Whatever closes this screen (iOS's player closing by its close button or a swipe down, Back after a failure, or
        // the app dismissing it) ends the playback and the session here (642 N-7).
        audioSession.end()
        playback = nil
        sizeObservation = nil
        statusObservation = nil
    }
}

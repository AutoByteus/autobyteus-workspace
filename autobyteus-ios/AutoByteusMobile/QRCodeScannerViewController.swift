import AVFoundation
import AutoByteusMobileCore
import UIKit

/// The Scan screen (autobyteus-279; Android's `ScanScreen` look, VIS-003): the camera with white corner brackets around a
/// 240 pt square under a "← Scan" bar; when a code is found the brackets turn green and the hint says so, then it goes on.
/// The demo's code (`autobyteus://demo`) says "Demo code found" and opens the demo after 0.7 s (TR-002); any other code
/// keeps its path.
final class QRCodeScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    private static let foundPause: TimeInterval = 0.4
    private static let demoFoundPause: TimeInterval = 0.7

    private let onQRCode: (String) -> Void
    private let onDemo: () -> Void
    private let onClose: () -> Void
    private let onDiagnostic: (ConnectionDiagnostic) -> Void
    private let sessionQueue = DispatchQueue(label: "org.autobyteus.mobile.qr-session")
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private let viewfinder = UIView()
    private let brackets = ScanBracketsView()
    private let hint = UILabel()
    private var didFinish = false

    init(
        onQRCode: @escaping (String) -> Void,
        onDemo: @escaping () -> Void,
        onClose: @escaping () -> Void,
        onDiagnostic: @escaping (ConnectionDiagnostic) -> Void
    ) {
        self.onQRCode = onQRCode
        self.onDemo = onDemo
        self.onClose = onClose
        self.onDiagnostic = onDiagnostic
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ShellColors.slate900
        view.accessibilityIdentifier = "scanner.root"
        buildOverlay()
        #if DEBUG
        // UI tests (a simulator has no camera): `AUTOBYTEUS_UI_TEST_SCANNED_CODE` is the code the scanner reads.
        if let code = ProcessInfo.processInfo.environment["AUTOBYTEUS_UI_TEST_SCANNED_CODE"] {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.found(code) }
            return
        }
        #endif
        requestCameraAndStart()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = viewfinder.bounds
    }

    /// A code the scanner read (also the UI tests' way in: they inject the demo code).
    func found(_ text: String) {
        guard !didFinish else { return }
        didFinish = true
        stopSession()
        brackets.found = true
        let isDemo = DemoLink.matches(text)
        hint.text = isDemo ? "Demo code found" : "Code found"
        UIAccessibility.post(notification: .announcement, argument: hint.text)
        DispatchQueue.main.asyncAfter(deadline: .now() + (isDemo ? Self.demoFoundPause : Self.foundPause)) { [weak self] in
            guard let self else { return }
            if isDemo { self.onDemo() } else { self.onQRCode(text) }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopSession()
    }

    private func requestCameraAndStart() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            startScanner()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    granted ? self?.startScanner() : self?.finishWithDiagnostic(ConnectionDiagnosticMapper.cameraPermissionDenied())
                }
            }
        case .denied, .restricted:
            finishWithDiagnostic(ConnectionDiagnosticMapper.cameraPermissionDenied())
        @unknown default:
            finishWithDiagnostic(ConnectionDiagnosticMapper.qrScanUnavailable())
        }
    }

    private func startScanner() {
        guard let device = AVCaptureDevice.default(for: .video) else {
            finishWithDiagnostic(ConnectionDiagnosticMapper.qrScanUnavailable())
            return
        }
        do {
            let session = AVCaptureSession()
            let input = try AVCaptureDeviceInput(device: device)
            guard session.canAddInput(input) else {
                finishWithDiagnostic(ConnectionDiagnosticMapper.qrScanUnavailable())
                return
            }
            session.addInput(input)
            let output = AVCaptureMetadataOutput()
            guard session.canAddOutput(output) else {
                finishWithDiagnostic(ConnectionDiagnosticMapper.qrScanUnavailable())
                return
            }
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            output.metadataObjectTypes = [.qr]
            captureSession = session
            attachPreview(for: session)
            sessionQueue.async { session.startRunning() }
        } catch {
            finishWithDiagnostic(ConnectionDiagnosticMapper.qrScanUnavailable())
        }
    }

    private func attachPreview(for session: AVCaptureSession) {
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = viewfinder.bounds
        viewfinder.layer.insertSublayer(layer, at: 0)
        previewLayer = layer
    }

    private func stopSession() {
        guard let session = captureSession else { return }
        sessionQueue.async { session.stopRunning() }
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard let code = metadataObjects.compactMap({ $0 as? AVMetadataMachineReadableCodeObject }).first,
              let text = code.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty else {
            return
        }
        found(text)
    }

    private func close() {
        guard !didFinish else { return }
        didFinish = true
        stopSession()
        onClose()
    }

    private func finishWithDiagnostic(_ diagnostic: ConnectionDiagnostic) {
        guard !didFinish else { return }
        didFinish = true
        stopSession()
        onDiagnostic(diagnostic)
    }

    /// The header and hint sit in their own dark bars, so they stay readable over any camera image.
    private func buildOverlay() {
        let back = ShellUI.iconButton("arrow.left", label: "Close scanner", color: .white) { [weak self] in self?.close() }
        back.accessibilityIdentifier = "scanner.close"
        let title = ShellUI.label("Scan", size: 18, color: .white, weight: .semibold)
        let header = UIStackView(arrangedSubviews: [back, title, UIView()])
        header.alignment = .center
        header.spacing = 4
        header.isLayoutMarginsRelativeArrangement = true
        header.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 0, leading: 8, bottom: 0, trailing: 16)
        header.heightAnchor.constraint(equalToConstant: 56).isActive = true

        viewfinder.clipsToBounds = true
        brackets.translatesAutoresizingMaskIntoConstraints = false
        viewfinder.addSubview(brackets)
        NSLayoutConstraint.activate([
            brackets.widthAnchor.constraint(equalToConstant: 240), brackets.heightAnchor.constraint(equalToConstant: 240),
            brackets.centerXAnchor.constraint(equalTo: viewfinder.centerXAnchor), brackets.centerYAnchor.constraint(equalTo: viewfinder.centerYAnchor),
        ])

        hint.text = "Point the camera at the QR code on your computer."
        hint.textColor = ShellColors.slate200
        hint.font = .systemFont(ofSize: 15)
        hint.numberOfLines = 0
        hint.textAlignment = .center
        hint.accessibilityIdentifier = "scanner.hint"
        let hintBar = UIView()
        hint.translatesAutoresizingMaskIntoConstraints = false
        hintBar.addSubview(hint)
        NSLayoutConstraint.activate([
            hint.topAnchor.constraint(equalTo: hintBar.topAnchor, constant: 24), hint.bottomAnchor.constraint(equalTo: hintBar.bottomAnchor, constant: -32),
            hint.leadingAnchor.constraint(equalTo: hintBar.leadingAnchor, constant: 32), hint.trailingAnchor.constraint(equalTo: hintBar.trailingAnchor, constant: -32),
        ])

        let column = UIStackView(arrangedSubviews: [header, viewfinder, hintBar])
        column.axis = .vertical
        column.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(column)
        NSLayoutConstraint.activate([
            column.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            column.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            column.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            column.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }
}

/// The four corner brackets: white while looking, green once a code is found.
final class ScanBracketsView: UIView {
    var found = false { didSet { setNeedsDisplay() } }

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        isAccessibilityElement = false
    }

    required init?(coder: NSCoder) { nil }

    override func draw(_ rect: CGRect) {
        let stroke: CGFloat = 4, length: CGFloat = 40, radius: CGFloat = 12
        let inset = stroke / 2
        let (w, h) = (bounds.width - inset, bounds.height - inset)
        let path = UIBezierPath()
        for (x, y, dx, dy) in [(inset, inset, 1.0, 1.0), (w, inset, -1.0, 1.0), (inset, h, 1.0, -1.0), (w, h, -1.0, -1.0)] as [(CGFloat, CGFloat, CGFloat, CGFloat)] {
            path.move(to: CGPoint(x: x, y: y + dy * length))
            path.addLine(to: CGPoint(x: x, y: y + dy * radius))
            path.addQuadCurve(to: CGPoint(x: x + dx * radius, y: y), controlPoint: CGPoint(x: x, y: y))
            path.addLine(to: CGPoint(x: x + dx * length, y: y))
        }
        path.lineWidth = stroke
        path.lineCapStyle = .round
        (found ? UIColor(hex: 0x4ADE80) : UIColor.white).setStroke()
        path.stroke()
    }
}

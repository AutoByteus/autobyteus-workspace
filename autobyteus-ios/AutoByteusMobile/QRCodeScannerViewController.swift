import AVFoundation
import AutoByteusMobileCore
import UIKit

final class QRCodeScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    private let onQRCode: (String) -> Void
    private let onDiagnostic: (ConnectionDiagnostic) -> Void
    private let sessionQueue = DispatchQueue(label: "org.autobyteus.mobile.qr-session")
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var didFinish = false

    init(
        onQRCode: @escaping (String) -> Void,
        onDiagnostic: @escaping (ConnectionDiagnostic) -> Void
    ) {
        self.onQRCode = onQRCode
        self.onDiagnostic = onDiagnostic
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        buildOverlay()
        requestCameraAndStart()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
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
        layer.frame = view.bounds
        view.layer.insertSublayer(layer, at: 0)
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
        guard !didFinish,
              let code = metadataObjects.compactMap({ $0 as? AVMetadataMachineReadableCodeObject }).first,
              let text = code.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty else {
            return
        }
        didFinish = true
        stopSession()
        onQRCode(text)
    }

    @objc private func cancel() {
        finishWithDiagnostic(ConnectionDiagnosticMapper.qrScanCancelled())
    }

    private func finishWithDiagnostic(_ diagnostic: ConnectionDiagnostic) {
        guard !didFinish else { return }
        didFinish = true
        stopSession()
        onDiagnostic(diagnostic)
    }

    private func buildOverlay() {
        let title = UILabel()
        title.text = "Scan AutoByteus Phone Access QR"
        title.textColor = .white
        title.font = .systemFont(ofSize: 20, weight: .semibold)
        title.numberOfLines = 0
        title.textAlignment = .center

        let cancelButton = UIButton(type: .system)
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.tintColor = .white
        cancelButton.backgroundColor = UIColor.black.withAlphaComponent(0.45)
        cancelButton.layer.cornerRadius = 10
        cancelButton.addTarget(self, action: #selector(cancel), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [title, cancelButton])
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .center
        view.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            cancelButton.heightAnchor.constraint(equalToConstant: 44),
            cancelButton.widthAnchor.constraint(equalToConstant: 160)
        ])
    }
}

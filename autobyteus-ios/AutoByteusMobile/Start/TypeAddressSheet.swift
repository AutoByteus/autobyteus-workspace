import UIKit

/// "Type an address" (autobyteus-279 UIS-001, VIS-027; a port of Android's `TypeAddressSheet`): a plain `http://` address
/// needs the tick before Connect; shared text that is not a link opens it pre-filled.
final class TypeAddressSheet: UIViewController, UITextFieldDelegate {
    /// The same calm tone as the desktop (Android DEC-017).
    static let httpAcknowledgement = "This address has no extra protection. Fine at home or in your office; on public Wi-Fi, use Tailscale."

    private let prefill: String
    private let onConnect: (_ address: String, _ httpAcknowledged: Bool) -> Void
    private let field = UITextField()
    private let acknowledgement = UISwitch()
    private let acknowledgementRow = UIStackView()
    private var connect: UIButton!

    init(prefill: String, onConnect: @escaping (_ address: String, _ httpAcknowledged: Bool) -> Void) {
        self.prefill = prefill
        self.onConnect = onConnect
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .pageSheet
        sheetPresentationController?.detents = [.medium()]
        sheetPresentationController?.prefersGrabberVisible = true
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ShellColors.white
        view.accessibilityIdentifier = "typeAddress.root"

        let title = ShellUI.label("Type an address", size: 18, weight: .semibold)
        title.accessibilityTraits = .header
        let close = ShellUI.iconButton("xmark", label: "Close", color: ShellColors.slate500) { [weak self] in self?.dismiss(animated: true) }
        let header = UIStackView(arrangedSubviews: [title, UIView(), close])
        header.alignment = .center

        field.text = prefill
        field.placeholder = "https://node.example.com"
        field.accessibilityLabel = "Node address"
        field.accessibilityIdentifier = "typeAddress.field"
        field.keyboardType = .URL
        field.autocapitalizationType = .none
        field.autocorrectionType = .no
        field.spellCheckingType = .no
        field.returnKeyType = .go
        field.font = .systemFont(ofSize: 16)
        field.borderStyle = .none
        field.layer.borderColor = ShellColors.slate300.cgColor
        field.layer.borderWidth = 1
        field.layer.cornerRadius = 12
        field.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 1))
        field.leftViewMode = .always
        field.delegate = self
        field.heightAnchor.constraint(equalToConstant: 48).isActive = true
        field.addAction(UIAction { [weak self] _ in self?.refresh() }, for: .editingChanged)

        acknowledgement.accessibilityIdentifier = "typeAddress.httpAcknowledgement"
        acknowledgement.addAction(UIAction { [weak self] _ in self?.refresh() }, for: .valueChanged)
        let acknowledgementText = ShellUI.label(Self.httpAcknowledgement, size: 15, color: ShellColors.slate700)
        acknowledgementRow.addArrangedSubview(acknowledgementText)
        acknowledgementRow.addArrangedSubview(acknowledgement)
        acknowledgementRow.alignment = .center
        acknowledgementRow.spacing = 12

        connect = ShellUI.primaryButton("Connect", height: 48) { [weak self] in self?.submit() }
        connect.accessibilityIdentifier = "typeAddress.connect"

        let stack = UIStackView(arrangedSubviews: [header, field, acknowledgementRow, connect])
        stack.axis = .vertical
        stack.spacing = 12
        stack.setCustomSpacing(16, after: acknowledgementRow)
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
        ])
        refresh()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        field.becomeFirstResponder()
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if connect.isEnabled { submit() }
        return false
    }

    private var address: String { (field.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines) }

    private func refresh() {
        let isHTTP = address.lowercased().hasPrefix("http://")
        acknowledgementRow.isHidden = !isHTTP
        connect.isEnabled = !address.isEmpty && (!isHTTP || acknowledgement.isOn)
    }

    private func submit() {
        let address = self.address
        let acknowledged = acknowledgement.isOn
        dismiss(animated: true) { [onConnect] in onConnect(address, acknowledged) }
    }
}

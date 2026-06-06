import AutoByteusMobileCore
import UIKit

final class ConnectionViewController: UIViewController {
    struct Callbacks {
        let onOpenSaved: (SavedNodeProfile) -> Void
        let onRemoveSaved: (SavedNodeProfile) -> Void
        let onSubmitInput: (String, Bool) -> Void
        let onScanQR: (UIViewController) -> Void
        let onOpenTailscale: (UIViewController) -> Void
        let onOpenSettings: () -> Void
    }

    private let savedProfiles: [SavedNodeProfile]
    private let diagnostic: ConnectionDiagnostic?
    private let notice: String?
    private let isBusy: Bool
    private let initialInput: String
    private let callbacks: Callbacks

    private let inputViewBox = UITextView()
    private let httpSwitch = UISwitch()

    init(
        savedProfiles: [SavedNodeProfile],
        diagnostic: ConnectionDiagnostic?,
        notice: String?,
        isBusy: Bool,
        initialInput: String,
        callbacks: Callbacks
    ) {
        self.savedProfiles = savedProfiles
        self.diagnostic = diagnostic
        self.notice = notice
        self.isBusy = isBusy
        self.initialInput = initialInput
        self.callbacks = callbacks
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 1.0, alpha: 1)
        view.accessibilityIdentifier = "connection.root"
        render()
    }

    private func render() {
        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(stack)
        view.addSubview(scroll)

        stack.addArrangedSubview(label("AutoByteus Mobile", size: 30, weight: .bold, color: .primaryText))
        stack.addArrangedSubview(label("Connect this iPhone or iPad to your reachable AutoByteus desktop/server node. The existing /mobile web shell owns Home, Chat, Runs and Files.", size: 15, color: .secondaryText))
        if let notice { stack.addArrangedSubview(card(title: "Shared input", body: notice, tone: .info)) }
        if let diagnostic { stack.addArrangedSubview(card(title: diagnostic.title, body: "\(diagnostic.message)\n\n\(diagnostic.recoveryAction)", tone: .warning)) }
        if isBusy { stack.addArrangedSubview(busyRow()) }
        if !savedProfiles.isEmpty { addSavedProfiles(to: stack) }
        addInputSection(to: stack)
        addGuidance(to: stack)

        NSLayoutConstraint.activate([
            scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            stack.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor, constant: 24),
            stack.leadingAnchor.constraint(equalTo: scroll.frameLayoutGuide.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: scroll.frameLayoutGuide.trailingAnchor, constant: -20),
            stack.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor, constant: -24)
        ])
    }

    private func addSavedProfiles(to stack: UIStackView) {
        stack.addArrangedSubview(sectionLabel("Saved nodes"))
        for profile in savedProfiles {
            let row = UIStackView()
            row.axis = .vertical
            row.spacing = 8
            row.isLayoutMarginsRelativeArrangement = true
            row.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 12, leading: 12, bottom: 12, trailing: 12)
            row.backgroundColor = .white
            row.layer.cornerRadius = 12
            row.addArrangedSubview(label(profile.displayName, size: 17, weight: .semibold, color: .primaryText))
            row.addArrangedSubview(label(profile.mobileURL, size: 13, color: .secondaryText))
            let buttons = UIStackView()
            buttons.axis = .horizontal
            buttons.spacing = 10
            buttons.addArrangedSubview(button("Open") { [callbacks] in callbacks.onOpenSaved(profile) })
            buttons.addArrangedSubview(button("Remove") { [callbacks] in callbacks.onRemoveSaved(profile) })
            row.addArrangedSubview(buttons)
            stack.addArrangedSubview(row)
        }
    }

    private func addInputSection(to stack: UIStackView) {
        stack.addArrangedSubview(sectionLabel("Node URL or Phone Access link"))
        inputViewBox.text = initialInput
        inputViewBox.font = .monospacedSystemFont(ofSize: 14, weight: .regular)
        inputViewBox.layer.borderColor = UIColor.systemGray4.cgColor
        inputViewBox.layer.borderWidth = 1
        inputViewBox.layer.cornerRadius = 10
        inputViewBox.backgroundColor = .white
        inputViewBox.accessibilityIdentifier = "connection.input"
        inputViewBox.heightAnchor.constraint(equalToConstant: 96).isActive = true
        stack.addArrangedSubview(inputViewBox)

        let ack = UIStackView()
        ack.axis = .horizontal
        ack.alignment = .center
        ack.spacing = 10
        httpSwitch.accessibilityIdentifier = "connection.httpAcknowledgement"
        ack.addArrangedSubview(httpSwitch)
        ack.addArrangedSubview(label("I understand cleartext http:// should only be used on a trusted private LAN or tailnet.", size: 13, color: .secondaryText))
        stack.addArrangedSubview(ack)

        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 10
        row.distribution = .fillEqually
        row.addArrangedSubview(primaryButton("Connect") { [weak self] in self?.submit() })
        row.addArrangedSubview(button("Paste") { [weak self] in self?.paste() })
        row.addArrangedSubview(button("Scan QR") { [weak self] in self.map { $0.callbacks.onScanQR($0) } })
        stack.addArrangedSubview(row)
    }

    private func addGuidance(to stack: UIStackView) {
        stack.addArrangedSubview(sectionLabel("Private network guidance"))
        stack.addArrangedSubview(label("Prefer an HTTPS Tailscale Serve URL such as https://desktop.tailnet.ts.net/mobile. Pairing with one stable origin avoids WebView credential-origin changes.", size: 14, color: .secondaryText))
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 10
        row.distribution = .fillEqually
        row.addArrangedSubview(button("Tailscale") { [weak self] in self.map { $0.callbacks.onOpenTailscale($0) } })
        row.addArrangedSubview(button("Settings") { [callbacks] in callbacks.onOpenSettings() })
        stack.addArrangedSubview(row)
    }

    private func submit() {
        callbacks.onSubmitInput(inputViewBox.text ?? "", httpSwitch.isOn)
    }

    private func paste() {
        inputViewBox.text = UIPasteboard.general.string ?? inputViewBox.text
    }

    private func busyRow() -> UIView {
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 10
        row.alignment = .center
        let spinner = UIActivityIndicatorView(style: .medium)
        spinner.startAnimating()
        row.addArrangedSubview(spinner)
        row.addArrangedSubview(label("Checking Phone Access status...", size: 14, color: .secondaryText))
        return row
    }
}

private extension ConnectionViewController {
    enum Tone { case info, warning }

    func card(title: String, body: String, tone: Tone) -> UIView {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 6
        stack.isLayoutMarginsRelativeArrangement = true
        stack.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 14, leading: 14, bottom: 14, trailing: 14)
        stack.backgroundColor = tone == .warning ? UIColor(red: 1.0, green: 0.98, blue: 0.91, alpha: 1) : UIColor(red: 0.91, green: 0.96, blue: 1.0, alpha: 1)
        stack.layer.cornerRadius = 12
        stack.addArrangedSubview(label(title, size: 17, weight: .semibold, color: tone == .warning ? .systemOrange : .systemBlue))
        stack.addArrangedSubview(label(body, size: 14, color: .secondaryText))
        return stack
    }

    func label(_ text: String, size: CGFloat, weight: UIFont.Weight = .regular, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .systemFont(ofSize: size, weight: weight)
        label.textColor = color
        label.numberOfLines = 0
        return label
    }

    func sectionLabel(_ text: String) -> UILabel {
        label(text.uppercased(), size: 12, weight: .semibold, color: .secondaryText)
    }

    func primaryButton(_ title: String, action: @escaping () -> Void) -> UIButton {
        let control = button(title, action: action)
        control.backgroundColor = .systemBlue
        control.tintColor = .white
        control.accessibilityIdentifier = title == "Connect" ? "connection.connect" : nil
        return control
    }

    func button(_ title: String, action: @escaping () -> Void) -> UIButton {
        let control = UIButton(type: .system)
        control.setTitle(title, for: .normal)
        control.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        control.layer.cornerRadius = 10
        control.backgroundColor = UIColor(red: 0.91, green: 0.94, blue: 1.0, alpha: 1)
        control.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true
        control.addAction(UIAction { _ in action() }, for: .touchUpInside)
        return control
    }
}

private extension UIColor {
    static let primaryText = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
    static let secondaryText = UIColor(red: 0.28, green: 0.34, blue: 0.42, alpha: 1)
}

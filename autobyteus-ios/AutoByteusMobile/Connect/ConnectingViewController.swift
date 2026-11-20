import UIKit

/// "Connecting to <node>" with Cancel (autobyteus-279 REQ-001; a port of Android's `ConnectingScreen`, VIS-029).
final class ConnectingViewController: UIViewController {
    private let nodeName: String
    private let onCancel: () -> Void

    init(nodeName: String, onCancel: @escaping () -> Void) {
        self.nodeName = nodeName
        self.onCancel = onCancel
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ShellColors.white
        view.accessibilityIdentifier = "connecting.root"
        let spinner = UIActivityIndicatorView(style: .large)
        spinner.color = ShellColors.blue600
        spinner.startAnimating()
        let title = ShellUI.label(nodeName.isEmpty ? "Connecting" : "Connecting to \(nodeName)", size: 18, weight: .semibold)
        title.textAlignment = .center
        title.accessibilityIdentifier = "connecting.title"
        let cancel = ShellUI.textButton("Cancel", size: 15, action: onCancel)
        cancel.accessibilityIdentifier = "connecting.cancel"
        let stack = UIStackView(arrangedSubviews: [spinner, title, cancel])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 24
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -32),
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        ])
        UIAccessibility.post(notification: .screenChanged, argument: title)
    }
}

import AutoByteusMobileCore
import UIKit

/// A node's ⋮ sheet (autobyteus-279; a port of Android's `RemoveNodeSheet`): "Remove from this phone", then the
/// confirmation. Removing touches only this phone.
final class RemoveNodeSheet: UIViewController {
    private let entry: SavedNodeEntry
    private let onRemove: () -> Void
    private let content = UIStackView()

    init(entry: SavedNodeEntry, onRemove: @escaping () -> Void) {
        self.entry = entry
        self.onRemove = onRemove
        super.init(nibName: nil, bundle: nil)
        ShellUI.presentAsSheet(self, phoneDetent: .custom { _ in 220 }, cardHeight: 200)
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ShellColors.white
        view.accessibilityIdentifier = "removeNode.root"
        let title = ShellUI.label(entry.shownName, size: 18, weight: .semibold, lines: 1)
        title.accessibilityTraits = .header
        let close = ShellUI.iconButton("xmark", label: "Close", color: ShellColors.slate500) { [weak self] in self?.dismiss(animated: true) }
        let header = UIStackView(arrangedSubviews: [title, UIView(), close])
        header.alignment = .center

        content.axis = .vertical
        content.spacing = 16
        let remove = ShellUI.textButton("Remove from this phone", color: ShellColors.red700, size: 15) { [weak self] in self?.confirm() }
        remove.contentHorizontalAlignment = .leading
        remove.accessibilityIdentifier = "removeNode.remove"
        content.addArrangedSubview(remove)

        let stack = UIStackView(arrangedSubviews: [header, content])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
        ])
    }

    private func confirm() {
        content.arrangedSubviews.forEach { $0.removeFromSuperview() }
        content.addArrangedSubview(ShellUI.label("Remove \(entry.shownName) from this phone? Scan its QR code again to add it back.", size: 15, color: ShellColors.slate600))
        var cancelConfiguration = UIButton.Configuration.bordered()
        cancelConfiguration.title = "Cancel"
        cancelConfiguration.baseForegroundColor = ShellColors.slate700
        cancelConfiguration.baseBackgroundColor = ShellColors.white
        cancelConfiguration.background.strokeColor = ShellColors.slate300
        cancelConfiguration.background.cornerRadius = 12
        let cancel = UIButton(configuration: cancelConfiguration, primaryAction: UIAction { [weak self] _ in self?.dismiss(animated: true) })
        var removeConfiguration = UIButton.Configuration.filled()
        removeConfiguration.title = "Remove"
        removeConfiguration.baseBackgroundColor = ShellColors.red600
        removeConfiguration.background.cornerRadius = 12
        let remove = UIButton(configuration: removeConfiguration, primaryAction: UIAction { [weak self] _ in
            self?.dismiss(animated: true) { self?.onRemove() }
        })
        remove.accessibilityIdentifier = "removeNode.confirm"
        let buttons = UIStackView(arrangedSubviews: [cancel, remove])
        buttons.distribution = .fillEqually
        buttons.spacing = 12
        buttons.heightAnchor.constraint(equalToConstant: 48).isActive = true
        content.addArrangedSubview(buttons)
    }
}

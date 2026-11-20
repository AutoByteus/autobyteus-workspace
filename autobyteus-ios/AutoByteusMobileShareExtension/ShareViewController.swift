import AutoByteusMobileCore
import UIKit
import UniformTypeIdentifiers

/// The share extension's sheet (autobyteus-279 UIS-016; VIS-026, 028, 037): the AutoByteus mark and name, the shared text
/// in one monospace line, and what the app will do with it ("Saved. Open AutoByteus to connect." / "… to see the demo." /
/// "… to use it as an address."), or that nothing usable was shared; Done closes it. A usable text is kept for the app,
/// which acts on it once when it next becomes active (REQ-007). On iPad the sheet is a centered card.
final class ShareViewController: UIViewController {
    private let store = PendingSharedInputStore(appGroupIdentifier: SavedNodeStore.appGroupIdentifier)
    private let preview = UILabel()
    private let previewBox = UIView()
    private let message = UILabel()
    private var didHandle = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 15 / 255, green: 23 / 255, blue: 42 / 255, alpha: 0.4)
        render()
        extractSharedInput()
    }

    private func render() {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 24
        card.layer.maskedCorners = UIDevice.current.userInterfaceIdiom == .pad
            ? [.layerMinXMinYCorner, .layerMaxXMinYCorner, .layerMinXMaxYCorner, .layerMaxXMaxYCorner]
            : [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        card.accessibilityIdentifier = "share.sheet"

        let mark = UIImageView(image: UIImage(named: "AutoByteusMark"))
        mark.isAccessibilityElement = false
        let name = UILabel()
        name.text = "AutoByteus"
        name.font = .systemFont(ofSize: 18, weight: .semibold)
        name.textColor = UIColor(red: 15 / 255, green: 23 / 255, blue: 42 / 255, alpha: 1)
        let header = UIStackView(arrangedSubviews: [mark, name, UIView()])
        header.alignment = .center
        header.spacing = 10

        preview.font = .monospacedSystemFont(ofSize: 14, weight: .regular)
        preview.textColor = UIColor(red: 51 / 255, green: 65 / 255, blue: 85 / 255, alpha: 1)
        preview.lineBreakMode = .byTruncatingTail
        preview.numberOfLines = 1
        preview.accessibilityIdentifier = "share.preview"
        previewBox.backgroundColor = UIColor(red: 248 / 255, green: 250 / 255, blue: 252 / 255, alpha: 1)
        previewBox.layer.cornerRadius = 12
        previewBox.layer.borderWidth = 1
        previewBox.layer.borderColor = UIColor(red: 226 / 255, green: 232 / 255, blue: 240 / 255, alpha: 1).cgColor
        previewBox.isHidden = true
        preview.translatesAutoresizingMaskIntoConstraints = false
        previewBox.addSubview(preview)

        message.font = .systemFont(ofSize: 15)
        message.textColor = UIColor(red: 71 / 255, green: 85 / 255, blue: 105 / 255, alpha: 1)
        message.numberOfLines = 0
        message.accessibilityIdentifier = "share.message"

        var doneConfiguration = UIButton.Configuration.filled()
        doneConfiguration.title = "Done"
        doneConfiguration.baseBackgroundColor = UIColor(red: 37 / 255, green: 99 / 255, blue: 235 / 255, alpha: 1)
        doneConfiguration.background.cornerRadius = 16
        let done = UIButton(configuration: doneConfiguration, primaryAction: UIAction { [weak self] _ in self?.finish() })
        done.accessibilityIdentifier = "share.done"

        let stack = UIStackView(arrangedSubviews: [header, previewBox, message, done])
        stack.axis = .vertical
        stack.spacing = 16
        stack.setCustomSpacing(20, after: message)
        for item in [card, mark, stack] { item.translatesAutoresizingMaskIntoConstraints = false }
        card.addSubview(stack)
        view.addSubview(card)

        let isPad = UIDevice.current.userInterfaceIdiom == .pad
        NSLayoutConstraint.activate([
            mark.widthAnchor.constraint(equalToConstant: 28), mark.heightAnchor.constraint(equalToConstant: 28),
            header.heightAnchor.constraint(equalToConstant: 56),
            previewBox.heightAnchor.constraint(equalToConstant: 40),
            preview.leadingAnchor.constraint(equalTo: previewBox.leadingAnchor, constant: 12),
            preview.trailingAnchor.constraint(equalTo: previewBox.trailingAnchor, constant: -12),
            preview.centerYAnchor.constraint(equalTo: previewBox.centerYAnchor),
            done.heightAnchor.constraint(equalToConstant: 48),
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 8),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            stack.bottomAnchor.constraint(equalTo: card.safeAreaLayoutGuide.bottomAnchor, constant: -16),
        ])
        if isPad {
            NSLayoutConstraint.activate([
                card.centerXAnchor.constraint(equalTo: view.centerXAnchor), card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
                card.widthAnchor.constraint(equalToConstant: 512),
            ])
        } else {
            NSLayoutConstraint.activate([
                card.leadingAnchor.constraint(equalTo: view.leadingAnchor), card.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                card.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            ])
        }
    }

    private func extractSharedInput() {
        let providers = extensionContext?.inputItems.compactMap { $0 as? NSExtensionItem }.flatMap { $0.attachments ?? [] } ?? []
        for provider in providers where load(UTType.url, from: provider) || load(UTType.plainText, from: provider) { return }
        show(nil)
    }

    private func load(_ type: UTType, from provider: NSItemProvider) -> Bool {
        guard provider.hasItemConformingToTypeIdentifier(type.identifier) else { return false }
        provider.loadItem(forTypeIdentifier: type.identifier, options: nil) { [weak self] item, _ in
            let text = (item as? URL)?.absoluteString ?? (item as? String)
            DispatchQueue.main.async { self?.show(text) }
        }
        return true
    }

    /// Shows what the app will do with `rawText` and keeps it when it is usable.
    private func show(_ rawText: String?) {
        guard !didHandle else { return }
        didHandle = true
        let text = rawText?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let action = SharedTextAction.classify(text)
        message.text = action.shareMessage
        if action != .nothing {
            store.store(PendingSharedInput(rawText: text, source: "ios-share-extension"))
            preview.text = text.replacingOccurrences(of: "\n", with: " ")
            previewBox.isHidden = false
        }
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}

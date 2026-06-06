import AutoByteusMobileCore
import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    private let store = PendingSharedInputStore(appGroupIdentifier: SavedNodeStore.appGroupIdentifier)
    private let statusLabel = UILabel()
    private var didStoreInput = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        render()
        extractSharedInput()
    }

    private func render() {
        statusLabel.text = "Saving shared AutoByteus input..."
        statusLabel.numberOfLines = 0
        statusLabel.textAlignment = .center
        statusLabel.font = .systemFont(ofSize: 17, weight: .regular)

        let done = UIButton(type: .system)
        done.setTitle("Done", for: .normal)
        done.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        done.addAction(UIAction { [weak self] _ in self?.finish() }, for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [statusLabel, done])
        stack.axis = .vertical
        stack.spacing = 18
        stack.alignment = .center
        view.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    private func extractSharedInput() {
        let itemProviders = extensionContext?.inputItems
            .compactMap { $0 as? NSExtensionItem }
            .flatMap { $0.attachments ?? [] } ?? []
        guard !itemProviders.isEmpty else {
            statusLabel.text = "No text or URL was provided to AutoByteus."
            return
        }
        for provider in itemProviders {
            if loadURL(from: provider) || loadText(from: provider) { return }
        }
        statusLabel.text = "AutoByteus could not read text or a URL from this share."
    }

    private func loadURL(from provider: NSItemProvider) -> Bool {
        guard provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) else { return false }
        provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] item, _ in
            let text = (item as? URL)?.absoluteString ?? (item as? String)
            self?.storeSharedText(text)
        }
        return true
    }

    private func loadText(from provider: NSItemProvider) -> Bool {
        guard provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) else { return false }
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] item, _ in
            self?.storeSharedText(item as? String)
        }
        return true
    }

    private func storeSharedText(_ rawText: String?) {
        DispatchQueue.main.async {
            guard !self.didStoreInput else { return }
            let text = rawText?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !text.isEmpty else {
                self.statusLabel.text = "The shared item did not contain usable text."
                return
            }
            self.didStoreInput = true
            self.store.store(PendingSharedInput(rawText: text, source: "ios-share-extension"))
            self.statusLabel.text = "Saved for AutoByteus. Open AutoByteus to review and connect this shared URL or pairing payload."
        }
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}

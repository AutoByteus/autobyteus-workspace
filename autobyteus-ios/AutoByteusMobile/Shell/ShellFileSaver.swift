import UIKit

/// The bridge's `saveFile` on iOS (autobyteus-279, Android's contract): a PDF or an image the page hands over, offered with
/// the system share sheet (Save to Files, Save Image). The name is a plain name whose extension matches its type.
enum ShellFileSaver {
    private static let allowed: [String: Set<String>] = [
        "application/pdf": ["pdf"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/gif": ["gif"], "image/webp": ["webp"], "image/svg+xml": ["svg"],
    ]

    static func present(fileName: String, mimeType: String, base64: String, from presenter: UIViewController) {
        let name = (fileName as NSString).lastPathComponent
        let ext = (name as NSString).pathExtension.lowercased()
        guard !name.isEmpty, name == fileName, allowed[mimeType]?.contains(ext) == true, let data = Data(base64Encoded: base64) else { return }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let file = directory.appendingPathComponent(name)
            try data.write(to: file)
            let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            share.popoverPresentationController?.sourceView = presenter.view
            share.popoverPresentationController?.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
            share.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: directory) }
            presenter.present(share, animated: true)
        } catch {
            try? FileManager.default.removeItem(at: directory)
        }
    }
}

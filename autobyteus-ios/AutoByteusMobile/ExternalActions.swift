import SafariServices
import UIKit

@MainActor
final class ExternalActions {
    func openTailscale(from presenter: UIViewController) {
        openExternal(URL(string: "https://tailscale.com/download/ios")!, from: presenter)
    }

    func openSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    func openExternal(_ url: URL, from presenter: UIViewController?) {
        if ["http", "https"].contains(url.scheme?.lowercased() ?? ""), let presenter {
            presenter.present(SFSafariViewController(url: url), animated: true)
            return
        }
        UIApplication.shared.open(url)
    }
}

import UIKit

/// The bridge's `desktopFullScreen` on iOS (Android's contract): the VNC Viewer's desktop full screen turns the phone to
/// landscape and hides the status bar; off, the app follows the device again. The hosting view controller reads `isOn`
/// for its status bar and orientations.
final class DesktopFullScreen {
    private(set) var isOn = false

    func set(_ on: Bool, for controller: UIViewController) {
        isOn = on
        controller.setNeedsStatusBarAppearanceUpdate()
        controller.setNeedsUpdateOfSupportedInterfaceOrientations()
        guard let scene = controller.view.window?.windowScene else { return }
        let orientations: UIInterfaceOrientationMask = on ? .landscape : (UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown)
        scene.requestGeometryUpdate(.iOS(interfaceOrientations: orientations)) { _ in }
    }

    var supportedOrientations: UIInterfaceOrientationMask {
        isOn ? .landscape : (UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown)
    }
}

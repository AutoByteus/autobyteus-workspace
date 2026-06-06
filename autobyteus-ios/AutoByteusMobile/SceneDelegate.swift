import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var coordinator: AppShellCoordinator?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        let coordinator = AppShellCoordinator(window: window)
        self.window = window
        self.coordinator = coordinator
        window.makeKeyAndVisible()
        coordinator.start()
        handle(connectionOptions.urlContexts)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        coordinator?.consumePendingSharedInputIfNeeded()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        handle(URLContexts)
    }

    private func handle(_ contexts: Set<UIOpenURLContext>) {
        guard let url = contexts.first?.url else { return }
        coordinator?.handleIncomingURL(url)
    }
}

// autobyteus-574 feasibility prototype (temporary): AVPlayer fed by a resource loader that adds the key header and Range.
import UIKit
import AVFoundation
import AVKit

final class Loader: NSObject, AVAssetResourceLoaderDelegate, URLSessionDataDelegate {
    lazy var session = URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)
    var byTask: [Int: AVAssetResourceLoadingRequest] = [:]
    let lock = NSLock()
    func realURL(_ u: URL) -> URL { var c = URLComponents(url: u, resolvingAgainstBaseURL: false)!; c.scheme = "http"; return c.url! }
    func resourceLoader(_ l: AVAssetResourceLoader, shouldWaitForLoadingOfRequestedResource r: AVAssetResourceLoadingRequest) -> Bool {
        guard let url = r.request.url else { return false }
        var req = URLRequest(url: realURL(url))
        req.setValue("Bearer test-key", forHTTPHeaderField: "Authorization")
        if let d = r.dataRequest {
            let start = d.requestedOffset
            let end = d.requestsAllDataToEndOfResource ? "" : String(start + Int64(d.requestedLength) - 1)
            req.setValue("bytes=\(start)-\(end)", forHTTPHeaderField: "Range")
        }
        NSLog("PROTO load range=%@ t=%.2f", req.value(forHTTPHeaderField: "Range") ?? "none", CACurrentMediaTime())
        let task = session.dataTask(with: req)
        lock.lock(); byTask[task.taskIdentifier] = r; lock.unlock()
        task.resume(); return true
    }
    func resourceLoader(_ l: AVAssetResourceLoader, didCancel r: AVAssetResourceLoadingRequest) {
        lock.lock(); let ids = byTask.filter { $0.value === r }.map { $0.key }; ids.forEach { byTask.removeValue(forKey: $0) }; lock.unlock()
        session.getAllTasks { ts in ts.filter { ids.contains($0.taskIdentifier) }.forEach { $0.cancel() } }
        NSLog("PROTO cancel")
    }
    func req(_ t: URLSessionTask) -> AVAssetResourceLoadingRequest? { lock.lock(); defer { lock.unlock() }; return byTask[t.taskIdentifier] }
    func urlSession(_ s: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        if let r = req(dataTask), let info = r.contentInformationRequest, let h = response as? HTTPURLResponse {
            info.contentType = "public.mpeg-4"; info.isByteRangeAccessSupported = true
            if let cr = h.value(forHTTPHeaderField: "Content-Range"), let total = cr.split(separator: "/").last { info.contentLength = Int64(total) ?? 0 }
        }
        completionHandler(.allow)
    }
    func urlSession(_ s: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) { req(dataTask)?.dataRequest?.respond(with: data) }
    func urlSession(_ s: URLSession, task: URLSessionTask, didCompleteWithError e: Error?) {
        guard let r = req(task) else { return }
        lock.lock(); byTask.removeValue(forKey: task.taskIdentifier); lock.unlock()
        if let e = e { r.finishLoading(with: e) } else { r.finishLoading() }
    }
}

final class VC: UIViewController {
    let loader = Loader()
    override func viewDidAppear(_ a: Bool) {
        super.viewDidAppear(a)
        let asset = AVURLAsset(url: URL(string: "abmedia://127.0.0.1:8574/media/video.mp4")!)
        asset.resourceLoader.setDelegate(loader, queue: DispatchQueue(label: "loader"))
        let player = AVPlayer(playerItem: AVPlayerItem(asset: asset))
        let pvc = AVPlayerViewController(); pvc.player = player
        present(pvc, animated: false) { player.play() }
        let t0 = CACurrentMediaTime()
        player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { t in if player.rate > 0 { NSLog("PROTO playing at=%.1f media=%.1f", CACurrentMediaTime() - t0, t.seconds) } }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { player.seek(to: CMTime(seconds: 45, preferredTimescale: 600)); NSLog("PROTO seek-to-45") }
        DispatchQueue.main.asyncAfter(deadline: .now() + 9) { NSLog("PROTO at9s t=%.1f rate=%.1f status=%d err=%@", player.currentTime().seconds, player.rate, player.currentItem!.status.rawValue, String(describing: player.currentItem!.error)) }
    }
}

@main final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ a: UIApplication, didFinishLaunchingWithOptions o: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds); window!.rootViewController = VC(); window!.makeKeyAndVisible(); return true
    }
}

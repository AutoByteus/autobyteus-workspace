import Foundation
import Network

/// A real HTTP/1.1 server on a local port for the tests (Network.framework): it records each request's path and headers
/// and answers with `handle`'s status, headers and body.
final class TinyHTTPListener {
    struct Request {
        let path: String
        let headers: [String: String]
        func header(_ name: String) -> String? { headers[name.lowercased()] }
    }

    private let listener: NWListener
    private let queue = DispatchQueue(label: "tiny-http")
    private let handle: (Request) -> (Int, [String: String], Data)
    private let lock = NSLock()
    private var _requests: [Request] = []
    private(set) var port: UInt16 = 0

    var requests: [Request] { lock.lock(); defer { lock.unlock() }; return _requests }
    var origin: String { "http://127.0.0.1:\(port)" }

    init(handle: @escaping (Request) -> (Int, [String: String], Data)) throws {
        self.handle = handle
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = NWEndpoint.hostPort(host: "127.0.0.1", port: .any)
        listener = try NWListener(using: parameters)
        let ready = DispatchSemaphore(value: 0)
        listener.stateUpdateHandler = { state in if case .ready = state { ready.signal() } }
        listener.newConnectionHandler = { [weak self] connection in self?.serve(connection) }
        listener.start(queue: queue)
        _ = ready.wait(timeout: .now() + 5)
        port = listener.port?.rawValue ?? 0
    }

    func stop() { listener.cancel() }

    private func serve(_ connection: NWConnection) {
        connection.start(queue: queue)
        receive(connection, Data())
    }

    private func receive(_ connection: NWConnection, _ buffered: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65_536) { [weak self] data, _, complete, error in
            guard let self else { return }
            var received = buffered
            if let data { received.append(data) }
            guard let end = received.range(of: Data("\r\n\r\n".utf8)) else {
                if complete || error != nil { connection.cancel() } else { self.receive(connection, received) }
                return
            }
            let head = String(decoding: received[..<end.lowerBound], as: UTF8.self).components(separatedBy: "\r\n")
            let path = head.first?.split(separator: " ").dropFirst().first.map(String.init) ?? "/"
            var headers: [String: String] = [:]
            for line in head.dropFirst() {
                guard let colon = line.firstIndex(of: ":") else { continue }
                headers[line[..<colon].trimmingCharacters(in: .whitespaces).lowercased()] = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
            }
            let request = Request(path: path, headers: headers)
            self.lock.lock(); self._requests.append(request); self.lock.unlock()
            let (status, answerHeaders, body) = self.handle(request)
            var text = "HTTP/1.1 \(status) X\r\n"
            for (name, value) in answerHeaders { text += "\(name): \(value)\r\n" }
            text += "Content-Length: \(body.count)\r\nConnection: close\r\n\r\n"
            connection.send(content: Data(text.utf8) + body, completion: .contentProcessed { _ in connection.cancel() })
        }
    }
}

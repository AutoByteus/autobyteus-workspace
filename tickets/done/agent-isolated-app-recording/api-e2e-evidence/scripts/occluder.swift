// Temporary probe: cover every on-screen window of <pid> with an opaque window for <seconds>.
import AppKit
let args = CommandLine.arguments
let pid = Int32(args[1])!, seconds = Double(args[2])!
let info = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as! [[String: Any]]
let frames = info.filter { ($0[kCGWindowOwnerPID as String] as? Int32) == pid && ($0[kCGWindowLayer as String] as? Int) == 0 }
  .compactMap { $0[kCGWindowBounds as String] as? [String: CGFloat] }
  .map { CGRect(x: $0["X"]!, y: $0["Y"]!, width: $0["Width"]!, height: $0["Height"]!) }
print("covering \(frames)")
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let primaryHeight = NSScreen.screens[0].frame.height
var windows: [NSWindow] = []
for f in frames {
  let rect = NSRect(x: f.minX - 20, y: primaryHeight - f.maxY - 20, width: f.width + 40, height: f.height + 40)
  let w = NSWindow(contentRect: rect, styleMask: .borderless, backing: .buffered, defer: false)
  w.backgroundColor = .darkGray; w.isOpaque = true; w.level = .floating; w.orderFrontRegardless()
  windows.append(w)
}
DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { print("done"); app.terminate(nil) }
app.run()

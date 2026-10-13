import Foundation
import Virtualization
let object = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [String: Any]
let bytes = Data(base64Encoded: object["hardwareModel"] as! String)!
let model = VZMacHardwareModel(dataRepresentation: bytes)
let result: [String: Any] = ["virtualizationSupported": VZVirtualMachine.isSupported, "hardwareModelDecoded": model != nil, "pinnedGuestHardwareSupported": model?.isSupported ?? false, "hostPrivilegeChange": false, "vmBootAttempt": false]
let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)

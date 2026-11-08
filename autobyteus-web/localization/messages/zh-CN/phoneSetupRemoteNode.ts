import type { TranslationCatalog } from '../../runtime/types';

// Phone Setup in the window of a node on another computer (autobyteus-426 REQ-016, Product spec
// `phone-setup-remote-node-wording`): the node is named; "this computer" means only the desktop.
// Selected by `utils/phoneAccess/phoneSetupTextKey.ts` (REMOTE_WORDED_PATHS).
const phoneSetupRemoteNodeMessages = {
  'settings.components.settings.phone.remote.status.local_network.ready': '从这台电脑可以通过 Wi-Fi 或局域网地址访问 {{name}}。',
  'settings.components.settings.phone.remote.status.local_network.notReady': '从这台电脑无法通过 Wi-Fi 或局域网地址访问 {{name}}。',
  'settings.components.settings.phone.remote.status.tailscale.ready': '就绪：从这台电脑可以通过 Tailscale 访问 {{name}}。',
  'settings.components.settings.phone.remote.status.tailscale.notReady': '从这台电脑无法通过 Tailscale 访问 {{name}}。',
  'settings.components.settings.phone.remote.status.vpn.ready': '就绪：从这台电脑可以通过 VPN 访问 {{name}}。',
  'settings.components.settings.phone.remote.status.vpn.notReady': '从这台电脑无法通过 VPN 访问 {{name}}。请将两者都连接到你的 VPN，然后点击“再次检查”。',
  'settings.components.settings.phone.remote.note.tailscale': '仍无法访问。{{name}} 和这台电脑上的 Tailscale 都必须开启。',
  'settings.components.settings.phone.remote.note.vpn': '仍无法通过 VPN 访问。',
  'settings.components.settings.phone.remote.blocked.noNetwork': '{{name}} 不在手机可以使用的网络上。请将它连接到 Wi-Fi 或 VPN，然后重试。',
  'settings.components.settings.phone.remote.wifi.allowedNote': '仅限此网络。{{name}} 会记住它。换到新网络时会再次询问。',
  'settings.components.settings.phone.remote.how.local_network.line': '手机通过本地网络直接与 {{name}} 通信，就像家里的两台设备一样。',
  'settings.components.settings.phone.remote.how.local_network.when': '手机和 {{name}} 在同一 Wi-Fi 或局域网上，例如家庭或办公室网络。',
  'settings.components.settings.phone.remote.how.local_network.safety': '此连接没有额外保护，同一网络上的其他人可能看到它。在家和办公室可以放心使用。在公共 Wi-Fi（咖啡馆、酒店、机场）上请改用 Tailscale。仅在手机与 {{name}} 在同一网络时可用。',
  'settings.components.settings.phone.remote.how.tailscale.line': 'Tailscale 在手机和 {{name}} 之间建立私密的加密连接，无论它们在哪里。',
  'settings.components.settings.phone.remote.how.tailscale.setupStep1': '在 {{name}}、这台电脑和手机上安装 Tailscale（免费）。',
  'settings.components.settings.phone.remote.how.tailscale.setupStep2': '三者登录同一账号并保持开启。',
  'settings.components.settings.phone.remote.how.tailscale.setupReady': '在 {{name}}、这台电脑和手机上安装 Tailscale（免费），三者登录同一账号并保持开启。AutoByteus 会自动找到它。',
  'settings.components.settings.phone.remote.how.tailscale.safety': '手机和 {{name}} 之间的连接是加密的，只有登录你的 Tailscale 账号的设备才能访问。',
  'settings.components.settings.phone.remote.how.vpn.line': '你的 VPN 把手机和 {{name}} 放在同一个私有网络中。',
  'settings.components.settings.phone.remote.how.vpn.when': '你已经在使用连接手机和 {{name}} 的 VPN。',
  'settings.components.settings.phone.remote.how.vpn.setup': '将 {{name}}、这台电脑和手机连接到 VPN，并在 {{name}} 的 AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS 中列出该 VPN 网络（例如 10.8.0.0/16）：节点只接受你列出的网络。',
} satisfies TranslationCatalog;

export default phoneSetupRemoteNodeMessages;

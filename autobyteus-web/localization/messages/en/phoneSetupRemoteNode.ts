import type { TranslationCatalog } from '../../runtime/types';

// Phone Setup in the window of a node on another computer (autobyteus-426 REQ-016, Product spec
// `phone-setup-remote-node-wording`): the node is named; "this computer" means only the desktop.
// Selected by `utils/phoneAccess/phoneSetupTextKey.ts` (REMOTE_WORDED_PATHS).
const phoneSetupRemoteNodeMessages = {
  'settings.components.settings.phone.remote.status.local_network.ready': '{{name}} is reachable on a Wi-Fi or LAN address from this computer.',
  'settings.components.settings.phone.remote.status.local_network.notReady': '{{name}} isn’t reachable on a Wi-Fi or LAN address from this computer.',
  'settings.components.settings.phone.remote.status.tailscale.ready': 'Ready: {{name}} is reachable through Tailscale from this computer.',
  'settings.components.settings.phone.remote.status.tailscale.notReady': '{{name}} isn’t reachable through Tailscale from this computer.',
  'settings.components.settings.phone.remote.status.vpn.ready': 'Ready: {{name}} is reachable through a VPN from this computer.',
  'settings.components.settings.phone.remote.status.vpn.notReady': '{{name}} isn’t reachable through a VPN from this computer. Connect both to your VPN, then Check again.',
  'settings.components.settings.phone.remote.note.tailscale': 'Still not reachable. Tailscale must be on for {{name}} and for this computer.',
  'settings.components.settings.phone.remote.note.vpn': 'Still not reachable through a VPN.',
  'settings.components.settings.phone.remote.blocked.noNetwork': '{{name}} isn’t on a network a phone could use. Connect it to Wi-Fi or a VPN, then try again.',
  'settings.components.settings.phone.remote.wifi.allowedNote': 'This network. {{name}} remembers it. We ask again on a new network.',
  'settings.components.settings.phone.remote.how.local_network.line': 'Your phone talks to {{name}} directly over your local network, like two devices at home.',
  'settings.components.settings.phone.remote.how.local_network.when': 'Your phone and {{name}} are on the same Wi-Fi or LAN, such as a home or office network.',
  'settings.components.settings.phone.remote.how.local_network.safety': 'The connection has no extra protection, so others on the same network could see it. Fine at home and in your office. On public Wi-Fi (café, hotel, airport) use Tailscale instead. Works only while the phone is on the same network as {{name}}.',
  'settings.components.settings.phone.remote.how.tailscale.line': 'Tailscale builds a private, encrypted connection between your phone and {{name}}, wherever they are.',
  'settings.components.settings.phone.remote.how.tailscale.setupStep1': 'Install Tailscale (free) on {{name}}, on this computer and on your phone.',
  'settings.components.settings.phone.remote.how.tailscale.setupStep2': 'Sign in to the same account on all three, and keep it on.',
  'settings.components.settings.phone.remote.how.tailscale.setupReady': 'Install Tailscale (free) on {{name}}, on this computer and on your phone, sign in to the same account on all three, and keep it on. AutoByteus finds it by itself.',
  'settings.components.settings.phone.remote.how.tailscale.safety': 'The connection is encrypted between your phone and {{name}}, and only devices signed in to your Tailscale account can reach it.',
  'settings.components.settings.phone.remote.how.vpn.line': 'Your VPN puts your phone and {{name}} in the same private network.',
  'settings.components.settings.phone.remote.how.vpn.when': 'You already use your own VPN that connects your phone and {{name}}.',
  'settings.components.settings.phone.remote.how.vpn.setup': 'Connect {{name}}, this computer and your phone to the VPN, and list the VPN network (for example 10.8.0.0/16) in AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS on {{name}}: a node accepts only the networks you list.',
} satisfies TranslationCatalog;

export default phoneSetupRemoteNodeMessages;

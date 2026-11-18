import type { TranslationKey } from '~/localization/runtime/types';
import type { PhoneNodeKind } from '~/utils/phoneAccess/phoneConnectionWays';

export const PHONE_SETUP_TEXT_PREFIX = 'settings.components.settings.phone.';

/**
 * The Phone Setup lines worded for a node on another computer (autobyteus-426 REQ-016, Product spec
 * `phone-setup-remote-node-wording`): there the node is named and "this computer" means only the desktop. Each path has
 * a `remote.<path>` sibling key in every catalog; every other line (and every line of an embedded or Docker node) keeps
 * its one key.
 */
export const REMOTE_WORDED_PATHS = [
  'status.local_network.ready',
  'status.local_network.notReady',
  'status.tailscale.ready',
  'status.tailscale.notReady',
  'status.vpn.ready',
  'status.vpn.notReady',
  'note.tailscale',
  'note.vpn',
  'blocked.noNetwork',
  'wifi.allowedNote',
  'how.local_network.line',
  'how.local_network.when',
  'how.local_network.safety',
  'how.tailscale.line',
  'how.tailscale.setupStep1',
  'how.tailscale.setupStep2',
  'how.tailscale.setupReady',
  'how.tailscale.safety',
  'how.vpn.line',
  'how.vpn.when',
  'how.vpn.setup',
] as const;

const REMOTE_WORDED = new Set<string>(REMOTE_WORDED_PATHS);

/** The catalog key of a Phone Setup line (`path` under `settings.components.settings.phone.`) for the window's node kind. */
export const phoneSetupTextKey = (kind: PhoneNodeKind, path: string): TranslationKey =>
  `${PHONE_SETUP_TEXT_PREFIX}${kind === 'remote' && REMOTE_WORDED.has(path) ? `remote.${path}` : path}`;

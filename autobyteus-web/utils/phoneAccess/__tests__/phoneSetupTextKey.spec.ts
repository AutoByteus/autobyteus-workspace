import { describe, expect, it } from 'vitest';
import enMessages from '~/localization/messages/en';
import zhCnMessages from '~/localization/messages/zh-CN';
import { PHONE_SETUP_TEXT_PREFIX, REMOTE_WORDED_PATHS, phoneSetupTextKey } from '~/utils/phoneAccess/phoneSetupTextKey';

// autobyteus-426 REQ-016 (ARCH-REV-001 AR-002): a rule over an explicit list, never a key-existence lookup.
describe('phoneSetupTextKey', () => {
  it('chooses the remote wording for a listed line of a node on another computer only', () => {
    expect(phoneSetupTextKey('remote', 'status.vpn.notReady')).toBe('settings.components.settings.phone.remote.status.vpn.notReady');
    expect(phoneSetupTextKey('remote', 'status.company_address.ready')).toBe('settings.components.settings.phone.status.company_address.ready');
    expect(phoneSetupTextKey('remote', 'how.company_address.line')).toBe('settings.components.settings.phone.how.company_address.line');
    expect(phoneSetupTextKey('embedded', 'status.vpn.notReady')).toBe('settings.components.settings.phone.status.vpn.notReady');
    expect(phoneSetupTextKey('local_container', 'blocked.noNetwork')).toBe('settings.components.settings.phone.blocked.noNetwork');
  });

  it('has the remote line and today\'s line in English and Chinese for every listed path', () => {
    for (const catalog of [enMessages, zhCnMessages] as Array<Record<string, string>>) {
      for (const path of REMOTE_WORDED_PATHS) {
        expect(catalog[`${PHONE_SETUP_TEXT_PREFIX}remote.${path}`], `remote.${path}`).toBeTruthy();
        expect(catalog[`${PHONE_SETUP_TEXT_PREFIX}${path}`], path).toBeTruthy();
      }
    }
  });

  it('names the node in every remote line and keeps "this computer" for the desktop only', () => {
    const catalog = enMessages as Record<string, string>;
    const nodeNamed = REMOTE_WORDED_PATHS.filter((path) => !['note.vpn', 'how.tailscale.setupStep2'].includes(path));
    for (const path of nodeNamed) expect(catalog[`${PHONE_SETUP_TEXT_PREFIX}remote.${path}`], path).toContain('{{name}}');
  });
});

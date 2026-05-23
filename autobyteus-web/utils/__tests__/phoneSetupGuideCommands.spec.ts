import { describe, expect, it } from 'vitest';
import { buildPhoneSetupGuideCommands, phoneSetupInstallLinks } from '../phoneSetupGuideCommands';

describe('phoneSetupGuideCommands', () => {
  it('provides the macOS install link only', () => {
    expect(phoneSetupInstallLinks.map((link) => link.id)).toEqual(['macos']);
    expect(phoneSetupInstallLinks[0]?.href).toBe('https://tailscale.com/kb/1065/macos');
  });

  it('provides only app-direct macOS Serve commands', () => {
    const commands = buildPhoneSetupGuideCommands();

    expect(commands.map((command) => command.command)).toEqual([
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale serve 29695',
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695',
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status',
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale serve reset',
    ]);
    expect(commands.every((command) => command.phase === 'macos' && command.isPrimary)).toBe(true);
  });
});

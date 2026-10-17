import { describe, expect, it } from 'vitest';
import { nfsLauncherCommand, nfsPublishedRelease, type NfsPublishedRelease } from '../nfsLauncherCommands';
const fixture: NfsPublishedRelease = {tag:'test-fixture', installerUrl:'https://release.example.invalid/fixture/install.sh',downloadUrl:'https://release.example.invalid/fixture',qualifiedComputers:['macos','linux']};
describe('NFS release command descriptor (fixture is not published availability)', () => {
  it('does not advertise unreleased commands', () => {
    expect(nfsPublishedRelease).toBeNull();expect(nfsLauncherCommand('macos')).toBeNull();expect(nfsLauncherCommand('linux')).toBeNull();
  });
  it('points one complete invocation at the descriptor installer', () => {
    expect(nfsLauncherCommand('macos',fixture)).toBe(`curl -fsSL '${fixture.installerUrl}' | bash`);
    expect(nfsLauncherCommand('linux',{...fixture,qualifiedComputers:['macos']})).toBeNull();
  });
  it.each(['http://unsafe/install.sh', "https://host/a';touch /tmp/oops;echo '", 'https://u:p@host/script', 'javascript:alert(1)', 'https://host/\nscript'])(
    'refuses invalid or shell-active URLs: %s', installerUrl => expect(nfsLauncherCommand('macos',{...fixture,installerUrl})).toBeNull(),
  );
});

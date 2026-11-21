# Protected Ubuntu desktop installation

The personal Linux AppImage retains Chromium's sandbox. A host that permits the
normal sandbox runs the portable image without installation, authentication or
release-record network access. The executable used for embedded Node remains the
real Electron ELF; AppRun only owns the outer desktop launch.

On a restricted Ubuntu desktop, an identified early Chromium sandbox failure
opens an installation choice. **Install** verifies the exact tagged release's
detached signed record and the opened AppImage bytes before asking Ubuntu for
one administrator authorization. Initial installation needs the official release
service; normal installed launches do not. Renaming the downloaded file is fine.
If the official verification files are unavailable, retry later or contact
AutoByteus support. If the download cannot be verified, get a fresh copy from
the [official releases page](https://github.com/AutoByteus/autobyteus-workspace/releases).
Contact support if that copy also fails verification. None of these failures
authorizes installation or disables the sandbox.

Ubuntu's authorization dialog names the retained native helper path, not a
verified publisher. Only use the official download. The launcher explains that
path before the prompt; it never captures or stores the administrator password.
The helper is sealed in kernel memory during authorization and independently
verifies the streamed payload. A terminal uses Ubuntu's separate authentication
agent, not a shell running a downloaded installer.

## Files and updates

The installation for login UID `<uid>` is
`/opt/autobyteus-desktop/<uid>/app/AutoByteus.AppImage`. Administrator-owned
support files, a narrowly scoped AppArmor profile and a systemd socket authorize
only this protected installation. A locked non-login account `abdesk-<uid>` owns
the app store. The desktop user cannot replace the image directly. Other
applications and global Ubuntu policy are unchanged.

The Applications entry and running managed windows share the desktop ID
`autobyteus-managed.desktop`. The installed app publishes its shortcut at
`~/.local/share/applications/autobyteus/managed.desktop` and keeps the branded
icon in `~/.local/share/autobyteus-managed/desktop-icon.png` so it remains
available after quit. The first corrected installed launch replaces the exact
older flat shortcut without changing its desktop ID or editing favorites.
GNOME may briefly show the old artwork while it refreshes its index. You do not
need to unpin the favorite, log out or enroll the app again.
Customized resources are left intact; a menu publication problem is reported
without reinstalling the app.
Opening a new launcher-bearing download redirects to the installed copy for
that UID. Old releases lacking this launcher are not retrofitted. The application
ID, profile/data location, selected channel and automatic-update preference stay
the same. No app data is owned or migrated by the privileged installer.

With **Update automatically** on, the app downloads and verifies a newer release
while work continues. As soon as an eligible update is verified, AutoByteus stops the
server, installs the update and reopens through its original launcher. Typing or an
active agent does not postpone installation. Recorded busy runs receive the existing
update restart notice after reopening. An intentional quit stays
closed, even if a restart was already in progress. Without a launcher restart
channel, automatic installation waits for your next quit. **Install and Restart** explicitly requests activation now and
asks the original desktop launcher to reopen the fixed outer AppImage after the
old app and server stop. Electron does not launch a successor from a transient
mount. If the app cannot confirm restart support, it leaves the staged update
and running server alone. With automation off,
a verified manual download can be installed using that action. Turning the
switch off cancels pending automatic activation before dispatch.

The nonroot writer accepts only signed, architecture-matching, strictly newer
releases on the selected channel. The same inode holds its signed record and
signature; atomic replacement cannot separate code from its identity. Routine
compatible updates require no administrator prompt. Invalid bytes, wrong keys,
replays, stale stages and unsupported writer contracts are refused. A definite
manual refusal is shown as **Update failed**, independently of automatic retry
blocking. If automatic installation failed for a version, downloading that
version manually does not re-enable automatic installation. Use the manual
action shown in Settings or the update notification. A lost activation reply is reconciled against the actual installed
file, not guessed from the download event.

## Removal and repair

Quit the application before removal. Run the installed image with
`--autobyteus-uninstall` (for example
`/opt/autobyteus-desktop/$(id -u)/app/AutoByteus.AppImage --autobyteus-uninstall`).
This requests a fresh one-shot Ubuntu authorization. It stops the owned socket
and writer, unloads the owned profile and removes verified installer-owned
files/account and its unchanged user menu entries and icon. It **does not delete user
profile or server data**. Modified/unrecognized resources are left intact with
an error, not force-deleted.

If setup reports insufficient space, free space on the volume containing
`/opt/autobyteus-desktop` (not just in Downloads), or ask an administrator
for help, then retry. If the protected installation is incomplete, ask an
administrator to inspect the per-user installation named in the dialog before
trying again.

A managed sandbox/identity failure requests administrator repair; it does not
loop through enrollment. Do not chmod/chown the protected store, delete its
attributes, copy another image over it, disable Ubuntu restrictions or add
`--no-sandbox`. Preserve the diagnostic and involve an administrator. An intact
installation can be removed through the above command and installed again from
an authenticated official release. Damaged ownership/trust support requires
administrator inspection rather than an automated privilege fallback.

## Build and release administration

Linux builds require the pinned Go toolchain, a native C compiler (gcc), Node
with Node-API headers and a provisioned Ed25519 **desktop**
public key (`AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE`). The build creates the writer,
embeds it into the provisioner, then pins that helper's digest in AppRun. Final
AppImage bytes are signed only after packaging. See `linux-install/contract/desktop-release.md`.
Build-only CI generates disposable trust; these artifacts are not production
updates and must not be published. Production signing is isolated behind the
`desktop-release-signing` environment and uses a dedicated desktop key, never
the server key. Release administration must configure and protect that
environment and its public/secret material; absent provisioning fails the build.
Keep the private key only as that environment's secret, not a repository- or
organization-wide secret. Build jobs receive only the public repository variable.
Trust-root/writer upgrades require authenticated administrator maintenance, not
an ordinary app payload. Final release operations follow root `RELEASE.md`.

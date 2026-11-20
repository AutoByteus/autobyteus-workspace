// Import only inside an isolated GNOME Shell test session (see README).
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const desktopId = 'autobyteus-managed.desktop';

export function checkManagedWindows(pid, backend, count) {
    if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(count) || count < 1 ||
        !['Wayland', 'X11'].includes(backend))
        throw new Error('Expected a live Electron main PID, Wayland or X11, and a positive window count');

    const tracker = Shell.WindowTracker.get_default();
    const app = Shell.AppSystem.get_default().lookup_app(desktopId);
    const base = GLib.get_home_dir() + '/.local/share';
    const windows = global.get_window_actors().map(actor => actor.meta_window)
        .filter(w => w && w.get_pid() === pid && w.get_window_type() === Meta.WindowType.NORMAL)
        .map(w => ({
            backend: w.get_client_type() === Meta.WindowClientType.WAYLAND ? 'Wayland' :
                w.get_client_type() === Meta.WindowClientType.X11 ? 'X11' : 'unknown',
            id: tracker.get_window_app(w)?.get_id() ?? null,
            wmClass: w.get_wm_class(),
        }));
    const observed = {
        pid, windows,
        desktopFile: app?.get_app_info()?.get_filename() ?? null,
        icon: app?.get_app_info()?.get_icon()?.to_string() ?? null,
        dockState: Main.extensionManager.lookup('ubuntu-dock@ubuntu.com')?.state,
    };
    if (observed.dockState !== 1 ||
        observed.desktopFile !== base + '/applications/autobyteus/managed.desktop' ||
        observed.icon !== base + '/autobyteus-managed/desktop-icon.png' ||
        windows.length !== count || windows.some(w => w.backend !== backend || w.id !== desktopId))
        throw new Error('Managed GNOME identity not observed: ' + JSON.stringify(observed));
    return observed;
}

# Running managed windows on Ubuntu Dock

`shell-probe.js` is a read-only check **inside GNOME Shell**, tested with Shell 46 (Ubuntu 24.04).
Use a disposable graphical guest with Ubuntu Dock active, signed test packages and synthetic data.
Do not enable unsafe Shell evaluation, install extensions on the host, or pass sandbox/trust overrides.

1. Before the journey, copy the module alongside the disposable session observer extension’s entry point.
   Import `{checkManagedWindows} from './shell-probe.js'` there. This module does not install an
   extension, control the desktop, or need a network connection.
2. Launch the real installed app. After the desktop index and window list settle naturally, call
   `checkManagedWindows(mainPid, 'Wayland', 1)` from the observer, using the running packaged
   Electron main PID, **not** the native supervisor, backend or fixture PID. Open a second real
   node-bound window and call with count 2. For an X11/XWayland client use `'X11'` even when
   the compositor is Wayland. Save the returned observation (or exception) alongside the screenshot.
3. Capture the actual Applications result and dock for each case. The probe checks the unmodified
   user-owned registration and association of every normal window of the named process. It does not
   assert that PNG bytes were painted, that a favorite was preserved, or that a second tile is absent.
   Inspect those separately. Remove the guest or fixture observer when finished.

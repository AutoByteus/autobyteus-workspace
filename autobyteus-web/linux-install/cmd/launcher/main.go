// AppRun-level launcher; the real Electron ELF remains unchanged for process.execPath/Node.
package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"syscall"

	"autobyteus.local/desktop/linux-install/internal/acquire"
	"autobyteus.local/desktop/linux-install/internal/buildinfo"
	"autobyteus.local/desktop/linux-install/internal/imagefile"
	"autobyteus.local/desktop/linux-install/internal/install"
	"autobyteus.local/desktop/linux-install/internal/launch"
	"autobyteus.local/desktop/linux-install/internal/protocol"
	"autobyteus.local/desktop/linux-install/internal/sealed"
)

func run() (int, error) {
	self, err := os.Executable()
	if err != nil {
		return 1, err
	}
	directory := filepath.Dir(self)
	real := filepath.Join(directory, "autobyteus")
	args := os.Args[1:]
	if len(args) > 0 && args[0] == "--autobyteus-appimage-desktop-entry" {
		args = args[1:]
	}
	if os.Getenv("ELECTRON_RUN_AS_NODE") == "1" {
		return 1, syscall.Exec(real, append([]string{real}, args...), os.Environ())
	}
	if os.Geteuid() == 0 {
		return 1, fmt.Errorf("do not run the desktop application as root")
	}
	identity, key, err := buildinfo.Identity()
	if err != nil {
		return 1, err
	}
	p, err := install.ForUID(strconv.Itoa(os.Getuid()))
	if err != nil {
		return 1, err
	}
	canonical, managed, err := launch.Managed(p)
	if err != nil {
		return 1, err
	}
	if len(args) == 1 && args[0] == "--autobyteus-uninstall" {
		if !managed {
			return 1, fmt.Errorf("no protected installation found")
		}
		if err = launch.Authorize(filepath.Join(p.Support, "provision"), protocol.Request{Operation: "uninstall"}, bytes.NewReader(nil)); err != nil {
			return 1, err
		}
		if err := launch.RemoveMenu(p, directory); err != nil {
			return 1, err
		}
		return 0, nil
	}
	outer := os.Getenv("APPIMAGE")
	if managed {
		if outer != canonical {
			return 1, syscall.Exec(canonical, append([]string{canonical}, args...), os.Environ())
		}
		if err := launch.EnsureMenu(p, directory); err != nil {
			fmt.Fprintln(os.Stderr, "AutoByteus menu not updated:", err)
		}
	}
	code, restricted, err := launch.Supervise(real, args, managed)
	if err != nil || !restricted {
		return code, err
	}
	if managed {
		return code, fmt.Errorf("managed sandbox permission failed; administrator repair required, no reenrollment attempted")
	}
	if os.Getenv("AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE") == "e2e" {
		return code, fmt.Errorf("automation does not authorize enrollment")
	}
	helper, err := os.Open(filepath.Join(directory, "autobyteus-provision"))
	if err != nil {
		return code, err
	}
	defer helper.Close()
	snapshot, err := sealed.Snapshot(helper, buildinfo.ProvisionDigest)
	if err != nil {
		return code, err
	}
	defer snapshot.Close()
	if err = launch.Consent(filepath.Join(p.App, "AutoByteus.AppImage"), sealed.Path(snapshot)); err != nil {
		return code, err
	}
	image, err := imagefile.Open(outer)
	if err != nil {
		return code, acquire.ErrUnverifiedDownload
	}
	defer image.Close()
	record, signature, err := acquire.Fetch(context.Background(), identity, key, image)
	if err != nil {
		return code, err
	}
	if err = launch.Authorize(sealed.Path(snapshot), protocol.Request{Operation: "provision", Record: record, Signature: signature}, image); err != nil {
		return code, err
	}
	canonical, managed, err = launch.Managed(p)
	if err != nil {
		return code, err
	}
	if !managed {
		return code, fmt.Errorf("installation not committed")
	}
	return 1, syscall.Exec(canonical, append([]string{canonical}, args...), os.Environ())
}
func main() {
	code, err := run()
	if err != nil {
		launch.Explain(err.Error())
	}
	os.Exit(code)
}

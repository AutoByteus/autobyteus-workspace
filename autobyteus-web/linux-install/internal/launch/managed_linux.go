package launch

import (
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"strconv"
	"syscall"

	"autobyteus.local/desktop/linux-install/internal/install"
)

// An environment variable alone is never proof of a protected installation.
func Managed(p install.Paths) (string, bool, error) {
	if _, err := os.Lstat(p.Root); os.IsNotExist(err) {
		return "", false, nil
	}
	live, err := verifiedImage(p)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Protected installation check:", err)
		return "", false, fmt.Errorf("The protected AutoByteus installation is incomplete or could not be verified. Ask an Ubuntu administrator to inspect and repair %s before trying again.", p.Root)
	}
	return live, true, nil
}

func verifiedImage(p install.Paths) (string, error) {
	for _, d := range []string{"/opt", install.Base, p.Root, p.Support} {
		if err := install.ProtectedDirectory(d); err != nil {
			return "", err
		}
	}
	account, err := user.Lookup(p.Account)
	if err != nil {
		return "", err
	}
	uid, err := strconv.ParseUint(account.Uid, 10, 32)
	if err != nil || uid == 0 || uid == uint64(os.Getuid()) {
		return "", fmt.Errorf("invalid managed writer identity")
	}
	live := filepath.Join(p.App, "AutoByteus.AppImage")
	for i, path := range []string{p.App, live} {
		st, e := os.Lstat(path)
		if e != nil {
			return "", e
		}
		native, ok := st.Sys().(*syscall.Stat_t)
		if !ok || uint64(native.Uid) != uid || st.Mode().Perm()&0022 != 0 || (i == 0 && !st.IsDir()) || (i == 1 && !st.Mode().IsRegular()) {
			return "", fmt.Errorf("unprotected managed image")
		}
	}
	return live, nil
}

func Menu(p install.Paths, remove bool) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	directory := filepath.Join(home, ".local", "share", "applications")
	name := filepath.Join(directory, "autobyteus-managed.desktop")
	content := fmt.Sprintf("[Desktop Entry]\nType=Application\nName=AutoByteus\nExec=%s/AutoByteus.AppImage %%U\nIcon=applications-development\nTerminal=false\nCategories=Development;\nX-AutoByteus-Managed-UID=%s\n", p.App, p.UID)
	if remove {
		actual, e := os.ReadFile(name)
		if os.IsNotExist(e) {
			return nil
		}
		if e != nil {
			return e
		}
		if string(actual) != content {
			return fmt.Errorf("desktop entry modified; left intact")
		}
		return os.Remove(name)
	}
	// Completing a missing owned entry is idempotent; never overwrite a user's modified shortcut.
	if actual, e := os.ReadFile(name); e == nil {
		if string(actual) != content {
			return fmt.Errorf("desktop entry modified; left intact: %s", name)
		}
		return nil
	} else if !os.IsNotExist(e) {
		return e
	}
	if err = os.MkdirAll(directory, 0755); err != nil {
		return err
	}
	f, err := os.CreateTemp(directory, ".autobyteus-menu-")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	defer f.Close()
	if _, err = f.WriteString(content); err != nil {
		return err
	}
	if err = f.Chmod(0644); err != nil {
		return err
	}
	if err = f.Sync(); err != nil {
		return err
	}
	return os.Rename(f.Name(), name)
}

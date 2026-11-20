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

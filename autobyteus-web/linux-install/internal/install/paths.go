package install

import (
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"strconv"
	"syscall"
)

const Base = "/opt/autobyteus-desktop"

type Paths struct{ UID, Account, Root, App, Support, Unit, SocketUnit, Socket, Profile string }

func ForUID(value string) (Paths, error) {
	n, err := strconv.ParseUint(value, 10, 32)
	if err != nil || n == 0 || strconv.FormatUint(n, 10) != value {
		return Paths{}, fmt.Errorf("invalid desktop UID")
	}
	if _, err = user.LookupId(value); err != nil {
		return Paths{}, err
	}
	root := filepath.Join(Base, value)
	unit := "autobyteus-desktop-" + value
	return Paths{value, "abdesk-" + value, root, filepath.Join(root, "app"), filepath.Join(root, "support"), unit + ".service", unit + ".socket", "/run/" + unit + ".sock", "/etc/apparmor.d/" + unit}, nil
}

func ProtectedDirectory(path string) error {
	st, err := os.Lstat(path)
	if err != nil {
		return err
	}
	native, ok := st.Sys().(*syscall.Stat_t)
	if !ok || !st.IsDir() || native.Uid != 0 || st.Mode().Perm()&0022 != 0 {
		return fmt.Errorf("unprotected installation directory: %s", path)
	}
	return nil
}

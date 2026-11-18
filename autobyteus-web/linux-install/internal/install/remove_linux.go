package install

import (
	"bytes"
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

func ownedFile(path string, expected []byte) error {
	st, err := os.Lstat(path)
	if err != nil {
		return err
	}
	owner, ok := st.Sys().(*syscall.Stat_t)
	if !ok || !st.Mode().IsRegular() || owner.Uid != 0 || st.Mode().Perm()&0022 != 0 {
		return fmt.Errorf("not an owned installation asset: %s", path)
	}
	if expected != nil {
		actual, e := os.ReadFile(path)
		if e != nil {
			return e
		}
		if !bytes.Equal(actual, expected) {
			return fmt.Errorf("installation asset differs: %s", path)
		}
	}
	return nil
}

// Remove is available only from the installed root-owned provisioner. Never follows
// links, recurses into arbitrary trees, or removes desktop HOME/profile data.
func Remove(p Paths, writer []byte) error {
	if os.Geteuid() != 0 {
		return fmt.Errorf("removal requires Ubuntu authorization")
	}
	for _, d := range []string{"/opt", Base, p.Root, p.Support} {
		if err := ProtectedDirectory(d); err != nil {
			return err
		}
	}
	self, err := os.Stat("/proc/self/exe")
	if err != nil {
		return err
	}
	installed, err := os.Lstat(filepath.Join(p.Support, "provision"))
	if err != nil {
		return err
	}
	if !os.SameFile(self, installed) {
		return fmt.Errorf("use the installed provisioner for removal")
	}
	files := []struct {
		path  string
		bytes []byte
	}{
		{filepath.Join(p.Support, "provision"), nil}, {filepath.Join(p.Support, "writer"), writer},
		{"/etc/systemd/system/" + p.Unit, p.Service()}, {"/etc/systemd/system/" + p.SocketUnit, p.SocketDefinition()}, {p.Profile, p.AppArmor()},
	}
	for _, f := range files {
		if err = ownedFile(f.path, f.bytes); err != nil {
			return err
		}
	}
	account, err := user.Lookup(p.Account)
	if err != nil {
		return err
	}
	uid, err := strconv.ParseUint(account.Uid, 10, 32)
	if err != nil || uid == 0 {
		return fmt.Errorf("invalid installed writer identity")
	}
	dir, err := os.Lstat(p.App)
	if err != nil {
		return err
	}
	if !dir.IsDir() || uint64(dir.Sys().(*syscall.Stat_t).Uid) != uid {
		return fmt.Errorf("unexpected app store owner")
	}
	entries, err := os.ReadDir(p.App)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.Name() != "AutoByteus.AppImage" && e.Name() != ".writer-lock" && !strings.HasPrefix(e.Name(), ".pending-") {
			return fmt.Errorf("unexpected store file; explicit repair required")
		}
		st, e2 := os.Lstat(filepath.Join(p.App, e.Name()))
		if e2 != nil {
			return e2
		}
		if !st.Mode().IsRegular() || uint64(st.Sys().(*syscall.Stat_t).Uid) != uid {
			return fmt.Errorf("unexpected store entry owner/type")
		}
	}
	// If deactivation fails preserve resources for explicit repair, never remove active policy backing files.
	if err = command("/usr/bin/systemctl", "disable", "--now", p.SocketUnit); err != nil {
		return err
	}
	if err = command("/usr/bin/systemctl", "stop", p.Unit); err != nil {
		return err
	}
	if err = command("/usr/sbin/apparmor_parser", "-R", p.Profile); err != nil {
		return err
	}
	for _, e := range entries {
		if err = os.Remove(filepath.Join(p.App, e.Name())); err != nil {
			return err
		}
	}
	for _, f := range files {
		if err = os.Remove(f.path); err != nil {
			return err
		}
	}
	for _, d := range []string{p.App, p.Support, p.Root} {
		if err = os.Remove(d); err != nil {
			return err
		}
	}
	if err = command("/usr/bin/systemctl", "daemon-reload"); err != nil {
		return err
	}
	return command("/usr/sbin/userdel", p.Account)
}

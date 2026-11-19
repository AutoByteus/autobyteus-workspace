// Privileged enrollment consumes bytes only; all host resources are compiled assets.
package install

import (
	"crypto/ed25519"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"strconv"
	"syscall"

	"autobyteus.local/desktop/linux-install/internal/imagefile"
	"autobyteus.local/desktop/linux-install/internal/protocol"
	"autobyteus.local/desktop/linux-install/internal/release"
)

var ErrInsufficientInstallSpace = errors.New("insufficient installation space")

func command(path string, args ...string) error {
	cmd := exec.Command(path, args...)
	cmd.Env = []string{"PATH=/usr/sbin:/usr/bin:/sbin:/bin", "LANG=C.UTF-8"}
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

type transaction struct{ undo []func() error }

func (t *transaction) rollback() {
	for i := len(t.undo) - 1; i >= 0; i-- {
		if err := t.undo[i](); err != nil {
			fmt.Fprintln(os.Stderr, "Enrollment cleanup requires repair:", err)
			return
		}
	}
}
func (t *transaction) directory(path string, mode os.FileMode) error {
	if err := os.Mkdir(path, mode); err != nil {
		return err
	}
	t.undo = append(t.undo, func() error { return os.Remove(path) })
	return nil
}
func (t *transaction) file(path string, data []byte, mode os.FileMode) error {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, mode)
	if err != nil {
		return err
	}
	t.undo = append(t.undo, func() error { return os.Remove(path) })
	defer f.Close()
	if _, err = f.Write(data); err != nil {
		return err
	}
	return f.Sync()
}

// Provision must be called only by the one-shot root executable after checking PKEXEC_UID.
func Provision(p Paths, request protocol.Request, payload io.Reader, key ed25519.PublicKey, arch, version string, writer []byte) (err error) {
	if os.Geteuid() != 0 || len(writer) == 0 {
		return fmt.Errorf("privileged provisioning assets unavailable")
	}
	if request.Operation != "provision" {
		return fmt.Errorf("invalid provisioning operation")
	}
	r, err := release.Verify(request.Record, request.Signature, key, arch)
	if err != nil {
		return err
	}
	if r.Version != version {
		return fmt.Errorf("download differs from provisioner release")
	}
	if err = ProtectedDirectory("/opt"); err != nil {
		return err
	}
	t := &transaction{}
	defer func() {
		if err != nil {
			t.rollback()
		}
	}()
	if _, e := os.Lstat(Base); os.IsNotExist(e) {
		if err = t.directory(Base, 0755); err != nil {
			return err
		}
	}
	if err = ProtectedDirectory(Base); err != nil {
		return err
	}
	// Never replace an existing installation or enroll into pre-existing service identities.
	if _, e := user.Lookup(p.Account); e == nil {
		return fmt.Errorf("service account already exists; explicit repair required")
	} else if _, ok := e.(user.UnknownUserError); !ok {
		return e
	}
	if err = t.directory(p.Root, 0755); err != nil {
		return err
	}
	if err = t.directory(p.Support, 0755); err != nil {
		return err
	}
	if err = t.directory(p.App, 0755); err != nil {
		return err
	}
	var space syscall.Statfs_t
	if err = syscall.Statfs(p.App, &space); err != nil {
		return err
	}
	if space.Bavail*uint64(space.Bsize) < uint64(r.Size)+64*1024*1024 {
		return ErrInsufficientInstallSpace
	}
	staged := filepath.Join(p.App, ".initial")
	f, e := os.OpenFile(staged, os.O_CREATE|os.O_EXCL|os.O_RDWR, 0600)
	if e != nil {
		return e
	}
	defer f.Close()
	t.undo = append(t.undo, func() error {
		e := os.Remove(staged)
		if os.IsNotExist(e) {
			return nil
		}
		return e
	})
	if err = r.Copy(f, payload); err != nil {
		return err
	}
	if err = imagefile.SetIdentity(f, request.Record, request.Signature); err != nil {
		return err
	}
	if _, _, _, err = imagefile.Identity(f, key, arch); err != nil {
		return err
	}
	if err = f.Chmod(0555); err != nil {
		return err
	}
	if err = f.Sync(); err != nil {
		return err
	}
	if err = imagefile.SyncDirectory(p.App); err != nil {
		return err
	}
	// Verify the actual storage filesystem before activating policy/socket/menu.
	if err = command("/usr/sbin/useradd", "--system", "--user-group", "--no-create-home", "--home-dir", "/nonexistent", "--shell", "/usr/sbin/nologin", p.Account); err != nil {
		return err
	}
	t.undo = append(t.undo, func() error { return command("/usr/sbin/userdel", p.Account) })
	account, e := user.Lookup(p.Account)
	if e != nil {
		return e
	}
	uid, e := strconv.Atoi(account.Uid)
	if e != nil {
		return e
	}
	gid, e := strconv.Atoi(account.Gid)
	if e != nil {
		return e
	}
	if err = f.Chown(uid, gid); err != nil {
		return err
	}
	if err = f.Sync(); err != nil {
		return err
	}
	live := filepath.Join(p.App, "AutoByteus.AppImage")
	if err = os.Rename(staged, live); err != nil {
		return err
	}
	t.undo = append(t.undo, func() error { return os.Remove(live) })
	if err = imagefile.SyncDirectory(p.App); err != nil {
		return err
	}
	if err = os.Chown(p.App, uid, gid); err != nil {
		return err
	}
	if err = t.file(filepath.Join(p.Support, "writer"), writer, 0555); err != nil {
		return err
	}
	// Self is the exact sealed authorized executable, not an input path.
	self, e := os.ReadFile("/proc/self/exe")
	if e != nil {
		return e
	}
	if err = t.file(filepath.Join(p.Support, "provision"), self, 0555); err != nil {
		return err
	}
	if err = t.file("/etc/systemd/system/"+p.Unit, p.Service(), 0644); err != nil {
		return err
	}
	if err = t.file("/etc/systemd/system/"+p.SocketUnit, p.SocketDefinition(), 0644); err != nil {
		return err
	}
	if err = t.file(p.Profile, p.AppArmor(), 0644); err != nil {
		return err
	}
	t.undo = append(t.undo, func() error { return command("/usr/sbin/apparmor_parser", "-R", p.Profile) })
	if err = command("/usr/sbin/apparmor_parser", "-r", p.Profile); err != nil {
		return err
	}
	if err = command("/usr/bin/systemctl", "daemon-reload"); err != nil {
		return err
	}
	// Register rollback before enable: a partially successful command must also be undone.
	t.undo = append(t.undo, func() error {
		if e := command("/usr/bin/systemctl", "disable", "--now", p.SocketUnit); e != nil {
			return e
		}
		return command("/usr/bin/systemctl", "stop", p.Unit)
	})
	if err = command("/usr/bin/systemctl", "enable", "--now", p.SocketUnit); err != nil {
		return err
	}
	return nil
}

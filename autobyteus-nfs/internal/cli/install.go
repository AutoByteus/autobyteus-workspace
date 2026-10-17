package cli

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"syscall"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

// Elevate installs before administrative apply; startup jobs never reference a user-writable binary.
func Elevate(args []string) error {
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	executable, err = filepath.EvalSymlinks(executable)
	if err != nil {
		return err
	}
	cmd := exec.Command("/usr/bin/sudo", append([]string{"--", executable, "internal-install"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
func InstallRoot(args []string) error {
	if os.Geteuid() != 0 {
		return errors.New("root installation requires OS administrator approval")
	}
	if err := CheckHost(); err != nil {
		return err
	}
	target := config.BinaryPath()
	parent := filepath.Dir(target)
	if err := platform.RootDirectory(config.PrivateDirectory(), 0700); err != nil {
		return err
	}
	store := config.Store{Directory: config.PrivateDirectory(), Owner: 0}
	if err := store.Check(); err != nil {
		return err
	}
	if err := platform.RootDirectory(parent, 0755); err != nil {
		return err
	}
	source, err := os.Executable()
	if err != nil {
		return err
	}
	source, err = filepath.EvalSymlinks(source)
	if err != nil {
		return err
	}
	if source != target {
		input, err := os.Open(source)
		if err != nil {
			return err
		}
		defer input.Close()
		info, err := input.Stat()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() || info.Size() > 100<<20 {
			return errors.New("invalid installer binary")
		}
		data, err := io.ReadAll(io.LimitReader(input, 100<<20))
		if err != nil {
			return err
		}
		current, e := os.ReadFile(target)
		if e != nil && !os.IsNotExist(e) {
			return e
		}
		if !bytes.Equal(current, data) {
			if err = config.AtomicFile(target, data, 0755); err != nil {
				return err
			}
		}
	}
	if err = platform.TrustedPath(target, false); err != nil {
		return err
	}
	env := []string{"PATH=/usr/sbin:/usr/bin:/sbin:/bin", "HOME=/var/empty", "LANG=C", "LC_ALL=C"}
	for _, key := range []string{"SUDO_UID", "SUDO_GID", "SUDO_USER"} {
		if value := os.Getenv(key); value != "" {
			env = append(env, key+"="+value)
		}
	}
	return syscall.Exec(target, append([]string{target}, args...), env)
}
func CheckHost() error {
	if runtime.GOOS != "darwin" && runtime.GOOS != "linux" {
		return errors.New("supported computers are macOS and Ubuntu Linux")
	}
	if _, err := os.Stat("/.dockerenv"); err == nil {
		return errors.New("run on the computer, not inside an agent container; Mac Docker storage hosting is not supported")
	}
	if runtime.GOOS == "linux" {
		data, err := os.ReadFile("/etc/os-release")
		if err != nil {
			return err
		}
		fields := parseOSRelease(string(data))
		if fields["ID"] != "ubuntu" || fields["VERSION_ID"] != "24.04" {
			return errors.New("this release's native Linux reference is Ubuntu 24.04")
		}
	} else {
		b, err := (platform.Commands{}).Run("/usr/bin/sw_vers", "-productVersion")
		if err != nil {
			return err
		}
		var major int
		if _, err = fmt.Sscanf(string(b), "%d.", &major); err != nil || major < 26 {
			return errors.New("this release's native Mac reference requires macOS 26 or newer qualified release")
		}
	}
	return nil
}

package platform

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"syscall"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

// PreflightTarget inspects mount table before any operation on the target itself.
func PreflightTarget(r Runner, c config.Connection) error {
	m, err := Observe(r, c)
	if err != nil {
		return err
	}
	if m != nil {
		if Matches(m, c) {
			return nil
		}
		return errors.New("occupied target has a different mount; choose another root")
	}
	mounts, err := Mounts(r)
	if err != nil {
		return err
	}
	for _, other := range mounts {
		if other.Target != "/" && config.Within(c.MountRoot, other.Target) {
			return errors.New("mount target contains another mount")
		}
	}
	info, err := os.Lstat(c.MountRoot)
	if os.IsNotExist(err) {
		parent := filepath.Dir(c.MountRoot)
		for {
			if _, e := os.Lstat(parent); e == nil {
				break
			}
			next := filepath.Dir(parent)
			if next == parent {
				return err
			}
			parent = next
		}
		return TrustedPath(parent, true)
	}
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return errors.New("mount target is not an ordinary directory")
	}
	if info.Sys().(*syscall.Stat_t).Uid != 0 || info.Mode().Perm()&0222 != 0 {
		return errors.New("existing unmounted target must be root-owned and nonwritable; choose an empty alternative")
	}
	entries, err := os.ReadDir(c.MountRoot)
	if err != nil {
		return err
	}
	if len(entries) != 0 {
		return errors.New("mount target is nonempty; its contents will not be hidden")
	}
	return TrustedPath(c.MountRoot, true)
}
func MountOptions(protocol string, linux bool) string {
	options := "hard,tcp,vers=" + protocol + ",actimeo=1"
	if linux {
		options += ",timeo=50,retrans=2"
		if protocol == "3" {
			options += ",nolock,mountport=20048"
		}
	} else {
		if protocol == "3" {
			options += ",locallocks,mountport=20048,resvport"
		}
	}
	return options
}
func EnsureMount(r Runner, c config.Connection) error {
	if err := PreflightTarget(r, c); err != nil {
		return err
	}
	m, err := Observe(r, c)
	if err != nil || m != nil {
		return err
	}
	if err := RootDirectory(filepath.Dir(c.MountRoot), 0755); err != nil {
		return err
	}
	if err := os.Mkdir(c.MountRoot, 0555); err != nil && !os.IsExist(err) {
		return err
	}
	source := c.Endpoint + ":" + c.Export
	if runtime.GOOS == "darwin" {
		_, err = r.Run("/sbin/mount_nfs", "-o", MountOptions(c.Protocol, false), source, c.MountRoot)
	} else {
		_, err = r.Run("/usr/bin/mount", "-t", "nfs", "-o", MountOptions(c.Protocol, true), source, c.MountRoot)
	}
	if err != nil {
		return err
	}
	m, err = Observe(r, c)
	if err != nil {
		return err
	}
	if !Matches(m, c) {
		return errors.New("mount completed without matching source/protocol")
	}
	return nil
}
func Unmount(r Runner, c config.Connection) error {
	m, err := Observe(r, c)
	if err != nil || m == nil {
		return err
	}
	if !Matches(m, c) {
		return errors.New("refusing to unmount an unrelated source")
	}
	binary := "/usr/bin/umount"
	if runtime.GOOS == "darwin" {
		binary = "/sbin/umount"
	}
	_, err = r.Run(binary, c.MountRoot)
	return err // No force/lazy unmount, no target recursion.
}

// ResolveTarget canonicalizes existing ancestors before source/target overlap checks.
// The final mount directory itself must not be a symlink.
func ResolveTarget(target string) (string, error) {
	if !config.AbsolutePath(target) {
		return "", errors.New("mount root must be a clean absolute path")
	}
	candidate := target
	tail := []string{}
	for {
		if info, err := os.Lstat(candidate); err == nil {
			if candidate == target && info.Mode()&os.ModeSymlink != 0 {
				return "", errors.New("mount target cannot be a symlink")
			}
			canonical, err := filepath.EvalSymlinks(candidate)
			if err != nil {
				return "", err
			}
			for i := len(tail) - 1; i >= 0; i-- {
				canonical = filepath.Join(canonical, tail[i])
			}
			return canonical, nil
		} else if !os.IsNotExist(err) {
			return "", err
		}
		tail = append(tail, filepath.Base(candidate))
		parent := filepath.Dir(candidate)
		if parent == candidate {
			return "", errors.New("no existing mount parent")
		}
		candidate = parent
	}
}

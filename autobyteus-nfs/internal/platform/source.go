package platform

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

// Source selection permits a nonempty project directory, not entire homes or private runtime trees.
func ValidateSourcePath(source, mountRoot, home string) error {
	if !config.AbsolutePath(source) || !config.AbsolutePath(mountRoot) || source == home || config.Within(source, home) || config.Overlap(source, mountRoot) {
		return errors.New("source cannot be root/home/ancestor of home or overlap the mount target")
	}
	for _, root := range []string{"/etc", "/var/lib/autobyteus-nfs", "/var/lib/docker", "/var/run", "/var/tmp", "/private", "/System", "/Library", "/bin", "/sbin", "/usr", "/proc", "/sys", "/dev", "/run", "/tmp"} {
		if config.Within(root, source) {
			return fmt.Errorf("system/private/ephemeral source is not supported: %s", source)
		}
	}
	for _, part := range strings.Split(source, string(filepath.Separator)) {
		switch part {
		case ".autobyteus", ".codex", ".claude", ".grok", ".gemini", ".ssh", ".docker", ".config", "Library":
			return errors.New("private application or authentication tree cannot be exported")
		}
	}
	if strings.ContainsAny(source, `"\\`) {
		return errors.New("source contains unsupported export-path quoting")
	}
	return nil
}
func SourceIdentity(source string) (config.Identity, error) {
	info, err := os.Lstat(source)
	if err != nil {
		return config.Identity{}, err
	}
	if !info.IsDir() {
		return config.Identity{}, errors.New("source must be a real directory, not a symlink")
	}
	canonical, err := filepath.EvalSymlinks(source)
	if err != nil {
		return config.Identity{}, err
	}
	if canonical != source {
		return config.Identity{}, errors.New("choose canonical source path without symlink ancestors")
	}
	st := info.Sys().(*syscall.Stat_t)
	return config.Identity{Device: uint64(st.Dev), Inode: st.Ino}, nil
}
func CheckSource(h config.HostedFilesystem) error {
	id, err := SourceIdentity(h.Source)
	if err != nil {
		return err
	}
	if id != h.Identity {
		return errors.New("selected source device/inode changed; no replacement will be exported")
	}
	return QualifyFilesystem(h.Source)
}

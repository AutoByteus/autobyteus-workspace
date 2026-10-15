package platform

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

func QualifyFilesystem(path string) error {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return err
	}
	if uint64(st.Type) != 0xef53 {
		return errors.New("Linux storage requires a persistent local ext4 source")
	}
	// ext2/ext3 share the magic number; the actual containing mount must be ext4.
	b, err := os.ReadFile("/proc/self/mountinfo")
	if err != nil {
		return err
	}
	best := Mount{}
	for _, m := range ParseLinuxMounts(string(b)) {
		if (path == m.Target || strings.HasPrefix(path, strings.TrimSuffix(m.Target, "/")+"/")) && len(m.Target) > len(best.Target) {
			best = m
		}
	}
	if best.Filesystem != "ext4" {
		return errors.New("Linux storage source is not mounted as ext4")
	}
	if strings.HasPrefix(filepath.Clean(path), "/tmp/") {
		return errors.New("ephemeral source is not supported")
	}
	return nil
}

package platform

import (
	"errors"
	"fmt"
	"path/filepath"
	"syscall"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

// SourceIdentity persists only APFS volume UUID and inode. The raw device is
// meaningful only while correlating this open directory with diskutil's reply.
func SourceIdentity(r Runner, source string) (config.Identity, error) {
	before, err := sourcePath(source)
	if err != nil {
		return config.Identity{}, err
	}
	fd, err := syscall.Open(source, syscall.O_RDONLY|syscall.O_DIRECTORY|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0)
	if err != nil {
		return config.Identity{}, err
	}
	defer syscall.Close(fd)
	observed, mount, err := sourceDescriptor(fd)
	if err != nil {
		return config.Identity{}, err
	}
	if observed != before {
		return config.Identity{}, errors.New("source changed while opening directory")
	}
	data, err := r.Run("/usr/sbin/diskutil", "info", "-plist", mount.device)
	if err != nil {
		return config.Identity{}, fmt.Errorf("source volume identity query: %w", err)
	}
	uuid, err := diskutilVolumeUUID(data, mount.device, mount.path)
	if err != nil {
		return config.Identity{}, err
	}
	after, err := sourcePath(source)
	if err != nil {
		return config.Identity{}, err
	}
	current, currentMount, err := sourceDescriptor(fd)
	if err != nil {
		return config.Identity{}, err
	}
	if after != observed || current != observed || currentMount != mount {
		return config.Identity{}, errors.New("source changed during volume identity query")
	}
	return config.Identity{VolumeUUID: uuid, Inode: observed.Inode}, nil
}

type sourceMount struct {
	device, path string
	fsid         syscall.Fsid
}

func sourceDescriptor(fd int) (config.Identity, sourceMount, error) {
	var st syscall.Stat_t
	var fs syscall.Statfs_t
	if err := syscall.Fstat(fd, &st); err != nil {
		return config.Identity{}, sourceMount{}, err
	}
	if err := syscall.Fstatfs(fd, &fs); err != nil {
		return config.Identity{}, sourceMount{}, err
	}
	if err := qualifyAPFS(fs); err != nil {
		return config.Identity{}, sourceMount{}, err
	}
	mount := sourceMount{device: filesystemName(fs.Mntfromname[:]), path: filesystemName(fs.Mntonname[:]), fsid: fs.Fsid}
	if filepath.Dir(mount.device) != "/dev" || !filepath.IsAbs(mount.path) || filepath.Clean(mount.path) != mount.path {
		return config.Identity{}, sourceMount{}, errors.New("source has no canonical local volume mapping")
	}
	return config.Identity{Device: uint64(st.Dev), Inode: st.Ino}, mount, nil
}

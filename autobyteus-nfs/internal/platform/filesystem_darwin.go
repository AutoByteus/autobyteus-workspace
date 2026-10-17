package platform

import (
	"errors"
	"syscall"
)

func QualifyFilesystem(path string) error {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return err
	}
	return qualifyAPFS(st)
}

func qualifyAPFS(st syscall.Statfs_t) error {
	// MNT_LOCAL from Darwin sys/mount.h (not exported by Go syscall).
	if filesystemName(st.Fstypename[:]) != "apfs" || st.Flags&0x00001000 == 0 {
		return errors.New("native Mac storage requires a persistent local APFS source")
	}
	return nil
}

func filesystemName[T ~int8 | ~uint8](raw []T) string {
	name := []byte{}
	for _, c := range raw {
		if c == 0 {
			break
		}
		name = append(name, byte(c))
	}
	return string(name)
}

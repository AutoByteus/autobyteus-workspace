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
	name := []byte{}
	for _, c := range st.Fstypename {
		if c == 0 {
			break
		}
		name = append(name, byte(c))
	}
	if string(name) != "apfs" {
		return errors.New("native Mac storage requires a persistent local APFS source")
	}
	return nil
}

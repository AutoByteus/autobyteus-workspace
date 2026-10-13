package platform

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
)

// Lock serializes administrative attempts. Administrative children inherit this
// open description so an interrupted parent cannot authorize a second mount.
func Lock(privateRoot string) (*os.File, error) {
	fd, err := syscall.Open(filepath.Join(privateRoot, "operation.lock"), syscall.O_RDWR|syscall.O_CREAT|syscall.O_NOFOLLOW, 0600)
	if err != nil {
		return nil, err
	}
	f := os.NewFile(uintptr(fd), "operation.lock")
	if err = syscall.Flock(fd, syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		f.Close()
		return nil, fmt.Errorf("another administrative operation is checking/incomplete; restore storage and wait: %w", err)
	}
	return f, nil
}

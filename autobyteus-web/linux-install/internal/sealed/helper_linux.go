// Package sealed retains immutable executable custody across the one-shot polkit prompt.
package sealed

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"syscall"
	"unsafe"
)

const allSeals = 1 | 2 | 4 | 8 // SEAL, SHRINK, GROW, WRITE

// Snapshot validates the bundled helper digest and holds the parent-owned descriptor
// until the authorized process exits. No privileged on-disk extraction is involved.
func Snapshot(helper io.Reader, digest string) (*os.File, error) {
	if len(digest) != 64 {
		return nil, fmt.Errorf("missing provisioner digest")
	}
	name := append([]byte("autobyteus-provision"), 0)
	// MFD_CLOEXEC | MFD_ALLOW_SEALING | MFD_EXEC; refusal is not retried less safely.
	fd, _, errno := syscall.Syscall(memfdCreate, uintptr(unsafe.Pointer(&name[0])), 1|2|0x10, 0)
	if errno != 0 {
		return nil, fmt.Errorf("executable snapshot unavailable: %w", errno)
	}
	file := os.NewFile(fd, "provisioner snapshot")
	good := false
	defer func() {
		if !good {
			file.Close()
		}
	}()
	h := sha256.New()
	n, err := io.Copy(io.MultiWriter(file, h), io.LimitReader(helper, 64*1024*1024+1))
	if err != nil || n > 64*1024*1024 || hex.EncodeToString(h.Sum(nil)) != digest {
		return nil, fmt.Errorf("provisioner digest refused")
	}
	if err = file.Chmod(0500); err != nil {
		return nil, err
	}
	if _, _, errno = syscall.Syscall(syscall.SYS_FCNTL, fd, 1033, allSeals); errno != 0 {
		return nil, errno
	}
	seals, _, errno := syscall.Syscall(syscall.SYS_FCNTL, fd, 1034, 0)
	if errno != 0 || seals&allSeals != allSeals {
		return nil, fmt.Errorf("incomplete provisioner seals")
	}
	// Keep only a read-only handle; the sealed object survives closing the writable one.
	readOnly, err := os.Open(Path(file))
	if err != nil {
		return nil, err
	}
	file.Close()
	good = true
	return readOnly, nil
}

func Path(file *os.File) string { return fmt.Sprintf("/proc/%d/fd/%d", os.Getpid(), file.Fd()) }

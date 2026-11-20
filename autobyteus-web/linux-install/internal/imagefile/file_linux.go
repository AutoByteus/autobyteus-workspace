// Package imagefile keeps payload and authenticated identity on one regular inode.
package imagefile

import (
	"crypto/ed25519"
	"fmt"
	"io"
	"os"
	"syscall"
	"unsafe"

	"autobyteus.local/desktop/linux-install/internal/release"
)

const recordAttr = "user.autobyteus.release"
const signatureAttr = "user.autobyteus.signature"

func Open(path string) (*os.File, error) {
	fd, err := syscall.Open(path, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_CLOEXEC|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, err
	}
	f := os.NewFile(uintptr(fd), path)
	st, err := f.Stat()
	if err != nil || !st.Mode().IsRegular() {
		f.Close()
		return nil, fmt.Errorf("not a regular installed image")
	}
	return f, nil
}

func attr(f *os.File, name string, value []byte, write bool) ([]byte, error) {
	n, err := syscall.BytePtrFromString(name)
	if err != nil {
		return nil, err
	}
	op := uintptr(syscall.SYS_FGETXATTR)
	if write {
		op = syscall.SYS_FSETXATTR
	}
	count, _, errno := syscall.Syscall6(op, f.Fd(), uintptr(unsafe.Pointer(n)), uintptr(unsafe.Pointer(&value[0])), uintptr(len(value)), 0, 0)
	if errno != 0 {
		return nil, errno
	}
	if write {
		return nil, nil
	}
	return value[:count], nil
}

func SetIdentity(f *os.File, record, signature []byte) error {
	if len(record) == 0 || len(record) > release.MaxRecord || len(signature) != ed25519.SignatureSize {
		return fmt.Errorf("invalid identity attributes")
	}
	if _, err := attr(f, recordAttr, record, true); err != nil {
		return err
	}
	if _, err := attr(f, signatureAttr, signature, true); err != nil {
		return err
	}
	return nil
}

func Identity(f *os.File, key ed25519.PublicKey, arch string) (release.Record, []byte, []byte, error) {
	data, err := attr(f, recordAttr, make([]byte, release.MaxRecord), false)
	if err != nil {
		return release.Record{}, nil, nil, err
	}
	sig, err := attr(f, signatureAttr, make([]byte, ed25519.SignatureSize), false)
	if err != nil {
		return release.Record{}, nil, nil, err
	}
	r, err := release.Verify(data, sig, key, arch)
	if err != nil {
		return r, nil, nil, err
	}
	if _, err = f.Seek(0, io.SeekStart); err != nil {
		return r, nil, nil, err
	}
	if err = r.Copy(io.Discard, f); err != nil {
		return r, nil, nil, err
	}
	return r, data, sig, nil
}

func SyncDirectory(path string) error {
	d, err := os.Open(path)
	if err != nil {
		return err
	}
	defer d.Close()
	return d.Sync()
}

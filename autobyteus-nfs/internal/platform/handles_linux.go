package platform

import (
	"errors"
	"os"
	"runtime"
	"syscall"
	"unsafe"
)

// QualifyHandles is run in one owned child before exporting. It tests the same
// kernel file-handle operations needed by VFS, not a statfs-only approximation.
func QualifyHandles(source string) error {
	dir, err := os.Open(source)
	if err != nil {
		return err
	}
	defer dir.Close()
	name, err := syscall.BytePtrFromString(".")
	if err != nil {
		return err
	}
	handle := struct {
		Bytes uint32
		Type  int32
		Data  [128]byte
	}{Bytes: 128}
	var mountID int32
	_, _, errno := syscall.Syscall6(sysNameToHandleAt, dir.Fd(), uintptr(unsafe.Pointer(name)), uintptr(unsafe.Pointer(&handle)), uintptr(unsafe.Pointer(&mountID)), 0, 0)
	runtime.KeepAlive(name)
	if errno != 0 {
		return errno
	}
	fd, _, errno := syscall.Syscall(sysOpenByHandleAt, dir.Fd(), uintptr(unsafe.Pointer(&handle)), syscall.O_RDONLY|syscall.O_DIRECTORY)
	runtime.KeepAlive(handle)
	if errno != 0 {
		return errno
	}
	defer syscall.Close(int(fd))
	var a, b syscall.Stat_t
	if err = syscall.Fstat(int(dir.Fd()), &a); err != nil {
		return err
	}
	if err = syscall.Fstat(int(fd), &b); err != nil {
		return err
	}
	if a.Dev != b.Dev || a.Ino != b.Ino {
		return errors.New("file handle reopened a different source")
	}
	return nil
}

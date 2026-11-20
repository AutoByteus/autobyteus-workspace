package launch

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

// The shared data root is user-configured. Traverse the managed components
// beneath it using no-follow directory descriptors, including for publication
// and deletion. Never follow a substituted applications/icon subdirectory.
type menuFile struct {
	share, directory, name string
	content                []byte
}

func heldDir(d *os.File) string { return fmt.Sprintf("/proc/self/fd/%d", d.Fd()) }

func (f menuFile) openDir(create bool) (*os.File, error) {
	if create {
		if err := os.MkdirAll(f.share, 0755); err != nil {
			return nil, err
		}
	}
	d, err := os.Open(f.share)
	if err != nil {
		return nil, err
	}
	for _, part := range strings.Split(f.directory, "/") {
		if create {
			err := syscall.Mkdirat(int(d.Fd()), part, 0755)
			if err != nil && !errors.Is(err, syscall.EEXIST) {
				d.Close()
				return nil, err
			}
		}
		fd, err := syscall.Openat(int(d.Fd()), part, syscall.O_RDONLY|syscall.O_DIRECTORY|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0)
		d.Close()
		if err != nil {
			return nil, fmt.Errorf("%s: %w", part, err)
		}
		d = os.NewFile(uintptr(fd), part)
		if part != "applications" {
			st, err := d.Stat()
			if err != nil || st.Sys().(*syscall.Stat_t).Uid != uint32(os.Getuid()) {
				d.Close()
				return nil, fmt.Errorf("cannot verify ownership of desktop directory %s", part)
			}
		}
	}
	return d, nil
}

func (f menuFile) matches(d *os.File) (bool, error) {
	path := filepath.Join(heldDir(d), f.name)
	named, err := os.Lstat(path)
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if !named.Mode().IsRegular() {
		return false, fmt.Errorf("unrecognized %s; left intact", f.name)
	}
	// O_NONBLOCK prevents a substituted FIFO from hanging the launcher.
	fd, err := syscall.Openat(int(d.Fd()), f.name, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK|syscall.O_CLOEXEC, 0)
	if errors.Is(err, syscall.ENOENT) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("%s: %w", f.name, err)
	}
	file := os.NewFile(uintptr(fd), f.name)
	defer file.Close()
	st, err := file.Stat()
	if err != nil {
		return false, err
	}
	if os.SameFile(named, st) && st.Mode().IsRegular() && st.Sys().(*syscall.Stat_t).Uid == uint32(os.Getuid()) && st.Size() == int64(len(f.content)) {
		got, err := io.ReadAll(io.LimitReader(file, st.Size()+1))
		if err != nil {
			return false, err
		}
		if bytes.Equal(got, f.content) {
			current, err := os.Lstat(path)
			if os.IsNotExist(err) {
				return false, nil
			}
			if err != nil {
				return false, err
			}
			if os.SameFile(current, st) {
				return true, nil
			}
		}
	}
	return false, fmt.Errorf("modified or unrecognized %s; left intact", f.name)
}

func (f menuFile) installed() (bool, error) {
	d, err := f.openDir(false)
	if errors.Is(err, syscall.ENOENT) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	defer d.Close()
	return f.matches(d)
}

func (f menuFile) publish() error {
	d, err := f.openDir(true)
	if err != nil {
		return err
	}
	defer d.Close()
	if ok, err := f.matches(d); ok || err != nil {
		return err
	}
	tmp, err := os.CreateTemp(heldDir(d), ".autobyteus-menu-")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()
	if _, err := tmp.Write(f.content); err != nil {
		return err
	}
	if err := tmp.Chmod(0644); err != nil {
		return err
	}
	if err := tmp.Sync(); err != nil {
		return err
	}
	// Link publishes a complete inode only if the destination is absent.
	err = os.Link(tmp.Name(), filepath.Join(heldDir(d), f.name))
	if errors.Is(err, syscall.EEXIST) {
		if ok, matchErr := f.matches(d); ok || matchErr != nil {
			return matchErr
		}
	}
	return err
}

func (f menuFile) remove(prune bool) error {
	d, err := f.openDir(false)
	if errors.Is(err, syscall.ENOENT) {
		return nil
	}
	if err != nil {
		return err
	}
	defer d.Close()
	if ok, err := f.matches(d); !ok {
		return err
	}
	if err := syscall.Unlinkat(int(d.Fd()), f.name); err != nil && !errors.Is(err, syscall.ENOENT) {
		return err
	}
	if !prune {
		return nil
	}
	// Only prune a private app-specific directory after removing its owned
	// content. Never prune the shared applications directory or foreign files.
	parent, err := os.Open(heldDir(d) + "/..")
	if err != nil {
		return err
	}
	defer parent.Close()
	path := filepath.Join(heldDir(parent), filepath.Base(f.directory))
	info, err := os.Lstat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	current, err := d.Stat()
	if err != nil {
		return err
	}
	if !os.SameFile(info, current) || current.Sys().(*syscall.Stat_t).Uid != uint32(os.Getuid()) {
		return nil
	}
	err = syscall.Rmdir(path)
	if errors.Is(err, syscall.ENOTEMPTY) || errors.Is(err, syscall.ENOENT) {
		return nil
	}
	return err
}

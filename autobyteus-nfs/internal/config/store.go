package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"syscall"
)

// Store operates only on a pre-owned directory. The privileged caller checks ancestors.
// Mode/owner/no-symlink checks prevent a user file becoming service input or a root write target.
type Store struct {
	Directory string
	Owner     uint32
	Public    bool
}

func (s Store) Check() error {
	info, err := os.Lstat(s.Directory)
	if err != nil {
		return err
	}
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok || !info.IsDir() || stat.Uid != s.Owner || info.Mode().Perm()&0022 != 0 {
		return fmt.Errorf("unsafe configuration directory: %s", s.Directory)
	}
	if !s.Public && info.Mode().Perm()&0077 != 0 {
		return errors.New("private state directory must be mode 0700")
	}
	return nil
}
func (s Store) name(name string) (string, error) {
	if name == "" || filepath.Base(name) != name || name == "." || name == ".." {
		return "", errors.New("invalid record name")
	}
	if err := s.Check(); err != nil {
		return "", err
	}
	return filepath.Join(s.Directory, name), nil
}
func (s Store) Read(name string, target any) error {
	p, err := s.name(name)
	if err != nil {
		return err
	}
	fd, err := syscall.Open(p, syscall.O_RDONLY|syscall.O_NOFOLLOW, 0)
	if err != nil {
		return err
	}
	f := os.NewFile(uintptr(fd), p)
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return err
	}
	stat := info.Sys().(*syscall.Stat_t)
	if !info.Mode().IsRegular() || stat.Uid != s.Owner || info.Mode().Perm()&0022 != 0 || (!s.Public && info.Mode().Perm()&0077 != 0) {
		return errors.New("unsafe record ownership or permissions")
	}
	b, err := io.ReadAll(io.LimitReader(f, MaxRecordBytes+1))
	if err != nil {
		return err
	}
	return Decode(b, target)
}
func (s Store) Write(name string, value any) error {
	p, err := s.name(name)
	if err != nil {
		return err
	}
	b, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	if len(b) > MaxRecordBytes {
		return errors.New("oversized record")
	}
	mode := os.FileMode(0600)
	if s.Public {
		mode = 0644
	}
	return AtomicFile(p, append(b, '\n'), mode)
}
func (s Store) Remove(name string) error {
	p, err := s.name(name)
	if err != nil {
		return err
	}
	err = os.Remove(p)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

// AtomicFile requires an already protected parent, replaces the directory entry (not its target).
func AtomicFile(p string, data []byte, mode os.FileMode) error {
	f, err := os.CreateTemp(filepath.Dir(p), ".autobyteus-write-")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	defer f.Close()
	if err = f.Chmod(mode); err != nil {
		return err
	}
	if _, err = f.Write(data); err != nil {
		return err
	}
	if err = f.Sync(); err != nil {
		return err
	}
	if err = f.Close(); err != nil {
		return err
	}
	if err = os.Rename(f.Name(), p); err != nil {
		return err
	}
	dir, err := os.Open(filepath.Dir(p))
	if err != nil {
		return err
	}
	defer dir.Close()
	return dir.Sync()
}

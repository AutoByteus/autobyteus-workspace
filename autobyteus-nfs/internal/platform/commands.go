// Package platform owns fixed OS administration commands, filesystem qualification and mounts.
package platform

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

type Runner interface {
	Run(binary string, args ...string) ([]byte, error)
}
type Commands struct{ Lock *os.File }

func (r Commands) Run(binary string, args ...string) ([]byte, error) {
	if !filepath.IsAbs(binary) {
		return nil, errors.New("administrative executable must be absolute")
	}
	if err := TrustedPath(binary, false); err != nil {
		return nil, err
	}
	cmd := exec.Command(binary, args...)
	if r.Lock != nil {
		cmd.ExtraFiles = []*os.File{r.Lock}
	}
	cmd.Env = []string{"PATH=/usr/sbin:/usr/bin:/sbin:/bin", "HOME=/var/empty", "LANG=C", "LC_ALL=C"}
	if binary == "/usr/bin/apt-get" {
		cmd.Env = append(cmd.Env, "DEBIAN_FRONTEND=noninteractive")
	}
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out
	if err := cmd.Run(); err != nil {
		return out.Bytes(), fmt.Errorf("%s failed: %w: %s", filepath.Base(binary), err, out.String())
	}
	return out.Bytes(), nil
}

// Resolve symlinks first (macOS system directories use them), then verify every ancestor.
func TrustedPath(p string, directory bool) error {
	resolved, err := filepath.EvalSymlinks(p)
	if err != nil {
		return err
	}
	first := true
	for current := resolved; ; current = filepath.Dir(current) {
		info, err := os.Lstat(current)
		if err != nil {
			return err
		}
		st := info.Sys().(*syscall.Stat_t)
		if st.Uid != 0 || info.Mode().Perm()&0022 != 0 {
			return fmt.Errorf("root-owned, non-writable path required: %s", current)
		}
		if first && directory && !info.IsDir() {
			return errors.New("expected directory")
		}
		first = false
		if current == "/" {
			break
		}
	}
	return nil
}

// RootDirectory never chmods/adopts an existing unsafe directory.
func RootDirectory(p string, mode os.FileMode) error {
	if _, err := os.Lstat(p); os.IsNotExist(err) {
		if err := RootDirectory(filepath.Dir(p), 0755); err != nil {
			return err
		}
		if err := os.Mkdir(p, mode); err != nil {
			return err
		}
	} else if err != nil {
		return err
	}
	return TrustedPath(p, true)
}

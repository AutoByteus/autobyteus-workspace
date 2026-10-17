// Package service owns serial reconciliation and exact nonroot readiness probes.
package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

// Probe is executed as the selected user (AUTH_SYS maps to the source owner remotely).
// OpenRoot confines all generated entries to the selected directory, even if it contains symlinks.
func Probe(root, storageID string, initialize bool) error {
	if !config.ValidID(storageID) || !config.AbsolutePath(root) {
		return errors.New("invalid probe identity")
	}
	dir, err := os.OpenRoot(root)
	if err != nil {
		return err
	}
	defer dir.Close()
	if initialize {
		if err = dir.Mkdir(".autobyteus-nfs", 0755); err != nil && !os.IsExist(err) {
			return err
		}
		b, _ := json.Marshal(config.Marker{StorageID: storageID})
		f, e := dir.OpenFile(".autobyteus-nfs/storage.json", os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
		if e == nil {
			_, e = f.Write(append(b, '\n'))
			if e == nil {
				e = f.Sync()
			}
			closeErr := f.Close()
			if e == nil {
				e = closeErr
			}
		}
		if e != nil && !os.IsExist(e) {
			return e
		}
		if err = dir.Mkdir(".autobyteus-nfs/health", 0700); err != nil && !os.IsExist(err) {
			return err
		}
	}
	marker, err := config.ReadMarker(root)
	if err != nil {
		return err
	}
	if marker.StorageID != storageID {
		return errors.New("storage marker mismatch; refusing local substitute")
	}

	health, err := dir.Stat(".autobyteus-nfs/health")
	if err != nil {
		return err
	}
	owner := health.Sys().(*syscall.Stat_t)
	if !health.IsDir() || owner.Uid == 0 || owner.Gid == 0 {
		return errors.New("health directory must belong to the selected nonroot data identity")
	}
	id, err := config.NewID()
	if err != nil {
		return err
	}
	name := filepath.Join(".autobyteus-nfs", "health", id)
	payload := []byte("autobyteus-nfs probe " + id + "\n")
	f, err := dir.OpenFile(name, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	defer dir.Remove(name)
	writtenInfo, e := f.Stat()
	if e != nil {
		f.Close()
		return e
	}
	writtenOwner := writtenInfo.Sys().(*syscall.Stat_t)
	if writtenOwner.Uid != owner.Uid || writtenOwner.Gid != owner.Gid {
		f.Close()
		return errors.New("probe write did not map to the selected nonroot source identity")
	}

	_, err = f.Write(payload)
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	f, err = dir.Open(name)
	if err != nil {
		return err
	}
	read, err := io.ReadAll(io.LimitReader(f, 1024))
	closeErr = f.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	if !bytes.Equal(payload, read) {
		return errors.New("storage probe read differs from synced bytes")
	}
	return dir.Remove(name)
}
func NonrootProbe(binary, root, storageID string, uid, gid uint32, initialize bool, lock *os.File) error {
	if uid == 0 || gid == 0 {
		return errors.New("health probe requires nonroot identity")
	}
	if err := platform.TrustedPath(binary, false); err != nil {
		return err
	}
	args := []string{"internal-probe", root, storageID}
	if initialize {
		args = append(args, "initialize")
	}
	cmd := exec.Command(binary, args...)
	if lock != nil {
		cmd.ExtraFiles = []*os.File{lock}
	}
	cmd.Env = []string{"PATH=/usr/bin:/bin", "HOME=/var/empty", "LANG=C"}
	cmd.SysProcAttr = &syscall.SysProcAttr{Credential: &syscall.Credential{Uid: uid, Gid: gid, Groups: []uint32{}}}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("nonroot storage check incomplete: %w: %s", err, out)
	}
	return nil
}

func CreateSource(binary, path string, uid, gid uint32, lock *os.File) error {
	if uid == 0 || gid == 0 || !config.AbsolutePath(path) {
		return errors.New("invalid nonroot source creation")
	}
	if err := platform.TrustedPath(binary, false); err != nil {
		return err
	}
	cmd := exec.Command(binary, "internal-create-source", path)
	if lock != nil {
		cmd.ExtraFiles = []*os.File{lock}
	}
	cmd.Env = []string{"PATH=/usr/bin:/bin", "HOME=/var/empty", "LANG=C"}
	cmd.SysProcAttr = &syscall.SysProcAttr{Credential: &syscall.Credential{Uid: uid, Gid: gid, Groups: []uint32{}}}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("source directory creation failed: %w: %s", err, out)
	}
	return nil
}

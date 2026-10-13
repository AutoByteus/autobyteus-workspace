package backend

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

// Installation is explicit, pinned and separate from reconnect. The temporary
// default-unit mask prevents package postinst from starting a second export engine.
func InstallUbuntuPackages(r platform.Runner, packages map[string]string, hosting bool, stateRoot string) (result error) {
	names := []string{"nfs-common"}
	if hosting {
		names = append(names, "nfs-ganesha", "nfs-ganesha-vfs")
	}
	args := []string{"install", "--yes", "--no-install-recommends"}
	needed := false
	for _, name := range names {
		version := packages[name]
		if version == "" || strings.ContainsAny(version, " \n\r\t\x00") || strings.HasPrefix(version, "-") {
			return fmt.Errorf("release lacks a pinned %s package", name)
		}
		b, err := r.Run("/usr/bin/dpkg-query", "-W", "-f=${Version}", name)
		if err != nil || strings.TrimSpace(string(b)) != version {
			needed = true
		}
		args = append(args, name+"="+version)
	}
	store := config.Store{Directory: stateRoot, Owner: 0}
	var receipt struct {
		MaskedDefaultUnit bool `json:"maskedDefaultUnit"`
	}
	receiptErr := store.Read("package-mask.json", &receipt)
	if receiptErr != nil && !os.IsNotExist(receiptErr) {
		return receiptErr
	}
	if !needed && !receipt.MaskedDefaultUnit {
		return nil
	}
	if hosting {
		if _, err := r.Run("/usr/bin/systemctl", "is-active", "--quiet", "nfs-ganesha.service"); err == nil {
			return errors.New("unrelated Ganesha is active; package changes refused")
		}
		const mask = "/etc/systemd/system/nfs-ganesha.service"
		if info, err := os.Lstat(mask); err == nil {
			target, e := os.Readlink(mask)
			if !receipt.MaskedDefaultUnit || e != nil || target != "/dev/null" || info.Mode()&os.ModeSymlink == 0 {
				return errors.New("existing distribution Ganesha override/mask is not ours; refusing package changes")
			}
		} else if !os.IsNotExist(err) {
			return err
		} else {
			receipt.MaskedDefaultUnit = true
			if err = store.Write("package-mask.json", receipt); err != nil {
				return err
			}
			if err = os.Symlink("/dev/null", mask); err != nil {
				return err
			}
		}
		defer func() { result = errors.Join(result, removePackageMask(r, store, mask)) }()

		if _, err := r.Run("/usr/bin/systemctl", "daemon-reload"); err != nil {
			return err
		}
	}
	if !needed {
		return nil
	}
	if _, err := r.Run("/usr/bin/apt-get", "update"); err != nil {
		return err
	}
	_, err := r.Run("/usr/bin/apt-get", args...)
	return err
}

// Keep the receipt whenever cleanup is uncertain; never report a completed install
// while the distribution service still has our temporary mask or a failed reload.
func removePackageMask(r platform.Runner, store config.Store, mask string) error {
	target, err := os.Readlink(mask)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("package-mask cleanup: %w", err)
	}
	if err == nil {
		if target != "/dev/null" {
			return errors.New("package mask changed externally; receipt retained")
		}
		if err = os.Remove(mask); err != nil {
			return err
		}
	}
	if _, err = r.Run("/usr/bin/systemctl", "daemon-reload"); err != nil {
		return err
	}
	return store.Remove("package-mask.json")
}

// Detach can also finish interrupted package-mask cleanup without installing anything.
func RemoveOwnedPackageMask(r platform.Runner, stateRoot string) error {
	store := config.Store{Directory: stateRoot, Owner: 0}
	var receipt struct {
		MaskedDefaultUnit bool `json:"maskedDefaultUnit"`
	}
	if err := store.Read("package-mask.json", &receipt); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	if !receipt.MaskedDefaultUnit {
		return errors.New("invalid package-mask receipt")
	}
	return removePackageMask(r, store, "/etc/systemd/system/nfs-ganesha.service")
}

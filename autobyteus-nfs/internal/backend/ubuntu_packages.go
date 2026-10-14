package backend

import (
	"errors"
	"fmt"
	"os"
	"runtime"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

// Installation is explicit, pinned and separate from reconnect. The temporary
// default-unit mask prevents package postinst from starting a second export engine.
func InstallUbuntuPackages(r platform.Runner, packages map[string]string, engine *EngineManifest, hosting bool, stateRoot string) error {
	var payload []enginePayload
	if hosting {
		var err error
		payload, err = readEngineBundle(engine, runtime.GOARCH, engineAssets)
		if err != nil {
			return err
		}
	}
	if err := platform.TrustedPath(stateRoot, true); err != nil {
		return err
	}
	info, err := os.Stat(stateRoot)
	if err != nil {
		return err
	}
	if info.Mode().Perm() != 0700 {
		return errors.New("package staging requires private0700 state")
	}
	return installUbuntuPackages(r, packages, payload, hosting, config.Store{Directory: stateRoot, Owner: 0}, "/etc/systemd/system/nfs-ganesha.service")
}

func installUbuntuPackages(r platform.Runner, packages map[string]string, payload []enginePayload, hosting bool, store config.Store, mask string) (result error) {
	version := packages["nfs-common"]
	if version == "" || strings.ContainsAny(version, " \n\r\t\x00") || strings.HasPrefix(version, "-") {
		return errors.New("release lacks a pinned nfs-common package")
	}
	versions := map[string]string{"nfs-common": version}
	names := []string{"nfs-common"}
	for _, p := range payload {
		names = append(names, p.identity.Name)
		versions[p.identity.Name] = p.identity.Version
	}
	needed := false
	for _, name := range names {
		if !installedVersion(r, name, versions[name]) {
			needed = true
		}
	}

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
	args := []string{"install", "--yes", "--no-install-recommends", "nfs-common=" + version}
	if hosting {
		paths, cleanup, err := stageEngine(store.Directory, payload)
		if err != nil {
			return err
		}
		defer func() { result = errors.Join(result, cleanup()) }()
		args = append(args, paths...)
	}
	if _, err := r.Run("/usr/bin/apt-get", "update"); err != nil {
		return err
	}
	if _, err := r.Run("/usr/bin/apt-get", args...); err != nil {
		return err
	}
	for _, name := range names {
		if !installedVersion(r, name, versions[name]) {
			return fmt.Errorf("installed %s differs from release pin", name)
		}
	}
	return nil
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

func installedVersion(r platform.Runner, name, version string) bool {
	b, err := r.Run("/usr/bin/dpkg-query", "-W", "-f=${Status} ${Version}", name)
	return err == nil && strings.TrimSpace(string(b)) == "install ok installed "+version
}

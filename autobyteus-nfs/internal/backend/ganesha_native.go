package backend

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

const engineUnit = "autobyteus-nfs-ganesha.service"
const engineUnitPath = "/etc/systemd/system/" + engineUnit

func GaneshaUnit(root string) string {
	return fmt.Sprintf(`[Unit]
Description=AutoByteus private Ganesha NFS engine
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
ExecStart=/usr/bin/ganesha.nfsd -F -f %s/ganesha/ganesha.conf -L %s/ganesha/engine.log -p %s/ganesha/ganesha.pid
Restart=on-failure
RestartSec=10
UMask=0077
[Install]
WantedBy=multi-user.target
`, root, root, root)
}
func WriteGanesha(h config.HostedFilesystem, root string, container bool) error {
	for _, dir := range []string{filepath.Join(root, "ganesha"), filepath.Join(root, "ganesha", "recovery")} {
		if err := platform.RootDirectory(dir, 0700); err != nil {
			return err
		}
	}
	content, err := GaneshaConfig(h, root, container)
	if err != nil {
		return err
	}
	p := filepath.Join(root, "ganesha", "ganesha.conf")
	if prior, e := os.ReadFile(p); e == nil {
		if string(prior) != content {
			return errors.New("owned Ganesha config differs; refusing external overwrite")
		}
		return nil
	} else if !os.IsNotExist(e) {
		return e
	}
	return config.AtomicFile(p, []byte(content), 0600)
}
func InstallGanesha(r platform.Runner, h config.HostedFilesystem, root string) error {
	// An unrelated nfsd/Ganesha must never be stopped/reconfigured to make room.
	if _, err := r.Run("/usr/bin/systemctl", "is-active", "--quiet", "nfs-ganesha.service"); err == nil {
		return errors.New("unrelated native Ganesha is active; no changes made")
	}
	want := []byte(GaneshaUnit(root))
	if b, err := os.ReadFile(engineUnitPath); err == nil && !bytes.Equal(b, want) {
		return errors.New("Ganesha unit path occupied")
	} else if err != nil && !os.IsNotExist(err) {
		return err
	}
	if err := WriteGanesha(h, root, false); err != nil {
		return err
	}
	if err := config.AtomicFile(engineUnitPath, want, 0644); err != nil {
		return err
	}
	if _, err := r.Run("/usr/bin/systemctl", "daemon-reload"); err != nil {
		return err
	}
	_, err := r.Run("/usr/bin/systemctl", "enable", "--now", engineUnit)
	return err
}
func EnsureGanesha(r platform.Runner, h config.HostedFilesystem, root string) error {
	if err := VerifyGanesha(h, root, false); err != nil {
		return err
	}
	b, err := os.ReadFile(engineUnitPath)
	if err != nil {
		return err
	}
	if string(b) != GaneshaUnit(root) {
		return errors.New("Ganesha unit changed externally")
	}
	_, err = r.Run("/usr/bin/systemctl", "start", engineUnit)
	return err
}
func DetachGanesha(r platform.Runner, root string) error {
	b, err := os.ReadFile(engineUnitPath)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if string(b) != GaneshaUnit(root) {
		return errors.New("Ganesha unit changed externally; retained")
	}
	if _, err = r.Run("/usr/bin/systemctl", "disable", "--now", engineUnit); err != nil {
		return err
	}
	if err = os.Remove(engineUnitPath); err != nil {
		return err
	}
	_, err = r.Run("/usr/bin/systemctl", "daemon-reload")
	return err
}

func VerifyGanesha(h config.HostedFilesystem, root string, container bool) error {
	expected, err := GaneshaConfig(h, root, container)
	if err != nil {
		return err
	}
	actual, err := os.ReadFile(filepath.Join(root, "ganesha", "ganesha.conf"))
	if err != nil {
		return err
	}
	if string(actual) != expected {
		return errors.New("owned Ganesha configuration changed; refusing to start")
	}
	return nil
}

// VerifyGaneshaForDetach permits an absent config after a partial owned teardown.
// A present but unreadable/different file must fail before any teardown effects.
func VerifyGaneshaForDetach(h config.HostedFilesystem, root string, container bool) error {
	if _, err := os.Lstat(filepath.Join(root, "ganesha", "ganesha.conf")); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	return VerifyGanesha(h, root, container)
}

// Remove only the still-matching generated config after stopping its engine.
// Source files, persistent recovery state and logs remain owned by the operator.
func RemoveGaneshaConfiguration(h config.HostedFilesystem, root string, container bool) error {
	p := filepath.Join(root, "ganesha", "ganesha.conf")
	if _, err := os.Lstat(p); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	if err := VerifyGanesha(h, root, container); err != nil {
		return err
	}
	return os.Remove(p)
}

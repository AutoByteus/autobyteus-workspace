package backend

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

func readOSFile(p string) (string, error) {
	info, err := os.Lstat(p)
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	if !info.Mode().IsRegular() || info.Size() > 1<<20 {
		return "", errors.New("unsafe/oversized OS configuration file")
	}
	if err = platform.TrustedPath(p, false); err != nil {
		return "", err
	}
	b, err := os.ReadFile(p)
	return string(b), err
}
func ReadApple() (string, string, error) {
	exports, err := readOSFile("/etc/exports")
	if err != nil {
		return "", "", err
	}
	settings, err := readOSFile("/etc/nfs.conf")
	return exports, settings, err
}
func ApplyApple(r platform.Runner, p ApplePlan) error {
	exports, settings, err := ReadApple()
	if err != nil {
		return err
	}
	nextExports, nextSettings, err := p.NextConfiguration(exports, settings)
	if err != nil {
		return err
	}
	if nextSettings != settings {
		if err = config.AtomicFile("/etc/nfs.conf", []byte(nextSettings), 0644); err != nil {
			return err
		}
	}
	if nextExports != exports {
		if err = config.AtomicFile("/etc/exports", []byte(nextExports), 0644); err != nil {
			return err
		}
	}
	if _, err = r.Run("/sbin/nfsd", "checkexports"); err != nil {
		return fmt.Errorf("export validation failed; intended configuration retained for explicit repair/detach: %w", err)
	}
	if _, err = r.Run("/sbin/nfsd", "enable"); err != nil {
		return err
	}
	if p.SettingsBlock != "" {
		_, err = r.Run("/sbin/nfsd", "restart")
	} else {
		_, err = r.Run("/sbin/nfsd", "update")
	}
	return err
}
func EnsureApple(r platform.Runner, p ApplePlan) error {
	exports, settings, err := ReadApple()
	if err != nil {
		return err
	}
	if !strings.Contains(exports, p.ExportBlock) || (p.SettingsBlock != "" && !strings.Contains(settings, p.SettingsBlock)) {
		return errors.New("owned Apple export/settings changed; will not rewrite external changes")
	}
	if _, err = r.Run("/sbin/nfsd", "checkexports"); err != nil {
		return err
	}
	_, err = r.Run("/sbin/nfsd", "start")
	return err
}

// DetachApple reports deliberately retained shared/external settings separately
// from a failure to detach the exact owned export.
func DetachApple(r platform.Runner, p ApplePlan) (string, error) {
	exports, settings, err := ReadApple()
	if err != nil {
		return "", err
	}
	next := exports
	if strings.Contains(exports, p.ExportBlock) {
		next, err = RemoveExact(exports, p.ExportBlock)
		if err != nil {
			return "", err
		}
		if err = config.AtomicFile("/etc/exports", []byte(next), 0644); err != nil {
			return "", err
		}
		if _, err = r.Run("/sbin/nfsd", "update"); err != nil {
			return "", err
		}
	} else if strings.Contains(exports, strings.SplitN(p.ExportBlock, "\n", 2)[0]) {
		return "", errors.New("owned Apple export changed externally; retained")
	}
	remaining := false
	for _, line := range strings.Split(next, "\n") {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "#") {
			remaining = true
		}
	}
	if p.SettingsBlock == "" {
		return "Apple nfsd remains OS-owned; no owned global settings to restore", nil
	}
	if remaining {
		return "Export detached; Apple global settings retained because other exports now exist", nil
	}
	if !strings.Contains(settings, p.SettingsBlock) {
		return "Export detached; Apple settings were externally changed or already removed and were not overwritten", nil
	}
	nextSettings, err := RemoveExact(settings, p.SettingsBlock)
	if err != nil {
		return "", err
	}
	if err = config.AtomicFile("/etc/nfs.conf", []byte(nextSettings), 0644); err != nil {
		return "", err
	}
	// No unrelated export exists; reload restored fixed settings without disabling nfsd.
	_, err = r.Run("/sbin/nfsd", "restart")
	return "Owned export/settings removed; Apple nfsd remains OS-owned and was not disabled", err
}

package platform

import (
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

const jobLabel = "com.autobyteus.nfs"
const unitName = "autobyteus-nfs.service"

func jobPath() string {
	if runtime.GOOS == "darwin" {
		return "/Library/LaunchDaemons/" + jobLabel + ".plist"
	}
	return "/etc/systemd/system/" + unitName
}
func xmlText(s string) string {
	var b bytes.Buffer
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}
func JobDefinition(osName, binary, privateRoot string) string {
	if osName == "darwin" {
		return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>%s</string>
<key>ProgramArguments</key><array><string>%s</string><string>service</string></array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>30</integer>
<key>StandardOutPath</key><string>%s/service.log</string>
<key>StandardErrorPath</key><string>%s/service.log</string>
</dict></plist>
`, jobLabel, xmlText(binary), xmlText(privateRoot), xmlText(privateRoot))
	}
	return fmt.Sprintf(`[Unit]
Description=AutoByteus NFS attachment service
Wants=network-online.target
After=network-online.target
[Service]
Type=simple
ExecStart=%s service
Restart=on-failure
RestartSec=30
KillMode=process
TimeoutStopSec=infinity
UMask=0077
[Install]
WantedBy=multi-user.target
`, binary)
}
func InstallJob(r Runner) error {
	if err := TrustedPath(config.BinaryPath(), false); err != nil {
		return err
	}
	p := jobPath()
	want := []byte(JobDefinition(runtime.GOOS, config.BinaryPath(), config.PrivateDirectory()))
	if old, err := os.ReadFile(p); err == nil {
		if !bytes.Equal(old, want) {
			return errors.New("service job path is occupied by a different definition")
		}
	} else if !os.IsNotExist(err) {
		return err
	}
	if err := RootDirectory(filepath.Dir(p), 0755); err != nil {
		return err
	}
	if err := config.AtomicFile(p, want, 0644); err != nil {
		return err
	}
	if runtime.GOOS == "darwin" {
		if _, err := r.Run("/bin/launchctl", "print", "system/"+jobLabel); err == nil {
			return nil
		}
		_, err := r.Run("/bin/launchctl", "bootstrap", "system", p)
		return err
	}
	if _, err := r.Run("/usr/bin/systemctl", "daemon-reload"); err != nil {
		return err
	}
	_, err := r.Run("/usr/bin/systemctl", "enable", "--now", unitName)
	return err
}
func RemoveJob(r Runner) error {
	p := jobPath()
	old, err := os.ReadFile(p)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if !bytes.Equal(old, []byte(JobDefinition(runtime.GOOS, config.BinaryPath(), config.PrivateDirectory()))) {
		return errors.New("owned job changed externally; retained")
	}
	if runtime.GOOS == "darwin" {
		if _, err = r.Run("/bin/launchctl", "print", "system/"+jobLabel); err == nil {
			_, err = r.Run("/bin/launchctl", "bootout", "system/"+jobLabel)
		}
	} else {
		_, err = r.Run("/usr/bin/systemctl", "disable", "--now", unitName)
	}
	if err != nil {
		return err
	}
	return os.Remove(p)
}

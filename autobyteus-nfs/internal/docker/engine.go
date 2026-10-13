package docker

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

var pinnedImage = regexp.MustCompile(`^[a-z0-9][a-z0-9./:_-]+@sha256:[a-f0-9]{64}$`)

func (c *Client) EnsureEngine(h config.HostedFilesystem, root string, create bool) error {
	if !pinnedImage.MatchString(h.EngineImage) {
		return errors.New("release must supply the qualified immutable Ganesha image digest")
	}
	var info struct{ OSType string }
	if err := c.Call("GET", "/info", nil, &info); err != nil {
		return err
	}
	if info.OSType != "linux" {
		return errors.New("Ganesha Docker hosting requires Linux")
	}
	name := "autobyteus-nfs-storage-" + h.InstallationID
	existing, err := c.Inspect(name)
	if err == nil {
		if stringValue(labels(existing), storageLabel) != h.StorageID || stringValue(existing.Config, "Image") != h.EngineImage {
			return errors.New("storage engine identity/image differs; refusing replacement")
		}
		if err := validateEngine(existing, h, root); err != nil {
			return err
		}
		if existing.State.Running {
			return nil
		}
		return c.Start(existing.ID)
	}
	if !IsMissing(err) {
		return err
	}
	if !create {
		return errors.New("owned storage engine is missing; explicit setup repair required")
	}
	// Setup may pull the exact release digest after consent. Node recreation never pulls.
	if err = c.Call("POST", "/images/create?fromImage="+url.QueryEscape(h.EngineImage), nil, nil); err != nil {
		return fmt.Errorf("cannot fetch immutable storage engine: %w", err)
	}
	payload := EnginePayload(h, root)
	id, err := c.Create(name, payload)
	if err != nil {
		return err
	}
	return c.Start(id)
}
func (c *Client) DetachEngine(h config.HostedFilesystem, root string) error {
	s, err := c.Inspect("autobyteus-nfs-storage-" + h.InstallationID)
	if IsMissing(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if stringValue(labels(s), storageLabel) != h.StorageID || !strings.HasPrefix(s.Image, "sha256:") {
		return errors.New("storage engine ownership changed")
	}
	if err := validateEngine(s, h, root); err != nil {
		return err
	}
	if s.State.Running {
		if err = c.Stop(s.ID); err != nil {
			return err
		}
	}
	return c.Remove(s.ID)
}

func EnginePayload(h config.HostedFilesystem, root string) Object {
	return Object{"Image": h.EngineImage, "Cmd": []string{}, "Entrypoint": []string{"/usr/bin/ganesha.nfsd", "-F", "-f", "/etc/ganesha/ganesha.conf", "-L", "/dev/stdout", "-p", "/run/ganesha/ganesha.pid"}, "Labels": Object{storageLabel: h.StorageID, "com.autobyteus.nfs.installationId": h.InstallationID}, "HostConfig": Object{
		"NetworkMode": "host", "RestartPolicy": Object{"Name": "unless-stopped"}, "CapDrop": []string{"ALL"}, "CapAdd": []string{"DAC_READ_SEARCH", "DAC_OVERRIDE", "SETUID", "SETGID", "CHOWN", "FOWNER", "NET_BIND_SERVICE"},
		"Mounts": []any{Object{"Type": "bind", "Source": h.Source, "Target": "/export"}, Object{"Type": "bind", "Source": filepath.Join(root, "ganesha", "ganesha.conf"), "Target": "/etc/ganesha/ganesha.conf", "ReadOnly": true}, Object{"Type": "bind", "Source": filepath.Join(root, "ganesha", "recovery"), "Target": "/var/lib/ganesha"}},
	}}
}

func validateEngine(s Snapshot, h config.HostedFilesystem, root string) error {
	expected := EnginePayload(h, root)
	if stringValue(labels(s), "com.autobyteus.nfs.installationId") != h.InstallationID || boolValue(s.HostConfig, "Privileged") || stringValue(s.HostConfig, "PidMode") == "host" {
		return errors.New("storage engine owner/isolation differs")
	}
	host := expected["HostConfig"].(map[string]any)
	if stringValue(s.HostConfig, "NetworkMode") != "host" {
		return errors.New("storage engine network mode differs")
	}
	restart, _ := s.HostConfig["RestartPolicy"].(map[string]any)
	if stringValue(restart, "Name") != "unless-stopped" {
		return errors.New("storage engine restart policy differs")
	}
	for _, key := range []string{"CapDrop", "CapAdd"} {
		if capabilities(s.HostConfig[key]) != capabilities(host[key]) {
			return fmt.Errorf("storage engine %s differs", key)
		}
	}

	a, _ := json.Marshal(s.Config["Entrypoint"])
	b, _ := json.Marshal(expected["Entrypoint"])
	if string(a) != string(b) || !emptyCommand(s.Config["Cmd"]) {
		return errors.New("storage engine entrypoint differs")
	}
	mounts := host["Mounts"].([]any)
	if len(s.Mounts) != len(mounts) {
		return errors.New("storage engine has different mounts")
	}
	for _, raw := range mounts {
		m := raw.(map[string]any)
		found := false
		for _, actual := range s.Mounts {
			if actual.Type == "bind" && actual.Source == stringValue(m, "Source") && actual.Destination == stringValue(m, "Target") && actual.RW != boolValue(m, "ReadOnly") {
				found = true
			}
		}
		if !found {
			return errors.New("storage engine source/config/recovery binding differs")
		}
	}
	return nil
}

func capabilities(value any) string {
	b, _ := json.Marshal(value)
	var names []string
	if json.Unmarshal(b, &names) != nil {
		return "invalid"
	}
	for i, n := range names {
		names[i] = strings.TrimPrefix(strings.ToUpper(n), "CAP_")
	}
	sort.Strings(names)
	return strings.Join(names, ",")
}

func emptyCommand(value any) bool {
	b, _ := json.Marshal(value)
	var args []string
	return json.Unmarshal(b, &args) == nil && len(args) == 0
}

package docker

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

type Object = map[string]any

// Config and HostConfig remain opaque Docker-owned shapes, preserving fields we do not change.
type Snapshot struct {
	ID         string `json:"Id"`
	Name       string `json:"Name"`
	Image      string `json:"Image"`
	Config     Object `json:"Config"`
	HostConfig Object `json:"HostConfig"`
	Mounts     []struct {
		Type, Name, Source, Destination string
		RW                              bool
	} `json:"Mounts"`
	NetworkSettings struct {
		Networks map[string]Object `json:"Networks"`
	} `json:"NetworkSettings"`
	State struct {
		Running, Paused, Restarting, Dead, OOMKilled bool
		Status, Error, StartedAt, FinishedAt         string
		Pid, ExitCode                                int
	} `json:"State"`
}

func stringValue(m Object, k string) string { s, _ := m[k].(string); return s }
func boolValue(m Object, k string) bool     { v, _ := m[k].(bool); return v }
func labels(s Snapshot) Object              { m, _ := s.Config["Labels"].(map[string]any); return m }
func (s Snapshot) Node() string             { return stringValue(labels(s), nodeLabel) }
func (s Snapshot) Validate(root string) error {
	if len(s.ID) != 64 || !strings.HasPrefix(s.Image, "sha256:") || s.Name == "" || !config.ValidNode(s.Node()) || stringValue(labels(s), launcherLabel) != "server-docker" {
		return errors.New("not an exact AutoByteus-managed node")
	}
	if s.State.Paused || s.State.Restarting || s.State.Dead || boolValue(s.HostConfig, "AutoRemove") {
		return errors.New("node is paused/restarting/dead/auto-removing; no safe recreation plan")
	}
	network := stringValue(s.HostConfig, "NetworkMode")
	if network == "host" || network == "none" || strings.HasPrefix(network, "container:") || len(s.NetworkSettings.Networks) == 0 {
		return errors.New("unsupported managed-node network configuration")
	}
	if boolValue(s.HostConfig, "Privileged") || stringValue(s.HostConfig, "PidMode") == "host" || stringValue(s.HostConfig, "IpcMode") == "host" {
		return errors.New("custom host-privileged node is not supported")
	}
	if volumes, ok := s.HostConfig["VolumesFrom"].([]any); ok && len(volumes) > 0 {
		return errors.New("VolumesFrom node recreation is not supported")
	}
	for _, m := range s.Mounts {
		if config.Overlap(root, m.Destination) || config.Overlap(config.PublicDirectory, m.Destination) {
			id := stringValue(labels(s), storageLabel)
			ownedData := config.ValidID(id) && m.Destination == root && m.Type == "volume" && m.Name == "autobyteus-nfs-"+id && m.RW
			ownedDescriptor := config.ValidID(id) && m.Destination == config.PublicDirectory && m.Type == "bind" && m.Source == config.PublicDirectory && !m.RW
			if !ownedData && !ownedDescriptor {
				return fmt.Errorf("existing mount overlaps attachment: %s", m.Destination)
			}
		}
	}
	return nil
}
func (s Snapshot) Fingerprint() string {
	// Dynamic IP/sandbox fields are not configuration. Requested IPAM settings and aliases are.
	b, _ := json.Marshal(struct {
		ID, Name, Image    string
		Config, HostConfig Object
		Networks           map[string]Object
		Running            bool
	}{s.ID, s.Name, s.Image, s.Config, s.HostConfig, networkConfig(s), s.State.Running})
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
func clone(m Object) Object {
	b, _ := json.Marshal(m)
	var out Object
	_ = json.Unmarshal(b, &out)
	return out
}
func networkConfig(s Snapshot) map[string]Object {
	networks := map[string]Object{}
	for name, endpoint := range s.NetworkSettings.Networks {
		out := Object{}
		for _, key := range []string{"IPAMConfig", "Links", "DriverOpts", "GwPriority"} {
			if value, ok := endpoint[key]; ok && value != nil {
				out[key] = value
			}
		}
		// Docker-generated ID aliases must not point at the retained old container.
		if aliases, ok := endpoint["Aliases"].([]any); ok {
			kept := []any{}
			for _, a := range aliases {
				if a != s.ID && (len(s.ID) < 12 || a != s.ID[:12]) {
					kept = append(kept, a)
				}
			}
			out["Aliases"] = kept
		}
		networks[name] = out
	}
	return networks
}
func (s Snapshot) Replacement(a config.NodeAttachment, detach bool) (Object, error) {
	if err := s.Validate(a.MountRoot); err != nil {
		return nil, err
	}
	payload := clone(s.Config)
	payload["Image"] = s.Image
	host := clone(s.HostConfig)
	mounts, _ := host["Mounts"].([]any)
	kept := []any{}
	for _, value := range mounts {
		m, ok := value.(map[string]any)
		if !ok {
			return nil, errors.New("invalid existing mount")
		}
		target := stringValue(m, "Target")
		if target == a.MountRoot || target == config.PublicDirectory {
			expected := a.Volume
			if target == config.PublicDirectory {
				expected = a.DescriptorDirectory
			}
			if stringValue(m, "Source") != expected {
				return nil, errors.New("attachment mount source changed")
			}
			continue
		}
		kept = append(kept, m)
	}
	// Legacy bind syntax cannot be silently reinterpreted to hide an unrelated mount.
	if binds, ok := host["Binds"].([]any); ok {
		for _, b := range binds {
			parts := strings.Split(fmt.Sprint(b), ":")
			if len(parts) > 1 && (config.Overlap(parts[1], a.MountRoot) || config.Overlap(parts[1], config.PublicDirectory)) {
				return nil, errors.New("bind mount overlaps shared attachment")
			}
		}
	}
	// Retain actual image-declared/anonymous volumes instead of allocating fresh ones.
	represented := map[string]bool{}
	for _, v := range kept {
		if m, ok := v.(map[string]any); ok {
			represented[stringValue(m, "Target")] = true
		}
	}
	if binds, ok := host["Binds"].([]any); ok {
		for _, v := range binds {
			p := strings.Split(fmt.Sprint(v), ":")
			if len(p) > 1 {
				represented[p[1]] = true
			}
		}
	}
	for _, m := range s.Mounts {
		if represented[m.Destination] || m.Destination == a.MountRoot || m.Destination == config.PublicDirectory {
			continue
		}
		if m.Type == "volume" {
			if m.Name == "" {
				return nil, errors.New("volume has no stable name")
			}
			kept = append(kept, Object{"Type": "volume", "Source": m.Name, "Target": m.Destination, "ReadOnly": !m.RW, "VolumeOptions": Object{"NoCopy": true}})
		} else if m.Type == "bind" {
			kept = append(kept, Object{"Type": "bind", "Source": m.Source, "Target": m.Destination, "ReadOnly": !m.RW})
		} else if m.Type != "tmpfs" {
			return nil, errors.New("unsupported node mount type")
		}
	}
	nextLabels, _ := payload["Labels"].(map[string]any)
	if nextLabels == nil {
		nextLabels = Object{}
		payload["Labels"] = nextLabels
	}
	if !detach {
		kept = append(kept, AttachmentMounts(a)...)
		nextLabels[storageLabel] = a.StorageID
	} else {
		delete(nextLabels, storageLabel)
	}
	host["Mounts"] = kept
	payload["HostConfig"] = host
	payload["NetworkingConfig"] = Object{"EndpointsConfig": networkConfig(s)}
	return payload, nil
}
func AttachmentMounts(a config.NodeAttachment) []any {
	return []any{
		Object{"Type": "volume", "Source": a.Volume, "Target": a.MountRoot, "VolumeOptions": Object{"NoCopy": true}},
		Object{"Type": "bind", "Source": a.DescriptorDirectory, "Target": config.PublicDirectory, "ReadOnly": true},
	}
}

func (s Snapshot) Attached(a config.NodeAttachment) bool {
	if stringValue(labels(s), storageLabel) != a.StorageID {
		return false
	}
	data, descriptor := false, false
	for _, m := range s.Mounts {
		if m.Destination == a.MountRoot && m.Type == "volume" && m.Name == a.Volume && m.RW {
			data = true
		}
		if m.Destination == config.PublicDirectory && m.Type == "bind" && m.Source == a.DescriptorDirectory && !m.RW {
			descriptor = true
		}
	}
	return data && descriptor
}

func (s Snapshot) NetworkIPs() map[string]string {
	out := map[string]string{}
	for name, endpoint := range s.NetworkSettings.Networks {
		out[name] = stringValue(endpoint, "IPAddress")
	}
	return out
}

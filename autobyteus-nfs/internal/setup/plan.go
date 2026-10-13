// Package setup is the single plan/consent/apply boundary for privileged resource changes.
package setup

import (
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/backend"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

func (s *Service) Plan(req Request) (Plan, error) {
	var p Plan
	if s.User.UID == 0 || s.User.GID == 0 || !config.AbsolutePath(s.User.Home) {
		return p, errors.New("an identified nonroot initiating user is required")
	}
	var pending Plan
	if err := s.Store.Read("pending-setup.json", &pending); err == nil {
		return p, errors.New("setup incomplete; use reconnect to review and retry the same intended source")
	} else if !os.IsNotExist(err) {
		return p, err
	}
	var prior config.Attachment
	if err := s.Store.Read("attachment.json", &prior); err == nil {
		return p, errors.New("already configured; use status/reconnect/detach")
	} else if !os.IsNotExist(err) {
		return p, err
	}
	installation, err := config.NewID()
	if err != nil {
		return p, err
	}
	c := req.Connection
	if c.MountRoot == "" {
		c.MountRoot = config.DefaultMountRoot
	}
	canonicalRoot, err := platform.ResolveTarget(c.MountRoot)
	if err != nil {
		return p, err
	}
	c.MountRoot = canonicalRoot
	if len(req.Nodes) > 0 && strings.Contains(c.MountRoot, ",") {
		return p, errors.New("selected Docker launcher mount root cannot contain a comma")
	}
	if req.Source != "" {
		if err = platform.ValidateSourcePath(req.Source, c.MountRoot, s.User.Home); err != nil {
			return p, err
		}
		id, err := platform.SourceIdentity(req.Source)
		if os.IsNotExist(err) {
			p.NewSource = true
			parent := filepath.Dir(req.Source)
			if _, err = platform.SourceIdentity(parent); err != nil {
				return p, fmt.Errorf("new source requires an existing canonical parent: %w", err)
			}
			if err = platform.QualifyFilesystem(parent); err != nil {
				return p, err
			}
		} else if err != nil {
			return p, err
		} else if err = platform.QualifyFilesystem(req.Source); err != nil {
			return p, err
		}
		storageID, err := config.NewID()
		if err != nil {
			return p, err
		}
		if !p.NewSource {
			marker, e := config.ReadMarker(req.Source)
			if e == nil {
				storageID = marker.StorageID
			} else if !os.IsNotExist(e) {
				return p, e
			}
		}
		c.StorageID = storageID
		selected := req.Backend
		if runtime.GOOS == "darwin" {
			if selected != "apple" {
				return p, errors.New("Mac storage hosting uses native Apple nfsd; Docker storage hosting is not supported")
			}
			c.Protocol = "3"
			c.Export = req.Source
		} else {
			if selected != "ganesha-native" && selected != "ganesha-docker" {
				return p, errors.New("Linux storage hosting requires Ganesha")
			}
			c.Protocol = "4.1"
			c.Export = "/autobyteus/" + storageID
		}
		allow, err := config.Allowlist(req.Allowlist)
		if err != nil {
			return p, err
		}
		p.Hosted = &config.HostedFilesystem{InstallationID: installation, StorageID: storageID, Source: req.Source, Identity: id, Backend: selected, DataUID: s.User.UID, DataGID: s.User.GID, Allowlist: allow, EngineImage: s.Release.EngineImage}
		if err = p.Hosted.Validate(); err != nil {
			return p, err
		}
		if selected == "apple" {
			exports, settings, err := backend.ReadApple()
			if err != nil {
				return p, err
			}
			a, err := backend.PlanApple(*p.Hosted, exports, settings)
			if err != nil {
				return p, err
			}
			p.Apple = &a
			p.Summary = append(p.Summary, "Apple nfsd: TCP2049 + RPC111 + mountd20048; exact export/settings to apply:\n"+a.ExportBlock+a.SettingsBlock)
		}
		if selected == "ganesha-docker" && (s.Docker == nil || s.Release.EngineImage == "") {
			return p, errors.New("Docker storage requires a reachable local daemon and a qualified immutable release image")
		}
		if selected != "apple" {
			p.Summary = append(p.Summary, "Ganesha NFSv4.1 TCP2049 only; persistent private recovery state")
		}
		p.Summary = append(p.Summary, "Export chosen source in place: "+req.Source, fmt.Sprintf("Map ALL clients to nonroot %d:%d; no recursive ownership change", s.User.UID, s.User.GID), "Trust private hosts/subnets: "+strings.Join(allow, ", "))
		ports := []string{"2049"}
		if selected == "apple" {
			ports = append(ports, "20048")
		}
		for _, port := range ports {
			listener, err := net.Listen("tcp", ":"+port)
			if err != nil {
				return p, fmt.Errorf("required TCP %s is occupied; no existing service will be stopped", port)
			}
			listener.Close()
		}
	}
	if err = c.Validate(); err != nil {
		return p, err
	}
	if err = platform.PreflightTarget(s.Runner, c); err != nil {
		return p, err
	}
	p.Attachment = config.Attachment{Connection: c, InstallationID: installation, UserUID: s.User.UID, UserGID: s.User.GID, Nodes: req.Nodes}
	if err = p.Attachment.Validate(); err != nil {
		return p, err
	}
	p.DockerSocket = req.DockerSocket
	if len(req.Nodes) > 0 {
		if s.Docker == nil {
			return p, errors.New("selected nodes require a local Docker daemon")
		}
		available, err := s.Docker.Discover()
		if err != nil {
			return p, err
		}
		for _, name := range req.Nodes {
			found := false
			for _, node := range available {
				if node.Node() != name {
					continue
				}
				found = true
				if err = node.Validate(c.MountRoot); err != nil {
					return p, err
				}
				if err = s.Docker.QualifyImage(node); err != nil {
					return p, err
				}
				// Do not overwrite an incomplete exact-resource receipt from a prior attempt.
				receipt, e := docker.ReadReceipt(s.Store, name)
				if e == nil && !receipt.Complete {
					return p, errors.New("incomplete selected-node receipt requires explicit recovery/drain before new setup")
				}
				if e != nil && !os.IsNotExist(e) {
					return p, e
				}
				p.Nodes = append(p.Nodes, node)
				p.Summary = append(p.Summary, fmt.Sprintf("Drain/recreate ONLY node %s (%s), immutable image %s; preserve private mounts, ports, aliases and running state (container ID/dynamic IP may change; status reports actual mappings)", name, node.ID, node.Image))
			}
			if !found {
				return p, fmt.Errorf("selected managed node %s is unavailable", name)
			}
		}
	}
	p.Summary = append(p.Summary, "Attach "+c.Endpoint+":"+c.Export+" at "+c.MountRoot, "Install fixed root-owned launchd/systemd service; publish nonsecret binding descriptor", "NFS is unencrypted host trust, NOT individual-user authentication; no router or firewall rules changed", "Hard NFS may stall file operations, previews and unrelated work; no local fallback or outage deadline")
	if runtime.GOOS == "linux" {
		p.Summary = append(p.Summary, "Install exact Ubuntu NFS package versions from this release, if needed")
	}
	return p, nil
}

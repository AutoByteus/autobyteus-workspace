package setup

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/backend"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/service"
)

// Apply accepts only the exact plan displayed by this process; caller holds the administrative lock.
// It never claims atomicity across the filesystem, NFS daemon and containers.
func (s *Service) Apply(p Plan, consented bool) error {
	if !consented {
		return errors.New("setup declined; no resources changed")
	}
	if err := p.Attachment.Validate(); err != nil {
		return err
	}
	if err := platform.PreflightTarget(s.Runner, p.Attachment.Connection); err != nil {
		return err
	}
	for _, node := range p.Nodes {
		now, err := s.Docker.Inspect(node.ID)
		if err != nil {
			return err
		}
		if now.Fingerprint() != node.Fingerprint() {
			return errors.New("selected node changed after consent; re-plan")
		}
	}
	if err := s.SaveIntent(p); err != nil {
		return err
	}
	if runtime.GOOS == "linux" {
		if err := backend.InstallUbuntuPackages(s.Runner, s.Release.Packages, p.Hosted != nil && p.Hosted.Backend == "ganesha-native", s.Store.Directory); err != nil {
			return err
		}
	}
	if p.Hosted != nil {
		h := p.Hosted
		if p.NewSource {
			// A nonroot child creates exactly the chosen new source, never recursive parents.
			if err := service.CreateSource(s.Binary, h.Source, h.DataUID, h.DataGID, s.Lock); err != nil {
				return err
			}
			id, err := platform.SourceIdentity(h.Source)
			if err != nil {
				return err
			}
			h.Identity = id
		}
		if err := platform.CheckSource(*h); err != nil {
			return err
		}
		if err := service.NonrootProbe(s.Binary, h.Source, h.StorageID, h.DataUID, h.DataGID, true, s.Lock); err != nil {
			return err
		}
		if _, err := s.Runner.Run(s.Binary, "internal-handles", h.Source); err != nil {
			return fmt.Errorf("source file-handle qualification failed: %w", err)
		}
		// Persist intended source/UUID before exporting. Failure is incomplete, not ready.
		if err := s.Store.Write("hosted-filesystem.json", h); err != nil {
			return err
		}
		if err := s.SaveIntent(p); err != nil {
			return err
		}

		if err := s.Store.Write("attachment.json", p.Attachment); err != nil {
			return err
		}
		if err := s.Store.Write("docker-endpoint.json", struct {
			Socket string `json:"socket"`
		}{p.DockerSocket}); err != nil {
			return err
		}
		if err := s.Public.Write("attachment.json", p.Attachment.Connection); err != nil {
			return err
		}
		if p.Apple != nil {
			if err := s.Store.Write("apple-resource.json", p.Apple); err != nil {
				return err
			}
			if err := backend.ApplyApple(s.Runner, *p.Apple, p.Attachment.Endpoint); err != nil {
				return err
			}
		}
		switch h.Backend {
		case "ganesha-native":
			if err := backend.InstallGanesha(s.Runner, *h, s.Store.Directory); err != nil {
				return err
			}
		case "ganesha-docker":
			if err := backend.WriteGanesha(*h, s.Store.Directory, true); err != nil {
				return err
			}
			if err := s.Docker.EnsureEngine(*h, s.Store.Directory, true); err != nil {
				return err
			}
		}
	}
	if p.Hosted == nil {
		if err := s.Store.Write("attachment.json", p.Attachment); err != nil {
			return err
		}
		if err := s.Store.Write("docker-endpoint.json", struct {
			Socket string `json:"socket"`
		}{p.DockerSocket}); err != nil {
			return err
		}
		if err := s.Public.Write("attachment.json", p.Attachment.Connection); err != nil {
			return err
		}
	}
	if err := platform.EnsureMount(s.Runner, p.Attachment.Connection); err != nil {
		return err
	}
	if err := service.NonrootProbe(s.Binary, p.Attachment.MountRoot, p.Attachment.StorageID, p.Attachment.UserUID, p.Attachment.UserGID, false, s.Lock); err != nil {
		return err
	}
	for _, node := range p.Nodes {
		a := docker.NodeAttachment(p.Attachment.Connection, node.Node())
		var info struct{ ID string }
		if err := s.Docker.Call("GET", "/info", nil, &info); err != nil {
			return err
		}
		if info.ID == "" {
			return errors.New("Docker daemon identity is missing")
		}
		a.DaemonID = info.ID
		if err := s.Docker.EnsureVolume(p.Attachment.Connection, a); err != nil {
			return err
		}
		if err := s.Docker.Probe(node, a, s.Store); err != nil {
			return err
		}
		if !alreadyAttached(node, a) {
			if err := s.Docker.Recreate(node, a, false, docker.ReceiptFile(s.Store, node.Node()), func(id string) error { return s.Docker.VerifyStarted(id, a.MountRoot, true) }); err != nil {
				return err
			}
		}
		if err := s.publishNode(a); err != nil {
			return err
		}
	}
	if err := platform.InstallJob(s.Runner); err != nil {
		return err
	}
	return s.Store.Remove("pending-setup.json")
}
func (s *Service) publishNode(a config.NodeAttachment) error {
	directory := filepath.Join(s.Public.Directory, "nodes")
	if err := platform.RootDirectory(directory, 0755); err != nil {
		return err
	}
	return (config.Store{Directory: directory, Owner: s.Public.Owner, Public: true}).Write(a.Node+".json", a)
}

// CheckConfiguration does not enumerate application workspaces or active runs.
func (s *Service) CheckConfiguration() (config.Attachment, *config.HostedFilesystem, error) {
	var a config.Attachment
	if err := s.Store.Read("attachment.json", &a); err != nil {
		return a, nil, err
	}
	if err := a.Validate(); err != nil {
		return a, nil, err
	}
	var h config.HostedFilesystem
	err := s.Store.Read("hosted-filesystem.json", &h)
	if os.IsNotExist(err) {
		return a, nil, nil
	}
	if err != nil {
		return a, nil, err
	}
	if err = h.Validate(); err != nil {
		return a, nil, err
	}
	if h.StorageID != a.StorageID || h.InstallationID != a.InstallationID {
		return a, nil, errors.New("source and attachment identities differ")
	}
	return a, &h, nil
}

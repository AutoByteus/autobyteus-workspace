package setup

import (
	"errors"
	"os"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

// Pending setup is an intended-resource receipt, not persisted readiness. Resume
// needs a fresh displayed plan and drain consent; the supervisor never recreates nodes.
func (s *Service) PendingPlan() (Plan, error) {
	var p Plan
	if err := s.Store.Read("pending-setup.json", &p); err != nil {
		return p, err
	}
	if err := p.Attachment.Validate(); err != nil {
		return p, err
	}
	if err := validateSourceIntent(p); err != nil {
		return p, err
	}
	if p.Hosted != nil {
		if p.Hosted.Identity != (config.Identity{}) {
			if err := platform.CheckSource(s.Runner, *p.Hosted); err != nil {
				return p, err
			}
			p.NewSource = false
		} else {
			// Zero is an unbound intent, never permission to rebind hosted state.
			if err := platform.ValidateSourcePath(p.Hosted.Source, p.Attachment.MountRoot, s.User.Home); err != nil {
				return p, err
			}
			if err := s.checkUnboundSource(); err != nil {
				return p, err
			}
			id, err := platform.SourceIdentity(s.Runner, p.Hosted.Source)
			if err == nil {
				p.Hosted.Identity = id
				p.NewSource = false
				if err := p.Hosted.ValidateBound(); err != nil {
					return p, err
				}
			} else if !os.IsNotExist(err) {
				return p, err
			}
		}
	}
	if len(p.Attachment.Nodes) > 0 {
		if s.Docker == nil {
			return p, errors.New("selected Docker daemon unavailable")
		}
		nodes, err := s.Docker.Discover()
		if err != nil {
			return p, err
		}
		for _, name := range p.Attachment.Nodes {
			receipt, err := docker.ReadReceipt(s.Store, name)
			if err == nil && !receipt.Complete {
				return p, errors.New("incomplete node recreation requires explicit recovery/drain before retry")
			}
			if err != nil && !os.IsNotExist(err) {
				return p, err
			}
			found := false
			for _, n := range nodes {
				if n.Node() == name {
					p.Nodes = append(p.Nodes, n)
					found = true
				}
			}
			if !found {
				return p, errors.New("selected node no longer exists")
			}
		}
	}
	return p, nil
}

// RecoverPendingNodes restores configuration only, after renewed operator drain.
// It never restores storage bytes or deletes a named volume.
func (s *Service) RecoverPendingNodes(consented bool) error {
	if !consented {
		return errors.New("recovery declined")
	}
	var p Plan
	if err := s.Store.Read("pending-setup.json", &p); err != nil {
		return err
	}
	for _, name := range p.Attachment.Nodes {
		r, err := docker.ReadReceipt(s.Store, name)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return err
		}
		if !r.Complete {
			if s.Docker == nil {
				return errors.New("selected daemon unavailable")
			}
			if err = s.Docker.Recover(r, docker.ReceiptFile(s.Store, name)); err != nil {
				return err
			}
		}
	}
	return nil
}

// No state reads occur through the launcher shell; only these typed owned records.
func (s *Service) SaveIntent(p Plan) error {
	if err := s.Store.Write("pending-setup.json", p); err != nil {
		return err
	}
	if err := s.Store.Write("docker-endpoint.json", struct {
		Socket string `json:"socket"`
	}{p.DockerSocket}); err != nil {
		return err
	}
	return nil
}
func alreadyAttached(n docker.Snapshot, a config.NodeAttachment) bool { return n.Attached(a) }

// Only a genuinely new, completely zero binding may await source creation.
func validateSourceIntent(p Plan) error {
	if p.Hosted == nil {
		return nil
	}
	if err := p.Hosted.Validate(); err != nil {
		return err
	}
	if p.NewSource && p.Hosted.Identity == (config.Identity{}) {
		return nil
	}
	return p.Hosted.ValidateBound()
}

func (s *Service) checkUnboundSource() error {
	var hosted config.HostedFilesystem
	if err := s.Store.Read("hosted-filesystem.json", &hosted); err == nil {
		return errors.New("unbound pending source conflicts with hosted state")
	} else if !os.IsNotExist(err) {
		return err
	}
	return nil
}

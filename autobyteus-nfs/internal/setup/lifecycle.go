package setup

import (
	"errors"
	"os"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/backend"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/service"
)

func (s *Service) Reconnect(retryConsumed bool) error {
	var pending Plan
	if err := s.Store.Read("pending-setup.json", &pending); err == nil {
		return errors.New("setup incomplete; run reconnect interactively to review/resume")
	} else if !os.IsNotExist(err) {
		return err
	}
	a, h, err := s.CheckConfiguration()
	if err != nil {
		return err
	}
	if h != nil {
		if err = platform.CheckSource(s.Runner, *h); err != nil {
			return err
		}
		switch h.Backend {
		case "apple":
			var p backend.ApplePlan
			if err = s.Store.Read("apple-resource.json", &p); err != nil {
				return err
			}
			if err = backend.EnsureApple(s.Runner, p, a.Endpoint); err != nil {
				return err
			}
		case "ganesha-native":
			if err = backend.EnsureGanesha(s.Runner, *h, s.Store.Directory); err != nil {
				return err
			}
		case "ganesha-docker":
			if s.Docker == nil {
				return errors.New("storage Docker daemon unavailable")
			}
			if err = backend.VerifyGanesha(*h, s.Store.Directory, true); err != nil {
				return err
			}
			if err = s.Docker.EnsureEngine(*h, s.Store.Directory, false); err != nil {
				return err
			}
		}
	}
	var published config.Connection
	if e := s.Public.Read("attachment.json", &published); os.IsNotExist(e) {
		if e = s.Public.Write("attachment.json", a.Connection); e != nil {
			return e
		}
	} else if e != nil {
		return e
	} else if published != a.Connection {
		return errors.New("public descriptor was changed externally; refusing silent overwrite")
	}
	if err = platform.EnsureMount(s.Runner, a.Connection); err != nil {
		return err
	}
	if err = service.NonrootProbe(s.Binary, a.MountRoot, a.StorageID, a.UserUID, a.UserGID, false, s.Lock); err != nil {
		return err
	}
	return s.reconnectNodes(a, retryConsumed)
}
func (s *Service) Detach(consented bool) error {
	if !consented {
		return errors.New("detach declined; nothing changed")
	}
	a, h, err := s.CheckConfiguration()
	var pending Plan
	if os.IsNotExist(err) {
		if e := s.Store.Read("pending-setup.json", &pending); e != nil {
			return e
		}
		if e := validateSourceIntent(pending); e != nil {
			return e
		}
		a, h = pending.Attachment, pending.Hosted
		if e := a.Validate(); e != nil {
			return e
		}
	} else if err != nil {
		return err
	}
	if h != nil && (h.Backend == "ganesha-native" || h.Backend == "ganesha-docker") {
		if err = backend.VerifyGaneshaForDetach(*h, s.Store.Directory, h.Backend == "ganesha-docker"); err != nil {
			return err
		}
	}
	if (len(a.Nodes) > 0 || (h != nil && h.Backend == "ganesha-docker")) && s.Docker == nil {
		return errors.New("selected Docker daemon unavailable; cannot safely detach nodes")
	}
	if err = s.detachNodes(a); err != nil {
		return err
	}
	// No force/unmount-as-cleanup. Busy means source/service/config remain available.
	if err = platform.Unmount(s.Runner, a.Connection); err != nil {
		return err
	}
	if err = platform.RemoveJob(s.Runner); err != nil {
		return err
	}
	if h != nil {
		switch h.Backend {
		case "apple":
			var p backend.ApplePlan
			if err = s.Store.Read("apple-resource.json", &p); os.IsNotExist(err) && pending.Apple != nil {
				p = *pending.Apple
			} else if err != nil {
				return err
			}
			note, e := backend.DetachApple(s.Runner, p)
			if e != nil {
				return e
			}
			if note != "" {
				if e = s.Store.Write("apple-detach-receipt.json", struct {
					Retained string `json:"retained"`
				}{note}); e != nil {
					return e
				}
			}
		case "ganesha-native":
			if err = backend.RemoveOwnedPackageMask(s.Runner, s.Store.Directory); err != nil {
				return err
			}
			if err = backend.DetachGanesha(s.Runner, s.Store.Directory); err != nil {
				return err
			}
		case "ganesha-docker":
			if err = s.Docker.DetachEngine(*h, s.Store.Directory); err != nil {
				return err
			}
		}
		if h.Backend != "apple" {
			if err = backend.RemoveGaneshaConfiguration(*h, s.Store.Directory, h.Backend == "ganesha-docker"); err != nil {
				return err
			}
		}
	}
	if err = s.Public.Remove("attachment.json"); err != nil {
		return err
	}
	for _, name := range []string{"attachment.json", "hosted-filesystem.json", "apple-resource.json", "docker-endpoint.json", "pending-setup.json"} {
		if err = s.Store.Remove(name); err != nil {
			return err
		}
	}
	for _, node := range a.Nodes {
		if err = docker.RemoveStartAttempt(s.Store, node); err != nil {
			return err
		}
	}
	// Source, marker, named volumes, recovery state and private recreation receipts are preserved.
	return nil
}

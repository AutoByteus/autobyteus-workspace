package setup

import (
	"errors"
	"fmt"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/service"
	"path/filepath"
)

type Status struct {
	StorageID  string            `json:"storageId"`
	Root       string            `json:"mountRoot"`
	HostReady  bool              `json:"hostReady"`
	Nodes      map[string]string `json:"nodes"`
	Limitation string            `json:"limitation"`
}

func (s *Service) Status() (Status, error) {
	result := Status{Nodes: map[string]string{}, Limitation: "Hard NFS checks may stall; no outage deadline or local substitute"}
	a, _, err := s.CheckConfiguration()
	if err != nil {
		return result, err
	}
	var publicBinding config.Connection
	if err = s.Public.Read("attachment.json", &publicBinding); err != nil {
		return result, err
	}
	if publicBinding != a.Connection {
		return result, errors.New("public binding differs from saved attachment")
	}
	result.StorageID = a.StorageID
	result.Root = a.MountRoot
	m, err := platform.Observe(s.Runner, a.Connection)
	if err != nil {
		return result, err
	}
	if !platform.Matches(m, a.Connection) {
		return result, errors.New("expected host NFS source/protocol is not mounted")
	}
	if err = service.NonrootProbe(s.Binary, a.MountRoot, a.StorageID, a.UserUID, a.UserGID, false, s.Lock); err != nil {
		return result, err
	}
	result.HostReady = true
	if len(a.Nodes) > 0 && s.Docker == nil {
		return result, errors.New("host ready, selected Docker daemon unavailable")
	}
	for _, node := range a.Nodes {
		var ref config.NodeAttachment
		public := config.Store{Directory: filepath.Join(s.Public.Directory, "nodes"), Owner: s.Public.Owner, Public: true}
		if err = public.Read(node+".json", &ref); err != nil {
			result.Nodes[node] = "not applied"
			continue
		}
		if ref.StorageID != a.StorageID || ref.MountRoot != a.MountRoot || ref.Node != node {
			result.Nodes[node] = "node reference differs; not ready"
			continue
		}
		if err = s.Docker.CheckDaemon(ref); err != nil {
			result.Nodes[node] = "daemon/reference check incomplete; not ready: " + err.Error()
			continue
		}
		candidates, err := s.Docker.Discover()
		if err != nil {
			return result, err
		}
		found := false
		for _, candidate := range candidates {
			if candidate.Node() == node {
				found = true
				if !candidate.Attached(ref) {
					result.Nodes[node] = "attachment differs; not ready"
					break
				}
				if !candidate.State.Running {
					result.Nodes[node] = "attached, stopped (not ready)"
					break
				}
				err = s.Docker.VerifyStarted(candidate.ID, a.MountRoot, true)
				if err != nil {
					result.Nodes[node] = "check incomplete: " + err.Error()
				} else {
					result.Nodes[node] = fmt.Sprintf("ready; container=%s; networks=%v", candidate.ID, candidate.NetworkIPs())
				}
				break
			}
		}
		if !found {
			result.Nodes[node] = "unavailable"
		}
	}
	return result, nil
}

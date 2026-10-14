package setup

import (
	"errors"
	"fmt"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/service"
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
	candidates, err := s.selectedNodes(a)
	if err != nil {
		return result, err
	}
	for _, node := range a.Nodes {
		ref, e := s.nodeReference(a, node)
		if e != nil {
			result.Nodes[node] = e.Error()
			continue
		}
		candidate, found := candidates[node]
		if !found {
			result.Nodes[node] = "unavailable"
			continue
		}
		observed := s.Docker.ObserveFailedStart(candidate, a.Connection, ref, s.Store)
		if observed.State != docker.StartUnchanged {
			result.Nodes[node] = observed.State + ": " + observed.Reason
			continue
		}
		if e = s.Docker.VerifyStarted(candidate.ID, a.MountRoot, true); e != nil {
			result.Nodes[node] = "actual API/shared-binding check incomplete"
		} else {
			result.Nodes[node] = fmt.Sprintf("ready; container=%s; networks=%v", candidate.ID, candidate.NetworkIPs())
		}
	}
	return result, nil
}

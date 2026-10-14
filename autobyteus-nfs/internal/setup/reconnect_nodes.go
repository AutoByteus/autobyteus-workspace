package setup

import (
	"errors"
	"fmt"
	"path/filepath"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
)

// selectedNodes discovers once per pass, resolving current launcher replacements
// by selected label. Subsequent adapter operations use only that immutable ID.
func (s *Service) selectedNodes(a config.Attachment) (map[string]docker.Snapshot, error) {
	out := map[string]docker.Snapshot{}
	if len(a.Nodes) == 0 {
		return out, nil
	}
	if s.Docker == nil {
		return out, errors.New("host ready, selected Docker daemon unavailable")
	}
	candidates, err := s.Docker.Discover()
	if err != nil {
		return out, err
	}
	for _, candidate := range candidates {
		out[candidate.Node()] = candidate
	}
	return out, nil
}
func (s *Service) nodeReference(a config.Attachment, node string) (config.NodeAttachment, error) {
	var ref config.NodeAttachment
	public := config.Store{Directory: filepath.Join(s.Public.Directory, "nodes"), Owner: s.Public.Owner, Public: true}
	if err := public.Read(node+".json", &ref); err != nil {
		return ref, errors.New("node reference unavailable")
	}
	if ref.Validate() != nil || ref.StorageID != a.StorageID || ref.MountRoot != a.MountRoot || ref.Node != node {
		return ref, errors.New("node reference differs")
	}
	return ref, nil
}
func (s *Service) reconnectNodes(a config.Attachment, retryConsumed bool) error {
	candidates, err := s.selectedNodes(a)
	if err != nil {
		return err
	}
	var failures []error
	for _, node := range a.Nodes {
		ref, e := s.nodeReference(a, node)
		if e != nil {
			failures = append(failures, fmt.Errorf("%s: %w", node, e))
			continue
		}
		current, found := candidates[node]
		if !found {
			failures = append(failures, fmt.Errorf("%s: selected node unavailable", node))
			continue
		}
		result := s.Docker.CompleteFailedStart(current, a.Connection, ref, s.Store, retryConsumed)
		if result.State == docker.StartIncomplete {
			failures = append(failures, fmt.Errorf("%s: %s", node, result.Reason))
		}
	}
	if len(failures) > 0 {
		return fmt.Errorf("host ready; selected-node completion incomplete: %w", errors.Join(failures...))
	}
	return nil
}

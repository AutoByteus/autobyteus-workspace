package docker

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

// StartResult reports observation, not desired running intent or a saved READY flag.
type StartResult struct{ State, Reason string }

const (
	StartUnchanged  = "unchanged"
	StartEligible   = "eligible"
	StartStopped    = "stopped"
	StartRecovered  = "recovered"
	StartIncomplete = "incomplete"
)

func incomplete(reason string) StartResult { return StartResult{StartIncomplete, reason} }

type startAttempt struct {
	DaemonID    string `json:"daemonId"`
	StorageID   string `json:"storageId"`
	Node        string `json:"node"`
	ContainerID string `json:"containerId"`
	StartedAt   string `json:"startedAt"`
	FinishedAt  string `json:"finishedAt"`
}

func attemptFor(s Snapshot, a config.NodeAttachment) startAttempt {
	return startAttempt{a.DaemonID, a.StorageID, a.Node, s.ID, s.State.StartedAt, s.State.FinishedAt}
}
func attemptName(node string) string { return "start-attempt-" + node + ".json" }
func validTimes(start, finish string) bool {
	a, e := time.Parse(time.RFC3339Nano, start)
	b, f := time.Parse(time.RFC3339Nano, finish)
	return e == nil && f == nil && !a.IsZero() && !b.Before(a)
}
func readAttempt(store config.Store, a config.NodeAttachment) (startAttempt, error) {
	var r startAttempt
	err := store.Read(attemptName(a.Node), &r)
	if err == nil && (r.DaemonID == "" || !config.ValidID(r.StorageID) || r.Node != a.Node || len(r.ContainerID) != 64 || !validTimes(r.StartedAt, r.FinishedAt)) {
		err = errors.New("malformed start attempt")
	}
	return r, err
}

// RemoveStartAttempt is used only after safe removal of this node's attachment.
func RemoveStartAttempt(store config.Store, node string) error {
	if !config.ValidNode(node) {
		return errors.New("invalid node")
	}
	return store.Remove(attemptName(node))
}
func automaticPolicy(s Snapshot) bool {
	p, _ := s.HostConfig["RestartPolicy"].(map[string]any)
	return stringValue(p, "Name") == "unless-stopped" || stringValue(p, "Name") == "always"
}

// Exact v29.1.3 local-driver grammar observed in two normal boots (SR021).
// mount.Mount consumes rw as a flag; only remaining data options appear here.
// No substring/exit-code fallback: changed grammar remains incomplete.
func refusedMount(s Snapshot, v nfsVolume) bool {
	if !config.AbsolutePath(v.Mountpoint) {
		return false
	}
	data := strings.Replace(v.Options["o"], ",rw,", ",", 1)
	expected := fmt.Sprintf("error while mounting volume '%s': failed to mount local volume: mount %s:%s, data: %s: connection refused", v.Mountpoint, v.Options["device"], v.Mountpoint, data)
	return s.State.Error == expected
}
func failedStart(s Snapshot, v nfsVolume) bool {
	return s.State.Status == "exited" && !s.State.Running && !s.State.Paused && !s.State.Restarting && !s.State.Dead && !s.State.OOMKilled && s.State.Pid == 0 && validTimes(s.State.StartedAt, s.State.FinishedAt) && automaticPolicy(s) && refusedMount(s, v)
}
func (c *Client) observeStart(s Snapshot, b config.Connection, a config.NodeAttachment, store config.Store) (nfsVolume, StartResult) {
	var v nfsVolume
	if err := c.CheckDaemon(a); err != nil {
		return v, incomplete("daemon/reference check failed")
	}
	if s.Node() != a.Node || s.Validate(a.MountRoot) != nil || !s.Attached(a) {
		return v, incomplete("current selected container/attachment differs")
	}
	r, err := ReadReceipt(store, a.Node)
	if (err == nil && !r.Complete) || (err != nil && !os.IsNotExist(err)) {
		return v, incomplete("recreation incomplete; explicit drain/recovery required")
	}
	v, err = c.inspectVolume(b, a)
	if err != nil {
		return v, incomplete("owned NFS volume check failed; no volume created")
	}
	if s.State.Running {
		if !running(s) {
			return v, incomplete("running state incomplete")
		}
		return v, StartResult{StartUnchanged, "running; actual API/binding check required"}
	}
	if !automaticPolicy(s) {
		return v, StartResult{StartStopped, "current restart policy does not permit failed-start completion"}
	}
	if s.State.Error == "" {
		return v, StartResult{StartStopped, "stopped; no qualifying failed NFS start"}
	}
	if !failedStart(s, v) {
		return v, incomplete("unqualified startup state/diagnostic; no automatic start")
	}
	return v, StartResult{StartEligible, "eligible failed NFS start; reconnect may complete after fresh daemon-side proof"}
}

// ObserveFailedStart never creates probes, writes attempts or starts a node.
func (c *Client) ObserveFailedStart(s Snapshot, b config.Connection, a config.NodeAttachment, store config.Store) StartResult {
	_, result := c.observeStart(s, b, a, store)
	if result.State != StartEligible {
		return result
	}
	r, err := readAttempt(store, a)
	if err != nil && !os.IsNotExist(err) {
		return incomplete("invalid attempt record; inspect private state before retry")
	}
	if err == nil && r == attemptFor(s, a) {
		return incomplete("attempt consumed; confirmed reconnect can retry; restart=no vetoes completion")
	}
	return result
}

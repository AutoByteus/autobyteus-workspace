package docker

import (
	"errors"
	"os"
	"reflect"
	"sort"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

func sameStartConfiguration(before, after Snapshot) bool {
	before.State.Running = after.State.Running // running transitions are verified separately
	// Docker may reorder the inspect Mounts projection across start; compare its
	// exact entries without treating order as configuration (API003 observation).
	before.Mounts = append(before.Mounts[:0:0], before.Mounts...)
	after.Mounts = append(after.Mounts[:0:0], after.Mounts...)
	sort.Slice(before.Mounts, func(i, j int) bool { return before.Mounts[i].Destination < before.Mounts[j].Destination })
	sort.Slice(after.Mounts, func(i, j int) bool { return after.Mounts[i].Destination < after.Mounts[j].Destination })
	return before.Fingerprint() == after.Fingerprint() && reflect.DeepEqual(before.Mounts, after.Mounts)
}
func running(s Snapshot) bool {
	return s.State.Status == "running" && s.State.Running && !s.State.Paused && !s.State.Restarting && !s.State.Dead && !s.State.OOMKilled && s.State.Pid > 0 && s.State.Error == ""
}
func (c *Client) verifyCurrentStart(expected Snapshot, a config.NodeAttachment, state string) StartResult {
	if err := c.VerifyStarted(expected.ID, a.MountRoot, true); err != nil {
		return incomplete("actual API/shared-binding verification failed; no process restart")
	}
	current, err := c.Inspect(expected.ID)
	if err != nil || !running(current) || !sameStartConfiguration(expected, current) || !current.Attached(a) {
		return incomplete("current container changed or not running after verification")
	}
	return StartResult{state, "actual API/shared binding ready"}
}

// CompleteFailedStart is called under the existing administrative lock, only
// after storage and the host mount have been proved. It never recreates a node.
// retryConsumed is granted only by a confirmed public reconnect, never a tick.
func (c *Client) CompleteFailedStart(selected Snapshot, b config.Connection, a config.NodeAttachment, store config.Store, retryConsumed bool) StartResult {
	current, err := c.Inspect(selected.ID)
	if err != nil || current.ID != selected.ID {
		return incomplete("selected immutable container unavailable")
	}
	volume, result := c.observeStart(current, b, a, store)
	if result.State == StartUnchanged {
		return c.verifyCurrentStart(current, a, StartUnchanged)
	}
	if result.State != StartEligible {
		return result
	}
	attempt := attemptFor(current, a)
	prior, err := readAttempt(store, a)
	if err != nil && !os.IsNotExist(err) {
		return incomplete("invalid attempt record; inspect private state before retry")
	}
	if err == nil && prior == attempt && !retryConsumed {
		return incomplete("attempt consumed; confirmed reconnect can retry; restart=no vetoes completion")
	}
	if err = c.Probe(current, a, store); err != nil {
		return incomplete("fresh current-image daemon-side UUID/access probe incomplete; exact probe receipt retained if needed")
	}
	if err = c.CheckDaemon(a); err != nil {
		return incomplete("daemon changed after probe")
	}
	after, err := c.Inspect(current.ID)
	if err != nil || !sameStartConfiguration(current, after) || !after.Attached(a) {
		return incomplete("selected configuration changed after probe")
	}
	checked, err := c.inspectVolume(b, a)
	if err != nil || !reflect.DeepEqual(volume, checked) {
		return incomplete("owned NFS volume changed after probe")
	}
	if running(after) {
		return c.verifyCurrentStart(after, a, StartUnchanged)
	}
	if after.State != current.State || !failedStart(after, checked) {
		return incomplete("startup state or policy changed after probe")
	}
	// Atomic 0600 write-ahead consumption survives ambiguous Start and service death.
	// Diagnostic text/policy are deliberately absent from the incarnation key.
	if err = store.Write(attemptName(a.Node), attempt); err != nil {
		return incomplete("cannot persist start attempt; node untouched")
	}
	if err = c.Start(current.ID); err != nil {
		var api *APIError
		if !errors.As(err, &api) || api.Status != 304 {
			return incomplete("Start response incomplete; attempt consumed, inspect node before confirmed reconnect")
		}
		// Docker's already-running response is not itself success.
	}
	after, err = c.Inspect(current.ID)
	if err != nil || !running(after) || !sameStartConfiguration(current, after) || !after.Attached(a) {
		return incomplete("Start not verified running; attempt consumed")
	}
	return c.verifyCurrentStart(after, a, StartRecovered)
}

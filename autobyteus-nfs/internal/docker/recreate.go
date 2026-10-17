package docker

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

type Receipt struct {
	OperationID         string                `json:"operationId"`
	Old                 Snapshot              `json:"old"`
	Attachment          config.NodeAttachment `json:"attachment"`
	Replacement         string                `json:"replacement,omitempty"`
	RetainedName        string                `json:"retainedName"`
	Disconnected        []string              `json:"disconnected"`
	MayHaveAcceptedWork bool                  `json:"mayHaveAcceptedWork"`
	Complete            bool                  `json:"complete"`
	Detach              bool                  `json:"detach"`
}
type ReceiptWriter func(Receipt) error

func ReceiptFile(store config.Store, node string) ReceiptWriter {
	return func(r Receipt) error {
		if !config.ValidNode(node) {
			return errors.New("invalid node receipt name")
		}
		if err := store.Check(); err != nil {
			return err
		}
		b, err := json.MarshalIndent(r, "", "  ")
		if err != nil {
			return err
		}
		if len(b) > 8<<20 {
			return errors.New("node receipt exceeds size bound")
		}
		return config.AtomicFile(filepath.Join(store.Directory, "node-"+node+".json"), append(b, '\n'), 0600)
	}
}

// Recreate must be called only after operator drain consent and a successful fresh probe.
// The write-ahead may-accept-work boundary is before Start, including an ambiguous Start error.
func (c *Client) Recreate(expected Snapshot, a config.NodeAttachment, detach bool, save ReceiptWriter, verify func(string) error) error {
	if err := c.CheckDaemon(a); err != nil {
		return err
	}
	current, err := c.Inspect(expected.ID)
	if err != nil {
		return err
	}
	if current.Fingerprint() != expected.Fingerprint() {
		return errors.New("selected node configuration/running state changed after consent")
	}
	payload, err := current.Replacement(a, detach)
	if err != nil {
		return err
	}
	suffix, err := config.NewID()
	if err != nil {
		return err
	}
	r := Receipt{OperationID: suffix, Old: current, Attachment: a, RetainedName: strings.TrimPrefix(current.Name, "/") + "-nfs-retained-" + suffix, Detach: detach}
	payload["Labels"].(map[string]any)["com.autobyteus.nfs.recreation"] = suffix
	if err = save(r); err != nil {
		return err
	}
	fail := func(cause error) error {
		if r.MayHaveAcceptedWork {
			return fmt.Errorf("%w; replacement may have accepted work; retained receipt and old container, new drain required (no data rollback)", cause)
		}
		if rollbackErr := c.rollback(r, save); rollbackErr != nil {
			return fmt.Errorf("%w; rollback incomplete: %v", cause, rollbackErr)
		}
		return cause
	}
	if current.State.Running {
		if err = c.Stop(current.ID); err != nil {
			return err
		}
	}
	if err = c.Rename(current.ID, r.RetainedName); err != nil {
		return fail(err)
	}
	for network := range current.NetworkSettings.Networks {
		// Record intent before disconnect; rollback reconnects idempotently by inspection.
		r.Disconnected = append(r.Disconnected, network)
		if err = save(r); err != nil {
			return fail(err)
		}
		if err = c.Call("POST", "/networks/"+url.PathEscape(network)+"/disconnect", Object{"Container": current.ID, "Force": false}, nil); err != nil {
			return fail(err)
		}
	}
	r.Replacement, err = c.Create(strings.TrimPrefix(current.Name, "/"), payload)
	if err != nil {
		if e := c.findReplacement(&r); e != nil {
			return fmt.Errorf("create incomplete; exact receipt retained: %w", e)
		}
		if e := save(r); e != nil {
			return e
		}
		return fail(err)
	}
	if err = save(r); err != nil {
		return fail(err)
	}
	if current.State.Running {
		r.MayHaveAcceptedWork = true
		if err = save(r); err != nil {
			r.MayHaveAcceptedWork = false
			return fail(err)
		}
		if err = c.Start(r.Replacement); err != nil {
			return fail(err)
		}
		if err = verify(r.Replacement); err != nil {
			return fail(err)
		}
	}
	// A stopped node remains stopped; qualification came from the fresh image probe.
	if err = c.Remove(current.ID); err != nil {
		return fail(err)
	}
	r.Complete = true
	return save(r)
}
func (c *Client) rollback(r Receipt, save ReceiptWriter) error {
	if r.MayHaveAcceptedWork {
		return errors.New("rollback requires new explicit drain after possible accepted work")
	}
	if r.Replacement != "" {
		current, err := c.Inspect(r.Replacement)
		if err != nil && !IsMissing(err) {
			return err
		}
		if err == nil {
			if current.State.Running {
				return errors.New("unexpected running replacement, refusing automatic rollback")
			}
			if err = c.Remove(r.Replacement); err != nil {
				return err
			}
		}
	}
	old, err := c.Inspect(r.Old.ID)
	if err != nil {
		return err
	}
	if old.Name != r.Old.Name {
		if err = c.Rename(r.Old.ID, strings.TrimPrefix(r.Old.Name, "/")); err != nil {
			return err
		}
	}
	for _, network := range r.Disconnected {
		if _, ok := old.NetworkSettings.Networks[network]; !ok {
			if err = c.Call("POST", "/networks/"+url.PathEscape(network)+"/connect", Object{"Container": r.Old.ID, "EndpointConfig": networkConfig(r.Old)[network]}, nil); err != nil {
				return err
			}
		}
	}
	if r.Old.State.Running && !old.State.Running {
		if err = c.Start(r.Old.ID); err != nil {
			return err
		}
	}
	r.Replacement = ""
	r.Complete = true
	r.Disconnected = nil
	return save(r)
}

// A receipt is private because the preserved Docker Config can contain credentials.
func ReadReceipt(store config.Store, node string) (Receipt, error) {
	var r Receipt
	if !config.ValidNode(node) {
		return r, errors.New("invalid node")
	}
	if err := store.Check(); err != nil {
		return r, err
	}
	p := filepath.Join(store.Directory, "node-"+node+".json")
	info, err := os.Lstat(p)
	if err != nil {
		return r, err
	}
	if !info.Mode().IsRegular() || info.Mode().Perm() != 0600 || info.Size() > 8<<20 {
		return r, errors.New("unsafe Docker receipt")
	}
	b, err := os.ReadFile(p)
	if err != nil {
		return r, err
	}
	err = json.Unmarshal(b, &r)
	return r, err
}

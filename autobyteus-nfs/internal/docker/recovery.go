package docker

import (
	"errors"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"strings"
)

// Recover requires a new explicit drain; it is never used by the background service.
func (c *Client) Recover(r Receipt, save ReceiptWriter) error {
	if err := c.CheckDaemon(r.Attachment); err != nil {
		return err
	}
	if r.Replacement == "" {
		if err := c.findReplacement(&r); err != nil {
			return err
		}
		if err := save(r); err != nil {
			return err
		}
	}
	old, err := c.Inspect(r.Old.ID)
	if IsMissing(err) && r.Replacement != "" {
		current, e := c.Inspect(r.Replacement)
		if e != nil {
			return e
		}
		if current.Image != r.Old.Image || current.Node() != r.Old.Node() || stringValue(labels(current), "com.autobyteus.nfs.recreation") != r.OperationID {
			return errors.New("replacement identity changed; refusing recovery")
		}
		if !r.Detach && !current.Attached(r.Attachment) {
			return errors.New("replacement no longer has expected attachment")
		}
		if current.State.Running {
			if e = c.VerifyStarted(current.ID, r.Attachment.MountRoot, !r.Detach); e != nil {
				return e
			}
		}
		r.Complete = true
		return save(r)
	}
	if err != nil {
		return err
	}
	if old.Image != r.Old.Image || old.Node() != r.Old.Node() {
		return errors.New("retained original identity changed")
	}
	if r.Replacement != "" {
		replacement, e := c.Inspect(r.Replacement)
		if e != nil && !IsMissing(e) {
			return e
		}
		if e == nil {
			if replacement.Image != r.Old.Image || replacement.Node() != r.Old.Node() || stringValue(labels(replacement), "com.autobyteus.nfs.recreation") != r.OperationID {
				return errors.New("replacement identity changed")
			}
			if replacement.State.Running {
				if e = c.Stop(replacement.ID); e != nil {
					return e
				}
			}
		}
	}
	r.MayHaveAcceptedWork = false
	if err = save(r); err != nil {
		return err
	}
	return c.rollback(r, save)
}

func (c *Client) findReplacement(r *Receipt) error {
	if !config.ValidID(r.OperationID) {
		return errors.New("invalid recreation operation identity")
	}
	s, err := c.Inspect(strings.TrimPrefix(r.Old.Name, "/"))
	if IsMissing(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if s.ID == r.Old.ID {
		return nil
	}
	if stringValue(labels(s), "com.autobyteus.nfs.recreation") != r.OperationID || s.Image != r.Old.Image || s.Node() != r.Old.Node() {
		return errors.New("original name is occupied by an unrelated container; no resource deleted")
	}
	r.Replacement = s.ID
	return nil
}

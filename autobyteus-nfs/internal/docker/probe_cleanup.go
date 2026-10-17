package docker

import (
	"errors"
	"fmt"
	"os"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

type ProbeReceipt struct {
	Container string `json:"container"`
	Token     string `json:"token"`
}

func (c *Client) removeProbe(r ProbeReceipt) error {
	s, err := c.Inspect(r.Container)
	if IsMissing(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if stringValue(labels(s), "com.autobyteus.nfs.probe") != r.Token {
		return errors.New("probe ownership changed; refusing cleanup")
	}
	if s.State.Running {
		return errors.New("probe is still running/checking; wait for storage, no second probe started")
	}
	// This exact disposable probe owns its image-created anonymous volumes. Named
	// NFS storage is not removed by v=true, and no real node takes this path.
	return c.Call("DELETE", "/containers/"+r.Container+"?v=true&force=false", nil, nil)
}
func (c *Client) ReapProbe(store config.Store, node string) error {
	if !config.ValidNode(node) {
		return errors.New("invalid probe node")
	}
	var r ProbeReceipt
	name := "probe-" + node + ".json"
	if err := store.Read(name, &r); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	if !config.ValidID(r.Token) || r.Container == "" {
		return errors.New("invalid exact probe receipt")
	}
	if err := c.removeProbe(r); err != nil {
		return fmt.Errorf("previous probe retained: %w", err)
	}
	return store.Remove(name)
}

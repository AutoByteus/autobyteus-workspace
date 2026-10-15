package docker

import (
	"errors"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

// The same socket path can point at a different daemon after a Docker context reset.
func (c *Client) CheckDaemon(a config.NodeAttachment) error {
	if err := a.Validate(); err != nil {
		return err
	}
	var info struct{ ID string }
	if err := c.Call("GET", "/info", nil, &info); err != nil {
		return err
	}
	if info.ID != a.DaemonID {
		return errors.New("selected Docker daemon identity changed; no nodes modified")
	}
	return nil
}

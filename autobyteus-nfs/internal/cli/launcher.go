package cli

import (
	"errors"
	"fmt"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
	"os"
	"path/filepath"
)

func launcherAttachment(node string) error {
	if !config.ValidNode(node) {
		return errors.New("--nodes must identify exactly one managed node")
	}
	public := config.Store{Directory: filepath.Join(config.PublicDirectory, "nodes"), Owner: 0, Public: true}
	var a config.NodeAttachment
	if err := public.Read(node+".json", &a); err != nil {
		return err
	}
	if err := a.Validate(); err != nil {
		return err
	}
	if a.Node != node {
		return errors.New("invalid launcher attachment node")
	}
	fmt.Fprintln(os.Stdout, a.StorageID)
	fmt.Fprintln(os.Stdout, a.MountRoot)
	fmt.Fprintln(os.Stdout, a.Volume)
	fmt.Fprintln(os.Stdout, a.DescriptorDirectory)

	fmt.Fprintln(os.Stdout, a.DaemonID)
	var c config.Connection
	if err := (config.Store{Directory: config.PublicDirectory, Owner: 0, Public: true}).Read("attachment.json", &c); err != nil {
		return err
	}
	if err := c.Validate(); err != nil {
		return err
	}
	if c.StorageID != a.StorageID || c.MountRoot != a.MountRoot {
		return errors.New("node and host attachment differ")
	}
	fmt.Fprintln(os.Stdout, ":"+c.Export)
	fmt.Fprintln(os.Stdout, "addr="+c.Endpoint+",rw,"+platform.MountOptions(c.Protocol, true)+",nosharecache")
	return nil
}

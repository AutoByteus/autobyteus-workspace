package docker

import (
	"errors"
	"net/url"
	"reflect"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

type nfsVolume struct {
	Driver, Mountpoint string
	Options, Labels    map[string]string
}

func volumeOptions(binding config.Connection) map[string]string {
	return map[string]string{"type": "nfs", "device": ":" + binding.Export, "o": "addr=" + binding.Endpoint + ",rw," + platform.MountOptions(binding.Protocol, true) + ",nosharecache"}
}

// inspectVolume is read-only. Recovery must never create or replace a volume.
func (c *Client) inspectVolume(binding config.Connection, a config.NodeAttachment) (nfsVolume, error) {
	var actual nfsVolume
	if err := binding.Validate(); err != nil {
		return actual, err
	}
	if err := a.Validate(); err != nil {
		return actual, err
	}
	if a.StorageID != binding.StorageID || a.MountRoot != binding.MountRoot {
		return actual, errors.New("node reference differs from connection")
	}
	if err := c.Call("GET", "/volumes/"+url.PathEscape(a.Volume), nil, &actual); err != nil {
		return actual, err
	}
	if actual.Driver != "local" || !reflect.DeepEqual(actual.Options, volumeOptions(binding)) || actual.Labels[storageLabel] != a.StorageID {
		return actual, errors.New("existing NFS volume has different owner/driver/options; will not replace")
	}
	return actual, nil
}
func (c *Client) EnsureVolume(binding config.Connection, a config.NodeAttachment) error {
	_, err := c.inspectVolume(binding, a)
	if IsMissing(err) {
		return c.Call("POST", "/volumes/create", Object{"Name": a.Volume, "Driver": "local", "DriverOpts": volumeOptions(binding), "Labels": map[string]string{storageLabel: a.StorageID}}, nil)
	}
	return err
}

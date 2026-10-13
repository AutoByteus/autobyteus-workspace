package docker

import (
	"errors"
	"fmt"
	"net/url"
	"reflect"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

func NodeAttachment(c config.Connection, node string) config.NodeAttachment {
	return config.NodeAttachment{StorageID: c.StorageID, Node: node, MountRoot: c.MountRoot, Volume: "autobyteus-nfs-" + c.StorageID, DescriptorDirectory: config.PublicDirectory}
}
func (c *Client) EnsureVolume(binding config.Connection, a config.NodeAttachment) error {
	options := map[string]string{"type": "nfs", "device": ":" + binding.Export, "o": "addr=" + binding.Endpoint + ",rw," + platform.MountOptions(binding.Protocol, true) + ",nosharecache"}
	var actual struct {
		Driver          string
		Options, Labels map[string]string
	}
	err := c.Call("GET", "/volumes/"+url.PathEscape(a.Volume), nil, &actual)
	if IsMissing(err) {
		return c.Call("POST", "/volumes/create", Object{"Name": a.Volume, "Driver": "local", "DriverOpts": options, "Labels": map[string]string{storageLabel: a.StorageID}}, nil)
	}
	if err != nil {
		return err
	}
	if actual.Driver != "local" || !reflect.DeepEqual(actual.Options, options) || actual.Labels[storageLabel] != a.StorageID {
		return errors.New("existing NFS volume has different owner/driver/options; will not replace")
	}
	return nil
}

// QualifyImage refuses customized startup/UID before stopping an existing node.
func (c *Client) QualifyImage(s Snapshot) error {
	var image struct{ Config Object }
	if err := c.Call("GET", "/images/"+url.PathEscape(s.Image)+"/json", nil, &image); err != nil {
		return err
	}
	for _, field := range []string{"Entrypoint", "Cmd", "User"} {
		if !reflect.DeepEqual(s.Config[field], image.Config[field]) {
			return fmt.Errorf("custom %s not supported for automatic shared attachment", field)
		}
	}
	user := stringValue(s.Config, "User")
	if user != "" && user != "root" && user != "0" {
		return errors.New("this launcher integration requires its qualified root server execution identity")
	}
	return nil
}

// The fresh probe has no user data/auth mounts and no published ports. It checks
// the current image's actual supervisor UID and production binding module before replacement.
const probeScript = `const fs=await import('node:fs/promises');
const conf=await fs.readFile('/etc/supervisor/conf.d/supervisor-autobyteus-server.conf','utf8');
if(!/^user=root$/m.test(conf)||process.getuid()!==0)throw Error('unqualified server UID');
const {checkSharedWorkspaceForRun}=await import('/app/autobyteus-server-ts/dist/workspaces/shared-workspace-binding.js');
const root=process.argv[1];const b=await checkSharedWorkspaceForRun(root);if(!b)throw Error('shared binding unavailable');
const owner=await fs.stat(root+'/.autobyteus-nfs/health');if(!owner.isDirectory()||owner.uid===0||owner.gid===0)throw Error('nonroot source owner required');
const p=root+'/.autobyteus-nfs/health/'+(await import('node:crypto')).randomUUID();
const data=Buffer.from('AutoByteus NFS node probe');let made=false;
try{const f=await fs.open(p,'wx',0o600);made=true;try{const actual=await f.stat();if(actual.uid!==owner.uid||actual.gid!==owner.gid)throw Error('root client did not map to selected nonroot owner');await f.writeFile(data);await f.sync()}finally{await f.close()};if(!(await fs.readFile(p)).equals(data))throw Error('probe byte mismatch')}finally{if(made)await fs.unlink(p)}
`

func (c *Client) Probe(s Snapshot, a config.NodeAttachment, store config.Store) error {
	if err := c.ReapProbe(store, s.Node()); err != nil {
		return err
	}
	if err := c.QualifyImage(s); err != nil {
		return err
	}
	id, err := config.NewID()
	if err != nil {
		return err
	}
	payload := Object{"Image": s.Image, "Entrypoint": []string{"node"}, "Cmd": []string{"--input-type=module", "-e", probeScript, a.MountRoot}, "User": "0", "Labels": Object{"com.autobyteus.nfs.probe": id}, "HostConfig": Object{"NetworkMode": "none", "Mounts": AttachmentMounts(a)}}
	name := "autobyteus-nfs-probe-" + id
	receipt := ProbeReceipt{Container: name, Token: id}
	if err = store.Write("probe-"+s.Node()+".json", receipt); err != nil {
		return err
	}
	container, err := c.Create(name, payload)
	if err != nil {
		return fmt.Errorf("probe create incomplete; exact name/token receipt retained: %w", err)
	}
	receipt.Container = container
	if err = store.Write("probe-"+s.Node()+".json", receipt); err != nil {
		return err
	}
	if err = c.Start(container); err != nil {
		return fmt.Errorf("probe start incomplete; exact receipt retained: %w", err)
	}
	var result struct {
		StatusCode int
		Error      *struct{ Message string }
	}
	err = c.Call("POST", "/containers/"+container+"/wait?condition=not-running", nil, &result)
	if err != nil {
		return fmt.Errorf("probe %s may still be active; retained, no replacement: %w", container, err)
	}
	if err = c.removeProbe(receipt); err != nil {
		return err
	}
	if err = store.Remove("probe-" + s.Node() + ".json"); err != nil {
		return err
	}
	if result.StatusCode != 0 {
		return fmt.Errorf("fresh node admission/UID/read-write probe failed (exit %d); original node untouched", result.StatusCode)
	}
	return nil
}

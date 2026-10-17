package setup

// Local Unix HTTP fixture only: selected-set orchestration and host-proof refusal.
// No Docker daemon, mounts or administrator operations are used.
import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
)

func TestReconnectSelectedSetIsBoundedAndIndependent(t *testing.T) {
	dir, err := os.MkdirTemp("/tmp", "nfs-selected-")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(dir)
	listener, err := net.Listen("unix", filepath.Join(dir, "docker.sock"))
	if err != nil {
		t.Fatal(err)
	}
	id := "5544dadc-86b0-43ba-9799-74728b442227"
	b := config.Connection{StorageID: id, Endpoint: "192.168.64.7", Export: "/autobyteus/" + id, Protocol: "4.1", MountRoot: config.DefaultMountRoot}
	a := config.Attachment{Connection: b, InstallationID: id, UserUID: 1000, UserGID: 109, Nodes: []string{"bad-ref", "normal-stop", "policy-no", "missing"}}
	nodes := map[string]string{strings.Repeat("a", 64): "normal-stop", strings.Repeat("b", 64): "policy-no", strings.Repeat("c", 64): "unselected"}
	var mu sync.Mutex
	discover, infos, mutations := 0, 0, 0
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		if r.Method != "GET" {
			mutations++
			http.Error(w, "mutation forbidden", 500)
			return
		}
		p := strings.TrimPrefix(r.URL.Path, "/v1.47")
		var value any
		switch {
		case p == "/containers/json":
			discover++
			value = []docker.Object{{"Id": strings.Repeat("a", 64)}, {"Id": strings.Repeat("b", 64)}, {"Id": strings.Repeat("c", 64)}}
		case p == "/info":
			infos++
			value = docker.Object{"ID": "fixture-daemon"}
		case p == "/volumes/autobyteus-nfs-"+id:
			value = docker.Object{"Driver": "local", "Labels": docker.Object{"com.autobyteus.nfs.storageId": id}, "Options": docker.Object{"type": "nfs", "device": ":" + b.Export, "o": "addr=192.168.64.7,rw,hard,tcp,vers=4.1,actimeo=1,timeo=50,retrans=2,nosharecache"}}
		case strings.HasPrefix(p, "/containers/") && strings.HasSuffix(p, "/json"):
			cid := strings.TrimSuffix(strings.TrimPrefix(p, "/containers/"), "/json")
			node := nodes[cid]
			if node == "" {
				http.NotFound(w, r)
				return
			}
			policy := "unless-stopped"
			if node == "policy-no" {
				policy = "no"
			}
			value = docker.Object{"Id": cid, "Name": "/" + node, "Image": "sha256:" + strings.Repeat("d", 64), "Config": docker.Object{"Labels": docker.Object{"com.autobyteus.launcher": "server-docker", "com.autobyteus.nodeName": node, "com.autobyteus.nfs.storageId": id}}, "HostConfig": docker.Object{"NetworkMode": "bridge", "RestartPolicy": docker.Object{"Name": policy}}, "NetworkSettings": docker.Object{"Networks": docker.Object{"bridge": docker.Object{}}}, "State": docker.Object{"Status": "exited"}, "Mounts": []docker.Object{{"Type": "volume", "Name": "autobyteus-nfs-" + id, "Destination": b.MountRoot, "RW": true}, {"Type": "bind", "Source": config.PublicDirectory, "Destination": config.PublicDirectory, "RW": false}}}
		default:
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(value)
	})}
	go server.Serve(listener)
	defer server.Close()
	client, err := docker.New(filepath.Join(dir, "docker.sock"))
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	private := filepath.Join(dir, "private")
	public := filepath.Join(dir, "public")
	_ = os.Mkdir(private, 0700)
	_ = os.Mkdir(public, 0755)
	_ = os.Mkdir(filepath.Join(public, "nodes"), 0755)
	s := Service{Store: config.Store{Directory: private, Owner: uint32(os.Getuid())}, Public: config.Store{Directory: public, Owner: uint32(os.Getuid()), Public: true}, Docker: client}
	refs := config.Store{Directory: filepath.Join(public, "nodes"), Owner: uint32(os.Getuid()), Public: true}
	for _, node := range a.Nodes {
		ref := docker.NodeAttachment(b, node)
		ref.DaemonID = "fixture-daemon"
		if node == "bad-ref" {
			ref.StorageID = "foreign"
		}
		if e := refs.Write(node+".json", ref); e != nil {
			t.Fatal(e)
		}
	}
	err = s.reconnectNodes(a, false)
	if err == nil || !strings.Contains(err.Error(), "bad-ref") || !strings.Contains(err.Error(), "missing") {
		t.Fatal(err)
	}
	if strings.Contains(err.Error(), "normal-stop") || strings.Contains(err.Error(), "policy-no") {
		t.Fatal("stopped controls were treated as eligible", err)
	}
	mu.Lock()
	if discover != 1 || infos != 2 || mutations != 0 {
		t.Fatal(discover, infos, mutations)
	}
	mu.Unlock()
	files, _ := os.ReadDir(private)
	if len(files) != 0 {
		t.Fatal("stopped controls wrote state", files)
	}
	// Host mount failure cannot reach Docker discovery/start.
	if e := s.Store.Write("attachment.json", a); e != nil {
		t.Fatal(e)
	}
	if e := s.Public.Write("attachment.json", b); e != nil {
		t.Fatal(e)
	}
	s.Runner = unavailableMount{}
	if e := s.Reconnect(false); e == nil {
		t.Fatal("host failure ignored")
	}
	mu.Lock()
	defer mu.Unlock()
	if discover != 1 || mutations != 0 {
		t.Fatal("Docker ran before host proof")
	}
}

type unavailableMount struct{}

func (unavailableMount) Run(_ string, _ ...string) ([]byte, error) {
	return nil, errors.New("host mount unavailable")
}

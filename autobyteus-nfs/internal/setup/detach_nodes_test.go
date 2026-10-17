package setup

import (
	"encoding/json"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// A fake Unix-socket Docker transport, not a real daemon, container or NFS mount.
func TestDetachSelectedNodePublicationFailureAndRetry(t *testing.T) {
	for _, scenario := range []string{"before-publication", "after-detach-before-unpublish", "different-daemon"} {
		t.Run(scenario, func(t *testing.T) {
			root, err := os.MkdirTemp("/tmp", "nfs-detach-unit-")
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { os.RemoveAll(root) })
			state := filepath.Join(root, "state")
			public := filepath.Join(root, "public")
			os.Mkdir(state, 0700)
			os.Mkdir(public, 0755)
			owner := uint32(os.Getuid())
			s := Service{Store: config.Store{Directory: state, Owner: owner}, Public: config.Store{Directory: public, Owner: owner, Public: true}}
			a := config.Attachment{Connection: config.Connection{StorageID: "5544dadc-86b0-43ba-9799-74728b442227", MountRoot: config.DefaultMountRoot}, Nodes: []string{"node-one"}}
			ref := docker.NodeAttachment(a.Connection, "node-one")
			ref.DaemonID = "fixture-daemon"
			id := strings.Repeat("a", 64)
			replacementID := strings.Repeat("c", 64)
			object := docker.Object{"Id": id, "Name": "/node-one", "Image": "sha256:" + strings.Repeat("b", 64), "State": docker.Object{"Running": false}, "Config": docker.Object{"Labels": docker.Object{"com.autobyteus.launcher": "server-docker", "com.autobyteus.nodeName": "node-one", "com.autobyteus.nfs.storageId": a.StorageID}}, "HostConfig": docker.Object{"NetworkMode": "bridge", "Mounts": docker.AttachmentMounts(ref)}, "NetworkSettings": docker.Object{"Networks": docker.Object{"bridge": docker.Object{}}}, "Mounts": []any{docker.Object{"Type": "volume", "Name": ref.Volume, "Destination": ref.MountRoot, "RW": true}, docker.Object{"Type": "bind", "Source": ref.DescriptorDirectory, "Destination": config.PublicDirectory, "RW": false}}}
			receipt := docker.Receipt{Complete: true, Replacement: id, Attachment: ref}
			if scenario == "after-detach-before-unpublish" {
				receipt.Detach = true
				object["Mounts"] = []any{}
				object["HostConfig"].(docker.Object)["Mounts"] = []any{}
				delete(object["Config"].(docker.Object)["Labels"].(docker.Object), "com.autobyteus.nfs.storageId")
			}
			if err = docker.ReceiptFile(s.Store, "node-one")(receipt); err != nil {
				t.Fatal(err)
			}
			refs := config.Store{Directory: filepath.Join(public, "nodes"), Owner: owner, Public: true}
			if scenario != "before-publication" {
				os.Mkdir(refs.Directory, 0755)
				if err = refs.Write("node-one.json", ref); err != nil {
					t.Fatal(err)
				}
			}
			mutations := []string{}
			socket := filepath.Join(root, "d.sock")
			listener, err := net.Listen("unix", socket)
			if err != nil {
				t.Fatal(err)
			}
			server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				path := strings.TrimPrefix(r.URL.Path, "/v1.47")
				respond := func(v any) { w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(v) }
				if r.Method != "GET" {
					mutations = append(mutations, r.Method+" "+path)
				}
				switch {
				case path == "/info":
					daemon := "fixture-daemon"
					if scenario == "different-daemon" {
						daemon = "other"
					}
					respond(docker.Object{"ID": daemon})
				case path == "/containers/json":
					respond([]any{docker.Object{"Id": id}})
				case path == "/containers/"+id+"/json":
					respond(object)
				case path == "/containers/create":
					respond(docker.Object{"Id": replacementID})
				case r.Method == "POST" && strings.HasSuffix(path, "/rename"):
					w.WriteHeader(204)
				case path == "/networks/bridge/disconnect":
					w.WriteHeader(204)
				case r.Method == "DELETE" && path == "/containers/"+id:
					if r.URL.Query().Get("v") != "false" || r.URL.Query().Get("force") != "false" {
						t.Error("destructive deletion")
					}
					w.WriteHeader(204)
				default:
					t.Error("unexpected Docker call", r.Method, path)
					w.WriteHeader(500)
				}
			})}
			go server.Serve(listener)
			t.Cleanup(func() { server.Close() })
			s.Docker, err = docker.New(socket)
			if err != nil {
				t.Fatal(err)
			}
			defer s.Docker.Close()
			err = s.detachNodes(a)
			if scenario == "different-daemon" {
				if err == nil || len(mutations) != 0 {
					t.Fatal("changed wrong daemon", err, mutations)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if scenario == "before-publication" && len(mutations) == 0 {
				t.Fatal("left accepted but unpublished attachment behind")
			}
			if scenario == "after-detach-before-unpublish" && len(mutations) != 0 {
				t.Fatal("recreated already-detached node", mutations)
			}
			if _, err = os.Stat(filepath.Join(refs.Directory, "node-one.json")); !os.IsNotExist(err) {
				t.Fatal("reference not removed")
			}
		})
	}
}

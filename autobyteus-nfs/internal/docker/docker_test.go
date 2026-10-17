package docker

import (
	"encoding/json"
	"io"
	"net/http"
	"reflect"
	"strings"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

func fixture() Snapshot {
	var s Snapshot
	_ = json.Unmarshal([]byte(`{"Id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","Name":"/node-one","Image":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","Config":{"Image":"repo:tag","Labels":{"com.autobyteus.launcher":"server-docker","com.autobyteus.nodeName":"node-one"},"Env":["SECRET=preserved-not-logged"],"Hostname":"old-host","Cmd":["start"],"User":""},"HostConfig":{"NetworkMode":"bridge","RestartPolicy":{"Name":"unless-stopped"},"PortBindings":{"8000/tcp":[{"HostIp":"127.0.0.1","HostPort":"8123"}]},"Binds":["node-private:/root"],"Mounts":[{"Type":"bind","Source":"/local/workspace","Target":"/home/autobyteus/workspace"}]},"Mounts":[{"Type":"volume","Name":"node-private","Source":"/docker/volumes/node-private","Destination":"/root","RW":true},{"Type":"volume","Name":"image-anonymous-preserved","Source":"/docker/volumes/other","Destination":"/other","RW":true},{"Type":"bind","Source":"/local/workspace","Destination":"/home/autobyteus/workspace","RW":true}],"NetworkSettings":{"Networks":{"bridge":{"Aliases":["node-one","aaaaaaaaaaaa","peer-visible"],"IPAddress":"172.17.0.8","IPAMConfig":{"IPv4Address":"172.17.0.8"}}}},"State":{"Running":true}}`), &s)
	return s
}
func attachment() config.NodeAttachment {
	return config.NodeAttachment{DaemonID: "fixture-daemon", StorageID: "5544dadc-86b0-43ba-9799-74728b442227", Node: "node-one", MountRoot: config.DefaultMountRoot, Volume: "autobyteus-nfs-5544dadc-86b0-43ba-9799-74728b442227", DescriptorDirectory: config.PublicDirectory}
}
func TestReplacementPreservesSelectedSettingsAndPrivateVolumes(t *testing.T) {
	s := fixture()
	before := s.Fingerprint()
	p, err := s.Replacement(attachment(), false)
	if err != nil {
		t.Fatal(err)
	}
	if p["Image"] != s.Image || !reflect.DeepEqual(p["Env"], s.Config["Env"]) {
		t.Fatal("changed image or private env")
	}
	h := p["HostConfig"].(map[string]any)
	for _, k := range []string{"PortBindings", "RestartPolicy", "Binds"} {
		if !reflect.DeepEqual(h[k], s.HostConfig[k]) {
			t.Fatal("changed", k)
		}
	}
	mounts := h["Mounts"].([]any)
	if len(mounts) != 4 {
		t.Fatalf("lost original/anonymous/NFS/descriptor mounts: %#v", mounts)
	}
	anonymous := mounts[1].(map[string]any)
	if anonymous["Source"] != "image-anonymous-preserved" {
		t.Fatal("lost anonymous private volume")
	}
	network := p["NetworkingConfig"].(map[string]any)["EndpointsConfig"].(map[string]Object)["bridge"]
	if !reflect.DeepEqual(network["Aliases"], []any{"node-one", "peer-visible"}) || network["IPAddress"] != nil || network["IPAMConfig"] == nil {
		t.Fatal(network)
	}
	if s.Fingerprint() != before {
		t.Fatal("mutated snapshot")
	}
}
func TestUnsupportedConfigurationRejectedBeforeStop(t *testing.T) {
	for _, change := range []func(*Snapshot){func(s *Snapshot) { s.HostConfig["AutoRemove"] = true }, func(s *Snapshot) { s.HostConfig["NetworkMode"] = "host" }, func(s *Snapshot) { s.State.Paused = true }, func(s *Snapshot) { s.Config["Labels"] = Object{} }, func(s *Snapshot) { s.HostConfig["VolumesFrom"] = []any{"other"} }} {
		s := fixture()
		change(&s)
		if _, err := s.Replacement(attachment(), false); err == nil {
			t.Fatal("accepted unsupported config")
		}
	}
}

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func response(code int, value any) *http.Response {
	b, _ := json.Marshal(value)
	return &http.Response{StatusCode: code, Body: io.NopCloser(strings.NewReader(string(b))), Header: make(http.Header)}
}
func TestRecreationNeverRollsBackAfterStartMayAcceptWork(t *testing.T) {
	s := fixture()
	a := attachment()
	calls := []string{}
	saved := []Receipt{}
	c := &Client{http: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path == apiPrefix+"/info" {
			return response(200, Object{"ID": "fixture-daemon"}), nil
		}
		calls = append(calls, r.Method+" "+r.URL.Path)
		if r.Method == "GET" {
			return response(200, s), nil
		}
		if strings.HasSuffix(r.URL.Path, "/create") {
			return response(201, Object{"Id": "replacement"}), nil
		}
		if strings.HasSuffix(r.URL.Path, "/start") {
			return response(500, Object{"message": "ambiguous start error"}), nil
		}
		return response(204, nil), nil
	})}}
	err := c.Recreate(s, a, false, func(r Receipt) error { saved = append(saved, r); return nil }, func(string) error { t.Fatal("unexpected verify"); return nil })
	if err == nil || !strings.Contains(err.Error(), "new drain required") {
		t.Fatal(err)
	}
	if !saved[len(saved)-1].MayHaveAcceptedWork {
		t.Fatal("missing write-ahead work boundary")
	}
	for _, call := range calls {
		if strings.HasPrefix(call, "DELETE") {
			t.Fatal("deleted after potentially accepted work", calls)
		}
	}
}
func TestChangedNodeAfterConsentHasNoMutation(t *testing.T) {
	s := fixture()
	changed := fixture()
	changed.Config["Env"] = []any{"changed"}
	c := &Client{http: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path == apiPrefix+"/info" {
			return response(200, Object{"ID": "fixture-daemon"}), nil
		}
		if r.Method != "GET" {
			t.Fatal("mutated changed node")
		}
		return response(200, changed), nil
	})}}
	if err := c.Recreate(s, attachment(), false, func(Receipt) error { t.Fatal("saved mutation receipt"); return nil }, func(string) error { return nil }); err == nil {
		t.Fatal("accepted changed node")
	}
}
func TestPreStartFailureRestoresExactOriginalAndDoesNotDeleteVolumes(t *testing.T) {
	s := fixture()
	saved := []Receipt{}
	calls := []string{}
	renamed := false
	c := &Client{http: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path == apiPrefix+"/info" {
			return response(200, Object{"ID": "fixture-daemon"}), nil
		}
		calls = append(calls, r.Method+" "+r.URL.RequestURI())
		if r.Method == "GET" {
			v := s
			if renamed {
				v.Name = "/retained"
				v.State.Running = false
			}
			return response(200, v), nil
		}
		if strings.HasSuffix(r.URL.Path, "/rename") {
			renamed = true
		}
		if strings.HasSuffix(r.URL.Path, "/create") {
			return response(400, Object{"message": "create failed"}), nil
		}
		return response(204, nil), nil
	})}}
	err := c.Recreate(s, attachment(), false, func(r Receipt) error { saved = append(saved, r); return nil }, func(string) error { return nil })
	if err == nil {
		t.Fatal("unexpected success")
	}
	last := saved[len(saved)-1]
	if !last.Complete || last.MayHaveAcceptedWork || last.Replacement != "" {
		t.Fatal(last)
	}
	if !strings.Contains(strings.Join(calls, "\n"), "name=node-one") || !strings.Contains(strings.Join(calls, "\n"), s.ID+"/start") {
		t.Fatal("original not restored", calls)
	}
}

func TestNestedMountCannotHideSharedBytesAfterPriorAttachment(t *testing.T) {
	s := fixture()
	labels(s)[storageLabel] = attachment().StorageID
	b, _ := json.Marshal(s)
	var object Object
	_ = json.Unmarshal(b, &object)
	mounts := object["Mounts"].([]any)
	mounts = append(mounts, Object{"Type": "bind", "Source": "/local/fallback", "Destination": config.DefaultMountRoot + "/project", "RW": true})
	object["Mounts"] = mounts
	b, _ = json.Marshal(object)
	_ = json.Unmarshal(b, &s)
	if _, err := s.Replacement(attachment(), false); err == nil {
		t.Fatal("accepted nested local fallback mount")
	}
}

func TestEngineOnlyUsesChosenSourceAndNarrowCapabilities(t *testing.T) {
	h := config.HostedFilesystem{InstallationID: "c87ff813-c2ce-4bd5-9208-7f6e3b7d7cf7", StorageID: attachment().StorageID, Source: "/srv/projects", EngineImage: "registry/engine@sha256:" + strings.Repeat("a", 64)}
	payload := EnginePayload(h, "/var/lib/autobyteus-nfs")
	host := payload["HostConfig"].(map[string]any)
	if host["NetworkMode"] != "host" || host["Privileged"] == true || strings.Contains(capabilities(host["CapAdd"]), "SYS_ADMIN") {
		t.Fatal(host)
	}
	if !strings.Contains(capabilities(host["CapAdd"]), "DAC_READ_SEARCH") {
		t.Fatal("VFS file-handle capability absent")
	}
	mounts := host["Mounts"].([]any)
	if len(mounts) != 3 {
		t.Fatal(mounts)
	}
	for _, m := range mounts {
		source := m.(map[string]any)["Source"]
		if source == "/" || source == "/var/run/docker.sock" || source == "/root" {
			t.Fatal("broad/private export")
		}
	}
	b, _ := json.Marshal(payload)
	var configObj Object
	_ = json.Unmarshal(b, &configObj)
	s := Snapshot{Config: configObj, HostConfig: configObj["HostConfig"].(map[string]any)}
	s.HostConfig["RestartPolicy"].(map[string]any)["MaximumRetryCount"] = float64(0)
	// Build actual inspect mount shape, not the create request shape.
	actual := []Object{}
	for _, raw := range mounts {
		m := raw.(map[string]any)
		actual = append(actual, Object{"Type": "bind", "Source": m["Source"], "Destination": m["Target"], "RW": !boolValue(m, "ReadOnly")})
	}
	bytes, _ := json.Marshal(actual)
	_ = json.Unmarshal(bytes, &s.Mounts)
	if err := validateEngine(s, h, "/var/lib/autobyteus-nfs"); err != nil {
		t.Fatal(err)
	}
	s.HostConfig["Privileged"] = true
	if err := validateEngine(s, h, "/var/lib/autobyteus-nfs"); err == nil {
		t.Fatal("accepted changed privilege")
	}
}

func TestChangedDaemonRefusesRecreationBeforeAnyContainerOperation(t *testing.T) {
	c := &Client{http: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != apiPrefix+"/info" || r.Method != "GET" {
			t.Fatal("touched node on wrong daemon")
		}
		return response(200, Object{"ID": "different-daemon"}), nil
	})}}
	if err := c.Recreate(fixture(), attachment(), false, func(Receipt) error { t.Fatal("saved receipt"); return nil }, func(string) error { return nil }); err == nil {
		t.Fatal("accepted wrong daemon")
	}
}

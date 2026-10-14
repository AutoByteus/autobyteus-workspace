package docker

// Implementation-scoped public Docker HTTP-field fixtures, no real daemon/data.
// go test -race ./internal/docker; independent ordinary-reboot proof is separate.
import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

func startFixture() (Snapshot, config.Connection, nfsVolume) {
	s := fixture()
	a := attachment()
	b := config.Connection{StorageID: a.StorageID, Endpoint: "192.168.64.7", Export: "/autobyteus/" + a.StorageID, Protocol: "4.1", MountRoot: a.MountRoot}
	labels(s)[storageLabel] = a.StorageID
	var mounts []struct {
		Type, Name, Source, Destination string
		RW                              bool
	}
	_ = json.Unmarshal([]byte(`[{"Type":"volume","Name":"`+a.Volume+`","Source":"/var/lib/docker/volumes/`+a.Volume+`/_data","Destination":"`+a.MountRoot+`","RW":true},{"Type":"bind","Source":"`+config.PublicDirectory+`","Destination":"`+config.PublicDirectory+`","RW":false}]`), &mounts)
	s.Mounts = append(s.Mounts, mounts...)
	s.State.Running = false
	s.State.Status = "exited"
	s.State.ExitCode = 255
	s.State.StartedAt = "2026-10-14T07:39:24.006217727Z"
	s.State.FinishedAt = "2026-10-14T07:40:09.33546196Z"
	// Literal captured grammar, NOT produced by the matcher under test.
	s.State.Error = "error while mounting volume '/var/lib/docker/volumes/" + a.Volume + "/_data': failed to mount local volume: mount :" + b.Export + ":/var/lib/docker/volumes/" + a.Volume + "/_data, data: addr=192.168.64.7,hard,tcp,vers=4.1,actimeo=1,timeo=50,retrans=2,nosharecache: connection refused"
	v := nfsVolume{Driver: "local", Mountpoint: "/var/lib/docker/volumes/" + a.Volume + "/_data", Options: map[string]string{"type": "nfs", "device": ":" + b.Export, "o": "addr=192.168.64.7,rw,hard,tcp,vers=4.1,actimeo=1,timeo=50,retrans=2,nosharecache"}, Labels: map[string]string{storageLabel: a.StorageID}}
	return s, b, v
}

type startHarness struct {
	t                                *testing.T
	s                                Snapshot
	b                                config.Connection
	v                                nfsVolume
	store                            config.Store
	client                           *Client
	starts, probes, verifies         int
	daemon                           string
	missingVolume                    bool
	probeExit, startCode, verifyExit int
	afterProbe                       func()
	afterVerify                      func()
	token                            string
}

func newStartHarness(t *testing.T) *startHarness {
	s, b, v := startFixture()
	d := t.TempDir()
	_ = os.Chmod(d, 0700)
	h := &startHarness{t: t, s: s, b: b, v: v, store: config.Store{Directory: d, Owner: uint32(os.Getuid())}, daemon: attachment().DaemonID, startCode: 204}
	h.client = &Client{http: &http.Client{Transport: roundTrip(h.roundTrip)}}
	return h
}
func (h *startHarness) roundTrip(r *http.Request) (*http.Response, error) {
	p := strings.TrimPrefix(r.URL.Path, apiPrefix)
	t := h.t
	switch {
	case p == "/info":
		return response(200, Object{"ID": h.daemon}), nil
	case p == "/containers/"+h.s.ID+"/json":
		return response(200, h.s), nil
	case p == "/volumes/"+attachment().Volume:
		if h.missingVolume {
			return response(404, Object{}), nil
		}
		return response(200, h.v), nil
	case p == "/images/"+h.s.Image+"/json":
		return response(200, Object{"Config": h.s.Config}), nil
	case p == "/containers/create":
		h.probes++
		var payload Object
		_ = json.NewDecoder(r.Body).Decode(&payload)
		host := payload["HostConfig"].(map[string]any)
		if payload["Image"] != h.s.Image || host["NetworkMode"] != "none" || len(host["Mounts"].([]any)) != 2 || len(host) != 2 || payload["Env"] != nil {
			t.Fatal("unsafe probe", payload)
		}
		h.token = payload["Labels"].(map[string]any)["com.autobyteus.nfs.probe"].(string)
		return response(201, Object{"Id": "probe-id"}), nil
	case p == "/containers/probe-id/start":
		return response(204, nil), nil
	case p == "/containers/probe-id/wait":
		return response(200, Object{"StatusCode": h.probeExit}), nil
	case p == "/containers/probe-id/json":
		return response(200, Object{"Config": Object{"Labels": Object{"com.autobyteus.nfs.probe": h.token}}}), nil
	case p == "/containers/probe-id" && r.Method == "DELETE":
		if r.URL.RawQuery != "v=true&force=false" {
			t.Fatal("probe cleanup", r.URL)
		}
		if h.afterProbe != nil {
			h.afterProbe()
		}
		return response(204, nil), nil
	case p == "/containers/"+h.s.ID+"/start":
		h.starts++
		var attempt startAttempt
		if e := h.store.Read(attemptName(attachment().Node), &attempt); e != nil || attempt != attemptFor(h.s, attachment()) {
			t.Fatal("missing write-ahead consumption", attempt, e)
		}
		fi, e := os.Stat(filepath.Join(h.store.Directory, attemptName(attachment().Node)))
		if e != nil || fi.Mode().Perm() != 0600 {
			t.Fatal("attempt permissions", e)
		}
		if h.startCode == 204 || h.startCode == 304 {
			h.s.State.Running = true
			h.s.State.Status = "running"
			h.s.State.Pid = 4095
			h.s.State.Error = ""
			h.s.State.StartedAt = "2026-10-14T07:46:10.535901764Z"
		}
		return response(h.startCode, Object{"message": "ambiguous private diagnostic"}), nil
	case p == "/containers/"+h.s.ID+"/exec":
		h.verifies++
		var body Object
		_ = json.NewDecoder(r.Body).Decode(&body)
		encoded, _ := json.Marshal(body)
		for _, want := range []string{"/rest/health", "checkSharedWorkspaceForRun", h.b.MountRoot} {
			if !strings.Contains(string(encoded), want) {
				t.Fatal("missing actual check", want)
			}
		}
		return response(201, Object{"Id": "verify-id"}), nil
	case p == "/exec/verify-id/start":
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader("")), Header: make(http.Header)}, nil
	case p == "/exec/verify-id/json":
		if h.afterVerify != nil {
			h.afterVerify()
		}
		return response(200, Object{"ExitCode": h.verifyExit}), nil
	default:
		t.Fatalf("unexpected operation (no names/recreate/pull/stop/config allowed): %s %s", r.Method, r.URL)
		return nil, nil
	}
}
func (h *startHarness) complete(retry bool) StartResult {
	return h.client.CompleteFailedStart(h.s, h.b, attachment(), h.store, retry)
}
func TestFailedStartSameIDProofAndConsumption(t *testing.T) {
	h := newStartHarness(t)
	before := h.s
	got := h.complete(false)
	if got.State != StartRecovered || h.starts != 1 || h.probes != 1 || h.verifies != 1 {
		t.Fatal(got, h.starts, h.probes, h.verifies)
	}
	if !sameStartConfiguration(before, h.s) {
		t.Fatal("config changed")
	}
	files, _ := os.ReadDir(h.store.Directory)
	if len(files) != 1 || files[0].Name() != attemptName(attachment().Node) {
		t.Fatal("probe cleanup/attempt retention", files)
	}
	got = h.complete(false)
	if got.State != StartUnchanged || h.starts != 1 || h.probes != 1 {
		t.Fatal("running restarted", got)
	}
	// A later real process incarnation can complete its next ordinary boot failure.
	next, _, _ := startFixture()
	next.State.StartedAt = h.s.State.StartedAt
	next.State.FinishedAt = "2026-10-14T07:46:56.914818293Z"
	h.s = next
	if got = h.complete(false); got.State != StartRecovered || h.starts != 2 {
		t.Fatal("new incarnation suppressed", got)
	}
}
func TestFailedStartAmbiguityDedupAndConfirmedRetry(t *testing.T) {
	h := newStartHarness(t)
	h.startCode = 500
	for i := 0; i < 3; i++ {
		if got := h.complete(false); got.State != StartIncomplete {
			t.Fatal(got)
		}
	}
	if h.starts != 1 || h.probes != 1 {
		t.Fatal("blind retries", h.starts, h.probes)
	}
	// Mutable policy/diagnostic are not the record key.
	h.s.HostConfig["RestartPolicy"] = Object{"Name": "always"}
	if got := h.complete(false); !strings.Contains(got.Reason, "consumed") {
		t.Fatal(got)
	}
	h.startCode = 204
	if got := h.complete(true); got.State != StartRecovered || h.starts != 2 {
		t.Fatal("explicit retry", got)
	}
}
func TestFailedStartRefusalsNeverProbeOrStart(t *testing.T) {
	cases := map[string]func(*startHarness){
		"normal stop":   func(h *startHarness) { h.s.State.Error = "" },
		"never started": func(h *startHarness) { h.s.State.StartedAt = "0001-01-01T00:00:00Z" },
		"bad time":      func(h *startHarness) { h.s.State.StartedAt = "bad" },
		"time reversed": func(h *startHarness) { h.s.State.FinishedAt = "2026-01-01T00:00:00Z" },
		"paused":        func(h *startHarness) { h.s.State.Paused = true }, "restarting": func(h *startHarness) { h.s.State.Restarting = true },
		"dead": func(h *startHarness) { h.s.State.Dead = true }, "removing": func(h *startHarness) { h.s.State.Status = "removing" },
		"oom": func(h *startHarness) { h.s.State.OOMKilled = true }, "pid": func(h *startHarness) { h.s.State.Pid = 10 },
		"policy no":      func(h *startHarness) { h.s.HostConfig["RestartPolicy"] = Object{"Name": "no"} },
		"on failure":     func(h *startHarness) { h.s.HostConfig["RestartPolicy"] = Object{"Name": "on-failure"} },
		"unknown policy": func(h *startHarness) { h.s.HostConfig["RestartPolicy"] = Object{"Name": "unknown"} },
		"absent policy":  func(h *startHarness) { delete(h.s.HostConfig, "RestartPolicy") },
		"unknown error":  func(h *startHarness) { h.s.State.Error = "connection refused" },
		"foreign error": func(h *startHarness) {
			h.s.State.Error = strings.ReplaceAll(h.s.State.Error, attachment().Volume, "foreign")
		},
		"wrong endpoint": func(h *startHarness) {
			h.s.State.Error = strings.ReplaceAll(h.s.State.Error, "192.168.64.7", "192.168.64.8")
		},
		"wrong export": func(h *startHarness) { h.s.State.Error = strings.ReplaceAll(h.s.State.Error, h.b.Export, "/foreign") },
		"extra suffix": func(h *startHarness) { h.s.State.Error += " extra" },
		"different errno": func(h *startHarness) {
			h.s.State.Error = strings.ReplaceAll(h.s.State.Error, "connection refused", "permission denied")
		},
		"soft error":          func(h *startHarness) { h.s.State.Error = strings.ReplaceAll(h.s.State.Error, "hard,tcp", "soft,tcp") },
		"foreign volume":      func(h *startHarness) { h.v.Labels[storageLabel] = "other" },
		"wrong driver":        func(h *startHarness) { h.v.Driver = "other" },
		"wrong options":       func(h *startHarness) { h.v.Options["o"] += "extra" },
		"missing volume":      func(h *startHarness) { h.missingVolume = true },
		"mountpoint":          func(h *startHarness) { h.v.Mountpoint = "" },
		"wrong daemon":        func(h *startHarness) { h.daemon = "other" },
		"not selected":        func(h *startHarness) { labels(h.s)[nodeLabel] = "other-node" },
		"attachment missing":  func(h *startHarness) { h.s.Mounts = h.s.Mounts[:3] },
		"descriptor writable": func(h *startHarness) { h.s.Mounts[4].RW = true },
		"pending recreation": func(h *startHarness) {
			if e := ReceiptFile(h.store, attachment().Node)(Receipt{}); e != nil {
				t.Fatal(e)
			}
		},
		"malformed attempt": func(h *startHarness) {
			if e := h.store.Write(attemptName(attachment().Node), Object{}); e != nil {
				t.Fatal(e)
			}
		},
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			h := newStartHarness(t)
			change(h)
			got := h.complete(true)
			if got.State == StartRecovered || h.starts != 0 || h.probes != 0 {
				t.Fatal(got, h.starts, h.probes)
			}
		})
	}
}
func TestFailedStartReinspectionAndProbeRefusals(t *testing.T) {
	for _, field := range []string{"policy", "config", "image", "id", "state", "volume", "daemon", "already-running"} {
		t.Run(field, func(t *testing.T) {
			h := newStartHarness(t)
			h.afterProbe = func() {
				switch field {
				case "policy":
					h.s.HostConfig["RestartPolicy"] = Object{"Name": "no"}
				case "config":
					h.s.Config["Cmd"] = []any{"other"}
				case "image":
					h.s.Image = "sha256:" + strings.Repeat("c", 64)
				case "id":
					h.s.ID = strings.Repeat("c", 64)
				case "state":
					h.s.State.Error = ""
				case "volume":
					h.v.Mountpoint += "other"
				case "daemon":
					h.daemon = "other"
				case "already-running":
					h.s.State.Running = true
					h.s.State.Status = "running"
					h.s.State.Error = ""
					h.s.State.Pid = 4095
				}
			}
			// A replacement ID means the immutable old ID is now gone (never follow name).
			if field == "id" {
				base := h.client.http.Transport
				h.client.http.Transport = roundTrip(func(r *http.Request) (*http.Response, error) {
					if strings.Contains(r.URL.Path, strings.Repeat("a", 64)) && h.s.ID != strings.Repeat("a", 64) {
						return response(404, Object{}), nil
					}
					return base.RoundTrip(r)
				})
			}
			got := h.complete(false)
			want := StartIncomplete
			if field == "already-running" {
				want = StartUnchanged
			}
			if got.State != want || h.starts != 0 || h.probes != 1 {
				t.Fatal(got, h.starts, h.probes)
			}
			if _, e := os.Stat(filepath.Join(h.store.Directory, attemptName(attachment().Node))); !os.IsNotExist(e) {
				t.Fatal("consumed before eligibility reinspection", e)
			}
		})
	}
	h := newStartHarness(t)
	h.probeExit = 1
	if got := h.complete(false); got.State != StartIncomplete || h.starts != 0 {
		t.Fatal(got)
	}
}
func TestFailedStart304AndVerificationFailure(t *testing.T) {
	h := newStartHarness(t)
	h.startCode = 304
	if got := h.complete(false); got.State != StartRecovered || h.verifies != 1 {
		t.Fatal(got)
	}
	h = newStartHarness(t)
	h.afterVerify = func() { h.s.State.Running = false; h.s.State.Status = "exited" }
	if got := h.complete(false); got.State != StartIncomplete || h.starts != 1 {
		t.Fatal(got)
	}
	h = newStartHarness(t)
	h.verifyExit = 1
	if got := h.complete(false); got.State != StartIncomplete || h.starts != 1 || h.verifies != 20 {
		t.Fatal(got, h.starts, h.verifies)
	}
}
func TestFailedStartObservationIsNonMutatingAndDetachRemovesOnlyAttempt(t *testing.T) {
	h := newStartHarness(t)
	for i := 0; i < 2; i++ {
		got := h.client.ObserveFailedStart(h.s, h.b, attachment(), h.store)
		if got.State != StartEligible {
			t.Fatal(got)
		}
	}
	files, _ := os.ReadDir(h.store.Directory)
	if len(files) != 0 || h.starts != 0 || h.probes != 0 {
		t.Fatal("status mutated")
	}
	h.startCode = 500
	_ = h.complete(false)
	got := h.client.ObserveFailedStart(h.s, h.b, attachment(), h.store)
	if !strings.Contains(got.Reason, "consumed") {
		t.Fatal(got)
	}
	if e := h.store.Write("keep.json", Object{"preserve": true}); e != nil {
		t.Fatal(e)
	}
	if e := RemoveStartAttempt(h.store, attachment().Node); e != nil {
		t.Fatal(e)
	}
	files, _ = os.ReadDir(h.store.Directory)
	if len(files) != 1 || files[0].Name() != "keep.json" {
		t.Fatal(files)
	}
	if !reflect.DeepEqual(h.v.Options, volumeOptions(h.b)) {
		t.Fatal("fixture differs from actual volume options")
	}
}

func TestFailedStartMissingProofAndWriteFailure(t *testing.T) {
	t.Run("custom image startup", func(t *testing.T) {
		h := newStartHarness(t)
		base := h.client.http.Transport
		h.client.http.Transport = roundTrip(func(r *http.Request) (*http.Response, error) {
			if strings.Contains(r.URL.Path, "/images/") {
				return response(200, Object{"Config": Object{"Cmd": []any{"foreign"}}}), nil
			}
			return base.RoundTrip(r)
		})
		if got := h.complete(false); got.State != StartIncomplete || h.starts != 0 || h.probes != 0 {
			t.Fatal(got)
		}
	})
	t.Run("write ahead fails", func(t *testing.T) {
		h := newStartHarness(t)
		h.afterProbe = func() {
			if e := os.Mkdir(filepath.Join(h.store.Directory, attemptName(attachment().Node)), 0700); e != nil {
				t.Fatal(e)
			}
		}
		if got := h.complete(false); got.State != StartIncomplete || h.starts != 0 || !strings.Contains(got.Reason, "persist") {
			t.Fatal(got)
		}
	})
	t.Run("304 but not running", func(t *testing.T) {
		h := newStartHarness(t)
		base := h.client.http.Transport
		h.client.http.Transport = roundTrip(func(r *http.Request) (*http.Response, error) {
			if r.URL.Path == apiPrefix+"/containers/"+h.s.ID+"/start" {
				h.starts++
				return response(304, nil), nil
			}
			return base.RoundTrip(r)
		})
		if got := h.complete(false); got.State != StartIncomplete || h.starts != 1 || h.verifies != 0 {
			t.Fatal(got)
		}
	})
	t.Run("policy no after consumed", func(t *testing.T) {
		h := newStartHarness(t)
		h.startCode = 500
		_ = h.complete(false)
		h.s.HostConfig["RestartPolicy"] = Object{"Name": "no"}
		if got := h.complete(true); got.State != StartStopped || h.starts != 1 || h.probes != 1 {
			t.Fatal(got)
		}
	})
}

func TestFailedStartMountProjectionOrderDoesNotChangeIdentity(t *testing.T) {
	h := newStartHarness(t)
	h.afterVerify = func() { h.s.Mounts[0], h.s.Mounts[4] = h.s.Mounts[4], h.s.Mounts[0] }
	if got := h.complete(false); got.State != StartRecovered || h.starts != 1 {
		t.Fatal(got)
	}
}

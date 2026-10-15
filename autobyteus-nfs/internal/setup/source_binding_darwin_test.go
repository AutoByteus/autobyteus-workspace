package setup

// Owned files + fake command replies. No export/mount/service or privileged child
// is started. bindSource starts at the just-completed nonroot creation boundary.
import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

const bindingUUID = "a19fe379-be62-4297-9a39-3934cc88214b"

type bindingRunner struct {
	t                *testing.T
	source           string
	connection       config.Connection
	effects, queries int
	stopMount        bool
	queryHook        func()
}

func fsString[T ~int8 | ~uint8](raw []T) string {
	b := []byte{}
	for _, c := range raw {
		if c == 0 {
			break
		}
		b = append(b, byte(c))
	}
	return string(b)
}
func (r *bindingRunner) Run(binary string, args ...string) ([]byte, error) {
	if binary == "/usr/sbin/diskutil" {
		r.queries++
		var fs syscall.Statfs_t
		if err := syscall.Statfs(r.source, &fs); err != nil {
			return nil, err
		}
		device, mount := fsString(fs.Mntfromname[:]), fsString(fs.Mntonname[:])
		if len(args) != 3 || args[0] != "info" || args[1] != "-plist" || args[2] != device {
			r.t.Fatal(binary, args)
		}
		if r.queryHook != nil {
			r.queryHook()
		}
		return []byte(fmt.Sprintf(`<plist version="1.0"><dict><key>DeviceNode</key><string>%s</string><key>MountPoint</key><string>%s</string><key>FilesystemType</key><string>apfs</string><key>VolumeUUID</key><string>%s</string></dict></plist>`, device, mount, bindingUUID)), nil
	}
	if binary == "/sbin/mount" {
		if r.stopMount {
			return nil, mountBoundary
		}
		return []byte(r.connection.Endpoint + ":" + r.connection.Export + " on " + r.connection.MountRoot + " (nfs, nodev, nosuid)\n"), nil
	}
	if binary == "/usr/bin/nfsstat" {
		return []byte("Current mount parameters: vers=3"), nil
	}
	r.effects++
	return nil, errors.New("unexpected effect: " + binary)
}
func bindingFixture(t *testing.T) (Service, Plan, *bindingRunner) {
	t.Helper()
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	source, err := os.MkdirTemp(cwd, ".source-binding-test-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(source) })
	private := t.TempDir()
	os.Chmod(private, 0700)
	a := config.Attachment{InstallationID: bindingUUID, UserUID: uint32(os.Getuid()), UserGID: uint32(os.Getgid()), Connection: config.Connection{StorageID: bindingUUID, Endpoint: "192.168.64.7", Export: source, Protocol: "3", MountRoot: "/Volumes/owned-binding-fixture"}}
	r := &bindingRunner{t: t, source: source, connection: a.Connection}
	id, err := platform.SourceIdentity(r, source)
	if err != nil {
		t.Fatal(err)
	}
	h := &config.HostedFilesystem{InstallationID: bindingUUID, StorageID: bindingUUID, Source: source, Backend: "apple", Identity: id, DataUID: a.UserUID, DataGID: a.UserGID, Allowlist: []string{"192.168.64.0/24"}}
	return Service{Store: config.Store{Directory: private, Owner: uint32(os.Getuid())}, Runner: r, Binary: filepath.Join(private, "missing-cli"), User: User{UID: a.UserUID, GID: a.UserGID, Home: "/Users/test-user"}}, Plan{Attachment: a, Hosted: h}, r
}
func readRecord(t *testing.T, s Service, name string) []byte {
	t.Helper()
	b, e := os.ReadFile(filepath.Join(s.Store.Directory, name))
	if e != nil {
		t.Fatal(e)
	}
	return b
}
func savePending(t *testing.T, s Service, p Plan) []byte {
	t.Helper()
	if e := s.SaveIntent(p); e != nil {
		t.Fatal(e)
	}
	return readRecord(t, s, "pending-setup.json")
}
func TestBoundPendingReuseAndReplacementRefusal(t *testing.T) {
	for _, stale := range []bool{false, true} {
		t.Run(fmt.Sprint(stale), func(t *testing.T) {
			s, p, r := bindingFixture(t)
			p.NewSource = stale
			before := savePending(t, s, p)
			resumed, err := s.PendingPlan()
			if err != nil || resumed.NewSource || resumed.Hosted.Identity != p.Hosted.Identity {
				t.Fatal(resumed, err)
			}
			if !bytes.Equal(before, readRecord(t, s, "pending-setup.json")) {
				t.Fatal("plan mutated state")
			}
			if err = s.Apply(resumed, false); err == nil {
				t.Fatal("declined apply")
			}
			original := p.Hosted.Source + "-original"
			if err = os.Rename(p.Hosted.Source, original); err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { os.RemoveAll(p.Hosted.Source); os.Rename(original, p.Hosted.Source) })
			if err = os.Mkdir(p.Hosted.Source, 0700); err != nil {
				t.Fatal(err)
			}
			if _, err = s.PendingPlan(); err == nil {
				t.Fatal("pending rebound replacement")
			}
			if err = s.Apply(resumed, true); err == nil {
				t.Fatal("apply rebound replacement")
			}
			if !bytes.Equal(before, readRecord(t, s, "pending-setup.json")) || r.effects != 0 {
				t.Fatal("mismatch changed state")
			}
		})
	}
}
func TestPendingUnboundAndInvalidForms(t *testing.T) {
	for _, kind := range []string{"existing-unbound", "absent-unbound", "old", "partial", "zero-not-new", "mixed", "hosted-unbound"} {
		t.Run(kind, func(t *testing.T) {
			s, p, r := bindingFixture(t)
			p.NewSource = true
			switch kind {
			case "existing-unbound", "absent-unbound", "hosted-unbound":
				p.Hosted.Identity = config.Identity{}
			case "old":
				p.Hosted.Identity = config.Identity{Device: 1, Inode: 2}
			case "partial":
				p.Hosted.Identity.Inode = 0
			case "zero-not-new":
				p.NewSource = false
				p.Hosted.Identity = config.Identity{}
			case "mixed":
				p.Hosted.Identity.Device = 1
			}
			if kind == "absent-unbound" {
				if err := os.Remove(p.Hosted.Source); err != nil {
					t.Fatal(err)
				}
			}
			if kind == "hosted-unbound" {
				if err := s.Store.Write("hosted-filesystem.json", p.Hosted); err != nil {
					t.Fatal(err)
				}
			}
			before := savePending(t, s, p)
			r.queries = 0
			resumed, err := s.PendingPlan()
			if strings.HasSuffix(kind, "-unbound") && kind != "hosted-unbound" {
				if err != nil {
					t.Fatal(err)
				}
				if kind == "existing-unbound" && (resumed.NewSource || resumed.Hosted.Identity.VolumeUUID != bindingUUID) {
					t.Fatal(resumed)
				}
				if kind == "absent-unbound" && (!resumed.NewSource || resumed.Hosted.Identity != (config.Identity{})) {
					t.Fatal(resumed)
				}
			} else {
				if err == nil || r.queries != 0 {
					t.Fatal("invalid binding observed or accepted", err, r.queries)
				}
				if err = s.Apply(p, true); err == nil {
					t.Fatal("invalid apply accepted")
				}
			}
			if !bytes.Equal(before, readRecord(t, s, "pending-setup.json")) || r.effects != 0 {
				t.Fatal("plan/refusal changed state")
			}
		})
	}
}
func TestCreatedSourceBindingSurvivesProbeFailure(t *testing.T) {
	s, p, r := bindingFixture(t)
	original := p.Hosted.Identity
	p.Hosted.Identity = config.Identity{}
	p.NewSource = true
	savePending(t, s, p)
	// Same helper called by Apply immediately after service.CreateSource returns.
	if err := s.bindSource(&p); err != nil {
		t.Fatal(err)
	}
	var saved Plan
	if err := s.Store.Read("pending-setup.json", &saved); err != nil {
		t.Fatal(err)
	}
	if saved.NewSource || saved.Hosted.Identity != original {
		t.Fatal("binding not persisted before probe", saved)
	}
	before := readRecord(t, s, "pending-setup.json")
	if err := s.Apply(saved, true); err == nil || !strings.Contains(err.Error(), "missing-cli") {
		t.Fatal("expected real probe executable trust failure", err)
	}
	if !bytes.Equal(before, readRecord(t, s, "pending-setup.json")) || r.effects != 0 {
		t.Fatal("later failure lost binding")
	}
	for _, name := range []string{"hosted-filesystem.json", "attachment.json", "apple-resource.json"} {
		if _, err := os.Lstat(filepath.Join(s.Store.Directory, name)); !os.IsNotExist(err) {
			t.Fatal("premature side effect", name, err)
		}
	}
	if _, err := os.Stat(filepath.Join(p.Hosted.Source, ".autobyteus-nfs")); !os.IsNotExist(err) {
		t.Fatal("marker changed before probe", err)
	}
}
func TestBindingSaveFailureStopsAndUnboundRetryPersists(t *testing.T) {
	s, p, r := bindingFixture(t)
	p.Hosted.Identity = config.Identity{}
	p.NewSource = true
	savePending(t, s, p)
	resumed, err := s.PendingPlan()
	if err != nil {
		t.Fatal(err)
	}
	// A fresh reviewed/consented Apply saves its newly observed binding before probe.
	if err = s.Apply(resumed, true); err == nil || !strings.Contains(err.Error(), "missing-cli") {
		t.Fatal(err)
	}
	var saved Plan
	s.Store.Read("pending-setup.json", &saved)
	if saved.NewSource || saved.Hosted.Identity.VolumeUUID != bindingUUID {
		t.Fatal(saved)
	}
	// Atomic rename into a directory fails: no later work may follow the bind call.
	if err = os.Remove(filepath.Join(s.Store.Directory, "pending-setup.json")); err != nil {
		t.Fatal(err)
	}
	if err = os.Mkdir(filepath.Join(s.Store.Directory, "pending-setup.json"), 0700); err != nil {
		t.Fatal(err)
	}
	p.NewSource = true
	p.Hosted.Identity = config.Identity{}
	if err = s.bindSource(&p); err == nil {
		t.Fatal("failed SaveIntent accepted")
	}
	if r.effects != 0 {
		t.Fatal("effect after persistence failure")
	}
}
func TestCompletedBindingValidationAndReconnectNoEffects(t *testing.T) {
	for _, kind := range []string{"old", "zero", "changed-inode", "changed-uuid", "missing-source"} {
		t.Run(kind, func(t *testing.T) {
			s, p, r := bindingFixture(t)
			switch kind {
			case "old":
				p.Hosted.Identity = config.Identity{Device: 1, Inode: 2}
			case "zero":
				p.Hosted.Identity = config.Identity{}
			case "changed-inode":
				p.Hosted.Identity.Inode++
			case "changed-uuid":
				p.Hosted.Identity.VolumeUUID = "b19fe379-be62-4297-9a39-3934cc88214b"
			case "missing-source":
				os.Remove(p.Hosted.Source)
			}
			s.Store.Write("attachment.json", p.Attachment)
			s.Store.Write("hosted-filesystem.json", p.Hosted)
			before := readRecord(t, s, "hosted-filesystem.json")
			r.queries = 0
			if err := s.Reconnect(false); err == nil {
				t.Fatal("invalid source reconnected")
			}
			if kind == "old" || kind == "zero" {
				if _, err := s.Status(); err == nil {
					t.Fatal("invalid config ready")
				}
				if err := s.Detach(true); err == nil {
					t.Fatal("invalid binding mutated")
				}
				if r.queries != 0 {
					t.Fatal("invalid binding queried")
				}
			}
			if !bytes.Equal(before, readRecord(t, s, "hosted-filesystem.json")) || r.effects != 0 {
				t.Fatal("identity rewritten/effect")
			}
		})
	}
}
func TestDetachDoesNotRequireLiveSource(t *testing.T) {
	s, p, r := bindingFixture(t)
	os.Remove(p.Hosted.Source)
	s.Store.Write("attachment.json", p.Attachment)
	s.Store.Write("hosted-filesystem.json", p.Hosted)
	r.queries = 0
	r.stopMount = true
	if err := s.Detach(true); !errors.Is(err, mountBoundary) {
		t.Fatal("added live source dependency", err)
	}
	if r.queries != 0 || r.effects != 0 {
		t.Fatal("detach queried source")
	}
}
func TestPlanCapturesExistingAndQualifiesNewParent(t *testing.T) {
	for _, newSource := range []bool{false, true} {
		t.Run(fmt.Sprint(newSource), func(t *testing.T) {
			s, p, r := bindingFixture(t)
			path := p.Hosted.Source
			if newSource {
				path = filepath.Join(path, "new-project")
			}
			r.queries = 0
			_, err := s.Plan(Request{Source: path, Backend: "not-apple", Connection: p.Attachment.Connection, Allowlist: p.Hosted.Allowlist})
			// Stops immediately after platform capture, before reading NFS config/binding ports.
			if err == nil || !strings.Contains(err.Error(), "Mac storage hosting") || r.queries != 1 {
				t.Fatal("source/parent capture missing", err, r.queries)
			}
			if r.effects != 0 {
				t.Fatal("plan caused effect")
			}
		})
	}
}

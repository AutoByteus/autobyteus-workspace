package backend

import (
	"errors"
	"fmt"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type reloadRunner struct {
	err   error
	calls int
}

func (r *reloadRunner) Run(binary string, args ...string) ([]byte, error) {
	r.calls++
	return nil, r.err
}
func TestPackageMaskCleanupRetainsUncertainReceipt(t *testing.T) {
	for _, changed := range []bool{false, true} {
		root := t.TempDir()
		os.Chmod(root, 0700)
		store := config.Store{Directory: root, Owner: uint32(os.Getuid())}
		if err := store.Write("package-mask.json", map[string]bool{"maskedDefaultUnit": true}); err != nil {
			t.Fatal(err)
		}
		mask := filepath.Join(root, "mask")
		target := "/dev/null"
		if changed {
			target = "/external"
		}
		if err := os.Symlink(target, mask); err != nil {
			t.Fatal(err)
		}
		r := &reloadRunner{err: errors.New("reload failed")}
		if err := removePackageMask(r, store, mask); err == nil {
			t.Fatal("reported success")
		}
		if _, err := os.Stat(filepath.Join(root, "package-mask.json")); err != nil {
			t.Fatal("lost recovery receipt")
		}
		if changed {
			if v, _ := os.Readlink(mask); v != "/external" || r.calls != 0 {
				t.Fatal("modified external mask")
			}
			continue
		}
		r.err = nil
		if err := removePackageMask(r, store, mask); err != nil {
			t.Fatal(err)
		}
		if _, err := os.Stat(filepath.Join(root, "package-mask.json")); !os.IsNotExist(err) {
			t.Fatal("receipt not cleared after confirmed cleanup")
		}
	}
}
func TestGaneshaDetachPreservesRecoveryAndRejectsExternalConfig(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, "ganesha")
	os.Mkdir(dir, 0700)
	recovery := filepath.Join(dir, "recovery")
	os.Mkdir(recovery, 0700)
	sentinel := filepath.Join(recovery, "keep")
	os.WriteFile(sentinel, []byte("retained"), 0600)
	h := hosted()
	h.Backend = "ganesha-native"
	configPath := filepath.Join(dir, "ganesha.conf")
	want, err := GaneshaConfig(h, root, false)
	if err != nil {
		t.Fatal(err)
	}
	os.WriteFile(configPath, []byte(want+"# external"), 0600)
	if err = RemoveGaneshaConfiguration(h, root, false); err == nil {
		t.Fatal("deleted externally changed config")
	}
	os.WriteFile(configPath, []byte(want), 0600)
	for i := 0; i < 2; i++ {
		if err = RemoveGaneshaConfiguration(h, root, false); err != nil {
			t.Fatal(err)
		}
	}
	if b, e := os.ReadFile(sentinel); e != nil || string(b) != "retained" {
		t.Fatal("lost recovery bytes")
	}
}

// Read-only preflight and existing removal share the same current generator.
// Exact removal retry preserves recovery; an unreadable existing entry is not absence.
func TestGaneshaConfigPreflightAndExactRemoval(t *testing.T) {
	for _, container := range []bool{false, true} {
		for _, kind := range []string{"current", "missing", "old", "different", "malformed", "directory", "dangling"} {
			t.Run(fmt.Sprintf("container=%t/%s", container, kind), func(t *testing.T) {
				root := t.TempDir()
				dir := filepath.Join(root, "ganesha")
				if err := os.Mkdir(dir, 0700); err != nil {
					t.Fatal(err)
				}
				h := hosted()
				h.Backend = "ganesha-native"
				if container {
					h.Backend = "ganesha-docker"
				}
				want, err := GaneshaConfig(h, root, container)
				if err != nil {
					t.Fatal(err)
				}
				p := filepath.Join(dir, "ganesha.conf")
				switch kind {
				case "missing":
				case "directory":
					err = os.Mkdir(p, 0700)
				case "dangling":
					err = os.Symlink(filepath.Join(root, "absent"), p)
				default:
					content := want
					switch kind {
					case "old":
						content = strings.ReplaceAll(want, " Attr_Expiration_Time = 0;\n", "")
					case "different":
						content += "# changed"
					case "malformed":
						content = "invalid"
					}
					err = os.WriteFile(p, []byte(content), 0600)
				}
				if err != nil {
					t.Fatal(err)
				}
				before, _ := os.ReadFile(p)
				verify := VerifyGanesha(h, root, container)
				preflight := VerifyGaneshaForDetach(h, root, container)
				if (verify == nil) != (kind == "current") {
					t.Fatal("wrong readiness config result", verify)
				}
				if (preflight == nil) != (kind == "current" || kind == "missing") {
					t.Fatal("wrong detach preflight", preflight)
				}
				after, _ := os.ReadFile(p)
				if string(before) != string(after) {
					t.Fatal("verification mutated config")
				}
				sentinel := filepath.Join(dir, "recovery-kept")
				if err := os.WriteFile(sentinel, []byte("retained"), 0600); err != nil {
					t.Fatal(err)
				}
				for i := 0; i < 2; i++ {
					err = RemoveGaneshaConfiguration(h, root, container)
					if (err == nil) != (kind == "current" || kind == "missing") {
						t.Fatal("wrong exact removal", err)
					}
				}
				if kind != "current" && kind != "missing" {
					if _, err := os.Lstat(p); err != nil {
						t.Fatal("removed nonmatching config", err)
					}
					after, _ = os.ReadFile(p)
					if string(before) != string(after) {
						t.Fatal("rewrote config")
					}
				}
				if b, err := os.ReadFile(sentinel); err != nil || string(b) != "retained" {
					t.Fatal("lost recovery")
				}
			})
		}
	}
}

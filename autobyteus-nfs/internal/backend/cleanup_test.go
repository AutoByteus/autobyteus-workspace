package backend

import (
	"errors"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"os"
	"path/filepath"
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

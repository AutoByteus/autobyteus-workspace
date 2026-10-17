package backend

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

type packageRunner struct {
	t                            *testing.T
	root, mask, fail             string
	present, active, changedMask bool
	calls                        []string
	reloads, queries, installs   int
}

func (r *packageRunner) Run(binary string, args ...string) ([]byte, error) {
	r.calls = append(r.calls, binary+" "+strings.Join(args, " "))
	switch binary {
	case "/usr/bin/dpkg-query":
		r.queries++
		if !r.present {
			return nil, errors.New("absent")
		}
		version := engineVersion
		if args[len(args)-1] == "nfs-common" {
			version = "client-pin"
		}
		if r.fail == "requery" && r.installs > 0 {
			version = "wrong"
		}
		return []byte("install ok installed " + version), nil
	case "/usr/bin/systemctl":
		if args[0] == "is-active" {
			if r.active {
				return nil, nil
			}
			return nil, errors.New("inactive")
		}
		r.reloads++
		if r.fail == "cleanup" && r.reloads == 2 {
			return nil, errors.New("reload failed")
		}
	case "/usr/bin/apt-get":
		if args[0] == "update" {
			if r.fail == "update" {
				return nil, errors.New("update failed")
			}
			return nil, nil
		}
		r.installs++
		if v, e := os.Readlink(r.mask); e != nil || v != "/dev/null" {
			r.t.Fatal("distribution unit not masked during install", e)
		}
		if len(args) != 6 || args[3] != "nfs-common=client-pin" {
			r.t.Fatal(args)
		}
		for _, path := range args[4:] {
			if !filepath.IsAbs(path) || !strings.HasPrefix(path, r.root+"/engine-install-") || !strings.HasSuffix(path, "_arm64.deb") {
				r.t.Fatal("not exact local package", path)
			}
			i, e := os.Stat(path)
			if e != nil || i.Mode().Perm() != 0600 {
				r.t.Fatal(i, e)
			}
		}
		if r.changedMask {
			os.Remove(r.mask)
			os.Symlink("/external", r.mask)
		}
		if r.fail == "install" {
			return nil, errors.New("apt install failed")
		}
		r.present = true
	default:
		r.t.Fatal("unexpected command", binary, args)
	}
	return nil, nil
}
func TestUbuntuEmbeddedInstallAndFailureCleanup(t *testing.T) {
	for _, mode := range []string{"success", "already", "update", "install", "requery", "cleanup", "external-mask", "active", "changed-mask", "resume-mask"} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			os.Chmod(root, 0700)
			mask := filepath.Join(root, "mask")
			store := config.Store{Directory: root, Owner: uint32(os.Getuid())}
			r := &packageRunner{t: t, root: root, mask: mask, fail: mode, present: mode == "already" || mode == "resume-mask", active: mode == "active", changedMask: mode == "changed-mask"}
			if mode == "external-mask" {
				os.Symlink("/dev/null", mask)
			}
			if mode == "resume-mask" {
				os.Symlink("/dev/null", mask)
				store.Write("package-mask.json", map[string]bool{"maskedDefaultUnit": true})
			}
			m, a := fixtureBundle()
			payload, e := readEngineBundle(m, "arm64", a)
			if e != nil {
				t.Fatal(e)
			}
			err := installUbuntuPackages(r, map[string]string{"nfs-common": "client-pin"}, payload, true, store, mask)
			success := mode == "success" || mode == "already" || mode == "resume-mask"
			if (err == nil) != success {
				t.Fatal(mode, err)
			}
			if mode == "success" && (r.queries != 6 || r.installs != 1) {
				t.Fatal("no exact version requery", r.calls)
			}
			if mode == "already" && (r.queries != 3 || len(r.calls) != 3) {
				t.Fatal("already installed mutated", r.calls)
			}
			if (mode == "active" || mode == "external-mask") && r.installs != 0 {
				t.Fatal("unrelated engine adopted")
			}
			entries, _ := os.ReadDir(root)
			for _, f := range entries {
				if strings.HasPrefix(f.Name(), "engine-install-") {
					t.Fatal("staging leaked", f.Name())
				}
			}
			_, receiptErr := os.Stat(filepath.Join(root, "package-mask.json"))
			retained := mode == "cleanup" || mode == "changed-mask"
			if retained != (receiptErr == nil) {
				t.Fatal("wrong uncertain mask receipt disposition", receiptErr)
			}
			if mode == "changed-mask" {
				v, _ := os.Readlink(mask)
				if v != "/external" {
					t.Fatal("external mask removed")
				}
			}
			if !retained && mode != "external-mask" {
				if _, e := os.Lstat(mask); !os.IsNotExist(e) {
					t.Fatal("owned mask not removed", e)
				}
			}
		})
	}
}
func TestUbuntuClientOnlyDoesNotNeedEngine(t *testing.T) {
	root := t.TempDir()
	os.Chmod(root, 0700)
	r := &packageRunner{t: t, present: true}
	err := installUbuntuPackages(r, map[string]string{"nfs-common": "client-pin"}, nil, false, config.Store{Directory: root, Owner: uint32(os.Getuid())}, filepath.Join(root, "mask"))
	if err != nil || len(r.calls) != 1 {
		t.Fatal(err, r.calls)
	}
}

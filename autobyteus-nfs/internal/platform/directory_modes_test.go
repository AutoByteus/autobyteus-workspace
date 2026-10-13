package platform

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

// The real bootstrap supplies 077 to a native Go test child. Only release assets,
// elevation and the root-ownership boundary are doubled; no OS paths are written.
func TestBootstrapDirectoryModes(t *testing.T) {
	if _, err := os.Stat("/.dockerenv"); err == nil {
		t.Skip("the bootstrap deliberately refuses container-host context")
	}
	binary, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	root, err := filepath.Abs("../../..")
	if err != nil {
		t.Fatal(err)
	}
	python, err := exec.LookPath("python3")
	if err != nil {
		t.Fatal("bootstrap fixture requires python3:", err)
	}
	cmd := exec.Command(python, "-m", "unittest", "scripts.tests.test_nfs_installer_fixture.NfsInstallerFixtureTest.test_directory_modes_with_go_fixture", "-v")
	cmd.Dir = root
	cmd.Env = []string{"PATH=/usr/bin:/bin", "HOME=" + t.TempDir(), "NFS_DIRECTORY_TEST_BINARY=" + binary}
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("bootstrap boundary: %v\n%s", err, out)
	}
	t.Log(string(out))
}

func TestInstallerDirectoryModeChild(t *testing.T) {
	phase := os.Getenv("NFS_PERMISSION_PHASE")
	if phase == "" {
		t.Skip("child-only fixture invoked by TestBootstrapDirectoryModes")
	}
	mask := syscall.Umask(077)
	defer syscall.Umask(mask)
	if mask != 077 {
		t.Fatalf("bootstrap changed private umask: %03o", mask)
	}
	if phase == "verify-release" {
		return
	}
	if phase != "create" {
		t.Fatal("unexpected bootstrap phase", phase)
	}
	if os.Geteuid() == 0 {
		t.Fatal("this fixture must run without root/elevation")
	}
	for _, layout := range []struct{ name, private, binary string }{
		{"mac", "Library/Application Support/AutoByteusNFS", "Library/AutoByteusNFS/libexec/autobyteus-nfs"},
		{"linux", "var/lib/autobyteus-nfs", "usr/libexec/autobyteus-nfs/autobyteus-nfs"},
	} {
		t.Run(layout.name, func(t *testing.T) {
			root := t.TempDir()
			trusted := fixtureDirectoryTrust(root)
			private := filepath.Join(root, layout.private)
			binary := filepath.Join(root, layout.binary)
			public := filepath.Join(root, "etc/autobyteus-nfs")
			nodes := filepath.Join(public, "nodes")
			for _, d := range []struct {
				path string
				mode os.FileMode
			}{
				{private, 0700}, {filepath.Dir(binary), 0755}, {public, 0755}, {nodes, 0755},
			} {
				if err := rootDirectory(d.path, d.mode, trusted); err != nil {
					t.Fatal(err)
				}
				assertMode(t, d.path, d.mode)
			}
			// Every newly created intermediate parent matters, not just the leaves.
			for _, leaf := range []string{filepath.Dir(private), filepath.Dir(binary), nodes} {
				for p := leaf; p != root; p = filepath.Dir(p) {
					assertMode(t, p, 0755)
				}
			}
			owner := uint32(os.Geteuid())
			for _, dir := range []string{public, nodes} {
				if err := (config.Store{Directory: dir, Owner: owner, Public: true}).Write("attachment.json", map[string]string{"storageId": "fixture"}); err != nil {
					t.Fatal(err)
				}
				assertMode(t, filepath.Join(dir, "attachment.json"), 0644)
			}
			if err := (config.Store{Directory: private, Owner: owner}).Write("receipt.json", map[string]bool{"private": true}); err != nil {
				t.Fatal(err)
			}
			assertMode(t, filepath.Join(private, "receipt.json"), 0600)
			// Actual nonroot fixture exec/read plus mode assertions above. This does
			// not claim an actual root install followed by a different-UID probe.
			if err := config.AtomicFile(binary, []byte("#!/bin/sh\nexec /bin/cat \"$1\" \"$2\"\n"), 0755); err != nil {
				t.Fatal(err)
			}
			out, err := exec.Command(binary, filepath.Join(public, "attachment.json"), filepath.Join(nodes, "attachment.json")).CombinedOutput()
			if err != nil || strings.Count(string(out), "fixture") != 2 {
				t.Fatalf("nonroot fixture traversal/read: %v %s", err, out)
			}
			current := syscall.Umask(077)
			if current != 077 {
				t.Fatalf("directory creation altered the process umask: %03o", current)
			}
			t.Log("private=0700 public/exec/parents=0755 descriptor=0644")
		})
	}
}

// Substitute ownership only inside the disposable test root. Production always
// uses TrustedPath (UID 0 and every ancestor); no test switch enters production.
func fixtureDirectoryTrust(root string) func(string, bool) error {
	return func(p string, directory bool) error {
		if p != root && !strings.HasPrefix(p, root+string(os.PathSeparator)) {
			return errors.New("outside fixture root")
		}
		info, err := os.Lstat(p)
		if err != nil {
			return err
		}
		if !directory || !info.IsDir() || info.Sys().(*syscall.Stat_t).Uid != uint32(os.Geteuid()) || info.Mode().Perm()&0022 != 0 {
			return fmt.Errorf("unsafe fixture directory: %s", p)
		}
		return nil
	}
}

func TestRootDirectoryDoesNotAdoptExistingPaths(t *testing.T) {
	root := t.TempDir()
	for _, mode := range []os.FileMode{0700, 0750, 0777} {
		p := filepath.Join(root, fmt.Sprintf("existing-%o", mode))
		if err := os.Mkdir(p, mode); err != nil {
			t.Fatal(err)
		}
		if err := os.Chmod(p, mode); err != nil {
			t.Fatal(err)
		}
		err := rootDirectory(p, 0755, fixtureDirectoryTrust(root))
		if (err != nil) != (mode == 0777) {
			t.Fatalf("mode %o: %v", mode, err)
		}
		assertMode(t, p, mode)
		if mode == 0777 {
			child := filepath.Join(p, "child")
			if err := rootDirectory(child, 0755, fixtureDirectoryTrust(root)); err == nil {
				t.Fatal("accepted unsafe parent")
			}
			if _, err := os.Lstat(child); !os.IsNotExist(err) {
				t.Fatal("created under unsafe parent", err)
			}
		}
		// Exercise the real, non-injected root trust boundary too.
		if err := RootDirectory(p, 0755); err == nil {
			t.Fatal("adopted untrusted test path")
		}
		assertMode(t, p, mode)
	}
	file := filepath.Join(root, "file")
	if err := os.WriteFile(file, []byte("preserve"), 0600); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(root, "link")
	if err := os.Symlink(file, link); err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{file, link} {
		if err := rootDirectory(p, 0755, fixtureDirectoryTrust(root)); err == nil {
			t.Fatal("accepted non-directory", p)
		}
	}
	assertMode(t, file, 0600)
}

func assertMode(t *testing.T, path string, want os.FileMode) {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != want {
		t.Fatalf("%s: mode %04o, want %04o", path, got, want)
	}
}

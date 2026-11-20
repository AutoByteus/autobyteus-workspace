package launch

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"

	"autobyteus.local/desktop/linux-install/internal/install"
)

type menuFixture struct {
	app, flat, entry, icon, old string
	paths                       install.Paths
}

func writeTest(t *testing.T, path, data string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(data), 0644); err != nil {
		t.Fatal(err)
	}
}
func fixtureMenu(t *testing.T) menuFixture {
	t.Helper()
	home := filepath.Join(t.TempDir(), "Test Home\\user")
	t.Setenv("HOME", home)
	share := filepath.Join(home, ".local/share")
	p := install.Paths{UID: "1000", App: "/opt/autobyteus-desktop/1000/app"}
	app := t.TempDir()
	writeTest(t, filepath.Join(app, "resources/icons/512x512.png"), "packaged icon bytes")
	old := "[Desktop Entry]\nType=Application\nName=AutoByteus\nExec=/opt/autobyteus-desktop/1000/app/AutoByteus.AppImage %U\nIcon=applications-development\nTerminal=false\nCategories=Development;\nX-AutoByteus-Managed-UID=1000\n"
	return menuFixture{app, filepath.Join(share, "applications/autobyteus-managed.desktop"), filepath.Join(share, "applications/autobyteus/managed.desktop"), filepath.Join(share, "autobyteus-managed/desktop-icon.png"), old, p}
}
func absent(t *testing.T, path string) {
	t.Helper()
	if _, e := os.Lstat(path); !os.IsNotExist(e) {
		t.Fatalf("expected absent: %s (%v)", path, e)
	}
}
func read(t *testing.T, path string) string {
	t.Helper()
	b, e := os.ReadFile(path)
	if e != nil {
		t.Fatal(e)
	}
	return string(b)
}
func TestMenuReconciliation(t *testing.T) {
	f := fixtureMenu(t)
	writeTest(t, f.flat, f.old)
	if e := EnsureMenu(f.paths, f.app); e != nil {
		t.Fatal(e)
	}
	absent(t, f.flat)
	if got := read(t, f.entry); !strings.Contains(got, `Test\sHome\\user/.local/share/autobyteus-managed/desktop-icon.png`) || !strings.Contains(got, "StartupWMClass=autobyteus-managed\n") || !strings.Contains(got, "Exec="+f.paths.App+"/AutoByteus.AppImage %U\n") {
		t.Fatal(got)
	}
	// Old AppRun can recreate the flat file at its absent original destination;
	// updated installed invocation retires it without churning current resources.
	writeTest(t, f.flat, f.old)
	i, _ := os.Stat(f.icon)
	e, _ := os.Stat(f.entry)
	if err := EnsureMenu(f.paths, f.app); err != nil {
		t.Fatal(err)
	}
	absent(t, f.flat)
	i2, _ := os.Stat(f.icon)
	e2, _ := os.Stat(f.entry)
	if !os.SameFile(i, i2) || !os.SameFile(e, e2) {
		t.Fatal("rewritten resources")
	}
	if err := os.RemoveAll(f.app); err != nil {
		t.Fatal(err)
	}
	if read(t, f.icon) != "packaged icon bytes" {
		t.Fatal("icon depended on mount")
	}
}
func TestMenuPartialOwnedStateAndUninstall(t *testing.T) {
	for _, missing := range []string{"icon", "entry"} {
		t.Run(missing, func(t *testing.T) {
			f := fixtureMenu(t)
			if err := EnsureMenu(f.paths, f.app); err != nil {
				t.Fatal(err)
			}
			path := map[string]string{"icon": f.icon, "entry": f.entry}[missing]
			if err := os.Remove(path); err != nil {
				t.Fatal(err)
			}
			writeTest(t, f.flat, f.old)
			if err := EnsureMenu(f.paths, f.app); err != nil {
				t.Fatal(err)
			}
			if _, err := os.Stat(path); err != nil {
				t.Fatal(err)
			}
			writeTest(t, f.flat, f.old)
			sibling := filepath.Join(filepath.Dir(f.icon), "unrelated")
			writeTest(t, sibling, "mine")
			if err := RemoveMenu(f.paths, f.app); err != nil {
				t.Fatal(err)
			}
			for _, n := range []string{f.flat, f.entry, f.icon, filepath.Dir(f.entry)} {
				absent(t, n)
			}
			if read(t, sibling) != "mine" {
				t.Fatal("unrelated file removed")
			}
			if err := RemoveMenu(f.paths, f.app); err != nil {
				t.Fatal(err)
			}
		})
	}
}
func TestMenuNonDestructiveConflicts(t *testing.T) {
	for _, which := range []string{"flat", "entry", "icon"} {
		for _, kind := range []string{"edited", "symlink", "fifo", "directory"} {
			t.Run(which+"-"+kind, func(t *testing.T) {
				f := fixtureMenu(t)
				path := map[string]string{"flat": f.flat, "entry": f.entry, "icon": f.icon}[which]
				if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
					t.Fatal(err)
				}
				target := filepath.Join(t.TempDir(), "target")
				writeTest(t, target, f.old)
				switch kind {
				case "edited":
					writeTest(t, path, f.old+"#custom")
				case "symlink":
					if e := os.Symlink(target, path); e != nil {
						t.Fatal(e)
					}
				case "directory":
					if e := os.Mkdir(path, 0755); e != nil {
						t.Fatal(e)
					}
				case "fifo":
					if e := syscall.Mkfifo(path, 0600); e != nil {
						t.Fatal(e)
					}
				}
				before, _ := os.Lstat(path)
				if err := EnsureMenu(f.paths, f.app); err == nil {
					t.Fatal("accepted conflict")
				}
				if err := RemoveMenu(f.paths, f.app); err == nil {
					t.Fatal("ignored conflict")
				}
				after, err := os.Lstat(path)
				if err != nil || !os.SameFile(before, after) {
					t.Fatal("foreign resource changed")
				}
				if kind == "edited" && read(t, path) != f.old+"#custom" {
					t.Fatal("foreign bytes changed")
				}
				if read(t, target) != f.old {
					t.Fatal("followed foreign target")
				}
				for _, n := range []string{f.flat, f.entry, f.icon} {
					if n != path {
						absent(t, n)
					}
				}
			})
		}
	}
}
func TestMenuUnusableIconKeepsPredecessor(t *testing.T) {
	f := fixtureMenu(t)
	writeTest(t, f.flat, f.old)
	if err := EnsureMenu(f.paths, t.TempDir()); err == nil {
		t.Fatal("no packaged icon")
	}
	if read(t, f.flat) != f.old {
		t.Fatal("lost old shortcut")
	}
	absent(t, f.icon)
	absent(t, f.entry)
}
func TestMenuRedirectedPrivateDirectory(t *testing.T) {
	f := fixtureMenu(t)
	writeTest(t, f.flat, f.old)
	target := t.TempDir()
	if err := os.Symlink(target, filepath.Dir(f.entry)); err != nil {
		t.Fatal(err)
	}
	if err := EnsureMenu(f.paths, f.app); err == nil {
		t.Fatal("accepted redirected directory")
	}
	if read(t, f.flat) != f.old {
		t.Fatal("lost predecessor")
	}
	absent(t, f.icon)
	if err := RemoveMenu(f.paths, f.app); err == nil {
		t.Fatal("ignored redirected directory")
	}
	if names, _ := os.ReadDir(target); len(names) != 0 {
		t.Fatal("used redirected directory")
	}
}
func TestConcurrentMenuPublication(t *testing.T) {
	f := fixtureMenu(t)
	var wg sync.WaitGroup
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := EnsureMenu(f.paths, f.app); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if !bytes.Equal([]byte(read(t, f.icon)), []byte("packaged icon bytes")) {
		t.Fatal("incomplete icon")
	}
}

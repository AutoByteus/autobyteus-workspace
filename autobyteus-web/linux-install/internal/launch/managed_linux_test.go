package launch

import (
	"autobyteus.local/desktop/linux-install/internal/install"
	"os"
	"path/filepath"
	"testing"
)

func TestMenuOwnsOnlyItsUnmodifiedEntry(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	p := install.Paths{UID: "1000", App: "/opt/autobyteus-desktop/1000/app"}
	name := filepath.Join(home, ".local/share/applications/autobyteus-managed.desktop")
	if err := Menu(p, false); err != nil {
		t.Fatal(err)
	}
	before, _ := os.Stat(name)
	if err := Menu(p, false); err != nil {
		t.Fatal(err)
	}
	after, _ := os.Stat(name)
	if !os.SameFile(before, after) {
		t.Fatal("ordinary launch unnecessarily replaced shortcut")
	}
	original, _ := os.ReadFile(name)
	custom := []byte("user-customized shortcut")
	if err := os.WriteFile(name, custom, 0644); err != nil {
		t.Fatal(err)
	}
	if Menu(p, false) == nil || Menu(p, true) == nil {
		t.Fatal("modified shortcut was not preserved")
	}
	actual, _ := os.ReadFile(name)
	if string(actual) != string(custom) {
		t.Fatal("user file changed")
	}
	if err := os.WriteFile(name, original, 0644); err != nil {
		t.Fatal(err)
	}
	if err := Menu(p, true); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(name); !os.IsNotExist(err) {
		t.Fatal("owned menu not removed", err)
	}
}

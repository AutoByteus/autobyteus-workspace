package launch

import (
	"autobyteus.local/desktop/linux-install/internal/install"
	"os"
	"path/filepath"
	"strings"
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

func TestAbsentAndIncompleteManagedInstallRemainDistinct(t *testing.T) {
	p := install.Paths{Root: filepath.Join(t.TempDir(), "1000")}
	if path, managed, err := Managed(p); path != "" || managed || err != nil {
		t.Fatalf("absent: %q, %t, %v", path, managed, err)
	}
	if err := os.Mkdir(p.Root, 0755); err != nil {
		t.Fatal(err)
	}
	p.Support = filepath.Join(p.Root, "support")
	p.App = filepath.Join(p.Root, "app")
	path, managed, err := Managed(p)
	if err == nil || path != "" || managed {
		t.Fatalf("incomplete tree accepted: %q, %t, %v", path, managed, err)
	}
	msg := err.Error()
	for _, part := range []string{"incomplete", "administrator", "inspect and repair", p.Root} {
		if !strings.Contains(msg, part) {
			t.Errorf("missing %q in %q", part, msg)
		}
	}
	if strings.Contains(msg, "--autobyteus-uninstall") {
		t.Fatal("unavailable recovery suggested")
	}
	if entries, err := os.ReadDir(p.Root); err != nil || len(entries) != 0 {
		t.Fatal("refusal changed incomplete tree")
	}
}

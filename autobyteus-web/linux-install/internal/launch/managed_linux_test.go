package launch

import (
	"autobyteus.local/desktop/linux-install/internal/install"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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

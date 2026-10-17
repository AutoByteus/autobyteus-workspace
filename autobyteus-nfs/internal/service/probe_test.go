package service

import (
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"os"
	"path/filepath"
	"testing"
)

func TestProbeSameIdentityAndNoProjectChanges(t *testing.T) {
	if os.Getuid() == 0 {
		t.Skip("probe data identity is explicitly nonroot; CI runners execute as a nonroot user")
	}
	root := t.TempDir()
	project := filepath.Join(root, "existing.txt")
	_ = os.WriteFile(project, []byte("unchanged"), 0600)
	id, _ := config.NewID()
	if err := Probe(root, id, true); err != nil {
		t.Fatal(err)
	}
	if err := Probe(root, id, false); err != nil {
		t.Fatal(err)
	}
	other, _ := config.NewID()
	if err := Probe(root, other, true); err == nil {
		t.Fatal("replaced source identity")
	}
	m, err := config.ReadMarker(root)
	if err != nil || m.StorageID != id {
		t.Fatal(m, err)
	}
	entries, _ := os.ReadDir(filepath.Join(root, ".autobyteus-nfs", "health"))
	if len(entries) != 0 {
		t.Fatal("probe residue")
	}
	b, _ := os.ReadFile(project)
	if string(b) != "unchanged" {
		t.Fatal("changed ordinary data")
	}
}
func TestProbeCannotEscapeSource(t *testing.T) {
	root := t.TempDir()
	outside := t.TempDir()
	_ = os.Symlink(outside, filepath.Join(root, ".autobyteus-nfs"))
	id, _ := config.NewID()
	if err := Probe(root, id, true); err == nil {
		t.Fatal("escaped source")
	}
	entries, _ := os.ReadDir(outside)
	if len(entries) != 0 {
		t.Fatal("wrote outside")
	}
}

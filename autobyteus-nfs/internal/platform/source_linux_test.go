package platform

import (
	"os"
	"path/filepath"
	"syscall"
	"testing"
)

func TestLinuxRawSourceIdentityUnchanged(t *testing.T) {
	p, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	id, err := sourcePath(p)
	if err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(p)
	if err != nil {
		t.Fatal(err)
	}
	st := info.Sys().(*syscall.Stat_t)
	if id.Device != uint64(st.Dev) || id.Inode != st.Ino || id.VolumeUUID != "" {
		t.Fatal(id)
	}
	link := p + "-link"
	if err := os.Symlink(p, link); err != nil {
		t.Fatal(err)
	}
	defer os.Remove(link)
	if _, err := sourcePath(link); err == nil {
		t.Fatal("symlink accepted")
	}
	// Ephemeral source remains refused even with a valid raw pair.
	ephemeral, err := os.MkdirTemp("/tmp", "autobyteus-nfs-source-test-")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(ephemeral)
	if _, err := SourceIdentity(nil, ephemeral); err == nil {
		t.Fatal("temporary source accepted")
	}
}

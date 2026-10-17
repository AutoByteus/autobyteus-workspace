package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func validConnection() Connection {
	return Connection{"c87ff813-c2ce-4bd5-9208-7f6e3b7d7cf7", "192.168.1.10", "/Projects", "3", DefaultMountRoot}
}
func TestConnectionBoundary(t *testing.T) {
	c := validConnection()
	b, _ := json.Marshal(c)
	if _, err := ParseConnection(b); err != nil {
		t.Fatal(err)
	}
	for _, mutate := range []func(*Connection){func(c *Connection) { c.Endpoint = "8.8.8.8" }, func(c *Connection) { c.Endpoint = "localhost;id" }, func(c *Connection) { c.StorageID = "bad" }, func(c *Connection) { c.MountRoot = "/" }, func(c *Connection) { c.MountRoot = "/a/../b" }, func(c *Connection) { c.Protocol = "4" }, func(c *Connection) { c.Protocol = "4.1" }, func(c *Connection) { c.Export = "/a\ncommand" }} {
		c := validConnection()
		mutate(&c)
		if err := c.Validate(); err == nil {
			t.Fatalf("accepted %#v", c)
		}
	}
	for _, bad := range []string{"null", "{} {}", strings.Repeat(" ", MaxRecordBytes+1)} {
		if _, err := ParseConnection([]byte(bad)); err == nil {
			t.Fatalf("accepted %q", bad[:min(len(bad), 20)])
		}
	}
	var extended Connection
	if err := Decode([]byte(`{"unknown":true,"protocol":"3"}`), &extended); err != nil {
		t.Fatal(err)
	}
}
func TestTrustedAllowlist(t *testing.T) {
	got, err := Allowlist([]string{"192.168.1.17/24", "10.0.0.2", "10.0.0.2"})
	if err != nil || strings.Join(got, ",") != "192.168.1.0/24,10.0.0.2" {
		t.Fatal(got, err)
	}
	for _, s := range []string{"*", "0.0.0.0/0", "192.168.0.0/15", "10.0.0.0/7", "127.0.0.1", "8.8.8.8", "172.16.0.0/11", "fc00::/7"} {
		if _, err := Allowlist([]string{s}); err == nil {
			t.Fatal("accepted", s)
		}
	}
}
func TestPrivateAtomicStore(t *testing.T) {
	dir := t.TempDir()
	if err := os.Chmod(dir, 0700); err != nil {
		t.Fatal(err)
	}
	s := Store{Directory: dir, Owner: uint32(os.Getuid())}
	c := validConnection()
	if err := s.Write("attachment.json", c); err != nil {
		t.Fatal(err)
	}
	var got Connection
	if err := s.Read("attachment.json", &got); err != nil || got != c {
		t.Fatal(got, err)
	}
	info, _ := os.Stat(filepath.Join(dir, "attachment.json"))
	if info.Mode().Perm() != 0600 {
		t.Fatal(info.Mode())
	}
	outside := filepath.Join(t.TempDir(), "outside")
	_ = os.WriteFile(outside, []byte("intact"), 0600)
	_ = os.Symlink(outside, filepath.Join(dir, "link.json"))
	if err := s.Read("link.json", &got); err == nil {
		t.Fatal("followed symlink")
	}
	if err := s.Write("../escape", c); err == nil {
		t.Fatal("escaped store")
	}
	if err := s.Write("link.json", c); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(outside)
	if string(b) != "intact" {
		t.Fatal("changed symlink target")
	}
	_ = os.Chmod(dir, 0777)
	if err := s.Read("attachment.json", &got); err == nil {
		t.Fatal("accepted writable state root")
	}
}
func TestSourceMarkerConfined(t *testing.T) {
	root := t.TempDir()
	_ = os.Mkdir(filepath.Join(root, ".autobyteus-nfs"), 0700)
	p := filepath.Join(root, ".autobyteus-nfs", "storage.json")
	_ = os.WriteFile(p, []byte(`{"storageId":"c87ff813-c2ce-4bd5-9208-7f6e3b7d7cf7"}`), 0644)
	if _, err := ReadMarker(root); err != nil {
		t.Fatal(err)
	}
	_ = os.Remove(p)
	_ = os.Symlink(filepath.Join(t.TempDir(), "secret"), p)
	if _, err := ReadMarker(root); err == nil {
		t.Fatal("accepted linked marker")
	}
}

func TestSharedDescriptorFixture(t *testing.T) {
	b, err := os.ReadFile("../../testdata/attachment.json")
	if err != nil {
		t.Fatal(err)
	}
	c, err := ParseConnection(b)
	if err != nil || c.Protocol != "4.1" || c.MountRoot != DefaultMountRoot {
		t.Fatal(c, err)
	}
}

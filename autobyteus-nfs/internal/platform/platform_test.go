package platform

import (
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"strings"
	"testing"
)

func TestMountParsersKeepActualSource(t *testing.T) {
	raw := `26 24 0:31 / /Volumes/shared\040projects rw - nfs4 :/autobyteus/test rw,vers=4.1,addr=192.168.1.8,hard`
	got := ParseLinuxMounts(raw)
	if len(got) != 1 || got[0].Target != "/Volumes/shared projects" || got[0].Endpoint != "192.168.1.8" || got[0].Protocol != "4.1" {
		t.Fatal(got)
	}
	mac := ParseDarwinMounts("192.168.1.8:/Users/u/source on /Volumes/shared projects (nfs, nodev, nosuid)\n/dev/disk3 on / (apfs, local)")
	if len(mac) != 2 || mac[0].Export != "/Users/u/source" || mac[0].Target != "/Volumes/shared projects" {
		t.Fatal(mac)
	}
	c := config.Connection{Endpoint: "192.168.1.8", Export: "/autobyteus/test", Protocol: "4.1"}
	if !Matches(&got[0], c) {
		t.Fatal("did not match observed mount")
	}
	c.Endpoint = "192.168.1.9"
	if Matches(&got[0], c) {
		t.Fatal("accepted wrong source")
	}
}
func TestMountPolicy(t *testing.T) {
	for _, linux := range []bool{true, false} {
		for _, protocol := range []string{"3", "4.1"} {
			s := MountOptions(protocol, linux)
			if !strings.Contains(s, "hard") || strings.Contains(s, "soft") || !strings.Contains(s, "vers="+protocol) {
				t.Fatal(s)
			}
		}
	}
	if !strings.Contains(MountOptions("3", true), "nolock") || !strings.Contains(MountOptions("3", false), "locallocks") {
		t.Fatal("v3 local lock contract changed")
	}
}
func TestSourceGuardrails(t *testing.T) {
	for _, s := range []string{"/", "/Users/u", "/Users", "/Users/u/.codex/skills", "/Users/u/.autobyteus/data", "/tmp/source", "/Volumes/autobyteus-shared/source"} {
		if err := ValidateSourcePath(s, config.DefaultMountRoot, "/Users/u"); err == nil {
			t.Fatal("accepted", s)
		}
	}
	if err := ValidateSourcePath("/Users/u/projects", config.DefaultMountRoot, "/Users/u"); err != nil {
		t.Fatal(err)
	}
}
func TestJobUsesOnlyFixedBinaryAndNoApplication(t *testing.T) {
	for _, system := range []string{"darwin", "linux"} {
		s := JobDefinition(system, "/fixed/libexec/autobyteus-nfs", "/fixed")
		if !strings.Contains(s, "/fixed/libexec/autobyteus-nfs") || strings.Contains(s, ".local") || strings.Contains(s, "autobyteus-server") {
			t.Fatal(s)
		}
	}
}
func TestAdministrativeLock(t *testing.T) {
	dir := t.TempDir()
	first, err := Lock(dir)
	if err != nil {
		t.Fatal(err)
	}
	if second, e := Lock(dir); e == nil {
		second.Close()
		t.Fatal("duplicate administrative attempt")
	}
	first.Close()
	next, err := Lock(dir)
	if err != nil {
		t.Fatal(err)
	}
	next.Close()
}

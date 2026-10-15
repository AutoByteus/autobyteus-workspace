package backend

import (
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"strings"
	"testing"
)

func hosted() config.HostedFilesystem {
	return config.HostedFilesystem{InstallationID: "c87ff813-c2ce-4bd5-9208-7f6e3b7d7cf7", StorageID: "5544dadc-86b0-43ba-9799-74728b442227", Source: "/Users/user/Shared Projects", Backend: "apple", DataUID: 501, DataGID: 20, Allowlist: []string{"192.168.1.0/24", "10.0.0.3"}}
}
func TestAppleExportAndConflictingGlobalSettings(t *testing.T) {
	h := hosted()
	p, err := PlanApple(h, "# existing comment\n", "# unrelated setting\n")
	if err != nil {
		t.Fatal(err)
	}
	for _, part := range []string{`"/Users/user/Shared Projects" -mapall=501:20 -network 192.168.1.0 -mask 255.255.255.0`, "10.0.0.3", "# BEGIN AutoByteus NFS"} {
		if !strings.Contains(p.ExportBlock, part) {
			t.Fatal(p.ExportBlock)
		}
	}
	wantExports, wantSettings := AppendBlock("# existing comment\n", p.ExportBlock), AppendBlock("# unrelated setting\n", p.SettingsBlock)
	for _, files := range [][2]string{{"# existing comment\n", "# unrelated setting\n"}, {"# existing comment\n", wantSettings}, {wantExports, "# unrelated setting\n"}, {wantExports, wantSettings}} {
		e, s, err := p.NextConfiguration(files[0], files[1])
		if err != nil || e != wantExports || s != wantSettings {
			t.Fatal("partial apply did not resume exactly", err)
		}
	}
	if _, _, err := p.NextConfiguration(wantExports+"# external change\n", wantSettings); err == nil {
		t.Fatal("overwrote external edit")
	}
	if _, err := PlanApple(h, "/other -ro 10.0.0.2\n", ""); err == nil {
		t.Fatal("changed global settings under unrelated export")
	}
	if _, err := PlanApple(h, "", "nfs.server.mount.require_resv_port=1\n"); err == nil {
		t.Fatal("weakened existing reserved-port policy")
	}
	joined := AppendBlock("# original", p.ExportBlock)
	out, err := RemoveExact(joined, p.ExportBlock)
	if err != nil || out != "# original\n" {
		t.Fatal(out, err)
	}
	if _, err := RemoveExact(strings.ReplaceAll(joined, "501:20", "502:20"), p.ExportBlock); err == nil {
		t.Fatal("removed externally edited export")
	}
}
func TestGaneshaPolicyAndPersistentRecovery(t *testing.T) {
	h := hosted()
	h.Backend = "ganesha-native"
	h.Source = "/srv/projects"
	for _, container := range []bool{true, false} {
		s, err := GaneshaConfig(h, "/var/lib/autobyteus-nfs", container)
		if err != nil {
			t.Fatal(err)
		}
		for _, part := range []string{"Access_Type = None;", "Squash = All_Squash;", "SecType = sys;", "Anonymous_uid = 501;", "Minor_Versions = 1;", "RecoveryRoot =", "Protocols = 4;"} {
			if !strings.Contains(s, part) {
				t.Fatal(s)
			}
		}
		export := strings.SplitN(s, "EXPORT {", 2)[1]
		beforeClient := strings.SplitN(export, " CLIENT {", 2)[0]
		if strings.Count(s, "Attr_Expiration_Time") != 1 || !strings.Contains(beforeClient, "Attr_Expiration_Time = 0;") {
			t.Fatal("fresh source attributes require one EXPORT-level zero expiry", s)
		}
		if strings.Contains(s, "No_Root_Squash") || strings.Contains(s, "Clients = *") {
			t.Fatal(s)
		}
		if container && !strings.Contains(s, `Path = "/export"`) {
			t.Fatal("container hides/moves source")
		}
	}
}

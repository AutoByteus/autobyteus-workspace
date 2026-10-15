package cli

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/setup"
)

func TestExplicitNoTTYInputsAndNoShellEvaluation(t *testing.T) {
	o, err := Parse([]string{"create", "--source", "/srv/projects", "--endpoint", "192.168.1.5", "--allow", "192.168.1.0/24", "--backend", "ganesha-native", "--nodes", "none", "--yes"})
	if err != nil {
		t.Fatal(err)
	}
	req, err := collect(o, &Terminal{})
	if err != nil || req.Source != "/srv/projects" || req.Connection.MountRoot != "/Volumes/autobyteus-shared" {
		t.Fatal(req, err)
	}
	if _, err = collect(Options{Action: "connect", Connection: "$(touch /tmp/nope)"}, &Terminal{}); err == nil {
		t.Fatal("accepted shell input")
	}
	if _, err = collect(Options{Action: "create"}, &Terminal{}); err == nil {
		t.Fatal("missing required source did not fail")
	}
}
func TestReleaseManifestMustMatchAndQualifyActualArchitecture(t *testing.T) {
	metadata := setup.Release{Version: "v1.2.3", QualifiedTargets: []string{runtime.GOOS + "-" + runtime.GOARCH}, SourceHash: "fixture"}
	p := filepath.Join(t.TempDir(), "release.json")
	write := func(v setup.Release) {
		b, _ := json.Marshal(v)
		if err := os.WriteFile(p, b, 0600); err != nil {
			t.Fatal(err)
		}
	}
	write(metadata)
	if err := VerifyRelease(p, metadata); err != nil {
		t.Fatal(err)
	}
	unavailable := metadata
	unavailable.QualifiedTargets = nil
	write(unavailable)
	if err := VerifyRelease(p, unavailable); err == nil {
		t.Fatal("unqualified release accepted")
	}
	write(metadata)
	metadata.Version = "v2.0.0"
	if err := VerifyRelease(p, metadata); err == nil {
		t.Fatal("manifest/binary mismatch accepted")
	}
}

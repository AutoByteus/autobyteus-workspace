package cli

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/backend"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/setup"
)

// Existing complete manifest equality includes both architecture package/source
// identities; no independent unauthenticated sidecar metadata is accepted.
func TestEngineIdentityParticipatesInVerifiedReleaseEquality(t *testing.T) {
	base := setup.Release{Version: "fixture", QualifiedTargets: []string{runtime.GOOS + "-" + runtime.GOARCH}, Engine: &backend.EngineManifest{
		Source:        backend.EngineSource{PatchCommit: "reviewed-commit", RecipeSHA256: "reviewed-recipe"},
		Architectures: map[string]backend.EngineArchitecture{"arm64": {Packages: []backend.EnginePackage{{EngineFile: backend.EngineFile{File: "fixture.deb", SHA256: "reviewed-bytes", Size: 42}, Name: "nfs-ganesha", Version: "corrected", Architecture: "arm64"}}}},
	}}
	path := filepath.Join(t.TempDir(), "release.json")
	b, _ := json.Marshal(base)
	os.WriteFile(path, b, 0600)
	if err := VerifyRelease(path, base); err != nil {
		t.Fatal(err)
	}
	for _, kind := range []string{"bytes", "recipe", "architecture", "source-removed"} {
		t.Run(kind, func(t *testing.T) {
			var changed setup.Release
			json.Unmarshal(b, &changed)
			switch kind {
			case "bytes":
				p := changed.Engine.Architectures["arm64"]
				p.Packages[0].SHA256 = "different"
				changed.Engine.Architectures["arm64"] = p
			case "recipe":
				changed.Engine.Source.RecipeSHA256 = "different"
			case "architecture":
				changed.Engine.Architectures["amd64"] = changed.Engine.Architectures["arm64"]
			case "source-removed":
				changed.Engine = nil
			}
			if err := VerifyRelease(path, changed); err == nil {
				t.Fatal("partial engine metadata equality accepted")
			}
		})
	}
}

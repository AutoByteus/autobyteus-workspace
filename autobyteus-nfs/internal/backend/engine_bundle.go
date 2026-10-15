package backend

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"io/fs"
	"regexp"
)

const engineVersion = "4.3-8ubuntu1+autobyteus1"
const engineCommit = "98eb77c4fd94effa6882b214698a77752ec79f6e"
const maxEnginePackage = 40 << 20

// EngineManifest is immutable release provenance, not workspace/lifecycle state.
// Both architecture identities are shared by all release binaries and Docker.
type EngineManifest struct {
	Source        EngineSource                  `json:"source"`
	Architectures map[string]EngineArchitecture `json:"architectures"`
}
type EngineSource struct {
	Version         string       `json:"version"`
	Files           []EngineFile `json:"files"`
	PatchCommit     string       `json:"patchCommit"`
	PatchSHA256     string       `json:"patchSha256"`
	RecipeSHA256    string       `json:"recipeSha256"`
	SourceDateEpoch int64        `json:"sourceDateEpoch"`
	BuildBase       string       `json:"buildBase"`
}
type EngineFile struct {
	File   string `json:"file"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}
type EnginePackage struct {
	EngineFile
	Name         string `json:"name"`
	Version      string `json:"version"`
	Architecture string `json:"architecture"`
}
type EngineArchitecture struct {
	Packages            []EnginePackage `json:"packages"`
	CorrespondingSource EngineFile      `json:"correspondingSource"`
	BuildInventory      EngineFile      `json:"buildInventory"`
}

var engineFilename = regexp.MustCompile(`^[A-Za-z0-9_.+~-]+$`)
var digestPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

type enginePayload struct {
	identity EnginePackage
	bytes    []byte
}

// All bytes are checked before creating staging or invoking any package command.
// The only production FS is embedded in the same verified/root-installed binary.
func readEngineBundle(manifest *EngineManifest, arch string, assets fs.FS) ([]enginePayload, error) {
	if manifest == nil || manifest.Source.Version != "4.3-8ubuntu1" || manifest.Source.PatchCommit != engineCommit ||
		!digestPattern.MatchString(manifest.Source.PatchSHA256) || !digestPattern.MatchString(manifest.Source.RecipeSHA256) ||
		len(manifest.Source.Files) != 3 || manifest.Source.SourceDateEpoch <= 0 {
		return nil, errors.New("release lacks corrected engine provenance")
	}
	for _, f := range manifest.Source.Files {
		if !validEngineFile(f) {
			return nil, errors.New("invalid engine source artifact identity")
		}
	}
	pair, ok := manifest.Architectures[arch]
	if !ok || (arch != "amd64" && arch != "arm64") || len(pair.Packages) != 2 {
		return nil, errors.New("release lacks matching architecture engine pair")
	}
	if !validEngineFile(pair.CorrespondingSource) || !validEngineFile(pair.BuildInventory) {
		return nil, errors.New("engine corresponding source/build inventory missing")
	}
	entries, err := fs.ReadDir(assets, "engine-assets")
	if err != nil {
		return nil, err
	}
	expected := map[string]bool{"README": true}
	var result []enginePayload
	for i, name := range []string{"nfs-ganesha", "nfs-ganesha-vfs"} {
		p := pair.Packages[i]
		filename := name + "_" + engineVersion + "_" + arch + ".deb"
		if p.Name != name || p.Version != engineVersion || p.Architecture != arch || p.File != filename ||
			p.Size <= 0 || p.Size > maxEnginePackage || !digestPattern.MatchString(p.SHA256) {
			return nil, errors.New("invalid corrected engine package identity")
		}
		info, err := fs.Stat(assets, "engine-assets/"+filename)
		if err != nil {
			return nil, err
		}
		if !info.Mode().IsRegular() || info.Size() != p.Size {
			return nil, errors.New("engine package size/type mismatch")
		}
		b, err := fs.ReadFile(assets, "engine-assets/"+filename)
		if err != nil {
			return nil, err
		}
		if fmt.Sprintf("%x", sha256.Sum256(b)) != p.SHA256 {
			return nil, errors.New("engine package digest mismatch")
		}
		expected[filename] = true
		result = append(result, enginePayload{p, b})
	}
	for _, entry := range entries {
		if entry.IsDir() || !expected[entry.Name()] {
			return nil, errors.New("unexpected embedded engine member")
		}
	}
	return result, nil
}

func validEngineFile(f EngineFile) bool {
	return engineFilename.MatchString(f.File) && f.File != "." && f.File != ".." && digestPattern.MatchString(f.SHA256) && f.Size > 0 && f.Size <= maxEnginePackage
}

package backend

import (
	"crypto/sha256"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func fixtureBundle() (*EngineManifest, fstest.MapFS) {
	f := EngineFile{File: "source.tar.gz", SHA256: strings.Repeat("a", 64), Size: 1}
	m := &EngineManifest{Source: EngineSource{Version: "4.3-8ubuntu1", Files: []EngineFile{f, f, f}, PatchCommit: engineCommit, PatchSHA256: f.SHA256, RecipeSHA256: f.SHA256, SourceDateEpoch: 1791936000, BuildBase: "fixture"}, Architectures: map[string]EngineArchitecture{}}
	pair := EngineArchitecture{CorrespondingSource: f, BuildInventory: f}
	assets := fstest.MapFS{"engine-assets/README": {Data: []byte("sentinel")}}
	for _, name := range []string{"nfs-ganesha", "nfs-ganesha-vfs"} {
		data := []byte("package fixture " + name)
		p := EnginePackage{EngineFile: EngineFile{File: name + "_" + engineVersion + "_arm64.deb", SHA256: fmt.Sprintf("%x", sha256.Sum256(data)), Size: int64(len(data))}, Name: name, Version: engineVersion, Architecture: "arm64"}
		pair.Packages = append(pair.Packages, p)
		assets["engine-assets/"+p.File] = &fstest.MapFile{Data: data}
	}
	m.Architectures["arm64"] = pair
	return m, assets
}
func TestEngineBundleExactPairAndRefusals(t *testing.T) {
	for _, name := range []string{"valid", "missing", "truncated", "digest", "wrong-arch", "version", "name", "member", "size", "extra", "source", "provenance"} {
		t.Run(name, func(t *testing.T) {
			m, a := fixtureBundle()
			b := m.Architectures["arm64"]
			p := &b.Packages[0]
			file := "engine-assets/" + p.File
			switch name {
			case "missing":
				delete(a, file)
			case "truncated":
				a[file].Data = a[file].Data[:3]
			case "digest":
				a[file].Data[0] = 'x'
			case "wrong-arch":
				p.Architecture = "amd64"
			case "version":
				p.Version = "4.3-8ubuntu1"
			case "name":
				p.Name = "nfs-ganesha-ceph"
			case "member":
				p.File = "../outside.deb"
			case "size":
				p.Size = maxEnginePackage + 1
			case "extra":
				a["engine-assets/foreign.deb"] = &fstest.MapFile{Data: []byte("foreign")}
			case "source":
				b.CorrespondingSource = EngineFile{}
			case "provenance":
				m.Source.PatchCommit = "old"
			}
			m.Architectures["arm64"] = b
			got, err := readEngineBundle(m, "arm64", a)
			if name == "valid" {
				if err != nil || len(got) != 2 {
					t.Fatal(got, err)
				}
			} else if err == nil {
				t.Fatal("accepted invalid bundle")
			}
		})
	}
	m, a := fixtureBundle()
	for _, arch := range []string{"amd64", "386", ""} {
		if _, err := readEngineBundle(m, arch, a); err == nil {
			t.Fatal("wrong architecture accepted")
		}
	}
	if _, err := readEngineBundle(nil, "arm64", a); err == nil {
		t.Fatal("no manifest accepted")
	}
	r := &reloadRunner{}
	if err := InstallUbuntuPackages(r, map[string]string{"nfs-common": "pin"}, nil, true, t.TempDir()); err == nil || r.calls != 0 {
		t.Fatal("missing bundle reached administrative commands", err, r.calls)
	}
}
func TestEngineStagingModesAndExactCleanup(t *testing.T) {
	root := t.TempDir()
	m, a := fixtureBundle()
	payload, err := readEngineBundle(m, "arm64", a)
	if err != nil {
		t.Fatal(err)
	}
	sentinel := filepath.Join(root, "keep")
	os.WriteFile(sentinel, []byte("keep"), 0600)
	paths, cleanup, err := stageEngine(root, payload)
	if err != nil {
		t.Fatal(err)
	}
	for i, path := range paths {
		info, e := os.Stat(path)
		if e != nil || info.Mode().Perm() != 0600 {
			t.Fatal(info, e)
		}
		dir, e := os.Stat(filepath.Dir(path))
		if e != nil || dir.Mode().Perm() != 0700 {
			t.Fatal(dir, e)
		}
		b, e := os.ReadFile(path)
		if e != nil || string(b) != string(payload[i].bytes) {
			t.Fatal("staged bytes changed")
		}
	}
	// Exact cleanup never recursively removes externally added state.
	external := filepath.Join(filepath.Dir(paths[0]), "external")
	os.WriteFile(external, []byte("retain"), 0600)
	if err := cleanup(); err == nil {
		t.Fatal("extra state silently erased")
	}
	if _, err := os.Stat(external); err != nil {
		t.Fatal(err)
	}
	os.Remove(external)
	if err := cleanup(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(sentinel); err != nil {
		t.Fatal("unrelated sibling deleted")
	}
	// Creation failure cleans only its exact directory, including a partial pair.
	payload[1] = payload[0]
	if _, _, err := stageEngine(root, payload); err == nil {
		t.Fatal("duplicate staging file accepted")
	}
	entries, _ := fs.ReadDir(os.DirFS(root), ".")
	if len(entries) != 1 || entries[0].Name() != "keep" {
		t.Fatal(entries)
	}
}

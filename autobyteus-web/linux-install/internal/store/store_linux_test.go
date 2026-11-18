package store

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"autobyteus.local/desktop/linux-install/internal/imagefile"
	"autobyteus.local/desktop/linux-install/internal/protocol"
	"autobyteus.local/desktop/linux-install/internal/release"
)

func signed(t *testing.T, key ed25519.PrivateKey, version string) (release.Record, protocol.Request, []byte) {
	t.Helper()
	content := []byte("test-only inert payload " + version)
	channel, err := release.VersionChannel(version)
	if err != nil {
		t.Fatal(err)
	}
	r := release.Record{Format: 1, Product: release.Product, Artifact: "AppImage", OS: "linux", Arch: "x64", Version: version, Channel: channel, Size: int64(len(content)), SHA256: fmt.Sprintf("%x", sha256.Sum256(content)), MinWriter: 1}
	data := r.Bytes()
	return r, protocol.Request{Operation: "stage", Record: data, Signature: ed25519.Sign(key, data), Channel: "beta"}, content
}
func TestAuthenticatedInodeTransactions(t *testing.T) {
	public, private, _ := ed25519.GenerateKey(nil)
	directory := t.TempDir()
	first, q, content := signed(t, private, "1.5.13")
	live := filepath.Join(directory, "AutoByteus.AppImage")
	f, err := os.OpenFile(live, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.Write(content); err != nil {
		t.Fatal(err)
	}
	if err = imagefile.SetIdentity(f, q.Record, q.Signature); err != nil {
		t.Fatal(err)
	}
	f.Close()
	s, err := Open(directory, "x64", public)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	if _, err = Open(directory, "x64", public); err == nil {
		t.Fatal("concurrent writer admitted")
	}
	old, err := imagefile.Open(live)
	if err != nil {
		t.Fatal(err)
	}
	defer old.Close()
	baseline := first
	for _, version := range []string{"1.5.14-beta.1", "1.5.14"} {
		candidate, request, payload := signed(t, private, version)
		request.ExpectedDigest = baseline.SHA256
		receipt, err := s.Handle(request, bytes.NewReader(payload))
		if err != nil {
			t.Fatal(err)
		}
		current, _, err := s.current()
		if err != nil || current.SHA256 != baseline.SHA256 {
			t.Fatal("staging changed live identity", err)
		}
		// File age is deliberately irrelevant to a current transaction, even days later.
		oldTime := time.Now().Add(-72 * time.Hour)
		if err = os.Chtimes(s.stage.file, oldTime, oldTime); err != nil {
			t.Fatal(err)
		}
		activation := protocol.Request{Operation: "activate", StageID: receipt.StageID, ExpectedDigest: baseline.SHA256, Channel: "beta"}
		if _, err = s.Handle(activation, bytes.NewReader(nil)); err != nil {
			t.Fatal(err)
		}
		if _, err = s.Handle(activation, bytes.NewReader(nil)); !errors.Is(err, ErrStageGone) {
			t.Fatal("consumed receipt was not reported gone", err)
		}
		current, _, err = s.current()
		if err != nil || current.SHA256 != candidate.SHA256 {
			t.Fatal("activation did not commit identity", err)
		}
		baseline = candidate
	}
	original, _, _, err := imagefile.Identity(old, public, "x64")
	if err != nil || original.SHA256 != first.SHA256 {
		t.Fatal("old fd identity changed", err)
	}
	for _, scenario := range []string{"tampered", "wrong-key", "rollback", "channel", "stale"} {
		t.Run(scenario, func(t *testing.T) {
			_, request, payload := signed(t, private, "1.5.15-beta.1")
			request.ExpectedDigest = baseline.SHA256
			switch scenario {
			case "tampered":
				payload[0] ^= 1
			case "wrong-key":
				_, other, _ := ed25519.GenerateKey(nil)
				request.Signature = ed25519.Sign(other, request.Record)
			case "rollback":
				_, request, payload = signed(t, private, "1.5.13")
				request.ExpectedDigest = baseline.SHA256
			case "channel":
				request.Channel = "stable"
			case "stale":
				request.ExpectedDigest = first.SHA256
			}
			if _, err := s.Handle(request, bytes.NewReader(payload)); err == nil {
				t.Fatal("invalid release admitted")
			}
			current, _, err := s.current()
			if err != nil || current.SHA256 != baseline.SHA256 {
				t.Fatal("refusal changed committed image", err)
			}
		})
	}
	_, request, payload := signed(t, private, "1.5.15")
	request.ExpectedDigest = baseline.SHA256
	receipt, err := s.Handle(request, bytes.NewReader(payload))
	if err != nil {
		t.Fatal(err)
	}
	activation := protocol.Request{Operation: "activate", StageID: receipt.StageID, ExpectedDigest: baseline.SHA256, Channel: "beta"}
	if _, err = s.Handle(protocol.Request{Operation: "discard", StageID: receipt.StageID}, bytes.NewReader(nil)); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Handle(activation, bytes.NewReader(nil)); !errors.Is(err, ErrStageGone) {
		t.Fatal("discard did not invalidate receipt", err)
	}
	if _, err = s.Handle(request, bytes.NewReader(payload)); err != nil {
		t.Fatal("same release cannot re-stage", err)
	}
	if _, err = s.Handle(activation, bytes.NewReader(nil)); !errors.Is(err, ErrStageGone) {
		t.Fatal("superseded receipt accepted", err)
	}
	wrongChannel := activation
	wrongChannel.Channel = "stable"
	if _, err = s.Handle(wrongChannel, bytes.NewReader(nil)); err == nil || errors.Is(err, ErrStageGone) {
		t.Fatal("channel refusal treated as retryable", err)
	}
	s.Close()
	reopened, err := Open(directory, "x64", public)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	if _, err = reopened.Handle(activation, bytes.NewReader(nil)); !errors.Is(err, ErrStageGone) {
		t.Fatal("reset receipt accepted", err)
	}
	pending, _ := filepath.Glob(filepath.Join(directory, ".pending-*"))
	if len(pending) != 0 {
		t.Fatal("orphan stage survived restart")
	}
	current, _, err := reopened.current()
	if err != nil || current.SHA256 != baseline.SHA256 {
		t.Fatal("restart changed committed image", err)
	}
}
func TestMissingIdentityRefusesBaseline(t *testing.T) {
	directory := t.TempDir()
	public, _, _ := ed25519.GenerateKey(nil)
	if err := os.WriteFile(filepath.Join(directory, "AutoByteus.AppImage"), []byte("untrusted"), 0555); err != nil {
		t.Fatal(err)
	}
	if s, err := Open(directory, "x64", public); err == nil {
		s.Close()
		t.Fatal("unsigned baseline admitted")
	}
}

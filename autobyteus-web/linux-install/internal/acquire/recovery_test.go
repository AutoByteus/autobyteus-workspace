package acquire

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"

	"autobyteus.local/desktop/linux-install/internal/release"
)

// Run as an ordinary user, exactly as first-install acquisition runs. Exercise Fetch
// with its normal pinned URLs; only stub the HTTP wire, never the verifier or file.
func TestPreAuthorizationRecovery(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("acquisition is forbidden as root")
	}
	key, signer, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	content := []byte("inert test payload")
	sum := sha256.Sum256(content)
	r := release.Record{Format: 1, Product: release.Product, Artifact: "AppImage", OS: "linux", Arch: "x64", Version: "1.5.13", Channel: "stable", Size: int64(len(content)), SHA256: hex.EncodeToString(sum[:]), MinWriter: 1}
	id := Identity{r.Version, r.Arch, "AutoByteus/autobyteus-workspace", "AutoByteus_personal_linux-x64-1.5.13.AppImage"}
	address, err := id.URL()
	if err != nil {
		t.Fatal(err)
	}
	orig := http.DefaultTransport
	t.Cleanup(func() { http.DefaultTransport = orig })
	for _, tc := range []struct {
		name, reason, action string
		requests             int
	}{
		{"missing-record", "unavailable", "Try again later", 1}, {"missing-signature", "unavailable", "Try again later", 2},
		{"offline", "cannot reach", "reconnect and retry", 1}, {"interrupted-read", "cannot reach", "reconnect and retry", 1},
		{"oversize", "could not verify", "official AutoByteus releases page", 1},
		{"signature", "could not verify", "official AutoByteus releases page", 2},
		{"version", "could not verify", "official AutoByteus releases page", 2},
		{"length", "could not verify", "official AutoByteus releases page", 2},
		{"same-length-digest", "could not verify", "official AutoByteus releases page", 2},
		{"valid", "", "", 2},
	} {
		t.Run(tc.name, func(t *testing.T) {
			record := r
			if tc.name == "version" {
				record.Version = "1.5.14"
			}
			if tc.name == "length" {
				record.Size++
			}
			if tc.name == "same-length-digest" {
				record.SHA256 = strings.Repeat("0", 64)
			}
			data := record.Bytes()
			sig := ed25519.Sign(signer, data)
			encoded := []byte(base64.StdEncoding.EncodeToString(sig))
			if tc.name == "signature" {
				encoded = []byte(base64.StdEncoding.EncodeToString(make([]byte, 64)))
			}
			if tc.name == "oversize" {
				data = bytes.Repeat([]byte("x"), release.MaxRecord+1)
			}
			f, err := os.CreateTemp(t.TempDir(), "renamed-*.AppImage")
			if err != nil {
				t.Fatal(err)
			}
			defer f.Close()
			if _, err = f.Write(content); err != nil {
				t.Fatal(err)
			}
			requests := 0
			http.DefaultTransport = transport(func(req *http.Request) (*http.Response, error) {
				requests++
				uri, payload := address, data
				if requests == 2 {
					uri, payload = address+".sig", encoded
				}
				if requests > 2 || req.Method != "GET" || req.URL.String() != uri {
					t.Fatalf("unexpected request %s %s", req.Method, req.URL)
				}
				if tc.name == "offline" {
					return nil, errors.New("private-test-value")
				}
				code := http.StatusOK
				var body io.Reader = bytes.NewReader(payload)
				if tc.name == "missing-record" || (tc.name == "missing-signature" && requests == 2) {
					code = http.StatusNotFound
					body = strings.NewReader("private-test-value")
				}
				if tc.name == "interrupted-read" {
					body = failingBody{}
				}
				return &http.Response{StatusCode: code, Header: make(http.Header), Body: io.NopCloser(body), Request: req}, nil
			})
			got, signature, err := Fetch(context.Background(), id, key, f)
			if requests != tc.requests {
				t.Fatalf("got %d requests", requests)
			}
			if tc.name == "valid" {
				pos, seekErr := f.Seek(0, io.SeekCurrent)
				if err != nil || seekErr != nil || pos != 0 || !bytes.Equal(got, data) || !bytes.Equal(signature, sig) {
					t.Fatal("verified result or rewind changed", err, seekErr, pos)
				}
				return
			}
			if err == nil || got != nil || signature != nil {
				t.Fatal("refusal returned a usable result")
			}
			msg := err.Error()
			if !strings.Contains(msg, tc.reason) || !strings.Contains(msg, tc.action) || strings.Contains(msg, "private-test-value") || len(msg) > 256 {
				t.Fatal("missing or unsafe recovery guidance:", msg)
			}
		})
	}
}

type failingBody struct{}

func (failingBody) Read([]byte) (int, error) { return 0, errors.New("private-test-value") }

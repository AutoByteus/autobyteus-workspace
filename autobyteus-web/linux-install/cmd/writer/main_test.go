package main

// Local transport integration: go test -v ./cmd/writer (Linux, nonroot, xattr-capable temp FS).
// Production socket handler + store; ephemeral keys and inert payloads, no systemd/root/app launch.
import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"autobyteus.local/desktop/linux-install/internal/imagefile"
	"autobyteus.local/desktop/linux-install/internal/protocol"
	"autobyteus.local/desktop/linux-install/internal/release"
	"autobyteus.local/desktop/linux-install/internal/store"
)

func signedPayload(t *testing.T, key ed25519.PrivateKey, version string) (protocol.Request, []byte, release.Record) {
	t.Helper()
	payload := []byte("socket integration inert " + version)
	channel, err := release.VersionChannel(version)
	if err != nil {
		t.Fatal(err)
	}
	r := release.Record{Format: 1, Product: release.Product, Artifact: "AppImage", OS: "linux", Arch: "x64", Version: version, Channel: channel, Size: int64(len(payload)), SHA256: fmt.Sprintf("%x", sha256.Sum256(payload)), MinWriter: 1}
	data := r.Bytes()
	return protocol.Request{Operation: "stage", Record: data, Signature: ed25519.Sign(key, data), Channel: "beta"}, payload, r
}

func socketRequest(t *testing.T, images *store.Store, uid uint32, request []byte) (protocol.Response, error) {
	t.Helper()
	listener, err := net.ListenUnix("unix", &net.UnixAddr{Name: filepath.Join(t.TempDir(), "writer.sock"), Net: "unix"})
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	done := make(chan struct{})
	go func() {
		defer close(done)
		c, e := listener.Accept()
		if e == nil {
			handle(c, uid, images)
		}
	}()
	c, err := net.DialUnix("unix", nil, listener.Addr().(*net.UnixAddr))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if err = c.SetDeadline(time.Now().Add(5 * time.Second)); err != nil {
		t.Fatal(err)
	}
	if _, err = c.Write(request); err != nil {
		return protocol.Response{}, err
	}
	// This is the native client's real request completion operation, not a timing race.
	if err = c.CloseWrite(); err != nil {
		return protocol.Response{}, err
	}
	var response protocol.Response
	err = json.NewDecoder(c).Decode(&response)
	c.Close()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("handler did not terminate")
	}
	return response, err
}

func TestWriterSocketTransactions(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("run as normal nonroot identity")
	}
	pub, key, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	directory := t.TempDir()
	first, payload, baseline := signedPayload(t, key, "1.5.13")
	live := filepath.Join(directory, "AutoByteus.AppImage")
	f, err := os.OpenFile(live, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.Write(payload); err != nil {
		t.Fatal(err)
	}
	if err = imagefile.SetIdentity(f, first.Record, first.Signature); err != nil {
		t.Fatal(err)
	}
	if err = f.Close(); err != nil {
		t.Fatal(err)
	}
	images, err := store.Open(directory, "x64", pub)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if images != nil {
			images.Close()
		}
	}()
	call := func(q protocol.Request, payload []byte) protocol.Response {
		t.Helper()
		raw, e := json.Marshal(q)
		if e != nil {
			t.Fatal(e)
		}
		response, e := socketRequest(t, images, uint32(os.Getuid()), append(append(raw, '\n'), payload...))
		if e != nil {
			t.Fatal(e)
		}
		return response
	}
	status := func() release.Record {
		t.Helper()
		response := call(protocol.Request{Operation: "status"}, nil)
		if response.Error != "" {
			t.Fatal(response.Error)
		}
		r, e := release.Verify(response.Record, response.Signature, pub, "x64")
		if e != nil {
			t.Fatal(e)
		}
		return r
	}
	// An unauthorized peer must receive no identity or reply. The kernel-reported UID
	// is real; the configured installation UID differs. No identity switching needed.
	raw := []byte("{\"operation\":\"status\"}\n")
	response, err := socketRequest(t, images, uint32(os.Getuid()+1), raw)
	if err == nil || len(response.Record) != 0 {
		t.Fatal("wrong peer obtained writer identity", response, err)
	}
	for _, bad := range []string{"{\"operation\":\"status\",\"destination\":\"/tmp/other\"}\n", "{} {}\n"} {
		response, err := socketRequest(t, images, uint32(os.Getuid()), []byte(bad))
		if err != nil || response.Error == "" {
			t.Fatal("malformed request not refused", response, err)
		}
	}
	for _, version := range []string{"1.5.14-beta.1", "1.5.14"} {
		q, body, candidate := signedPayload(t, key, version)
		q.ExpectedDigest = baseline.SHA256
		bad := append([]byte(nil), body...)
		bad[0] ^= 1
		if response := call(q, bad); response.Error == "" {
			t.Fatal("tampered bytes admitted")
		}
		if status().SHA256 != baseline.SHA256 {
			t.Fatal("refusal changed live inode")
		}
		receipt := call(q, body)
		if receipt.Error != "" || receipt.StageID == "" || receipt.ExpectedDigest != baseline.SHA256 {
			t.Fatal("no verified receipt", receipt)
		}
		if status().SHA256 != baseline.SHA256 {
			t.Fatal("stage activated early")
		}
		activate := protocol.Request{Operation: "activate", StageID: receipt.StageID, ExpectedDigest: baseline.SHA256, Channel: "beta"}
		if response := call(activate, nil); response.Error != "" {
			t.Fatal(response.Error)
		}
		if status().SHA256 != candidate.SHA256 {
			t.Fatal("socket activation not committed")
		}
		if response := call(activate, nil); response.Code != protocol.StageGone {
			t.Fatal("consumed receipt lost typed classification", response)
		}
		if response := call(q, body); response.Error == "" {
			t.Fatal("replay admitted")
		}
		baseline = candidate
	}
	q, body, _ := signedPayload(t, key, "1.5.15")
	q.ExpectedDigest = baseline.SHA256
	receipt := call(q, body)
	if receipt.Error != "" {
		t.Fatal(receipt.Error)
	}
	if err = images.Close(); err != nil {
		t.Fatal(err)
	}
	images, err = store.Open(directory, "x64", pub)
	if err != nil {
		t.Fatal(err)
	}
	response = call(protocol.Request{Operation: "activate", StageID: receipt.StageID, ExpectedDigest: baseline.SHA256, Channel: "beta"}, nil)
	if response.Code != protocol.StageGone {
		t.Fatal("restart did not invalidate receipt", response)
	}
	if status().SHA256 != baseline.SHA256 {
		t.Fatal("restart changed live inode")
	}
	if response = call(q, body); response.Error != "" || response.StageID == "" {
		t.Fatal("retry cannot restage", response)
	}
}

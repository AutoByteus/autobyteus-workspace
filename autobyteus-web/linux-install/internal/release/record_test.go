package release

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"testing"
)

func TestGoldenRecords(t *testing.T) {
	data, err := os.ReadFile("../../contract/fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture struct {
		PublicKey string
		Cases     []struct {
			Name, Record, Signature string
			Valid                   bool
		}
	}
	if err = json.Unmarshal(data, &fixture); err != nil {
		t.Fatal(err)
	}
	key, _ := base64.StdEncoding.DecodeString(fixture.PublicKey)
	for _, c := range fixture.Cases {
		t.Run(c.Name, func(t *testing.T) {
			record, _ := base64.StdEncoding.DecodeString(c.Record)
			sig, e := DecodeSignature([]byte(c.Signature))
			if e == nil {
				_, e = Verify(record, sig, key, "x64")
			}
			if (e == nil) != c.Valid {
				t.Fatalf("valid=%v error=%v", c.Valid, e)
			}
		})
	}
}
func TestVersionAdmission(t *testing.T) {
	for _, p := range [][2]string{{"1.5.14-beta.1", "1.5.13"}, {"1.5.14", "1.5.14-beta.1"}, {"1.5.14-beta.10", "1.5.14-beta.9"}, {"99999999999999999999.0.0", "2.0.0"}} {
		if !Newer(p[0], p[1]) || Newer(p[1], p[0]) || Newer(p[0], p[0]) {
			t.Fatal(p)
		}
	}
	for _, v := range []string{"01.0.0", "1.2.3-beta.01", "1.2.3-rc.1", "1.2.3+build", "1.2", "1.2.3\n"} {
		if _, e := VersionChannel(v); e == nil {
			t.Fatal(v)
		}
	}
}
func TestExactPayload(t *testing.T) {
	content := []byte("signed bytes")
	r := Record{Size: int64(len(content)), SHA256: fmt.Sprintf("%x", sha256.Sum256(content))}
	for _, b := range [][]byte{content, content[:3], append(append([]byte{}, content...), 0), []byte("wrong bytes!")} {
		e := r.Copy(io.Discard, bytes.NewReader(b))
		if (e == nil) != bytes.Equal(b, content) {
			t.Fatal(e)
		}
	}
	_, private, _ := ed25519.GenerateKey(nil)
	if _, e := Verify([]byte("{}\n"), ed25519.Sign(private, []byte("{}\n")), private.Public().(ed25519.PublicKey), "x64"); e == nil {
		t.Fatal("empty record")
	}
}

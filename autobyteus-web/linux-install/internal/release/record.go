// Package release owns the authenticated desktop artifact contract, not transport or installation policy.
package release

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
)

const MaxRecord = 4096
const MaxImage int64 = 2 * 1024 * 1024 * 1024
const Product = "autobyteus-personal-desktop"

// Field order is the canonical wire order. No optional fields or alternate encodings.
type Record struct {
	Format    int    `json:"format"`
	Product   string `json:"product"`
	Artifact  string `json:"artifact"`
	OS        string `json:"os"`
	Arch      string `json:"arch"`
	Version   string `json:"version"`
	Channel   string `json:"channel"`
	Size      int64  `json:"size"`
	SHA256    string `json:"sha256"`
	MinWriter int    `json:"minWriter"`
}

var digestPattern = regexp.MustCompile(`^[0-9a-f]{64}$`)

func (r Record) Bytes() []byte { b, _ := json.Marshal(r); return append(b, '\n') }

func Parse(data []byte) (Record, error) {
	var r Record
	if len(data) == 0 || len(data) > MaxRecord {
		return r, fmt.Errorf("release record exceeds bounds")
	}
	if err := json.Unmarshal(data, &r); err != nil {
		return r, fmt.Errorf("invalid release record: %w", err)
	}
	// Re-encoding also rejects duplicate, missing, unknown, differently cased and malformed UTF-8 fields.
	if !bytes.Equal(data, r.Bytes()) {
		return r, fmt.Errorf("noncanonical release record")
	}
	channel, err := VersionChannel(r.Version)
	if err != nil || channel != r.Channel || r.Format != 1 || r.MinWriter != 1 ||
		r.Product != Product || r.Artifact != "AppImage" || r.OS != "linux" ||
		(r.Arch != "x64" && r.Arch != "arm64") || r.Size <= 0 || r.Size > MaxImage || !digestPattern.MatchString(r.SHA256) {
		return r, fmt.Errorf("unsupported release identity")
	}
	return r, nil
}

func DecodeSignature(data []byte) ([]byte, error) {
	if len(data) != 88 {
		return nil, fmt.Errorf("invalid signature length")
	}
	sig, err := base64.StdEncoding.Strict().DecodeString(string(data))
	if err != nil || len(sig) != ed25519.SignatureSize || base64.StdEncoding.EncodeToString(sig) != string(data) {
		return nil, fmt.Errorf("invalid signature encoding")
	}
	return sig, nil
}

func Verify(data, signature []byte, key ed25519.PublicKey, arch string) (Record, error) {
	r, err := Parse(data)
	if err != nil {
		return r, err
	}
	if len(key) != ed25519.PublicKeySize || len(signature) != ed25519.SignatureSize || !ed25519.Verify(key, data, signature) {
		return r, fmt.Errorf("release signature refused")
	}
	if r.Arch != arch {
		return r, fmt.Errorf("release architecture refused")
	}
	return r, nil
}

// Copy verifies the bytes actually copied. Input must end exactly at the signed size.
func (r Record) Copy(out io.Writer, in io.Reader) error {
	h := sha256.New()
	n, err := io.Copy(io.MultiWriter(out, h), io.LimitReader(in, r.Size+1))
	if err != nil {
		return err
	}
	if n != r.Size || hex.EncodeToString(h.Sum(nil)) != r.SHA256 {
		return fmt.Errorf("AppImage length or digest refused")
	}
	return nil
}

func Admit(candidate, current Record, channel string) error {
	if channel != "stable" && channel != "beta" {
		return fmt.Errorf("invalid selected channel")
	}
	if candidate.Arch != current.Arch || !Newer(candidate.Version, current.Version) ||
		(channel == "stable" && candidate.Channel != "stable") {
		return fmt.Errorf("release is not an admissible upgrade")
	}
	return nil
}

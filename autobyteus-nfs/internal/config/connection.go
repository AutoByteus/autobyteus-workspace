// Package config owns typed nonsecret connection metadata and private service state.
package config

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/netip"
	"path/filepath"
	"regexp"
	"strings"
)

const DefaultMountRoot = "/Volumes/autobyteus-shared"
const PublicDirectory = "/etc/autobyteus-nfs"
const MaxRecordBytes = 16384

var uuid = regexp.MustCompile(`^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$`)
var nodeName = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,62}$`)

// Connection is deliberately not an access token. AUTH_SYS trusts allowed hosts.
type Connection struct {
	StorageID string `json:"storageId"`
	Endpoint  string `json:"endpoint"`
	Export    string `json:"export"`
	Protocol  string `json:"protocol"`
	MountRoot string `json:"mountRoot"`
}

type Marker struct {
	StorageID string `json:"storageId"`
}

func NewID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	b[6] = b[6]&15 | 64
	b[8] = b[8]&63 | 128
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[:4], b[4:6], b[6:8], b[8:10], b[10:]), nil
}
func ValidID(id string) bool     { return uuid.MatchString(id) }
func ValidNode(name string) bool { return nodeName.MatchString(name) }

func AbsolutePath(p string) bool {
	return filepath.IsAbs(p) && filepath.Clean(p) == p && p != "/" &&
		!strings.ContainsAny(p, "\x00\r\n\t")
}
func Within(parent, child string) bool {
	rel, err := filepath.Rel(parent, child)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel)
}
func Overlap(a, b string) bool { return Within(a, b) || Within(b, a) }

func (c Connection) Validate() error {
	ip, err := netip.ParseAddr(c.Endpoint)
	if !ValidID(c.StorageID) || err != nil || !ip.IsPrivate() || ip.Is6() || ip.Zone() != "" {
		return errors.New("connection requires a storage UUID and a private IPv4 endpoint reachable by every selected client")
	}
	if !AbsolutePath(c.Export) || !AbsolutePath(c.MountRoot) || strings.ContainsAny(c.Export+c.MountRoot, `"\\`) {
		return errors.New("connection export and mount root must be clean absolute paths")
	}
	if c.Protocol != "3" && c.Protocol != "4.1" {
		return errors.New("supported NFS protocol is 3 or 4.1")
	}
	if c.Protocol == "4.1" && c.Export != "/autobyteus/"+c.StorageID {
		return errors.New("NFS4 export does not match storage identity")
	}
	return nil
}

// Decode reads known fields and tolerates additive fields, never shell-evaluating data.
func Decode(data []byte, target any) error {
	if len(data) == 0 || len(data) > MaxRecordBytes {
		return errors.New("missing or oversized JSON record")
	}
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		return errors.New("JSON record cannot be null")
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	if err := dec.Decode(target); err != nil {
		return err
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		return errors.New("trailing JSON data")
	}
	return nil
}
func ParseConnection(data []byte) (Connection, error) {
	var c Connection
	if err := Decode(data, &c); err != nil {
		return c, err
	}
	return c, c.Validate()
}

// Allowlist permits explicit private hosts or a subnet wholly inside private space.
func Allowlist(values []string) ([]string, error) {
	if len(values) == 0 || len(values) > 32 {
		return nil, errors.New("select one to 32 trusted private hosts/subnets")
	}
	out := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, v := range values {
		var p netip.Prefix
		if strings.Contains(v, "/") {
			parsed, err := netip.ParsePrefix(v)
			if err != nil {
				return nil, err
			}
			p = parsed.Masked()
		} else {
			a, err := netip.ParseAddr(v)
			if err != nil {
				return nil, err
			}
			p = netip.PrefixFrom(a, a.BitLen())
		}
		a := p.Addr()
		if !a.Is4() || !a.IsPrivate() {
			return nil, errors.New("only private IPv4 allowlists are supported; no public/wildcard trust")
		}
		private := []netip.Prefix{netip.MustParsePrefix("10.0.0.0/8"), netip.MustParsePrefix("172.16.0.0/12"), netip.MustParsePrefix("192.168.0.0/16")}
		contained := false
		for _, r := range private {
			if r.Contains(a) && p.Bits() >= r.Bits() {
				contained = true
			}
		}
		if !contained {
			return nil, errors.New("allowlist extends beyond private network")
		}
		normalized := p.String()
		if p.Bits() == 32 {
			normalized = a.String()
		}
		if !seen[normalized] {
			out = append(out, normalized)
			seen[normalized] = true
		}
	}
	return out, nil
}

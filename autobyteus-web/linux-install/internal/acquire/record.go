// Package acquire obtains first-install sidecars as the desktop user before any authorization.
package acquire

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"autobyteus.local/desktop/linux-install/internal/release"
)

// Identity comes from the build, never the downloaded filename, argv or environment.
type Identity struct {
	Version    string
	Arch       string
	Repository string
	Asset      string
}

func (i Identity) URL() (string, error) {
	if _, err := release.VersionChannel(i.Version); err != nil {
		return "", err
	}
	if (i.Arch != "x64" && i.Arch != "arm64") || i.Repository != "AutoByteus/autobyteus-workspace" ||
		i.Asset != "AutoByteus_personal_linux-"+i.Arch+"-"+i.Version+".AppImage" {
		return "", fmt.Errorf("invalid build release identity")
	}
	return "https://github.com/" + i.Repository + "/releases/download/v" + i.Version + "/" + i.Asset + ".release.json", nil
}

func productionURL(u *url.URL) bool {
	return u.Scheme == "https" && u.User == nil && (u.Port() == "" || u.Port() == "443") &&
		(u.Hostname() == "github.com" || u.Hostname() == "release-assets.githubusercontent.com")
}

func client() *http.Client {
	return &http.Client{Timeout: 20 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) > 3 || !permitted(req.URL) {
			return fmt.Errorf("release redirect refused")
		}
		return nil
	}}
}

func get(ctx context.Context, client *http.Client, address string, limit int64) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil || !permitted(req.URL) {
		return nil, fmt.Errorf("release URL refused")
	}
	response, err := client.Do(req)
	// Do not propagate net/http errors containing signed redirect query strings.
	if err != nil {
		return nil, fmt.Errorf("cannot reach official release service; reconnect and retry")
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("official release sidecar unavailable (HTTP %d)", response.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, limit+1))
	if err != nil || int64(len(data)) > limit {
		return nil, fmt.Errorf("release sidecar read or size refused")
	}
	return data, nil
}

// Fetch verifies the opened outer image and rewinds that same handle for provisioning.
// The handle is NOT immutable: the privileged receiver must verify streamed bytes independently.
func Fetch(ctx context.Context, identity Identity, key ed25519.PublicKey, image *os.File) ([]byte, []byte, error) {
	if os.Geteuid() == 0 {
		return nil, nil, fmt.Errorf("release acquisition must not run as root")
	}
	address, err := acquisitionURL(identity)
	if err != nil {
		return nil, nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	c := client()
	data, err := get(ctx, c, address, release.MaxRecord)
	if err != nil {
		return nil, nil, err
	}
	encoded, err := get(ctx, c, address+".sig", 88)
	if err != nil {
		return nil, nil, err
	}
	signature, err := release.DecodeSignature(encoded)
	if err != nil {
		return nil, nil, err
	}
	r, err := release.Verify(data, signature, key, identity.Arch)
	if err != nil {
		return nil, nil, err
	}
	if r.Version != identity.Version {
		return nil, nil, fmt.Errorf("release version differs from running download")
	}
	stat, err := image.Stat()
	if err != nil || !stat.Mode().IsRegular() || stat.Size() != r.Size {
		return nil, nil, fmt.Errorf("outer AppImage is not the signed regular file")
	}
	if _, err = image.Seek(0, io.SeekStart); err != nil {
		return nil, nil, err
	}
	if err = r.Copy(io.Discard, image); err != nil {
		return nil, nil, err
	}
	if _, err = image.Seek(0, io.SeekStart); err != nil {
		return nil, nil, err
	}
	return data, signature, nil
}

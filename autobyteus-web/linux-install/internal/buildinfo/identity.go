// Package buildinfo contains linker-pinned build values, never runtime configuration.
package buildinfo

import (
	"crypto/ed25519"
	"encoding/base64"
	"fmt"
	"runtime"

	"autobyteus.local/desktop/linux-install/internal/acquire"
)

var Version, Arch, Repository, Asset, PublicKey, ProvisionDigest string

func Identity() (acquire.Identity, ed25519.PublicKey, error) {
	identity := acquire.Identity{Version: Version, Arch: Arch, Repository: Repository, Asset: Asset}
	if _, err := identity.URL(); err != nil {
		return identity, nil, err
	}
	native := map[string]string{"amd64": "x64", "arm64": "arm64"}[runtime.GOARCH]
	if Arch != native {
		return identity, nil, fmt.Errorf("build architecture mismatch")
	}
	key, err := base64.StdEncoding.Strict().DecodeString(PublicKey)
	if err != nil || len(key) != ed25519.PublicKeySize {
		return identity, nil, fmt.Errorf("desktop trust anchor not provisioned")
	}
	return identity, ed25519.PublicKey(key), nil
}

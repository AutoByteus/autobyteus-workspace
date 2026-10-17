//go:build !linux

package backend

import "embed"

// Mac binaries never embed Linux package bytes, even in a cross-build checkout.
//
//go:embed engine-assets/README
var engineAssets embed.FS

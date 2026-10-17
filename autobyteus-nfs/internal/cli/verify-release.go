package cli

import (
	"errors"
	"os"
	"reflect"
	"runtime"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/setup"
)

func VerifyRelease(path string, embedded setup.Release) error {
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if !info.Mode().IsRegular() || info.Size() > config.MaxRecordBytes {
		return errors.New("invalid release manifest")
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var manifest setup.Release
	if err = config.Decode(b, &manifest); err != nil {
		return err
	}
	if !reflect.DeepEqual(manifest, embedded) {
		return errors.New("downloaded manifest differs from this binary's pinned release")
	}
	target := runtime.GOOS + "-" + runtime.GOARCH
	for _, qualified := range manifest.QualifiedTargets {
		if qualified == target {
			return nil
		}
	}
	return errors.New("this release has not qualified the current computer/CPU; no installation performed")
}

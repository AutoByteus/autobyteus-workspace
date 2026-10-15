package platform

import (
	"errors"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

func diskutilVolumeUUID(data []byte, device, mount string) (string, error) {
	fields, err := volumePlist(data)
	if err != nil {
		return "", err
	}
	for _, key := range []string{"DeviceNode", "MountPoint", "FilesystemType", "VolumeUUID"} {
		if fields[key].kind != "string" {
			return "", errors.New("source volume plist requires typed " + key)
		}
	}
	uuid := strings.ToLower(fields["VolumeUUID"].text)
	if !config.ValidVolumeUUID(uuid) {
		return "", errors.New("invalid source APFS volume UUID")
	}
	if fields["DeviceNode"].text != device || fields["MountPoint"].text != mount || fields["FilesystemType"].text != "apfs" {
		return "", errors.New("source volume plist does not match the observed APFS mount")
	}
	return uuid, nil
}

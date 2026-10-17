package config

import "errors"

// ValidVolumeUUID accepts the canonical APFS volume identifier, not a storage marker.
func ValidVolumeUUID(value string) bool {
	return ValidID(value) && value != "00000000-0000-0000-0000-000000000000"
}

func (h HostedFilesystem) ValidateBound() error {
	if err := h.Validate(); err != nil {
		return err
	}
	id := h.Identity
	if h.Backend == "apple" {
		if id.Device != 0 || id.Inode == 0 || !ValidVolumeUUID(id.VolumeUUID) {
			return errors.New("unsupported Apple source binding: requires volumeUuid and inode, without device; drain/detach old unqualified setups with their matching old CLI before fresh setup; do not edit or infer identity")
		}
	} else if id.Device == 0 || id.Inode == 0 || id.VolumeUUID != "" {
		return errors.New("invalid Linux source binding: requires device and inode, without volumeUuid")
	}
	return nil
}

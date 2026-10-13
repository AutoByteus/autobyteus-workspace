// Package backend owns the selected export engines, never application runtime state.
package backend

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

func GaneshaConfig(h config.HostedFilesystem, privateRoot string, container bool) (string, error) {
	if err := h.Validate(); err != nil {
		return "", err
	}
	if strings.ContainsAny(h.Source+privateRoot, `"\\`) {
		return "", errors.New("unsupported configuration path characters")
	}
	source, recovery := h.Source, filepath.Join(privateRoot, "ganesha", "recovery")
	if container {
		source = "/export"
		recovery = "/var/lib/ganesha"
	}
	// Only v4 is offered, so neither mountd, NLM nor rquota ports are opened.
	return fmt.Sprintf(`NFS_CORE_PARAM {
 Protocols = 4;
 NFS_Port = 2049;
 Enable_NLM = false;
 Enable_RQUOTA = false;
 Enable_UDP = false;
}
NFSv4 {
 Minor_Versions = 1;
 RecoveryBackend = fs;
 RecoveryRoot = "%s";
}
EXPORT {
 Export_Id = 1;
 Path = "%s";
 Pseudo = "/autobyteus/%s";
 Protocols = 4;
 Transports = TCP;
 SecType = sys;
 Access_Type = None;
 Squash = All_Squash;
 Anonymous_uid = %d;
 Anonymous_gid = %d;
 CLIENT {
  Clients = %s;
  Access_Type = RW;
  Squash = All_Squash;
 }
 FSAL { Name = VFS; }
}
`, recovery, source, h.StorageID, h.DataUID, h.DataGID, strings.Join(h.Allowlist, ", ")), nil
}

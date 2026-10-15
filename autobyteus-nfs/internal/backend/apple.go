package backend

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"strconv"
	"strings"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

// ApplePlan records only the narrow owned export/settings changes and their exact baseline.
// Apply must compare hashes again after consent; detach edits only still-matching owned blocks.
type ApplePlan struct {
	ExportsBefore  string `json:"exportsBefore"`
	SettingsBefore string `json:"settingsBefore"`
	ExportsAfter   string `json:"exportsAfter"`
	SettingsAfter  string `json:"settingsAfter"`
	ExportBlock    string `json:"exportBlock"`
	SettingsBlock  string `json:"settingsBlock"`
}

func hash(s string) string { b := sha256.Sum256([]byte(s)); return hex.EncodeToString(b[:]) }

// NextConfiguration permits an interrupted two-file apply to resume only when
// each file is still its exact approved baseline or exact intended result.
func (p ApplePlan) NextConfiguration(exports, settings string) (string, string, error) {
	next := func(current, before, after, block string) (string, error) {
		if hash(current) == after {
			return current, nil
		}
		if hash(current) == before {
			return AppendBlock(current, block), nil
		}
		return "", errors.New("Apple NFS configuration changed after consent")
	}
	e, err := next(exports, p.ExportsBefore, p.ExportsAfter, p.ExportBlock)
	if err != nil {
		return "", "", err
	}
	s, err := next(settings, p.SettingsBefore, p.SettingsAfter, p.SettingsBlock)
	return e, s, err
}
func AppleExport(h config.HostedFilesystem) (string, error) {
	if err := h.Validate(); err != nil {
		return "", err
	}
	if strings.ContainsAny(h.Source, `"\\`) {
		return "", errors.New("unsupported Apple export-path characters")
	}
	prefix := fmt.Sprintf("%q -mapall=%d:%d", h.Source, h.DataUID, h.DataGID)
	lines := []string{}
	for _, client := range h.Allowlist {
		if strings.Contains(client, "/") {
			p, err := netip.ParsePrefix(client)
			if err != nil {
				return "", err
			}
			mask := net.CIDRMask(p.Bits(), 32)
			lines = append(lines, fmt.Sprintf("%s -network %s -mask %s", prefix, p.Masked().Addr(), net.IP(mask).String()))
		} else {
			lines = append(lines, prefix+" "+client)
		}
	}
	return strings.Join(lines, "\n") + "\n", nil
}
func MarkedBlock(id, content string) string {
	return "# BEGIN AutoByteus NFS " + id + "\n" + content + "# END AutoByteus NFS " + id + "\n"
}
func PlanApple(h config.HostedFilesystem, exports, settings string) (ApplePlan, error) {
	var p ApplePlan
	if strings.Contains(exports, "# BEGIN AutoByteus NFS") || strings.Contains(settings, "# BEGIN AutoByteus NFS") {
		return p, errors.New("existing owned Apple configuration requires reconnect/detach, not a second export")
	}
	export, err := AppleExport(h)
	if err != nil {
		return p, err
	}
	// These global settings are necessary for selected Docker clients. Never change
	// their meaning under an unrelated export or silently weaken an existing policy.
	needed := [][2]string{{"nfs.server.mount.port", "20048"}, {"nfs.server.bonjour", "0"}, {"nfs.server.udp", "0"}, {"nfs.server.mount.require_resv_port", "0"}}
	liveExports := false
	for _, line := range strings.Split(exports, "\n") {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "#") {
			liveExports = true
		}
	}
	owned := []string{}
	for _, pair := range needed {
		found := false
		for _, line := range strings.Split(settings, "\n") {
			line = strings.TrimSpace(strings.SplitN(line, "#", 2)[0])
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 && strings.TrimSpace(parts[0]) == pair[0] {
				if found {
					return p, errors.New("duplicate Apple NFS setting")
				}
				found = true
				if strings.TrimSpace(parts[1]) != pair[1] {
					return p, fmt.Errorf("Apple setting %s conflicts; no changes made", pair[0])
				}
			}
		}
		if !found {
			if liveExports {
				return p, fmt.Errorf("cannot apply %s with unrelated exports", pair[0])
			}
			owned = append(owned, pair[0]+"="+pair[1])
		}
	}
	p = ApplePlan{ExportsBefore: hash(exports), SettingsBefore: hash(settings), ExportBlock: MarkedBlock(h.InstallationID, export)}
	if len(owned) > 0 {
		p.SettingsBlock = MarkedBlock(h.InstallationID, strings.Join(owned, "\n")+"\n")
	}
	p.ExportsAfter = hash(AppendBlock(exports, p.ExportBlock))
	p.SettingsAfter = hash(AppendBlock(settings, p.SettingsBlock))
	return p, nil
}
func AppendBlock(text, block string) string {
	if block == "" {
		return text
	}
	if text != "" && !strings.HasSuffix(text, "\n") {
		text += "\n"
	}
	return text + block
}

// RemoveExact preserves concurrent external changes; a mismatched block is not ours to remove.
func RemoveExact(text, block string) (string, error) {
	if block == "" {
		return text, nil
	}
	if strings.Count(text, block) != 1 {
		return text, errors.New("owned block changed externally; retained for operator review")
	}
	return strings.Replace(text, block, "", 1), nil
}
func DataOwner(uid, gid uint32) string {
	return strconv.FormatUint(uint64(uid), 10) + ":" + strconv.FormatUint(uint64(gid), 10)
}

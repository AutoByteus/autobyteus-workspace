package config

import (
	"errors"
	"runtime"
	"strings"
)

type Identity struct {
	Device uint64 `json:"device"`
	Inode  uint64 `json:"inode"`
}
type HostedFilesystem struct {
	InstallationID string   `json:"installationId"`
	StorageID      string   `json:"storageId"`
	Source         string   `json:"source"`
	Identity       Identity `json:"identity"`
	Backend        string   `json:"backend"`
	DataUID        uint32   `json:"dataUid"`
	DataGID        uint32   `json:"dataGid"`
	Allowlist      []string `json:"allowlist"`
	// Immutable release engine identity, never latest or an unbounded upgrade.
	EngineImage string `json:"engineImage,omitempty"`
}
type Attachment struct {
	Connection
	InstallationID string   `json:"installationId"`
	UserUID        uint32   `json:"userUid"`
	UserGID        uint32   `json:"userGid"`
	Nodes          []string `json:"nodes"`
}

// NodeAttachment is nonsecret and published only for an explicitly opted-in node.
type NodeAttachment struct {
	DaemonID            string `json:"daemonId"`
	StorageID           string `json:"storageId"`
	Node                string `json:"node"`
	MountRoot           string `json:"mountRoot"`
	Volume              string `json:"volume"`
	DescriptorDirectory string `json:"descriptorDirectory"`
}

func (h HostedFilesystem) Validate() error {
	if !ValidID(h.InstallationID) || !ValidID(h.StorageID) || !AbsolutePath(h.Source) || h.DataUID == 0 || h.DataGID == 0 {
		return errors.New("invalid hosted filesystem identity/source/nonroot owner")
	}
	if h.Backend != "apple" && h.Backend != "ganesha-native" && h.Backend != "ganesha-docker" {
		return errors.New("unsupported storage backend")
	}
	_, err := Allowlist(h.Allowlist)
	return err
}
func (a Attachment) Validate() error {
	if !ValidID(a.InstallationID) || a.UserUID == 0 || a.UserGID == 0 {
		return errors.New("attachment requires installation identity and nonroot user")
	}
	if len(a.Nodes) > 32 {
		return errors.New("select at most 32 managed nodes")
	}
	seen := map[string]bool{}
	for _, node := range a.Nodes {
		if seen[node] {
			return errors.New("duplicate selected node")
		}
		seen[node] = true
		if !ValidNode(node) {
			return errors.New("invalid selected node")
		}
	}
	return a.Connection.Validate()
}
func PrivateDirectory() string {
	if runtime.GOOS == "darwin" {
		return "/Library/Application Support/AutoByteusNFS"
	}
	return "/var/lib/autobyteus-nfs"
}
func BinaryPath() string {
	if runtime.GOOS == "darwin" {
		return "/Library/AutoByteusNFS/libexec/autobyteus-nfs"
	}
	return "/usr/libexec/autobyteus-nfs/autobyteus-nfs"
}

func (a NodeAttachment) Validate() error {
	if a.DaemonID == "" || strings.ContainsAny(a.DaemonID, "\r\n") || !ValidNode(a.Node) || !ValidID(a.StorageID) || !AbsolutePath(a.MountRoot) || strings.Contains(a.MountRoot, ",") || a.Volume != "autobyteus-nfs-"+a.StorageID || a.DescriptorDirectory != PublicDirectory {
		return errors.New("invalid selected-node attachment")
	}
	return nil
}

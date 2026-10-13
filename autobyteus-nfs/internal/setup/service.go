package setup

import (
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/backend"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
	"os"
)

type User struct {
	UID, GID uint32
	Home     string
}
type Request struct {
	Connection   config.Connection
	Source       string
	Backend      string
	Allowlist    []string
	Nodes        []string
	DockerSocket string
}
type Plan struct {
	Attachment   config.Attachment
	Hosted       *config.HostedFilesystem
	Apple        *backend.ApplePlan
	Nodes        []docker.Snapshot `json:"-"`
	DockerSocket string
	NewSource    bool
	Summary      []string
}
type Release struct {
	SourceHash       string            `json:"sourceHash"`
	QualifiedTargets []string          `json:"qualifiedTargets"`
	Version          string            `json:"version"`
	Packages         map[string]string `json:"ubuntuPackages"`
	EngineImage      string            `json:"engineImage"`
}
type Service struct {
	Lock    *os.File
	Store   config.Store
	Public  config.Store
	Runner  platform.Runner
	Binary  string
	Release Release
	User    User
	Docker  *docker.Client
}

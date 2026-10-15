package platform

import "github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"

func SourceIdentity(_ Runner, source string) (config.Identity, error) {
	id, err := sourcePath(source)
	if err != nil {
		return config.Identity{}, err
	}
	if err := QualifyFilesystem(source); err != nil {
		return config.Identity{}, err
	}
	return id, nil
}

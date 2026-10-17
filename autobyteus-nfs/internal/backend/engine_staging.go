package backend

import (
	"errors"
	"os"
	"path/filepath"
)

// Called only beneath the existing validated private root under the admin lock.
// A fresh exact-owned directory avoids adopting interrupted or external entries.
func stageEngine(root string, payload []enginePayload) (paths []string, cleanup func() error, result error) {
	dir, err := os.MkdirTemp(root, "engine-install-")
	if err != nil {
		return nil, nil, err
	}
	cleanup = func() error {
		var failures []error
		for _, path := range paths {
			if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
				failures = append(failures, err)
			}
		}
		if err := os.Remove(dir); err != nil && !os.IsNotExist(err) {
			failures = append(failures, err)
		}
		return errors.Join(failures...)
	}
	defer func() {
		if result != nil {
			result = errors.Join(result, cleanup())
		}
	}()
	if err = os.Chmod(dir, 0700); err != nil {
		return nil, cleanup, err
	}
	for _, p := range payload {
		path := filepath.Join(dir, p.identity.File)
		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
		if err != nil {
			return paths, cleanup, err
		}
		paths = append(paths, path)
		if err = f.Chmod(0600); err == nil {
			_, err = f.Write(p.bytes)
		}
		if err == nil {
			err = f.Sync()
		}
		err = errors.Join(err, f.Close())
		if err != nil {
			return paths, cleanup, err
		}
	}
	return paths, cleanup, nil
}

package config

import (
	"errors"
	"io"
	"os"
)

// ReadMarker does not follow a marker outside the selected source or read an unbounded device/FIFO.
func ReadMarker(source string) (Marker, error) {
	var marker Marker
	root, err := os.OpenRoot(source)
	if err != nil {
		return marker, err
	}
	defer root.Close()
	info, err := root.Lstat(".autobyteus-nfs/storage.json")
	if err != nil {
		return marker, err
	}
	if !info.Mode().IsRegular() || info.Size() > MaxRecordBytes {
		return marker, errors.New("storage marker must be a bounded regular file")
	}
	f, err := root.Open(".autobyteus-nfs/storage.json")
	if err != nil {
		return marker, err
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, MaxRecordBytes+1))
	if err != nil {
		return marker, err
	}
	if err = Decode(b, &marker); err != nil {
		return marker, err
	}
	if !ValidID(marker.StorageID) {
		return marker, errors.New("invalid storage marker UUID")
	}
	return marker, nil
}

package platform

import (
	"errors"
	"fmt"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"os"
	"regexp"
	"runtime"
	"strings"
)

type Mount struct{ Target, Endpoint, Export, Protocol, Filesystem string }

var octalEscape = regexp.MustCompile(`\\([0-7]{3})`)

func unescape(s string) string {
	return octalEscape.ReplaceAllStringFunc(s, func(v string) string { var b byte; fmt.Sscanf(v, `\%03o`, &b); return string([]byte{b}) })
}
func ParseLinuxMounts(data string) []Mount {
	var result []Mount
	for _, line := range strings.Split(data, "\n") {
		sides := strings.SplitN(line, " - ", 2)
		if len(sides) != 2 {
			continue
		}
		left, right := strings.Fields(sides[0]), strings.Fields(sides[1])
		if len(left) < 6 || len(right) < 3 {
			continue
		}
		m := Mount{Target: unescape(left[4]), Filesystem: right[0]}
		if m.Filesystem == "nfs" || m.Filesystem == "nfs4" {
			source := strings.SplitN(unescape(right[1]), ":", 2)
			if len(source) != 2 {
				continue
			}
			m.Endpoint, m.Export = source[0], source[1]
			for _, opt := range strings.Split(right[2], ",") {
				if strings.HasPrefix(opt, "vers=") {
					m.Protocol = strings.TrimPrefix(opt, "vers=")
				}
				if m.Endpoint == "" && strings.HasPrefix(opt, "addr=") {
					m.Endpoint = strings.TrimPrefix(opt, "addr=")
				}
			}
		}
		result = append(result, m)
	}
	return result
}
func ParseDarwinMounts(data string) []Mount {
	var result []Mount
	for _, line := range strings.Split(data, "\n") {
		on := strings.LastIndex(line, " on ")
		suffix := strings.LastIndex(line, " (")
		if on < 0 || suffix < on {
			continue
		}
		m := Mount{Target: line[on+4 : suffix], Filesystem: strings.SplitN(line[suffix+2:], ",", 2)[0]}
		m.Filesystem = strings.TrimSuffix(m.Filesystem, ")")
		if m.Filesystem == "nfs" {
			source := strings.SplitN(line[:on], ":", 2)
			if len(source) != 2 {
				continue
			}
			m.Endpoint, m.Export = source[0], source[1]
		}
		result = append(result, m)
	}
	return result
}
func Mounts(r Runner) ([]Mount, error) {
	if runtime.GOOS == "linux" {
		b, e := os.ReadFile("/proc/self/mountinfo")
		return ParseLinuxMounts(string(b)), e
	}
	b, e := r.Run("/sbin/mount")
	return ParseDarwinMounts(string(b)), e
}
func Observe(r Runner, c config.Connection) (*Mount, error) {
	mounts, err := Mounts(r)
	if err != nil {
		return nil, err
	}
	for _, m := range mounts {
		if m.Target == c.MountRoot {
			if runtime.GOOS == "darwin" && m.Filesystem == "nfs" {
				b, err := r.Run("/usr/bin/nfsstat", "-m", c.MountRoot)
				if err != nil {
					return nil, err
				}
				current := strings.SplitN(string(b), "Current mount parameters", 2)
				if len(current) != 2 {
					return nil, errors.New("cannot determine current NFS protocol")
				}
				pattern := regexp.MustCompile(`\bvers=(3|4(?:\.1)?)\b`)
				match := pattern.FindStringSubmatch(current[1])
				if len(match) < 2 {
					return nil, errors.New("missing current NFS version")
				}
				m.Protocol = match[1]
			}
			return &m, nil
		}
	}
	return nil, nil
}
func Matches(m *Mount, c config.Connection) bool {
	return m != nil && (m.Filesystem == "nfs" || m.Filesystem == "nfs4") && m.Endpoint == c.Endpoint && m.Export == c.Export && m.Protocol == c.Protocol
}

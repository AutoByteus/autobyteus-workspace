package release

import (
	"fmt"
	"regexp"
	"strings"
)

var versionPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-beta\.(0|[1-9][0-9]*))?$`)

func VersionChannel(version string) (string, error) {
	if !versionPattern.MatchString(version) {
		return "", fmt.Errorf("invalid release version")
	}
	if strings.Contains(version, "-beta.") {
		return "beta", nil
	}
	return "stable", nil
}

// Compare canonical decimal strings without rounding or an architecture-dependent integer bound.
func decimalCompare(a, b string) int {
	if len(a) < len(b) {
		return -1
	}
	if len(a) > len(b) {
		return 1
	}
	return strings.Compare(a, b)
}

func Newer(candidate, current string) bool {
	a, b := versionPattern.FindStringSubmatch(candidate), versionPattern.FindStringSubmatch(current)
	if a == nil || b == nil {
		return false
	}
	for i := 1; i <= 3; i++ {
		if cmp := decimalCompare(a[i], b[i]); cmp != 0 {
			return cmp > 0
		}
	}
	if a[4] == "" {
		return b[4] != ""
	}
	if b[4] == "" {
		return false
	}
	return decimalCompare(a[4], b[4]) > 0
}

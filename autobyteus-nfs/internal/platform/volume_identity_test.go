package platform

import (
	"strings"
	"testing"
)

const testVolumeUUID = "A19FE379-BE62-4297-9A39-3934CC88214B"

func volumeReply(device, mount string) string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>DeviceNode</key><string>` + device + `</string><key>MountPoint</key><string>` + mount + `</string><key>FilesystemType</key><string>apfs</string><key>VolumeUUID</key><string>` + testVolumeUUID + `</string><key>Extra</key><array><true/><integer>42</integer><dict><key>x</key><data>AA==</data></dict></array></dict></plist>`
}
func TestVolumePlistStrictIdentity(t *testing.T) {
	good := volumeReply("/dev/disk3s1", "/System/Volumes/Data")
	if uuid, err := diskutilVolumeUUID([]byte(good), "/dev/disk3s1", "/System/Volumes/Data"); err != nil || uuid != strings.ToLower(testVolumeUUID) {
		t.Fatal(uuid, err)
	}
	cases := map[string]string{
		"malformed-declaration": strings.Replace(good, `version="1.0" encoding="UTF-8"`, `garbage`, 1),
		"empty":                 "", "truncated": good[:len(good)-4], "trailing-text": good + "garbage", "second-document": good + good,
		"extra-dict":                      strings.Replace(good, "</plist>", "<dict/></plist>", 1),
		"wrong-root":                      strings.ReplaceAll(good, "plist version", "array version"),
		"wrong-device":                    strings.ReplaceAll(good, "/dev/disk3s1", "/dev/disk4s1"),
		"wrong-mount":                     strings.ReplaceAll(good, "/System/Volumes/Data", "/Volumes/Other"),
		"wrong-fs":                        strings.ReplaceAll(good, "apfs", "hfs"),
		"missing-uuid":                    strings.ReplaceAll(good, "<key>VolumeUUID</key><string>"+testVolumeUUID+"</string>", ""),
		"disk-uuid-only":                  strings.ReplaceAll(good, "VolumeUUID", "DiskUUID"),
		"zero-uuid":                       strings.ReplaceAll(good, testVolumeUUID, "00000000-0000-0000-0000-000000000000"),
		"malformed-uuid":                  strings.ReplaceAll(good, testVolumeUUID, "bogus"),
		"space-uuid":                      strings.ReplaceAll(good, testVolumeUUID, " "+testVolumeUUID),
		"missing-value":                   strings.ReplaceAll(good, "<string>"+testVolumeUUID+"</string>", ""),
		"nested-scalar":                   strings.ReplaceAll(good, testVolumeUUID, "<string>"+testVolumeUUID+"</string>"),
		"unknown-value":                   strings.ReplaceAll(good, "<integer>42</integer>", "<object/>"),
		"trailing-processing-instruction": good + "<?foo bar?>",
		"entity-declaration":              strings.Replace(good, "<plist", `<!DOCTYPE plist [<!ENTITY xx "foo">]><plist`, 1),
		"namespace":                       strings.Replace(good, "<dict>", `<dict xmlns="bad">`, 1),
		"oversize":                        good + strings.Repeat(" ", 1<<20),
		"depth":                           strings.Replace(good, "<integer>42</integer>", strings.Repeat("<array>", 34)+strings.Repeat("</array>", 34), 1),
	}
	for _, key := range []string{"DeviceNode", "MountPoint", "FilesystemType", "VolumeUUID"} {
		cases["duplicate-"+key] = strings.Replace(good, "<key>"+key+"</key>", "<key>"+key+"</key><string>ambiguous</string><key>"+key+"</key>", 1)
		marker := "<key>" + key + "</key><string>"
		start := strings.Index(good, marker) + len(marker)
		end := strings.Index(good[start:], "</string>") + start
		cases["wrong-type-"+key] = good[:start-len("<string>")] + "<integer>123</integer>" + good[end+len("</string>"):]
	}
	cases["duplicate-unrelated"] = strings.Replace(good, "<key>x</key>", "<key>x</key><false/><key>x</key>", 1)
	for name, data := range cases {
		t.Run(name, func(t *testing.T) {
			if uuid, err := diskutilVolumeUUID([]byte(data), "/dev/disk3s1", "/System/Volumes/Data"); err == nil {
				t.Fatalf("accepted %q", uuid)
			}
		})
	}
}

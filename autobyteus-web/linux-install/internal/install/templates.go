package install

import "fmt"

func (p Paths) Service() []byte {
	return []byte(fmt.Sprintf(`[Unit]
Description=AutoByteus authenticated desktop writer for UID %s
Requires=%s
After=%s
[Service]
ExecStart=%s/writer %s
User=%s
Group=%s
NoNewPrivileges=yes
CapabilityBoundingSet=
AmbientCapabilities=
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
PrivateNetwork=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
LockPersonality=yes
RestrictAddressFamilies=AF_UNIX
ReadWritePaths=%s
NoExecPaths=%s
UMask=0077
`, p.UID, p.SocketUnit, p.SocketUnit, p.Support, p.UID, p.Account, p.Account, p.App, p.App))
}

func (p Paths) SocketDefinition() []byte {
	return []byte(fmt.Sprintf(`[Unit]
Description=AutoByteus desktop update socket for UID %s
[Socket]
ListenStream=%s
SocketUser=%s
SocketMode=0600
RemoveOnStop=yes
[Install]
WantedBy=sockets.target
`, p.UID, p.Socket, p.UID))
}

func (p Paths) AppArmor() []byte {
	return []byte(fmt.Sprintf(`abi <abi/4.0>,
include <tunables/global>
profile autobyteus-desktop-%s %s/AutoByteus.AppImage flags=(unconfined) {
  userns,
}
`, p.UID, p.App))
}

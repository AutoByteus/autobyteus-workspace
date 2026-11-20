// A managed restart is one direct child's authenticated handback, never a command.
package launch

import (
	"autobyteus.local/desktop/linux-install/internal/install"
	"fmt"
	"os"
	"strconv"
	"strings"
	"syscall"
)

const restartExit = 76

func restartPair() (*os.File, *os.File, error) {
	fds, err := syscall.Socketpair(syscall.AF_UNIX, syscall.SOCK_DGRAM|syscall.SOCK_NONBLOCK|syscall.SOCK_CLOEXEC, 0)
	if err != nil {
		return nil, nil, err
	}
	parent, child := os.NewFile(uintptr(fds[0]), "restart-receiver"), os.NewFile(uintptr(fds[1]), "restart-sender")
	if err = syscall.SetsockoptInt(fds[0], syscall.SOL_SOCKET, syscall.SO_PASSCRED, 1); err == nil {
		err = syscall.Sendto(fds[0], []byte{'M'}, 0, nil)
	}
	if err != nil {
		parent.Close()
		child.Close()
		return nil, nil, err
	}
	return parent, child, nil
}

func restartRequested(fd, pid, uid int) bool {
	var data [2]byte
	control := make([]byte, syscall.CmsgSpace(syscall.SizeofUcred))
	for packet := 0; packet < 2; packet++ {
		n, anc, flags, _, err := syscall.Recvmsg(fd, data[:], control, syscall.MSG_DONTWAIT|syscall.MSG_CMSG_CLOEXEC)
		if err != nil {
			return packet == 1 && err == syscall.EAGAIN
		}
		messages, e := syscall.ParseSocketControlMessage(control[:anc])
		valid := packet == 0 && e == nil && len(messages) == 1 && flags&(syscall.MSG_TRUNC|syscall.MSG_CTRUNC) == 0 && n == 1 && data[0] == 'R'
		for _, m := range messages {
			if m.Header.Level == syscall.SOL_SOCKET && m.Header.Type == syscall.SCM_RIGHTS {
				rights, _ := syscall.ParseUnixRights(&m)
				for _, r := range rights {
					syscall.Close(r)
				}
			}
			cred, e := syscall.ParseUnixCredentials(&m)
			valid = valid && e == nil && cred.Pid == int32(pid) && cred.Uid == uint32(uid)
		}
		if !valid {
			return false
		}
	}
	return false
}

// Derive target and environment from this ordinary desktop process, not its child.
func canonicalRestart(finishSignals func() bool) error {
	uid := os.Getuid()
	if uid == 0 || os.Geteuid() != uid {
		return fmt.Errorf("invalid restart identity")
	}
	p, e := install.ForUID(strconv.Itoa(uid))
	if e != nil {
		return e
	}
	target, managed, e := Managed(p)
	if e != nil {
		return e
	}
	if !managed {
		return fmt.Errorf("protected installation is missing; repair required")
	}
	if e = os.Chdir("/"); e != nil {
		return e
	}
	env := []string{}
	for _, v := range os.Environ() {
		k, _, _ := strings.Cut(v, "=")
		switch k {
		case "APPDIR", "APPIMAGE", "ARGV0", "OWD", "AUTOBYTEUS_LAUNCH_READY_FD", "AUTOBYTEUS_RESTART_INODE":
			continue
		}
		env = append(env, v)
	}
	// Linux close_range(CLOSE_RANGE_CLOEXEC), same syscall number on supported x64/arm64.
	// Covers mount handles, control sockets and runtime descriptors without disrupting Go before exec.
	const closeRange = 436
	if _, _, errno := syscall.Syscall(closeRange, 3, uintptr(^uint32(0)), 4); errno != 0 {
		return fmt.Errorf("isolate restart descriptors: %w", errno)
	}
	if !finishSignals() {
		return fmt.Errorf("restart cancelled by termination")
	}
	return syscall.Exec(target, []string{target}, env)
}

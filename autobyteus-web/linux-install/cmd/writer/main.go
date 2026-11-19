// The socket-activated writer never runs as root and never executes release bytes.
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"os/user"
	"strconv"
	"syscall"
	"time"

	"autobyteus.local/desktop/linux-install/internal/buildinfo"
	"autobyteus.local/desktop/linux-install/internal/install"
	"autobyteus.local/desktop/linux-install/internal/protocol"
	"autobyteus.local/desktop/linux-install/internal/store"
)

func run() error {
	if os.Geteuid() == 0 || len(os.Args) != 2 {
		return fmt.Errorf("writer requires its nonroot service identity")
	}
	p, err := install.ForUID(os.Args[1])
	if err != nil {
		return err
	}
	account, err := user.Lookup(p.Account)
	if err != nil || account.Uid != strconv.Itoa(os.Geteuid()) {
		return fmt.Errorf("wrong writer account")
	}
	identity, key, err := buildinfo.Identity()
	if err != nil {
		return err
	}
	if os.Getenv("LISTEN_PID") != strconv.Itoa(os.Getpid()) || os.Getenv("LISTEN_FDS") != "1" {
		return fmt.Errorf("writer requires owned systemd socket")
	}
	inherited := os.NewFile(3, "systemd socket")
	listener, err := net.FileListener(inherited)
	inherited.Close()
	if err != nil {
		return err
	}
	defer listener.Close()
	images, err := store.Open(p.App, identity.Arch, key)
	if err != nil {
		return err
	}
	defer images.Close()
	uid, _ := strconv.ParseUint(p.UID, 10, 32)
	for {
		connection, err := listener.Accept()
		if err != nil {
			return err
		}
		// Sequential service plus bounded socket IO serialize one installation transaction.
		handle(connection, uint32(uid), images)
	}
}

func handle(connection net.Conn, uid uint32, images *store.Store) {
	defer connection.Close()
	connection.SetDeadline(time.Now().Add(3 * time.Minute))
	unix, ok := connection.(*net.UnixConn)
	if !ok {
		return
	}
	raw, err := unix.SyscallConn()
	if err != nil {
		return
	}
	var credentials *syscall.Ucred
	var credentialError error
	if err = raw.Control(func(fd uintptr) {
		credentials, credentialError = syscall.GetsockoptUcred(int(fd), syscall.SOL_SOCKET, syscall.SO_PEERCRED)
	}); err != nil || credentialError != nil || credentials == nil || credentials.Uid != uid {
		return
	}
	q, payload, err := protocol.Read(connection)
	response := protocol.Response{}
	if err == nil {
		response, err = images.Handle(q, payload)
	}
	if err != nil {
		response = protocol.Response{Error: err.Error()}
		if errors.Is(err, store.ErrStageGone) {
			response.Code = protocol.StageGone
		}
	}
	json.NewEncoder(connection).Encode(response)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

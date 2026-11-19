package main

import (
	"embed"
	"errors"
	"fmt"
	"os"

	"autobyteus.local/desktop/linux-install/internal/buildinfo"
	"autobyteus.local/desktop/linux-install/internal/install"
	"autobyteus.local/desktop/linux-install/internal/protocol"
)

//go:embed payload/*
var payload embed.FS

func run() error {
	if os.Geteuid() != 0 || len(os.Args) != 1 {
		return fmt.Errorf("provisioner requires one-shot Ubuntu authorization and no arguments")
	}
	p, err := install.ForUID(os.Getenv("PKEXEC_UID"))
	if err != nil {
		return err
	}
	identity, key, err := buildinfo.Identity()
	if err != nil {
		return err
	}
	writer, err := payload.ReadFile("payload/writer")
	if err != nil {
		return fmt.Errorf("writer asset not built")
	}
	q, body, err := protocol.Read(os.Stdin)
	if err != nil {
		return err
	}
	if q.Operation == "uninstall" {
		return install.Remove(p, writer)
	}
	if err = install.Provision(p, q, body, key, identity.Arch, identity.Version, writer); err != nil {
		return err
	}
	fmt.Println(`{"committed":true}`)
	return nil
}
func failureStatus(err error) int {
	if errors.Is(err, install.ErrInsufficientInstallSpace) {
		return protocol.ExitInsufficientInstallSpace
	}
	return 1
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(failureStatus(err))
	}
}

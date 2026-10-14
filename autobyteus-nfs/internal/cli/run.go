package cli

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/service"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/setup"
)

func Run(args []string, release setup.Release) error {
	if len(args) > 0 {
		switch args[0] {
		case "verify-release":
			if len(args) != 2 {
				return errors.New("verify-release requires manifest path")
			}
			return VerifyRelease(args[1], release)
		case "internal-install":
			return InstallRoot(args[1:])
		case "internal-probe":
			if os.Geteuid() == 0 || len(args) < 3 || len(args) > 4 {
				return errors.New("invalid nonroot probe")
			}
			return service.Probe(args[1], args[2], len(args) == 4 && args[3] == "initialize")
		case "internal-create-source":
			if os.Geteuid() == 0 || len(args) != 2 || !config.AbsolutePath(args[1]) {
				return errors.New("invalid source creation")
			}
			return os.Mkdir(args[1], 0750)
		case "internal-handles":
			if os.Geteuid() != 0 || len(args) != 2 {
				return errors.New("invalid source qualification")
			}
			return platform.QualifyHandles(args[1])
		}
	}
	o, err := Parse(args)
	if err != nil {
		return err
	}
	if o.Action == "version" {
		fmt.Fprintln(os.Stdout, release.Version)
		return nil
	}
	if o.Action == "launcher-attachment" {
		return launcherAttachment(o.Nodes)
	}
	if err = CheckHost(); err != nil {
		return err
	}
	terminal := OpenTerminal()
	defer terminal.Close()
	if os.Geteuid() != 0 {
		if !o.Yes && !terminal.Confirm("Install/use the root-owned AutoByteus NFS control binary and request OS administrator approval? Storage/node changes get a separate plan") {
			return errors.New("administrator setup declined")
		}
		return Elevate(args)
	}
	if err = platform.TrustedPath(config.BinaryPath(), false); err != nil {
		return err
	}
	if err = platform.RootDirectory(config.PrivateDirectory(), 0700); err != nil {
		return err
	}
	if err = platform.RootDirectory(config.PublicDirectory, 0755); err != nil {
		return err
	}
	s := setup.Service{Store: config.Store{Directory: config.PrivateDirectory(), Owner: 0}, Public: config.Store{Directory: config.PublicDirectory, Owner: 0, Public: true}, Binary: config.BinaryPath(), Release: release}
	if o.Action == "service" {
		ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
		defer stop()
		return service.Supervise(ctx, s.Store.Directory, os.Stderr, func(lock *os.File) error {
			s.Runner = platform.Commands{Lock: lock}
			s.Lock = lock
			openSavedDocker(&s)
			if s.Docker != nil {
				defer s.Docker.Close()
			}
			return s.Reconnect(false)
		})
	}
	lock, err := platform.Lock(s.Store.Directory)
	if err != nil {
		return err
	}
	defer lock.Close()
	s.Runner = platform.Commands{Lock: lock}
	s.Lock = lock
	var pending setup.Plan
	pendingErr := s.Store.Read("pending-setup.json", &pending)
	var existing config.Attachment
	readErr := s.Store.Read("attachment.json", &existing)
	if o.Action == "" {
		if pendingErr == nil {
			o.Action, err = terminal.Ask("Setup is incomplete: review/retry saved setup (reconnect)", "reconnect")
		} else if readErr == nil {
			o.Action, err = terminal.Ask("Configured storage: status / reconnect / detach", "status")
		} else if os.IsNotExist(readErr) {
			o.Action, err = terminal.Ask("Create storage or connect to existing storage (create/connect)", "")
		} else {
			return readErr
		}
		if err != nil {
			return err
		}
	}
	if o.Action == "status" || o.Action == "reconnect" || o.Action == "detach" {
		openSavedDocker(&s)
		if s.Docker != nil {
			defer s.Docker.Close()
		}
		switch o.Action {
		case "reconnect":
			if pendingErr == nil {
				fmt.Fprintln(os.Stderr, "Resuming the same source/UUID. Any recovery restores configuration only, NOT storage bytes.")
				if len(pending.Attachment.Nodes) > 0 && !o.Drained && !terminal.Confirm("Drain the selected nodes again and approve recovery/recreation?") {
					return errors.New("renewed drain required")
				}
				if err = s.RecoverPendingNodes(true); err != nil {
					return err
				}
				p, e := s.PendingPlan()
				if e != nil {
					return e
				}
				for _, line := range p.Summary {
					fmt.Fprintln(os.Stderr, " -", line)
				}
				if err = s.Apply(p, o.Yes || terminal.Confirm("Apply this saved setup plan now?")); err != nil {
					return err
				}
				result, e := s.Status()
				printJSON(result)
				return e
			}
			fmt.Fprintln(os.Stderr, "Checking saved source and reconnecting; hard NFS may wait for storage.")
			if !o.Yes && !terminal.Confirm("Reconnect saved storage and complete eligible selected-node failed starts, including one retry of consumed attempts? Current restart=no remains a veto") {
				return errors.New("reconnect declined; no changes")
			}
			if err = s.Reconnect(true); err != nil {
				return err
			}
			if err = platform.InstallJob(s.Runner); err != nil {
				return err
			}
		case "detach":
			consent := o.Yes && o.Drained
			if !consent {
				consent = terminal.Confirm("Drain all users of this export/attachment and selected nodes, permit their interruption and safe detach? Source, marker, private data and volumes remain")
			}
			if err = s.Detach(consent); err != nil {
				return err
			}
			var receipt struct {
				Retained string `json:"retained"`
			}
			if s.Store.Read("apple-detach-receipt.json", &receipt) == nil {
				fmt.Fprintln(os.Stderr, receipt.Retained)
			}
			fmt.Fprintln(os.Stderr, "Detached; source, marker, named volumes and private receipts preserved.")
			return nil
		}
		fmt.Fprintln(os.Stderr, "Checking actual host and selected-node readiness; this may wait for storage.")
		result, err := s.Status()
		printJSON(result)
		return err
	}
	if o.Action != "create" && o.Action != "connect" {
		return errors.New("choose create or connect")
	}
	return runSetup(o, terminal, &s)
}
func openSavedDocker(s *setup.Service) {
	s.Docker = nil
	var endpoint struct {
		Socket string `json:"socket"`
	}
	if s.Store.Read("docker-endpoint.json", &endpoint) == nil && endpoint.Socket != "" {
		s.Docker, _ = docker.New(endpoint.Socket)
	}
}
func printJSON(v any) {
	b, err := json.MarshalIndent(v, "", "  ")
	if err == nil {
		fmt.Fprintln(os.Stdout, string(b))
	}
}

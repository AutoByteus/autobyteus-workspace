package cli

import (
	"errors"
	"fmt"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/setup"
	"os"
	"strings"
)

func runSetup(o Options, terminal *Terminal, s *setup.Service) error {
	u, err := initiatingUser()
	if err != nil {
		return err
	}
	s.User = u
	req, err := collect(o, terminal)
	if err != nil {
		return err
	}
	socket := socketFor(o, u)
	if socket != "" {
		s.Docker, err = docker.New(socket)
		if err != nil {
			fmt.Fprintln(os.Stderr, "Docker unavailable; nodes cannot be ready:", err)
		} else {
			defer s.Docker.Close()
		}
	}
	req.DockerSocket = socket
	if err = selectNodes(&o, terminal, s.Docker); err != nil {
		return err
	}
	if o.Nodes != "none" {
		req.Nodes = strings.Split(o.Nodes, ",")
	}
	p, err := s.Plan(req)
	if err != nil {
		return err
	}
	fmt.Fprintln(os.Stderr, "AutoByteus NFS plan:")
	for _, line := range p.Summary {
		fmt.Fprintln(os.Stderr, " -", line)
	}
	if len(p.Nodes) > 0 && !o.Drained && !terminal.Confirm("Are these exact selected nodes drained and is their stop/recreation approved?") {
		return errors.New("selected-node interruption declined")
	}
	consent := o.Yes || terminal.Confirm("Apply this exact source/network/service/node plan?")
	if err = s.Apply(p, consent); err != nil {
		return err
	}
	fmt.Fprintln(os.Stderr, "Checking actual host and selected-node readiness; this may wait for storage.")
	result, err := s.Status()
	if o.JSON {
		printJSON(struct {
			Connection config.Connection `json:"connection"`
			Status     setup.Status      `json:"status"`
		}{p.Attachment.Connection, result})
	} else if err != nil {
		printJSON(result)
	} else {
		fmt.Fprintln(os.Stderr, "Verified host workspace path:", p.Attachment.MountRoot, "\nSelect a project below this path. Keep storage online. Connection JSON for other computers:")
		printJSON(p.Attachment.Connection)
		for node, state := range result.Nodes {
			fmt.Fprintf(os.Stderr, "Node %s: %s\n", node, state)
		}
	}
	return err
}
func selectNodes(o *Options, t *Terminal, c *docker.Client) error {
	if c == nil {
		if o.Nodes != "" && o.Nodes != "none" {
			return errors.New("selected nodes unavailable")
		}
		o.Nodes = "none"
		fmt.Fprintln(os.Stderr, "No reachable local Docker daemon; no Docker nodes will be attached.")
		return nil
	}
	nodes, err := c.Discover()
	if err != nil {
		return err
	}
	names := []string{}
	for _, n := range nodes {
		names = append(names, n.Node())
	}
	fmt.Fprintln(os.Stderr, "Local managed Docker nodes:", strings.Join(names, ", "))
	if o.Nodes == "" {
		o.Nodes, err = t.Ask("Select exact nodes to attach (comma-separated), or none", "none")
	}
	return err
}

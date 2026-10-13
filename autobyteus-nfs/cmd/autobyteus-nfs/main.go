package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"os"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/cli"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/setup"
)

//go:embed release.json
var metadata []byte

func main() {
	var release setup.Release
	if err := json.Unmarshal(metadata, &release); err != nil {
		fmt.Fprintln(os.Stderr, "invalid embedded release metadata")
		os.Exit(1)
	}
	if err := cli.Run(os.Args[1:], release); err != nil {
		fmt.Fprintln(os.Stderr, "AutoByteus NFS incomplete:", err)
		os.Exit(1)
	}
}

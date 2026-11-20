// Package protocol defines a bounded one-request-per-connection stream.
package protocol

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"

	"autobyteus.local/desktop/linux-install/internal/release"
)

const MaxHeader = 8192
const StageGone = "STAGE_GONE"

type Request struct {
	Operation      string `json:"operation"`
	Record         []byte `json:"record,omitempty"`
	Signature      []byte `json:"signature,omitempty"`
	ExpectedDigest string `json:"expectedDigest,omitempty"`
	Channel        string `json:"channel,omitempty"`
	StageID        string `json:"stageID,omitempty"`
}

type Response struct {
	Code           string `json:"code,omitempty"`
	ExpectedDigest string `json:"expectedDigest,omitempty"`
	Error          string `json:"error,omitempty"`
	StageID        string `json:"stageID,omitempty"`
	Record         []byte `json:"record,omitempty"`
	Signature      []byte `json:"signature,omitempty"`
}

// A stage/provision request is a JSON line followed by exactly signed-size bytes and EOF.
// Client closes its write half; the response comes back on the same connection.
func Read(in io.Reader) (Request, *bufio.Reader, error) {
	reader := bufio.NewReaderSize(in, MaxHeader)
	line, err := reader.ReadSlice('\n')
	var request Request
	if err != nil {
		return request, reader, fmt.Errorf("request header refused")
	}
	decoder := json.NewDecoder(bytes.NewReader(line))
	decoder.DisallowUnknownFields()
	if err = decoder.Decode(&request); err != nil {
		return request, reader, err
	}
	if decoder.Decode(new(any)) != io.EOF {
		return request, reader, fmt.Errorf("trailing request header")
	}
	if len(request.Record) > release.MaxRecord || len(request.Signature) > 64 || len(request.StageID) > 64 || len(request.ExpectedDigest) > 64 || len(request.Channel) > 6 {
		return request, reader, fmt.Errorf("request fields exceed bounds")
	}
	return request, reader, nil
}

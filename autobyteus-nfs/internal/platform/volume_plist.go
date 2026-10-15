package platform

import (
	"bytes"
	"encoding/xml"
	"errors"
	"io"
	"strings"
)

// This bounded plist decoder is local to diskutil source identity, not a general
// serialization API. Unknown fields are structurally checked, never identity fallbacks.
type plistValue struct {
	kind, text string
	fields     map[string]plistValue
}

func volumePlist(data []byte) (map[string]plistValue, error) {
	if len(data) > 1<<20 {
		return nil, errors.New("oversized source volume plist")
	}
	d := xml.NewDecoder(bytes.NewReader(data))
	declaration, doctype := false, false
	var root xml.StartElement
	for {
		token, err := plistToken(d)
		if err != nil {
			return nil, err
		}
		switch t := token.(type) {
		case xml.ProcInst:
			if declaration || doctype || t.Target != "xml" || (string(t.Inst) != `version="1.0" encoding="UTF-8"` && string(t.Inst) != `version="1.0"`) {
				return nil, errors.New("unexpected plist declaration")
			}
			declaration = true
		case xml.Directive:
			if doctype || string(t) != `DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"` {
				return nil, errors.New("unexpected plist directive")
			}
			doctype = true
		case xml.StartElement:
			root = t
		default:
			return nil, errors.New("expected plist document")
		}
		if root.Name.Local != "" {
			break
		}
	}
	if root.Name != (xml.Name{Local: "plist"}) || len(root.Attr) != 1 || root.Attr[0].Name != (xml.Name{Local: "version"}) || root.Attr[0].Value != "1.0" {
		return nil, errors.New("invalid plist root")
	}
	t, err := plistToken(d)
	if err != nil {
		return nil, err
	}
	start, ok := t.(xml.StartElement)
	if !ok || start.Name.Local != "dict" {
		return nil, errors.New("expected one plist dictionary")
	}
	value, err := readPlistValue(d, start, 0)
	if err != nil {
		return nil, err
	}
	t, err = plistToken(d)
	if err != nil {
		return nil, err
	}
	if end, ok := t.(xml.EndElement); !ok || end.Name != root.Name {
		return nil, errors.New("extra plist content")
	}
	if _, err = plistToken(d); err != io.EOF {
		return nil, errors.New("trailing or malformed plist document")
	}
	return value.fields, nil
}

func plistToken(d *xml.Decoder) (xml.Token, error) {
	for {
		t, err := d.Token()
		if err != nil {
			return nil, err
		}
		switch value := t.(type) {
		case xml.Comment:
			continue
		case xml.CharData:
			if strings.TrimSpace(string(value)) == "" {
				continue
			}
		}
		return t, nil
	}
}

func readPlistValue(d *xml.Decoder, start xml.StartElement, depth int) (plistValue, error) {
	v := plistValue{kind: start.Name.Local}
	if depth > 32 || start.Name.Space != "" || len(start.Attr) != 0 {
		return v, errors.New("invalid or deeply nested plist value")
	}
	switch v.kind {
	case "dict":
		v.fields = map[string]plistValue{}
		for {
			t, err := plistToken(d)
			if err != nil {
				return v, err
			}
			if end, ok := t.(xml.EndElement); ok && end.Name == start.Name {
				return v, nil
			}
			key, ok := t.(xml.StartElement)
			if !ok || key.Name != (xml.Name{Local: "key"}) || len(key.Attr) != 0 {
				return v, errors.New("invalid plist dictionary key")
			}
			name, err := plistText(d, key)
			if err != nil {
				return v, err
			}
			if _, exists := v.fields[name]; exists {
				return v, errors.New("duplicate plist key")
			}
			t, err = plistToken(d)
			if err != nil {
				return v, err
			}
			child, ok := t.(xml.StartElement)
			if !ok {
				return v, errors.New("missing plist dictionary value")
			}
			entry, err := readPlistValue(d, child, depth+1)
			if err != nil {
				return v, err
			}
			v.fields[name] = entry
		}
	case "array":
		for {
			t, err := plistToken(d)
			if err != nil {
				return v, err
			}
			if end, ok := t.(xml.EndElement); ok && end.Name == start.Name {
				return v, nil
			}
			child, ok := t.(xml.StartElement)
			if !ok {
				return v, errors.New("invalid plist array value")
			}
			if _, err := readPlistValue(d, child, depth+1); err != nil {
				return v, err
			}
		}
	case "string", "integer", "real", "date", "data", "true", "false":
		text, err := plistText(d, start)
		if err != nil {
			return v, err
		}
		if (v.kind == "true" || v.kind == "false") && text != "" {
			return v, errors.New("invalid plist boolean")
		}
		v.text = text
		return v, nil
	default:
		return v, errors.New("unknown plist value type")
	}
}

func plistText(d *xml.Decoder, start xml.StartElement) (string, error) {
	var b strings.Builder
	for {
		t, err := d.Token()
		if err != nil {
			return "", err
		}
		switch value := t.(type) {
		case xml.CharData:
			b.Write(value)
		case xml.Comment:
		case xml.EndElement:
			if value.Name == start.Name {
				return b.String(), nil
			}
			return "", errors.New("mismatched plist scalar")
		default:
			return "", errors.New("nested or invalid plist scalar")
		}
	}
}

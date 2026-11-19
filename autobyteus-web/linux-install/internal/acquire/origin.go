//go:build !desktop_test

package acquire

import "net/url"

func permitted(u *url.URL) bool                        { return productionURL(u) }
func acquisitionURL(identity Identity) (string, error) { return identity.URL() }

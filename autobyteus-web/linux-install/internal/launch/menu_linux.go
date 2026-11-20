package launch

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"autobyteus.local/desktop/linux-install/internal/install"
)

type menuResources struct {
	flat, entry, icon menuFile
}

func desktopMenu(p install.Paths) (menuResources, error) {
	home, err := os.UserHomeDir()
	if err != nil || !filepath.IsAbs(home) || !utf8.ValidString(home) {
		return menuResources{}, fmt.Errorf("cannot resolve desktop resource paths")
	}
	share := filepath.Join(home, ".local/share")
	entry := menuFile{share: share, directory: "applications/autobyteus", name: "managed.desktop"}
	icon := menuFile{share: share, directory: "autobyteus-managed", name: "desktop-icon.png"}
	flat := menuFile{share: share, directory: "applications", name: "autobyteus-managed.desktop"}
	// Exact previous release, not just a filename or UID marker.
	template := "[Desktop Entry]\nType=Application\nName=AutoByteus\nExec=%s/AutoByteus.AppImage %%U\nIcon=%s\nTerminal=false\nCategories=Development;\nX-AutoByteus-Managed-UID=%s\n"
	flat.content = []byte(fmt.Sprintf(template, p.App, "applications-development", p.UID))
	escape := strings.NewReplacer("\\", "\\\\", "\n", "\\n", "\r", "\\r", "\t", "\\t", " ", "\\s")
	entry.content = []byte(fmt.Sprintf(template, p.App, escape.Replace(filepath.Join(share, icon.directory, icon.name)), p.UID) + "StartupWMClass=autobyteus-managed\n")
	return menuResources{flat, entry, icon}, nil
}

func (m *menuResources) loadIcon(appDir string) error {
	// appDir is the directory of the running AppRun ELF, never $APPDIR.
	data, err := os.ReadFile(filepath.Join(appDir, "resources/icons/512x512.png"))
	if err != nil {
		return err
	}
	if len(data) == 0 {
		return fmt.Errorf("packaged desktop icon is empty")
	}
	m.icon.content = data
	return nil
}

func EnsureMenu(p install.Paths, appDir string) error {
	m, err := desktopMenu(p)
	if err != nil {
		return err
	}
	if err = m.loadIcon(appDir); err != nil {
		return err
	}
	// Inspect all representations before publishing anything. Never displace a
	// user's customized shortcut (or its icon) to make the managed ID win.
	for _, file := range []menuFile{m.flat, m.entry, m.icon} {
		if _, err := file.installed(); err != nil {
			return err
		}
	}
	if err := m.icon.publish(); err != nil {
		return err
	}
	if err := m.entry.publish(); err != nil {
		return err
	}
	return m.flat.remove(false)
}

func RemoveMenu(p install.Paths, appDir string) error {
	m, err := desktopMenu(p)
	if err != nil {
		return err
	}
	// Remove only independently recognized resources; never read a destination
	// out of a desktop file. A foreign sibling is preserved and reported.
	entries := errors.Join(m.flat.remove(false), m.entry.remove(true))
	if err := m.loadIcon(appDir); err != nil {
		return errors.Join(entries, err)
	}
	return errors.Join(entries, m.icon.remove(true))
}

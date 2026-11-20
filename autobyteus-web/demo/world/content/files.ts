/**
 * The demo's folder (autobyteus-279, REQ-004: Files and Artifacts with real-looking content and a picture), ported from the approved design reference (`autobyteus-web-design` 78b51f73: `prototype/ios-demo/iosDemo.ts`).
 * One sample folder for every demo run, holding the files the conversations name. Invented content, no placeholders.
 */
export const DEMO_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
<rect width="960" height="600" rx="24" fill="#f8fafc"/>
<text x="56" y="84" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="600" fill="#0f172a">Release 1.6 · what pilot customers asked for</text>
<text x="56" y="124" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#64748b">Sample chart · requests per change</text>
<g font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#334155">
<text x="56" y="214">Keep export filters</text><rect x="330" y="186" width="520" height="40" rx="8" fill="#2563eb"/><text x="866" y="214" fill="#0f172a" font-weight="600">26</text>
<text x="56" y="304">Invoice language</text><rect x="330" y="276" width="380" height="40" rx="8" fill="#3b82f6"/><text x="726" y="304" fill="#0f172a" font-weight="600">19</text>
<text x="56" y="394">Name the failing row</text><rect x="330" y="366" width="300" height="40" rx="8" fill="#60a5fa"/><text x="646" y="394" fill="#0f172a" font-weight="600">15</text>
<text x="56" y="484">Connector 2.4</text><rect x="330" y="456" width="160" height="40" rx="8" fill="#93c5fd"/><text x="506" y="484" fill="#0f172a" font-weight="600">8</text>
</g>
</svg>`

const RELEASE_NOTES = [
  '# Release 1.6 — what’s new',
  '',
  'Release 1.6 ships on **Thursday, 12 March**. It brings three changes the pilot customers asked for.',
  '',
  '## Changes',
  '',
  '- **Export filters are kept.** Leave the export screen and come back: your filters are still set.',
  '- **Invoices in the customer’s language.** Invoices use the customer’s language and their country’s currency format.',
  '- **Imports name the row to fix.** When a row needs fixing, the import says which row and why.',
  '',
  '## Before you upgrade',
  '',
  '1. Back up the `exports/` folder.',
  '2. Update the connector to 2.4 or later.',
  '3. Run the sample import once; it takes about a minute.',
  '',
].join('\n')

export const DEMO_FILES: Record<string, string> = {
  'README.md': '# Pilot launch\n\nThe folder the sample agents work in: the 1.6 release notes, the pilot customers’ summary, the launch plan and a small code change.\n\n- `docs/` release notes, pilot summary, customer list, screenshots\n- `launch/` announcement, pilot email, release checklist\n- `src/` the export screen change\n',
  'docs/release-notes-1.6.md': RELEASE_NOTES,
  'docs/pilot-summary.md': '# Pilot summary\n\nThree changes, one new date: **Thursday, 12 March**.\n\n- Export filters are kept\n- Invoices in the customer’s language\n- Imports name the row to fix\n\nThe pilot customers asked for the date in writing and for the connector minimum (2.4).\n',
  'docs/pilot-customers.csv': 'customer,country,language,connector\nNorthwind Traders,DE,German,2.4\nBlue Harbor Foods,NL,Dutch,2.3\nCedar & Pine Studio,US,English,2.4\nLumen Clinics,FR,French,2.2\n',
  'docs/dashboard-before.png': '',
  'docs/dashboard-after.png': '',
  'launch/announcement.md': '# AutoByteus 1.6 is here\n\nYour export filters now stay put, invoices speak your customer’s language, and an import tells you exactly which row to fix.\n\nRelease 1.6 is available on Thursday, 12 March.\n',
  'launch/pilot-email.md': 'Subject: Release 1.6 on Thursday, 12 March\n\nHello,\n\nThank you for testing 1.6 with us. It ships on Thursday, 12 March, with the three changes you asked for. Please update the connector to 2.4 before you upgrade.\n\nThe release notes are attached.\n',
  'launch/checklist.md': '# Release checklist — 1.6\n\n- [x] Release notes final\n- [x] Pilot email approved\n- [ ] Connector 2.4 build published\n- [ ] Announcement scheduled for Thursday, 12 March\n',
  'docs/lease-renewal.md': '# Lease renewal\n\nThe flat on Garden Street, renewed for two years from 1 April.\n\n- Notice period: three months\n- Repairs: the landlord pays for anything over 200\n- Rent: fixed for the first year, then reviewed\n',
  'src/export/filters.ts': 'export function restoreFilters(saved: ExportFilters | null): ExportFilters {\n  // Keep the filters the user set when they come back to the export screen.\n  return saved ?? defaultFilters()\n}\n',
}

/** The pictures of the demo's folder: invented screens, no real data. */
export const demoImageFor = (path: string): string => (/before/i.test(path)
  ? `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><rect width="960" height="600" rx="24" fill="#f8fafc"/><text x="56" y="84" font-family="system-ui,-apple-system,sans-serif" font-size="34" font-weight="600" fill="#0f172a">Export · before 1.6</text><text x="56" y="124" font-family="system-ui,-apple-system,sans-serif" font-size="22" fill="#64748b">Sample screen · filters reset when you leave</text><rect x="56" y="170" width="848" height="56" rx="10" fill="#e2e8f0"/><text x="80" y="206" font-family="system-ui,-apple-system,sans-serif" font-size="22" fill="#64748b">Filters: none</text><g fill="#cbd5e1"><rect x="56" y="256" width="848" height="40" rx="8"/><rect x="56" y="312" width="848" height="40" rx="8"/><rect x="56" y="368" width="848" height="40" rx="8"/><rect x="56" y="424" width="848" height="40" rx="8"/></g></svg>`
  : DEMO_IMAGE_SVG)


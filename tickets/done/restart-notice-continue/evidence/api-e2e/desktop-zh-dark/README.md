# Desktop notice row in zh-CN and dark mode (a temporary copy of notice-row-presentation-probe.mjs: locale zh-CN with the
# app's preference `autobyteus.localization.preference-mode=zh-CN`, colorScheme dark; removed after)
- zh-CN: label 应用已重启 (aria-label too), time "2026年11月21日 GMT+1 08:32", no bracketed header. The probe's English label checks fail by design.
- Dark mode: the app has no dark theme (the page stays white) but the notice body follows `prefers-color-scheme: dark` and
  becomes slate-300 on white: contrast 1.48:1 (light mode slate-600: 7.58:1). Base 0da6bfbfc1 in dark mode
  (`../desktop-base-dark/`): the old notice is near white (slate-100) on white, so this is pre-existing and slightly better
  now. Follow-up FU (follow-ups.md).

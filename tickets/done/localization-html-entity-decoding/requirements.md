Status: Design-ready
Scope: Small

# Problem

Localized UI strings that contain HTML entities such as `&rarr;`, `&larr;`, `&amp;`, `&lt;`, and `&times;` are rendered as literal text after the multilingual UI extraction work. The user-visible symptom is `View Details &rarr;` instead of a rendered arrow.

# Requirements

1. The localization runtime must return decoded plain text for HTML-entity-backed catalog entries without switching to unsafe HTML rendering.
2. The fix must cover the reported arrow regressions and the same failure class in other localized UI labels.
3. Existing parameter interpolation behavior must keep working after the change.
4. The change must be validated with targeted automated coverage.

# Acceptance Criteria

1. `View Details` actions render a real arrow instead of the literal `&rarr;`.
2. Back-navigation labels backed by `&larr;` render a real arrow.
3. Labels backed by `&amp;`, `&lt;`, and `&times;` render `&`, `<...>`, and `×` respectively.
4. No HTML injection path is introduced; translated output remains plain text.

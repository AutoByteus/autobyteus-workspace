Status: Current

# Future-State Flow

1. Component calls `localizationRuntime.translate(key, params)`.
2. Runtime resolves the active or fallback catalog entry.
3. Runtime interpolates `{{param}}` tokens into the string.
4. Runtime decodes HTML entities in the final string into plain text characters.
5. Vue renders the returned string as a text node.

# Covered Examples

- `View Details &rarr;` -> `View Details →`
- `&larr; Back to all agents` -> `← Back to all agents`
- `Install &amp; Restart` -> `Install & Restart`
- `user:&lt;snowflake&gt;` -> `user:<snowflake>`
- `&times;` -> `×`

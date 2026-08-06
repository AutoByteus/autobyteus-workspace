export const EDIT_FILE_DESCRIPTION =
  'Applies a context-located patch to one file using a simplified unified-diff-style format, without overwriting unrelated content. Before calling `edit_file`, read the current relevant file region unless it was just read and has not changed. Copy unchanged and removal lines exactly from that latest content; do not reconstruct them from memory. After an intervening edit or a context-match failure, read the affected region again before retrying. File paths use trusted-local semantics: absolute paths are used directly; relative paths require an explicit absolute `base_dir` and are never resolved from workspace, process, or shell `cd` state. Use this for surgical edits; use `write_file` only for a deliberate whole-file rewrite.';

export const EDIT_FILE_PATCH_DESCRIPTION =
  'Patch content in a simplified unified-diff-style format. Start every hunk with a bare `@@` line. Prefix unchanged lines with one space, removals with `-`, and additions with `+`. Copy unchanged and removal lines exactly from the latest current file content. The target file is identified by the separate `path` argument; inside `patch`, provide only bare context hunks. Do not include Git file headers (`diff --git`, `---`, or `+++`), numeric hunk coordinates, or semantic envelopes such as `*** Begin Patch` and `*** End Patch`. Include enough unchanged or removal lines to identify exactly one eligible location.';

export const EDIT_FILE_PATCH_EXAMPLE = `@@
-const mode = 'old'
+const mode = 'new'
 const keep = true`;

export const EDIT_FILE_PATCH_FIELD_GUIDANCE =
  `${EDIT_FILE_PATCH_DESCRIPTION}\n\nExample patch:\n${EDIT_FILE_PATCH_EXAMPLE}`;

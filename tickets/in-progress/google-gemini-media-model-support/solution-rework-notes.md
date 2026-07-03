# Solution Rework Notes — CR-002 Gemini Omni Scope Decision

## Status

Resolved: user chose current ticket = `generate_video` creation support; future work = `edit_video`/uploaded-source-video/stateful editing.

## Trigger

Code review round 3 rerouted the Google Gemini media model support task back to solution design because official Gemini Omni Flash docs document video input/editing capabilities beyond the approved narrow `generate_video` contract.

- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support/code-review-report.md`
- Finding: `CR-002 — Current design/tool contract omits documented Gemini Omni video-input/editing capabilities`

## Official Source Recheck

Source: Google AI for Developers, `Generate and edit videos with Gemini Omni Flash`, `https://ai.google.dev/gemini-api/docs/omni`, checked 2026-07-03.

Relevant findings:

- `gemini-omni-flash-preview` is described as a multimodal video generation/editing model.
- The docs say the model processes text, image, audio, and video simultaneously, but the same docs list important limitations for audio/video references.
- Documented generation examples include text-to-video and image/reference-image-to-video.
- Documented `video_config.task` values are `text_to_video`, `image_to_video`, `reference_to_video`, and `edit`.
- Documented editing flows include:
  - stateful editing with `previous_interaction_id` after an initial generation;
  - uploaded-video editing through the Files API using a document/video input URI.
- Documented limitations include:
  - audio references are unsupported;
  - voice editing is unsupported;
  - uploaded-video editing is not available in EEA, Switzerland, or the UK;
  - short video references up to 3 seconds are schema-accepted but not correctly processed;
  - multi-video prompting/reasoning is unsupported;
  - video extension/interpolation is unsupported.

## Current Approved Scope Conflict

The approved requirements/design intentionally scoped initial video support to:

- text-to-video;
- optional image/reference-image-to-video;
- output MP4 writing;
- default video model catalog/settings;
- no video editing sessions;
- no uploaded source-video editing;
- no audio-reference upload.

That narrow scope is internally coherent, but after the user's explicit verification request it is no longer safe to assume it matches the user's product expectation for “support Gemini Omni Flash” unless the user re-approves the narrower capability set.

## Scope Options For User Decision

### Option A — Keep narrow v1 scope, explicitly approved

Keep the current basic creation contract:

```ts
generate_video({
  prompt: string,
  input_images?: string[],
  output_file_path: string,
  generation_config?: {
    aspect_ratio?: '16:9' | '9:16',
    delivery?: 'uri' | 'inline',
    task?: 'text_to_video' | 'image_to_video' | 'reference_to_video'
  }
})
```

Design updates needed:

- Keep uploaded-video editing and stateful editing out of scope with explicit user re-approval.
- Expose supported non-edit task values only where compatible with current inputs.
- Keep audio references out of scope because official docs say they are unsupported.
- Route revised narrow-scope requirements/design back through architecture review.

Pros: fastest path to usable video creation; lowest implementation/test risk.
Cons: not full documented Omni editing capability.

### Option B — Expand this ticket to include video editing

Add explicit edit capability in this same ticket. Recommended API boundary if expanded:

```ts
generate_video({ ... }) // creation only: text/image/reference-to-video

edit_video({
  prompt: string,
  input_video?: string,              // local path/file URL/remote URL/data URI uploaded through Files API
  previous_interaction_id?: string,  // stateful edit continuation
  output_file_path: string,
  generation_config?: {
    aspect_ratio?: '16:9' | '9:16',
    delivery?: 'uri' | 'inline'
  }
})
```

Design updates needed:

- Add `edit_video` as a distinct server-owned media tool rather than overloading `generate_video`.
- Add provider-owned source-video Files API upload/polling and cleanup inside the Gemini video provider boundary.
- Add explicit previous interaction state handling/return semantics.
- Add region/access limitations to requirements and live-test skip classification.
- Add tests/API-E2E coverage for upload/edit/state flows.

Pros: closer to documented Omni editing capabilities.
Cons: larger scope, more complex state/upload lifecycle, more API/E2E risk.

### Option C — Split work

Finish v1 creation now, then create a follow-up ticket for `edit_video`/stateful editing/uploaded source videos.

Pros: keeps current delivery moving while preserving a clear design path for full editing.
Cons: full Omni editing support waits for follow-up.

## Recommendation

Recommend Option C unless the user needs uploaded-video editing immediately.

Reason: the current implementation/review work is already structured for creation. Adding stateful editing and source-video uploads now changes tool contracts, provider adapter lifecycle, cleanup rules, tests, and API/E2E scope substantially. Option C gives users text/image/reference-to-video quickly while making the editing gap explicit and avoiding a patch-on-patch design.

## Pending User Question

Should this ticket:

1. keep narrow v1 creation only,
2. expand now to include `edit_video` and uploaded/source-video editing, or
3. finish creation now and create a follow-up for editing?


## User Decision

On 2026-07-03, the user confirmed: video editing can be handled in a future edit/video-editing task, but the current ticket definitely needs correct `generate_video` support. This resolves CR-002 by explicitly re-approving the current ticket as creation-only.

Implication: revise requirements/design to expose correct creation behavior, including non-edit `video_config.task` values where useful (`text_to_video`, `image_to_video`, `reference_to_video`), and keep `edit`, uploaded/source-video editing, audio references, and `previous_interaction_id` out of this ticket.

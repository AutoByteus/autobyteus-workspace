# Release Notes — output-tps-precision

## Improvements

- **Precise TPS in the Token Meter.** The TPS card now shows how fast the selected agent's latest model call produced output, with the model it used. The server times each call itself, so a turn with a single model call gets a reading. Tool runs and approval waits are no longer counted.
- **Clear measurement method.** When the runtime proves when output starts, the reading is generation speed, from the first streamed output to the end. Otherwise it is end-to-end call speed, labelled "incl. time to first token". "How TPS is measured" explains each reading with its tokens and seconds, in English and Simplified Chinese.
- **Works for every agent you can select.** Standalone agents, Team and Org members, and delegated copies each show their own TPS. Very short calls are skipped and leave the last value in place. TPS is not kept after a reload.

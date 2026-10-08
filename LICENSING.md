# Licensing

AutoByteus is dual-licensed: under the GNU Affero General Public License v3.0
only (AGPL-3.0-only), or under a commercial license from the copyright holder.

Copyright (C) 2026 Yu Zheng (AutoByteus)

> This page is a summary, not legal advice. The license texts in the `LICENSE`
> files govern.

## Which license applies to which component

| Component | License |
| --- | --- |
| Everything in this repository that is not listed as Apache-2.0 below, including `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web` (including the desktop app and its Electron module), `autobyteus-message-gateway` (including the WeChaty sidecar), `autobyteus-android`, `autobyteus-ios`, `docker`, `scripts` and `docs` | AGPL-3.0-only ([`LICENSE`](./LICENSE)), or a commercial license |
| `autobyteus-application-backend-sdk`: SDK for building the backend of your own AutoByteus applications | Apache-2.0 |
| `autobyteus-application-frontend-sdk`: SDK for building the frontend of your own AutoByteus applications | Apache-2.0 |
| `autobyteus-application-sdk-contracts`: shared contracts used by the application SDKs | Apache-2.0 |
| `autobyteus-application-devkit` (including `templates/`): tooling and templates for creating and packing your own applications | Apache-2.0 |
| `autobyteus-agent-presentation-contracts`: wire contracts that applications use to talk to AutoByteus | Apache-2.0 |
| `autobyteus-collaboration-stream-contracts`: wire contracts that applications use to talk to AutoByteus | Apache-2.0 |
| `autobyteus-team-stream-contracts`: wire contracts that applications use to talk to AutoByteus | Apache-2.0 |
| `applications/brief-studio`: sample application you can copy for your own applications | Apache-2.0 |
| `applications/socratic-math-teacher`: sample application you can copy for your own applications | Apache-2.0 |

The Apache-2.0 components are what you use to build your own AutoByteus
applications. Your application may use any license, including a closed-source
or commercial one. Each Apache-2.0 component has its own `LICENSE` file with
the full Apache License 2.0 text.

## What AGPL-3.0 means in practice

- You may use, study, modify and share AutoByteus.
- If you distribute AutoByteus or a modified version (for example as an
  installer, a Docker image or part of a bundled product), you must make the
  complete corresponding source code available under AGPL-3.0.
- If you let other people use a modified version over a network (for example
  as a hosted service), you must also offer them the complete corresponding
  source code under AGPL-3.0.
- Using AutoByteus internally, without distributing it and without offering it
  to outside users, does not require you to publish your changes.

## Commercial license

If you want to build closed-source products or services on AutoByteus without
the AGPL-3.0 obligations, you can obtain a commercial license from the
copyright holder. Contact: **ryan.zheng.work@gmail.com**.

## Earlier releases

Versions released up to and including v1.4.97 were published under the Apache
License 2.0 and remain available under it. The AGPL-3.0-only / commercial
terms apply from the commit that introduced this file onward.

## Additional permission under AGPL-3.0 section 7

If you modify this Program, or any covered work, by linking or combining it
with the Claude Agent SDK (the npm package `@anthropic-ai/claude-agent-sdk` and
its platform-specific companion packages published by Anthropic PBC), or a
modified version of that library, containing parts covered by the terms of
that library's license, the licensors of this Program grant you additional
permission to convey the resulting work. Corresponding Source for a non-source
form of such a combination shall not include the source code for the parts of
that library used.

## Contributions

Contributions require accepting the AutoByteus Contributor License Agreement
([`CLA.md`](./CLA.md)), which lets the copyright holder offer them under
AGPL-3.0-only and under commercial licenses. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for how to contribute and accept it.

## Third-party components

Third-party components keep their own licenses. See
[`autobyteus-web/public/THIRD_PARTY_NOTICES/`](./autobyteus-web/public/THIRD_PARTY_NOTICES/)
and the license of each dependency.

## Note

This page is a summary, not legal advice. The license texts in `LICENSE` files
govern.

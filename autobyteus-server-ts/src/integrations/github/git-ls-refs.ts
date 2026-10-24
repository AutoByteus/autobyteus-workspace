/**
 * Git protocol v2 `ls-refs` for one repository's default branch and its head commit: the request
 * body and the answer's parsing. A git request costs no GitHub REST quota and its answer has a
 * constant size (only `HEAD`), unlike the v0 ref advertisement, which lists every ref.
 */

const FLUSH = "0000";
const DELIMITER = "0001";

/** One pkt-line: its total length (payload + 4) in 4 hex digits, then the payload. */
const pktLine = (payload: string): string => `${(Buffer.byteLength(payload) + 4).toString(16).padStart(4, "0")}${payload}`;

/** The request body: `ls-refs` for `HEAD` with its symbolic target. */
export const buildLsRefsHeadRequest = (): string => [
  pktLine("command=ls-refs\n"),
  pktLine("agent=autobyteus\n"),
  pktLine("object-format=sha1\n"),
  DELIMITER,
  pktLine("symrefs\n"),
  pktLine("ref-prefix HEAD\n"),
  FLUSH,
].join("");

export const LS_REFS_HEADERS: Readonly<Record<string, string>> = {
  Accept: "application/x-git-upload-pack-result",
  "Content-Type": "application/x-git-upload-pack-request",
  "Git-Protocol": "version=2",
};

export type RepositoryHead = Readonly<{ defaultBranch: string; latestRevision: string }>;

const HEAD_LINE = /^([0-9a-f]{40}) HEAD symref-target:refs\/heads\/(\S+)$/;

/** The `HEAD` line of an `ls-refs` answer; throws when the answer has no such line. */
export const parseLsRefsHead = (answer: string): RepositoryHead => {
  let offset = 0;
  while (offset + 4 <= answer.length) {
    const length = Number.parseInt(answer.slice(offset, offset + 4), 16);
    if (!Number.isInteger(length)) break;
    if (length === 0) break;
    if (length < 4) { offset += 4; continue; }
    const payload = answer.slice(offset + 4, offset + length).replace(/\n$/, "");
    offset += length;
    const match = HEAD_LINE.exec(payload);
    if (match) return { latestRevision: match[1]!, defaultBranch: match[2]! };
  }
  throw new Error("GitHub repository head is unavailable.");
};

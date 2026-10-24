// Usage: node sheetjs-hyperlink.cjs <xlsx-package-dir> [<dompurify-dir> <jsdom-dir>]
// Generated fixture: cells with an https link, a javascript: link and a mailto link, round-tripped through xlsx and biff8.
const XLSX = require(process.argv[2]);
const ws = XLSX.utils.aoa_to_sheet([["site", "evil", "mail"]]);
ws.A1.l = { Target: "https://example.com/a?b=1&c=2" };
ws.B1.l = { Target: "javascript:alert(1)" };
ws.C1.l = { Target: "mailto:x@example.com" };
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "S");
let purify = null;
if (process.argv[3]) {
  const { JSDOM } = require(process.argv[4]);
  purify = require(process.argv[3])(new JSDOM("").window);
}
for (const bookType of ["xlsx", "biff8"]) {
  const back = XLSX.read(new Uint8Array(XLSX.write(wb, { type: "array", bookType })), { type: "array" });
  const html = XLSX.utils.sheet_to_html(back.Sheets.S, { header: "", footer: "" });
  console.log(XLSX.version, bookType, "RAW:", html);
  if (purify) {
    console.log("  tables-only :", purify.sanitize(html, { ALLOWED_TAGS: ["table","thead","tbody","tr","th","td","br"], ALLOWED_ATTR: ["colspan","rowspan"] }));
    console.log("  design (no data-*):", purify.sanitize(html, { ALLOWED_TAGS: ["table","thead","tbody","tr","th","td","br"], ALLOWED_ATTR: ["colspan","rowspan"], ALLOW_DATA_ATTR: false }));
    console.log("  with a[href]:", purify.sanitize(html, { ALLOWED_TAGS: ["table","thead","tbody","tr","th","td","br","a"], ALLOWED_ATTR: ["colspan","rowspan","href"] }));
  }
}

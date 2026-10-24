// Usage: node sheetjs-attr-escape.cjs <path-to-xlsx-package-dir>
// Generated fixture only: a cell whose text contains a double quote and an event-handler attribute.
const XLSX = require(process.argv[2]);
const payload = 'x" onmouseover="window.__pwned=1" data-y="';
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[payload]]), "S");
const back = XLSX.read(new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" })), { type: "array" });
const html = XLSX.utils.sheet_to_html(back.Sheets.S, { id: "excel-table", editable: false });
const td = html.match(/<td[^>]*>/)[0];
console.log(XLSX.version, td, /"\s+onmouseover="/.test(td) ? "INJECTED_ATTRIBUTE" : "ESCAPED");

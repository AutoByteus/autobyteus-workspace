// Usage: node sheetjs-roundtrip.cjs <path-to-xlsx-package-dir>
const XLSX = require(process.argv[2]);
const rows = [["Name", "Qty", "Note"], ["Apple", 3, "<b>x</b> & y"], ["Pear", 4.5, "ü 中文"]];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Fruits");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["only"]]), "Second");
const out = {};
for (const [fmt, bookType] of [["xlsx", "xlsx"], ["xls", "biff8"], ["xlsm", "xlsm"]]) {
  const buf = XLSX.write(wb, { type: "array", bookType });
  const back = XLSX.read(new Uint8Array(buf), { type: "array" });
  out[fmt] = { sheets: back.SheetNames, html: XLSX.utils.sheet_to_html(back.Sheets[back.SheetNames[0]], { id: "excel-table", editable: false }) };
}
const csv = XLSX.read("a,b\n1,2\n", { type: "string" });
out.csv = { sheets: csv.SheetNames, html: XLSX.utils.sheet_to_html(csv.Sheets[csv.SheetNames[0]], { id: "excel-table", editable: false }) };
out.version = XLSX.version;
console.log(JSON.stringify(out, null, 1));

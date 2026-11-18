// node make-fixtures.cjs <xlsx package dir> <out dir>: generated workbooks only (two sheets, a hyperlinked cell, a markup cell).
const XLSX = require(process.argv[2]); const fs = require('fs'); const path = require('path');
const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const s1 = XLSX.utils.aoa_to_sheet([['Name', 'Qty', 'Link'], ['Apple', 3, 'example site'], ['<b>bold?</b>', 7, 'evil']]);
s1.C2.l = { Target: 'https://example.com/' }; s1.C3.l = { Target: 'javascript:window.__pwned=1' };
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, s1, 'Fruits'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Second sheet only']]), 'Notes');
fs.writeFileSync(path.join(out, 'generated-sample.xlsx'), XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
fs.writeFileSync(path.join(out, 'generated-sample.xls'), XLSX.write(wb, { type: 'buffer', bookType: 'biff8' }));
console.log(fs.readdirSync(out).join(' '), 'xlsx', XLSX.version);

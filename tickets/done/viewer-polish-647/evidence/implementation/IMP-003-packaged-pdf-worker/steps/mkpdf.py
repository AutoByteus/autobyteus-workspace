import sys
def pdf(path, title, pages):
    objs = []
    kids = " ".join(f"{3+2*i} 0 R" for i in range(pages))
    objs.append("<< /Type /Catalog /Pages 2 0 R >>")
    objs.append(f"<< /Type /Pages /Kids [{kids}] /Count {pages} >>")
    font = 3 + 2 * pages
    for i in range(pages):
        text = f"BT /F1 28 Tf 72 700 Td ({title} page {i+1}) Tj ET"
        objs.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font} 0 R >> >> /Contents {4+2*i} 0 R >>")
        objs.append(f"<< /Length {len(text)} >>\nstream\n{text}\nendstream")
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    out = b"%PDF-1.4\n"; offs = []
    for n, o in enumerate(objs, 1):
        offs.append(len(out)); out += f"{n} 0 obj\n{o}\nendobj\n".encode()
    x = len(out)
    out += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode() + "".join(f"{o:010d} 00000 n \n" for o in offs).encode()
    out += f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF\n".encode()
    open(path, "wb").write(out)
d = sys.argv[1]
for name, n in [("alpha", 3), ("beta", 2), ("gamma", 4)]:
    pdf(f"{d}/{name}.pdf", name.capitalize(), n)

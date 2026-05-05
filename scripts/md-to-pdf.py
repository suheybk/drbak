"""Render a markdown file to a print-friendly PDF via Edge headless.

Usage:
    python scripts/md-to-pdf.py <input.md> <output.pdf> [--title "..."]
"""

import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import markdown


CSS = """
@page {
  size: A4;
  margin: 18mm 16mm;
  @bottom-center { content: counter(page) " / " counter(pages); }
}

* { box-sizing: border-box; }

html, body {
  font-family: -apple-system, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.5;
  color: #1a1a1a;
  margin: 0;
  padding: 0;
}

h1 {
  font-size: 22pt;
  font-weight: 700;
  margin: 0 0 8pt 0;
  padding-bottom: 6pt;
  border-bottom: 2px solid #1f3a5f;
  color: #1f3a5f;
  page-break-after: avoid;
}

h2 {
  font-size: 15pt;
  font-weight: 700;
  margin: 18pt 0 6pt 0;
  color: #1f3a5f;
  page-break-after: avoid;
}

h3 {
  font-size: 12pt;
  font-weight: 700;
  margin: 12pt 0 4pt 0;
  color: #2a4a6f;
  page-break-after: avoid;
}

h4 {
  font-size: 10.5pt;
  font-weight: 700;
  margin: 10pt 0 3pt 0;
  color: #2a4a6f;
}

p { margin: 4pt 0; }

ul, ol { margin: 4pt 0 6pt 0; padding-left: 18pt; }
li { margin: 2pt 0; }

strong { color: #c0392b; font-weight: 700; }

code {
  background: #f4f4f4;
  padding: 1pt 4pt;
  border-radius: 2pt;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 9.5pt;
}

pre {
  background: #f4f4f4;
  padding: 8pt;
  border-radius: 3pt;
  font-size: 9pt;
  overflow-x: auto;
  page-break-inside: avoid;
}

blockquote {
  border-left: 3pt solid #1f3a5f;
  padding: 4pt 8pt;
  margin: 6pt 0;
  color: #444;
  background: #fafbfd;
}

a { color: #1f3a5f; text-decoration: none; }
a:after { content: " (" attr(href) ")"; font-size: 8pt; color: #888; word-break: break-all; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 6pt 0;
  font-size: 9.5pt;
  page-break-inside: avoid;
}

thead { background: #1f3a5f; color: #fff; }

th, td {
  border: 0.5pt solid #b0b8c4;
  padding: 4pt 6pt;
  text-align: left;
  vertical-align: top;
}

th { font-weight: 700; }

tbody tr:nth-child(even) { background: #f7f9fc; }

hr {
  border: none;
  border-top: 0.5pt solid #b0b8c4;
  margin: 12pt 0;
}

/* Avoid orphan headings + table rows */
h1, h2, h3, h4 { break-after: avoid-page; }
tr, li { break-inside: avoid; }
"""


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>{title}</title>
<style>{css}</style>
</head>
<body>
{content}
<footer style="margin-top: 18pt; font-size: 8pt; color: #777; border-top: 0.5pt solid #b0b8c4; padding-top: 6pt;">
Hazırlayan: drbak yazılım ekibi · {title} · Mayıs 2026
</footer>
</body>
</html>
"""


def find_edge() -> str:
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    raise RuntimeError("Could not find Edge or Chrome on this machine.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="Path to markdown file")
    parser.add_argument("output", help="Path to output PDF")
    parser.add_argument("--title", default="Document", help="HTML title")
    args = parser.parse_args()

    md_path = Path(args.input).resolve()
    pdf_path = Path(args.output).resolve()

    md_text = md_path.read_text(encoding="utf-8")
    html_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "sane_lists"],
        output_format="html5",
    )

    html_doc = HTML_TEMPLATE.format(title=args.title, css=CSS, content=html_body)

    with tempfile.NamedTemporaryFile(
        suffix=".html", delete=False, mode="w", encoding="utf-8"
    ) as f:
        f.write(html_doc)
        tmp_html = Path(f.name)

    try:
        edge = find_edge()
        # file:// URI must use forward slashes
        file_uri = "file:///" + str(tmp_html).replace("\\", "/")
        cmd = [
            edge,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            file_uri,
        ]
        print("Running:", " ".join(cmd))
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print("Edge stderr:", result.stderr, file=sys.stderr)
            sys.exit(result.returncode)
        if not pdf_path.exists():
            print("PDF not created at", pdf_path, file=sys.stderr)
            sys.exit(1)
        print(f"Wrote {pdf_path} ({pdf_path.stat().st_size:,} bytes)")
    finally:
        try:
            tmp_html.unlink()
        except FileNotFoundError:
            pass


if __name__ == "__main__":
    main()

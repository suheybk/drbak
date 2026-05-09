# Marketing artwork

Generated, print-ready files for the Dr. Bak clinic. All artwork ships
in CMYK with crop marks and bleed.

## A5 brochure

- **File**: `dr-bak-brochure-A5-cmyk.pdf`
- **Trim size**: 148 × 210 mm (A5 portrait)
- **Bleed**: 3 mm on every side (full sheet 154 × 216 mm)
- **Pages**: 2 (front + back, intended for double-sided printing on one A5 sheet)
- **Colour space**: CMYK (every fill/stroke explicitly constructed via `CMYKColor(c, m, y, k)`)
- **Fonts**: Helvetica family (PDF Type 1, ReportLab embeds the subset)
- **QR code**: encodes `https://www.instagram.com/uzm_dr_oguzbak`, error
  correction level H (~30% damage tolerated, scans down to 30 mm print
  size with margin to spare)
- **Builder**: `scripts/build-brochure.py` (Python, deps: `qrcode[pil]`,
  `reportlab`, `Pillow`). Re-run after content edits.

### What to give the printer

Just the PDF. The crop marks at the four corners mark the trim line; the
3 mm bleed extends past them. Most digital printers will ask to "include
bleed and trim marks" — both are present.

### Editing the content

Open `scripts/build-brochure.py`. Front-page copy is in `draw_front()`,
back-page services + contact list is in `draw_back()`. CMYK brand
constants are at the top of the file — keep them in sync with the
website's brand tokens (`apps/web/src/styles/global.css`) when the
clinic rebrands.

### Re-running

```bash
pip install --quiet 'qrcode[pil]' reportlab Pillow
python scripts/build-brochure.py
```

Output goes back to this directory.

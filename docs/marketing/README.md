# Marketing artwork

Generated, print-ready files for the Dr. Bak clinic. All artwork ships
in CMYK with crop marks and bleed.

All copy in both brochures is sourced strictly from
`uzmdroguzbak-com/index.html` — the practice's three real service
pillars (Nöropatik Ağrı, Migren, Ozon & Destekleyici), the doctor's
own positioning, working hours, phone, and the International Health
Tourism credential. No fabricated services or addresses.

## A5 booklet brochure

- **File**: `dr-bak-brochure-A5-cmyk.pdf`
- **Trim size**: 148 × 210 mm (A5 portrait)
- **Bleed**: 3 mm on every side (full sheet 154 × 216 mm)
- **Pages**: 2 (front + back, intended for double-sided printing on one A5 sheet)
- **Colour space**: CMYK (every fill/stroke explicitly constructed via `CMYKColor(c, m, y, k)`)
- **Fonts**: Liberation Sans (open SIL/GPL Arial/Helvetica clone, bundled
  at `scripts/fonts/LiberationSans-{Regular,Bold}.ttf`). The PDF carries
  an embedded TTF subset with full Turkish glyph coverage. The original
  Helvetica fallback dropped ğ Ğ ı İ ş Ş entirely.
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

## A4 tri-fold clinic leaflet

- **File**: `dr-bak-trifold-A4-cmyk.pdf`
- **Trim**: A4 landscape (297 × 210 mm), three 99 mm panels
- **Bleed**: 3 mm on every side
- **Pages**: 2 (outer face + inner face)
- **Format**: standard "letter-fold" / Z-fold imposition
- **Builder**: `scripts/build-trifold.py`

### Imposition (left-to-right when laid flat)

```
Page 1 (outer face)
  ┌────────────┬────────────┬────────────┐
  │ İLETİŞİM   │ TANIŞALIM  │ FRONT      │
  │ phone /    │ doctor +   │ COVER      │
  │ web / IG   │ team /     │ headline + │
  │ hours /    │ portrait   │ QR         │
  │ creds      │            │            │
  └────────────┴────────────┴────────────┘

Page 2 (inner face — the spread you see when the brochure is fully open)
  ┌────────────┬────────────┬────────────┐
  │ 01         │ 02         │ 03         │
  │ Nöropatik  │ Migren     │ Ozon &     │
  │ Ağrı       │ Tanı ve    │ Destek-    │
  │            │ Tedavisi   │ leyici     │
  └────────────┴────────────┴────────────┘
```

Fold ticks (small lines) appear above and below each fold position,
outside the trim, so the press operator folds at the right line. The
crop marks at the four trim corners come off in the cut.

### Re-running

```bash
python scripts/build-trifold.py
```

### Editing

Service copy lives in the `services = [...]` list at the top of
`draw_inside()`. Doctor bio + team list are in `draw_outside()`.

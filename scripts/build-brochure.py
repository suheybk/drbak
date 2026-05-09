"""
Build the Dr. Bak A5 print brochure as a CMYK-coloured PDF with 3mm bleed
and corner crop marks. Front (page 1) carries the brand mark, value prop,
and the QR code linking to the doctor's Instagram. Back (page 2) lists
services, address, phone, working hours.

Usage: python scripts/build-brochure.py
Output: docs/marketing/dr-bak-brochure-A5-cmyk.pdf

Notes for the print shop (also embedded in the PDF metadata):
  - Trim size: A5 (148 x 210 mm)
  - Bleed: 3 mm on all sides (full sheet 154 x 216 mm)
  - Colour space: CMYK (every fill/stroke is constructed via CMYKColor)
  - Fonts: Liberation Sans (open SIL/GPL clone of Helvetica/Arial) bundled
    in `scripts/fonts/`. PDF carries an embedded TTF subset with full
    Turkish glyph coverage (ğ Ğ ı İ ş Ş ç Ç).
  - QR code: encodes https://www.instagram.com/uzm_dr_oguzbak — high error-
    correction so partial-occlusion doesn't break the scan.
"""

from __future__ import annotations
import os
from io import BytesIO

import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image
from reportlab.lib.colors import CMYKColor
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.pdfgen.canvas import Canvas

# ─── Constants ──────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(ROOT, "apps/web/public/images/drbak-logo-square.png")
FONT_DIR = os.path.join(ROOT, "scripts/fonts")
OUT_DIR = os.path.join(ROOT, "docs/marketing")
OUT_PDF = os.path.join(OUT_DIR, "dr-bak-brochure-A5-cmyk.pdf")

INSTAGRAM_URL = "https://www.instagram.com/uzm_dr_oguzbak"

# ─── Fonts ──────────────────────────────────────────────────────────
# ReportLab's built-in Helvetica is a Type 1 font using WinAnsi/CP1252
# encoding, which does NOT cover the Turkish letters ğ Ğ ı İ ş Ş — they
# fell through as blank boxes in the v1 print proof. Liberation Sans
# (open SIL/GPL-with-font-exception, metric-compatible with Arial /
# Helvetica) is bundled in `scripts/fonts/` so this build is portable
# and the PDF carries a properly embedded subset.
FONT_REGULAR = "LiberationSans"
FONT_BOLD = "LiberationSans-Bold"
pdfmetrics.registerFont(TTFont(FONT_REGULAR, os.path.join(FONT_DIR, "LiberationSans-Regular.ttf")))
pdfmetrics.registerFont(TTFont(FONT_BOLD, os.path.join(FONT_DIR, "LiberationSans-Bold.ttf")))

# Trim and bleed
TRIM_W, TRIM_H = A5  # (148*mm, 210*mm)
BLEED = 3 * mm
PAGE_W = TRIM_W + 2 * BLEED
PAGE_H = TRIM_H + 2 * BLEED

# Brand palette in CMYK. CMYKColor takes (cyan, magenta, yellow, black)
# in the 0..1 range. Values approximate the website hex tokens; a print
# house can swap these for spot values if needed.
PRIMARY = CMYKColor(0.55, 0.10, 0.45, 0.55)   # deep clinic green (~#2f5d4f)
PRIMARY_INK = CMYKColor(0.50, 0.05, 0.35, 0.70)  # darker for text on cream
ACCENT = CMYKColor(0.00, 0.55, 0.85, 0.05)     # warm orange CTA
CREAM = CMYKColor(0.02, 0.04, 0.10, 0.00)      # warm off-white background
INK = CMYKColor(0.30, 0.20, 0.10, 0.85)        # body text (rich black-ish)
INK_SOFT = CMYKColor(0.30, 0.20, 0.10, 0.60)
PAPER = CMYKColor(0.00, 0.00, 0.00, 0.00)

# ─── QR code generation ─────────────────────────────────────────────
def build_qr_png(url: str, size_px: int = 1200) -> Image.Image:
    """Generate a high error-correction QR code PNG.

    H-level lets ~30% of the code be obscured (small logo overlay still
    scans). We render at 1200 px so it stays crisp at 35-40 mm print size.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=20,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    if img.size[0] != size_px:
        img = img.resize((size_px, size_px), Image.LANCZOS)
    return img


# ─── Drawing helpers ────────────────────────────────────────────────
def fill_page(c: Canvas, color: CMYKColor) -> None:
    """Cover the full bleed area with a solid fill."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def crop_marks(c: Canvas) -> None:
    """Draw crop marks at the four trim corners. Length 5mm, offset 1mm."""
    c.setStrokeColor(INK)
    c.setLineWidth(0.25)
    L = 5 * mm
    G = 1 * mm
    # Trim corners (bleed-coordinate system)
    corners = [
        (BLEED, BLEED),                       # bottom-left
        (BLEED + TRIM_W, BLEED),              # bottom-right
        (BLEED, BLEED + TRIM_H),              # top-left
        (BLEED + TRIM_W, BLEED + TRIM_H),     # top-right
    ]
    for x, y in corners:
        # Horizontal mark
        if x == BLEED:
            c.line(x - L - G, y, x - G, y)
        else:
            c.line(x + G, y, x + G + L, y)
        # Vertical mark
        if y == BLEED:
            c.line(x, y - L - G, x, y - G)
        else:
            c.line(x, y + G, x, y + G + L)


def text_block(c: Canvas, x: float, y: float, lines: list[tuple[str, str, float, CMYKColor]],
               leading: float = 4 * mm) -> float:
    """Render successive lines (font, weight via face name, size, colour).

    Returns the y-coordinate after the last line so the caller can chain.
    """
    cur_y = y
    for face, _weight, size, color in lines:
        pass  # noop; signature reserved for future expansion
    cur_y = y
    for spec in lines:
        face, _weight, size, color = spec  # noqa: PLW2901 (style)
        c.setFont(face, size)
        c.setFillColor(color)
        c.drawString(x, cur_y, _weight)
        cur_y -= leading
    return cur_y


# ─── Page 1: Front cover ────────────────────────────────────────────
def draw_front(c: Canvas, qr_img: Image.Image) -> None:
    # Background: cream
    fill_page(c, CREAM)

    # Top hero band: deep green, bleed to edges, ~55% of page height
    hero_h = TRIM_H * 0.58
    c.setFillColor(PRIMARY)
    c.rect(0, BLEED + (TRIM_H - hero_h), PAGE_W, hero_h + BLEED, fill=1, stroke=0)

    # Logo, top-left of hero
    if os.path.exists(LOGO_PATH):
        logo_w = 28 * mm
        c.drawImage(
            LOGO_PATH,
            BLEED + 12 * mm,
            BLEED + TRIM_H - 38 * mm,
            width=logo_w,
            height=logo_w,
            preserveAspectRatio=True,
            mask="auto",
        )

    # Doctor name + title (white on green)
    c.setFillColor(PAPER)
    c.setFont(FONT_BOLD, 22)
    c.drawString(BLEED + 12 * mm, BLEED + TRIM_H - 60 * mm, "Uzm. Dr. Oğuz Bak")
    c.setFont(FONT_REGULAR, 11)
    c.drawString(BLEED + 12 * mm, BLEED + TRIM_H - 67 * mm, "Nöroloji • Ağrı Tedavisi • TMS")

    # Headline (large, white)
    c.setFont(FONT_BOLD, 26)
    line1 = "Ağrı ve kronik"
    line2 = "hastalıklar için"
    line3 = "bütüncül bakım."
    base_y = BLEED + TRIM_H - 95 * mm
    c.drawString(BLEED + 12 * mm, base_y, line1)
    c.drawString(BLEED + 12 * mm, base_y - 9 * mm, line2)
    c.drawString(BLEED + 12 * mm, base_y - 18 * mm, line3)

    # Subhead
    c.setFont(FONT_REGULAR, 10.5)
    sub_y = base_y - 28 * mm
    c.drawString(
        BLEED + 12 * mm, sub_y,
        "Migren, baş ağrısı, fibromiyalji ve uyku bozuklukları."
    )
    c.drawString(
        BLEED + 12 * mm, sub_y - 5 * mm,
        "TMS tedavisi, IV vitamin desteği ve evde sağlık hizmeti."
    )

    # Lower band: cream / white-ish (already by background) with QR card
    # QR card: white panel with QR + caption, anchored bottom-right of the trim
    card_w = 64 * mm
    card_h = 72 * mm
    card_x = BLEED + TRIM_W - card_w - 12 * mm
    card_y = BLEED + 14 * mm
    # Card background (white, with subtle shadow line)
    c.setFillColor(PAPER)
    c.setStrokeColor(INK_SOFT)
    c.setLineWidth(0.4)
    c.roundRect(card_x, card_y, card_w, card_h, 4 * mm, fill=1, stroke=1)

    # QR image inside card
    qr_size = 48 * mm
    qr_x = card_x + (card_w - qr_size) / 2
    qr_y = card_y + 16 * mm
    buf = BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)
    # ReportLab needs an ImageReader for an in-memory PNG
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(buf), qr_x, qr_y, qr_size, qr_size)

    # Caption under QR
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 9)
    c.drawCentredString(card_x + card_w / 2, card_y + 10 * mm, "Instagram'da takip et")
    c.setFont(FONT_REGULAR, 7.5)
    c.setFillColor(INK_SOFT)
    c.drawCentredString(card_x + card_w / 2, card_y + 6 * mm, "@uzm_dr_oguzbak")

    # Left column under hero: short bullets. INK (full strength) on cream
    # for legibility — INK_SOFT was muddy at this body size.
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 10.5)
    c.drawString(BLEED + 12 * mm, card_y + card_h - 4 * mm, "Hızlı randevu")
    c.setFont(FONT_REGULAR, 9)
    bullets_y = card_y + card_h - 12 * mm
    for line in [
        "Online randevu",
        "Online danışma",
        "Evde değerlendirme",
        "5 dilde hizmet",
    ]:
        c.drawString(BLEED + 12 * mm, bullets_y, "•  " + line)
        bullets_y -= 5 * mm

    # Footer ribbon (accent orange) with web URL — deep ink for legibility
    # (white-on-orange was low-contrast in print proof).
    fr_h = 10 * mm
    c.setFillColor(ACCENT)
    c.rect(0, 0, PAGE_W, fr_h + BLEED, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 10)
    c.drawCentredString(PAGE_W / 2, BLEED + 3 * mm, "uzmdroguzbak.com")

    crop_marks(c)


# ─── Page 2: Back cover ─────────────────────────────────────────────
def draw_back(c: Canvas) -> None:
    fill_page(c, CREAM)

    # Top band
    band_h = 22 * mm
    c.setFillColor(PRIMARY)
    c.rect(0, BLEED + TRIM_H - band_h, PAGE_W, band_h + BLEED, fill=1, stroke=0)
    c.setFillColor(PAPER)
    c.setFont(FONT_BOLD, 14)
    c.drawString(BLEED + 12 * mm, BLEED + TRIM_H - 14 * mm, "Hizmetlerimiz")
    c.setFont(FONT_REGULAR, 9)
    c.drawString(BLEED + 12 * mm, BLEED + TRIM_H - 19 * mm, "Bilimsel temellere dayalı, bütüncül yaklaşım.")

    # Services list — Turkish copy reviewed: medical "tedavi" preferred over
    # "terapi", "Transkraniyal" with the correct -y-, "FDA onaylı" without
    # hyphen, plural "bozukluklarının değerlendirilmesi", and "Online"
    # standardised across the brochure to match the site copy.
    services = [
        ("Nöroloji Muayenesi", "Migren, baş ağrısı, vertigo, uyku ve hareket bozukluklarının değerlendirilmesi."),
        ("TMS Tedavisi", "Transkraniyal manyetik stimülasyon — ilaç dışı, FDA onaylı tedavi seçeneği."),
        ("IV Vitamin Tedavisi", "B12, magnezyum ve antioksidan içerikli damar yolu protokolleri."),
        ("Evde Sağlık Hizmeti", "İstanbul'un seçkin bölgelerinde evde muayene ve takip."),
        ("Görüntülü Görüşme", "Tedavi sonrası takip için online danışma randevusu."),
    ]
    cur_y = BLEED + TRIM_H - band_h - 9 * mm
    for title, desc in services:
        c.setFillColor(PRIMARY_INK)
        c.setFont(FONT_BOLD, 10.5)
        c.drawString(BLEED + 12 * mm, cur_y, title)
        # Body uses full INK on cream; INK_SOFT looked muddy in proof.
        c.setFillColor(INK)
        c.setFont(FONT_REGULAR, 8.5)
        c.drawString(BLEED + 12 * mm, cur_y - 4.5 * mm, desc)
        # divider rule
        c.setStrokeColor(CMYKColor(0.05, 0.05, 0.10, 0.20))
        c.setLineWidth(0.3)
        c.line(BLEED + 12 * mm, cur_y - 8 * mm, BLEED + TRIM_W - 12 * mm, cur_y - 8 * mm)
        cur_y -= 14 * mm

    # Bottom panel: contact + hours
    panel_h = 56 * mm
    panel_y = BLEED + 14 * mm
    c.setFillColor(PAPER)
    c.setStrokeColor(INK_SOFT)
    c.setLineWidth(0.4)
    c.roundRect(BLEED + 12 * mm, panel_y, TRIM_W - 24 * mm, panel_h, 3 * mm, fill=1, stroke=1)

    # Two columns inside the panel
    col1_x = BLEED + 18 * mm
    col2_x = BLEED + TRIM_W / 2 + 4 * mm
    base = panel_y + panel_h - 8 * mm

    c.setFillColor(PRIMARY_INK)
    c.setFont(FONT_BOLD, 10)
    c.drawString(col1_x, base, "İletişim")
    c.setFont(FONT_REGULAR, 9)
    c.setFillColor(INK)
    c.drawString(col1_x, base - 6 * mm, "info@uzmdroguzbak.com")
    c.drawString(col1_x, base - 11 * mm, "+90 530 087 4391")
    c.drawString(col1_x, base - 16 * mm, "WhatsApp hattı aktiftir")

    c.setFillColor(PRIMARY_INK)
    c.setFont(FONT_BOLD, 10)
    c.drawString(col1_x, base - 26 * mm, "Adres")
    c.setFont(FONT_REGULAR, 9)
    c.setFillColor(INK)
    c.drawString(col1_x, base - 32 * mm, "Helis More Residence")
    c.drawString(col1_x, base - 37 * mm, "Kartal, İstanbul")

    c.setFillColor(PRIMARY_INK)
    c.setFont(FONT_BOLD, 10)
    c.drawString(col2_x, base, "Çalışma Saatleri")
    c.setFont(FONT_REGULAR, 9)
    c.setFillColor(INK)
    c.drawString(col2_x, base - 6 * mm, "Pazartesi – Cuma")
    c.drawString(col2_x, base - 11 * mm, "09:00 – 17:00")
    c.drawString(col2_x, base - 17 * mm, "Cumartesi – Pazar")
    c.drawString(col2_x, base - 22 * mm, "Kapalı")

    c.setFillColor(PRIMARY_INK)
    c.setFont(FONT_BOLD, 10)
    c.drawString(col2_x, base - 32 * mm, "Online randevu")
    c.setFont(FONT_REGULAR, 9)
    c.setFillColor(INK)
    c.drawString(col2_x, base - 38 * mm, "uzmdroguzbak.com/book")

    # Footer ribbon (mirror of page 1) — deep ink on accent orange.
    fr_h = 10 * mm
    c.setFillColor(ACCENT)
    c.rect(0, 0, PAGE_W, fr_h + BLEED, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 9)
    c.drawCentredString(PAGE_W / 2, BLEED + 3 * mm, "Bilimsel temellere dayalı, bütüncül bakım")

    crop_marks(c)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    qr_img = build_qr_png(INSTAGRAM_URL)

    c = canvas.Canvas(OUT_PDF, pagesize=(PAGE_W, PAGE_H))
    c.setTitle("Uzm. Dr. Oğuz Bak — A5 Brochure")
    c.setAuthor("Uzm. Dr. Oğuz Bak")
    c.setSubject("Clinic services brochure (A5, CMYK, 3mm bleed)")
    c.setKeywords("Dr. Bak, neurology, TMS, brochure, A5, CMYK, print")

    draw_front(c, qr_img)
    c.showPage()
    draw_back(c)
    c.showPage()

    c.save()
    size_kb = os.path.getsize(OUT_PDF) / 1024
    print(f"wrote {OUT_PDF} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()

"""
Dr. Bak — A5 print brochure (v4: editorial / magazine treatment).

Replaces the v1–v3 "flyer with a feature list" with something closer to
a Kinfolk / private-clinic brochure: cream paper, generous margins,
serif display headlines, small-caps tracked metadata, a single accent
green, the doctor's portrait, and the QR code as a quiet detail rather
than a billboard.

Layout overview:
  Page 1 (front cover)
    masthead (small wordmark, tracked caps)
    big serif headline — a calm invitation, not a value-prop
    italic byline — attribution to the doctor
    breathing room
    bottom rule + tiny QR card + Instagram handle

  Page 2 (inside)
    section label  "YAKLAŞIM"
    short serif manifesto paragraph
    portrait (circular crop) anchored top-right
    three numbered principles in serif/italic
    bottom: tracked all-caps contact strip

Print specs unchanged from v3:
  - A5 trim (148 × 210 mm)
  - 3 mm bleed
  - CMYK colours (every fill explicit)
  - Fonts: Liberation Sans + Liberation Serif (both bundled)
"""

from __future__ import annotations
import os
from io import BytesIO

import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw
from reportlab.lib.colors import CMYKColor
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.pdfgen.canvas import Canvas

# ─── Constants ──────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(ROOT, "apps/web/public/images/drbak-logo-square.png")
PORTRAIT_PATH = os.path.join(ROOT, "apps/web/public/images/dr-oguz-bak-profile.png")
FONT_DIR = os.path.join(ROOT, "scripts/fonts")
OUT_DIR = os.path.join(ROOT, "docs/marketing")
OUT_PDF = os.path.join(OUT_DIR, "dr-bak-brochure-A5-cmyk.pdf")

INSTAGRAM_URL = "https://www.instagram.com/uzm_dr_oguzbak"
INSTAGRAM_HANDLE = "@uzm_dr_oguzbak"

# ─── Fonts ──────────────────────────────────────────────────────────
SANS = "LiberationSans"
SANS_BOLD = "LiberationSans-Bold"
SANS_ITALIC = "LiberationSans-Italic"
SERIF = "LiberationSerif"
SERIF_BOLD = "LiberationSerif-Bold"
SERIF_ITALIC = "LiberationSerif-Italic"

for name, fname in [
    (SANS, "LiberationSans-Regular.ttf"),
    (SANS_BOLD, "LiberationSans-Bold.ttf"),
    (SANS_ITALIC, "LiberationSans-Italic.ttf"),
    (SERIF, "LiberationSerif-Regular.ttf"),
    (SERIF_BOLD, "LiberationSerif-Bold.ttf"),
    (SERIF_ITALIC, "LiberationSerif-Italic.ttf"),
]:
    pdfmetrics.registerFont(TTFont(name, os.path.join(FONT_DIR, fname)))

# ─── Trim and bleed ─────────────────────────────────────────────────
TRIM_W, TRIM_H = A5  # 148 × 210 mm
BLEED = 3 * mm
PAGE_W = TRIM_W + 2 * BLEED
PAGE_H = TRIM_H + 2 * BLEED

# Generous editorial margins (was 12 mm in v3 → too tight). 22 mm side
# margins give the cover real breathing room and let the headline read
# as a magazine cover line, not a poster slogan.
MARGIN_X = 22 * mm
MARGIN_Y_TOP = 22 * mm
MARGIN_Y_BOT = 18 * mm

def x_left() -> float:
    return BLEED + MARGIN_X


def x_right() -> float:
    return BLEED + TRIM_W - MARGIN_X


def y_top() -> float:
    return BLEED + TRIM_H - MARGIN_Y_TOP


def y_bot() -> float:
    return BLEED + MARGIN_Y_BOT


# ─── Brand palette (CMYK) ───────────────────────────────────────────
# Stripped back to one accent (the brand green) plus tonal warm cream
# and ink. The orange ribbon from v3 read as utilitarian; dropped.
PRIMARY = CMYKColor(0.55, 0.10, 0.45, 0.55)     # deep clinic green
PRIMARY_SOFT = CMYKColor(0.45, 0.05, 0.35, 0.30)  # lighter green for accents
CREAM = CMYKColor(0.02, 0.04, 0.10, 0.00)       # warm off-white background
INK = CMYKColor(0.30, 0.20, 0.10, 0.85)         # near-black warm ink
INK_SOFT = CMYKColor(0.30, 0.20, 0.10, 0.55)    # secondary ink
HAIRLINE = CMYKColor(0.20, 0.15, 0.10, 0.40)    # subtle dividers
PAPER = CMYKColor(0.00, 0.00, 0.00, 0.00)       # paper white


# ─── Drawing helpers ────────────────────────────────────────────────
def fill_page(c: Canvas, color: CMYKColor) -> None:
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def crop_marks(c: Canvas) -> None:
    c.setStrokeColor(INK)
    c.setLineWidth(0.25)
    L = 5 * mm
    G = 1 * mm
    corners = [
        (BLEED, BLEED),
        (BLEED + TRIM_W, BLEED),
        (BLEED, BLEED + TRIM_H),
        (BLEED + TRIM_W, BLEED + TRIM_H),
    ]
    for x, y in corners:
        if x == BLEED:
            c.line(x - L - G, y, x - G, y)
        else:
            c.line(x + G, y, x + G + L, y)
        if y == BLEED:
            c.line(x, y - L - G, x, y - G)
        else:
            c.line(x, y + G, x, y + G + L)


def tracked_caps(c: Canvas, x: float, y: float, text: str, size: float,
                 tracking: float = 0.18, color: CMYKColor = INK,
                 font: str = SANS_BOLD) -> None:
    """Render uppercase text with letter-tracking — small-caps treatment.

    `tracking` is fractional (0.18 ≈ +180/1000 em), tuned for body sizes.
    """
    c.setFont(font, size)
    c.setFillColor(color)
    upper = text.upper()
    # Compute baseline width from individual glyph widths so tracking lands
    # consistently no matter the string.
    cur_x = x
    extra = size * tracking
    for ch in upper:
        c.drawString(cur_x, y, ch)
        cur_x += pdfmetrics.stringWidth(ch, font, size) + extra


def hairline(c: Canvas, x1: float, y: float, x2: float,
             color: CMYKColor = HAIRLINE, width: float = 0.4) -> None:
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def draw_arc_glyph(c: Canvas, cx: float, cy: float, r: float,
                   color: CMYKColor = PRIMARY_SOFT) -> None:
    """A small open-arc motif used as a quiet brand mark on the cover.

    Geometry: a 220° arc, line cap rounded, ~1pt thick.
    """
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(1.2)
    c.setLineCap(1)
    p = c.beginPath()
    # ReportLab arc draws inside a bounding box; use Canvas.arc + stroke.
    c.arc(cx - r, cy - r, cx + r, cy + r, startAng=160, extent=240)
    c.restoreState()


# ─── QR + portrait helpers ──────────────────────────────────────────
def build_qr_png(url: str, size_px: int = 1000) -> Image.Image:
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


def circular_crop(path: str, size_px: int = 800) -> Image.Image:
    """Open the doctor portrait, square-crop centred, mask to circle.

    Used on page 2 (inside). The mask is anti-aliased so the outline
    reads cleanly when printed at ~36 mm.
    """
    im = Image.open(path).convert("RGBA")
    # Square-crop centred
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize(
        (size_px, size_px), Image.LANCZOS,
    )
    mask = Image.new("L", (size_px * 4, size_px * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size_px * 4, size_px * 4), fill=255)
    mask = mask.resize((size_px, size_px), Image.LANCZOS)
    out = Image.new("RGBA", (size_px, size_px), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def png_buffer(im: Image.Image) -> BytesIO:
    buf = BytesIO()
    im.save(buf, format="PNG")
    buf.seek(0)
    return buf


# ─── Page 1: COVER ──────────────────────────────────────────────────
def draw_front(c: Canvas, qr_img: Image.Image) -> None:
    fill_page(c, CREAM)

    # Masthead band (top): small wordmark + tracked caps section label.
    # Sits ABOVE the top margin so the headline area is uncluttered.
    masthead_y = y_top() + 6 * mm
    if os.path.exists(LOGO_PATH):
        lw = 14 * mm
        c.drawImage(
            LOGO_PATH, x_left(), masthead_y - lw / 2,
            width=lw, height=lw,
            preserveAspectRatio=True, mask="auto",
        )
    tracked_caps(
        c, x_left() + 18 * mm, masthead_y - 1.4 * mm,
        "Uzm. Dr. Oğuz Bak  ·  Klinik",
        size=7, tracking=0.20, color=INK_SOFT, font=SANS,
    )
    # Right edge: section label
    label = "BÜLTEN  ·  2026"
    label_w = sum(
        pdfmetrics.stringWidth(ch, SANS_BOLD, 7) + 7 * 0.20
        for ch in label.upper()
    )
    tracked_caps(
        c, x_right() - label_w, masthead_y - 1.4 * mm,
        label, size=7, tracking=0.20, color=INK_SOFT,
    )
    # Hairline below masthead
    hairline(c, x_left(), masthead_y - 8 * mm, x_right())

    # Quiet arc motif anchored upper-right
    draw_arc_glyph(c, x_right() - 8 * mm, y_top() - 30 * mm, r=14 * mm)

    # ── Editorial cover line ─────────────────────────────────────────
    # The cover headline is a calm invitation, not a sales line. Set in
    # serif at ~28pt with generous leading. The italic line below is
    # the doctor's voice — kept short.
    headline_lines = [
        "Ağrı çoğu zaman",
        "yalnız bir",
        "deneyimdir.",
    ]
    head_size = 30
    head_lead = 11.5 * mm
    head_top = y_top() - 56 * mm  # high enough to leave the bottom open
    c.setFillColor(INK)
    c.setFont(SERIF_BOLD, head_size)
    for i, line in enumerate(headline_lines):
        c.drawString(x_left(), head_top - i * head_lead, line)

    # Italic byline (the invitation)
    c.setFont(SERIF_ITALIC, 14)
    c.setFillColor(PRIMARY)
    bz_y = head_top - len(headline_lines) * head_lead - 4 * mm
    c.drawString(x_left(), bz_y, "Birlikte anlayalım.")
    # Attribution
    c.setFont(SANS, 9)
    c.setFillColor(INK_SOFT)
    c.drawString(x_left(), bz_y - 7 * mm, "— Uzm. Dr. Oğuz Bak,  Nöroloji ve Ağrı Tedavisi")

    # ── Bottom rail: hairline + small QR + handle ───────────────────
    rail_y = y_bot() + 6 * mm
    hairline(c, x_left(), rail_y + 30 * mm, x_right())

    # QR card (compact, anchored bottom-right)
    qr_size = 28 * mm
    qr_x = x_right() - qr_size
    qr_y = rail_y
    c.drawImage(ImageReader(png_buffer(qr_img)), qr_x, qr_y, qr_size, qr_size)
    # Caption above QR
    tracked_caps(
        c, qr_x, qr_y + qr_size + 3 * mm,
        "INSTAGRAM", size=7, tracking=0.20, color=INK_SOFT,
    )

    # Bottom-left: prompt copy aligned to QR baseline
    c.setFont(SERIF_ITALIC, 11)
    c.setFillColor(INK)
    c.drawString(x_left(), qr_y + qr_size - 6 * mm, "Daha yakından tanışmak için")
    c.setFont(SANS_BOLD, 12)
    c.setFillColor(PRIMARY)
    c.drawString(x_left(), qr_y + qr_size - 12 * mm, INSTAGRAM_HANDLE)
    c.setFont(SANS, 9)
    c.setFillColor(INK_SOFT)
    c.drawString(x_left(), qr_y + qr_size - 17 * mm, "Kareyi okutun veya kullanıcı adını arayın.")

    # Footer: tracked URL (no ribbon)
    tracked_caps(
        c, x_left(), BLEED + 8 * mm,
        "uzmdroguzbak.com  ·  Helis More Residence, Kartal — İstanbul",
        size=7, tracking=0.18, color=INK_SOFT, font=SANS,
    )

    crop_marks(c)


# ─── Page 2: INSIDE — YAKLAŞIM ──────────────────────────────────────
def draw_back(c: Canvas, portrait: Image.Image) -> None:
    fill_page(c, CREAM)

    # Top: masthead reused (continuity)
    masthead_y = y_top() + 6 * mm
    tracked_caps(
        c, x_left(), masthead_y - 1.4 * mm,
        "BÖLÜM  I",
        size=7, tracking=0.30, color=PRIMARY,
    )
    # Right side of masthead
    title_label = "YAKLAŞIM"
    label_w = sum(
        pdfmetrics.stringWidth(ch, SANS_BOLD, 7) + 7 * 0.30
        for ch in title_label.upper()
    )
    tracked_caps(
        c, x_right() - label_w, masthead_y - 1.4 * mm,
        title_label, size=7, tracking=0.30, color=PRIMARY,
    )
    hairline(c, x_left(), masthead_y - 8 * mm, x_right())

    # ── Portrait, circular, anchored top-right ──────────────────────
    portrait_size = 38 * mm
    px = x_right() - portrait_size
    py = y_top() - 50 * mm
    c.drawImage(
        ImageReader(png_buffer(portrait)), px, py,
        portrait_size, portrait_size, mask="auto",
    )
    # Portrait caption (small italic)
    c.setFont(SERIF_ITALIC, 8.5)
    c.setFillColor(INK_SOFT)
    c.drawCentredString(px + portrait_size / 2, py - 4 * mm,
                        "Uzm. Dr. Oğuz Bak")

    # ── Manifesto paragraph (left column, asymmetric) ───────────────
    manifesto = [
        "Her hasta bir hikâyedir. Migren, kronik",
        "ağrı, fibromiyalji — semptomlar tanıdık",
        "olabilir, ama sebeplerini ve sizin yaşam",
        "ritminizi anlamak zaman ister.",
    ]
    manifesto2 = [
        "Önce sizi dinler, sonra birlikte bir",
        "tedavi planı kurarız. Acelemiz yok.",
    ]
    body_y = y_top() - 28 * mm
    body_left = x_left()
    body_w = portrait_size + 6 * mm  # allow text to break around portrait
    # First three lines stop short of portrait edge
    c.setFont(SERIF, 12)
    c.setFillColor(INK)
    line_h = 6.2 * mm
    cur_y = body_y
    for line in manifesto:
        c.drawString(body_left, cur_y, line)
        cur_y -= line_h
    cur_y -= 2 * mm
    # Italic short coda (full-width)
    c.setFont(SERIF_ITALIC, 12)
    c.setFillColor(PRIMARY)
    for line in manifesto2:
        c.drawString(body_left, cur_y, line)
        cur_y -= line_h

    # ── Hairline divider before the principles ──────────────────────
    sep_y = cur_y - 6 * mm
    hairline(c, x_left(), sep_y, x_right())

    # ── Three principles, numbered (editorial list) ─────────────────
    principles = [
        ("01",
         "Yavaş muayene",
         "40 dakikalık konsültasyon. Acelemiz yok; doğru\nteşhis için zaman ayırırız."),
        ("02",
         "Bilim ve deneyim",
         "FDA onaylı TMS tedavisinden evde verilen IV vitamin\nprotokollerine — kanıta dayalı, kişiye uyarlanmış."),
        ("03",
         "Tek başınıza değilsiniz",
         "Tedavi başladığında WhatsApp ve görüntülü görüşme\nile yanınızdayız."),
    ]
    p_top = sep_y - 8 * mm
    p_h = 24 * mm
    for i, (num, title, desc) in enumerate(principles):
        cy = p_top - i * p_h
        # Big serif numeral
        c.setFont(SERIF_BOLD, 26)
        c.setFillColor(PRIMARY_SOFT)
        c.drawString(x_left(), cy - 2 * mm, num)
        # Title (serif, ink)
        c.setFont(SERIF_BOLD, 12)
        c.setFillColor(INK)
        c.drawString(x_left() + 18 * mm, cy + 2 * mm, title)
        # Description (sans, soft, two lines)
        c.setFont(SANS, 9)
        c.setFillColor(INK_SOFT)
        for j, dline in enumerate(desc.split("\n")):
            c.drawString(x_left() + 18 * mm, cy - 4 * mm - j * 4.5 * mm, dline)

    # ── Footer: tracked-caps contact strip ─────────────────────────
    foot_y = y_bot() + 4 * mm
    hairline(c, x_left(), foot_y + 12 * mm, x_right())
    contact_lines = [
        ("RANDEVU", "uzmdroguzbak.com  ·  +90 530 087 4391"),
        ("KLİNİK", "Helis More Residence, Kartal — İstanbul"),
    ]
    cur = foot_y + 6 * mm
    for label, value in contact_lines:
        tracked_caps(c, x_left(), cur, label, size=6.5,
                     tracking=0.30, color=PRIMARY)
        c.setFont(SERIF, 9)
        c.setFillColor(INK)
        c.drawString(x_left() + 22 * mm, cur, value)
        cur -= 5 * mm

    crop_marks(c)


# ─── main ──────────────────────────────────────────────────────────
def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    qr_img = build_qr_png(INSTAGRAM_URL)
    portrait = (
        circular_crop(PORTRAIT_PATH)
        if os.path.exists(PORTRAIT_PATH)
        else Image.new("RGBA", (800, 800), (200, 200, 200, 255))
    )

    c = canvas.Canvas(OUT_PDF, pagesize=(PAGE_W, PAGE_H))
    c.setTitle("Uzm. Dr. Oğuz Bak — Klinik Bülteni")
    c.setAuthor("Uzm. Dr. Oğuz Bak")
    c.setSubject("Editorial A5 brochure (CMYK, 3mm bleed)")
    c.setKeywords("Dr. Bak, neurology, TMS, brochure, editorial, A5, CMYK")

    draw_front(c, qr_img)
    c.showPage()
    draw_back(c, portrait)
    c.showPage()

    c.save()
    size_kb = os.path.getsize(OUT_PDF) / 1024
    print(f"wrote {OUT_PDF} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()

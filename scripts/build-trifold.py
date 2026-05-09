"""
Dr. Bak — A4 landscape TRI-FOLD clinic brochure (CMYK, 3mm bleed).

A different format from the A5 editorial booklet: a classic 6-panel
clinic leaflet, the kind you'd find on a reception desk. A4 sheet
folded twice ("letter fold"), three panels per side.

Content is sourced strictly from `uzmdroguzbak-com/index.html`:
  - the practice's own three service pillars (Nöropatik / Migren / Ozon)
  - the doctor's positioning ("Kişiye Özel Tedavi Planlaması")
  - real working hours, real phone number
  - International Health Tourism credential
  - team names (Dr. Oğuz Bak, Nuray Yazıcı, Yağmur Beyaztaş)

Imposition (left-to-right when laid flat):
  Page 1 — outer face
    Panel A (left)   Back cover (visible folded; contact + hours + social)
    Panel B (middle) Inside flap (the "Tanışalım" doctor bio panel)
    Panel C (right)  FRONT COVER (visible when folded shut)

  Page 2 — inner face (the spread you see when the brochure is fully open)
    Panel D (left)   Service 01 — Nöropatik Ağrı & Sinir Sorunları
    Panel E (middle) Service 02 — Migren Tanı ve Tedavisi
    Panel F (right)  Service 03 — Ozon & Destekleyici Tedaviler

This matches a standard "letter-fold" / Z-fold imposition; the print
shop folds accordingly.
"""

from __future__ import annotations
import os
from io import BytesIO

import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw
from reportlab.lib.colors import CMYKColor
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.pdfgen.canvas import Canvas

# ─── Paths ───────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(ROOT, "apps/web/public/images/drbak-logo-square.png")
PORTRAIT_PATH = os.path.join(ROOT, "apps/web/public/images/dr-oguz-bak-profile.png")
FONT_DIR = os.path.join(ROOT, "scripts/fonts")
OUT_DIR = os.path.join(ROOT, "docs/marketing")
OUT_PDF = os.path.join(OUT_DIR, "dr-bak-trifold-A4-cmyk.pdf")

INSTAGRAM_URL = "https://www.instagram.com/uzm_dr_oguzbak"
INSTAGRAM_HANDLE = "@uzm_dr_oguzbak"

# ─── Fonts ───────────────────────────────────────────────────────────
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

# ─── Geometry: A4 landscape, 3 panels ────────────────────────────────
# A4 = 297 × 210 mm. Three equal panels: 99 mm wide each.
TRIM_W = 297 * mm
TRIM_H = 210 * mm
PANEL_W = TRIM_W / 3  # 99 mm
BLEED = 3 * mm
PAGE_W = TRIM_W + 2 * BLEED
PAGE_H = TRIM_H + 2 * BLEED

# Per-panel content margins. The folded panel is 99 mm wide; we keep
# 11 mm side margins so the body sits in a comfortable 77 mm column.
PMX = 11 * mm   # panel margin x
PMY_TOP = 16 * mm
PMY_BOT = 14 * mm

# ─── Brand palette (CMYK) — same as v4 A5 ───────────────────────────
PRIMARY = CMYKColor(0.55, 0.10, 0.45, 0.55)
PRIMARY_SOFT = CMYKColor(0.45, 0.05, 0.35, 0.30)
CREAM = CMYKColor(0.02, 0.04, 0.10, 0.00)
INK = CMYKColor(0.30, 0.20, 0.10, 0.85)
INK_SOFT = CMYKColor(0.30, 0.20, 0.10, 0.55)
HAIRLINE = CMYKColor(0.20, 0.15, 0.10, 0.40)
PAPER = CMYKColor(0.00, 0.00, 0.00, 0.00)


# ─── Helpers ─────────────────────────────────────────────────────────
def panel_x(index: int) -> float:
    """X-coordinate of the LEFT edge of panel `index` (0..2) in bleed coords."""
    return BLEED + index * PANEL_W


def panel_left_inner(index: int) -> float:
    return panel_x(index) + PMX


def panel_right_inner(index: int) -> float:
    return panel_x(index) + PANEL_W - PMX


def panel_top(_index: int) -> float:
    return BLEED + TRIM_H - PMY_TOP


def panel_bot(_index: int) -> float:
    return BLEED + PMY_BOT


def fill_page(c: Canvas, color: CMYKColor) -> None:
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def fold_marks(c: Canvas) -> None:
    """Tiny tick marks at the top and bottom of every fold line. Put
    OUTSIDE the trim so the press cuts them off. Helpful so the operator
    folds in the right place even when crop marks on the trim corners
    aren't enough to identify the inner folds.
    """
    c.setStrokeColor(INK_SOFT)
    c.setLineWidth(0.25)
    for fold in (1, 2):
        x = BLEED + fold * PANEL_W
        # Above trim
        c.line(x, BLEED + TRIM_H + 1 * mm, x, BLEED + TRIM_H + 4 * mm)
        # Below trim
        c.line(x, BLEED - 1 * mm, x, BLEED - 4 * mm)


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
    c.setFont(font, size)
    c.setFillColor(color)
    upper = text.upper()
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


def wrap_text(c: Canvas, text: str, font: str, size: float, max_w: float) -> list[str]:
    """Greedy word-wrap by pixel width. ReportLab has no built-in wrap
    that respects font metrics, so we measure each word."""
    out: list[str] = []
    cur = ""
    for word in text.split():
        candidate = (cur + " " + word).strip()
        if pdfmetrics.stringWidth(candidate, font, size) <= max_w:
            cur = candidate
        else:
            if cur:
                out.append(cur)
            cur = word
    if cur:
        out.append(cur)
    return out


def draw_paragraph(c: Canvas, x: float, y: float, max_w: float, text: str,
                   font: str = SERIF, size: float = 9.5,
                   leading: float = 4.6 * mm, color: CMYKColor = INK) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    cur_y = y
    for line in wrap_text(c, text, font, size, max_w):
        c.drawString(x, cur_y, line)
        cur_y -= leading
    return cur_y


# ─── QR / portrait ───────────────────────────────────────────────────
def build_qr_png(url: str, size_px: int = 1000) -> Image.Image:
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_H,
                       box_size=20, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    if img.size[0] != size_px:
        img = img.resize((size_px, size_px), Image.LANCZOS)
    return img


def circular_crop(path: str, size_px: int = 800) -> Image.Image:
    im = Image.open(path).convert("RGBA")
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


# ─── Outside face: A4 landscape, 3 panels ───────────────────────────
def draw_outside(c: Canvas, qr_img: Image.Image, portrait: Image.Image) -> None:
    fill_page(c, CREAM)

    # ── PANEL A (left) — Back cover when folded ─────────────────────
    px = panel_left_inner(0)
    pr = panel_right_inner(0)
    py_top = panel_top(0)
    py_bot = panel_bot(0)

    # Section label
    tracked_caps(c, px, py_top, "İLETİŞİM", size=8, tracking=0.30, color=PRIMARY)
    hairline(c, px, py_top - 4 * mm, pr)

    cy = py_top - 14 * mm
    # Phone (large, serif)
    c.setFillColor(INK)
    c.setFont(SERIF_BOLD, 16)
    c.drawString(px, cy, "+90 530 087 43 91")
    c.setFont(SANS, 9)
    c.setFillColor(INK_SOFT)
    c.drawString(px, cy - 5 * mm, "WhatsApp ile de yazabilirsiniz.")

    # Web
    cy -= 16 * mm
    tracked_caps(c, px, cy, "WEB", size=7.5, tracking=0.30, color=PRIMARY)
    c.setFillColor(INK)
    c.setFont(SERIF_BOLD, 12)
    c.drawString(px, cy - 6 * mm, "uzmdroguzbak.com")

    # Instagram
    cy -= 16 * mm
    tracked_caps(c, px, cy, "INSTAGRAM", size=7.5, tracking=0.30, color=PRIMARY)
    c.setFillColor(INK)
    c.setFont(SERIF_BOLD, 12)
    c.drawString(px, cy - 6 * mm, INSTAGRAM_HANDLE)

    # Hours
    cy -= 16 * mm
    tracked_caps(c, px, cy, "ÇALIŞMA SAATLERİMİZ",
                 size=7.5, tracking=0.30, color=PRIMARY)
    c.setFont(SANS, 9.5)
    c.setFillColor(INK)
    c.drawString(px, cy - 6 * mm, "Pzt – Cum    09:00 – 17:00")
    c.drawString(px, cy - 11 * mm, "Cmt – Paz    Kapalı")

    # Footer credentials
    foot_y = py_bot + 4 * mm
    hairline(c, px, foot_y + 8 * mm, pr)
    c.setFont(SERIF_ITALIC, 8.5)
    c.setFillColor(PRIMARY)
    c.drawString(px, foot_y + 3 * mm, "Resmî Sağlık Turizmi Kuruluşu")
    c.setFont(SANS, 7)
    c.setFillColor(INK_SOFT)
    c.drawString(px, foot_y - 2 * mm,
                 "Uluslararası Sağlık Turizmi Yetki Belgesi.")

    # ── PANEL B (middle) — Inside flap: doctor bio ──────────────────
    px = panel_left_inner(1)
    pr = panel_right_inner(1)
    pw = pr - px

    tracked_caps(c, px, py_top, "TANIŞALIM", size=8, tracking=0.30, color=PRIMARY)
    hairline(c, px, py_top - 4 * mm, pr)

    # Portrait, circular, anchored top
    portrait_size = 42 * mm
    pp_x = px + (pw - portrait_size) / 2
    pp_y = py_top - 8 * mm - portrait_size
    c.drawImage(ImageReader(png_buffer(portrait)), pp_x, pp_y,
                portrait_size, portrait_size, mask="auto")

    # Name + title
    name_y = pp_y - 8 * mm
    c.setFillColor(INK)
    c.setFont(SERIF_BOLD, 13)
    c.drawCentredString(px + pw / 2, name_y, "Uzm. Dr. Oğuz Bak")
    c.setFont(SERIF_ITALIC, 10)
    c.setFillColor(PRIMARY)
    c.drawCentredString(px + pw / 2, name_y - 5 * mm,
                        "Nöroloji • Ozon Terapi • Mezoterapi")

    # Bio paragraph (from site)
    bio_y = name_y - 14 * mm
    bio = (
        "Sinir sistemi hastalıklarının tanı ve tedavisinde "
        "bilimsel, güncel ve kişiye özel yaklaşımlar sunuyoruz. "
        "Her hastayı bütüncül olarak değerlendiriyor, "
        "yaşam kalitesini artırmayı hedefliyoruz."
    )
    draw_paragraph(c, px, bio_y, pw, bio, font=SERIF, size=9.5,
                   leading=4.6 * mm, color=INK)

    # Team list (small, tracked caps + serif names)
    team_y = py_bot + 26 * mm
    tracked_caps(c, px, team_y, "EKİBİMİZ", size=7.5, tracking=0.30, color=PRIMARY)
    c.setFont(SERIF, 9)
    c.setFillColor(INK)
    c.drawString(px, team_y - 6 * mm, "Uzm. Dr. Oğuz Bak — Uzman Doktor")
    c.drawString(px, team_y - 11 * mm, "Nuray Yazıcı — Baş Hemşire")
    c.drawString(px, team_y - 16 * mm, "Yağmur Beyaztaş — Hemşire")

    # ── PANEL C (right) — FRONT COVER ───────────────────────────────
    px = panel_left_inner(2)
    pr = panel_right_inner(2)
    pw = pr - px

    # Top: small wordmark
    if os.path.exists(LOGO_PATH):
        lw = 18 * mm
        c.drawImage(LOGO_PATH, px, py_top - lw,
                    width=lw, height=lw,
                    preserveAspectRatio=True, mask="auto")

    # Headline (broken into 3 calm lines)
    head_top = py_top - 36 * mm
    head_lead = 9.5 * mm
    c.setFillColor(INK)
    c.setFont(SERIF_BOLD, 24)
    for i, line in enumerate(["Kişiye özel", "tedavi", "planlaması."]):
        c.drawString(px, head_top - i * head_lead, line)

    # Italic byline (the practice tagline)
    c.setFont(SERIF_ITALIC, 12)
    c.setFillColor(PRIMARY)
    bz_y = head_top - 3 * head_lead - 5 * mm
    c.drawString(px, bz_y, "Sinir sisteminde,")
    c.drawString(px, bz_y - 5 * mm, "bütüncül bakım.")

    # Hairline + QR + Instagram
    rail_y = py_bot + 6 * mm
    hairline(c, px, rail_y + 30 * mm, pr)

    qr_size = 28 * mm
    qr_x = pr - qr_size
    qr_y = rail_y
    c.drawImage(ImageReader(png_buffer(qr_img)), qr_x, qr_y, qr_size, qr_size)

    tracked_caps(c, qr_x, qr_y + qr_size + 2 * mm,
                 "INSTAGRAM", size=7, tracking=0.20, color=INK_SOFT)
    c.setFont(SERIF_ITALIC, 10)
    c.setFillColor(INK)
    c.drawString(px, qr_y + qr_size - 6 * mm, "Daha yakından")
    c.drawString(px, qr_y + qr_size - 11 * mm, "tanışmak için")
    c.setFont(SANS_BOLD, 11)
    c.setFillColor(PRIMARY)
    c.drawString(px, qr_y + qr_size - 18 * mm, INSTAGRAM_HANDLE)

    # Footer: tagline
    tracked_caps(c, px, BLEED + 7 * mm,
                 "uzmdroguzbak.com",
                 size=7, tracking=0.20, color=INK_SOFT, font=SANS)

    crop_marks(c)
    fold_marks(c)


# ─── Inside face: 3 service panels ──────────────────────────────────
def draw_inside(c: Canvas) -> None:
    fill_page(c, CREAM)

    # Top band across all 3 panels (continuous): "SAĞLADIĞIMIZ HİZMETLER"
    band_h = 16 * mm
    c.setFillColor(PRIMARY)
    c.rect(0, BLEED + TRIM_H - band_h, PAGE_W, band_h + BLEED, fill=1, stroke=0)
    c.setFillColor(PAPER)
    c.setFont(SERIF_BOLD, 14)
    c.drawString(panel_left_inner(0), BLEED + TRIM_H - 10 * mm,
                 "Sağladığımız Hizmetler")
    c.setFont(SERIF_ITALIC, 10)
    c.drawString(panel_left_inner(0), BLEED + TRIM_H - 14 * mm,
                 "Bilimsel veriler ışığında, kişiye özel planlanır.")

    # Panel definitions (numbered, real services from the site)
    services = [
        {
            "num": "01",
            "title": "Nöropatik Ağrı &",
            "title2": "Sinir Sorunları",
            "lead": (
                "Diyabetik nöropati, sinir sıkışmaları, postherpetik "
                "nevralji gibi durumlarda ağrının kaynağına iniyor "
                "ve modern yaklaşımlarla rahatlama sağlamayı "
                "hedefliyoruz."
            ),
            "bullets": [
                "Bireysel analiz",
                "Sürekli izlem",
                "Modern tedavi protokolleri",
            ],
        },
        {
            "num": "02",
            "title": "Migren Tanı ve",
            "title2": "Tedavisi",
            "lead": (
                "Kronik migren, gerilim tipi baş ağrıları ve diğer "
                "baş ağrısı tipleri için tanı, önleyici tedavi ve "
                "atak yönetimi çözümleri sunuyoruz."
            ),
            "bullets": [
                "Kronik migren takibi",
                "Önleyici tedavi planlaması",
                "Atak dönemi yönetimi",
            ],
        },
        {
            "num": "03",
            "title": "Ozon &",
            "title2": "Destekleyici Tedaviler",
            "lead": (
                "Ozon terapisi, glutatyon desteği gibi modern "
                "tamamlayıcı yöntemlerle vücudun iyileşme "
                "kapasitesini artırıyoruz."
            ),
            "bullets": [
                "Ozon terapisi",
                "Glutatyon desteği",
                "Bütüncül destekleyici protokoller",
            ],
        },
    ]

    for i, s in enumerate(services):
        px = panel_left_inner(i)
        pr = panel_right_inner(i)
        pw = pr - px
        py_top = BLEED + TRIM_H - band_h - 8 * mm
        py_bot = panel_bot(i)

        # Big number (serif, soft green)
        c.setFillColor(PRIMARY_SOFT)
        c.setFont(SERIF_BOLD, 56)
        c.drawString(px, py_top - 18 * mm, s["num"])

        # Title (two lines, serif, ink)
        c.setFillColor(INK)
        c.setFont(SERIF_BOLD, 16)
        c.drawString(px, py_top - 28 * mm, s["title"])
        c.drawString(px, py_top - 35 * mm, s["title2"])

        # Hairline divider
        hairline(c, px, py_top - 41 * mm, pr)

        # Lead paragraph
        draw_paragraph(c, px, py_top - 47 * mm, pw, s["lead"],
                       font=SERIF, size=9.5, leading=4.6 * mm, color=INK)

        # Bullet list (lower part of panel)
        bullet_y = py_bot + 28 * mm
        tracked_caps(c, px, bullet_y, "ÖNE ÇIKAN",
                     size=7, tracking=0.30, color=PRIMARY)
        c.setFont(SANS, 9)
        c.setFillColor(INK)
        for j, b in enumerate(s["bullets"]):
            c.drawString(px, bullet_y - (j + 1) * 5 * mm, "•  " + b)

        # Vertical hairline as a panel divider (avoids hard fold lines).
        # Skip after the rightmost panel.
        if i < 2:
            c.setStrokeColor(HAIRLINE)
            c.setLineWidth(0.3)
            x_div = panel_x(i + 1)
            c.line(x_div, BLEED + 12 * mm,
                   x_div, BLEED + TRIM_H - band_h - 4 * mm)

    # Bottom unified call-to-action across all panels
    cta_y = BLEED + 14 * mm
    hairline(c, panel_left_inner(0), cta_y + 10 * mm,
             panel_right_inner(2))
    c.setFont(SERIF_ITALIC, 12)
    c.setFillColor(INK)
    c.drawCentredString(BLEED + TRIM_W / 2, cta_y + 4 * mm,
                        "Hızlı randevu için: uzmdroguzbak.com  ·  +90 530 087 43 91")

    crop_marks(c)
    fold_marks(c)


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
    c.setTitle("Uzm. Dr. Oğuz Bak — Klinik Tanıtım Broşürü")
    c.setAuthor("Uzm. Dr. Oğuz Bak")
    c.setSubject("Tri-fold A4 brochure (CMYK, 3mm bleed, fold marks)")
    c.setKeywords("Dr. Bak, neurology, nöropati, migren, ozon, brochure, A4, tri-fold, CMYK")

    draw_outside(c, qr_img, portrait)
    c.showPage()
    draw_inside(c)
    c.showPage()
    c.save()

    size_kb = os.path.getsize(OUT_PDF) / 1024
    print(f"wrote {OUT_PDF} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()

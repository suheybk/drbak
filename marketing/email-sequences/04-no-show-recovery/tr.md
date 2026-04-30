# 04 — No-show recovery (TR canonical)

**Trigger:** Cron sweep 6h after `appointments.starts_at` if status is
`no_show` (admin-marked) or remains `created` past appointment end.
**Channels:** Email only — SMS at this stage feels intrusive.
**Lawful basis:** Contract performance (relationship continuity)
**Status:** Final
**Tone:** Warm, non-judgmental. Goal: open the door for re-booking, not extract a reason.

---

## CHANNEL: EMAIL

**FROM:** Uzm. Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Bugünkü randevunuzu kaçırdığınızı fark ettik

**BODY:**

```
Sayın {{patient_first_name}},

Bugünkü randevunuzu görüşemediğimizi fark ettik.

Plan değişiklikleri olağandır. İsterseniz aşağıdaki adımlardan birini
seçebilirsiniz:

— Yeni bir randevu oluşturmak: https://uzmdroguzbak.com/book
— Hangi sebep olursa olsun bize yazmak: {{clinic_email}}
— WhatsApp / telefon: {{clinic_phone}}

Eğer randevuya gelemediyseniz ve nedeni paylaşmak isterseniz size yardımcı
olabiliriz; herhangi bir bilgi vermek zorunda değilsiniz. Bizim için en
önemli olan tedavi sürecinizin kesintiye uğramaması.

Sağlıklı günler,

Uzm. Dr. Oğuz Bak
{{clinic_phone}} · {{clinic_email}}

---
Bu hatırlatma, mevcut randevunuza ilişkindir.
```

> **Compliance note:** Do not embed pricing, do not imply a missed-fee. TR
> regulation prohibits implicit fee-listing. The CTA is purely re-booking.

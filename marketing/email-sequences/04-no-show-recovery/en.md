# 04 — No-show recovery (EN canonical)

**Trigger:** Cron sweep 6h after `appointments.starts_at` if no-show.
**Channels:** Email only.
**Tone:** Warm, non-judgmental.

---

## CHANNEL: EMAIL

**FROM:** Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** We missed seeing you today

**BODY:**

```
Dear {{patient_first_name}},

We noticed we didn't see you for today's appointment.

Plans change — that's life. Whenever you're ready, you can:

— Book a new appointment: https://uzmdroguzbak.com/en/book
— Reply to this email: {{clinic_email}}
— WhatsApp / phone: {{clinic_phone}}

If something came up and you'd like to share, we're here. You don't have to
explain. What matters most is that your care isn't interrupted.

Best regards,

Dr. Oğuz Bak
{{clinic_phone}} · {{clinic_email}}

---
This message relates to your existing appointment.
```

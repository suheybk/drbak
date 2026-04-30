# 03 — T-1h reminder, telehealth (EN canonical)

**Trigger:** Cron sweep at T-1h before `appointments.starts_at` if telehealth.
**Channels:** Email + WhatsApp

---

## CHANNEL: EMAIL

**FROM:** Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Your telehealth appointment starts in 1 hour

**BODY:**

```
Dear {{patient_first_name}},

Your telehealth appointment starts in one hour:
— {{appointment_time}} (Istanbul time)
— {{service_title}}

Join link: {{join_url}}

You can open the link in any modern browser (Chrome, Safari, Firefox); no
app install needed. The browser will ask for microphone and camera access.

Before the call:
— Find a quiet space; headphones help
— Have your medication list and any prior test results to hand
— Check your email after the call for any prescription or summary

If the link doesn't open: {{clinic_phone}}

Best regards,

Dr. Oğuz Bak
```

---

## CHANNEL: WHATSAPP (template `reminder_t1h_telehealth_en`)

```
{{patient_first_name}}, your telehealth call starts in 1 hour.

Join: {{join_url}}
Time: {{appointment_time}} (Istanbul)

Issues? {{clinic_phone}}
```

> Meta template: `LANGUAGE: en`, `CATEGORY: UTILITY`.

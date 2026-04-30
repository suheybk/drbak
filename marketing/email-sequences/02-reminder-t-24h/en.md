# 02 — T-24h reminder (EN canonical)

**Trigger:** Cron sweep at T-24h before `appointments.starts_at`
**Channels:** Email + SMS

---

## CHANNEL: EMAIL

**FROM:** Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Reminder: your appointment is tomorrow — {{appointment_date}} {{appointment_time}}

**BODY:**

```
Dear {{patient_first_name}},

A quick reminder for tomorrow's appointment:

— {{service_title}}
— {{appointment_date}} · {{appointment_time}} (Istanbul time)
— {{delivery_mode}}
{{#if delivery_mode == 'in_person'}}
— Clinic address: {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— Join link: {{join_url}}
{{/if}}

Before you arrive:
— Bring any prior test results
— Bring your current medication list (with dosages)
— TMS appointments: complete the pre-screening form on your account if you haven't yet

If you need to change plans:
— Reschedule: {{reschedule_url}}
— Cancel: {{cancel_url}}
Changes are accepted up to 24 hours before the appointment.

Best regards,

Dr. Oğuz Bak
{{clinic_phone}} · {{clinic_email}}
```

---

## CHANNEL: SMS

`SMS:GSM-7-1-PART`

```
Reminder: your appointment is tomorrow {{appointment_date}} {{appointment_time}}. Reschedule: {{reschedule_url}} (up to 24h before)
```

# 01 — Booking confirmation (EN canonical)

**Trigger:** `appointment.created` event
**Channels:** Email + SMS + WhatsApp
**Lawful basis:** Contract performance (KVKK 5/2-c; GDPR 6(1)(b))
**Status:** Final — review by OB before T-4 weeks

---

## CHANNEL: EMAIL

**FROM:** Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Your appointment is booked — {{appointment_date}} {{appointment_time}}

**BODY:**

```
Dear {{patient_first_name}},

Your appointment has been booked. Please review the details below before your visit.

— Service: {{service_title}}
— Date: {{appointment_date}}
— Time: {{appointment_time}} (Istanbul time)
— Visit type: {{delivery_mode}}
{{#if delivery_mode == 'home_visit'}}
— Address: We'll come to the address you provided when booking.
{{/if}}
{{#if delivery_mode == 'in_person'}}
— Clinic address: {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— Join link: {{join_url}}
  (Use this only at the time of your appointment; it opens without sign-up.)
{{/if}}

The first consultation runs 30 to 40 minutes. If available, please bring:
— Any prior test results (MRI, EEG, blood work)
— A list of your current medications, including dosages
— Reports or prescriptions from previous visits

To reschedule: {{reschedule_url}}
To cancel: {{cancel_url}}
Changes are accepted up to 24 hours before the appointment.

Questions: {{clinic_email}} · WhatsApp / phone: {{clinic_phone}}

Best regards,

Dr. Oğuz Bak
PAIN AND CHRONIC ILLNESSES CLINIC
Helis More Residence, Kartal / İstanbul

---
You're receiving this because you booked an appointment.
KVKK / privacy notice: {{kvkk_url}}
```

---

## CHANNEL: SMS (Twilio for non-TR mobile numbers)

`SMS:GSM-7-1-PART` (≤160 chars)

```
Dear {{patient_first_name}}, your appointment is booked for {{appointment_date}} {{appointment_time}}. Reschedule: {{reschedule_url}}
```

---

## CHANNEL: WHATSAPP (Meta-approved template `booking_confirm_en`)

```
Dear {{patient_first_name}},

Your appointment is booked:
— {{service_title}}
— {{appointment_date}} {{appointment_time}}
— {{delivery_mode}}

{{#if delivery_mode == 'telehealth'}}
Join link: {{join_url}}
{{/if}}

Reschedule or cancel: {{reschedule_url}}
Changes accepted up to 24 hours before the visit.

Dr. Oğuz Bak
```

> **Meta template:** `LANGUAGE: en`, `CATEGORY: UTILITY`.

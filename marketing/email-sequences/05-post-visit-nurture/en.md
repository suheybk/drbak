# 05 — Post-visit nurture (EN canonical)

**Trigger:** 48h after `appointment.completed` AND marketing consent granted.
**Steps:** 3 (T+48h, T+10d, T+30d).
**Tone:** Educational; no sales push.

---

## STEP 1 — T+48h: "How are you feeling?"

**SUBJECT:** A quick check-in 48 hours after your visit

**BODY:**

```
Dear {{patient_first_name}},

It's been 48 hours since your appointment.

The first few days are often an observation period. Please reach out if:

— You notice a new or unexpected symptom
— You experience a side-effect from any prescribed medication
— You have any concern about a recommended test

We're here: {{clinic_email}} · {{clinic_phone}}

Care is rarely a single visit; continuity matters. Over the coming weeks
you'll get two more short emails: one with practical post-visit notes, one
with frequent questions in long-term follow-up. If they aren't useful, you
can opt out of this series at the bottom.

Best regards,

Dr. Oğuz Bak
PAIN AND CHRONIC ILLNESSES CLINIC

---
You're receiving this because you granted marketing consent.
Unsubscribe: {{unsubscribe_url}} · Privacy: {{kvkk_url}}
```

---

## STEP 2 — T+10 days: "Post-visit care — common questions"

**SUBJECT:** Ten days after your visit — three common questions

**BODY:**

```
Dear {{patient_first_name}},

Following the plan we discussed at your visit, here are the three questions
we hear most often:

**1. "Symptoms have eased — should I keep taking the medication?"**
Adjusting dose on your own is generally not recommended. Any change to a
prescription is best made together at a follow-up.

**2. "I'm experiencing a side-effect — is it urgent?"**
Mild side-effects are common when starting medication and usually settle
within 1–2 weeks. For persistent, severe effects — or anything like
breathing difficulty or swelling — call 112 (or your local emergency
number) first, then let us know.

**3. "When should I book a follow-up?"**
That depends on the plan we agreed at your visit. The recommended date is
visible on your "Appointments" page: https://uzmdroguzbak.com/en/account

For longer reads see the blog: https://uzmdroguzbak.com/en/blog

Best regards,

Dr. Oğuz Bak

---
Unsubscribe: {{unsubscribe_url}} · Privacy: {{kvkk_url}}
```

---

## STEP 3 — T+30 days: "Continuing the conversation"

**SUBJECT:** It's been a month — a follow-up may be useful

**BODY:**

```
Dear {{patient_first_name}},

A month has passed since your last visit.

Treatment is personal and patients respond at different paces, so we don't
push a "monthly check-in" rule. That said, a brief follow-up is often
useful when:

— Your symptoms have changed or new ones appeared
— You'd like to adjust a medication dose
— A test result has come back and you'd like to review it together
— You simply want to talk about how things are going (a 15-minute telehealth
  call works for this)

Booking is straightforward from your account:
https://uzmdroguzbak.com/en/account

This is the last automated message in this series. After this, we'll only
write about your own appointments or topics you've explicitly opted into.

Best regards,

Dr. Oğuz Bak
{{clinic_phone}} · {{clinic_email}}

---
Unsubscribe: {{unsubscribe_url}} · Privacy: {{kvkk_url}}
```

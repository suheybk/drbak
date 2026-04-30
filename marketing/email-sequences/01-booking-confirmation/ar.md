# 01 — Booking confirmation (AR placeholder)

**STATUS: needs medical-translator review (per `memory/dr-bak-locked-decisions.md` §12.14).**
Do not publish until reviewer signs off.

---

## CHANNEL: EMAIL

**FROM:** د. أوغوز باك <info@uzmdroguzbak.com>
**SUBJECT:** تم تأكيد موعدكم — {{appointment_date}} {{appointment_time}}

**BODY (first pass — TR canonical translated):**

```
السيد/ة {{patient_first_name}}،

تم تأكيد موعدكم. يرجى مراجعة التفاصيل قبل الزيارة:

— الخدمة: {{service_title}}
— التاريخ: {{appointment_date}}
— الوقت: {{appointment_time}} (بتوقيت إسطنبول)
— نوع الزيارة: {{delivery_mode}}
{{#if delivery_mode == 'home_visit'}}
— العنوان: سنزوركم على العنوان الذي قدمتموه.
{{/if}}
{{#if delivery_mode == 'in_person'}}
— عنوان العيادة: {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— رابط الجلسة: {{join_url}}
  (افتحوا الرابط في وقت الموعد فقط؛ لا يحتاج تسجيلًا.)
{{/if}}

مدة الاستشارة الأولى من 30 إلى 40 دقيقة. إن أمكن، أحضروا:
— نتائج فحوصات سابقة (MRI، EEG، تحاليل الدم)
— قائمة بالأدوية المنتظمة وجرعاتها
— تقارير ووصفات سابقة

لإعادة الجدولة: {{reschedule_url}}
للإلغاء: {{cancel_url}}
يمكن التعديل حتى 24 ساعة قبل الموعد.

للاستفسار: {{clinic_email}} · واتساب / هاتف: {{clinic_phone}}

تحياتنا،

د. أوغوز باك
عيادة الألم والأمراض المزمنة
Helis More Residence، كارتال / إسطنبول

---
تستلمون هذه الرسالة لأنكم حجزتم موعدًا.
سياسة الخصوصية (KVKK): {{kvkk_url}}
```

> **Reviewer notes:**
> - Verify medical phrasing for "first consultation" register (إستشارة أولى vs زيارة أولى).
> - Confirm honorific *السيد/ة* form vs. *عزيزي/تي* per clinic register.
> - Confirm digit policy: dates and times stay Western; only narrative
>   prose can use Arabic-Indic digits if reviewer prefers.
> - Phone number `{{clinic_phone}}` MUST stay Western digits (LTR isolate).

---

## CHANNEL: SMS / WhatsApp

> **Defer SMS/WA until translator signoff.** Meta-approved AR template name:
> `booking_confirm_ar`, `LANGUAGE: ar`, `CATEGORY: UTILITY`. Submit only
> after translator approves the body.

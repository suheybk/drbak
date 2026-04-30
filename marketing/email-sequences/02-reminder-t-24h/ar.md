# 02 — T-24h reminder (AR placeholder)

**STATUS: needs medical-translator review.**

---

## CHANNEL: EMAIL

**FROM:** د. أوغوز باك <info@uzmdroguzbak.com>
**SUBJECT:** تذكير: موعدكم غدًا — {{appointment_date}} {{appointment_time}}

**BODY (first pass):**

```
السيد/ة {{patient_first_name}}،

تذكير سريع لموعدكم غدًا:

— {{service_title}}
— {{appointment_date}} · {{appointment_time}} (بتوقيت إسطنبول)
— {{delivery_mode}}
{{#if delivery_mode == 'in_person'}}
— عنوان العيادة: {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— رابط الجلسة: {{join_url}}
{{/if}}

قبل الزيارة:
— نتائج الفحوصات السابقة (إن وجدت)
— قائمة الأدوية الحالية مع الجرعات
— مرضى TMS: إكمال نموذج التقييم المسبق من حسابكم إن لم تكملوه بعد

لإعادة الجدولة: {{reschedule_url}}
للإلغاء: {{cancel_url}}
يمكن التعديل حتى 24 ساعة قبل الموعد.

تحياتنا،

د. أوغوز باك
{{clinic_phone}} · {{clinic_email}}
```

---

## CHANNEL: SMS

> **Defer until translator signoff.** Use Twilio for non-TR mobile numbers.

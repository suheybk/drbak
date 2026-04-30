# 02 — T-24h reminder (TR canonical)

**Trigger:** Cron sweep at T-24h before `appointments.starts_at`
**Channels:** Email + SMS
**Lawful basis:** Contract performance
**Status:** Final

---

## CHANNEL: EMAIL

**FROM:** Uzm. Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Yarınki randevunuz — {{appointment_date}} {{appointment_time}}

**BODY:**

```
Sayın {{patient_first_name}},

Yarınki randevunuzu hatırlatmak isteriz.

— {{service_title}}
— {{appointment_date}} · {{appointment_time}} (İstanbul saati)
— {{delivery_mode}}
{{#if delivery_mode == 'in_person'}}
— Adres: {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— Görüşme bağlantısı: {{join_url}}
{{/if}}

Geliş öncesi hazırlık:
— Önceki tetkikleriniz (varsa)
— İlaç listeniz (doz dahil)
— TMS için: ön tarama formu (henüz doldurmadıysanız hesap sayfanızdan)

Plan değişikliği gerekirse:
— Yeniden planla: {{reschedule_url}}
— İptal: {{cancel_url}}
İptal/yeniden planlama 24 saat öncesine kadar yapılabilmektedir.

Sağlıklı günler,

Uzm. Dr. Oğuz Bak
{{clinic_phone}} · {{clinic_email}}
```

---

## CHANNEL: SMS (NetGSM)

`SMS:GSM-7-1-PART`

```
Hatirlatma: yarin {{appointment_date}} {{appointment_time}} randevunuz var. Iptal/yeniden planlama: {{reschedule_url}} (24 saat oncesine kadar)
```

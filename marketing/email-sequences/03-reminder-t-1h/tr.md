# 03 — T-1h reminder, telehealth (TR canonical)

**Trigger:** Cron sweep at T-1h before `appointments.starts_at` if
`delivery_mode == 'telehealth'`.
**Channels:** Email + WhatsApp (no SMS — too noisy at T-1h)
**Lawful basis:** Contract performance
**Status:** Final

---

## CHANNEL: EMAIL

**FROM:** Uzm. Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** 1 saat içinde online görüşmeniz başlıyor

**BODY:**

```
Sayın {{patient_first_name}},

Online görüşmeniz 1 saat içinde başlıyor:
— {{appointment_time}} (İstanbul saati)
— {{service_title}}

Görüşme bağlantısı: {{join_url}}

Bağlantıyı tarayıcıda (Chrome, Safari, Firefox) açabilirsiniz; uygulama
indirmenize gerek yoktur. Mikrofon ve kamera izni soracaktır.

Görüşmeden önce:
— Sessiz bir oda bulun, gerekirse kulaklık kullanın
— İlaç listenizi ve önceki tetkiklerinizi yanınıza alın
— Reçete iletilmesi gerekirse e-postanızı kontrol etmeyi unutmayın

Bağlantı sorunu yaşarsanız: {{clinic_phone}}

Sağlıklı günler,

Uzm. Dr. Oğuz Bak
```

---

## CHANNEL: WHATSAPP (template `reminder_t1h_telehealth_tr`)

```
{{patient_first_name}}, online görüşmeniz 1 saat içinde başlıyor.

Bağlantı: {{join_url}}
Saat: {{appointment_time}} (İstanbul)

Sorun olursa: {{clinic_phone}}
```

> Meta template: `LANGUAGE: tr`, `CATEGORY: UTILITY`.

# 01 — Booking confirmation (TR canonical)

**Trigger:** `appointment.created` event
**Channels:** Email + SMS + WhatsApp (delivery channels chosen by patient consent)
**Lawful basis:** Contract performance (KVKK Madde 5/2-c)
**Status:** Final — review by OB before T-4 weeks

---

## CHANNEL: EMAIL

**FROM:** Uzm. Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Randevunuz oluşturuldu — {{appointment_date}} {{appointment_time}}

**BODY (HTML, plain-text fallback below):**

```
Sayın {{patient_first_name}},

Randevunuz oluşturulmuştur. Aşağıdaki bilgileri muayeneden önce kontrol etmenizi rica ederiz.

— Hizmet: {{service_title}}
— Tarih: {{appointment_date}}
— Saat: {{appointment_time}} (İstanbul saati)
— Görüşme tipi: {{delivery_mode}}
{{#if delivery_mode == 'home_visit'}}
— Adres: Tarafınızdan girilen adrese geliniyor olacağız.
{{/if}}
{{#if delivery_mode == 'in_person'}}
— Klinik adresi: {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— Görüşme bağlantısı: {{join_url}}
  (Bağlantıyı sadece görüşme saatinde kullanın; kayıt olmadan açılır.)
{{/if}}

İlk muayene 30 ile 40 dakika arasında sürer. Yanınızda — varsa — şu bilgileri getirmeniz tedaviye katkı sağlar:
— Daha önce yapılmış tetkikler (MR, EEG, kan testleri)
— Düzenli kullandığınız ilaçların listesi (doz dahil)
— Önceki muayenelerden kalan reçete veya raporlar

Randevunuzu yeniden planlamanız gerekirse: {{reschedule_url}}
İptal etmeniz gerekirse: {{cancel_url}}
İptal/yeniden planlama, randevudan en az 24 saat önce yapılabilmektedir.

Sorularınız için bize yazabilirsiniz: {{clinic_email}}
WhatsApp / telefon: {{clinic_phone}}

Sağlıklı günler dileriz.

Uzm. Dr. Oğuz Bak
AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ
Helis More Residence, Kartal / İstanbul

---
Bu e-posta size randevu oluşturduğunuz için gönderilmiştir.
KVKK aydınlatma metni: {{kvkk_url}}
```

---

## CHANNEL: SMS (NetGSM, sender ID İYS-registered)

`SMS:GSM-7-1-PART` (≤160 chars)

```
Sayin {{patient_first_name}}, randevunuz {{appointment_date}} {{appointment_time}} icin olusturuldu. Yeniden planlama: {{reschedule_url}}
```

> **Note:** SMS strips Turkish-specific chars (ş→s, ç→c, etc.) to stay in
> GSM-7 single part. Full Turkish goes via WhatsApp.

---

## CHANNEL: WHATSAPP (Meta-approved template `booking_confirm`)

```
Sayın {{patient_first_name}},

Randevunuz oluşturuldu:
— {{service_title}}
— {{appointment_date}} {{appointment_time}}
— {{delivery_mode}}

{{#if delivery_mode == 'telehealth'}}
Görüşme bağlantısı: {{join_url}}
{{/if}}

Yeniden planlama veya iptal: {{reschedule_url}}
24 saat öncesine kadar değişiklik yapılabilir.

Uzm. Dr. Oğuz Bak
```

> **Meta template variables:** patient_first_name, service_title,
> appointment_date, appointment_time, delivery_mode, reschedule_url.
> Submit as `LANGUAGE: tr`, `CATEGORY: UTILITY`.

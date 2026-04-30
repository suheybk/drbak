# 05 — Post-visit nurture (TR canonical)

**Trigger:** 48h after `appointment.completed` event AND
`consent_records.purpose == 'marketing_communications'` is `granted`.
**Steps:** 3 (T+48h, T+10d, T+30d). If patient revokes marketing consent at
any time, the remaining steps are suppressed.
**Channels:** Email only.
**Status:** Final
**Tone:** Educational; no sales push. Each step earns the next open by being
useful, not by escalating.

---

## STEP 1 — T+48h: "How are you feeling?"

**SUBJECT:** Muayeneden 48 saat sonra — kontrol e-postası

**BODY:**

```
Sayın {{patient_first_name}},

Muayenenizden bu yana 48 saat geçti.

Bu gibi süreçlerde ilk birkaç gün çoğu zaman gözlem dönemidir. Eğer:

— Yeni veya beklenmedik bir belirti yaşarsanız
— Reçeteli ilaçlardan bir yan etki gözlemlerseniz
— Önerilen tetkiklerden birinde sıkıntı yaşarsanız

bize ulaşmaktan çekinmeyin: {{clinic_email}} · {{clinic_phone}}

Tedavi süreci tek bir muayeneyle bitmez; süreklilik bizim için önemlidir.
Önümüzdeki günlerde size iki kısa e-posta daha göndereceğiz: biri tedavi
sonrası bakımla ilgili genel bilgiler, diğeri uzun süreli takipte sıkça
sorulan sorular. Faydalı bulmazsanız, alttaki bağlantıdan bu serinin
gönderiminden çıkabilirsiniz.

Sağlıklı günler,

Uzm. Dr. Oğuz Bak
AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ

---
Bu e-postayı pazarlama izni verdiğiniz için alıyorsunuz.
İptal: {{unsubscribe_url}} · KVKK: {{kvkk_url}}
```

---

## STEP 2 — T+10 gün: "Tedavi sonrası bakım — sıkça sorulanlar"

**SUBJECT:** Tedaviden 10 gün sonra — sık sorulan birkaç soru

**BODY:**

```
Sayın {{patient_first_name}},

Geçen hafta sizinle paylaştığımız tedavi planından sonra hastalarımızdan en
sık aldığımız üç soruyu derledik:

**1. "Belirtilerim azaldı, ilaca devam edeyim mi?"**
İlaç dozunu kendiliğinizden değiştirmek genellikle önerilmez. Plan
güncellemesi gerekiyorsa hekiminizle birlikte yapılır.

**2. "Yan etki yaşıyorum; acil mi?"**
Hafif yan etkiler ilaç başlangıcında olağandır ve genellikle 1-2 hafta
içinde geriler. Kalıcı, şiddetli ya da nefes darlığı/şişme gibi yan
etkilerde 112 veya en yakın acil servis önceliklidir; sonra bize bilgi
verin.

**3. "Bir sonraki muayeneyi ne zaman almalıyım?"**
Bu, muayenede konuşulan plana bağlıdır. Hesabınızdaki "Randevularım"
sayfasından önerilen kontrol tarihinizi görebilir, oradan yeni bir
randevu oluşturabilirsiniz: https://uzmdroguzbak.com/account

Daha kapsamlı bilgiyi blogumuzdan okuyabilirsiniz:
https://uzmdroguzbak.com/blog

Sağlıklı günler,

Uzm. Dr. Oğuz Bak

---
İptal: {{unsubscribe_url}} · KVKK: {{kvkk_url}}
```

---

## STEP 3 — T+30 gün: "Devam etmek için bir kontrol randevusu"

**SUBJECT:** Bir aydır görüşmedik — bir kontrol uygun olabilir

**BODY:**

```
Sayın {{patient_first_name}},

Son muayenenizin üzerinden bir ay geçti.

Tedavi süreci kişiseldir ve her hasta farklı hızlarda yanıt verir. Bu
nedenle "her ay kontrol gerekir" gibi genel bir öneride bulunmuyoruz.
Ancak şu durumlarda kısa bir kontrol genellikle yararlıdır:

— Belirtilerin değiştiğini ya da yeni belirtiler eklendiğini gözlemlediyseniz
— İlaç dozunu ayarlamak istiyorsanız
— Önerilen tetkiklerden birinin sonucu çıktıysa ve birlikte değerlendirmek istiyorsanız
— Tedavinin nasıl gittiğini sadece konuşmak istiyorsanız (online görüşme 15 dakika sürer)

Hesabınızdan kolayca randevu oluşturabilirsiniz:
https://uzmdroguzbak.com/account

Bu, otomatik gönderilen son nurture mesajıdır. Bundan sonra sadece kendi
randevularınız ve özel olarak izin verdiğiniz konularda yazacağız.

Sağlıklı günler,

Uzm. Dr. Oğuz Bak
{{clinic_phone}} · {{clinic_email}}

---
İptal: {{unsubscribe_url}} · KVKK: {{kvkk_url}}
```

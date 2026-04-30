# 01 — Booking confirmation (FR placeholder)

**STATUS: needs medical-translator review.**

---

## CHANNEL: EMAIL

**FROM:** Dr Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Votre rendez-vous est confirmé — {{appointment_date}} {{appointment_time}}

**BODY (first pass):**

```
Cher/Chère {{patient_first_name}},

Votre rendez-vous est confirmé. Merci de vérifier les informations ci-dessous avant votre visite :

— Soin : {{service_title}}
— Date : {{appointment_date}}
— Heure : {{appointment_time}} (heure d'Istanbul)
— Type de visite : {{delivery_mode}}
{{#if delivery_mode == 'home_visit'}}
— Adresse : nous nous rendrons à l'adresse indiquée lors de la prise de rendez-vous.
{{/if}}
{{#if delivery_mode == 'in_person'}}
— Adresse de la clinique : {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— Lien de la consultation : {{join_url}}
  (à utiliser uniquement à l'heure du rendez-vous ; pas d'inscription nécessaire.)
{{/if}}

La première consultation dure de 30 à 40 minutes. Si possible, apportez :
— vos examens antérieurs (IRM, EEG, bilans sanguins) ;
— la liste de vos traitements en cours, avec posologies ;
— les ordonnances ou comptes-rendus précédents.

Pour reporter : {{reschedule_url}}
Pour annuler : {{cancel_url}}
Modification possible jusqu'à 24 heures avant le rendez-vous.

Questions : {{clinic_email}} · WhatsApp / téléphone : {{clinic_phone}}

Bien à vous,

Dr Oğuz Bak
CLINIQUE DOULEUR ET MALADIES CHRONIQUES
Helis More Residence, Kartal / Istanbul

---
Vous recevez ce message parce que vous avez pris un rendez-vous.
Politique de confidentialité (KVKK) : {{kvkk_url}}
```

> **Reviewer notes:** vouvoiement throughout — verify; confirm Maghreb-French
> medical terminology (IRM vs MRI; thérapie neurale vs neural therapy).

---

## CHANNEL: SMS / WhatsApp

> **Defer SMS/WA until translator signoff.** Meta template: `booking_confirm_fr`.

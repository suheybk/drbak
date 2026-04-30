# 02 — T-24h reminder (FR placeholder)

**STATUS: needs medical-translator review.**

---

## CHANNEL: EMAIL

**FROM:** Dr Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Rappel : votre rendez-vous est demain — {{appointment_date}} {{appointment_time}}

**BODY (first pass):**

```
Cher/Chère {{patient_first_name}},

Un rappel pour votre rendez-vous de demain :

— {{service_title}}
— {{appointment_date}} · {{appointment_time}} (heure d'Istanbul)
— {{delivery_mode}}
{{#if delivery_mode == 'in_person'}}
— Adresse de la clinique : {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— Lien de la consultation : {{join_url}}
{{/if}}

Avant votre visite :
— Examens antérieurs (si disponibles)
— Liste des médicaments en cours, avec posologies
— TMS : compléter le formulaire de pré-évaluation depuis votre espace si ce n'est pas fait

Pour reporter : {{reschedule_url}} · Pour annuler : {{cancel_url}}
Modifications acceptées jusqu'à 24 heures avant le rendez-vous.

Bien à vous,

Dr Oğuz Bak
{{clinic_phone}} · {{clinic_email}}
```

---

## CHANNEL: SMS

> **Defer until translator signoff.**

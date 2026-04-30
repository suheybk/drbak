# 01 — Booking confirmation (ES placeholder)

**STATUS: needs medical-translator review.**

---

## CHANNEL: EMAIL

**FROM:** Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Su cita está confirmada — {{appointment_date}} {{appointment_time}}

**BODY (first pass):**

```
Estimado/a {{patient_first_name}}:

Su cita está confirmada. Por favor revise los datos antes de su visita:

— Servicio: {{service_title}}
— Fecha: {{appointment_date}}
— Hora: {{appointment_time}} (hora de Estambul)
— Tipo de visita: {{delivery_mode}}
{{#if delivery_mode == 'home_visit'}}
— Dirección: acudiremos a la dirección que indicó al reservar.
{{/if}}
{{#if delivery_mode == 'in_person'}}
— Dirección de la clínica: {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— Enlace de la consulta: {{join_url}}
  (úselo únicamente a la hora de su cita; no requiere registro.)
{{/if}}

La primera consulta dura de 30 a 40 minutos. Si dispone, traiga:
— resultados previos (RMN, EEG, analíticas);
— lista de medicación habitual con dosis;
— recetas o informes previos.

Para reprogramar: {{reschedule_url}}
Para cancelar: {{cancel_url}}
Las modificaciones se aceptan hasta 24 horas antes de la cita.

Consultas: {{clinic_email}} · WhatsApp / teléfono: {{clinic_phone}}

Atentamente,

Dr. Oğuz Bak
CLÍNICA DEL DOLOR Y ENFERMEDADES CRÓNICAS
Helis More Residence, Kartal / Estambul

---
Recibe este correo porque ha reservado una cita.
Política de privacidad (KVKK): {{kvkk_url}}
```

> **Reviewer notes:** usted form throughout — verify; verify Spain Spanish
> vs Latin American Spanish neutrality (RMN/MRI; analíticas/exámenes).

---

## CHANNEL: SMS / WhatsApp

> **Defer SMS/WA until translator signoff.** Meta template: `booking_confirm_es`.

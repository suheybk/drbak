# 02 — T-24h reminder (ES placeholder)

**STATUS: needs medical-translator review.**

---

## CHANNEL: EMAIL

**FROM:** Dr. Oğuz Bak <info@uzmdroguzbak.com>
**SUBJECT:** Recordatorio: su cita es mañana — {{appointment_date}} {{appointment_time}}

**BODY (first pass):**

```
Estimado/a {{patient_first_name}}:

Un recordatorio para su cita de mañana:

— {{service_title}}
— {{appointment_date}} · {{appointment_time}} (hora de Estambul)
— {{delivery_mode}}
{{#if delivery_mode == 'in_person'}}
— Dirección de la clínica: {{address}}
{{/if}}
{{#if delivery_mode == 'telehealth'}}
— Enlace de la consulta: {{join_url}}
{{/if}}

Antes de la visita:
— Resultados previos (si los tiene)
— Medicación actual con dosis
— TMS: completar el formulario de cribado desde su cuenta si aún no lo hizo

Para reprogramar: {{reschedule_url}} · Para cancelar: {{cancel_url}}
Las modificaciones se aceptan hasta 24 horas antes de la cita.

Atentamente,

Dr. Oğuz Bak
{{clinic_phone}} · {{clinic_email}}
```

---

## CHANNEL: SMS

> **Defer until translator signoff.**

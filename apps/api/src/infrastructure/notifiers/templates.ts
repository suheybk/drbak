/**
 * Notification template renderer.
 * Returns subject + plain + html for email, body for sms, params for WhatsApp.
 *
 * Templates per locale; falls back to TR if a locale string is missing.
 * The actual messaging strings live in `packages/i18n-keys` once Drop 4 lands.
 * For now we keep them inline so the queue consumer is fully functional.
 */

import type { Locale } from '@dr-bak/contracts';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface RenderedSms {
  text: string;
}

export interface RenderedWhatsapp {
  templateName: string;
  params: ReadonlyArray<string>;
}

const TR_DT = (iso: string): string => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(d);
};
const EN_DT = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(iso));

export const renderEmail = (
  template: string,
  locale: Locale,
  payload: Record<string, unknown>,
): RenderedEmail => {
  switch (template) {
    case 'appointment_confirmation': {
      const dt =
        locale === 'tr' ? TR_DT(String(payload.startsAtIso)) : EN_DT(String(payload.startsAtIso));
      const subject =
        locale === 'tr'
          ? 'Randevunuz onaylandı — Uzm. Dr. Oğuz Bak'
          : 'Appointment confirmed — Uzm. Dr. Oğuz Bak';
      const text =
        locale === 'tr'
          ? `Merhaba,\n\nRandevunuz ${dt} tarihine onaylanmıştır.\n\nGörüşmek üzere,\nUzm. Dr. Oğuz Bak\nAĞRI ve KRONİK HASTALIKLAR KLİNİĞİ`
          : `Hello,\n\nYour appointment has been confirmed for ${dt}.\n\nSee you soon,\nUzm. Dr. Oğuz Bak\nPain & Chronic Illnesses Clinic`;
      return { subject, text, html: `<p>${text.replace(/\n/g, '<br>')}</p>` };
    }
    case 'appointment_reminder_24h':
      return reminder('24 saat sonra', '24 hours from now', locale, payload);
    case 'appointment_reminder_1h':
      return reminder('1 saat sonra', '1 hour from now', locale, payload);
    case 'appointment_cancelled':
      return {
        subject: locale === 'tr' ? 'Randevu iptal edildi' : 'Appointment cancelled',
        text:
          locale === 'tr'
            ? 'Randevunuz iptal edilmiştir. Yeni bir tarih için randevu sayfasından planlayabilirsiniz.'
            : 'Your appointment has been cancelled. You may book a new time on the booking page.',
        html: '',
      };
    case 'email_verify': {
      const url = String(payload.verifyUrl);
      return {
        subject: locale === 'tr' ? 'E-posta adresinizi doğrulayın' : 'Verify your email',
        text:
          locale === 'tr'
            ? `Aşağıdaki bağlantıyı tıklayarak e-posta adresinizi doğrulayın:\n\n${url}\n\nBağlantı 24 saat geçerlidir.`
            : `Click the link below to verify your email:\n\n${url}\n\nLink valid for 24 hours.`,
        html: `<p><a href="${url}">${url}</a></p>`,
      };
    }
    case 'password_reset': {
      const url = String(payload.resetUrl);
      return {
        subject: locale === 'tr' ? 'Şifre sıfırlama' : 'Password reset',
        text:
          locale === 'tr'
            ? `Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın (1 saat geçerli):\n\n${url}`
            : `Use the link below to reset your password (valid 1 hour):\n\n${url}`,
        html: `<p><a href="${url}">${url}</a></p>`,
      };
    }
    default:
      return { subject: 'Notification', text: 'Notification', html: 'Notification' };
  }
};

const reminder = (
  trWhen: string,
  enWhen: string,
  locale: Locale,
  payload: Record<string, unknown>,
): RenderedEmail => {
  const dt =
    locale === 'tr' ? TR_DT(String(payload.startsAtIso)) : EN_DT(String(payload.startsAtIso));
  const subject =
    locale === 'tr' ? `Randevu hatırlatma — ${trWhen}` : `Appointment reminder — ${enWhen}`;
  const text =
    locale === 'tr'
      ? `Randevunuzu hatırlatmak isteriz: ${dt}.`
      : `A friendly reminder of your appointment: ${dt}.`;
  return { subject, text, html: `<p>${text}</p>` };
};

export const renderSms = (
  template: string,
  locale: Locale,
  payload: Record<string, unknown>,
): RenderedSms => {
  const dt =
    locale === 'tr' ? TR_DT(String(payload.startsAtIso)) : EN_DT(String(payload.startsAtIso));
  const map: Record<string, Record<Locale, string>> = {
    appointment_confirmation: {
      tr: `Randevunuz ${dt} tarihine onaylandı. Dr. Oğuz Bak Klinik.`,
      en: `Your appointment is confirmed for ${dt}. Dr. Oğuz Bak Clinic.`,
      ar: `تم تأكيد موعدك في ${dt}. عيادة د. أوغوز باك.`,
      fr: `Votre rendez-vous est confirmé pour ${dt}.`,
      es: `Su cita está confirmada para ${dt}.`,
    },
    appointment_reminder_24h: {
      tr: `Hatırlatma: yarın ${dt} randevunuz var.`,
      en: `Reminder: tomorrow ${dt} appointment.`,
      ar: `تذكير: لديك موعد غدا ${dt}.`,
      fr: `Rappel: rendez-vous demain ${dt}.`,
      es: `Recordatorio: cita mañana ${dt}.`,
    },
    appointment_reminder_1h: {
      tr: `Hatırlatma: 1 saat sonra ${dt} randevunuz var.`,
      en: `Reminder: appointment in 1 hour at ${dt}.`,
      ar: `تذكير: موعد بعد ساعة في ${dt}.`,
      fr: `Rappel: rendez-vous dans 1h à ${dt}.`,
      es: `Recordatorio: cita en 1 hora a las ${dt}.`,
    },
  };
  const text = map[template]?.[locale] ?? `${template}: ${dt}`;
  return { text };
};

export const renderWhatsapp = (
  template: string,
  locale: Locale,
  payload: Record<string, unknown>,
): RenderedWhatsapp => {
  // Templates pre-approved in Meta Business Manager. The locale-to-Meta-code
  // map (tr→tr_TR, etc.) lives in `notificationConsumer.localeMetaCode` —
  // the consumer is the only caller that needs it for the WA send.
  const templateName = `${template}_v1`;
  const dt =
    locale === 'tr' ? TR_DT(String(payload.startsAtIso)) : EN_DT(String(payload.startsAtIso));
  return {
    templateName,
    params: [String(payload.serviceId ?? ''), dt],
  };
};

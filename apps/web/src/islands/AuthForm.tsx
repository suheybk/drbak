import type { Locale } from '@dr-bak/i18n-keys';
import { Banner, Button, Checkbox, Field, TextInput, useTranslator } from '@dr-bak/ui';
/**
 * Login + register form. Single component, mode prop selects which fields.
 *
 * On success:
 *  - login → redirects to `next` query param or /account
 *  - register → shows "check your email" success state (verification mail
 *    is enqueued by the API)
 */
import { useState } from 'react';
import { apiFetch, errorMessageFor } from '~/lib/api';

type Mode = 'login' | 'register';

interface Props {
  locale: Locale;
  dict: Record<string, unknown>;
  mode: Mode;
  next?: string;
  consentDocumentVersion: string;
  oauthBeginPath: string;
}

export default function AuthForm({
  locale,
  dict,
  mode,
  next,
  consentDocumentVersion,
  oauthBeginPath,
}: Props) {
  const t = useTranslator(dict, locale);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [consentBooking, setConsentBooking] = useState(false);
  const [consentHealth, setConsentHealth] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === 'login') {
      const r = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setSubmitting(false);
      if (!r.ok) return setError(errorMessageFor(r.error, t as never));
      window.location.href = next ?? `/${locale === 'tr' ? '' : `${locale}/`}account`;
      return;
    }

    // register
    if (!consentBooking || !consentHealth) {
      setSubmitting(false);
      setError(t('errors.CONSENT_MISSING'));
      return;
    }
    const r = await apiFetch<{ userId: string }>('/auth/register', {
      method: 'POST',
      body: {
        email,
        password,
        fullName,
        dateOfBirth: dob,
        locale,
        phoneE164: phone || undefined,
        consents: {
          appointmentBooking: true,
          healthDataProcessing: true,
          marketingCommunications: consentMarketing || undefined,
        },
        consentDocumentVersion,
      },
    });
    setSubmitting(false);
    if (!r.ok) return setError(errorMessageFor(r.error, t as never));
    setRegistered(true);
  };

  if (registered) {
    return (
      <Banner variant="success" title={t('auth.verifyTitle')}>
        <p>{t('auth.verifySuccess').replace('verified', '')}</p>
        <p>
          {locale === 'tr'
            ? 'Hesabınız oluşturuldu. E-postanıza gönderdiğimiz doğrulama bağlantısına tıklayın.'
            : locale === 'ar'
              ? 'تم إنشاء الحساب. اضغطوا على رابط التأكيد في بريدكم.'
              : locale === 'fr'
                ? 'Compte créé. Cliquez sur le lien de vérification reçu par courriel.'
                : locale === 'es'
                  ? 'Cuenta creada. Haga clic en el enlace de verificación enviado por correo.'
                  : 'Account created. Click the verification link we just emailed you.'}
        </p>
      </Banner>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
      {error ? (
        <Banner variant="danger">
          <p style={{ margin: 0 }}>{error}</p>
        </Banner>
      ) : null}

      <Field label={t('auth.emailLabel')} required>
        {({ inputId }) => (
          <TextInput
            id={inputId}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
        )}
      </Field>

      <Field label={t('auth.passwordLabel')} required>
        {({ inputId }) => (
          <TextInput
            id={inputId}
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 12 : undefined}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
        )}
      </Field>

      {mode === 'register' && (
        <>
          <Field label={t('auth.fullNameLabel')} required>
            {({ inputId }) => (
              <TextInput
                id={inputId}
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.currentTarget.value)}
              />
            )}
          </Field>

          <Field label={t('auth.dateOfBirthLabel')} required>
            {({ inputId }) => (
              <TextInput
                id={inputId}
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.currentTarget.value)}
              />
            )}
          </Field>

          <Field label={t('auth.phoneLabel')}>
            {({ inputId }) => (
              <TextInput
                id={inputId}
                type="tel"
                autoComplete="tel"
                pattern="\+\d{8,15}"
                placeholder="+905xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
              />
            )}
          </Field>

          <Checkbox
            checked={consentBooking}
            onChange={(e) => setConsentBooking(e.currentTarget.checked)}
            label={t('booking.consentBookingLabel')}
          />
          <Checkbox
            checked={consentHealth}
            onChange={(e) => setConsentHealth(e.currentTarget.checked)}
            label={t('booking.consentHealthDataLabel')}
          />
          <Checkbox
            checked={consentMarketing}
            onChange={(e) => setConsentMarketing(e.currentTarget.checked)}
            label={t('auth.consentMarketingLabel')}
          />
        </>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button variant="primary" type="submit" loading={submitting}>
          {t('auth.submit')}
        </Button>
        <a className="drb-btn drb-btn--ghost" href={oauthBeginPath}>
          {t('auth.googleSignIn')}
        </a>
      </div>
    </form>
  );
}

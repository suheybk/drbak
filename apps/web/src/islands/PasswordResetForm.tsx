import type { Locale } from '@dr-bak/i18n-keys';
import { Banner, Button, Field, TextInput, useTranslator } from '@dr-bak/ui';
/**
 * Two-mode password reset form: request (enter email) and confirm (token+pwd).
 * Server response is intentionally generic on `request` — never reveals
 * whether the email exists.
 */
import { useState } from 'react';
import { apiFetch, errorMessageFor } from '~/lib/api';

interface Props {
  locale: Locale;
  dict: Record<string, unknown>;
  mode: 'request' | 'confirm';
  token?: string | undefined;
}

export default function PasswordResetForm({ locale, dict, mode, token }: Props) {
  const t = useTranslator(dict, locale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (mode === 'request') {
      await apiFetch<undefined>('/auth/password/reset/request', {
        method: 'POST',
        body: { email },
      });
      setSubmitting(false);
      setDone(true);
      return;
    }
    const r = await apiFetch<undefined>('/auth/password/reset/confirm', {
      method: 'POST',
      body: { token, newPassword: password },
    });
    setSubmitting(false);
    if (!r.ok) return setError(errorMessageFor(r.error, t as never));
    setDone(true);
  };

  if (done) {
    return (
      <Banner variant="success">
        <p style={{ margin: 0 }}>
          {mode === 'request' ? t('auth.resetSent') : t('auth.verifySuccess')}
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
      {mode === 'request' ? (
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
      ) : (
        <Field label={t('auth.passwordLabel')} required>
          {({ inputId }) => (
            <TextInput
              id={inputId}
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          )}
        </Field>
      )}
      <Button type="submit" variant="primary" loading={submitting}>
        {t('auth.submit')}
      </Button>
    </form>
  );
}

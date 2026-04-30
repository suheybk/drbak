/**
 * Cancel/reschedule actions for an appointment row in the portal.
 * Reschedule takes the user back through the booking flow with the original
 * appointment id; cancel posts to /me/appointments/:id/cancel.
 */
import { useState } from 'react';
import { Banner, Button, useTranslator } from '@dr-bak/ui';
import type { Locale } from '@dr-bak/i18n-keys';
import { apiFetch, errorMessageFor } from '~/lib/api';

interface Props {
  locale: Locale;
  dict: Record<string, unknown>;
  appointmentId: string;
  cancelable: boolean;
  rescheduleHref: string;
}

export default function AppointmentActions({
  locale,
  dict,
  appointmentId,
  cancelable,
  rescheduleHref,
}: Props) {
  const t = useTranslator(dict, locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    if (!confirm(t('portal.cancelAction') + '?')) return;
    setBusy(true);
    setError(null);
    const r = await apiFetch<undefined>(`/patient/me/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      body: { reason: undefined },
      idempotencyKey: `cancel-${appointmentId}`,
    });
    setBusy(false);
    if (!r.ok) return setError(errorMessageFor(r.error, t as never));
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      {error ? <Banner variant="danger"><p style={{ margin: 0 }}>{error}</p></Banner> : null}
      <a className="drb-btn drb-btn--ghost drb-btn--sm" href={rescheduleHref}>
        {t('portal.rescheduleAction')}
      </a>
      {cancelable ? (
        <Button variant="ghost" size="sm" onClick={cancel} loading={busy}>
          {t('portal.cancelAction')}
        </Button>
      ) : null}
    </div>
  );
}

import type { Locale } from '@dr-bak/i18n-keys';
import { Banner, Button, Checkbox, Field, useTranslator } from '@dr-bak/ui';
/**
 * TMS pre-screening form. Posts to /patient/me/tms-screening.
 *
 * Validity is 365 days (memory/dr-bak-locked-decisions.md). The portal page
 * shows whether the existing screening is still valid; users can re-submit
 * to refresh.
 */
import { useState } from 'react';
import { apiFetch, errorMessageFor } from '~/lib/api';

interface Props {
  locale: Locale;
  dict: Record<string, unknown>;
}

type YN = 'yes' | 'no';

export default function TmsScreeningForm({ locale, dict }: Props) {
  const t = useTranslator(dict, locale);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [hasMetalImplantsInHead, setMetal] = useState<YN>('no');
  const [hasCochlearImplant, setCochlear] = useState<YN>('no');
  const [hasPacemaker, setPacemaker] = useState<YN>('no');
  const [hasNeurostimulator, setNeuro] = useState<YN>('no');
  const [hasMedicationPump, setPump] = useState<YN>('no');
  const [isPregnantNA, setPregnantNA] = useState(true);
  const [isPregnant, setPregnant] = useState<YN>('no');
  const [hasHistoryOfSeizures, setSeizures] = useState<YN>('no');
  const [seizureDetails, setSeizureDetails] = useState('');
  const [currentMedications, setMeds] = useState('');
  const [hasSubstanceUseDisorder, setSubstance] = useState<YN>('no');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) return setError(t('errors.CONSENT_MISSING'));
    setError(null);
    setSubmitting(true);
    const payload = {
      hasMetalImplantsInHead: hasMetalImplantsInHead === 'yes',
      hasCochlearImplant: hasCochlearImplant === 'yes',
      hasPacemaker: hasPacemaker === 'yes',
      hasNeurostimulator: hasNeurostimulator === 'yes',
      hasMedicationPump: hasMedicationPump === 'yes',
      isPregnant: isPregnantNA ? null : isPregnant === 'yes',
      hasHistoryOfSeizures: hasHistoryOfSeizures === 'yes',
      seizureDetails: seizureDetails.trim() || undefined,
      currentMedications: currentMedications.trim() || undefined,
      hasSubstanceUseDisorder: hasSubstanceUseDisorder === 'yes',
      notes: notes.trim() || undefined,
    };
    const r = await apiFetch<{ valid: boolean }>('/patient/me/tms-screening', {
      method: 'POST',
      body: payload,
    });
    setSubmitting(false);
    if (!r.ok) return setError(errorMessageFor(r.error, t as never));
    setDone(true);
  };

  if (done) {
    return (
      <Banner variant="success" title={t('tms.submit')}>
        <p style={{ margin: 0 }}>
          {t('portal.tmsValid', { date: new Date().toISOString().slice(0, 10) })}
        </p>
      </Banner>
    );
  }

  const ynField = (label: string, value: YN, onChange: (v: YN) => void) => (
    <Field label={label} required>
      {({ inputId }) => (
        <div
          role="radiogroup"
          aria-labelledby={inputId}
          style={{ display: 'flex', gap: 'var(--space-4)' }}
        >
          <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input type="radio" checked={value === 'yes'} onChange={() => onChange('yes')} />
            {t('tms.yes')}
          </label>
          <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input type="radio" checked={value === 'no'} onChange={() => onChange('no')} />
            {t('tms.no')}
          </label>
        </div>
      )}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
      {error ? (
        <Banner variant="danger">
          <p style={{ margin: 0 }}>{error}</p>
        </Banner>
      ) : null}

      {ynField(t('tms.qMetalImplants'), hasMetalImplantsInHead, setMetal)}
      {ynField(t('tms.qCochlear'), hasCochlearImplant, setCochlear)}
      {ynField(t('tms.qPacemaker'), hasPacemaker, setPacemaker)}
      {ynField(t('tms.qNeurostimulator'), hasNeurostimulator, setNeuro)}
      {ynField(t('tms.qMedicationPump'), hasMedicationPump, setPump)}

      <Field label={t('tms.qPregnant')}>
        {() => (
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input type="radio" checked={isPregnantNA} onChange={() => setPregnantNA(true)} />
              {t('tms.notApplicable')}
            </label>
            <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="radio"
                checked={!isPregnantNA && isPregnant === 'yes'}
                onChange={() => {
                  setPregnantNA(false);
                  setPregnant('yes');
                }}
              />
              {t('tms.yes')}
            </label>
            <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="radio"
                checked={!isPregnantNA && isPregnant === 'no'}
                onChange={() => {
                  setPregnantNA(false);
                  setPregnant('no');
                }}
              />
              {t('tms.no')}
            </label>
          </div>
        )}
      </Field>

      {ynField(t('tms.qSeizureHistory'), hasHistoryOfSeizures, setSeizures)}
      {hasHistoryOfSeizures === 'yes' && (
        <Field label={t('tms.qSeizureDetailsLabel')}>
          {({ inputId }) => (
            <textarea
              id={inputId}
              className="drb-input"
              rows={3}
              maxLength={1000}
              value={seizureDetails}
              onChange={(e) => setSeizureDetails(e.currentTarget.value)}
            />
          )}
        </Field>
      )}

      <Field label={t('tms.qMedicationsLabel')}>
        {({ inputId }) => (
          <textarea
            id={inputId}
            className="drb-input"
            rows={3}
            maxLength={2000}
            value={currentMedications}
            onChange={(e) => setMeds(e.currentTarget.value)}
          />
        )}
      </Field>

      {ynField(t('tms.qSubstanceUse'), hasSubstanceUseDisorder, setSubstance)}

      <Field label={t('tms.qNotesLabel')}>
        {({ inputId }) => (
          <textarea
            id={inputId}
            className="drb-input"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />
        )}
      </Field>

      <Checkbox
        checked={consent}
        onChange={(e) => setConsent(e.currentTarget.checked)}
        label={t('tms.consentLabel')}
      />
      <Button type="submit" variant="primary" loading={submitting}>
        {t('tms.submit')}
      </Button>
    </form>
  );
}

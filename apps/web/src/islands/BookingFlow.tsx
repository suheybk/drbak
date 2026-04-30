import type { Locale, TranslationKey } from '@dr-bak/i18n-keys';
import {
  Banner,
  Button,
  Checkbox,
  DateTimePicker,
  Field,
  Select,
  type Slot,
  Stepper,
  TextInput,
  useTranslator,
} from '@dr-bak/ui';
/**
 * 5-step booking flow — the only large React island in the app.
 *
 * Flow:
 *   1. choose service + delivery mode
 *   2. pick date (next 14 days strip)
 *   3. pick slot (grid of times for that date)
 *   4. patient details + consents (server already has email/profile from auth)
 *   5. confirm + create appointment
 *
 * State machine: linear with strict next/back. Any error from the API resets
 * to the appropriate step with a localised banner. The slot hold is created
 * on step 3 → 4 transition; if the user drops off mid-flow the hold expires
 * naturally after 5 minutes (server-side TTL).
 *
 * Auth: this component assumes the user is signed in. The page-level Astro
 * route redirects to /login if not — never trust the client-side check alone.
 */
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, errorMessageFor } from '~/lib/api';

type DeliveryMode = 'in_person' | 'home_visit' | 'telehealth';
type Service = {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  deliveryModes: ReadonlyArray<DeliveryMode>;
  requiresTmsScreening: boolean;
};

type Hold = { holdToken: string; expiresAt: string };

type Step = 1 | 2 | 3 | 4 | 5;
const STEP_KEYS: Record<Step, TranslationKey> = {
  1: 'booking.step1Title',
  2: 'booking.step2Title',
  3: 'booking.step3Title',
  4: 'booking.step4Title',
  5: 'booking.step5Title',
};

interface Props {
  locale: Locale;
  dict: Record<string, unknown>;
  consentDocumentVersion: string;
  /** Optional service slug to pre-select. */
  presetServiceSlug?: string;
}

const todayUtcYmd = (): string => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export default function BookingFlow({
  locale,
  dict,
  consentDocumentVersion,
  presetServiceSlug,
}: Props) {
  const t = useTranslator(dict, locale);

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('in_person');

  // Step 2/3
  const [date, setDate] = useState<string>(todayUtcYmd());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Step 4
  const [hold, setHold] = useState<Hold | null>(null);
  const [patientNotes, setPatientNotes] = useState('');
  const [homeAddress1, setHomeAddress1] = useState('');
  const [homeAddress2, setHomeAddress2] = useState('');
  const [consentBooking, setConsentBooking] = useState(false);
  const [consentHealth, setConsentHealth] = useState(false);
  const [consentRecording, setConsentRecording] = useState(false);

  // Step 5
  const [submitting, setSubmitting] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Load services on mount
  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await apiFetch<{ items: Service[] }>(`/public/services?locale=${locale}`);
      if (!alive) return;
      if (r.ok) {
        setServices(r.value.items);
        const preset = presetServiceSlug
          ? r.value.items.find((s) => s.slug === presetServiceSlug)
          : undefined;
        if (preset) {
          setServiceId(preset.id);
          setDeliveryMode(preset.deliveryModes[0] ?? 'in_person');
        }
      } else {
        setError(errorMessageFor(r.error, t as never));
      }
    })();
    return () => {
      alive = false;
    };
  }, [locale, presetServiceSlug, t]);

  // Reload slots whenever (service, date, deliveryMode) change while on step 2/3
  useEffect(() => {
    if (step !== 2 && step !== 3) return;
    if (!serviceId) return;
    let alive = true;
    setSlotsLoading(true);
    void (async () => {
      const r = await apiFetch<{ slots: Slot[] }>(
        `/public/availability?serviceId=${encodeURIComponent(serviceId)}&date=${date}&deliveryMode=${deliveryMode}&locale=${locale}`,
      );
      if (!alive) return;
      setSlotsLoading(false);
      if (r.ok) {
        setSlots(r.value.slots);
        setSelectedSlot(null);
      } else {
        setError(errorMessageFor(r.error, t as never));
      }
    })();
    return () => {
      alive = false;
    };
  }, [step, serviceId, date, deliveryMode, locale, t]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  const stepDef = useMemo(
    () =>
      ([1, 2, 3, 4, 5] as Step[]).map((n) => ({
        id: String(n),
        label: t(STEP_KEYS[n]),
      })),
    [t],
  );

  const canAdvanceFrom = (s: Step): boolean => {
    switch (s) {
      case 1:
        return !!serviceId;
      case 2:
        return !!date;
      case 3:
        return !!selectedSlot && selectedSlot.available;
      case 4:
        return (
          consentBooking &&
          consentHealth &&
          (deliveryMode !== 'home_visit' || homeAddress1.trim().length > 0)
        );
      case 5:
        return false;
    }
  };

  const goNext = async () => {
    setError(null);
    if (step === 3 && selectedSlot) {
      // Create slot hold
      const r = await apiFetch<Hold>('/public/booking/holds', {
        method: 'POST',
        body: { serviceId, startsAt: selectedSlot.startsAt, deliveryMode },
        idempotencyKey: `hold-${serviceId}-${selectedSlot.startsAt}`,
      });
      if (!r.ok) {
        setError(errorMessageFor(r.error, t as never));
        return;
      }
      setHold(r.value);
    }
    setStep((step + 1) as Step);
  };

  const goBack = () => {
    setError(null);
    setStep(Math.max(1, step - 1) as Step);
  };

  const submit = async () => {
    if (!hold || !selectedSlot) {
      setError(t('errors.SLOT_NOT_FOUND'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const idem = `appt-${hold.holdToken.slice(0, 16)}`;
    const consents: Record<string, boolean> = {
      appointmentBooking: true,
      healthDataProcessing: true,
    };
    if (deliveryMode === 'telehealth') consents.videoConsultationRecording = consentRecording;
    const r = await apiFetch<{ id: string }>('/patient/me/appointments', {
      method: 'POST',
      idempotencyKey: idem,
      body: {
        holdToken: hold.holdToken,
        serviceId,
        startsAt: selectedSlot.startsAt,
        deliveryMode,
        patientNotes: patientNotes.trim() || undefined,
        homeAddressLine1: deliveryMode === 'home_visit' ? homeAddress1 : undefined,
        homeAddressLine2: deliveryMode === 'home_visit' && homeAddress2 ? homeAddress2 : undefined,
        consents,
        consentDocumentVersion,
        locale,
      },
    });
    setSubmitting(false);
    if (!r.ok) {
      setError(errorMessageFor(r.error, t as never));
      return;
    }
    setAppointmentId(r.value.id);
  };

  if (appointmentId) {
    return (
      <div className="app-prose">
        <Banner variant="success" title={t('booking.successTitle')}>
          <p>{t('booking.successLead')}</p>
        </Banner>
        <p style={{ marginBlockStart: 'var(--space-6)' }}>
          <a
            className="drb-btn drb-btn--primary"
            href={`/${locale === 'tr' ? '' : `${locale}/`}account`}
          >
            {t('booking.successCta')}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Stepper steps={stepDef} currentStepId={String(step)} label={t('booking.title')} />
      <p
        style={{
          color: 'var(--color-ink-subtle)',
          fontSize: 'var(--type-meta)',
          marginBlockStart: 'var(--space-3)',
        }}
      >
        <span className="digit-western" dir="ltr">
          {t('booking.step', { n: step })}
        </span>
      </p>

      {error ? (
        <Banner variant="danger">
          <p style={{ margin: 0 }}>{error}</p>
        </Banner>
      ) : null}

      <section style={{ marginBlockStart: 'var(--space-6)' }}>
        {step === 1 && (
          <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
            <Field label={t('booking.selectService')}>
              {({ inputId }) => (
                <Select
                  id={inputId}
                  value={serviceId}
                  onChange={(e) => setServiceId(e.currentTarget.value)}
                >
                  <option value="">—</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('booking.selectDeliveryMode')}>
              {({ inputId }) => (
                <Select
                  id={inputId}
                  value={deliveryMode}
                  onChange={(e) => setDeliveryMode(e.currentTarget.value as DeliveryMode)}
                  disabled={!selectedService}
                >
                  {(
                    selectedService?.deliveryModes ?? ['in_person', 'home_visit', 'telehealth']
                  ).map((m) => (
                    <option key={m} value={m}>
                      {t(`services.deliveryMode.${m}` as TranslationKey)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        )}

        {(step === 2 || step === 3) && (
          <DateTimePicker
            t={t as never}
            locale={locale}
            selectedDate={date}
            onSelectDate={setDate}
            slots={slots}
            selectedSlotId={selectedSlot?.id}
            onSelectSlot={setSelectedSlot}
            loading={slotsLoading}
          />
        )}

        {step === 4 && (
          <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
            {hold ? (
              <Banner variant="info">
                <p style={{ margin: 0 }}>{t('booking.slotHoldNote')}</p>
              </Banner>
            ) : null}

            <Field label={t('booking.patientNotesLabel')} help={t('common.optional')}>
              {({ inputId, describedBy }) => (
                <textarea
                  id={inputId}
                  aria-describedby={describedBy}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.currentTarget.value)}
                  rows={4}
                  className="drb-input"
                  maxLength={2000}
                />
              )}
            </Field>

            {deliveryMode === 'home_visit' && (
              <>
                <Field label={t('booking.homeAddressLine1Label')} required>
                  {({ inputId }) => (
                    <TextInput
                      id={inputId}
                      value={homeAddress1}
                      onChange={(e) => setHomeAddress1(e.currentTarget.value)}
                      maxLength={200}
                    />
                  )}
                </Field>
                <Field label={t('booking.homeAddressLine2Label')}>
                  {({ inputId }) => (
                    <TextInput
                      id={inputId}
                      value={homeAddress2}
                      onChange={(e) => setHomeAddress2(e.currentTarget.value)}
                      maxLength={200}
                    />
                  )}
                </Field>
              </>
            )}

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
            {deliveryMode === 'telehealth' && (
              <Checkbox
                checked={consentRecording}
                onChange={(e) => setConsentRecording(e.currentTarget.checked)}
                label={t('booking.consentRecordingLabel')}
              />
            )}
          </div>
        )}

        {step === 5 && (
          <div className="card">
            <h3 style={{ marginBlockEnd: 'var(--space-4)' }}>{t('booking.summaryTitle')}</h3>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                columnGap: 'var(--space-4)',
                rowGap: 'var(--space-2)',
              }}
            >
              <dt>{t('services.title')}:</dt>
              <dd>{selectedService?.title ?? '—'}</dd>
              <dt>{t('booking.selectDeliveryMode')}:</dt>
              <dd>{t(`services.deliveryMode.${deliveryMode}` as TranslationKey)}</dd>
              <dt>{t('booking.step2Title')}:</dt>
              <dd className="digit-western" dir="ltr">
                {date}
              </dd>
              <dt>{t('booking.step3Title')}:</dt>
              <dd className="digit-western" dir="ltr">
                {selectedSlot
                  ? new Intl.DateTimeFormat(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                      timeZone: 'Europe/Istanbul',
                      numberingSystem: 'latn',
                    }).format(new Date(selectedSlot.startsAt))
                  : '—'}
              </dd>
            </dl>
          </div>
        )}
      </section>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginBlockStart: 'var(--space-8)',
          flexWrap: 'wrap',
        }}
      >
        {step > 1 && step < 6 ? (
          <Button variant="ghost" onClick={goBack} disabled={submitting}>
            {t('booking.back')}
          </Button>
        ) : null}
        {step < 5 ? (
          <Button variant="primary" onClick={goNext} disabled={!canAdvanceFrom(step)}>
            {t('booking.next')}
          </Button>
        ) : (
          <Button variant="accent" onClick={submit} loading={submitting}>
            {t('booking.confirm')}
          </Button>
        )}
      </div>
    </div>
  );
}

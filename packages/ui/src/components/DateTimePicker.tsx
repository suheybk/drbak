import clsx from 'clsx';
import { useMemo } from 'react';

/**
 * Booking-flow date+time picker.
 *
 * - The date track is a horizontal scroll of the next 14 days; the API only
 *   returns availability one day at a time, so we keep network calls minimal.
 * - The time grid renders the slots returned by `/api/v1/public/availability`;
 *   the grid itself is dumb — the parent owns fetching.
 * - In RTL locales the chevrons flip via CSS logical properties; the slot
 *   numbers stay Western (24h) — we pass `dir="ltr"` on the digit cells.
 */

export type Slot = {
  id: string;
  startsAt: string; // ISO
  endsAt: string;
  available: boolean;
  reason?: string | undefined;
};

export type DateTimePickerProps = {
  /** YYYY-MM-DD currently visible day */
  selectedDate: string;
  onSelectDate: (ymd: string) => void;
  /** Slots for `selectedDate`; empty array shows the "no slots" state. */
  slots: ReadonlyArray<Slot>;
  selectedSlotId?: string | undefined;
  onSelectSlot: (slot: Slot) => void;
  loading?: boolean;
  /** YYYY-MM-DD; the picker won't go before this. Default: today UTC. */
  minDate?: string;
  /** Number of days the strip shows. */
  daysAhead?: number;
  /** Resolved translator. */
  t: (key: 'common.loading' | 'booking.noSlots' | 'common.today' | 'common.tomorrow') => string;
  /** Locale for date formatting. */
  locale: string;
  /** Optional formatter override (server-provided to avoid hydration drift). */
  formatDate?: (ymd: string) => { weekday: string; dom: string; month: string };
};

const todayUtcYmd = (): string => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
};

const addDaysYmd = (ymd: string, n: number): string => {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate(),
  ).padStart(2, '0')}`;
};

const defaultFormat = (locale: string) => (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  const fmt = (opt: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...opt, timeZone: 'UTC' }).format(dt);
  return {
    weekday: fmt({ weekday: 'short' }),
    dom: fmt({ day: 'numeric' }),
    month: fmt({ month: 'short' }),
  };
};

const formatTimeIso = (iso: string, locale: string): string => {
  const d = new Date(iso);
  // Always force 24h; force latn digits in AR via numberingSystem
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Istanbul',
    numberingSystem: 'latn',
  }).format(d);
};

export const DateTimePicker = ({
  selectedDate,
  onSelectDate,
  slots,
  selectedSlotId,
  onSelectSlot,
  loading = false,
  minDate,
  daysAhead = 14,
  t,
  locale,
  formatDate,
}: DateTimePickerProps) => {
  const fmt = formatDate ?? defaultFormat(locale);
  const start = minDate ?? todayUtcYmd();
  const days = useMemo(
    () => Array.from({ length: daysAhead }, (_, i) => addDaysYmd(start, i)),
    [start, daysAhead],
  );

  return (
    <div className="drb-dtp">
      <div className="drb-dtp__strip" role="radiogroup" aria-label="Date">
        {days.map((ymd) => {
          const parts = fmt(ymd);
          const selected = ymd === selectedDate;
          return (
            <button
              key={ymd}
              type="button"
              role="radio"
              aria-checked={selected}
              className={clsx('drb-dtp__day', { 'drb-dtp__day--selected': selected })}
              onClick={() => onSelectDate(ymd)}
            >
              <span className="drb-dtp__weekday">{parts.weekday}</span>
              <span className="drb-dtp__dom digit-western" dir="ltr">
                {parts.dom}
              </span>
              <span className="drb-dtp__month">{parts.month}</span>
            </button>
          );
        })}
      </div>

      <div className="drb-dtp__slots" aria-live="polite">
        {loading ? (
          <p className="drb-dtp__status">{t('common.loading')}</p>
        ) : slots.length === 0 ? (
          <p className="drb-dtp__status drb-dtp__status--empty">{t('booking.noSlots')}</p>
        ) : (
          <ul className="drb-dtp__grid" role="radiogroup" aria-label="Time">
            {slots.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={s.id === selectedSlotId}
                  disabled={!s.available}
                  className={clsx('drb-dtp__slot', {
                    'drb-dtp__slot--selected': s.id === selectedSlotId,
                    'drb-dtp__slot--unavailable': !s.available,
                  })}
                  onClick={() => onSelectSlot(s)}
                >
                  <span className="digit-western" dir="ltr">
                    {formatTimeIso(s.startsAt, locale)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

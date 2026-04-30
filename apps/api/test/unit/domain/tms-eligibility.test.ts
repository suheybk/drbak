import { describe, expect, it } from 'vitest';
import { TmsEligibility } from '../../../src/domain/tms/TmsEligibility.js';

const blank = () => ({
  hasMetalImplantsInHead: false,
  hasCochlearImplant: false,
  hasPacemaker: false,
  hasNeurostimulator: false,
  hasMedicationPump: false,
  isPregnant: null as boolean | null,
  hasHistoryOfSeizures: false,
  hasSubstanceUseDisorder: false,
});

describe('TmsEligibility.evaluate', () => {
  it('clears a clean adult', () => {
    const r = TmsEligibility.evaluate(blank(), 35);
    expect(r.verdict).toBe('cleared');
    expect(r.hardContraindications).toHaveLength(0);
    expect(r.softFlags).toHaveLength(0);
  });

  it('denies on metal implants in head', () => {
    const r = TmsEligibility.evaluate({ ...blank(), hasMetalImplantsInHead: true }, 35);
    expect(r.verdict).toBe('denied');
    expect(r.hardContraindications).toContain('metal_implants_in_head');
  });

  it('denies on cochlear implant + pacemaker (both flagged)', () => {
    const r = TmsEligibility.evaluate(
      { ...blank(), hasCochlearImplant: true, hasPacemaker: true },
      40,
    );
    expect(r.verdict).toBe('denied');
    expect(r.hardContraindications).toEqual(
      expect.arrayContaining(['cochlear_implant', 'cardiac_pacemaker']),
    );
  });

  it('flags pregnancy as soft (requires_review, not denied)', () => {
    const r = TmsEligibility.evaluate({ ...blank(), isPregnant: true }, 28);
    expect(r.verdict).toBe('requires_review');
    expect(r.softFlags).toContain('pregnancy');
  });

  it('flags pediatric (<18) as soft regardless of other answers', () => {
    const r = TmsEligibility.evaluate(blank(), 12);
    expect(r.verdict).toBe('requires_review');
    expect(r.softFlags).toContain('pediatric_requires_review');
  });

  it('hard contraindications dominate soft flags', () => {
    const r = TmsEligibility.evaluate(
      {
        ...blank(),
        hasMetalImplantsInHead: true,
        isPregnant: true,
        hasHistoryOfSeizures: true,
      },
      30,
    );
    expect(r.verdict).toBe('denied');
  });
});

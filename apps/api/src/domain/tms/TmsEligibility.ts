/**
 * TMS pre-screening decision. Pure function — no I/O.
 *
 * Hard contraindications (always denied):
 *   - metal implants in head
 *   - cochlear implant
 *   - cardiac pacemaker
 *   - active neurostimulator (vagal/deep brain) — unless cleared by doctor in 'requires_review'
 *   - implanted medication pump
 *
 * Soft flags (require doctor review before clearing):
 *   - pregnancy
 *   - history of seizures
 *   - active substance-use disorder
 */

import type { TmsScreeningAnswers } from '@dr-bak/contracts';

export type TmsEligibilityVerdict = 'cleared' | 'requires_review' | 'denied';

export interface TmsEligibilityResult {
  readonly verdict: TmsEligibilityVerdict;
  readonly hardContraindications: ReadonlyArray<string>;
  readonly softFlags: ReadonlyArray<string>;
}

export class TmsEligibility {
  static evaluate(answers: TmsScreeningAnswers, age: number): TmsEligibilityResult {
    const hard: string[] = [];
    const soft: string[] = [];

    if (answers.hasMetalImplantsInHead) hard.push('metal_implants_in_head');
    if (answers.hasCochlearImplant) hard.push('cochlear_implant');
    if (answers.hasPacemaker) hard.push('cardiac_pacemaker');
    if (answers.hasMedicationPump) hard.push('implanted_medication_pump');

    if (answers.hasNeurostimulator) soft.push('neurostimulator_requires_review');
    if (answers.isPregnant === true) soft.push('pregnancy');
    if (answers.hasHistoryOfSeizures) soft.push('seizure_history');
    if (answers.hasSubstanceUseDisorder) soft.push('substance_use_disorder');
    if (age < 18) soft.push('pediatric_requires_review');

    if (hard.length > 0) {
      return { verdict: 'denied', hardContraindications: hard, softFlags: soft };
    }
    if (soft.length > 0) {
      return { verdict: 'requires_review', hardContraindications: [], softFlags: soft };
    }
    return { verdict: 'cleared', hardContraindications: [], softFlags: [] };
  }
}

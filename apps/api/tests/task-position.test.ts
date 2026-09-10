import { POSITION_STEP } from '@nova/shared';
import { describe, expect, it } from 'vitest';
import { computePosition, needsRenormalisation } from '../src/modules/tasks/task.position.js';

/**
 * Board ordering is the one piece of the API where two users acting at the same
 * time can produce a wrong answer, so its arithmetic is pinned down here.
 */
describe('fractional board positions', () => {
  it('places the only card in an empty column at the origin', () => {
    expect(computePosition({ before: null, after: null })).toBe(0);
  });

  it('appends below the last card', () => {
    expect(computePosition({ before: 2048, after: null })).toBe(2048 + POSITION_STEP);
  });

  it('prepends above the first card', () => {
    expect(computePosition({ before: null, after: 0 })).toBe(-POSITION_STEP);
  });

  it('lands exactly between two neighbours', () => {
    expect(computePosition({ before: 1024, after: 2048 })).toBe(1536);
  });

  it('keeps the dropped card strictly between its neighbours', () => {
    const before = 0;
    let after = POSITION_STEP;

    // Repeatedly drop into the same shrinking gap, the pathological case for any
    // fractional index scheme.
    for (let iteration = 0; iteration < 30; iteration += 1) {
      const position = computePosition({ before, after });
      expect(position).toBeGreaterThan(before);
      expect(position).toBeLessThan(after);
      after = position;
    }

    // The gap is now far below the renormalisation threshold, which is exactly the
    // situation `needsRenormalisation` exists to catch before precision runs out.
    expect(needsRenormalisation({ before, after })).toBe(true);
  });

  it('does not renormalise a healthy column', () => {
    expect(needsRenormalisation({ before: 0, after: POSITION_STEP })).toBe(false);
  });

  it('never renormalises at the edges of a column', () => {
    expect(needsRenormalisation({ before: null, after: 0 })).toBe(false);
    expect(needsRenormalisation({ before: 0, after: null })).toBe(false);
  });
});

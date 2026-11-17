import { describe, it, expect } from 'vitest';
import { noGlossariesMessage, planFromToken, planMetadata } from '../../mcp/lara-plan.js';

const token = (payload: unknown) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;

describe('planFromToken', () => {
  it('reads the plan name, features and glossary limit', () => {
    const plan = { name: 'credit_personal_plus', features: '1111101111111111111', limits: { glossaries_number: '1' } };
    expect(planFromToken(token({ subscription: { plan } }))).toEqual({
      name: 'credit_personal_plus', features: '1111101111111111111', glossaries: 1,
    });
  });

  it.each([undefined, 42, 'not-a-jwt', token({ id: 'acc_x' }), token({ subscription: { plan: 'free' } })])(
    'has no plan for %s', (value) => {
      expect(planFromToken(value)).toBeUndefined();
    });

  it('drops values that could not be plan facts, and leaves a missing limit unknown rather than 0', () => {
    const plan = { name: 'a b<script>', features: 'yes', limits: { glossaries_number: -1 } };
    expect(planFromToken(token({ subscription: { plan } }))).toEqual({});
    expect(planFromToken(token({ subscription: { plan: { name: 'free' } } }))).toEqual({ name: 'free' });
  });
});

describe('planMetadata', () => {
  it('keeps a limit of 0 and omits what is unknown', () => {
    expect(planMetadata({ name: 'free', glossaries: 0 })).toEqual({ planName: 'free', planGlossaries: 0 });
    expect(planMetadata(undefined)).toEqual({});
  });
});

describe('noGlossariesMessage', () => {
  it('names the plan when known', () => {
    expect(noGlossariesMessage({ name: 'free' })).toMatch(/plan \("free"\) does not include glossaries/);
    expect(noGlossariesMessage(undefined)).toMatch(/plan does not include glossaries/);
  });
});

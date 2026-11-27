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

  it('reads the named features of current tokens, sorted, and an empty list as no features', () => {
    const plan = (features: unknown) => token({ subscription: { plan: { features } } });
    expect(planFromToken(plan(['text_translation', 'api_access']))).toEqual({ features: 'api_access,text_translation' });
    const none = planFromToken(plan([]));
    expect(none).toEqual({ features: '' });
    expect(planMetadata(none)).toEqual({ planFeatures: '' });
  });

  it.each([[['api_access', 'Bad Name']], [['api_access', 1]], [Array(100).fill('text_translation')], [{ 0: 'api_access' }]])(
    'drops a feature list that is not all feature names: %j', (features) => {
      expect(planFromToken(token({ subscription: { plan: { features } } }))).toEqual({});
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

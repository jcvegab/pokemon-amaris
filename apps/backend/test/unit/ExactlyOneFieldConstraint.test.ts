import { type ValidationArguments } from 'class-validator';
import { ExactlyOneFieldConstraint } from '../../src/Contexts/Pokemon/infrastructure/http/dto/ExactlyOneFieldConstraint';

describe('ExactlyOneFieldConstraint', () => {
  const buildArgs = (obj: Record<string, unknown>): ValidationArguments =>
    ({
      object: obj,
      propertyName: 'oneOfCheck',
      value: undefined,
      targetName: 'CreatePokemonRequest',
      constraints: ['name', 'pokemon'],
    }) as unknown as ValidationArguments;

  it('passes when only name is present', () => {
    const c = new ExactlyOneFieldConstraint();
    expect(c.validate(undefined, buildArgs({ name: 'pikachu' }))).toBe(true);
  });

  it('passes when only pokemon is present', () => {
    const c = new ExactlyOneFieldConstraint();
    expect(c.validate(undefined, buildArgs({ pokemon: 'pikachu' }))).toBe(true);
  });

  it('fails when both are present', () => {
    const c = new ExactlyOneFieldConstraint();
    expect(c.validate(undefined, buildArgs({ name: 'pikachu', pokemon: 'pikachu' }))).toBe(false);
  });

  it('fails when both are missing', () => {
    const c = new ExactlyOneFieldConstraint();
    expect(c.validate(undefined, buildArgs({}))).toBe(false);
  });

  it('fails when both are empty strings', () => {
    const c = new ExactlyOneFieldConstraint();
    expect(c.validate(undefined, buildArgs({ name: '', pokemon: '' }))).toBe(false);
  });

  it('treats explicit null as missing', () => {
    const c = new ExactlyOneFieldConstraint();
    expect(c.validate(undefined, buildArgs({ name: null, pokemon: 'pikachu' }))).toBe(true);
  });

  it('returns a useful default message', () => {
    const c = new ExactlyOneFieldConstraint();
    expect(c.defaultMessage(buildArgs({}))).toContain('name');
    expect(c.defaultMessage(buildArgs({}))).toContain('pokemon');
  });
});

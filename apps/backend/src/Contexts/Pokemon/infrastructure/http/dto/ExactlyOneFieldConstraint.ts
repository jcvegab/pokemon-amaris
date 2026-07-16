import type { ValidationArguments } from 'class-validator';
import { ValidatorConstraint, type ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'ExactlyOneField', async: false })
export class ExactlyOneFieldConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const [a, b] = args.constraints as [string, string];
    const obj = args.object as Record<string, unknown>;
    const hasA = obj[a] !== undefined && obj[a] !== null && obj[a] !== '';
    const hasB = obj[b] !== undefined && obj[b] !== null && obj[b] !== '';
    return hasA !== hasB;
  }

  defaultMessage(args: ValidationArguments): string {
    const [a, b] = args.constraints as [string, string];
    return `Exactly one of "${a}" or "${b}" must be provided.`;
  }
}

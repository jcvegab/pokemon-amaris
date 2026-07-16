import { Validate } from 'class-validator';
import { ExactlyOneFieldConstraint } from './ExactlyOneFieldConstraint';
import { PokemonNameField } from './PokemonNameField';

export class CreatePokemonRequest {
  @PokemonNameField('name')
  name?: string;

  @PokemonNameField('pokemon')
  pokemon?: string;

  @Validate(ExactlyOneFieldConstraint, ['name', 'pokemon'])
  readonly _oneOf?: never;
}

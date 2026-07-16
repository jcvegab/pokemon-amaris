import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export const POKEMON_NAME_PATTERN = /^[a-z0-9-]+$/;
export const POKEMON_NAME_MAX_LENGTH = 50;

export function PokemonNameField(field: 'name' | 'pokemon'): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ example: 'pikachu', required: false }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsOptional(),
    IsString(),
    Length(1, POKEMON_NAME_MAX_LENGTH),
    Matches(POKEMON_NAME_PATTERN, {
      message: `${field} must match ^[a-z0-9-]+$`,
    }),
  );
}

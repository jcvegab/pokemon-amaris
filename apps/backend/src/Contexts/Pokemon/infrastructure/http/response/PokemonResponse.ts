import { ApiProperty } from '@nestjs/swagger';

export class PokemonResponse {
  @ApiProperty({ example: 25, description: 'PokeAPI id' })
  id!: number;

  @ApiProperty({ example: 'pikachu', description: 'Normalized pokemon name' })
  name!: string;

  @ApiProperty({ example: 4, description: 'Height in decimetres' })
  height!: number;

  @ApiProperty({ example: 60, description: 'Weight in hectograms' })
  weight!: number;

  @ApiProperty({ example: ['electric'], type: [String] })
  types!: string[];

  @ApiProperty({ example: '2026-07-16T12:00:00.000Z' })
  createdAt!: string;
}

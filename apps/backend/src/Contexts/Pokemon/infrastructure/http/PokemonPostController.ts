import { Body, Controller, HttpCode, HttpStatus, Inject, Logger, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { POKEMON_CREATOR } from '../dependency-injection/PokemonTokens';
import { type CreatePokemonResult, PokemonCreator } from '../../application/create/PokemonCreator';
import { CreatePokemonRequest } from './dto/CreatePokemonRequest';
import { PokemonResponse } from './response/PokemonResponse';
import { pokemonToResponse } from './PokemonResponseMapper';

@ApiTags('pokemon')
@Controller('pokemon')
export class PokemonPostController {
  private readonly logger = new Logger(PokemonPostController.name);

  constructor(@Inject(POKEMON_CREATOR) private readonly creator: PokemonCreator) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or fetch a Pokemon by name' })
  @ApiCreatedResponse({
    description: 'Pokemon was created and persisted',
    type: PokemonResponse,
  })
  @ApiOkResponse({
    description: 'Pokemon already existed; persisted record returned',
    type: PokemonResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Database unavailable' })
  async create(
    @Body() body: CreatePokemonRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PokemonResponse> {
    const rawName = this.extractName(body);
    const result = await this.creator.execute({ rawName });
    this.logOutcome(result);
    res.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return pokemonToResponse(result);
  }

  private extractName(body: CreatePokemonRequest): string {
    if (typeof body.name === 'string' && body.name.length > 0) {
      return body.name;
    }
    if (typeof body.pokemon === 'string' && body.pokemon.length > 0) {
      return body.pokemon;
    }
    return '';
  }

  private logOutcome(result: CreatePokemonResult): void {
    this.logger.log({
      msg: 'pokemon.create',
      pokemonName: result.pokemon.name.value,
      outcome: result.created ? 'created' : 'existed',
    });
  }
}

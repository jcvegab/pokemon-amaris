import { PokemonBadge } from '../theme/PokemonBadge';
import type { PokemonViewModel } from '../presenters/PokemonPresenter';

export interface PokemonResultProps {
  pokemon: PokemonViewModel;
}

export function PokemonResult({ pokemon }: PokemonResultProps) {
  return (
    <article
      data-testid="pokemon-result"
      data-pokemon-id={pokemon.id}
      data-pokemon-name={pokemon.name}
      className="rounded-2xl border-4 border-slate-900 bg-white p-5 shadow-md dark:bg-slate-800 dark:border-slate-700"
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-2xl font-extrabold capitalize text-slate-900 dark:text-slate-100">
          {pokemon.displayName}
        </h2>
        <span
          className="font-mono text-sm text-slate-600 dark:text-slate-300"
          data-testid="pokedex-number"
        >
          {pokemon.pokedexNumber}
        </span>
      </header>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="font-semibold text-slate-600 dark:text-slate-400">Altura</dt>
          <dd data-testid="pokemon-height" className="text-slate-900 dark:text-slate-100">
            {pokemon.height}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-600 dark:text-slate-400">Peso</dt>
          <dd data-testid="pokemon-weight" className="text-slate-900 dark:text-slate-100">
            {pokemon.weight}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold text-slate-600 dark:text-slate-400">Tipos</dt>
          <dd className="mt-1 flex flex-wrap gap-2" data-testid="pokemon-types">
            {pokemon.types.map((type) => (
              <PokemonBadge key={type} type={type} />
            ))}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold text-slate-600 dark:text-slate-400">Guardado</dt>
          <dd data-testid="pokemon-created-at" className="text-slate-900 dark:text-slate-100">
            {pokemon.createdAtDisplay}
          </dd>
        </div>
      </dl>
    </article>
  );
}

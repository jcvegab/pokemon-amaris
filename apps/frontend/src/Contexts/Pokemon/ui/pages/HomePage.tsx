import { useEffect, useState } from 'react';
import type { PokemonCreator } from '../../application/create/PokemonCreator';
import { PokemonForm } from '../components/PokemonForm';
import { PokemonResult } from '../components/PokemonResult';
import { StatusBanner } from '../components/StatusBanner';
import { Pokeball } from '../theme/Pokeball';
import { useCreatePokemon } from '../hooks/useCreatePokemon';
import { toPokemonViewModel } from '../presenters/PokemonPresenter';

export interface HomePageProps {
  creator: PokemonCreator;
}

export function HomePage({ creator }: HomePageProps) {
  const { state, input, setInput, submit, reset } = useCreatePokemon(creator);
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === 'success') {
      setInputError(null);
    }
  }, [state.status]);

  const handleSubmit = async () => {
    const name = input.trim();
    if (name.length === 0) {
      setInputError('Ingresa un nombre para continuar.');
      return;
    }
    setInputError(null);
    await submit();
  };

  const handleReset = () => {
    setInputError(null);
    reset();
  };

  const errorMessage = state.status === 'error' ? state.message : '';
  const successData = state.status === 'success' ? toPokemonViewModel(state.pokemon) : null;

  return (
    <main
      className="min-h-full w-full bg-gradient-to-b from-red-50 via-yellow-50 to-slate-100 px-4 py-10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950"
      data-testid="home-page"
    >
      <section
        aria-labelledby="app-title"
        className="pokedex-card"
        style={{ boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.4)' }}
      >
        <div className="pokedex-header">
          <span className="pokedex-led" aria-hidden="true" />
          <h1
            id="app-title"
            className="text-2xl font-extrabold tracking-wide"
            style={{ fontFamily: '"Bangers", system-ui, sans-serif', letterSpacing: '0.05em' }}
          >
            Pokédex Amaris
          </h1>
          <span className="ml-auto" aria-hidden="true">
            <Pokeball size={32} aria-hidden="true" />
          </span>
        </div>

        <div className="space-y-4 p-6">
          <PokemonForm
            onSubmit={handleSubmit}
            loading={state.status === 'loading'}
            value={input}
            onChange={setInput}
          />

          {inputError ? (
            <p
              role="alert"
              data-testid="input-error"
              className="rounded-lg border-2 border-slate-900 bg-red-100 px-3 py-2 text-sm font-medium text-red-900"
            >
              {inputError}
            </p>
          ) : null}

          <StatusBanner
            status={state.status}
            {...(state.status === 'error' ? { message: errorMessage } : {})}
            {...(state.status === 'success' && successData
              ? { message: `Pokémon guardado: ${successData.name}` }
              : {})}
          />

          {state.status === 'success' && successData ? (
            <PokemonResult pokemon={successData} />
          ) : null}

          {state.status === 'success' || state.status === 'error' ? (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-semibold text-slate-600 underline-offset-2 hover:underline focus-visible:underline focus:outline-none dark:text-slate-300"
              data-testid="reset-button"
            >
              Limpiar y buscar otro
            </button>
          ) : null}
        </div>
      </section>

      <footer className="mx-auto mt-6 max-w-md text-center text-xs text-slate-600 dark:text-slate-400">
        <a
          href="https://github.com/jcvegab/pokemon-amaris"
          target="_blank"
          rel="noreferrer"
          className="hover:underline focus-visible:underline focus:outline-none"
        >
          Repositorio privado
        </a>
      </footer>
    </main>
  );
}

import { useId, useState, type FormEvent } from 'react';
import { Pokeball } from '../theme/Pokeball';
import { TOKENS } from '../theme/tokens';

export interface PokemonFormProps {
  onSubmit: (name: string) => void;
  loading: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export function PokemonForm({
  onSubmit,
  loading,
  disabled = false,
  value,
  onChange,
}: PokemonFormProps) {
  const inputId = useId();
  const [internal, setInternal] = useState('');
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const setCurrent = (next: string) => {
    if (isControlled) {
      onChange?.(next);
    } else {
      setInternal(next);
    }
  };

  const isDisabled = disabled || loading;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    onSubmit(current);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <label
        id={`${inputId}-label`}
        htmlFor={inputId}
        className="text-sm font-semibold text-slate-800 dark:text-slate-200"
      >
        Nombre del Pokémon
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          name="pokemonName"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={TOKENS.formMaxLength}
          required
          disabled={isDisabled}
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          placeholder="pikachu"
          aria-required="true"
          aria-busy={loading}
          className="field flex-1"
          data-testid="pokemon-input"
        />
        <button
          type="submit"
          disabled={isDisabled}
          aria-busy={loading}
          className="btn-primary"
          data-testid="pokemon-submit"
        >
          {loading ? (
            <>
              <Pokeball size={20} spinning aria-hidden="true" />
              <span>Buscando…</span>
            </>
          ) : (
            <span>Buscar y guardar</span>
          )}
        </button>
      </div>
    </form>
  );
}

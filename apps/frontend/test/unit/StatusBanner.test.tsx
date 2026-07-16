import { describe, expect, it } from 'vitest';
import { StatusBanner } from '../../src/Contexts/Pokemon/ui/components/StatusBanner';
import { render, screen } from '@testing-library/react';

describe('StatusBanner', () => {
  it('renders nothing when idle', () => {
    const { container } = render(<StatusBanner status="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the default loading message', () => {
    render(<StatusBanner status="loading" />);
    expect(screen.getByTestId('status-banner')).toHaveTextContent('Consultando');
  });

  it('renders the success message when provided', () => {
    render(<StatusBanner status="success" message="Pokémon guardado: pikachu" />);
    expect(screen.getByTestId('status-banner')).toHaveTextContent('pikachu');
  });

  it('renders the error message when provided', () => {
    render(<StatusBanner status="error" message="Algo salió mal" />);
    expect(screen.getByTestId('status-banner')).toHaveTextContent('Algo salió mal');
  });

  it('exposes the status as data attribute', () => {
    render(<StatusBanner status="success" message="ok" />);
    expect(screen.getByTestId('status-banner')).toHaveAttribute('data-status', 'success');
  });
});

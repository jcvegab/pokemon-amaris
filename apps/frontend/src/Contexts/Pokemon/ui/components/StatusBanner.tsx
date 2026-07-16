export type StatusBannerStatus = 'idle' | 'loading' | 'success' | 'error';

export interface StatusBannerProps {
  status: StatusBannerStatus;
  message?: string;
}

const DEFAULT_MESSAGE: Record<StatusBannerStatus, string> = {
  idle: '',
  loading: 'Consultando la Pokédex…',
  success: 'Pokémon guardado.',
  error: 'Algo salió mal.',
};

const CLASSES_BY_STATUS: Record<StatusBannerStatus, string> = {
  idle: 'hidden',
  loading:
    'flex items-center gap-3 rounded-lg border-2 border-slate-900 bg-yellow-100 px-4 py-3 text-slate-900',
  success:
    'flex items-center gap-3 rounded-lg border-2 border-slate-900 bg-emerald-100 px-4 py-3 text-emerald-900',
  error:
    'flex items-center gap-3 rounded-lg border-2 border-slate-900 bg-red-100 px-4 py-3 text-red-900',
};

export function StatusBanner({ status, message }: StatusBannerProps) {
  if (status === 'idle') return null;
  const text = message && message.length > 0 ? message : DEFAULT_MESSAGE[status];
  const className = CLASSES_BY_STATUS[status];
  const role = status === 'error' ? 'alert' : 'status';
  return (
    <div
      role={role}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-testid="status-banner"
      data-status={status}
      className={className}
    >
      <span className="inline-block w-2 h-2 rounded-full bg-current" aria-hidden="true" />
      <span className="font-medium">{text}</span>
    </div>
  );
}

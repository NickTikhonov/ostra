'use client';
export function Switch({
  label,
  ariaLabel,
  value,
  onChange,
  className = '',
}: {
  label: string;
  ariaLabel?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <button
      className={`${className} ${value ? 'on' : ''}`}
      aria-label={ariaLabel ?? label}
      aria-pressed={value}
      onClick={() => onChange(!value)}
    >
      <i />
      {label}
    </button>
  );
}

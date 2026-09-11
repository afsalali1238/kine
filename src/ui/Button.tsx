'use client';

import type { ReactNode } from 'react';

type Variant = 'primary' | 'default' | 'quiet' | 'danger';

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  block?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  type?: 'button' | 'submit';
  ariaLabel?: string;
  testid?: string;
};

const CLASS: Record<Variant, string> = {
  primary: 'btn btn-primary',
  default: 'btn',
  quiet: 'btn btn-quiet',
  danger: 'btn btn-danger',
};

export function Button({
  children,
  onClick,
  variant = 'default',
  block,
  disabled,
  icon,
  type = 'button',
  ariaLabel,
  testid,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      data-testid={testid}
      className={`${CLASS[variant]} ${block ? 'btn-block' : ''}`}
    >
      {icon}
      {children}
    </button>
  );
}

import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BannerProps = {
  variant: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  className?: string;
};

export const Banner = ({ variant, title, children, className }: BannerProps) => (
  <div role={variant === 'danger' ? 'alert' : 'status'} className={clsx('drb-banner', `drb-banner--${variant}`, className)}>
    {title ? <p className="drb-banner__title">{title}</p> : null}
    <div className="drb-banner__body">{children}</div>
  </div>
);

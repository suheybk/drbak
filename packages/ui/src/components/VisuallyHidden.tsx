import type { ReactNode } from 'react';

export const VisuallyHidden = ({ children }: { children: ReactNode }) => (
  <span className="drb-vh">{children}</span>
);

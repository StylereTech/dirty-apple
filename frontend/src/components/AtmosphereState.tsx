import type { ReactNode } from 'react';
import PageAtmosphere from './PageAtmosphere';

export default function AtmosphereState({ children }: { children: ReactNode }) {
  return (
    <div className="editorial-state-page min-h-screen pt-20">
      <div className="editorial-state-art"><PageAtmosphere variant="checkout" /></div>
      <div className="editorial-state-content expressive-commerce">
        <div className="editorial-state-mark" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

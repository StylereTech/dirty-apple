type PageAtmosphereProps = { image?: string; variant?: 'shop' | 'collection' | 'story' | 'checkout' };

// Decorative artwork supplements the original editorial and product photography.
export default function PageAtmosphere({ variant = 'shop' }: PageAtmosphereProps) {
  const artwork = variant === 'shop' ? 'monochrome-couture-v1.png' : 'monochrome-atelier-v1.png';
  return <div className={`page-atmosphere atmosphere-${variant}`} aria-hidden="true">
    <img className="atmosphere-artwork" src={`/artwork/${artwork}`} alt="" width={2172} height={724} loading="eager" />
  </div>;
}

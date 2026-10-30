type PageAtmosphereProps = { image?: string; variant?: 'shop' | 'collection' | 'story' | 'checkout' };
export default function PageAtmosphere({ image = '/cat-accessories.jpg', variant = 'shop' }: PageAtmosphereProps) {
  return <div className={`page-atmosphere atmosphere-${variant}`} aria-hidden="true">
    <div className="atmosphere-grid" />
    <div className="atmosphere-glow" />
    <div className="atmosphere-orbit orbit-back" />
    <div className="atmosphere-photo"><img src={image} alt="" loading="eager" /></div>
    <div className="atmosphere-orbit orbit-front" />
    <svg className="atmosphere-spark" viewBox="0 0 100 100" fill="none"><path d="M50 0v100M0 50h100M15 15l70 70M15 85l70-70" stroke="currentColor" strokeWidth="1.2" /><circle cx="50" cy="50" r="29" stroke="currentColor" strokeWidth=".6" /></svg>
    <div className="atmosphere-point" />
  </div>;
}

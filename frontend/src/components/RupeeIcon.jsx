// Pakistani rupee mark — drop-in replacement for lucide's DollarSign.
// Deliberately drawn as the letters "Rs", not the Indian ₹ glyph.
// Sized and weighted to sit next to lucide's stroke-2 line icons.
const RupeeIcon = ({ size = 20, color = 'currentColor', className = '', style = {} }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    role="img" aria-label="Rupees"
    className={className} style={style}
  >
    <text
      x="12" y="12.5"
      textAnchor="middle" dominantBaseline="central"
      fill={color}
      fontSize="15" fontWeight="700"
      fontFamily="'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"
      letterSpacing="-0.5"
    >
      Rs
    </text>
  </svg>
);

export default RupeeIcon;

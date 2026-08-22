// Rupee symbol icon — drop-in replacement for lucide DollarSign in Pakistani context
const RupeeIcon = ({ size = 20, color = 'currentColor', className = '', style = {} }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style}
  >
    <line x1="6" y1="6" x2="18" y2="6" />
    <line x1="6" y1="11" x2="18" y2="11" />
    <path d="M6 11 L14 22" />
    <path d="M6 6 C6 6 18 6 18 9 C18 12 6 12 6 12" />
  </svg>
);

export default RupeeIcon;

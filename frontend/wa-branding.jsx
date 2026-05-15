/* Wedding Access · Branding (decorative elements) */

function WeddingMonogram({ coupleName = 'M & J', size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="none" stroke="var(--wa-gold)" strokeWidth=".8" strokeDasharray="2,4" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--wa-gold)" strokeWidth=".4" />
      <text
        x="60" y="67"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontSize="28"
        fontWeight="300"
        fill="var(--wa-gold)"
        letterSpacing="6"
      >
        {coupleName}
      </text>
    </svg>
  );
}

function FloralDivider() {
  return (
    <div style={{ textAlign:'center', color:'var(--wa-gold-light)', fontSize:'18px', letterSpacing:'8px', margin:'1rem 0' }}>
      ✦ ❧ ✦
    </div>
  );
}

/* Wedding Access · Branding (decorative elements) */

function WeddingMonogram({ logoUrl, size = 80 }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Monogramme"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto',
        }}
      />
    );
  }

  /* Default SVG monogram */
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="none" stroke="var(--wa-gold)" strokeWidth=".8" strokeDasharray="2,4" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--wa-gold)" strokeWidth=".4" />
      <text
        x="50" y="57"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontSize="22"
        fontWeight="300"
        fill="var(--wa-gold)"
        letterSpacing="4"
      >
        M &amp; J
      </text>
    </svg>
  );
}

function FloralDivider() {
  return (
    <div className="wa-floral">✦ ❧ ✦</div>
  );
}

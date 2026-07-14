export function MeasurementFigure() {
  return (
    <svg
      viewBox="0 0 440 620"
      className="absolute inset-0 size-full p-6 text-[#c99c57]"
      fill="none"
      role="img"
      aria-labelledby="measurement-figure-title measurement-figure-description"
    >
      <title id="measurement-figure-title">Body measurement placement guide</title>
      <desc id="measurement-figure-description">
        Front-facing body outline labelled at the neck, shoulder, chest, waist, hips, sleeve, inseam and outseam.
      </desc>
      <g stroke="currentColor" strokeWidth="1.5" opacity=".82">
        <ellipse cx="220" cy="65" rx="34" ry="43" />
        <path d="M196 107c-4 17-12 28-31 35-31 11-51 32-58 67l-20 104 35 8 25-88 4 124-18 193h55l32-168 32 168h55l-18-193 4-124 25 88 35-8-20-104c-7-35-27-56-58-67-19-7-27-18-31-35" />
        <path d="M195 108c5 12 15 19 25 19s20-7 25-19M151 183c39 14 99 14 138 0M150 263c42 12 98 12 140 0M151 325c40 16 98 16 138 0" />
        <path d="M220 127v255M190 550l30-168 30 168" strokeDasharray="4 5" opacity=".5" />
      </g>

      <g stroke="currentColor" strokeWidth="1" opacity=".7">
        <path d="M196 112H65" />
        <path d="M164 142H38" />
        <path d="M151 184H64" />
        <path d="M151 263H45" />
        <path d="M151 325H70" />
        <path d="M122 321 80 420H35" />
        <path d="M220 384v142h-67" />
        <path d="M289 357h105" />
      </g>

      <g fill="currentColor" fontFamily="ui-sans-serif, system-ui" fontSize="10" letterSpacing="1.7">
        <text x="18" y="116">NECK</text>
        <text x="12" y="146">SHOULDER</text>
        <text x="18" y="188">CHEST</text>
        <text x="12" y="267">WAIST</text>
        <text x="22" y="329">HIPS</text>
        <text x="8" y="424">SLEEVE</text>
        <text x="95" y="530">INSEAM</text>
        <text x="331" y="361">OUTSEAM</text>
      </g>
    </svg>
  );
}


export function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Hexagonal grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
            <path
              d="M28 0 L56 16.6 L56 50 L28 66.6 L0 50 L0 16.6 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)" className="text-foreground" />
      </svg>

      {/* ECG line */}
      <div className="absolute top-0 left-0 w-full h-[120px] overflow-hidden">
        <svg className="ecg-line opacity-[0.12]" width="200%" height="120" viewBox="0 0 2000 120" preserveAspectRatio="none">
          <polyline
            points="0,60 100,60 120,60 140,30 160,90 180,20 200,80 220,50 240,60 400,60 420,60 440,30 460,90 480,20 500,80 520,50 540,60 700,60 720,60 740,30 760,90 780,20 800,80 820,50 840,60 1000,60 1020,60 1040,30 1060,90 1080,20 1100,80 1120,50 1140,60 1300,60 1320,60 1340,30 1360,90 1380,20 1400,80 1420,50 1440,60 1600,60 1620,60 1640,30 1660,90 1680,20 1700,80 1720,50 1740,60 2000,60"
            fill="none"
            stroke="hsl(243 76% 59%)"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}

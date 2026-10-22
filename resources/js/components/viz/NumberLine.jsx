import VizBase from './VizBase';

/**
 * NumberLine - Number line with points and ranges
 * Schema:
 * {
 *   type: "number_line",
 *   title: "Garis Bilangan",
 *   range: [-5, 5],
 *   points: [
 *     { value: 0, label: "0", filled: true },
 *     { value: 3, label: "3", filled: false }
 *   ],
 *   ranges: [
 *     { start: -2, end: 2, color: "#3b82f6" }
 *   ]
 * }
 */
export default function NumberLine({ data }) {
  const {
    title,
    caption,
    alt,
    range = [-10, 10],
    points = [],
    ranges = []
  } = data;

  const width = 400;
  const height = 120;
  const padding = 40;
  const lineY = height / 2;

  const scale = (width - 2 * padding) / (range[1] - range[0]);
  const toX = (value) => padding + (value - range[0]) * scale;

  // Generate tick marks
  const ticks = [];
  const step = Math.ceil((range[1] - range[0]) / 10);
  for (let i = range[0]; i <= range[1]; i += step) {
    ticks.push(i);
  }

  return (
    <VizBase title={title} caption={caption} alt={alt}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="viz-svg"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Main line */}
        <line
          x1={padding}
          y1={lineY}
          x2={width - padding}
          y2={lineY}
          stroke="var(--text, #1f2937)"
          strokeWidth="2"
        />
        
        {/* Arrows */}
        <polygon
          points={`${width - padding},${lineY} ${width - padding - 10},${lineY - 5} ${width - padding - 10},${lineY + 5}`}
          fill="var(--text, #1f2937)"
        />
        
        {/* Ranges (shaded regions) */}
        {ranges.slice(0, 3).map((r, idx) => (
          <rect
            key={idx}
            x={toX(r.start)}
            y={lineY - 5}
            width={toX(r.end) - toX(r.start)}
            height={10}
            fill={r.color || '#3b82f6'}
            opacity="0.3"
          />
        ))}
        
        {/* Tick marks */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={toX(tick)}
              y1={lineY - 8}
              x2={toX(tick)}
              y2={lineY + 8}
              stroke="var(--text, #1f2937)"
              strokeWidth="1.5"
            />
            <text
              x={toX(tick)}
              y={lineY + 25}
              fontSize="12"
              fill="var(--text, #1f2937)"
              textAnchor="middle"
            >
              {tick}
            </text>
          </g>
        ))}
        
        {/* Points */}
        {points.slice(0, 10).map((point, idx) => (
          <g key={idx}>
            <circle
              cx={toX(point.value)}
              cy={lineY}
              r="6"
              fill={point.filled ? '#dc2626' : 'white'}
              stroke="#dc2626"
              strokeWidth="2"
            />
            {point.label && (
              <text
                x={toX(point.value)}
                y={lineY - 15}
                fontSize="11"
                fill="#dc2626"
                textAnchor="middle"
                fontWeight="600"
              >
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </VizBase>
  );
}

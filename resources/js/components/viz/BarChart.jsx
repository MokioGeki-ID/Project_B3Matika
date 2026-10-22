import VizBase from './VizBase';

/**
 * BarChart - Simple bar chart
 * Schema:
 * {
 *   type: "bar_chart",
 *   title: "Nilai Ulangan",
 *   data: [
 *     { label: "A", value: 10 },
 *     { label: "B", value: 15 },
 *     { label: "C", value: 8 }
 *   ],
 *   yLabel: "Jumlah Siswa"
 * }
 */
export default function BarChart({ data }) {
  const {
    title,
    caption,
    alt,
    data: chartData = [],
    yLabel = ''
  } = data;

  // Limit to 12 bars
  const bars = chartData.slice(0, 12);
  
  const width = 400;
  const height = 300;
  const padding = { top: 40, right: 20, bottom: 60, left: 60 };

  const maxValue = Math.max(...bars.map(d => d.value), 1);
  const barWidth = (width - padding.left - padding.right) / bars.length;

  const yScale = (height - padding.top - padding.bottom) / maxValue;
  const xPos = (index) => padding.left + index * barWidth + barWidth / 2;
  const barHeight = (value) => value * yScale;

  return (
    <VizBase title={title} caption={caption} alt={alt}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="viz-svg"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="var(--text, #1f2937)"
          strokeWidth="2"
        />
        
        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="var(--text, #1f2937)"
          strokeWidth="2"
        />
        
        {/* Y-axis label */}
        {yLabel && (
          <text
            x={padding.left - 40}
            y={padding.top}
            fontSize="12"
            fill="var(--text, #1f2937)"
            textAnchor="middle"
            transform={`rotate(-90, ${padding.left - 40}, ${padding.top + 50})`}
          >
            {yLabel}
          </text>
        )}
        
        {/* Bars */}
        {bars.map((item, idx) => {
          const x = xPos(idx) - barWidth * 0.35;
          const h = barHeight(item.value);
          const y = height - padding.bottom - h;
          
          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={barWidth * 0.7}
                height={h}
                fill="var(--blue, #3b82f6)"
                opacity="0.8"
              />
              
              {/* Value on top */}
              <text
                x={xPos(idx)}
                y={y - 5}
                fontSize="11"
                fill="var(--text, #1f2937)"
                textAnchor="middle"
              >
                {item.value}
              </text>
              
              {/* Label below */}
              <text
                x={xPos(idx)}
                y={height - padding.bottom + 20}
                fontSize="12"
                fill="var(--text, #1f2937)"
                textAnchor="middle"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </VizBase>
  );
}

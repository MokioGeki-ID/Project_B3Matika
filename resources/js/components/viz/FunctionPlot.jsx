import { useMemo } from 'react';
import { evaluate, generatePoints, isValidExpression } from '@/utils/mathEvaluator';
import VizBase from './VizBase';

/**
 * FunctionPlot - Plot mathematical functions y = f(x)
 * Schema:
 * {
 *   type: "function_plot",
 *   title: "Grafik y = x²",
 *   caption: "Fungsi kuadrat dengan titik puncak (0,0)",
 *   alt: "Parabola terbuka ke atas",
 *   xRange: [-5, 5],
 *   yRange: [-1, 10],
 *   functions: [
 *     { expr: "x^2", color: "#3b82f6", label: "y = x²" }
 *   ],
 *   points: [
 *     { x: 0, y: 0, label: "(0, 0)" }
 *   ]
 * }
 */
export default function FunctionPlot({ data }) {
  const {
    title,
    caption,
    alt,
    xRange = [-10, 10],
    yRange = [-10, 10],
    functions = [],
    points = []
  } = data;

  // Validate and generate plot data
  const plotData = useMemo(() => {
    const validFunctions = functions
      .filter(f => f.expr && isValidExpression(f.expr))
      .slice(0, 3); // Max 3 functions

    return validFunctions.map(f => ({
      ...f,
      points: generatePoints(f.expr, xRange[0], xRange[1], 200)
    }));
  }, [functions, xRange]);

  // Calculate SVG dimensions and scaling
  const width = 400;
  const height = 300;
  const padding = 40;
  
  const xScale = (width - 2 * padding) / (xRange[1] - xRange[0]);
  const yScale = (height - 2 * padding) / (yRange[1] - yRange[0]);

  const toSvgX = (x) => padding + (x - xRange[0]) * xScale;
  const toSvgY = (y) => height - padding - (y - yRange[0]) * yScale;

  // Generate path for function
  const generatePath = (points) => {
    if (points.length === 0) return '';
    
    let path = `M ${toSvgX(points[0].x)} ${toSvgY(points[0].y)}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${toSvgX(points[i].x)} ${toSvgY(points[i].y)}`;
    }
    return path;
  };

  // Generate grid lines
  const gridLines = () => {
    const lines = [];
    
    // Vertical grid (x-axis)
    const xStep = Math.ceil((xRange[1] - xRange[0]) / 10);
    for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x += xStep) {
      lines.push(
        <line
          key={`vgrid-${x}`}
          x1={toSvgX(x)}
          y1={padding}
          x2={toSvgX(x)}
          y2={height - padding}
          stroke="var(--line, #e5e7eb)"
          strokeWidth="1"
          opacity="0.5"
        />
      );
    }
    
    // Horizontal grid (y-axis)
    const yStep = Math.ceil((yRange[1] - yRange[0]) / 10);
    for (let y = Math.ceil(yRange[0]); y <= yRange[1]; y += yStep) {
      lines.push(
        <line
          key={`hgrid-${y}`}
          x1={padding}
          y1={toSvgY(y)}
          x2={width - padding}
          y2={toSvgY(y)}
          stroke="var(--line, #e5e7eb)"
          strokeWidth="1"
          opacity="0.5"
        />
      );
    }
    
    return lines;
  };

  return (
    <VizBase title={title} caption={caption} alt={alt}>
      <svg 
        viewBox={`0 0 ${width} ${height}`}
        className="viz-svg"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Grid */}
        {gridLines()}
        
        {/* Axes */}
        <line
          x1={toSvgX(0)}
          y1={padding}
          x2={toSvgX(0)}
          y2={height - padding}
          stroke="var(--text, #1f2937)"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={toSvgY(0)}
          x2={width - padding}
          y2={toSvgY(0)}
          stroke="var(--text, #1f2937)"
          strokeWidth="2"
        />
        
        {/* Axis labels */}
        <text
          x={width - padding + 10}
          y={toSvgY(0)}
          fontSize="12"
          fill="var(--text, #1f2937)"
        >
          x
        </text>
        <text
          x={toSvgX(0) + 5}
          y={padding - 5}
          fontSize="12"
          fill="var(--text, #1f2937)"
        >
          y
        </text>
        
        {/* Function curves */}
        {plotData.map((func, idx) => (
          <g key={idx}>
            <path
              d={generatePath(func.points)}
              stroke={func.color || '#3b82f6'}
              strokeWidth="2"
              fill="none"
            />
            {func.label && (
              <text
                x={width - padding - 10}
                y={padding + 15 + idx * 20}
                fontSize="11"
                fill={func.color || '#3b82f6'}
                textAnchor="end"
              >
                {func.label}
              </text>
            )}
          </g>
        ))}
        
        {/* Marked points */}
        {points.slice(0, 5).map((point, idx) => ( // Max 5 points
          <g key={idx}>
            <circle
              cx={toSvgX(point.x)}
              cy={toSvgY(point.y)}
              r="4"
              fill="#dc2626"
            />
            {point.label && (
              <text
                x={toSvgX(point.x) + 8}
                y={toSvgY(point.y) - 8}
                fontSize="11"
                fill="var(--text, #1f2937)"
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

import VizBase from './VizBase';

/**
 * Geometry - Draw geometric shapes (2D and simple 3D projections)
 * Schema:
 * {
 *   type: "geometry",
 *   shape: "triangle|rectangle|circle|trapezoid|...",
 *   title: "Segitiga Siku-siku ABC",
 *   labels: { A: [0, 3], B: [0, 0], C: [4, 0] },
 *   sides: { AB: "3 cm", BC: "4 cm", AC: "5 cm" },
 *   angles: { B: "90°" },
 *   isScaled: false
 * }
 */
export default function Geometry({ data }) {
  const {
    title,
    caption,
    alt,
    shape = 'triangle',
    labels = {},
    sides = {},
    angles = {},
    isScaled = false
  } = data;

  const width = 400;
  const height = 300;
  const padding = 40;

  // Helper: find bounding box of points
  const getBounds = (points) => {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  };

  // Helper: scale and center points to fit SVG
  const scalePoints = (points) => {
    const bounds = getBounds(points);
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    
    const scaleX = (width - 2 * padding) / rangeX;
    const scaleY = (height - 2 * padding) / rangeY;
    const scale = Math.min(scaleX, scaleY);
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    return points.map(([x, y]) => [
      width / 2 + (x - centerX) * scale,
      height / 2 - (y - centerY) * scale // Flip Y for SVG coordinates
    ]);
  };

  // Get coordinates from labels
  const labelPoints = Object.entries(labels);
  const coords = labelPoints.map(([_, point]) => point);
  const scaledCoords = scalePoints(coords);
  
  // Map label names to scaled coordinates
  const pointMap = {};
  labelPoints.forEach(([name, _], idx) => {
    pointMap[name] = scaledCoords[idx];
  });

  // Generate polygon path
  const polygonPath = scaledCoords.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`
  ).join(' ') + ' Z';

  // Calculate midpoint for side labels
  const getMidpoint = (p1, p2) => [
    (p1[0] + p2[0]) / 2,
    (p1[1] + p2[1]) / 2
  ];

  // Draw right angle marker
  const drawRightAngle = (vertex, p1, p2, size = 15) => {
    const v1 = [p1[0] - vertex[0], p1[1] - vertex[1]];
    const v2 = [p2[0] - vertex[0], p2[1] - vertex[1]];
    
    const len1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
    const len2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
    
    const u1 = [v1[0] / len1 * size, v1[1] / len1 * size];
    const u2 = [v2[0] / len2 * size, v2[1] / len2 * size];
    
    const corner1 = [vertex[0] + u1[0], vertex[1] + u1[1]];
    const corner2 = [vertex[0] + u1[0] + u2[0], vertex[1] + u1[1] + u2[1]];
    const corner3 = [vertex[0] + u2[0], vertex[1] + u2[1]];
    
    return `M ${corner1[0]} ${corner1[1]} L ${corner2[0]} ${corner2[1]} L ${corner3[0]} ${corner3[1]}`;
  };

  return (
    <VizBase 
      title={title} 
      caption={caption || (isScaled ? '' : '(Gambar tidak berskala)')} 
      alt={alt}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="viz-svg"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Shape */}
        <path
          d={polygonPath}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="var(--blue, #3b82f6)"
          strokeWidth="2"
        />
        
        {/* Vertices */}
        {Object.entries(pointMap).map(([name, [x, y]]) => (
          <g key={name}>
            <circle cx={x} cy={y} r="3" fill="var(--navy, #1e3a8a)" />
            <text
              x={x}
              y={y - 10}
              fontSize="14"
              fontWeight="600"
              fill="var(--navy, #1e3a8a)"
              textAnchor="middle"
            >
              {name}
            </text>
          </g>
        ))}
        
        {/* Side labels */}
        {Object.entries(sides).map(([sideName, label]) => {
          // Parse side name like "AB" to get two points
          if (sideName.length !== 2) return null;
          const [p1Name, p2Name] = sideName.split('');
          const p1 = pointMap[p1Name];
          const p2 = pointMap[p2Name];
          if (!p1 || !p2) return null;
          
          const [mx, my] = getMidpoint(p1, p2);
          
          return (
            <text
              key={sideName}
              x={mx}
              y={my + 3}
              fontSize="12"
              fill="var(--blue, #3b82f6)"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}
        
        {/* Angle markers */}
        {Object.entries(angles).map(([vertexName, angleLabel]) => {
          const vertex = pointMap[vertexName];
          if (!vertex) return null;
          
          // Draw right angle marker if 90°
          if (angleLabel.includes('90')) {
            const labelNames = Object.keys(pointMap);
            const vertexIdx = labelNames.indexOf(vertexName);
            if (vertexIdx === -1) return null;
            
            const prevIdx = (vertexIdx - 1 + labelNames.length) % labelNames.length;
            const nextIdx = (vertexIdx + 1) % labelNames.length;
            
            const p1 = pointMap[labelNames[prevIdx]];
            const p2 = pointMap[labelNames[nextIdx]];
            
            return (
              <g key={vertexName}>
                <path
                  d={drawRightAngle(vertex, p1, p2)}
                  stroke="var(--navy, #1e3a8a)"
                  strokeWidth="1.5"
                  fill="none"
                />
              </g>
            );
          }
          
          // Regular angle label
          return (
            <text
              key={vertexName}
              x={vertex[0] + 15}
              y={vertex[1] + 15}
              fontSize="11"
              fill="var(--orange, #f59e0b)"
            >
              {angleLabel}
            </text>
          );
        })}
      </svg>
    </VizBase>
  );
}

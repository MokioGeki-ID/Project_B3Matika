import { useState, lazy, Suspense } from 'react';
import { AlertCircle } from 'lucide-react';

// Lazy load visualization components
const FunctionPlot = lazy(() => import('./FunctionPlot'));
const Geometry = lazy(() => import('./Geometry'));
const BarChart = lazy(() => import('./BarChart'));
const NumberLine = lazy(() => import('./NumberLine'));

// Map of supported visualization types
const VIZ_COMPONENTS = {
  function_plot: FunctionPlot,
  geometry: Geometry,
  bar_chart: BarChart,
  number_line: NumberLine,
  // TODO: Add more types
  // line_chart: LineChart,
  // pie_chart: PieChart,
  // tree: TreeDiagram,
  // venn: VennDiagram,
  // flow: FlowDiagram
};

/**
 * B3Viz - Render mathematical visualizations from JSON schema
 * @param {Object} props
 * @param {string} props.json - JSON string containing visualization data
 */
export default function B3Viz({ json }) {
  const [error, setError] = useState(null);

  // Parse and validate JSON
  let data;
  try {
    data = JSON.parse(json);
  } catch (err) {
    return (
      <div className="viz-error">
        <AlertCircle size={20} />
        <span>Format visualisasi tidak valid (JSON error)</span>
      </div>
    );
  }

  // Validate required fields
  if (!data.type || !data.title) {
    return (
      <div className="viz-error">
        <AlertCircle size={20} />
        <span>Visualisasi tidak lengkap (perlu type dan title)</span>
      </div>
    );
  }

  // Security: limit JSON size (max 8KB)
  if (json.length > 8192) {
    return (
      <div className="viz-error">
        <AlertCircle size={20} />
        <span>Data visualisasi terlalu besar (max 8KB)</span>
      </div>
    );
  }

  // Get component for this visualization type
  const VizComponent = VIZ_COMPONENTS[data.type];

  if (!VizComponent) {
    return (
      <div className="viz-error">
        <AlertCircle size={20} />
        <span>Tipe visualisasi "{data.type}" belum didukung</span>
        <details style={{ marginTop: '8px', fontSize: '11px' }}>
          <summary>Tipe yang didukung:</summary>
          <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
            {Object.keys(VIZ_COMPONENTS).map(type => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </details>
      </div>
    );
  }

  // Render component with error boundary
  return (
    <Suspense fallback={<div className="viz-loading">Memuat visualisasi...</div>}>
      <VizComponent data={data} />
    </Suspense>
  );
}

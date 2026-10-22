import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

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
        <span>Format visualisasi tidak valid</span>
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
        <span>Data visualisasi terlalu besar</span>
      </div>
    );
  }

  // TODO: Implement actual visualization components
  // For now, show placeholder
  return (
    <div className="viz-placeholder">
      <div className="viz-placeholder-header">
        <strong>{data.title}</strong>
        <span className="viz-type-badge">{data.type}</span>
      </div>
      {data.caption && (
        <p className="viz-caption">{data.caption}</p>
      )}
      <div className="viz-placeholder-content">
        <p>📊 Visualisasi {data.type} (dalam pengembangan)</p>
        <pre style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
          {JSON.stringify(data, null, 2).slice(0, 200)}...
        </pre>
      </div>
    </div>
  );
}

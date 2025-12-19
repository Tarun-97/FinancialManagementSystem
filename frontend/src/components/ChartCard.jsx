import React from 'react';

export default function ChartCard({
  title,
  subtitle = null,
  children,
  loading = false,
  error = null,
  empty = false,
  height = 320 // increased default height
}) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', minHeight: height + 52 }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#666' }}>{subtitle}</div>}
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'crimson' }}>Error: {error.message || String(error)}</div>}
      {!loading && !error && empty && <div>No data</div>}

      {!loading && !error && !empty && (
        <div style={{ height, minHeight: height }}>
          {children}
        </div>
      )}
    </div>
  );
}

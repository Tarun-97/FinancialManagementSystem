import React from 'react';

export default function Table({ columns = [], rows = [], loading = false, error = null, emptyMessage = 'No data' }) {
  if (loading) return <div>Loading…</div>;
  if (error) return <div style={{ color: 'crimson' }}>Error: {error.message || String(error)}</div>;
  if (!rows || rows.length === 0) return <div>{emptyMessage}</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table border="1" cellPadding="6" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

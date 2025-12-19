import React from 'react';

export default function Pagination({ total = 0, limit = 10, offset = 0, onChange }) {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  const prev = () => onChange && onChange({ limit, offset: Math.max(0, offset - limit) });
  const next = () => onChange && onChange({ limit, offset: Math.min((pages - 1) * limit, offset + limit) });
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
      <button onClick={prev} disabled={page <= 1}>Prev</button>
      <span>Page {page} / {pages}</span>
      <button onClick={next} disabled={page >= pages}>Next</button>
    </div>
  );
}

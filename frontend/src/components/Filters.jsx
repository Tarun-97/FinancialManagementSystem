import React, { useEffect, useState } from 'react';
import { get } from '../lib/api.js';

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function Selector({ label, items, valueKey = 'id', labelKey = 'name', value, onChange, loading, allowEmpty = true }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span>{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value ? Number(e.target.value) : null)}
      >
        {allowEmpty && <option value="">All</option>}
        {items.map((it) => (
          <option key={it[valueKey]} value={it[valueKey]}>
            {it[labelKey]}
          </option>
        ))}
      </select>
      {loading && <span style={{ fontSize: 12, color: '#666' }}>Loading…</span>}
    </label>
  );
}

export function DepartmentSelect({ value, onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const res = await get('/departments', { limit: 100, offset: 0 });
        const arr = (res.items || []).map((d) => ({ id: d.DepartmentID, name: d.DeptName }));
        if (!ignore) {
          setItems(arr);
          if (arr.length && (value === null || value === undefined)) {
            onChange && onChange(arr[0].id);
          }
        }
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [value, onChange]);

  return <Selector label="Department" items={items} value={value} onChange={onChange} loading={loading} />;
}

export function FiscalYearSelect({ value, onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const res = await get('/fiscal-years', { limit: 100, offset: 0 });
        const arr = (res.items || []).map((f) => ({ id: f.FiscalYearID, name: f.YearLabel }));
        if (!ignore) {
          setItems(arr);
          if (arr.length && (value === null || value === undefined)) {
            onChange && onChange(arr[0].id);
          }
        }
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [value, onChange]);

  return <Selector label="Fiscal Year" items={items} value={value} onChange={onChange} loading={loading} />;
}

export function AccountSelect({ value, onChange, query = '' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const q = useDebounced(query, 300);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const res = await get('/accounts', { limit: 100, offset: 0, q });
        if (!ignore) {
          setItems(
            (res.items || []).map((a) => ({
              id: a.AccountID,
              name: `${a.AccountCode} - ${a.AccountName}`,
            }))
          );
        }
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [q]);

  return <Selector label="Account" items={items} value={value} onChange={onChange} loading={loading} />;
}

import React from 'react';
import { formatMoney } from '../lib/format.js';

export default function Money({ value }) {
  return <span>{formatMoney(value)}</span>;
}

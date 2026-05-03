export function exportToCSV(
  rows: Array<Record<string, unknown>>,
  filename: string,
  columns?: Array<{ key: string; label: string }>
) {
  if (typeof window === 'undefined') return false;
  if (!rows || rows.length === 0) return false;

  const selectedColumns = columns && columns.length > 0
    ? columns
    : Object.keys(rows[0]).map((key) => ({ key, label: key }));

  const escapeCell = (value: unknown) => {
    const text = value == null ? '' : String(value);
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const header = selectedColumns.map((col) => escapeCell(col.label)).join(',');
  const body = rows
    .map((row) => selectedColumns.map((col) => escapeCell(row[col.key])).join(','))
    .join('\n');

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

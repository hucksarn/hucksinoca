/**
 * Format a date to DD/MM/YYYY HH:mm in PKT (GMT+5 Karachi)
 */
export function formatDatePKT(date: string | Date, includeTime = true): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  if (includeTime) {
    return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
  }
  return `${get('day')}/${get('month')}/${get('year')}`;
}

/**
 * Relative time string (e.g. "2 hours ago") using PKT
 */
export function formatRelativePKT(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDatePKT(date, false);
}

// 지역 날짜 문자열 (toISOString은 UTC라 한국 오전 9시 전에는 하루 전 날짜가 된다)
export function localDate(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → '10월 16일' */
export function koreanDate(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${m}월 ${d}일`;
}

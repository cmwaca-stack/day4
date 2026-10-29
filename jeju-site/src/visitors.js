// 공공데이터포털 "제주특별자치도 서귀포시_직영관광지 관람객수 추이" (월별, 5개 관광지)
const KEY = import.meta.env.VITE_JEJU_DATA_KEY;
export const hasVisitors = Boolean(KEY);

const URL = 'https://api.odcloud.kr/api/15125100/v1/uddi:32a1b877-af20-4505-a76a-fd389ebd30ca';
const META = new Set(['기준연도', '기준월', '데이터기준일자']);

// 관광지 목록(자료의 열 이름)과 화면 표시 이름
export const SITES = [
  { key: '천지연폭포', name: '💧 천지연폭포' },
  { key: '정방폭포', name: '🌊 정방폭포' },
  { key: '천제연폭포', name: '🏞️ 천제연폭포' },
  { key: '중문대포 주상절리대', name: '🪨 주상절리대' },
  { key: '산방산_용머리', name: '⛰️ 산방산·용머리' },
  { key: '감귤박물관', name: '🍊 감귤박물관' },
];

// [{ year, month, 천지연폭포, ... }] 를 연·월 순서로 돌려줘요
export async function getVisitors() {
  if (!hasVisitors) return [];
  const cacheKey = 'visitors:v1';
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) return JSON.parse(raw);
  } catch { /* 저장소를 못 쓰면 그냥 요청 */ }
  const res = await fetch(`${URL}?${new URLSearchParams({ page: '1', perPage: '200', serviceKey: KEY })}`);
  if (!res.ok) throw new Error(`관람객 자료 요청 실패 (${res.status})`);
  const json = await res.json();
  const rows = (json.data || []).map((r) => {
    const o = { year: Number(r['기준연도']), month: Number(r['기준월']) };
    for (const [k, v] of Object.entries(r)) if (!META.has(k)) o[k] = Number(v) || 0;
    return o;
  }).sort((a, b) => a.year - b.year || a.month - b.month);
  try { sessionStorage.setItem(cacheKey, JSON.stringify(rows)); } catch { /* 무시 */ }
  return rows;
}

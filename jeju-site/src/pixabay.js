// Pixabay API 도우미. 결과는 sessionStorage 에 24시간 이내로만 저장합니다(Pixabay 이용 규정).
const KEY = import.meta.env.VITE_PIXABAY_API_KEY;
export const hasPixabay = Boolean(KEY);

const DAY = 24 * 60 * 60 * 1000;

async function cached(cacheKey, fetcher) {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) {
      const { t, v } = JSON.parse(raw);
      if (Date.now() - t < DAY) return v;
    }
  } catch { /* 저장소를 못 쓰는 환경이면 그냥 요청 */ }
  const v = await fetcher();
  try { sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v })); } catch { /* 무시 */ }
  return v;
}

const pick = (h) => ({
  id: h.id,
  tags: h.tags,
  thumb: h.webformatURL,
  large: h.largeImageURL || h.webformatURL,
  page: h.pageURL,
  user: h.user,
});

// 검색어로 사진 찾기
export function searchImages(q, { page = 1, perPage = 12 } = {}) {
  if (!hasPixabay) return Promise.resolve([]);
  const params = new URLSearchParams({
    key: KEY, q, image_type: 'photo', orientation: 'horizontal',
    safesearch: 'true', per_page: String(perPage), page: String(page), order: 'popular',
  });
  return cached(`px:${q}:${page}:${perPage}`, async () => {
    const res = await fetch(`https://pixabay.com/api/?${params}`);
    if (!res.ok) throw new Error(`Pixabay 요청 실패 (${res.status})`);
    const data = await res.json();
    return (data.hits || []).map(pick);
  });
}

// 사진 번호로 한 장 가져오기 (즐겨찾기 화면에서 사용)
export function getImageById(id) {
  if (!hasPixabay) return Promise.resolve(null);
  return cached(`px:id:${id}`, async () => {
    const res = await fetch(`https://pixabay.com/api/?${new URLSearchParams({ key: KEY, id: String(id) })}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.hits && data.hits[0] ? pick(data.hits[0]) : null;
  });
}

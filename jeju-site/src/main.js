import './style.css';
import { supabase, hasSupabase } from './supabaseClient.js';
import { searchImages, getImageById, hasPixabay } from './pixabay.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- 화면에 보여 줄 내용 ----------
const CATS = [
  { q: 'jeju island', name: '🌊 제주 풍경' },
  { q: 'hallasan mountain', name: '⛰️ 한라산' },
  { q: 'tangerine orchard', name: '🍊 감귤' },
  { q: 'korea coast rocks', name: '🪨 해안·돌' },
  { q: 'waterfall korea', name: '💧 폭포' },
  { q: 'canola flower field', name: '🌼 유채꽃' },
];

const MYTHS = [
  { name: '설문대할망', role: '창조의 여신', q: 'mountain crater', text: '몸집이 어마어마한 여신. 치마폭에 흙을 담아 나르다 흘린 흙이 368개의 오름이 되었고, 한가운데 쌓은 흙이 한라산이 되었다고 해요.' },
  { name: '자청비', role: '농경의 여신', q: 'rice field', text: '하늘에서 오곡 씨앗을 가져와 사람들에게 농사를 알려 준 지혜롭고 용감한 여신이에요.' },
  { name: '영등할망', role: '바람의 여신', q: 'ocean wind waves', text: '음력 2월이면 바람을 타고 제주를 찾아와 바다에 씨앗을 뿌려 주고 가는 바람의 여신이에요.' },
  { name: '삼성혈', role: '탐라의 시작', q: 'korea forest', text: '고을나, 양을나, 부을나 세 신인이 땅에서 솟아났다는 세 개의 구멍. 탐라국이 시작된 신성한 곳이에요.' },
  { name: '백록담', role: '한라산의 호수', q: 'crater lake', text: '신선이 흰 사슴(백록)에게 물을 먹이던 곳이라 해서 백록담이라 불러요. 한라산 정상의 화구호예요.' },
  { name: '오백장군', role: '영실기암의 전설', q: 'rock formation', text: '설문대할망의 오백 아들이 바위로 변했다는 전설. 영실의 기암괴석이 그 모습이라고 해요.' },
];

// ---------- 상태 ----------
let user = null;
let favIds = new Set();
let cat = CATS[0];
let page = 1;
let authMode = 'login';

// ---------- 작은 도우미 ----------
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove('show'), 2800);
}

const KO_ERRORS = [
  [/Invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않아요.'],
  [/User already registered/i, '이미 가입된 이메일이에요. 로그인해 주세요.'],
  [/Email not confirmed/i, '이메일 인증을 아직 하지 않았어요. 메일함의 인증 링크를 눌러 주세요.'],
  [/Password should be at least/i, '비밀번호는 6자 이상이어야 해요.'],
  [/Unable to validate email|invalid format/i, '이메일 형식을 확인해 주세요.'],
  [/rate limit|too many/i, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'],
  [/signups? (are )?disabled/i, '현재 회원가입이 막혀 있어요. (Supabase 설정 확인)'],
];
const koError = (m) => (KO_ERRORS.find(([re]) => re.test(m)) || [null, m])[1];

// ---------- 설정 배너 ----------
function showSetupBanner() {
  const miss = [];
  if (!hasSupabase) miss.push('Supabase 주소·키(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
  if (!hasPixabay) miss.push('Pixabay 키(VITE_PIXABAY_API_KEY)');
  const b = $('#setup-banner');
  if (miss.length) {
    b.hidden = false;
    b.innerHTML = `⚙️ 아직 <b>${miss.join(' / ')}</b> 가 설정되지 않았어요. <code>.env</code> 또는 Vercel 환경변수를 확인해 주세요. (README 참고)`;
  } else b.hidden = true;
}

// ---------- 상단 로그인 영역 ----------
function renderAuth() {
  const a = $('#auth-area');
  if (user) {
    const nick = user.user_metadata?.nickname || user.email?.split('@')[0] || '탐험가';
    a.innerHTML = `<span class="hello">👋 ${esc(nick)}님</span><button class="btn ghost small" id="logout">로그아웃</button>`;
    $('#logout').onclick = signOut;
  } else {
    a.innerHTML = `<button class="btn ghost small" id="open-login">로그인</button><button class="btn primary small" id="open-signup">회원가입</button>`;
    $('#open-login').onclick = () => openAuth('login');
    $('#open-signup').onclick = () => openAuth('signup');
  }
  $('#nav-my').hidden = !user;
}

// ---------- 로그인 / 회원가입 모달 ----------
function openAuth(mode = 'login', note = '') {
  authMode = mode;
  $('#modal').hidden = false;
  $('#modal-note').textContent = note;
  $('#form-msg').textContent = '';
  $('#form-msg').className = 'form-msg';
  const signup = mode === 'signup';
  $('#modal-title').textContent = signup ? '회원가입' : '로그인';
  $('#submit-btn').textContent = signup ? '가입하기' : '로그인';
  $('#nick-row').hidden = !signup;
  $('#password').autocomplete = signup ? 'new-password' : 'current-password';
  $('#tab-login').classList.toggle('on', !signup);
  $('#tab-signup').classList.toggle('on', signup);
  setTimeout(() => $('#email').focus(), 30);
}
const closeAuth = () => { $('#modal').hidden = true; };

async function onSubmit(e) {
  e.preventDefault();
  const msg = $('#form-msg');
  msg.className = 'form-msg';
  if (!supabase) { msg.textContent = 'Supabase 설정(.env)이 아직 없어요.'; return; }
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const nickname = $('#nickname').value.trim();
  const btn = $('#submit-btn');
  btn.disabled = true;
  try {
    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { nickname: nickname || email.split('@')[0] }, emailRedirectTo: location.origin },
      });
      if (error) throw error;
      if (data.session) { closeAuth(); toast('🎉 가입 완료! 환영해요.'); }
      else { msg.className = 'form-msg ok'; msg.textContent = '가입 신청 완료! 메일함의 인증 링크를 눌러 주세요. (이미 가입된 이메일이면 메일이 오지 않을 수 있어요)'; }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      closeAuth(); toast('✅ 로그인되었어요.');
    }
  } catch (err) {
    msg.textContent = koError(err.message || String(err));
  } finally { btn.disabled = false; }
}

async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  toast('로그아웃되었어요.');
  if (location.hash === '#/my') location.hash = '#top';
}

// ---------- 즐겨찾기 ----------
async function loadFavs() {
  favIds = new Set();
  if (!supabase || !user) return;
  const { data, error } = await supabase.from('favorites').select('image_id');
  if (error) { console.warn('즐겨찾기를 불러오지 못했어요:', error.message); return; }
  favIds = new Set((data || []).map((r) => Number(r.image_id)));
}

async function toggleFav(img) {
  if (!user) return openAuth('login', '♡ 즐겨찾기는 로그인한 뒤에 쓸 수 있어요.');
  const has = favIds.has(img.id);
  const { error } = has
    ? await supabase.from('favorites').delete().eq('image_id', img.id)
    : await supabase.from('favorites').insert({ image_id: img.id, tags: img.tags });
  if (error) return toast('앞서 schema.sql 을 실행했는지 확인해 주세요: ' + error.message);
  has ? favIds.delete(img.id) : favIds.add(img.id);
  document.querySelectorAll(`.heart[data-id="${img.id}"]`).forEach((b) => { b.classList.toggle('on', !has); b.textContent = !has ? '♥' : '♡'; });
  toast(has ? '즐겨찾기에서 뺐어요.' : '♥ 즐겨찾기에 담았어요.');
  if (location.hash === '#/my') renderMy();
}

// ---------- 갤러리 ----------
function card(img) {
  const on = favIds.has(img.id);
  return `<figure class="photo">
    <a href="${esc(img.page)}" target="_blank" rel="noopener"><img src="${esc(img.thumb)}" alt="${esc(img.tags)}" loading="lazy" /></a>
    <button class="heart ${on ? 'on' : ''}" data-id="${img.id}" aria-label="즐겨찾기">${on ? '♥' : '♡'}</button>
    <figcaption>${esc(img.tags)} <small>· ${esc(img.user)}</small></figcaption>
  </figure>`;
}

function bindHearts(root, byId) {
  root.querySelectorAll('.heart').forEach((b) => { b.onclick = () => toggleFav(byId[b.dataset.id]); });
}

const imgCache = {};
async function renderGallery(append = false) {
  const grid = $('#gallery-grid');
  if (!append) grid.innerHTML = '<p class="empty">사진을 불러오는 중…</p>';
  if (!hasPixabay) { grid.innerHTML = '<p class="empty">Pixabay 키가 설정되면 사진이 나타나요.</p>'; $('#more-btn').hidden = true; return; }
  try {
    const list = await searchImages(cat.q, { page, perPage: 12 });
    list.forEach((i) => { imgCache[i.id] = i; });
    const html = list.map(card).join('');
    if (append) grid.insertAdjacentHTML('beforeend', html); else grid.innerHTML = html || '<p class="empty">사진을 찾지 못했어요.</p>';
    bindHearts(grid, imgCache);
    $('#more-btn').hidden = list.length < 12;
  } catch (e) { grid.innerHTML = `<p class="empty">사진을 불러오지 못했어요: ${esc(e.message)}</p>`; }
}

function renderTabs() {
  $('#cat-tabs').innerHTML = CATS.map((c, i) => `<button class="tab ${c === cat ? 'on' : ''}" data-i="${i}">${c.name}</button>`).join('');
  document.querySelectorAll('#cat-tabs .tab').forEach((b) => {
    b.onclick = () => { cat = CATS[+b.dataset.i]; page = 1; renderTabs(); renderGallery(); };
  });
}

// ---------- 신화 카드 / 히어로 ----------
async function renderMyth() {
  $('#myth-cards').innerHTML = MYTHS.map((m, i) => `<article class="mcard">
    <div class="mimg" id="mimg-${i}"></div>
    <div class="mbody"><span class="role">${esc(m.role)}</span><h3>${esc(m.name)}</h3><p>${esc(m.text)}</p></div></article>`).join('');
  if (!hasPixabay) return;
  MYTHS.forEach(async (m, i) => {
    try {
      const [img] = await searchImages(m.q, { perPage: 3 });
      if (img) $(`#mimg-${i}`).style.backgroundImage = `url("${img.thumb}")`;
    } catch { /* 이미지 없이도 카드는 보여요 */ }
  });
}

async function renderHero() {
  if (!hasPixabay) return;
  try {
    const list = await searchImages('jeju island sea', { perPage: 8 });
    const img = list[0];
    if (img) $('#top').style.setProperty('--hero', `url("${img.large}")`);
  } catch { /* 기본 배경 사용 */ }
}

// ---------- 내 즐겨찾기 ----------
async function renderMy() {
  const grid = $('#my-grid');
  $('#my-lead').textContent = '';
  if (!user) { grid.innerHTML = '<p class="empty">로그인하면 내가 담은 사진이 여기에 모여요.</p>'; return; }
  grid.innerHTML = '<p class="empty">불러오는 중…</p>';
  const { data, error } = await supabase.from('favorites').select('image_id,created_at').order('created_at', { ascending: false }).limit(60);
  if (error) { grid.innerHTML = `<p class="empty">불러오지 못했어요: ${esc(error.message)}<br>Supabase SQL Editor 에서 schema.sql 을 실행했는지 확인해 주세요.</p>`; return; }
  if (!data.length) { grid.innerHTML = '<p class="empty">아직 담은 사진이 없어요. 갤러리에서 ♡ 를 눌러 보세요!</p>'; return; }
  $('#my-lead').textContent = `${data.length}장을 담았어요.`;
  const imgs = (await Promise.all(data.map((r) => getImageById(r.image_id)))).filter(Boolean);
  imgs.forEach((i) => { imgCache[i.id] = i; });
  grid.innerHTML = imgs.map(card).join('');
  bindHearts(grid, imgCache);
}

// ---------- 화면 전환(해시 라우터) ----------
function route() {
  const isMy = location.hash === '#/my';
  if (isMy && !user) { openAuth('login', '내 즐겨찾기는 로그인 후에 볼 수 있어요.'); location.hash = '#top'; return; }
  $('#home-view').hidden = isMy;
  $('#my-view').hidden = !isMy;
  if (isMy) { renderMy(); window.scrollTo(0, 0); }
}

// ---------- 시작 ----------
async function init() {
  showSetupBanner();
  renderAuth(); renderTabs(); renderMyth(); renderHero(); renderGallery();

  $('#tab-login').onclick = () => openAuth('login', $('#modal-note').textContent);
  $('#tab-signup').onclick = () => openAuth('signup', $('#modal-note').textContent);
  $('#modal-close').onclick = closeAuth;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeAuth(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuth(); });
  $('#auth-form').addEventListener('submit', onSubmit);
  $('#hero-join').onclick = () => (user ? (location.hash = '#gallery') : openAuth('signup'));
  $('#more-btn').onclick = () => { page += 1; renderGallery(true); };
  addEventListener('hashchange', route);

  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  user = data.session?.user ?? null;
  await loadFavs(); renderAuth(); renderGallery(); route();

  // 로그인 / 로그아웃 / 토큰 갱신이 일어나면 화면을 다시 그려요
  supabase.auth.onAuthStateChange(async (_event, session) => {
    const prev = user?.id;
    user = session?.user ?? null;
    if (prev === user?.id) return;
    await loadFavs(); renderAuth(); renderGallery(); route();
  });
}
init();

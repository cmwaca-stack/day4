# 🍊 탐라 이야기 (jeju-site)

제주 신화와 풍경을 소개하는 사이트. **Vite(바닐라 JS) + Supabase(회원가입·로그인·즐겨찾기) + Pixabay(사진) + Vercel(배포)**

- 회원가입 / 로그인 / 로그아웃 (이메일 + 비밀번호)
- 로그인한 회원만 사진에 ♥ 를 눌러 "내 즐겨찾기"에 저장 (Supabase DB + RLS 보안)
- 사진은 Pixabay API로 불러옴 (이미지 주소는 저장하지 않고 번호만 저장)

---

## 0. 먼저 준비할 것

| 준비물 | 설명 |
|---|---|
| **Node.js (LTS)** | https://nodejs.org 에서 설치. 설치 후 터미널에서 `node -v` 로 확인 (지금 PC에는 아직 없어요) |
| Supabase 계정 | 이미 프로젝트가 있어요 (`cmwaca-stack's Project`) |
| Pixabay 계정 | https://pixabay.com 무료 가입 |
| GitHub 계정, Vercel 계정 | Vercel은 GitHub 로그인으로 가입하면 편해요 |

---

## 1. 환경변수 정리 (이 3개만 있으면 돼요)

| 이름 | 어디서 얻나요 | 예시 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase > Project Settings > **API** > Project URL | `https://abcd1234.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | 같은 화면의 **anon public** 키 (새 화면에서는 *publishable* 키) | `eyJhbGciOi...` |
| `VITE_PIXABAY_API_KEY` | https://pixabay.com/api/docs/ (**로그인한 상태**에서 문서 중간의 `key` 값) | `12345678-abcdef...` |

> ⚠️ 이름이 `VITE_` 로 시작해야 브라우저 코드에서 읽을 수 있어요. 철자가 틀리면 "설정되지 않았어요" 배너가 떠요.
> ⚠️ `service_role` 키는 **절대** 넣지 마세요. (anon/publishable 키만! 데이터 보호는 RLS가 해 줘요.)

---

## 2. Supabase 설정 (순서대로)

### 2-1. 키 복사
1. Supabase 대시보드에서 프로젝트를 엽니다.
2. 왼쪽 아래 톱니바퀴 **Project Settings → API** (또는 위쪽 **Connect** 버튼).
3. **Project URL** 과 **anon(public) / publishable key** 를 메모장에 복사해 둡니다.

### 2-2. 즐겨찾기 테이블 만들기
1. 왼쪽 메뉴 **SQL Editor** → *New query*
2. 이 폴더의 `supabase/schema.sql` 내용을 전부 붙여 넣고 **Run**
3. 왼쪽 **Table Editor** 에 `favorites` 테이블이 보이면 성공 (RLS 켜짐 표시 확인)

> 스크린샷의 "No tables in schema" 화면이 지금 상태예요. 위 SQL을 실행하면 해결돼요.

### 2-3. 로그인 방식 확인
1. **Authentication → Sign In / Providers** (또는 Providers) → **Email** 이 *Enabled* 인지 확인
2. 처음 테스트할 땐 **Confirm email** 을 꺼 두면 가입 즉시 로그인돼서 편해요. (켜 두면 메일 인증 후 로그인)
   - 무료 플랜은 인증 메일 발송 횟수 제한이 작아요. 개발 중에는 끄는 걸 추천해요.

### 2-4. 주소 허용 (배포 후에도 한 번 더!)
**Authentication → URL Configuration**
- **Site URL**: 배포된 주소 (예: `https://jeju-site.vercel.app`) — 배포 전에는 `http://localhost:5173`
- **Redirect URLs**: 아래 둘 다 추가
  - `http://localhost:5173/**`
  - `https://내-프로젝트.vercel.app/**`

---

## 3. 내 컴퓨터에서 실행

```bash
cd jeju-site
copy .env.example .env      # (Mac/Linux는 cp .env.example .env)
```

`.env` 파일을 메모장으로 열어 위 3개 값을 채운 뒤:

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

**확인 체크리스트**
- [ ] 사진이 나온다 → Pixabay 키 OK
- [ ] 회원가입 → 로그인 된다 → Supabase 키 OK
- [ ] ♡ 를 누르면 ♥ 가 되고, 상단 "내 즐겨찾기"에 나타난다 → SQL 실행 OK
- [ ] Supabase Table Editor > favorites 에 행이 생긴다

---

## 4. GitHub에 올리기

저장소를 새로 만든 뒤(Create repository, README/.gitignore 추가 **안 함**) 주소를 복사합니다.

```bash
git remote add origin https://github.com/내아이디/저장소이름.git
git push -u origin main
```

`.env` 는 `.gitignore` 에 들어 있어서 **올라가지 않아요** (키 유출 방지).

---

## 5. Vercel로 배포 (순서대로)

1. https://vercel.com 로그인 → **Add New… → Project**
2. GitHub 저장소를 **Import**
3. 설정 화면에서
   - **Root Directory**: `jeju-site` ← 저장소 안에 이 폴더가 있다면 꼭 지정!
   - **Framework Preset**: Vite (자동 인식)
   - Build Command `npm run build`, Output Directory `dist` (기본값 그대로)
4. **Environment Variables** 펼치기 → 위 3개를 **이름/값** 그대로 하나씩 추가 (`Production`, `Preview`, `Development` 모두 체크)
5. **Deploy** 클릭 → 완료되면 `https://xxxx.vercel.app` 주소가 생겨요
6. **Supabase → Authentication → URL Configuration** 에 이 주소를 **Site URL / Redirect URLs** 로 추가 (2-4 단계)
7. 사이트에서 가입 · 로그인 · 즐겨찾기를 다시 확인

> 환경변수를 **나중에 바꾸면** Vercel에서 *Deployments → 맨 위 배포 → Redeploy* 를 해야 반영돼요. (빌드할 때 값이 코드에 들어가기 때문)

---

## 6. 자주 막히는 곳

| 증상 | 원인 / 해결 |
|---|---|
| 위에 주황색 "설정되지 않았어요" 배너 | `.env` 이름 오타, 또는 Vercel 환경변수 미등록 후 재배포 안 함 |
| 사진이 안 나옴 | Pixabay 키 오류, 또는 1분에 100회 제한 초과(잠시 후 재시도) |
| "Invalid login credentials" | 이메일/비밀번호 오류, 또는 이메일 인증 전 |
| 가입했는데 로그인이 안 됨 | *Confirm email* 이 켜져 있으면 메일 인증 필요 |
| ♡ 누르면 "schema.sql 을 실행했는지…" | 2-2 단계 SQL 미실행 |
| 인증 메일의 링크가 localhost 로 감 | 2-4 단계 Site URL 을 배포 주소로 변경 |

## 7. 참고
- Pixabay 이용 규정상 사진 주소를 영구 저장하지 않고, 24시간 이내로만 브라우저에 캐시해요. 그래서 즐겨찾기에는 **사진 번호**만 저장하고 화면에서 다시 불러와요.
- `VITE_PIXABAY_API_KEY` 는 브라우저에 노출돼요. 문제가 되면 Vercel 서버리스 함수(`/api`)로 옮길 수 있어요.

## 폴더 구조
```
jeju-site/
├─ index.html            화면 뼈대
├─ src/main.js           화면 동작(인증·갤러리·즐겨찾기)
├─ src/supabaseClient.js Supabase 연결
├─ src/pixabay.js        Pixabay 사진 불러오기
├─ src/style.css         디자인
├─ supabase/schema.sql   DB 테이블 + 보안 규칙
├─ .env.example          환경변수 견본
└─ package.json
```

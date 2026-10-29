import { createClient } from '@supabase/supabase-js';

// Vite 는 VITE_ 로 시작하는 환경변수만 브라우저 코드에서 읽을 수 있게 해 줍니다.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && key);

// 키가 없으면 null (화면 위쪽에 설정 안내 배너가 뜹니다)
export const supabase = hasSupabase ? createClient(url, key) : null;

// 인스타그램 자동 게시: 오늘(한국시간) 날짜의 카드 세트를 게시물(캐러셀) + 스토리로 올린다.
// 필요한 GitHub Secrets (계정마다 번호를 붙여 여러 개 가능):
//   IG_USER_ID_1, IG_TOKEN_1   (안산점)    IG_USER_ID_2, IG_TOKEN_2 (시흥점)
// 선택: IG_HOST (기본 graph.facebook.com, 인스타그램 로그인 토큰이면 graph.instagram.com)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://ansansiheungpiston.netlify.app';
const HOST = process.env.IG_HOST || 'graph.facebook.com';
const V = 'v21.0';
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const day = process.env.POST_DATE || today;

const queue = JSON.parse(readFileSync(resolve(ROOT, 'queue.json'), 'utf8'));
const logPath = resolve(ROOT, 'posted.json');
const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : [];

const item = queue.find(q => q.date === day && q.approved);
if (!item) { console.log(`${day}: 올릴 승인된 카드 없음`); process.exit(0); }

const accounts = [];
for (let i = 1; i <= 5; i++) {
  const id = process.env['IG_USER_ID_' + i], token = process.env['IG_TOKEN_' + i];
  if (id && token) accounts.push({ n: i, id, token });
}
if (!accounts.length) { console.log('인스타 계정 정보(Secrets)가 아직 없어 건너뜀'); process.exit(0); }

const dir = resolve(ROOT, 'out', item.slug);
const caption = readFileSync(resolve(dir, 'caption.txt'), 'utf8');
const posts = Array.from({ length: 10 }, (_, i) => `post-${i + 1}.jpg`).filter(f => existsSync(resolve(dir, f)));
const url = f => `${SITE}/social/out/${item.slug}/${f}`;

async function api(path, params, token, method = 'POST') {
  const body = new URLSearchParams({ ...params, access_token: token });
  const r = await fetch(`https://${HOST}/${V}/${path}` + (method === 'GET' ? '?' + body : ''), method === 'GET' ? {} : { method, body });
  const j = await r.json();
  if (j.error) throw new Error(`${path}: ${j.error.message}`);
  return j;
}
async function ready(id, token) {
  for (let i = 0; i < 30; i++) {
    const s = await api(id, { fields: 'status_code' }, token, 'GET');
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR') throw new Error('미디어 처리 실패 ' + id);
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error('미디어 처리 시간 초과 ' + id);
}

// 이미지가 홈페이지에 실제로 올라가 있는지 먼저 확인
for (const f of [...posts, 'story.jpg']) {
  const r = await fetch(url(f), { method: 'HEAD' });
  if (!r.ok) { console.error('홈페이지에 이미지가 아직 없음:', url(f)); process.exit(1); }
}

let failed = false;
for (const a of accounts) {
  const key = `${day}:${item.slug}:${a.n}`;
  try {
    if (!log.includes(key + ':feed')) {
      const kids = [];
      for (const f of posts) kids.push((await api(`${a.id}/media`, { image_url: url(f), is_carousel_item: 'true' }, a.token)).id);
      for (const k of kids) await ready(k, a.token);
      const car = await api(`${a.id}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption }, a.token);
      await ready(car.id, a.token);
      await api(`${a.id}/media_publish`, { creation_id: car.id }, a.token);
      log.push(key + ':feed'); console.log(`계정 ${a.n}: 게시물 완료`);
    }
    if (!log.includes(key + ':story')) {
      const st = await api(`${a.id}/media`, { media_type: 'STORIES', image_url: url('story.jpg') }, a.token);
      await ready(st.id, a.token);
      await api(`${a.id}/media_publish`, { creation_id: st.id }, a.token);
      log.push(key + ':story'); console.log(`계정 ${a.n}: 스토리 완료`);
    }
  } catch (e) { failed = true; console.error(`계정 ${a.n} 실패:`, e.message); }
}
writeFileSync(logPath, JSON.stringify(log, null, 1));
process.exit(failed ? 1 : 0);

// 네이버 블로그용 글 생성: node social/blog.mjs inu susi|jeongsi  → social/out/<slug>-<mode>/blog.md
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = dirname(fileURLToPath(import.meta.url));
const [slug, mode] = process.argv.slice(2);
const LB = { susi: '수시', jeongsi: '정시' }[mode], OTHER = LB === '수시' ? '정시' : '수시';
if (!slug || !LB) { console.error('usage: node social/blog.mjs <slug> susi|jeongsi'); process.exit(1); }
const d = JSON.parse(readFileSync(resolve(ROOT, 'data', slug + '.json'), 'utf8'));
const ymd = d.checked.replace(/-/g, '.');
const strip = c => c.replace(/^(수시|정시) /, '');
const drop = c => c.startsWith(OTHER) || /학생부종합|교과성적/.test(c);
const depts = d.depts.map(x => ({ ...x, tracks: x.tracks.filter(t => t.when.startsWith(LB)), changes: x.changes.filter(c => !drop(c)).map(strip) }));
const md = (head, rows) => `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${rows.map(r => `| ${r.join(' | ')} |`).join('\n')}`;
const tot = depts.reduce((a, x) => a + x.tracks.reduce((b, t) => b + t.n, 0), 0);
const img = n => `\n[이미지 삽입: ${mode === 'susi' ? 'inu-susi' : 'inu-jeongsi'} 카드 ${n}번]\n`;
let n = 1;
const out = [];
out.push(`# 2028 ${d.short} 체대 ${LB} 실기 총정리 | ${depts.map(x => x.name).join('·')} 인원·배점·종목`);
out.push(`안산·시흥 체대입시 전문 안산시흥피스톤입니다 💚\n2028학년도 ${d.school} 체육계열 **${LB} 실기전형**(${LB === '수시' ? '실기우수자' : '일반학생'})을 학과별로 정리했어요. ${d.short} 체대입시를 준비하는 고2·고3이라면 저장해두고 원서 쓰기 전에 다시 확인하세요.`);
out.push(`## 한눈에 보기 (${LB} · 3개 학과 ${tot}명)\n` + md(['학과', '모집인원', '반영비율', '실기종목'],
  depts.map(x => { const t = x.tracks[0]; return [x.name, `${t.n}명`, t.parts.map(([k, v]) => `${k} ${v}%`).join(' + '), t.events.map(e => e[0]).join(' · ')]; })) + img(n++));
for (const x of depts) {
  const t = x.tracks[0];
  out.push(`## ${x.name} — ${LB} ${t.when === '수시' || t.when === '정시' ? t.name : ''} ${t.n}명
- **반영비율**: ${t.parts.map(([k, v]) => `${k} ${v}%`).join(' + ')} (${t.stage})
- **실기종목·배점**
${t.events.map(([e, p]) => `  - ${e}: ${p}`).join('\n')}
- **참고**: ${t.note}
${x.changes.length ? `\n**2027학년도와 달라진 점**\n${x.changes.map(c => `- ${c}`).join('\n')}` : ''}` + img(n++));
}
for (const t of d.tables || []) {
  if (/학생부종합/.test(t.title) || (t.only && t.only !== LB)) continue;
  if (/내신 환산/.test(t.title) && LB === '수시') {
    out.push(`## 내신 9등급 vs 5등급, 인천대는 이렇게 환산해요
2028학년도 수험생(2025년 고1 입학생)부터 내신이 5등급 상대평가로 바뀝니다.
- 1등급: 상위 4% → 상위 10%
- 2등급까지: 누적 11% → 34%
- 3등급까지: 누적 23% → 66%
${d.gradeNote ? `- ${d.gradeNote}` : ''}` + img(n++));
    out.push(`## ${t.title} (${t.sub})\n` + t.blocks.map(b => md(b.head, b.rows)).join('\n\n') + '\n\n' + (t.notes || []).map(x => `※ ${x}`).join('\n') + img(n++));
  } else if (/정시 수능/.test(t.title)) {
    out.push(`## 정시 수능 반영 (${t.sub})\n` + t.blocks.map(b => `${b.cap ? `**${b.cap}**\n\n` : ''}${md(b.head, b.rows)}`).join('\n\n') + '\n\n' + (t.notes || []).map(x => `※ ${x}`).join('\n') + img(n++));
  } else if (/^검정고시/.test(t.title)) {
    const b = t.blocks.find(b => /학교폭력/.test(b.cap || ''));
    const keep = b.head.map((h, k) => k === 0 || (LB === '수시' ? /수시 실기/.test(h) : h === '정시'));
    const head = b.head.filter((_, k) => keep[k]).map((h, k) => k ? `${LB} ${LB === '수시' ? '실기우수자' : ''}`.trim() : h);
    out.push(`## 학교폭력 조치 감점 (2027 → 2028)\n` + md(head, b.rows.map(r => r.filter((_, k) => keep[k]))) + '\n\n※ 학폭 6~9호 반영 방법은 기존과 동일' + img(n++));
  }
}
out.push(`## 안산·시흥 체대입시, 안산시흥피스톤\n${d.short} ${LB} 실기 종목을 배점표 기준으로 측정하고, 내 기록을 점수로 바꿔 관리합니다. (안산 고잔 · 시흥 배곧 · 시흥 장현)\n\n상담·등록신청은 홈페이지에서 가능해요 👉 https://ansansiheungpiston.netlify.app\n인스타그램 @siheung_piston · @ansan_piston` + img(n++));
out.push(`> 출처: ${d.source} (${ymd} 확인). 전형 내용은 변경될 수 있으니 지원 전 반드시 대학 모집요강 원문으로 최종 확인하세요.`);
out.push(`#${d.short}체대입시 #${d.short}${LB} #${d.short}스포츠의학부 #${d.short}체육교육과 #2028체대입시 #체대입시 #체대실기 #체대입시학원 #안산체대입시 #시흥체대입시 #배곧체대입시 #장현체대입시 #안산시흥피스톤 #피스톤체대입시`);
writeFileSync(resolve(ROOT, 'out', `${slug}-${mode}`, 'blog.md'), out.join('\n\n') + '\n');
console.log('blog ok', `${slug}-${mode}`, n - 1, 'images');

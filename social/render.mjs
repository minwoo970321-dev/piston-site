// 2028 전형계획 카드 렌더러: node social/render.mjs <slug>
// 결과: social/out/<slug>/post-1.jpg … (1080x1350), story.jpg (1080x1920), blog.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = 'ansansiheungpiston.netlify.app';
const slug = process.argv[2];
if (!slug) { console.error('usage: node social/render.mjs <slug>'); process.exit(1); }
const d = JSON.parse(readFileSync(resolve(ROOT, 'data', slug + '.json'), 'utf8'));
const OUT = resolve(ROOT, 'out', slug);
mkdirSync(OUT, { recursive: true });

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const font = w => pathToFileURL(resolve(ROOT, 'fonts', `Pretendard-${w}.otf`)).href;
const logo = 'data:image/png;base64,' + readFileSync(resolve(ROOT, 'logo.png')).toString('base64');
const ymd = d.checked.replace(/-/g, '.');

const CSS = `
@font-face{font-family:P;font-weight:400;src:url(${font('Regular')})}
@font-face{font-family:P;font-weight:500;src:url(${font('Medium')})}
@font-face{font-family:P;font-weight:700;src:url(${font('Bold')})}
@font-face{font-family:P;font-weight:800;src:url(${font('ExtraBold')})}
@font-face{font-family:P;font-weight:900;src:url(${font('Black')})}
:root{--dk:#06301f;--g:#07803f;--lime:#d4f53c;--bg:#f2f6f1;--tx:#0b1a12;--mu:#55665c;--ln:#cfdcd3}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:var(--h);background:#fff;color:var(--tx);font-family:P,sans-serif;word-break:keep-all;-webkit-font-smoothing:antialiased;font-feature-settings:"tnum"}
.f{position:relative;width:1080px;height:var(--h);padding:72px 80px 64px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between;padding-bottom:26px;border-bottom:3px solid var(--dk)}
.logo{width:150px;height:35px;background:var(--dk);-webkit-mask:url(${logo}) left center/contain no-repeat}
.tag{font-size:26px;font-weight:700;color:var(--g);letter-spacing:-.2px}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font-size:21px;color:var(--mu);padding-top:22px;border-top:1px solid var(--ln)}
.foot b{font-weight:800;color:var(--dk);font-size:24px}
.hl{background:linear-gradient(transparent 58%,var(--lime) 58% 92%,transparent 92%)}
h1{font-weight:900;letter-spacing:-4px;color:var(--dk);line-height:1}
h2{font-weight:900;letter-spacing:-2.5px;color:var(--dk);line-height:1.08}
.kick{font-size:30px;font-weight:800;color:var(--g);margin-top:58px}
/* cover */
.big{font-size:230px;margin-top:20px}
.sub{font-size:52px;font-weight:800;letter-spacing:-1.5px;margin-top:18px;color:var(--tx)}
.dl{margin-top:64px;border-top:1px solid var(--ln)}
.dl div{display:grid;grid-template-columns:1fr 170px 170px;align-items:baseline;padding:26px 0;border-bottom:1px solid var(--ln)}
.dl span{font-size:40px;font-weight:800;letter-spacing:-1px}
.dl em{font-style:normal;text-align:right;font-size:26px;color:var(--mu);font-weight:600}
.dl em b{font-size:52px;font-weight:900;color:var(--dk);letter-spacing:-1px;margin-left:8px}
.dl .h{padding:0 0 12px;border:0}.dl .h em{font-size:22px;font-weight:700;color:var(--g)}
.swipe{margin-top:34px;font-size:26px;font-weight:700;color:var(--g)}
/* dept */
.dn{font-size:96px;margin-top:44px}
.tr{margin-top:46px}
.th{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:18px;border-bottom:2px solid var(--dk)}
.th .w{font-size:24px;font-weight:800;color:#fff;background:var(--g);padding:5px 14px;border-radius:4px;margin-right:16px;vertical-align:middle;position:relative;top:-6px}
.th .nm{font-size:42px;font-weight:800;letter-spacing:-1px}
.th .n{font-size:84px;font-weight:900;color:var(--dk);letter-spacing:-3px;line-height:.9}
.th .n small{font-size:34px;font-weight:800;letter-spacing:0;margin-left:4px}
.bar{display:flex;height:58px;margin-top:20px;border:2px solid var(--dk)}
.bar div{display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-size:24px;font-weight:800;border-right:2px solid var(--dk)}
.bar div:last-child{border-right:0}
.bar .on{background:var(--dk);color:#fff}.bar .on b{color:var(--lime)}
.bar b{font-size:28px;font-weight:900}
.stg{font-size:21px;color:var(--mu);margin-top:10px;font-weight:600}
.ev{margin-top:14px}
.ev div{display:flex;justify-content:space-between;align-items:baseline;padding:13px 0;border-bottom:1px solid var(--ln);font-size:31px;font-weight:700}
.ev b{font-size:33px;font-weight:900;color:var(--g)}
.nt{font-size:22px;color:var(--mu);margin-top:12px;font-weight:500}
.tight .tr{margin-top:30px}.tight .dn{margin-top:30px;font-size:88px}.tight .th .n{font-size:72px}.tight .bar{height:50px;margin-top:14px}.tight .ev{margin-top:8px}.tight .ev div{padding:9px 0;font-size:29px}.tight .ev b{font-size:30px}.tight .nt{margin-top:8px}
/* changes */
.cg{margin-top:44px}
.cg h3{font-size:34px;font-weight:900;color:var(--g);letter-spacing:-.5px;padding-bottom:12px;border-bottom:2px solid var(--dk)}
.cg li{list-style:none;font-size:31px;font-weight:700;padding:15px 0 15px 40px;border-bottom:1px solid var(--ln);position:relative;letter-spacing:-.5px}
.cg li:before{content:"";position:absolute;left:4px;top:27px;width:18px;height:18px;background:var(--lime);border:2px solid var(--dk)}
.cg li.same{color:var(--mu)}.cg li.same:before{background:#fff}
/* end */
.end{background:var(--dk);color:#fff}
.end .top{border-color:var(--lime)}.end .logo{background:#fff}.end .tag{color:var(--lime)}
.end h2{color:#fff;font-size:118px;margin-top:150px;letter-spacing:-4px}
.end h2 em{font-style:normal;color:var(--lime)}
.end p{font-size:36px;font-weight:600;color:rgba(255,255,255,.78);margin-top:36px;line-height:1.5}
.end .url{margin-top:70px;font-size:44px;font-weight:900;color:var(--lime);letter-spacing:-.5px}
.end .br{font-size:28px;font-weight:700;color:#fff;margin-top:14px}
.end .foot{color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.25)}.end .foot b{color:#fff}
/* story */
.st .big{font-size:220px}.st .sd{margin-top:60px}.st .sd>div{padding:44px 0}.st .sd h4{font-size:60px}.st .sd h4 span{font-size:34px}.st .sd p{font-size:33px;margin-top:16px;line-height:1.55}.st .cta{padding:42px 44px;font-size:40px}
.sd{margin-top:46px;border-top:3px solid var(--dk)}
.sd>div{padding:30px 0;border-bottom:1px solid var(--ln)}
.sd h4{display:flex;justify-content:space-between;align-items:baseline;font-size:46px;font-weight:900;letter-spacing:-1.5px;color:var(--dk)}
.sd h4 span{font-size:30px;font-weight:800;color:var(--g);letter-spacing:0}
.sd p{font-size:27px;font-weight:600;color:var(--mu);margin-top:10px;line-height:1.45}
.cta{margin-top:auto;background:var(--dk);color:#fff;padding:34px 40px;display:flex;justify-content:space-between;align-items:center;font-size:36px;font-weight:800}
.cta b{color:var(--lime);font-size:40px}
`;

const page = (inner, h, cls = '') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head><body style="--h:${h}px"><div class="f ${cls}">${inner}</div></body></html>`;
const top = () => `<div class="top"><div class="logo"></div><div class="tag">${d.year}학년도 전형계획</div></div>`;
const total = (dep, k) => dep.tracks.filter(t => t.when.startsWith(k)).reduce((a, t) => a + t.n, 0);

const slides = [];
const N = d.depts.length + 3;
const foot = i => `<div class="foot"><span>출처 · ${esc(d.source)} (${ymd} 확인)</span><b>${String(i).padStart(2, '0')} / ${String(N).padStart(2, '0')}</b></div>`;

// 1 표지
slides.push(page(`${top()}
<div class="kick">${d.year} 체육계열 실기전형</div>
<h1 class="big">${esc(d.short)}</h1>
<div class="sub"><span class="hl">${d.depts.length}개 학과</span> 수시·정시 한 번에</div>
<div class="dl"><div class="h"><span></span><em>수시</em><em>정시</em></div>
${d.depts.map(x => `<div><span>${esc(x.name)}</span><em><b>${total(x, '수시') || '-'}</b>명</em><em><b>${total(x, '정시') || '-'}</b>명</em></div>`).join('')}</div>
<div class="swipe">넘기면 학과별 반영비율·실기종목 →</div>
${foot(1)}`, 1350));

// 학과별
d.depts.forEach((x, i) => {
  slides.push(page(`${top()}
<h2 class="dn">${esc(x.name)}</h2>
${x.tracks.map(t => `<div class="tr"><div class="th"><div><span class="w">${esc(t.when)}</span><span class="nm">${esc(t.name)}</span></div><div class="n">${t.n}<small>명</small></div></div>
<div class="bar">${t.parts.map(([k, v]) => `<div class="${k === '실기' ? 'on' : ''}" style="flex:${v}"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>
<div class="stg">${esc(t.stage)}</div>
<div class="ev">${t.events.map(([e, p]) => `<div><span>${esc(e)}</span><b>${esc(p)}</b></div>`).join('')}</div>
<div class="nt">${esc(t.note)}</div></div>`).join('')}
${foot(i + 2)}`, 1350, x.tracks.reduce((a, t) => a + t.events.length, 0) > 4 ? 'tight' : ''));
});

// 변경점
slides.push(page(`${top()}
<h2 style="font-size:84px;margin-top:44px">2027과 <span class="hl">달라진 점</span></h2>
${d.depts.map(x => `<div class="cg"><h3>${esc(x.name)}</h3><ul>${x.changes.map(c => `<li class="${/동일/.test(c) ? 'same' : ''}">${esc(c)}</li>`).join('')}</ul></div>`).join('')}
${d.common?.length ? `<div class="cg"><h3>공통</h3><ul>${d.common.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
${foot(N - 1)}`, 1350));

// 마무리
slides.push(page(`${top()}
<h2>실기는<br><em>기록</em>이<br>점수입니다.</h2>
<p>${esc(d.short)} 실기 종목, 학원에서 배점표 기준으로<br>기록을 재고 점수로 바꿔 관리합니다.</p>
<div class="url">${SITE}</div>
<div class="br">피스톤체대입시 · 안산 고잔 · 시흥 배곧 · 시흥 장현</div>
<div class="foot"><span>세부 사항은 대학 모집요강으로 최종 확인하세요</span><b>${N} / ${N}</b></div>`, 1350, 'end'));

// 스토리
const story = page(`${top()}
<div class="kick">${d.year} 실기전형 요약</div>
<h1 class="big">${esc(d.short)}</h1>
<div class="sd">${d.depts.map(x => `<div><h4>${esc(x.name)}<span>수시 ${total(x, '수시')} · 정시 ${total(x, '정시')}명</span></h4>
<p>${x.tracks.map(t => `${esc(t.when.split(' ')[0])}: ${t.events.map(e => esc(e[0])).join(' · ')}`).join('<br>')}</p></div>`).join('')}</div>
<div class="cta"><span>반영비율·배점은 게시물에서</span><b>↓</b></div>
<div class="foot" style="border:0;padding-top:18px"><span>출처 · ${esc(d.source)}</span><b>${ymd}</b></div>`, 1920, 'st');

// 블로그 글
const blog = `# ${d.year}학년도 ${d.school} 체육계열 실기전형 정리 (${d.depts.map(x => x.name).join('·')})

${d.region} ${d.short} 체대입시를 준비한다면, ${d.year}학년도 전형계획에서 꼭 볼 것만 정리했습니다.

## 결론 먼저
${d.depts.map(x => `- **${x.name}**: 수시 ${total(x, '수시')}명 · 정시 ${total(x, '정시')}명 (${x.tracks.map(t => `${t.when.split(' ')[0]} ${t.events.map(e => e[0]).join('·')}`).join(' / ')})`).join('\n')}

[이미지: post-1.jpg]

${d.depts.map((x, i) => `## ${x.name}
${x.tracks.map(t => `### ${t.when} ${t.name} — ${t.n}명
- 반영비율: ${t.parts.map(([k, v]) => `${k} ${v}%`).join(' + ')} (${t.stage})
- 실기종목: ${t.events.map(([e, p]) => `${e} ${p}`).join(', ')}
- ${t.note}`).join('\n\n')}

[이미지: post-${i + 2}.jpg]`).join('\n\n')}

## 2027학년도와 달라진 점
${d.depts.map(x => `**${x.name}**\n${x.changes.map(c => `- ${c}`).join('\n')}`).join('\n\n')}
${d.common?.length ? `\n**공통**\n${d.common.map(c => `- ${c}`).join('\n')}` : ''}

[이미지: post-${N - 1}.jpg]

## 피스톤체대입시 안내
안산·시흥(배곧·장현) 피스톤체대입시는 ${d.short} 실기 종목을 배점표 기준으로 측정하고 점수로 관리합니다. 상담과 등록신청은 홈페이지에서 할 수 있어요.
👉 https://${SITE}

> 출처: ${d.source} (${ymd} 확인). 세부 사항은 대학 모집요강 발표 후 다시 확인하세요.

추천 태그: #${d.short}체대입시 #${d.short}${d.depts[0].name} #${d.year}체대입시 #체대입시 #체대실기 #안산체대입시 #시흥체대입시 #배곧체대입시 #피스톤체대입시 #${d.short}실기
`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await browser.newPage({ deviceScaleFactor: 1 });
async function shot(html, w, h, file) {
  const tmp = resolve(OUT, '_tmp.html');
  writeFileSync(tmp, html);
  await p.setViewportSize({ width: w, height: h });
  await p.goto(pathToFileURL(tmp).href);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: resolve(OUT, file), type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: w, height: h } });
}
for (let i = 0; i < slides.length; i++) await shot(slides[i], 1080, 1350, `post-${i + 1}.jpg`);
await shot(story, 1080, 1920, 'story.jpg');
await browser.close();
const { unlinkSync } = await import('node:fs'); unlinkSync(resolve(OUT, '_tmp.html'));
writeFileSync(resolve(OUT, 'blog.md'), blog);
writeFileSync(resolve(OUT, 'caption.txt'),
`${d.year} ${d.short} 체육계열 실기전형 한 번에 📌
${d.depts.map(x => `▪️ ${x.name} 수시 ${total(x, '수시')}명 · 정시 ${total(x, '정시')}명`).join('\n')}

넘겨서 학과별 반영비율·실기종목·2027 대비 변경점 확인하세요.
상담·등록신청은 프로필 링크(홈페이지)에서.

출처: ${d.source} (${ymd} 확인)

#${d.short}체대입시 #${d.year}체대입시 #체대입시 #체대실기 #체대입시학원 #안산체대입시 #시흥체대입시 #배곧체대입시 #장현체대입시 #피스톤체대입시 #제자리멀리뛰기 #체육교육과 #스포츠과학 #고3 #고2`);
console.log('done', OUT, slides.length, 'slides');

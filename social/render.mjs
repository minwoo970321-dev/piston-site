// 2028 전형계획 카드 렌더러: node social/render.mjs <slug>
// 결과: social/out/<slug>/post-1.jpg … (1080x1350), story.jpg (1080x1920), blog.md
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
const mode = process.argv[3]; // susi | jeongsi (생략하면 전체)
const MODE = { susi: ['수시', '정시'], jeongsi: ['정시', '수시'] }[mode];
if (!slug) { console.error('usage: node social/render.mjs <slug>'); process.exit(1); }
const d = JSON.parse(readFileSync(resolve(ROOT, 'data', slug + '.json'), 'utf8'));
const OUT = resolve(ROOT, 'out', slug + (mode ? '-' + mode : ''));
// 수시/정시 따로 만들기: 반대 시기 항목을 걸러낸다
if (MODE) {
  const [LB, OTHER] = MODE;
  const strip = c => c.replace(/^(수시|정시) /, '');
  // 실기전형만: 학생부종합·교과 환산 관련 항목은 뺀다
  const drop = c => c.startsWith(OTHER) || /학생부종합|교과성적/.test(c);
  d.depts = d.depts.map(x => ({ ...x, tracks: x.tracks.filter(t => t.when.startsWith(LB)), changes: x.changes.filter(c => !drop(c)).map(strip) }));
  d.common = [];
  d.tables = (d.tables || []).filter(t => t.only === '정시' ? LB === '정시' : !/학생부종합/.test(t.title) && !(LB === '정시' && /내신 환산/.test(t.title))).map(t => {
    if (!t.title.startsWith('검정고시') || LB === '수시') return t;
    const blocks = t.blocks.filter(b => /학교폭력/.test(b.cap || '')).map(b => {
      const keep = b.head.map((h, k) => k === 0 || (LB === '수시' ? /수시 실기/.test(h) : h === '정시'));
      return { ...b, hl: undefined, head: b.head.filter((_, k) => keep[k]).map((h, k) => k && LB === '수시' ? '수시 실기우수자' : h), rows: b.rows.map(r => r.filter((_, k) => keep[k])) };
    });
    return { ...t, title: '학교폭력 감점', blocks, notes: (t.notes || []).filter(n => /학폭/.test(n)) };
  });
  d.noGrade = LB === '정시'; // 내신 9등급 vs 5등급·내신 환산표는 수시 실기우수자 환산에 쓰이므로 수시에만 둠
}
const LBL = MODE ? MODE[0] : '수시·정시';
const G = (d.noGrade || d.hideGrade) ? 0 : 1;
const TAG = d.cntTag || '';
const cnt = x => MODE ? `${LBL}${TAG} ${total(x, LBL)}명` : `수시 ${total(x, '수시')}명 · 정시 ${total(x, '정시')}명`;
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
.brand{display:flex;align-items:center;gap:18px}.brand span{font-size:30px;font-weight:900;color:var(--dk);letter-spacing:-.5px;padding-left:18px;border-left:2px solid var(--ln)}.end .brand span{color:#fff;border-color:rgba(255,255,255,.3)}
.tag{font-size:34px;font-weight:900;color:var(--lime);background:var(--dk);padding:10px 24px;border-radius:6px;letter-spacing:-.5px}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font-size:21px;color:var(--mu);padding-top:22px;border-top:1px solid var(--ln)}
.foot b{white-space:nowrap;margin-left:16px;font-weight:800;color:var(--dk);font-size:24px}
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
.dl.one div{grid-template-columns:1fr 200px}.dl .h{padding:0 0 12px;border:0}.dl .h em{font-size:22px;font-weight:700;color:var(--g)}
.swipe{margin-top:34px;font-size:26px;font-weight:700;color:var(--g)}
/* dept */
.dn{font-size:96px;margin-top:44px}
.tr{margin-top:46px}
.th{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:18px;border-bottom:2px solid var(--dk)}
.th .w{font-size:32px;font-weight:800;color:#fff;background:var(--g);padding:5px 14px;border-radius:4px;margin-right:16px;vertical-align:middle;position:relative;top:-6px}
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
/* grades */
.gs{margin-top:40px}.gs .lb{display:flex;justify-content:space-between;font-size:28px;font-weight:800;margin:26px 0 10px}.gs .lb span{color:var(--mu);font-weight:600;font-size:23px}
.sc{display:flex;height:64px;border:2px solid var(--dk)}.sc div{border-right:2px solid var(--dk);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:var(--dk)}.sc div:last-child{border-right:0}.sc .one{background:var(--lime)}
.cmp{margin-top:34px;border-top:2px solid var(--dk)}.cmp div{display:grid;grid-template-columns:1fr 200px 60px 200px;align-items:baseline;padding:16px 0;border-bottom:1px solid var(--ln);font-size:30px;font-weight:700}
.cmp em{font-style:normal;text-align:right;font-weight:900;font-size:34px;color:var(--mu)}.cmp em.n{color:var(--g)}.cmp i{font-style:normal;text-align:center;color:var(--mu)}
.cmp .h{font-size:21px;color:var(--mu);font-weight:700;padding:10px 0}.cmp .h em{font-size:21px}
.gbox{margin-top:30px;background:var(--bg);padding:24px 28px;font-size:25px;line-height:1.55;font-weight:600}.gbox b{color:var(--dk);font-weight:900}
.gt{width:100%;border-collapse:collapse;margin-top:12px;font-size:24px;text-align:center}.gt th,.gt td{border:1px solid var(--ln);padding:8px 4px}.gt th{background:#fff;color:var(--mu);font-weight:700}.gt td{font-weight:800}
.ctight h2{font-size:72px!important;margin-top:32px!important}.ctight .cg{margin-top:26px}.ctight .cg h3{font-size:30px;padding-bottom:8px}.ctight .cg li{font-size:27px;padding:9px 0 9px 36px}.ctight .cg li:before{top:19px;width:16px;height:16px}
/* tables */
.ttl{font-size:72px;margin-top:34px;max-width:780px}.tsub{max-width:790px;font-size:26px;font-weight:700;color:var(--g);margin-top:12px}
.tcap{font-size:28px;font-weight:900;color:var(--dk);margin:30px 0 10px}
.tb{width:100%;border-collapse:collapse;margin-top:22px;font-size:27px}.tcap+.tb{margin-top:0}
.tb th{background:var(--dk);color:#fff;font-weight:800;padding:12px 8px;font-size:23px}
.tb td{padding:8px 8px;text-align:center;border-bottom:1px solid var(--ln);font-weight:600}
.tb td.c0{font-weight:800;text-align:center}.tb td.h{font-weight:900;color:var(--g)}
.tb tr.hr td{background:var(--bg);font-weight:900;color:var(--dk)}
.tb.xdense{font-size:20px}.tb.xdense td{padding:1px 6px;line-height:1.25}.tb.xdense th{padding:5px 6px;font-size:19px;line-height:1.2}.tb.dense{font-size:23px}.tb.dense td{padding:4px 8px}.tb.dense th{padding:9px 8px}
.tb tr:nth-child(odd) td{background:#fafcfa}
.tn{margin-top:20px;list-style:none}.tn li{font-size:22px;color:var(--mu);font-weight:600;padding:3px 0 3px 22px;position:relative;line-height:1.45}.tn li:before{content:"※";position:absolute;left:0}
/* changes */
.cg{margin-top:44px}.dc{margin-top:48px}
.cg h3{font-size:34px;font-weight:900;color:var(--g);letter-spacing:-.5px;padding-bottom:12px;border-bottom:2px solid var(--dk)}
.cg li{list-style:none;font-size:31px;font-weight:700;padding:15px 0 15px 40px;border-bottom:1px solid var(--ln);position:relative;letter-spacing:-.5px}
.cg li:before{content:"";position:absolute;left:4px;top:27px;width:18px;height:18px;background:var(--lime);border:2px solid var(--dk)}
.cg li.same{color:var(--mu)}.cg li.same:before{background:#fff}
/* end */
.end{background:var(--dk);color:#fff}
.end .top{border-color:var(--lime)}.end .logo{background:#fff}.end .brand{display:flex;align-items:center;gap:18px}.brand span{font-size:30px;font-weight:900;color:var(--dk);letter-spacing:-.5px;padding-left:18px;border-left:2px solid var(--ln)}.end .brand span{color:#fff;border-color:rgba(255,255,255,.3)}
.end .tag{color:var(--dk);background:var(--lime)}
.end h2{color:#fff;font-size:150px;margin-top:40px;letter-spacing:-6px;line-height:1.04;position:relative}
.end .wm{position:absolute;left:-40px;right:-200px;bottom:90px;height:360px;background:rgba(255,255,255,.07);-webkit-mask:url(${logo}) right center/contain no-repeat;mask:url(${logo}) right center/contain no-repeat}
.end .kk{margin-top:110px;font-size:28px;font-weight:900;letter-spacing:10px;color:var(--lime);display:flex;align-items:center;gap:18px}
.end .kk:before{content:"";width:70px;height:6px;background:var(--lime)}
.end .pb{display:inline-block;background:var(--lime);color:var(--dk);padding:0 26px 8px;margin-top:14px;letter-spacing:-5px}
.end .sl{margin-top:64px;display:flex;flex-direction:column;gap:6px;font-size:84px;font-weight:900;letter-spacing:-3px;color:#fff;position:relative}
.end .sl .lm{color:var(--lime)}
.end .foot{position:relative}
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

const schoolLogo = d.logo ? 'data:image/png;base64,' + readFileSync(resolve(ROOT, d.logo)).toString('base64') : '';
const page = (inner, h, cls = '') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}.sch{position:absolute;right:80px;top:182px;width:132px;height:132px}.cover .sch{top:215px;width:310px;height:310px}.st .sch{top:250px;width:150px;height:150px}</style></head><body style="--h:${h}px"><div class="f ${cls}">${inner}${schoolLogo && !/\bend\b/.test(cls) ? `<img class="sch" src="${schoolLogo}" alt="">` : ''}</div></body></html>`;
const top = () => `<div class="top"><div class="brand"><div class="logo"></div><span>안산시흥피스톤</span></div><div class="tag">${d.year} ${MODE ? LBL + ' 실기전형' : '전형계획'}</div></div>`;
const total = (dep, k) => dep.tracks.filter(t => t.when.startsWith(k)).reduce((a, t) => a + t.n, 0);

function gradeSlide() {
  const nine = [4, 7, 12, 17, 20, 17, 12, 7, 4], five = [10, 24, 32, 24, 10];
  const bar = a => `<div class="sc">${a.map((v, i) => `<div class="${i ? '' : 'one'}" style="flex:${v}">${i + 1}</div>`).join('')}</div>`;
  const g = d.grades;
  const box = g && g.five ? `<div class="gbox"><b>${esc(d.short)} ${d.year} 내신 등급별 점수</b>${g.note ? ` · ${esc(g.note)}` : ''}
<table class="gt"><tr><th></th>${g.nine ? g.nine.map((_, i) => `<th>${i + 1}</th>`).join('') : g.five.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr>
<tr><th>5등급</th>${g.five.map(v => `<td>${esc(v)}</td>`).join('')}${g.nine ? '<td></td>'.repeat(g.nine.length - g.five.length) : ''}</tr>
${g.nine ? `<tr><th>9등급</th>${g.nine.map(v => `<td>${esc(v)}</td>`).join('')}</tr>` : ''}</table></div>`
    : d.gradeRef ? `<div class="gbox"><b>${esc(d.gradeRef)}</b> →</div>` : '';
  return `${top()}
<h2 style="font-size:80px;margin-top:44px">내신 <span class="hl">9등급 vs 5등급</span></h2>
<div style="font-size:28px;font-weight:600;color:var(--mu);margin-top:16px">2025년 고1 입학생(${d.year}학년도 수험생)부터 내신 5등급 상대평가</div>
<div class="gs"><div class="lb">9등급제<span>기존 · 졸업생 성적</span></div>${bar(nine)}<div class="lb">5등급제<span>${d.year} 재학생</span></div>${bar(five)}</div>
<div class="cmp"><div class="h"><span>누적 비율</span><em>9등급제</em><i></i><em>5등급제</em></div>
<div><span>1등급</span><em>상위 4%</em><i>→</i><em class="n">상위 10%</em></div>
<div><span>2등급까지</span><em>11%</em><i>→</i><em class="n">34%</em></div>
<div><span>3등급까지</span><em>23%</em><i>→</i><em class="n">66%</em></div></div>
<div style="font-size:20px;color:var(--mu);margin-top:10px">등급 비율 출처 · 교육부 2028 대입제도 개편안 (2023.12 확정)</div>
${box}
${foot(N - 1 - T.length)}`;
}

const slides = [];
const T = d.tables || [];
const SECS = [...d.depts.map(x => [x.name, x.changes]), ...(d.common?.length ? [['공통', d.common]] : [])];
const CP = []; if (!MODE) { let cur = [], n = 0; for (const sec of SECS) { const w = sec[1].length + 1; if (cur.length && n + w > (MODE ? 15 : 12)) { CP.push(cur); cur = []; n = 0; } cur.push(sec); n += w; } if (cur.length) CP.push(cur); }
const N = d.depts.length + 2 + G + CP.length + T.length;
const foot = i => `<div class="foot"><span>출처 · ${esc(d.source)} (${ymd} 확인)</span><b>${String(i).padStart(2, '0')} / ${String(N).padStart(2, '0')}</b></div>`;

// 1 표지
slides.push(page(`${top()}
<div class="kick">${d.year} 체육계열 ${MODE ? LBL + ' ' : ''}실기전형${d.campus ? ' · ' + esc(d.campus) : ''}</div>
<h1 class="big">${esc(d.short)}</h1>
<div class="sub"><span class="hl">${d.depts.length}개 ${d.unitLabel || "학과"}</span> ${LBL} 한 번에</div>
<div class="dl ${MODE ? 'one' : ''}"><div class="h"><span></span>${(MODE ? [LBL] : ['수시', '정시']).map(k => `<em>${k}${TAG}</em>`).join('')}</div>
${d.depts.map(x => `<div><span>${esc(x.name)}</span>${(MODE ? [LBL] : ['수시', '정시']).map(k => `<em><b>${total(x, k) || '-'}</b>명</em>`).join('')}</div>`).join('')}</div>
<div class="swipe">넘기면 학과별 반영비율·변경점 →</div>
${foot(1)}`, 1350, 'cover'));

// 학과별
d.depts.forEach((x, i) => {
  slides.push(page(`${top()}
<h2 class="dn">${esc(x.name)}</h2>
${x.tracks.map(t => `<div class="tr"><div class="th"><div><span class="w">${esc(t.when)}</span><span class="nm">${esc(t.name)}</span></div><div class="n">${t.n}<small>명</small></div></div>
<div class="bar">${t.parts.map(([k, v]) => `<div class="${k === '실기' ? 'on' : ''}" style="flex:${v}"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>
<div class="stg">${esc(t.stage)}</div>
<div class="ev">${(t.altEv || t.events).map(([e, p]) => `<div><span>${esc(e)}</span><b>${esc(p)}</b></div>`).join('')}</div>
<div class="nt">${esc(t.note)}</div></div>`).join('')}
${MODE && x.changes.length ? `<div class="cg dc"><h3>2027과 달라진 점</h3><ul>${x.changes.map(c => `<li class="${/동일/.test(c) ? 'same' : ''}">${esc(c)}</li>`).join('')}</ul></div>` : ''}
${foot(i + 2)}`, 1350, x.tracks.reduce((a, t) => a + t.events.length, 0) > 4 ? 'tight' : ''));
});

// 변경점 (항목이 많으면 여러 장)
CP.forEach((pg, k) => slides.push(page(`${top()}
<h2 style="font-size:84px;margin-top:44px">2027과 <span class="hl">달라진 점</span>${CP.length > 1 ? `<span style="font-size:40px;color:var(--mu)"> ${k + 1}/${CP.length}</span>` : ''}</h2>
${pg.map(([nm, items]) => `<div class="cg"><h3>${esc(nm)}</h3><ul>${items.map(c => `<li class="${/동일/.test(c) ? 'same' : ''}">${esc(c)}</li>`).join('')}</ul></div>`).join('')}
${foot(d.depts.length + 2 + k)}`, 1350, pg.reduce((a, x) => a + x[1].length, 0) > 8 ? 'ctight' : '')));

// 내신 9등급 vs 5등급
if (G) slides.push(page(gradeSlide(), 1350));

// 표 장 (시행계획 세부 규정)
T.forEach((t, i) => slides.push(page(`${top()}
<h2 class="ttl">${esc(t.title)}</h2>${t.sub ? `<div class="tsub">${esc(t.sub)}</div>` : ''}
${t.blocks.map(b => `${b.cap ? `<div class="tcap">${esc(b.cap)}</div>` : ''}<table class="tb${t.dense === 'x' ? ' xdense' : t.dense ? ' dense' : ''}"><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
${b.rows.map((r, ri) => `<tr class="${b.hlRow === ri ? 'hr' : ''}">${r.map((c, ci) => `<td class="${((b.hl || []).includes(ci) || /→/.test(c)) ? 'h' : ''}${ci === 0 ? ' c0' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}
${t.notes?.length ? `<ul class="tn">${t.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
${foot(N - 1 - T.length + i + 1)}`, 1350)));

// 마무리
slides.push(page(`${top()}
<div class="wm"></div>
<div class="kk">PISTON</div>
<h2>체대입시는<br><span class="pb">피스톤</span></h2>
<div class="sl"><span>같은 성적,</span><span class="lm">다른 결과</span></div>
<div class="foot"><span>세부 사항은 대학 모집요강으로 최종 확인하세요</span><b>${N} / ${N}</b></div>`, 1350, 'end'));

// 스토리
const story = page(`${top()}
<div class="kick">${d.year} 실기전형 요약${d.campus ? ' · ' + esc(d.campus) : ''}</div>
<h1 class="big">${esc(d.short)}</h1>
<div class="sd">${d.depts.map(x => `<div><h4>${esc(x.name)}<span>${cnt(x)}</span></h4>
<p>${x.tracks.map(t => `${esc(t.when.split(' ')[0])}: ${t.events.map(e => esc(e[0])).join(' · ')}`).join('<br>')}</p></div>`).join('')}</div>
<div class="cta"><span>반영비율·변경점은 게시물에서</span><b>↓</b></div>
<div class="foot" style="border:0;padding-top:18px"><span>출처 · ${esc(d.source)}</span><b>${ymd}</b></div>`, 1920, 'st');

// 블로그 글
const blog = `# ${d.year}학년도 ${d.school} 체육계열 ${MODE ? LBL + ' ' : ''}실기전형 정리 (${d.depts.map(x => x.name).join('·')})

${d.region} ${d.short} 체대입시를 준비한다면, ${d.year}학년도 전형계획에서 꼭 볼 것만 정리했습니다.

## 결론 먼저
${d.depts.map(x => `- **${x.name}**: ${cnt(x)} (${x.tracks.map(t => `${t.when.split(' ')[0]} ${t.events.map(e => e[0]).join('·')}`).join(' / ')})`).join('\n')}

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

${CP.map((_, k) => `[이미지: post-${d.depts.length + 2 + k}.jpg]`).join('\n')}

${G ? `## 내신 9등급 vs 5등급
${d.year}학년도 수험생(2025년 고1 입학생)부터 내신이 5등급 상대평가로 바뀝니다.
- 1등급: 상위 4% → 상위 10%
- 2등급까지: 누적 11% → 34%
- 3등급까지: 누적 23% → 66%
${d.gradeNote ? `- ${d.gradeNote}` : ''}
${d.grades && d.grades.five ? `\n${d.short} ${d.year} 내신 등급별 점수(5등급): ${d.grades.five.join(' / ')}${d.grades.nine ? `\n9등급(졸업생): ${d.grades.nine.join(' / ')}` : ''}` : ''}

[이미지: post-${N - 1 - T.length}.jpg]

` : ''}${T.map((t, i) => `## ${t.title}${t.sub ? ` (${t.sub})` : ''}
${t.blocks.map(b => `${b.cap ? `**${b.cap}**\n\n` : ''}| ${b.head.join(' | ')} |
| ${b.head.map(() => '---').join(' | ')} |
${b.rows.map(r => `| ${r.join(' | ')} |`).join('\n')}`).join('\n\n')}
${(t.notes || []).map(n => `\n※ ${n}`).join('')}

[이미지: post-${N - T.length + i}.jpg]`).join('\n\n')}

## 안산시흥피스톤 안내
안산시흥피스톤(안산 고잔·시흥 배곧·시흥 장현)은 ${d.short} 실기 종목을 측정하고 기록으로 관리합니다. 상담과 등록신청은 홈페이지에서 할 수 있어요.
👉 https://${SITE}

[이미지: post-${N}.jpg]

> 출처: ${d.source} (${ymd} 확인). 세부 사항은 대학 모집요강으로 최종 확인하세요.

추천 태그: #${d.short}체대입시 #${d.short}${d.depts[0].name} #${d.year}체대입시 #체대입시 #체대실기 #안산체대입시 #시흥체대입시 #배곧체대입시 #안산시흥피스톤 #피스톤체대입시 #${d.short}실기
`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await browser.newPage({ deviceScaleFactor: 1 });
async function shot(html, w, h, file) {
  const tmp = resolve(OUT, '_tmp.html');
  writeFileSync(tmp, html);
  await p.setViewportSize({ width: w, height: h });
  await p.goto(pathToFileURL(tmp).href);
  await p.evaluate(() => document.fonts.ready);
  const over = await p.evaluate(() => { const f = document.querySelector('.f'); return f.scrollHeight - f.clientHeight; });
  if (over > 0) console.warn('넘침 경고', file, over + 'px');
  await p.screenshot({ path: resolve(OUT, file), type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: w, height: h } });
}
for (let i = 0; i < slides.length; i++) await shot(slides[i], 1080, 1350, `post-${i + 1}.jpg`);
await shot(story, 1080, 1920, 'story.jpg');
await browser.close();
const { unlinkSync } = await import('node:fs'); unlinkSync(resolve(OUT, '_tmp.html'));
writeFileSync(resolve(OUT, 'blog.md'), blog);
const capOverride = resolve(ROOT, 'data', `caption-${slug}${mode ? '-' + mode : ''}.txt`);
if (existsSync(capOverride)) writeFileSync(resolve(OUT, 'caption.txt'), readFileSync(capOverride, 'utf8').trim());
else writeFileSync(resolve(OUT, 'caption.txt'),
`${d.year} ${d.short} 체육계열 ${MODE ? LBL + ' ' : ''}실기전형 한 번에 📌
${d.depts.map(x => `▪️ ${x.name} ${cnt(x)}`).join('\n')}

넘겨서 학과별 반영비율·2027 대비 변경점 확인하세요.
안산시흥피스톤 · 상담·등록신청은 프로필 링크(홈페이지)에서.

출처: ${d.source} (${ymd} 확인)

#${d.short}체대입시 ${MODE ? `#${d.short}${LBL} ` : ''}#${d.year}체대입시 #체대입시 #체대실기 #체대입시학원 #안산체대입시 #시흥체대입시 #배곧체대입시 #장현체대입시 #안산시흥피스톤 #피스톤체대입시 #제자리멀리뛰기 #체육교육과 #스포츠과학 #고3 #고2`);
console.log('done', OUT, slides.length, 'slides');

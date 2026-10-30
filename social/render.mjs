// 2028 전형계획 카드 렌더러: node social/render.mjs <slug>
// 결과: social/out/<slug>/post-1.jpg … (1080x1440), story.jpg (1080x1920), blog.md
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
.cover .bd{align-self:flex-start;display:inline-block;margin-top:30px;font-size:34px;font-weight:900;color:var(--dk);background:var(--lime);padding:10px 22px;border-radius:10px}.cover .dl{margin-top:44px}.cover .dl div{padding:30px 0}.cover .dl span{font-size:54px}.cover .dl em b{font-size:74px}.cover .swipe{margin-top:34px;font-size:32px}
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
.sn{width:100%;border-collapse:collapse;margin-top:18px;border:2px solid var(--dk);table-layout:fixed}
.sn th{background:var(--dk);color:var(--lime);font-size:30px;font-weight:800;padding:14px 8px;text-align:center;border-left:1px solid rgba(255,255,255,.25)}
.sn td{padding:22px 8px;font-size:46px;font-weight:900;color:var(--g);text-align:center;border-left:1px solid var(--ln)}
.rfbig td{font-size:38px;padding:40px 12px;font-weight:900}.rfbig td.c0{font-size:44px;white-space:nowrap}.rfbig td:nth-child(2){white-space:nowrap;font-size:34px}.rfbig th{font-size:30px;padding:18px 12px}
.rm{margin-top:34px;display:flex;flex-direction:column;gap:22px}
.rm .cd{border:2px solid var(--dk);border-radius:14px;padding:30px 34px}
.rm .cd.dk{background:var(--dk);color:#fff}
.rm .hd{display:flex;align-items:baseline;justify-content:space-between}
.rm .hd b{font-size:54px;font-weight:900;letter-spacing:-2px}
.rm .hd span{font-size:30px;font-weight:800;color:var(--g)}.rm .dk .hd span{color:var(--lime)}
.rm .ch{display:flex;margin-top:22px;border-top:2px solid var(--ln);padding-top:22px}.rm .dk .ch{border-color:rgba(255,255,255,.25)}
.rm .ch div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;text-align:center;border-left:2px solid var(--ln)}.rm .dk .ch div{border-color:rgba(255,255,255,.25)}.rm .ch div:first-child{border-left:0}
.rm .ch em{display:block;font-style:normal;font-size:28px;font-weight:700;color:var(--mu)}.rm .dk .ch em{color:rgba(255,255,255,.8)}
.rm .ch strong{display:block;font-size:66px;font-weight:900;color:var(--g);letter-spacing:-2px;line-height:1.15}.rm .dk .ch strong{color:var(--lime)}
.rm .ch div:has(>p){justify-content:center}.rm .ch p{margin:0;font-size:36px;font-weight:800;line-height:1.35;text-align:center;width:100%}
.rm.r3{gap:14px;margin-top:22px}.rm.r3 .cd{padding:18px 30px}.rm.r3 .hd b{font-size:44px}.rm.r3 .ch{margin-top:12px;padding-top:12px}.rm.r3 .ch strong{font-size:52px}.rm.r3 .ch p{font-size:32px}
.rm .tg{font-style:normal;font-size:34px;font-weight:900;letter-spacing:-1px;color:var(--dk);background:var(--lime);padding:4px 16px;border-radius:8px;margin-left:18px;position:relative;top:-6px}
.sm{margin-top:26px;display:flex;flex-direction:column;gap:20px}
.sm .cd{border:2px solid var(--dk);border-radius:14px;padding:24px 30px}
.sm .hd{display:flex;align-items:baseline;justify-content:space-between}
.sm .hd b{font-size:50px;font-weight:900;letter-spacing:-2px}.sm .hd span{font-size:28px;font-weight:800;color:var(--g)}
.sm .bar{margin-top:14px;height:50px}
.sm .rw{display:flex;gap:16px;align-items:center;margin-top:14px}
.sm .rw em{flex:0 0 74px;font-style:normal;font-size:26px;font-weight:900;color:#fff;background:var(--dk);text-align:center;padding:6px 0;border-radius:6px}
.sm .rw p{margin:0;font-size:32px;font-weight:800;letter-spacing:-1px}
.sm .rw p i{font-style:normal;font-size:22px;font-weight:700;color:var(--mu);margin-left:6px}
.sm .cg{margin-top:16px;padding-top:14px;border-top:2px solid var(--ln);display:flex;flex-wrap:wrap;gap:10px}
.sm .cg span{font-size:26px;font-weight:800;background:var(--lime);color:var(--dk);padding:6px 14px;border-radius:8px}
.rm .nt{font-size:25px;color:var(--mu);font-weight:600;line-height:1.5;margin:6px 4px 0}
.sn td small{display:block;font-size:24px;font-weight:700;color:var(--tx);margin-top:8px;letter-spacing:-.5px;line-height:1.3}
.sn td.no{font-size:30px;color:var(--mu);font-weight:700}
.rf{width:100%;border-collapse:collapse;margin-top:18px;border:2px solid var(--dk)}
.rf th{background:var(--dk);color:var(--lime);font-size:26px;font-weight:800;padding:12px 18px;text-align:left}
.rf th:last-child{text-align:right}
.rf td{padding:15px 18px;border-top:1px solid var(--ln);font-size:30px;font-weight:700;color:var(--dk)}
.rf td:first-child{background:#eef5ef;width:36%;font-weight:800}
.rf td:last-child{text-align:right;font-weight:900;color:var(--g)}
.rf{border:none!important;border-collapse:separate!important;border-spacing:0 10px;margin-top:8px!important}
.rf tr:first-child{display:none}
.rf td{border:none!important;padding:16px 20px!important;font-size:28px!important;font-weight:800!important}
.rf td:first-child{background:var(--dk)!important;color:var(--lime)!important;width:30%;font-size:26px!important;border-radius:12px 0 0 12px}
.rf td:last-child{background:#eef5ef!important;color:var(--dk)!important;text-align:left!important;border-radius:0 12px 12px 0;line-height:1.35}
.mn{display:flex;gap:16px;align-items:center;margin-top:18px;background:var(--lime);border:3px solid var(--dk);border-radius:14px;padding:14px 20px}
.mn b{background:var(--dk);color:var(--lime);font-size:26px;padding:5px 14px;border-radius:8px;white-space:nowrap;font-weight:900}
.mn span{font-size:30px;font-weight:900;color:var(--dk);line-height:1.3;letter-spacing:-.5px}
.sm .mn{margin-top:12px;padding:10px 16px}.sm .mn span{font-size:25px}.sm .mn b{font-size:22px}
.tight .rf td{padding:11px 16px;font-size:28px}
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
.ttl{font-size:68px;margin-top:26px;max-width:780px}.tsub{max-width:800px;font-size:34px;font-weight:900;letter-spacing:-1px;color:var(--g);margin-top:8px;line-height:1.2}
.tcap{font-size:28px;font-weight:900;color:var(--dk);margin:30px 0 10px}
.tb{width:100%;border-collapse:collapse;margin-top:22px;font-size:27px}.tcap+.tb{margin-top:0}
.tb th{background:var(--dk);color:#fff;font-weight:800;padding:12px 8px;font-size:23px}
.tb td{padding:8px 8px;text-align:center;border-bottom:1px solid var(--ln);font-weight:600}
.tb td.c0{font-weight:800;text-align:center}.tb td.h{font-weight:900;color:var(--g)}
.tb tr.hr td{background:var(--bg);font-weight:900;color:var(--dk)}
.tb.mdense{font-size:23px}.tb.mdense td{padding:11px 4px;line-height:1.2}.tb.mdense th{padding:10px 4px;font-size:21px;line-height:1.25}.tb.mdense td.c0{white-space:nowrap;font-size:22px}
.tb.xdense{font-size:20px}.tb.xdense td{padding:1px 6px;line-height:1.25}.tb.xdense th{padding:5px 6px;font-size:19px;line-height:1.2}.tb.xxdense{font-size:19px}.tb.xxdense td{padding:0 6px;line-height:1.2}.tb.xxdense th{padding:4px 6px;font-size:18px;line-height:1.2}.tb.dense{font-size:23px}.tb.dense td{padding:4px 8px}.tb.dense th{padding:9px 8px}
.tb td.chg{color:var(--g);font-weight:900}.tb td.old{color:#9aa39d}
.tb tr:nth-child(odd) td{background:#fafcfa}
.tb th.gh{background:var(--g);font-size:25px;padding:8px 4px;border-left:3px solid #fff}.tb th.gh:first-child{border-left:0}.tb td.scr{background:#e9f6ee!important;color:var(--dk);font-weight:900}.tb td.gs{border-left:3px solid var(--dk)}.tb.sgt tr:nth-child(even) td:not(.scr){background:#f6faf7}
.tn{margin-top:20px;list-style:none}.tn li{font-size:25px;color:var(--dk);font-weight:700;padding:6px 0 6px 28px;position:relative;line-height:1.45}.tn li:before{content:"※";position:absolute;left:0}
/* changes */
.cg{margin-top:44px}.dc{margin-top:30px}
.cg h3{font-size:34px;font-weight:900;color:var(--g);letter-spacing:-.5px;padding-bottom:12px;border-bottom:2px solid var(--dk)}
.cg li{list-style:none;font-size:31px;font-weight:700;padding:15px 0 15px 40px;border-bottom:1px solid var(--ln);position:relative;letter-spacing:-.5px}
.cg li:before{content:"";position:absolute;left:4px;top:27px;width:18px;height:18px;background:var(--lime);border:2px solid var(--dk)}
.cc{margin-top:16px}.cc .cl{font-size:28px;font-weight:900;color:var(--g);margin-bottom:6px}
.cc .cv{display:flex;align-items:stretch;gap:12px}.cc .cv>div{border-radius:14px;padding:11px 18px}
.cc .b{flex:1;background:#f1f3f2;color:var(--mu)}.cc .a{flex:1;background:var(--lime);color:var(--dk);border:2px solid var(--dk)}
.cc .pt{display:inline-block;margin:3px 6px 3px 0;padding:3px 12px;border-radius:9px;background:rgba(255,255,255,.7);font-size:25px;line-height:1.3}.cc .b .pt{background:#fff}.cc .pt b{font-size:29px;font-weight:900;color:var(--g)}.cc .b .pt b{color:var(--dk)}.cs .pt{display:inline-block;margin:3px 6px 3px 0;padding:2px 12px;border-radius:9px;background:#f1f3f2;color:var(--dk);font-size:24px;font-weight:800}
.cc em{font-style:normal;font-size:22px;font-weight:900;letter-spacing:0;display:block;margin-bottom:2px;opacity:.75}
.cc p{font-size:26px;font-weight:800;line-height:1.35;letter-spacing:-.5px;margin:0}
.cc .ar{display:flex;align-items:center;font-size:36px;font-weight:900;color:var(--g);padding:0!important}
.cs{margin-top:18px;padding:12px 20px;border:2px dashed var(--ln);border-radius:14px;font-size:25px;font-weight:700;color:var(--mu);line-height:1.5}
.cs b{display:inline-block;background:var(--dk);color:#fff;font-size:22px;padding:2px 12px;border-radius:6px;margin-right:12px}
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
const BIGCH = !!MODE && d.depts.some(x => x.changes.filter(c => c.includes('→')).length > 2);
const CP = []; if (!MODE || BIGCH) { let cur = [], n = 0; for (const sec of SECS) { const w = sec[1].length + 1; if (cur.length && n + w > (MODE ? 15 : 12)) { CP.push(cur); cur = []; n = 0; } cur.push(sec); n += w; } if (cur.length) CP.push(cur); }
const S = d.summary ? 1 : 0;
const N = S + d.depts.length + 2 + G + CP.length + T.length;
const foot = i => `<div class="foot"><span>출처 · ${esc(d.source)} (${ymd} 확인)</span><b>${String(i).padStart(2, '0')} / ${String(N).padStart(2, '0')}</b></div>`;

const smSlide = () => `<h2 class="ttl">한눈에 보기</h2><div class="tsub">${esc(d.short)} ${LBL} · ${d.year}학년도 시행계획</div><div class="sm">${d.summary.map(x => `<div class="cd"><div class="hd"><b>${esc(x.name)}</b><span>${esc(x.meta)}</span></div><div class="bar">${x.parts.map(([k, v]) => `<div class="${k === '실기' ? 'on' : ''}" style="flex:${v}"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>${x.min ? `<div class="mn"><b>수능최저</b><span>${esc(x.min)}</span></div>` : ''}<div class="rw"><em>${esc(x.sul || "수능")}</em><p>${esc(x.su)}</p></div><div class="rw"><em>실기</em><p>${esc(x.sg)}${x.sgn ? `<i>${esc(x.sgn)}</i>` : ''}</p></div><div class="cg">${x.ch.map(c => `<span>${esc(c)}</span>`).join('')}</div></div>`).join('')}</div>`;
// 1 표지
slides.push(page(`${top()}
<div class="kick">${d.year} 체육계열 ${MODE ? LBL + ' ' : ''}실기전형${d.campus ? ' · ' + esc(d.campus) : ''}</div>
<h1 class="big"${d.short.length>3?' style="font-size:170px"':''}>${esc(d.short)}</h1>
<div class="sub"><span class="hl">${d.depts.length}개 ${d.unitLabel || "학과"}</span> ${LBL} 한 번에</div><div class="bd">${d.year}학년도 변경사항 총정리</div>
<div class="dl ${MODE ? 'one' : ''}"><div class="h"><span></span>${(MODE ? [LBL] : ['수시', '정시']).map(k => `<em>${k}${TAG}</em>`).join('')}</div>
${d.depts.map(x => `<div><span>${esc(x.name)}</span>${(MODE ? [LBL] : ['수시', '정시']).map(k => `<em><b>${total(x, k) || '-'}</b>명</em>`).join('')}</div>`).join('')}</div>
<div class="swipe">넘기면 학과별 반영비율·변경점 →</div>
${foot(1)}`, 1440, 'cover'));
if (S) slides.push(page(`${top()}
${smSlide()}
${foot(2)}`, 1440));

// 학과별
d.depts.forEach((x, i) => {
  slides.push(page(`${top()}
<h2 class="dn">${esc(x.name)}</h2>
${x.tracks.map(t => `<div class="tr"><div class="th"><div><span class="w">${esc(t.when)}</span><span class="nm">${esc(t.name)}</span></div><div class="n">${t.n}<small>명</small></div></div>
<div class="bar">${t.parts.map(([k, v]) => `<div class="${k === '실기' ? 'on' : ''}" style="flex:${v}"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>
<div class="stg">${esc(t.stage)}</div>${t.min ? `<div class="mn"><b>수능최저</b><span>${esc(t.min)}</span></div>` : ''}
${t.sn ? `<table class="sn"><tr>${t.sn.map(([a]) => `<th>${esc(a)}</th>`).join('')}</tr><tr>${t.sn.map(([, b, n]) => `<td${/^(미반영|-)$/.test(b) ? ' class="no"' : ''}>${esc(b)}${n ? `<small>${esc(n)}</small>` : ''}</td>`).join('')}</tr></table>` : ''}${t.altEv ? `<table class="rf"><tr><th>구분</th><th>반영 방법</th></tr>${t.altEv.map(([e, p]) => `<tr><td>${esc(e)}</td><td>${esc(p)}</td></tr>`).join('')}</table>` : `<div class="ev">${t.events.map(([e, p]) => `<div><span>${esc(e)}</span><b>${esc(p)}</b></div>`).join('')}</div>`}
<div class="nt">${esc(t.note)}</div></div>`).join('')}
${MODE && !BIGCH && x.changes.length ? `<div class="cg dc"><h3>2027과 달라진 점</h3>${chgHtml(x.changes)}</div>` : ''}
${foot(i + 2 + S)}`, 1440, x.tracks.reduce((a, t) => a + t.events.length, 0) > 4 ? 'tight' : ''));
});

function chgHtml(items) {
  const rows = [], same = [];
  const pts = v => { const a = v.split(/\s*·\s*(?![^(]*\))/).filter(Boolean); return a.length > 1 ? a.map(p => { const m = p.match(/^(\d등급)\s+(\d+)$/); return `<span class="pt">${m ? `${esc(m[1])} <b>${esc(m[2])}</b>` : esc(p)}</span>`; }).join('') : esc(v); };
  items.forEach(c => {
    if (c.includes('→')) { const i = c.indexOf(':'); const lab = i > 0 && i < 14 ? c.slice(0, i) : ''; const [a, b] = (lab ? c.slice(i + 1) : c).split('→').map(z => z.trim()); rows.push([lab, a, b]); }
    else same.push(c.replace(/\s*2027과 동일\s*$/, '').trim());
  });
  return rows.map(([l, a, b]) => `<div class="cc"><div class="cl">${esc(l)}</div><div class="cv"><div class="b"><em>2027</em><p>${pts(a)}</p></div><div class="ar">→</div><div class="a"><em>2028</em><p>${pts(b)}</p></div></div></div>`).join('') + (same.length ? `<div class="cs"><b>변동 없음</b>${same.map(z => pts(z)).join(' · ').replace(/<\/span> · <span/g, '</span><span')}</div>` : '');
}

// 변경점 (항목이 많으면 여러 장)
CP.forEach((pg, k) => slides.push(page(`${top()}
<h2 style="font-size:84px;margin-top:44px">2027과 <span class="hl">달라진 점</span>${CP.length > 1 ? `<span style="font-size:40px;color:var(--mu)"> ${k + 1}/${CP.length}</span>` : ''}</h2>
${pg.map(([nm, items]) => `<div class="cg"><h3>${esc(nm)}</h3>${chgHtml(items)}</div>`).join('')}
${foot(d.depts.length + 2 + S + k)}`, 1440, pg.reduce((a, x) => a + x[1].length, 0) > 8 ? 'ctight' : '')));

// 내신 9등급 vs 5등급
if (G) slides.push(page(gradeSlide(), 1440));

const rmChips = c => c.split(' · ').map(x => { if (x.includes('::')) { const [a, b] = x.split('::'); return `<div><em>${esc(a)}</em><strong style="font-size:44px;line-height:1.55">${esc(b)}</strong></div>`; } const m = x.match(/^(.*?)\s*([\d.,]+\s*(?:%|점)?)\s*(\([^)]*\))?$/); return m && m[1] && !/[×→−]/.test(x.replace(/\([^)]*\)/g, "")) ? `<div><em>${esc(m[1] + (m[3] ? ' ' + m[3] : ''))}</em><strong>${esc(m[2])}</strong></div>` : `<div><p>${esc(x)}</p></div>`; }).join('');
const rmSlide = t => { const rows = t.blocks[0].rows; return `<h2 class="ttl">${esc(t.title)}</h2>${t.sub ? `<div class="tsub">${esc(t.sub)}</div>` : ''}<div class="rm${rows.length > 2 ? ' r3' : ''}">${rows.map((r, i) => { const [pc, pt] = r[1].split(' · '); return `<div class="cd${i === 0 ? ' dk' : ''}"><div class="hd"><b>${esc(r[0])} ${esc(pc)}${t.tag2 && i === 1 ? `<i class="tg">${esc(t.tag2)}</i>` : ''}</b><span>${esc(pt || '')}</span></div><div class="ch">${rmChips(r[2])}</div></div>`; }).join('')}${t.notes?.length ? `<div class="nt">${t.notes.map(n => '※ ' + esc(n)).join('<br>')}</div>` : ''}</div>`; };
// 표 장 (시행계획 세부 규정)
T.forEach((t, i) => slides.push(page(`${top()}
${t.title === '정시 반영 방법' ? rmSlide(t) : `<h2 class="ttl">${esc(t.title)}</h2>${t.sub ? `<div class="tsub">${esc(t.sub)}</div>` : ''}
${t.blocks.map(b => `${b.cap ? `<div class="tcap">${esc(b.cap)}</div>` : ''}<table class="tb${t.grp?' sgt':''}${t.title==='정시 반영 방법'?' rfbig':''}${t.dense === 'm' ? ' mdense' : t.dense === 'xx' ? ' xxdense' : t.dense === 'x' ? ' xdense' : t.dense ? ' dense' : ''}">${t.grp ? `<tr>${t.grp.map(([g, n]) => `<th class="gh" colspan="${n}">${esc(g)}</th>`).join('')}</tr>` : ''}<tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
${b.rows.map((r, ri) => `<tr class="${b.hlRow === ri ? 'hr' : ''}">${r.map((c, ci) => `<td class="${((b.hl || []).includes(ci) || (!t.grp && t.title !== '정시 반영 방법' && /→/.test(c))) ? 'h' : ''}${ci === 0 ? ' c0' : ''}${b.diff && ci > 0 && ri === 1 && c !== b.rows[0][ci] ? ' chg' : ''}${b.diff && ci > 0 && ri === 0 && c !== b.rows[1][ci] ? ' old' : ''}${t.grp && ci % 3 === 0 ? ' scr' : ''}${t.grp && ci % 3 === 0 && ci > 0 ? ' gs' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}
${t.notes?.length ? `<ul class="tn">${t.notes.flatMap(n => n.split(/\s·\s(?![^(]*\))/)).map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`}
${foot(N - 1 - T.length + i + 1)}`, 1440)));

// 마무리
slides.push(page(`${top()}
<div class="wm"></div>
<div class="kk">PISTON</div>
<h2>체대입시는<br><span class="pb">피스톤</span></h2>
<div class="sl"><span>같은 성적,</span><span class="lm">다른 결과</span></div>
<div class="foot"><span>세부 사항은 대학 모집요강으로 최종 확인하세요</span><b>${N} / ${N}</b></div>`, 1440, 'end'));

// 스토리
const story = page(`${top()}
<div class="kick">${d.year} 실기전형 요약${d.campus ? ' · ' + esc(d.campus) : ''}</div>
<h1 class="big"${d.short.length>3?' style="font-size:165px"':''}>${esc(d.short)}</h1>
<div class="sd">${d.depts.map(x => `<div><h4>${esc(x.name)}<span>${cnt(x)}</span></h4>
<p>${x.tracks.map(t => `${esc(t.when.split(' ')[0])}: ${t.events.length ? t.events.map(e => esc(e[0])).join(' · ') : t.parts.map(([k, v]) => `${esc(k)} ${v}%`).join(' + ')}`).join('<br>')}</p></div>`).join('')}</div>
${d.evNote ? `<p style="font-size:26px;color:#6b7a70;margin:10px 0 0">${esc(d.evNote)}</p>` : ''}
<div class="cta"><span>반영비율·변경점은 게시물에서</span><b>↓</b></div>
<div class="foot" style="border:0;padding-top:18px"><span>출처 · ${esc(d.source)}</span><b>${ymd}</b></div>`, 1920, 'st');

// 블로그 글
const blog = `# ${d.year}학년도 ${d.school} 체육계열 ${MODE ? LBL + ' ' : ''}실기전형 정리 (${d.depts.map(x => x.name).join('·')})

${d.short.startsWith(d.region) ? "" : d.region + " "}${d.short} 체대입시를 준비한다면, ${d.year}학년도 전형계획에서 꼭 볼 것만 정리했습니다.

## 결론 먼저
${d.depts.map(x => `- **${x.name}**: ${cnt(x)} (${x.tracks.map(t => `${t.when.split(' ')[0]} ${t.events.length ? t.events.map(e => e[0]).join('·') : t.parts.map(([k, v]) => `${k} ${v}%`).join(' + ')}`).join(' / ')})`).join('\n')}

[이미지: post-1.jpg]

${d.depts.map((x, i) => `## ${x.name}
${x.tracks.map(t => `### ${t.when} ${t.name} — ${t.n}명
- 반영비율: ${t.parts.map(([k, v]) => `${k} ${v}%`).join(' + ')} (${t.stage})
${t.events.length ? `- 실기종목: ${t.events.map(([e, p]) => `${e} ${p}`).join(', ')}\n` : ''}- ${t.note}`).join('\n\n')}

[이미지: post-${i + 2 + S}.jpg]`).join('\n\n')}

## 2027학년도와 달라진 점
${d.depts.map(x => `**${x.name}**\n${x.changes.map(c => `- ${c}`).join('\n')}`).join('\n\n')}
${d.common?.length ? `\n**공통**\n${d.common.map(c => `- ${c}`).join('\n')}` : ''}

${CP.map((_, k) => `[이미지: post-${d.depts.length + 2 + S + k}.jpg]`).join('\n')}

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
for (let i = 0; i < slides.length; i++) await shot(slides[i], 1080, 1440, `post-${i + 1}.jpg`);
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
📢 안산시흥피스톤 예비반 모집중!
📩 상담·등록은 DM 또는 ☎️ 010-3162-9399 로 연락주세요

출처: ${d.source} (${ymd} 확인)

#${d.short}체대입시 ${MODE ? `#${d.short}${LBL} ` : ''}#${d.year}체대입시 #체대입시 #체대실기 #체대입시학원 #안산체대입시 #시흥체대입시 #배곧체대입시 #장현체대입시 #안산시흥피스톤 #피스톤체대입시 #제자리멀리뛰기 #체육교육과 #스포츠과학 #고3 #고2`);
console.log('done', OUT, slides.length, 'slides');

# 학교 카드 제작 절차 (에이전트용)

작업 폴더: /home/claude/piston-site/social (node render.mjs <slug> <susi|jeongsi>). 양식 규칙은 FORMAT.md, 완성 예시는 data/dankook-cheonan.json(수시)·data/dankook-cheonan-jeongsi.json(정시), 용인대 data/yongin*.json.

## 1. 원문 (공식 PDF만, 추측 금지, 없으면 '원문 미기재')
- 2028학년도 시행계획 + 2027학년도 수시/정시 모집요강만 기준.
- PDF는 셸에서 403. 사용자 Mac의 내장 브라우저 탭 'seed'(origin https://cdn013.negagea.net)에서만 열린다. 도구: mcp__remote-devices__Claude_Browser__javascript_tool (tabId seed, action javascript_exec, 스크립트는 45초 내 끝나야 함; 길면 백그라운드로 돌리고 전역변수 폴링).
- 이미 로드된 텍스트: window.TXT['<대학명>|plan'], ['<대학명>|susi'] (쪽 배열). 정시는 ['<대학명>|jeongsi']가 없으면 직접 로드:
  url = `https://cdn013.negagea.net/dgsmidc/omr/seoul/web/univ_info2026/${encodeURI(폴더)}/${encodeURI(대학명)}_2027학년도_정시모집요강.pdf` (수시는 수시모집요강, 계획안은 `_2028학년도_대학입학전형계획.pdf`). pdfjsLib(v3.11.174)로 getDocument → 쪽마다 getTextContent → window.TXT[key]=쪽문자열배열. window.ROWS(url,page,regex)는 x좌표 포함 행 복원(표가 깨질 때).
- 캔버스 렌더는 숨김 탭에서 멈춘다 → getTextContent/getOperatorList만 사용. 표가 텍스트로 깨지면 getOperatorList의 paintImageXObject로 이미지 추출.
- 로컬 파일이 필요하면 큰 데이터는 300자 청크+해시로 컨테이너에 옮기고 검증. 보통 필요한 쪽의 텍스트만 읽어 JSON에 옮기면 된다.
- 쪽수: PDF쪽 = 인쇄쪽+2 (대학마다 다를 수 있음).

## 2. 무엇을 만드나
- 체육계열 학과(체육·스포츠·운동·건강·경호 등) 실기 전형만. 특기자 제외. 수시·정시 중 실기 전형이 있는 쪽만 카드로 만든다 (둘 다 있으면 2개, 하나면 1개, 없으면 '해당 없음'으로 보고).
- slug: 수시 `<school>` (data/<slug>.json → out/<slug>-susi? 아님 — 실행은 `node render.mjs <slug> susi` 이고 출력 폴더는 out/<slug>-susi), 정시 slug는 `<school>-jeongsi` 로 `node render.mjs <school>-jeongsi jeongsi` (출력 out/<school>-jeongsi-jeongsi). 기존 data/*.json 형식을 그대로 따른다. 구양식 초안(data/<school>.json)은 원문으로 다시 검증하며 덮어쓴다.
- JSON: slug, school, short, campus(선택), region, year(2028), cntTag, source("<대학> 2028학년도 대학입학전형 시행계획 · 2027학년도 <수시|정시>모집요강"), checked "2026-10-26 확인" 형식 일치, hideGrade, logo(schools/<school>.png), depts[{name, tracks[{when,name,n,parts,stage,events,altEv,note}], changes[]}], tables[{title,sub,only,dense,blocks,notes}].
- 학과 슬라이드: 실기 종목 줄 대신 altEv에 내신(수시: 반영 교과·반영 기간·가중치) 또는 수능(정시: 영역별 비율·탐구/한국사) 반영 방법 2~3줄. 환산점수 표는 뒷장에만. changes는 2027→2028 변경점 위주(원문 근거).
- 배점표: 학과별 한 장에 한 표(종목이 여러 개여도 한 표, dense:'x'로 행 압축), 제목 'OO학과 배점표', 구간 칸은 시작 기록만(예 295·293·291), 첫 행 '이하/이상', 마지막 행 '미만/이하' 원문 그대로. 부제에 '값은 시작 기록'. 배점표가 원문에 없으면 만들지 않고 '원문 미기재'.
- 로고: 글자 없는 심볼만. 공식 로고 이미지는 해당 대학 PDF 표지/첫 쪽 이미지 또는 입학처 공식 페이지에서. 흰 배경 508x508, 여백 제거 후 가로형은 폭 480(또는 심볼만 높이 440), 엠블럼은 높이 400~440으로 맞춘다 (schools/*.png 참고). 파일은 schools/<school>.png.
- 제목·부제는 로고에 가리지 않게(렌더에서 max-width 처리됨). 렌더 후 '넘침 경고'가 없어야 하고, post-*.jpg와 story.jpg를 모두 Read로 열어 잘림·겹침·글자 깨짐을 직접 확인한다.
- 캡션: data/caption-<slug>[-<mode>].txt 로 직접 쓴다 (out 폴더 이름 규칙은 render.mjs가 읽는 파일명 참고: caption-dankook-cheonan-susi.txt / caption-dankook-cheonan-jeongsi-jeongsi.txt). 형식: 첫 줄 "2028학년도 <대학> <수시|정시>, 이렇게 달라집니다 📌"(‘올해’ 금지) → 변경 3~4줄(전 → 후) → ✔️ 변동 없는 항목 → (정시) ※ 모집인원은 수시모집 등록결과에 따라 정시에서 변동될 수 있어요 → 한 줄 안내 + 🔖 저장 유도 + '안산시흥피스톤 · 상담·등록신청은 프로필 링크에서' → 출처 줄 → 해시태그 13개 내외. 원문에 없는 평가·추측 표현 금지. 작성 후 out/<dir>/caption.txt 에 복사(다시 렌더하면 자동 반영됨).
- 완료 후: git add/commit/push (커밋 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` 와 `Claude-Session: https://claude.ai/code/session_01EGTn7G8nWP1yv5M2jqmoFb`). push 후 Metricool 미디어 URL: https://raw.githubusercontent.com/minwoo970321-dev/piston-site/main/social/out/<dir>/post-N.jpg
- 팩트체크는 만든 쪽이 아닌 별도 에이전트가 한다 (만든 쪽은 하지 않는다). 대신 보고에 '원문 쪽수 근거 목록'을 포함.

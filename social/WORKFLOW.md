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
- 캡션: data/caption-<slug>[-<mode>].txt 로 직접 쓴다 (out 폴더 이름 규칙은 render.mjs가 읽는 파일명 참고: caption-dankook-cheonan-susi.txt / caption-dankook-cheonan-jeongsi-jeongsi.txt). 형식: 첫 줄 "2028학년도 <대학> <수시|정시>, 이렇게 달라집니다 📌"(‘올해’ 금지) → 변경 3~4줄(전 → 후) → ✔️ 변동 없는 항목 → (정시) ※ 모집인원은 수시모집 등록결과에 따라 정시에서 변동될 수 있어요 → 한 줄 안내 + 🔖 저장 유도 + '📢 안산시흥피스톤 예비반 모집중! + 📩 상담·등록은 DM 또는 ☎️ 010-3162-9399' → 출처 줄 → 해시태그 13개 내외. 원문에 없는 평가·추측 표현 금지. 작성 후 out/<dir>/caption.txt 에 복사(다시 렌더하면 자동 반영됨).
- 완료 후: git add/commit/push (커밋 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` 와 `Claude-Session: https://claude.ai/code/session_01EGTn7G8nWP1yv5M2jqmoFb`). push 후 Metricool 미디어 URL: https://raw.githubusercontent.com/minwoo970321-dev/piston-site/main/social/out/<dir>/post-N.jpg
- 팩트체크는 만든 쪽이 아닌 별도 에이전트가 한다 (만든 쪽은 하지 않는다). 대신 보고에 '원문 쪽수 근거 목록'을 포함.

## 토큰 절약 규칙 (필수, 정확도는 낮추지 않음)
- 이미지 열람: 표지·수정한 장만 Read. 나머지는 render.mjs 넘침 경고로 판단. 팩트체크 에이전트만 전 장 열람.
- 팩트체크: 학교·모드당 1회. 불합격이면 고친 항목만 재검수(서브에이전트 재사용 SendMessage). 전체 재검수는 변경 범위가 클 때만.
- 서브에이전트: 카드 제작·검수 외 목적으로 띄우지 않는다. 같은 학교 작업을 중복 실행하지 않는다.
- PDF: 필요한 페이지만 getTextContent. window.TXT 에 올라온 텍스트 재사용, 같은 PDF를 두 번 로드하지 않는다.
- 로고: 사용자가 준 교표 이미지 우선(원형 인장은 링 포함 전체). 없으면 만들기 전에 사용자에게 요청(반복 시도 금지).
- 캡션·Metricool: 캡션 파일을 한 번만 읽어 그대로 사용. 예약 응답 전문을 다시 출력하지 않는다.
- 보고: 중간 보고 최소화, 최종에 예약 목록·미완료 목록만.
- 학과 슬라이드 수능 반영: sn(국어·수학·영어·탐구 비율 표) 사용, '최저점'은 넣지 않는다.

## 고정 양식 (2026-10-29, 앞으로 모든 학교)
- 이미지: 3:4 (1080×1440). 인스타 게시물로 업로드(릴스 X), 비율은 '원본'.
- 슬라이드 순서: 표지 → 2번 '한눈에 보기'(data의 summary) → 학과별 → 정시 반영 방법 → 배점표 → 영어·한국사 → 학폭 → 마무리.
- 2027학년도는 변경사항(2027→2028 비교, 학폭 표 포함)에만 사용. 그 외 항목엔 쓰지 않음. 단 2028 계획안에 배점표가 없으면 실기 옆 '2027 기준' 배지.
- 2028 계획안에 배점표가 없으면 실기 옆에 '배점표 X' 배지(tag2).
- 수능 반영 표: 영역별 반영 지표(표준점수·백분위·변환점수 등)와 탐구 과목 수(2028 원문에 있을 때만)를 표시. 원문에 없는 값은 쓰지 않음.
- 배점표: 종목별 그룹 표(grp), 부제에 '값은 시작 기록' 같은 군더더기 금지.
- 캡션: 채팅 글(코드 블록)로 전달, 끝에 '📢 안산시흥피스톤 예비반 모집중! / 📩 상담·등록은 DM 또는 ☎️ 010-3162-9399'.
- 전달: 게시 시각마다 그 학교만, 이미지 낱장(SendUserFile) + 캡션 글. 스토리 없음.
- 학과가 1개뿐인 학교는 '한눈에 보기'를 따로 두지 않고 학과 슬라이드(2번)에 합친다(수능최저 강조 박스·실기 종목·변경 칩 포함).
- 2027→2028 비교표에서 바뀐 숫자는 2028 줄 초록 굵은 글씨, 2027 줄은 연회색(박스·밑줄·화살표 금지).

## 고정 양식 확정 (10/30)
- 단국 죽전 수시/정시 최신본이 기준 양식. 학교 로고 크게(210×150), 수능 반영 표는 세로 가운데 정렬·상하 여백 균형, 탐구 세부는 표 밑 설명줄.
- 10/30 스타일: 모서리 각지게(radius 0), 형광 라임 금지 → 연한 민트(--lime:#cfe8d4)

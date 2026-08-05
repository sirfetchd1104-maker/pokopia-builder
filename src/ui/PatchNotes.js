import { t, getLang } from "../i18n.js";

const CURRENT_VERSION = "2.8";
const STORAGE_KEY = "pokopia-seen-version";

const patchNotes = [
  {
    version: "2.8",
    date: "2026.08.05",
    changes: {
      ko: [
        { title: "블록 / 오브젝트 탭 구분", items: [
          "기존에 사용되던 블록과 창문, 밧줄, 울타리 등등 각 역할 별로 분류",
        ] },
        { title: "새 오브젝트 9종 추가", items: [
          "의자, 테이블, 큰 테이블(2×2), 싱글 침대(1×2), 더블 침대(2×2), 소파(2×1), 가로등(1×1×3), 나무(3×3×4), 수풀",
          "나무 기둥 주변 빈 칸에 다른 블록 배치 가능",
        ] },
        { title: "버그 수정", items: [
          "모바일 범위 회전이 동작하지 않던 문제 수정",
          "멀티셀 오브젝트 배치 시 커서 위치 싱크 개선",
        ] },
      ],
      en: [
        { title: "Block / Object Tab Separation", items: [
          "Blocks, windows, ropes, fences, etc. are now categorized by role",
        ] },
        { title: "9 New Object Types", items: [
          "Chair, Table, Large Table (2×2), Single Bed (1×2), Double Bed (2×2), Sofa (2×1), Lamp (1×1×3), Tree (3×3×4), Bush",
          "Blocks can be placed around tree trunk's empty cells",
        ] },
        { title: "Bug Fixes", items: [
          "Fixed mobile range rotation not working",
          "Improved cursor sync for multi-cell object placement",
        ] },
      ],
      ja: [
        { title: "ブロック / オブジェクト タブ分離", items: [
          "ブロック、窓、ロープ、フェンスなどを役割ごとに分類",
        ] },
        { title: "新オブジェクト9種追加", items: [
          "椅子、テーブル、大テーブル(2×2)、シングルベッド(1×2)、ダブルベッド(2×2)、ソファ(2×1)、街灯(1×1×3)、木(3×3×4)、茂み",
          "木の幹周辺の空きマスに他のブロックを配置可能",
        ] },
        { title: "バグ修正", items: [
          "モバイルで範囲回転が動作しない問題を修正",
          "マルチセルオブジェクト配置時のカーソル位置同期を改善",
        ] },
      ],
    },
  },
  {
    version: "2.7",
    date: "2026.07.16",
    changes: {
      ko: [
        { title: "사용 가이드 페이지 추가", items: [
          "별도 페이지(guide.html)로 전체 기능 사용법 제공",
          "9개 섹션: 기본 조작, 블록 종류(14종), 색상 관리, 일괄/대칭 배치, 범위 선택, 레이어 필터, 픽셀아트, 저장/공유, 모바일 조작",
          "한국어/영어/일본어 3개 국어 지원",
          "PC 하단 패널 + 모바일 툴바에서 가이드 페이지 바로가기 버튼 추가",
        ] },
        { title: "조작 가이드 모달 제거", items: [
          "기존 인앱 조작 가이드 모달을 가이드 페이지로 대체",
        ] },
      ],
      en: [
        { title: "User Guide Page", items: [
          "Dedicated page (guide.html) with full feature documentation",
          "9 sections: basics, block types (14), colors, batch/symmetry, box select, layer filter, pixel art, save/share, mobile controls",
          "Korean / English / Japanese support",
          "Guide page shortcut added to PC bottom panel + mobile toolbar",
        ] },
        { title: "Controls Modal Removed", items: [
          "Replaced in-app controls modal with the guide page",
        ] },
      ],
      ja: [
        { title: "使い方ガイドページ追加", items: [
          "専用ページ（guide.html）で全機能の使い方を提供",
          "9セクション: 基本操作、ブロック種類（14種）、色管理、一括/対称配置、範囲選択、レイヤーフィルター、ピクセルアート、保存/共有、モバイル操作",
          "韓国語/英語/日本語の3言語対応",
          "PC下部パネル + モバイルツールバーにガイドページショートカットボタン追加",
        ] },
        { title: "操作ガイドモーダル削除", items: [
          "アプリ内操作ガイドモーダルをガイドページに置き換え",
        ] },
      ],
    },
  },
  {
    version: "2.6",
    date: "2026.07.15",
    changes: {
      ko: [
        { title: "새 블록 7종 추가 (총 14종)", items: [
          "창문/대각선 창문/아치/계단/사다리/로프/울타리 추가",
        ] },
        { title: "블록 선택 UI 개편", items: [
          "드롭다운 → 아이콘 버튼 타입으로 변경",
          "Q키로 14종 블록 순차 전환",
        ] },
        { title: "색상 스와치 UI", items: [
          "셀렉트 박스 → 실제 색상이 보이는 원형 스와치 버튼으로 변경",
          "기본 6색 제공 (보라, 빨강, 주황, 초록, 파랑, 회색)",
          "색상 변경 시 스와치 실시간 업데이트",
        ] },
        { title: "범위 회전", items: [
          "범위 선택 후 Ctrl+R로 90° 시계 방향 회전",
          "모바일: 이동 모달에 회전 버튼 추가",
          "블록 좌표 + 개별 회전값 모두 중심 기준 회전",
        ] },
        { title: "스크린샷", items: [
          "P키로 현재 화면 PNG 캡처 및 다운로드",
          "모바일: 툴바 스크린샷 버튼",
        ] },
        { title: "모바일 UX 개선", items: [
          "모바일 UX 개선",
        ] },
      ],
      en: [
        { title: "7 New Block Types (14 Total)", items: [
          "Window / Sloped Window / Arch / Stair / Ladder / Rope / Fence",
        ] },
        { title: "Block Selection UI Overhaul", items: [
          "Dropdown → icon button style",
          "Q key to cycle through 14 blocks",
        ] },
        { title: "Color Swatch UI", items: [
          "Select box → circular color swatch buttons",
          "6 default colors (purple, red, orange, green, blue, gray)",
          "Real-time swatch update on color change",
        ] },
        { title: "Selection Rotation", items: [
          "Ctrl+R to rotate selected blocks 90° clockwise",
          "Mobile: rotation button in move modal",
          "Both coordinates and individual rotation values rotate around center",
        ] },
        { title: "Screenshot", items: [
          "P key to capture current view as PNG",
          "Mobile: screenshot button in toolbar",
        ] },
        { title: "Mobile UX Improvements", items: [
          "Mobile UX improvements",
        ] },
      ],
      ja: [
        { title: "新ブロック7種追加（全14種）", items: [
          "窓/斜め窓/アーチ/階段/はしご/ロープ/フェンス追加",
        ] },
        { title: "ブロック選択UIリニューアル", items: [
          "ドロップダウン → アイコンボタン形式に変更",
          "Qキーで14種ブロックを順次切り替え",
        ] },
        { title: "カラースウォッチUI", items: [
          "セレクトボックス → 実際の色が見える丸型スウォッチボタンに変更",
          "デフォルト6色（紫、赤、オレンジ、緑、青、グレー）",
          "色変更時にスウォッチをリアルタイム更新",
        ] },
        { title: "範囲回転", items: [
          "範囲選択後 Ctrl+R で90°時計回りに回転",
          "モバイル: 移動モーダルに回転ボタン追加",
          "座標と個別の回転値を中心基準で回転",
        ] },
        { title: "スクリーンショット", items: [
          "Pキーで現在の画面をPNGキャプチャ＆ダウンロード",
          "モバイル: ツールバーにスクリーンショットボタン",
        ] },
        { title: "モバイルUX改善", items: [
          "モバイルUX改善",
        ] },
      ],
    },
  },
  {
    version: "2.5",
    date: "2026.07.13",
    changes: {
      ko: [
        { title: "면적 배치 (NxN)", items: [
          "일괄배치에 '면적' 모드 추가 — XZ 평면에 NxN 그리드 배치",
          "PC: E 키 순환 (끄기 → 앞 → 오른쪽 → 위 → 면적), 툴바 드롭다운",
          "모바일: 배치 모달에서 방향 및 개수 선택",
          "크기 최대 8×8 (64블록), 대칭과 조합 가능",
          "고스트 프리뷰로 배치 영역 미리 확인",
        ] },
        { title: "모바일 배치 UI 개선", items: [
          "배치 버튼 탭 시 모달 팝업으로 변경 (기존 길게 누르기 제거)",
          "방향 버튼, ±개수 버튼으로 직관적 조작",
        ] },
      ],
      en: [
        { title: "Area Placement (NxN)", items: [
          "New 'Area' mode in batch placement — NxN grid on XZ plane",
          "PC: E key cycle (Off → Fwd → Right → Up → Area), toolbar dropdown",
          "Mobile: select direction and count in batch modal",
          "Max size 8×8 (64 blocks), combinable with symmetry",
          "Ghost preview shows placement area",
        ] },
        { title: "Mobile Batch UI Improvement", items: [
          "Batch button now opens a modal popup (removed long-press)",
          "Direction buttons, ± count buttons for intuitive control",
        ] },
      ],
      ja: [
        { title: "面積配置 (NxN)", items: [
          "一括配置に「面積」モード追加 — XZ平面にNxNグリッド配置",
          "PC: Eキー循環（オフ → 前方 → 右 → 上 → 面積）、ツールバードロップダウン",
          "モバイル: 配置モーダルで方向と個数を選択",
          "最大サイズ 8×8（64ブロック）、対称と組み合わせ可能",
          "ゴーストプレビューで配置範囲を事前確認",
        ] },
        { title: "モバイル配置UI改善", items: [
          "配置ボタンタップでモーダルポップアップに変更（長押し廃止）",
          "方向ボタン、±個数ボタンで直感的操作",
        ] },
      ],
    },
  },
  {
    version: "2.4",
    date: "2026.07.10",
    changes: {
      ko: [
        { title: "모바일 에디터 기능 강화", items: [
          "초기화 버그 수정 (모바일에서 동작하지 않던 문제)",
          "▲▼ 버튼으로 카메라 높이 조절",
          "블록 종류 선택 모달 방식으로 변경 (7종 지원)",
          "색상 관리 — 편집, 이름 변경, 삭제",
          "일괄 배치 — 방향 4종, 개수 2~16",
          "대칭 배치 — X축 / Z축",
          "레이어 필터 — 전체 / 해당 층만 / 해당 층 이하 (모달에서 층 조절)",
          "전체 이동 모달 (6방향)",
          "색상별 블록 수 통계",
          "조작 가이드 모달",
        ] },
        { title: "블록 교체 (바꿔치기)", items: [
          "이미 배치된 블록의 모양/회전을 현재 선택으로 교체 (색상 유지)",
          "PC: G 키 / 모바일: 교체 토글 버튼",
        ] },
        { title: "범위 선택 개선", items: [
          "빈 바닥 두 점 선택 시 Y축 전체 범위 자동 확장",
          "모바일 범위 선택 추가 — 범위 버튼으로 두 지점 탭 후 삭제",
          "선택 영역 이동 — PC: Ctrl+방향키 / 모바일: 이동 모달",
        ] },
        { title: "패치노트 개선", items: [
          "최근 3개 버전만 기본 표시, '이전 패치 내역 보기' 버튼으로 확장",
        ] },
      ],
      en: [
        { title: "Mobile Editor Enhancements", items: [
          "Fixed reset not working on mobile",
          "▲▼ buttons for camera height control",
          "Block shape selection changed to modal (7 types)",
          "Color management — edit, rename, delete",
          "Batch placement — 4 directions, count 2~16",
          "Symmetry placement — X / Z axis",
          "Layer filter — all / current only / current and below (modal with level selector)",
          "Move All modal (6 directions)",
          "Block stats by color",
          "Controls guide modal",
        ] },
        { title: "Block Swap", items: [
          "Replace shape/rotation of placed blocks without removing (color preserved)",
          "PC: G key / Mobile: Swap toggle button",
        ] },
        { title: "Box Select Improvements", items: [
          "Selecting two empty ground points auto-extends Y range to full height",
          "Mobile box select added — tap two points via Select button, then delete",
          "Move selected blocks — PC: Ctrl+Arrows / Mobile: Move modal",
        ] },
        { title: "Patch Notes Improvement", items: [
          "Shows only recent 3 versions by default, expandable 'Show older' button",
        ] },
      ],
      ja: [
        { title: "モバイルエディタ機能強化", items: [
          "リセットがモバイルで動作しないバグを修正",
          "▲▼ボタンでカメラ高さ調整",
          "ブロック種類選択をモーダル方式に変更（7種対応）",
          "色管理 — 編集、名前変更、削除",
          "一括配置 — 4方向、個数2~16",
          "対称配置 — X軸 / Z軸",
          "レイヤーフィルター — 全体 / 該当階のみ / 該当階以下（モーダルで階数調整）",
          "全体移動モーダル（6方向）",
          "色別ブロック数統計",
          "操作ガイドモーダル",
        ] },
        { title: "ブロック交換", items: [
          "配置済みブロックの形状/回転を現在の選択に交換（色はそのまま）",
          "PC: Gキー / モバイル: 交換トグルボタン",
        ] },
        { title: "範囲選択の改善", items: [
          "空の地面2点選択時、Y軸全範囲に自動拡張",
          "モバイル範囲選択追加 — 範囲ボタンで2点タップ後削除",
          "選択ブロック移動 — PC: Ctrl+矢印キー / モバイル: 移動モーダル",
        ] },
        { title: "パッチノート改善", items: [
          "最新3バージョンのみ表示、「以前のパッチ履歴を表示」ボタンで展開可能",
        ] },
      ],
    },
  },
  {
    version: "2.3",
    date: "2026.07.09",
    changes: {
      ko: [
        { title: "새 블록 타입 추가", items: [
          "원기둥 — 수직 원통형 블록",
          "눕힌 원기둥 — 수평으로 누운 원통형 블록",
          "반원기둥 — 아래가 평평하고 위가 둥근 반원통 블록",
          "반블록 — 기본 블록의 절반 높이 직육면체",
          "키보드 단축키 4~7번으로 선택 가능",
        ] },
        { title: "UI 개선", items: [
          "'모서리' → '지붕 모서리'로 명칭 변경",
          "초기화 옵션 분리 — '블록만 초기화' / '전체 초기화 (블록 + 색상)'",
        ] },
      ],
      en: [
        { title: "New Block Types", items: [
          "Cylinder — vertical cylindrical block",
          "H-Cylinder — horizontal cylindrical block",
          "Half Cylinder — flat bottom, curved top half-pipe block",
          "Half Block — half-height rectangular slab",
          "Select with keyboard shortcuts 4~7",
        ] },
        { title: "UI Improvement", items: [
          "'Corner' renamed to 'Roof Corner'",
          "Reset options — 'Blocks only' / 'Full reset (blocks + colors)'",
        ] },
      ],
      ja: [
        { title: "新ブロックタイプ追加", items: [
          "円柱 — 縦型の円筒ブロック",
          "横円柱 — 横向きの円筒ブロック",
          "半円柱 — 下が平らで上が丸いハーフパイプブロック",
          "ハーフブロック — 基本ブロックの半分の高さの直方体",
          "キーボードショートカット 4~7 で選択可能",
        ] },
        { title: "UI改善", items: [
          "「コーナー」→「屋根コーナー」に名称変更",
          "リセットオプション分離 —「ブロックのみ」/「全リセット（ブロック＋色）」",
        ] },
      ],
    },
  },
  {
    version: "2.2",
    date: "2026.07.08",
    changes: {
      ko: [
        { title: "일본어(日本語) 지원 추가", items: [
          "언어 선택에서 日本語 선택 가능",
          "브라우저 언어가 일본어일 경우 자동 감지",
          "전체 UI 일본어 번역 완료",
        ] },
      ],
      en: [
        { title: "Japanese (日本語) Language Support", items: [
          "Japanese now available in language selector",
          "Auto-detects Japanese browser language",
          "Full UI translation to Japanese",
        ] },
      ],
      ja: [
        { title: "日本語対応を追加", items: [
          "言語選択で日本語が選べるようになりました",
          "ブラウザ言語が日本語の場合、自動検出されます",
          "UI全体の日本語翻訳が完了しました",
        ] },
      ],
    },
  },
  {
    version: "2.1",
    date: "2026.07.07",
    changes: {
      ko: [
        { title: "이미지 → 픽셀아트 변환", items: [
          "이미지를 업로드하면 픽셀아트 스타일로 블록 자동 배치",
          "최대 해상도(8~64) 및 색상 수(2~16) 슬라이더로 조절",
          "바닥(XZ) / 벽(XY) 방향 선택 가능",
          "실시간 미리보기 및 자동 재질 생성",
          "PC + 모바일 모두 지원",
        ] },
        { title: "UI 개선", items: [
          "버튼 활성 색상을 보라색 계열로 통일",
          "그리드 선과 바닥 정렬 수정",
          "그리드 선 가시성 개선",
          "평면도(Dot View) 앞 방향이 화면 하단에 표시되도록 수정",
        ] },
      ],
      en: [
        { title: "Image → Pixel Art Conversion", items: [
          "Upload an image to auto-place blocks in pixel art style",
          "Adjust max resolution (8–64) and color count (2–16) with sliders",
          "Choose floor (XZ) or wall (XY) orientation",
          "Real-time preview with auto material creation",
          "Supports both PC and mobile",
        ] },
        { title: "UI Improvements", items: [
          "Unified active button color to purple theme",
          "Fixed grid line and ground plane alignment",
          "Improved grid line visibility",
          "Floor plan (Dot View) now shows front at screen bottom",
        ] },
      ],
    },
  },
  {
    version: "2.0",
    date: "2026.07.06",
    changes: {
      ko: [
        { title: "모바일 간편 편집 모드 추가", items: [
          "터치로 블록 배치/삭제 가능 (탭: 배치, 길게 누르기: 삭제)",
          "드래그로 카메라 회전 및 시야 상하 조절",
          "하단 툴바: 블록 종류, 색상, 회전, 실행취소/다시실행, 저장, 공유, 초기화, 패치노트",
          "가상 조이스틱으로 카메라 이동",
          "색상 추가 및 사용 현황 기능 지원",
        ] },
      ],
      en: [
        { title: "Mobile Simple Editor Added", items: [
          "Place and remove blocks with touch (Tap: place, Hold: remove)",
          "Drag to rotate camera and adjust vertical view angle",
          "Bottom toolbar: shape, color, rotation, undo/redo, save, share, reset, patch notes",
          "Virtual joystick for camera movement",
          "Color add and usage stats support",
        ] },
      ],
    },
  },
  {
    version: "1.91",
    date: "2026.07.06",
    changes: {
      ko: [
        { title: "공유 링크 호환성 개선", items: ["카카오톡 등 메신저에서 공유 링크가 잘리는 문제 수정"] },
      ],
      en: [
        { title: "Share Link Compatibility", items: ["Fixed share links being truncated in messengers like KakaoTalk"] },
      ],
    },
  },
  {
    version: "1.9",
    date: "2026.07.06",
    changes: {
      ko: [
        { title: "설계도 공유", items: ["공유 버튼 클릭 → 공유 링크 생성 및 클립보드 복사", "링크 접속 시 설계도 자동 로드", "설계도는 90일간 보관"] },
      ],
      en: [
        { title: "Design Sharing", items: ["Click Share button → creates share link and copies to clipboard", "Auto-loads design when visiting shared link", "Designs are stored for 90 days"] },
      ],
    },
  },
  {
    version: "1.8",
    date: "2026.07.03",
    changes: {
      ko: [
        { title: "색상별 블록 수", items: ["우측 패널 하단에 색상별 블록 개수 표시", "접기/펼치기 토글 지원"] },
        { title: "범위 선택 (Box Select)", items: ["블록을 조준하고 F를 두 번 눌러 3D 범위 지정", "선택 범위가 시안색 와이어프레임 박스로 표시", "Ctrl+C로 범위 내 블록 복사, Delete/Backspace로 삭제", "좌/우클릭 시 선택 자동 해제"] },
        { title: "2D 평면도 뷰 (Dot View)", items: ["좌측 패널 평면도 버튼 클릭 → 전체 화면 2D 뷰 전환", "블록을 Y층별로 그룹화, 각 블록을 색상 도트로 렌더링", "◀ ▶ 버튼 또는 화살표 키로 층 이동", "PNG 저장 기능"] },
        { title: "패치노트 버튼 이동", items: ["좌측 패널 하단 → 브랜드 영역(3D block planner) 아래로 이동"] },
        { title: "조작 가이드 모달 추가", items: ["단축키 박스 좌측 상단에 조작가이드 버튼 추가"] },
      ],
      en: [
        { title: "Blocks by Color", items: ["Color-based block count in right panel", "Collapsible toggle support"] },
        { title: "Box Select", items: ["Aim at a block and press F twice to define 3D selection", "Cyan wireframe box shows selection range", "Ctrl+C to copy, Delete/Backspace to delete selected blocks", "Selection auto-clears on left/right click"] },
        { title: "2D Floor Plan (Dot View)", items: ["Click Floor Plan button in left panel → full-screen 2D view", "Blocks grouped by Y level, rendered as colored dots", "◀ ▶ buttons or arrow keys to navigate floors", "PNG save feature"] },
        { title: "Patch Notes Button Moved", items: ["Moved from bottom of left panel to under brand area"] },
        { title: "Controls Guide Modal", items: ["Controls guide button added above shortcut bar"] },
      ],
    },
  },
  {
    version: "1.7",
    date: "2026.07.01",
    changes: {
      ko: [
        { title: "Mac 단축키 호환", items: ["Cmd 키로 단축키 사용 가능 (복사, 붙여넣기, 실행취소, 전체이동 등)"] },
      ],
      en: [
        { title: "Mac Shortcut Support", items: ["Cmd key now works for shortcuts (copy, paste, undo, move all, etc.)"] },
      ],
    },
  },
  {
    version: "1.6",
    date: "2026.06.30",
    changes: {
      ko: [
        { title: "패치 노트 모달", items: ["새 버전 접속 시 패치 내역 자동 표시", "좌측 패널 하단 버전 버튼으로 재확인 가능"] },
        { title: "브라우저 언어 감지", items: ["첫 방문 시 브라우저 언어에 따라 한국어/영어 자동 선택"] },
      ],
      en: [
        { title: "Patch Notes Modal", items: ["Auto-shows patch notes on new version", "Re-check via version button at bottom of left panel"] },
        { title: "Browser Language Detection", items: ["Auto-selects Korean/English based on browser language on first visit"] },
      ],
    },
  },
];

export class PatchNotesModal {
  constructor() {
    this.overlay = document.querySelector("#patchModal");
    this.title = document.querySelector("#patchModalTitle");
    this.body = document.querySelector("#patchModalBody");
    this.closeBtn = document.querySelector("#patchModalClose");
    this.okBtn = document.querySelector("#patchModalOk");

    this.closeBtn.addEventListener("click", () => this.close());
    this.okBtn.addEventListener("click", () => this.close());
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  shouldShow() {
    const seen = localStorage.getItem(STORAGE_KEY);
    return seen !== CURRENT_VERSION;
  }

  open() {
    const lang = getLang();
    this.title.textContent = t("patch_title") + " — v" + CURRENT_VERSION;
    this.body.innerHTML = this.renderNotes(lang);

    const toggle = this.body.querySelector(".patch-older-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const content = this.body.querySelector(".patch-older-content");
        const expanded = content.style.display !== "none";
        content.style.display = expanded ? "none" : "block";
        toggle.textContent = expanded ? t("patch_older_show") : t("patch_older_hide");
      });
    }

    this.overlay.classList.remove("hidden");
  }

  close() {
    this.overlay.classList.add("hidden");
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
  }

  renderNotes(lang) {
    const RECENT_COUNT = 3;
    const recent = patchNotes.slice(0, RECENT_COUNT);
    const older = patchNotes.slice(RECENT_COUNT);

    let html = "";
    for (let i = 0; i < recent.length; i++) {
      html += this._renderPatch(recent[i], lang);
      if (i < recent.length - 1 || older.length > 0) {
        const next = patchNotes[i + 1];
        html += `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:14px 0">`;
        html += `<p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.35)">v${next.version} — ${next.date}</p>`;
      }
    }

    if (older.length > 0) {
      html += `<button type="button" class="patch-older-toggle" data-action="expand">${t("patch_older_show")}</button>`;
      html += `<div class="patch-older-content" style="display:none">`;
      for (let i = 0; i < older.length; i++) {
        html += this._renderPatch(older[i], lang);
        if (i < older.length - 1) {
          const next = older[i + 1];
          html += `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:14px 0">`;
          html += `<p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.35)">v${next.version} — ${next.date}</p>`;
        }
      }
      html += `</div>`;
    }

    const email = "sirfetchd1104@gmail.com";
    html += `<p style="margin-top:18px;font-size:0.85em;color:rgba(255,255,255,0.45)">${t("patch_feedback", email)}</p>`;
    return html;
  }

  _renderPatch(patch, lang) {
    let html = "";
    const sections = patch.changes[lang] || patch.changes.en;
    for (const section of sections) {
      html += `<h3>${section.title}</h3><ul>`;
      for (const item of section.items) {
        html += `<li>${item}</li>`;
      }
      html += "</ul>";
    }
    return html;
  }

  getVersion() {
    return CURRENT_VERSION;
  }
}

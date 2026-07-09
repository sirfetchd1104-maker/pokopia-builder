import { t, getLang } from "../i18n.js";

const CURRENT_VERSION = "2.3";
const STORAGE_KEY = "pokopia-seen-version";

const patchNotes = [
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
    this.overlay.classList.remove("hidden");
  }

  close() {
    this.overlay.classList.add("hidden");
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
  }

  renderNotes(lang) {
    let html = "";
    for (const patch of patchNotes) {
      const sections = patch.changes[lang] || patch.changes.en;
      for (const section of sections) {
        html += `<h3>${section.title}</h3><ul>`;
        for (const item of section.items) {
          html += `<li>${item}</li>`;
        }
        html += "</ul>";
      }
      if (patch !== patchNotes[patchNotes.length - 1]) {
        const next = patchNotes[patchNotes.indexOf(patch) + 1];
        html += `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:14px 0">`;
        html += `<p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.35)">v${next.version} — ${next.date}</p>`;
      }
    }
    const email = "sirfetchd1104@gmail.com";
    html += `<p style="margin-top:18px;font-size:0.85em;color:rgba(255,255,255,0.45)">${t("patch_feedback", email)}</p>`;
    return html;
  }

  getVersion() {
    return CURRENT_VERSION;
  }
}

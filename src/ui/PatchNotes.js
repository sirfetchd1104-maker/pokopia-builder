import { t, getLang } from "../i18n.js";

const CURRENT_VERSION = "1.6";
const STORAGE_KEY = "pokopia-seen-version";

const patchNotes = [
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
        html += `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:14px 0">`;
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

const dict = {
  ko: {
    // Left panel labels
    language: "언어 변경",
    add_block: "블록 추가",
    rename_placeholder: "블록 이름 변경",
    add_color_title: "새 색상 추가",
    remove_color_title: "선택한 색상 삭제",
    color_title: "색상",
    rotation: "회전",
    batch: "일괄배치",
    batch_off: "끄기",
    batch_forward: "앞으로",
    batch_right: "오른쪽",
    batch_up: "위로",
    symmetry: "대칭배치",
    sym_off: "끄기",
    sym_lr: "좌우 대칭",
    sym_fb: "앞뒤 대칭",
    layer: "레이어 보기",
    layer_all: "전체",
    layer_only: "해당 층만",
    layer_below: "해당 층 이하",
    camera_settings: "카메라 설정",
    sensitivity: "감도",
    move_speed: "이동 속도",
    zoom_range: "줌 범위",
    save: "저장",
    save_title: "JSON 저장",
    load: "불러오기",
    load_title: "JSON 불러오기",
    reset: "초기화",

    // Right panel
    stat_blocks: "블록 개수",
    stat_coord: "선택 좌표",
    stat_camera: "카메라 좌표",
    stat_color: "블록 색상",
    stat_shape: "블록 종류",
    stat_rotation: "회전",
    stat_batch: "일괄배치",
    stat_symmetry: "대칭",
    stat_layer: "레이어",
    stat_clipboard: "클립보드",

    // Shapes
    shape_cube: "블록",
    shape_wedge: "지붕",
    shape_corner: "모서리",

    // Directions
    dir_front: "앞",
    dir_back: "뒤",
    dir_left: "좌",
    dir_right: "우",
    dir_up: "위",
    dir_down: "아래",

    // Sidebar
    off: "끄기",
    all: "전체",
    empty: "비어 있음",
    default_block: "기본",
    sidebar_dir_forward: "앞",
    sidebar_dir_right: "오른쪽",
    sidebar_dir_up: "위",
    sidebar_sym_lr: "좌우",
    sidebar_sym_fb: "앞뒤",
    n_items: "{0}개",
    layer_only_n: "{0}층만",
    layer_below_n: "{0}층 이하",

    // Hint bar
    hint_place: "블록 설치",
    hint_lclick: "마우스 좌클릭",
    hint_remove: "블록 제거",
    hint_rclick: "마우스 우클릭",
    hint_move: "이동",
    hint_updown: "상하",
    hint_shape: "블록종류",
    hint_rotation: "회전",
    hint_batch: "일괄배치",
    hint_symmetry: "대칭배치",
    hint_undo: "되돌리기",
    hint_lock: "카메라 고정/해제",
    hint_moveall: "블럭 전체이동",
    hint_moveall_dir: "상/하/좌/우",
    hint_moveall_ud: "위/아래",

    // Lock button
    lock_release: "클릭해서 화면고정 해제",

    // Toasts
    toast_placed: "블록을 배치했습니다.",
    toast_placed_n: "{0}개를 배치했습니다.",
    toast_removed: "블록을 삭제했습니다.",
    toast_bookmark: "북마크 단축키를 막았습니다.",
    toast_close: "창 닫기 단축키를 막았습니다.",
    toast_no_undo: "되돌릴 작업이 없습니다.",
    toast_no_redo: "다시 실행할 작업이 없습니다.",
    toast_undo: "실행 취소했습니다.",
    toast_redo: "다시 실행했습니다.",
    toast_moved: "전체 이동: {0}",
    toast_cant_move: "더 이상 이동할 수 없습니다.",
    toast_loaded: "설계를 불러왔습니다.",
    toast_load_error: "파일을 읽을 수 없습니다.",
    toast_autosave: "자동 저장된 설계를 불러왔습니다.",
    toast_ready: "준비 완료",
    toast_viewer: "뷰어 모드",
    toast_shape: "블록 종류: {0}",
    toast_rotation: "회전: {0}°",
    toast_batch: "일괄배치: {0}",
    toast_symmetry: "대칭: {0}",
    confirm_reset: "현재 배치된 모든 요소를 초기화할까요? 저장하지 않은 내용은 사라집니다.",
    toast_reset: "설계를 초기화했습니다.",
    toast_cant_remove: "기본 색상은 삭제할 수 없습니다.",
    toast_color_removed: "색상을 삭제했습니다.",
    toast_color_added: "새 색상을 추가했습니다.",
    toast_aim_copy: "복사할 블록을 조준해 주세요.",
    toast_copy_fail: "복사할 블록을 찾지 못했습니다.",
    toast_copied: "블록 1개를 복사했습니다.",
    toast_clipboard_empty: "클립보드가 비어 있습니다.",
    toast_aim_paste: "붙여넣을 위치를 조준해 주세요.",
    toast_pasted: "붙여넣었습니다.",

    // Batch direction labels (toast)
    batch_dir_off: "끄기",
    batch_dir_forward: "앞으로",
    batch_dir_right: "오른쪽",
    batch_dir_up: "위로",

    // Symmetry labels (toast)
    sym_label_off: "끄기",
    sym_label_lr: "좌우 대칭",
    sym_label_fb: "앞뒤 대칭",

    // Mobile
    mobile_blocks: "블록 {0}개",
    mobile_viewer: "뷰어 모드 — 편집은 PC에서 가능합니다",
    mobile_hint: "드래그: 회전 · 핀치: 줌 · 두 손가락 드래그: 이동",

    // WebGL error
    webgl_title: "WebGL을 사용할 수 없습니다",
    webgl_msg: "브라우저가 WebGL을 지원하는지 확인해 주세요.",
  },

  en: {
    language: "Language",
    add_block: "Add Block",
    rename_placeholder: "Rename block",
    add_color_title: "Add color",
    remove_color_title: "Remove color",
    color_title: "Color",
    rotation: "Rotation",
    batch: "Batch Place",
    batch_off: "Off",
    batch_forward: "Forward",
    batch_right: "Right",
    batch_up: "Up",
    symmetry: "Symmetry",
    sym_off: "Off",
    sym_lr: "Left-Right",
    sym_fb: "Front-Back",
    layer: "Layer View",
    layer_all: "All",
    layer_only: "This floor",
    layer_below: "Below",
    camera_settings: "Camera",
    sensitivity: "Sensitivity",
    move_speed: "Speed",
    zoom_range: "Zoom",
    save: "Save",
    save_title: "Save JSON",
    load: "Load",
    load_title: "Load JSON",
    reset: "Reset",

    stat_blocks: "Blocks",
    stat_coord: "Selected",
    stat_camera: "Camera",
    stat_color: "Color",
    stat_shape: "Shape",
    stat_rotation: "Rotation",
    stat_batch: "Batch",
    stat_symmetry: "Symmetry",
    stat_layer: "Layer",
    stat_clipboard: "Clipboard",

    shape_cube: "Block",
    shape_wedge: "Wedge",
    shape_corner: "Corner",

    dir_front: "F",
    dir_back: "B",
    dir_left: "L",
    dir_right: "R",
    dir_up: "Up",
    dir_down: "Down",

    off: "Off",
    all: "All",
    empty: "Empty",
    default_block: "Default",
    sidebar_dir_forward: "Fwd",
    sidebar_dir_right: "Right",
    sidebar_dir_up: "Up",
    sidebar_sym_lr: "L-R",
    sidebar_sym_fb: "F-B",
    n_items: "{0}",
    layer_only_n: "Floor {0} only",
    layer_below_n: "Floor {0} & below",

    hint_place: "Place",
    hint_lclick: "Left Click",
    hint_remove: "Remove",
    hint_rclick: "Right Click",
    hint_move: "Move",
    hint_updown: "Up/Down",
    hint_shape: "Shape",
    hint_rotation: "Rotate",
    hint_batch: "Batch",
    hint_symmetry: "Symmetry",
    hint_undo: "Undo/Redo",
    hint_lock: "Lock/Unlock",
    hint_moveall: "Move All",
    hint_moveall_dir: "Directions",
    hint_moveall_ud: "Up/Down",

    lock_release: "Click to unlock view",

    toast_placed: "Block placed.",
    toast_placed_n: "{0} blocks placed.",
    toast_removed: "Block removed.",
    toast_bookmark: "Bookmark shortcut blocked.",
    toast_close: "Close shortcut blocked.",
    toast_no_undo: "Nothing to undo.",
    toast_no_redo: "Nothing to redo.",
    toast_undo: "Undone.",
    toast_redo: "Redone.",
    toast_moved: "Moved all: {0}",
    toast_cant_move: "Cannot move further.",
    toast_loaded: "Design loaded.",
    toast_load_error: "Cannot read file.",
    toast_autosave: "Auto-saved design loaded.",
    toast_ready: "Ready",
    toast_viewer: "Viewer mode",
    toast_shape: "Shape: {0}",
    toast_rotation: "Rotation: {0}\u00B0",
    toast_batch: "Batch: {0}",
    toast_symmetry: "Symmetry: {0}",
    confirm_reset: "Reset all blocks? Unsaved changes will be lost.",
    toast_reset: "Design reset.",
    toast_cant_remove: "Cannot remove default color.",
    toast_color_removed: "Color removed.",
    toast_color_added: "New color added.",
    toast_aim_copy: "Aim at a block to copy.",
    toast_copy_fail: "Block not found.",
    toast_copied: "Copied 1 block.",
    toast_clipboard_empty: "Clipboard is empty.",
    toast_aim_paste: "Aim at a position to paste.",
    toast_pasted: "Pasted.",

    batch_dir_off: "Off",
    batch_dir_forward: "Forward",
    batch_dir_right: "Right",
    batch_dir_up: "Up",

    sym_label_off: "Off",
    sym_label_lr: "Left-Right",
    sym_label_fb: "Front-Back",

    mobile_blocks: "{0} blocks",
    mobile_viewer: "Viewer mode \u2014 Edit on PC",
    mobile_hint: "Drag: Rotate \u00B7 Pinch: Zoom \u00B7 Two fingers: Pan",

    webgl_title: "WebGL Unavailable",
    webgl_msg: "Please check if your browser supports WebGL.",
  },
};

const state = { lang: localStorage.getItem("pokopia-lang") || "en" };

export function t(key, ...args) {
  let text = dict[state.lang]?.[key] ?? dict.ko[key] ?? key;
  for (let i = 0; i < args.length; i++) {
    text = text.replace(`{${i}}`, args[i]);
  }
  return text;
}

export function getLang() {
  return state.lang;
}

export function setLang(code) {
  state.lang = code;
  localStorage.setItem("pokopia-lang", code);
  applyLang();
}

export function applyLang() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.dataset.i18nTitle);
  }
}

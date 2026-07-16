import { t, getLang, setLang, applyLang } from "./i18n.js";

const SHAPE_ICONS = {
  cube: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v9"/>',
  wedge: '<path d="M4 20h16L20 4 4 20z"/>',
  corner: '<path d="M4 20h16V4L4 20z"/>',
  cylinder: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/>',
  hCylinder: '<ellipse cx="6" cy="12" rx="3" ry="8"/><path d="M6 4h12c1.66 0 3 3.58 3 8s-1.34 8-3 8H6"/>',
  halfCylinder: '<path d="M4 20h16V12a8 8 0 0 0-16 0v8z"/>',
  halfCube: '<rect x="3" y="12" width="18" height="9" rx="1"/>',
  window: '<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="10" height="10" rx="0"/>',
  slopedWindow: '<path d="M4 20L20 4"/><path d="M7 17L17 7"/><path d="M4 20l3-3M20 4l-3 3"/>',
  arch: '<path d="M4 20V4a16 16 0 0 1 16 16"/>',
  stair: '<path d="M4 20h5v-5h5v-5h5V4"/>',
  ladder: '<path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8"/>',
  rope: '<path d="M12 2v20" stroke-dasharray="3 2"/>',
  fence: '<path d="M6 3v18M18 3v18M6 8h12M6 15h12"/>',
};

const SHAPES = [
  "cube", "wedge", "corner", "cylinder", "hCylinder", "halfCylinder", "halfCube",
  "window", "slopedWindow", "arch", "stair", "ladder", "rope", "fence",
];

const guideContent = {
  ko: {
    pageTitle: "포코피아 빌더 사용 가이드",
    backToApp: "앱으로 돌아가기",
    tocTitle: "목차",
    pcTitle: "PC 조작",
    mobileTitle: "모바일 조작",
    sections: [
      {
        id: "basics",
        title: "1. 기본 조작",
        content: `
          <p>화면을 클릭하면 포인터가 잠기며 FPS 스타일로 조작할 수 있습니다. <kbd>Tab</kbd>을 누르면 포인터 잠금을 해제합니다.</p>
          <table class="guide-table">
            <thead><tr><th>동작</th><th>키</th></tr></thead>
            <tbody>
              <tr><td>블록 배치</td><td><kbd>마우스 좌클릭</kbd></td></tr>
              <tr><td>블록 삭제</td><td><kbd>마우스 우클릭</kbd></td></tr>
              <tr><td>카메라 이동</td><td><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></td></tr>
              <tr><td>카메라 높이</td><td><kbd>Space</kbd> / <kbd>Shift</kbd></td></tr>
              <tr><td>줌 인 / 아웃</td><td><kbd>스크롤</kbd></td></tr>
              <tr><td>카메라 잠금 / 해제</td><td><kbd>Tab</kbd></td></tr>
              <tr><td>블록 회전</td><td><kbd>R</kbd> (0° → 90° → 180° → 270°)</td></tr>
              <tr><td>블록 종류 전환</td><td><kbd>Q</kbd> (14종 순차 전환)</td></tr>
              <tr><td>블록 교체</td><td><kbd>G</kbd> (기존 블록의 모양/회전을 현재 선택으로 교체)</td></tr>
            </tbody>
          </table>
        `,
      },
      {
        id: "blocks",
        title: "2. 블록 종류",
        content: "##BLOCKS##",
      },
      {
        id: "colors",
        title: "3. 색상/재질 관리",
        content: `
          <p>좌측 패널의 <strong>원형 스와치 버튼</strong>을 클릭하여 색상을 선택합니다.</p>
          <ul>
            <li><strong>색상 추가</strong> — <kbd>+</kbd> 버튼으로 새 색상을 추가합니다.</li>
            <li><strong>색상 삭제</strong> — <kbd>−</kbd> 버튼으로 선택된 색상을 삭제합니다. (해당 색상의 블록도 함께 삭제)</li>
            <li><strong>색상 변경</strong> — 컬러 피커를 클릭하여 색상을 변경합니다. 스와치에 실시간 반영됩니다.</li>
            <li><strong>이름 변경</strong> — 이름 입력란에 메모를 남길 수 있습니다.</li>
            <li><strong>블록 수 통계</strong> — 우측 패널 하단에서 색상별 블록 개수를 확인할 수 있습니다.</li>
          </ul>
          <p>기본 6색이 제공됩니다: 보라, 빨강, 주황, 초록, 파랑, 회색.</p>
        `,
      },
      {
        id: "batch",
        title: "4. 일괄 배치 & 대칭",
        content: `
          <h4>일괄 배치</h4>
          <p><kbd>E</kbd> 키를 눌러 방향을 순환합니다: 끄기 → 앞 → 오른쪽 → 위 → 면적</p>
          <ul>
            <li><strong>앞/오른쪽/위</strong> — 해당 방향으로 N개 연속 배치</li>
            <li><strong>면적</strong> — XZ 평면에 N×N 그리드 배치 (최대 8×8)</li>
            <li><kbd>E</kbd>를 길게 누르면 개수 조절 UI가 표시됩니다.</li>
            <li>배치 전 <strong>고스트 프리뷰</strong>로 미리 확인할 수 있습니다.</li>
          </ul>
          <h4>대칭 배치</h4>
          <p><kbd>T</kbd> 키를 눌러 대칭 모드를 순환합니다: 끄기 → 좌우 대칭 → 앞뒤 대칭</p>
          <ul>
            <li>일괄 배치와 동시 사용 가능합니다.</li>
          </ul>
        `,
      },
      {
        id: "boxselect",
        title: "5. 범위 선택",
        content: `
          <p><kbd>F</kbd> 키를 두 번 눌러 시작점과 끝점을 지정합니다. 선택 범위가 시안색 와이어프레임으로 표시됩니다.</p>
          <table class="guide-table">
            <thead><tr><th>동작</th><th>키</th></tr></thead>
            <tbody>
              <tr><td>범위 시작점 / 끝점 지정</td><td><kbd>F</kbd></td></tr>
              <tr><td>선택 범위 삭제</td><td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td></tr>
              <tr><td>선택 범위 복사</td><td><kbd>Ctrl</kbd>+<kbd>C</kbd></td></tr>
              <tr><td>붙여넣기</td><td><kbd>Ctrl</kbd>+<kbd>V</kbd></td></tr>
              <tr><td>선택 범위 이동</td><td><kbd>Ctrl</kbd>+<kbd>방향키</kbd> · <kbd>Ctrl</kbd>+<kbd>.</kbd>/<kbd>,</kbd></td></tr>
              <tr><td>선택 범위 회전 (90°)</td><td><kbd>Ctrl</kbd>+<kbd>R</kbd></td></tr>
            </tbody>
          </table>
          <ul>
            <li>빈 바닥 두 점을 선택하면 Y축 전체 범위로 자동 확장됩니다.</li>
            <li>좌/우 클릭 시 선택이 해제됩니다.</li>
            <li>회전은 선택 영역의 중심을 기준으로 블록 좌표와 개별 회전값 모두 회전합니다.</li>
          </ul>
        `,
      },
      {
        id: "layer",
        title: "6. 레이어 필터",
        content: `
          <p>좌측 패널에서 레이어 보기 모드를 변경할 수 있습니다.</p>
          <ul>
            <li><strong>전체</strong> — 모든 층의 블록을 표시합니다.</li>
            <li><strong>해당 층만</strong> — 선택한 층의 블록만 표시합니다.</li>
            <li><strong>해당 층 이하</strong> — 선택한 층 이하의 블록만 표시합니다.</li>
          </ul>
          <p>층 번호를 좌측 패널에서 조절할 수 있습니다.</p>
        `,
      },
      {
        id: "pixelart",
        title: "7. 이미지 → 픽셀아트",
        content: `
          <p>좌측 패널의 <strong>이미지 → 픽셀아트</strong> 버튼을 클릭합니다.</p>
          <ul>
            <li><strong>이미지 업로드</strong> — PNG, JPG 등 이미지 파일을 선택합니다.</li>
            <li><strong>해상도</strong> — 8~64 사이로 조절합니다 (가로 픽셀 수).</li>
            <li><strong>색상 수</strong> — 2~16 사이로 조절합니다 (사용할 색상 수).</li>
            <li><strong>방향</strong> — 바닥(XZ) 또는 벽(XY)을 선택합니다.</li>
            <li>미리보기를 확인한 후 <strong>적용</strong>하면 블록으로 자동 배치됩니다.</li>
            <li>색상은 자동으로 생성됩니다.</li>
          </ul>
        `,
      },
      {
        id: "saveload",
        title: "8. 저장 / 불러오기 / 공유 / 스크린샷",
        content: `
          <ul>
            <li><strong>자동 저장</strong> — 변경사항이 브라우저에 자동 저장됩니다.</li>
            <li><strong>JSON 저장</strong> — 좌측 패널 <strong>저장</strong> 버튼으로 파일을 다운로드합니다.</li>
            <li><strong>JSON 불러오기</strong> — <strong>불러오기</strong> 버튼으로 이전에 저장한 파일을 불러옵니다.</li>
            <li><strong>공유</strong> — 좌측 패널 <strong>공유</strong> 버튼으로 공유 링크를 생성합니다. 링크 접속 시 설계도가 자동으로 로드됩니다. (90일 보관)</li>
            <li><strong>스크린샷</strong> — <kbd>P</kbd> 키 또는 좌측 패널 스크린샷 버튼으로 현재 화면을 PNG로 캡처합니다.</li>
            <li><strong>2D 평면도</strong> — 좌측 패널 <strong>평면도</strong> 버튼으로 층별 2D 뷰를 확인하고 PNG로 저장할 수 있습니다.</li>
          </ul>
        `,
      },
      {
        id: "mobile",
        title: "9. 모바일 조작법",
        content: `
          <p>모바일에서는 터치 기반의 간편 편집 모드를 사용합니다.</p>
          <table class="guide-table">
            <thead><tr><th>동작</th><th>제스처</th></tr></thead>
            <tbody>
              <tr><td>블록 배치</td><td>탭</td></tr>
              <tr><td>블록 삭제</td><td>길게 누르기</td></tr>
              <tr><td>카메라 회전</td><td>드래그</td></tr>
              <tr><td>카메라 이동</td><td>가상 조이스틱</td></tr>
              <tr><td>카메라 높이</td><td>▲▼ 버튼</td></tr>
            </tbody>
          </table>
          <h4>하단 툴바</h4>
          <ul>
            <li><strong>블록 선택</strong> — 14종 블록 아이콘 모달에서 선택</li>
            <li><strong>색상 선택</strong> — 색상 관리 모달 (추가/삭제/변경)</li>
            <li><strong>회전</strong> — 0° / 90° / 180° / 270° 순차 전환</li>
            <li><strong>일괄 배치</strong> — 방향 및 개수 선택 모달</li>
            <li><strong>대칭</strong> — 끄기 / 좌우 / 앞뒤 전환</li>
            <li><strong>범위 선택</strong> — 두 지점 탭으로 범위 지정 → 삭제/이동/회전</li>
            <li><strong>레이어</strong> — 전체 / 해당 층 / 이하 모달</li>
            <li><strong>되돌리기 / 다시실행</strong></li>
            <li><strong>저장 / 불러오기 / 공유 / 스크린샷 / 초기화</strong></li>
          </ul>
        `,
      },
    ],
  },
  en: {
    pageTitle: "Pokopia Builder User Guide",
    backToApp: "Back to App",
    tocTitle: "Table of Contents",
    pcTitle: "PC Controls",
    mobileTitle: "Mobile Controls",
    sections: [
      {
        id: "basics",
        title: "1. Basic Controls",
        content: `
          <p>Click on the screen to lock the pointer for FPS-style controls. Press <kbd>Tab</kbd> to release the pointer lock.</p>
          <table class="guide-table">
            <thead><tr><th>Action</th><th>Key</th></tr></thead>
            <tbody>
              <tr><td>Place Block</td><td><kbd>Mouse Left Click</kbd></td></tr>
              <tr><td>Remove Block</td><td><kbd>Mouse Right Click</kbd></td></tr>
              <tr><td>Move Camera</td><td><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></td></tr>
              <tr><td>Camera Height</td><td><kbd>Space</kbd> / <kbd>Shift</kbd></td></tr>
              <tr><td>Zoom In / Out</td><td><kbd>Scroll</kbd></td></tr>
              <tr><td>Lock / Unlock Pointer</td><td><kbd>Tab</kbd></td></tr>
              <tr><td>Rotate Block</td><td><kbd>R</kbd> (0° → 90° → 180° → 270°)</td></tr>
              <tr><td>Cycle Block Type</td><td><kbd>Q</kbd> (cycle through 14 types)</td></tr>
              <tr><td>Swap Block</td><td><kbd>G</kbd> (replace shape/rotation of existing block)</td></tr>
            </tbody>
          </table>
        `,
      },
      {
        id: "blocks",
        title: "2. Block Types",
        content: "##BLOCKS##",
      },
      {
        id: "colors",
        title: "3. Color / Material Management",
        content: `
          <p>Click the <strong>circular swatch buttons</strong> in the left panel to select a color.</p>
          <ul>
            <li><strong>Add Color</strong> — Click <kbd>+</kbd> to add a new color.</li>
            <li><strong>Remove Color</strong> — Click <kbd>−</kbd> to remove the selected color (blocks with that color are also removed).</li>
            <li><strong>Change Color</strong> — Click the color picker to change the color. Swatches update in real-time.</li>
            <li><strong>Rename</strong> — Enter a memo in the name input field.</li>
            <li><strong>Block Stats</strong> — View block counts by color at the bottom of the right panel.</li>
          </ul>
          <p>6 default colors are provided: purple, red, orange, green, blue, gray.</p>
        `,
      },
      {
        id: "batch",
        title: "4. Batch Placement & Symmetry",
        content: `
          <h4>Batch Placement</h4>
          <p>Press <kbd>E</kbd> to cycle directions: Off → Forward → Right → Up → Area</p>
          <ul>
            <li><strong>Forward / Right / Up</strong> — Place N blocks in a row.</li>
            <li><strong>Area</strong> — Place N×N grid on the XZ plane (max 8×8).</li>
            <li>Hold <kbd>E</kbd> to adjust the count.</li>
            <li>A <strong>ghost preview</strong> shows where blocks will be placed.</li>
          </ul>
          <h4>Symmetry</h4>
          <p>Press <kbd>T</kbd> to cycle: Off → Left-Right → Front-Back</p>
          <ul>
            <li>Can be used together with batch placement.</li>
          </ul>
        `,
      },
      {
        id: "boxselect",
        title: "5. Box Select",
        content: `
          <p>Press <kbd>F</kbd> twice to define a start and end point. The selection is shown as a cyan wireframe box.</p>
          <table class="guide-table">
            <thead><tr><th>Action</th><th>Key</th></tr></thead>
            <tbody>
              <tr><td>Set Start / End Point</td><td><kbd>F</kbd></td></tr>
              <tr><td>Delete Selection</td><td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td></tr>
              <tr><td>Copy Selection</td><td><kbd>Ctrl</kbd>+<kbd>C</kbd></td></tr>
              <tr><td>Paste</td><td><kbd>Ctrl</kbd>+<kbd>V</kbd></td></tr>
              <tr><td>Move Selection</td><td><kbd>Ctrl</kbd>+<kbd>Arrows</kbd> · <kbd>Ctrl</kbd>+<kbd>.</kbd>/<kbd>,</kbd></td></tr>
              <tr><td>Rotate Selection (90°)</td><td><kbd>Ctrl</kbd>+<kbd>R</kbd></td></tr>
            </tbody>
          </table>
          <ul>
            <li>Selecting two empty ground points auto-extends the Y range to full height.</li>
            <li>Left/right click clears the selection.</li>
            <li>Rotation rotates both block coordinates and individual rotation values around the center of the selection.</li>
          </ul>
        `,
      },
      {
        id: "layer",
        title: "6. Layer Filter",
        content: `
          <p>Change the layer view mode in the left panel.</p>
          <ul>
            <li><strong>All</strong> — Show all layers.</li>
            <li><strong>Current Only</strong> — Show only the selected layer.</li>
            <li><strong>Current & Below</strong> — Show the selected layer and below.</li>
          </ul>
          <p>Adjust the layer number in the left panel.</p>
        `,
      },
      {
        id: "pixelart",
        title: "7. Image → Pixel Art",
        content: `
          <p>Click the <strong>Image → Pixel Art</strong> button in the left panel.</p>
          <ul>
            <li><strong>Upload</strong> — Select a PNG or JPG image file.</li>
            <li><strong>Resolution</strong> — Adjust between 8–64 (horizontal pixel count).</li>
            <li><strong>Color Count</strong> — Adjust between 2–16.</li>
            <li><strong>Orientation</strong> — Choose floor (XZ) or wall (XY).</li>
            <li>Preview the result, then click <strong>Apply</strong> to place blocks.</li>
            <li>Colors are generated automatically.</li>
          </ul>
        `,
      },
      {
        id: "saveload",
        title: "8. Save / Load / Share / Screenshot",
        content: `
          <ul>
            <li><strong>Auto-save</strong> — Changes are automatically saved in your browser.</li>
            <li><strong>JSON Save</strong> — Click <strong>Save</strong> in the left panel to download a file.</li>
            <li><strong>JSON Load</strong> — Click <strong>Load</strong> to import a previously saved file.</li>
            <li><strong>Share</strong> — Click <strong>Share</strong> to generate a share link (copied to clipboard). Designs are stored for 90 days.</li>
            <li><strong>Screenshot</strong> — Press <kbd>P</kbd> or click the screenshot button to capture the current view as PNG.</li>
            <li><strong>2D Floor Plan</strong> — Click <strong>Floor Plan</strong> to view layer-by-layer 2D view and save as PNG.</li>
          </ul>
        `,
      },
      {
        id: "mobile",
        title: "9. Mobile Controls",
        content: `
          <p>On mobile, a touch-based simple editor mode is used.</p>
          <table class="guide-table">
            <thead><tr><th>Action</th><th>Gesture</th></tr></thead>
            <tbody>
              <tr><td>Place Block</td><td>Tap</td></tr>
              <tr><td>Remove Block</td><td>Long Press</td></tr>
              <tr><td>Rotate Camera</td><td>Drag</td></tr>
              <tr><td>Move Camera</td><td>Virtual Joystick</td></tr>
              <tr><td>Camera Height</td><td>▲▼ Buttons</td></tr>
            </tbody>
          </table>
          <h4>Bottom Toolbar</h4>
          <ul>
            <li><strong>Block Select</strong> — Choose from 14 block types in icon modal</li>
            <li><strong>Color Select</strong> — Color management modal (add/remove/change)</li>
            <li><strong>Rotation</strong> — Cycle 0° / 90° / 180° / 270°</li>
            <li><strong>Batch</strong> — Direction and count selection modal</li>
            <li><strong>Symmetry</strong> — Off / Left-Right / Front-Back toggle</li>
            <li><strong>Box Select</strong> — Tap two points to define range → delete/move/rotate</li>
            <li><strong>Layer</strong> — All / Current / Below modal</li>
            <li><strong>Undo / Redo</strong></li>
            <li><strong>Save / Load / Share / Screenshot / Reset</strong></li>
          </ul>
        `,
      },
    ],
  },
  ja: {
    pageTitle: "ポコピアビルダー 使い方ガイド",
    backToApp: "アプリに戻る",
    tocTitle: "目次",
    pcTitle: "PC操作",
    mobileTitle: "モバイル操作",
    sections: [
      {
        id: "basics",
        title: "1. 基本操作",
        content: `
          <p>画面をクリックするとポインターがロックされ、FPSスタイルで操作できます。<kbd>Tab</kbd>でロック解除。</p>
          <table class="guide-table">
            <thead><tr><th>動作</th><th>キー</th></tr></thead>
            <tbody>
              <tr><td>ブロック配置</td><td><kbd>マウス左クリック</kbd></td></tr>
              <tr><td>ブロック削除</td><td><kbd>マウス右クリック</kbd></td></tr>
              <tr><td>カメラ移動</td><td><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></td></tr>
              <tr><td>カメラ高さ</td><td><kbd>Space</kbd> / <kbd>Shift</kbd></td></tr>
              <tr><td>ズームイン / アウト</td><td><kbd>スクロール</kbd></td></tr>
              <tr><td>カメラロック / 解除</td><td><kbd>Tab</kbd></td></tr>
              <tr><td>ブロック回転</td><td><kbd>R</kbd> (0° → 90° → 180° → 270°)</td></tr>
              <tr><td>ブロック種類切替</td><td><kbd>Q</kbd> (14種を順次切替)</td></tr>
              <tr><td>ブロック交換</td><td><kbd>G</kbd> (既存ブロックの形状/回転を現在の選択に交換)</td></tr>
            </tbody>
          </table>
        `,
      },
      {
        id: "blocks",
        title: "2. ブロック種類",
        content: "##BLOCKS##",
      },
      {
        id: "colors",
        title: "3. 色/素材管理",
        content: `
          <p>左パネルの<strong>丸型スウォッチボタン</strong>をクリックして色を選択します。</p>
          <ul>
            <li><strong>色追加</strong> — <kbd>+</kbd>ボタンで新しい色を追加。</li>
            <li><strong>色削除</strong> — <kbd>−</kbd>ボタンで選択した色を削除（その色のブロックも削除）。</li>
            <li><strong>色変更</strong> — カラーピッカーで色を変更。スウォッチにリアルタイム反映。</li>
            <li><strong>名前変更</strong> — 名前入力欄にメモを残せます。</li>
            <li><strong>ブロック統計</strong> — 右パネル下部で色別ブロック数を確認。</li>
          </ul>
          <p>デフォルト6色：紫、赤、オレンジ、緑、青、グレー。</p>
        `,
      },
      {
        id: "batch",
        title: "4. 一括配置 & 対称",
        content: `
          <h4>一括配置</h4>
          <p><kbd>E</kbd>キーで方向を循環：オフ → 前方 → 右 → 上 → 面積</p>
          <ul>
            <li><strong>前方/右/上</strong> — 該当方向にN個連続配置。</li>
            <li><strong>面積</strong> — XZ平面にN×Nグリッド配置（最大8×8）。</li>
            <li><kbd>E</kbd>長押しで個数調整UIが表示されます。</li>
            <li><strong>ゴーストプレビュー</strong>で配置位置を事前確認。</li>
          </ul>
          <h4>対称配置</h4>
          <p><kbd>T</kbd>キーで循環：オフ → 左右対称 → 前後対称</p>
          <ul>
            <li>一括配置と同時使用可能。</li>
          </ul>
        `,
      },
      {
        id: "boxselect",
        title: "5. 範囲選択",
        content: `
          <p><kbd>F</kbd>キーを2回押して開始点と終了点を指定。選択範囲はシアン色のワイヤーフレームで表示されます。</p>
          <table class="guide-table">
            <thead><tr><th>動作</th><th>キー</th></tr></thead>
            <tbody>
              <tr><td>開始点/終了点指定</td><td><kbd>F</kbd></td></tr>
              <tr><td>選択範囲削除</td><td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td></tr>
              <tr><td>選択範囲コピー</td><td><kbd>Ctrl</kbd>+<kbd>C</kbd></td></tr>
              <tr><td>ペースト</td><td><kbd>Ctrl</kbd>+<kbd>V</kbd></td></tr>
              <tr><td>選択範囲移動</td><td><kbd>Ctrl</kbd>+<kbd>矢印キー</kbd> · <kbd>Ctrl</kbd>+<kbd>.</kbd>/<kbd>,</kbd></td></tr>
              <tr><td>選択範囲回転 (90°)</td><td><kbd>Ctrl</kbd>+<kbd>R</kbd></td></tr>
            </tbody>
          </table>
          <ul>
            <li>空の地面2点を選択するとY軸全範囲に自動拡張されます。</li>
            <li>左/右クリックで選択解除。</li>
            <li>回転は選択範囲の中心を基準に座標と個別回転値を回転します。</li>
          </ul>
        `,
      },
      {
        id: "layer",
        title: "6. レイヤーフィルター",
        content: `
          <p>左パネルでレイヤー表示モードを変更できます。</p>
          <ul>
            <li><strong>全体</strong> — すべての階のブロックを表示。</li>
            <li><strong>該当階のみ</strong> — 選択した階のブロックのみ表示。</li>
            <li><strong>該当階以下</strong> — 選択した階以下のブロックを表示。</li>
          </ul>
          <p>階数は左パネルで調整できます。</p>
        `,
      },
      {
        id: "pixelart",
        title: "7. 画像 → ピクセルアート",
        content: `
          <p>左パネルの<strong>画像 → ピクセルアート</strong>ボタンをクリックします。</p>
          <ul>
            <li><strong>アップロード</strong> — PNGまたはJPG画像ファイルを選択。</li>
            <li><strong>解像度</strong> — 8〜64の間で調整（横ピクセル数）。</li>
            <li><strong>色数</strong> — 2〜16の間で調整。</li>
            <li><strong>方向</strong> — 床(XZ)または壁(XY)を選択。</li>
            <li>プレビューを確認後、<strong>適用</strong>でブロックを自動配置。</li>
            <li>色は自動生成されます。</li>
          </ul>
        `,
      },
      {
        id: "saveload",
        title: "8. 保存 / 読込 / 共有 / スクリーンショット",
        content: `
          <ul>
            <li><strong>自動保存</strong> — 変更はブラウザに自動保存されます。</li>
            <li><strong>JSON保存</strong> — 左パネルの<strong>保存</strong>ボタンでファイルをダウンロード。</li>
            <li><strong>JSON読込</strong> — <strong>読込</strong>ボタンで以前保存したファイルを読み込み。</li>
            <li><strong>共有</strong> — <strong>共有</strong>ボタンで共有リンクを生成（クリップボードにコピー）。設計図は90日間保管。</li>
            <li><strong>スクリーンショット</strong> — <kbd>P</kbd>キーまたはスクリーンショットボタンで現在の画面をPNGキャプチャ。</li>
            <li><strong>2D平面図</strong> — <strong>平面図</strong>ボタンで階層別2Dビューを確認、PNGで保存可能。</li>
          </ul>
        `,
      },
      {
        id: "mobile",
        title: "9. モバイル操作",
        content: `
          <p>モバイルではタッチベースの簡単編集モードを使用します。</p>
          <table class="guide-table">
            <thead><tr><th>動作</th><th>ジェスチャー</th></tr></thead>
            <tbody>
              <tr><td>ブロック配置</td><td>タップ</td></tr>
              <tr><td>ブロック削除</td><td>長押し</td></tr>
              <tr><td>カメラ回転</td><td>ドラッグ</td></tr>
              <tr><td>カメラ移動</td><td>仮想ジョイスティック</td></tr>
              <tr><td>カメラ高さ</td><td>▲▼ボタン</td></tr>
            </tbody>
          </table>
          <h4>下部ツールバー</h4>
          <ul>
            <li><strong>ブロック選択</strong> — 14種のブロックアイコンモーダルから選択</li>
            <li><strong>色選択</strong> — 色管理モーダル（追加/削除/変更）</li>
            <li><strong>回転</strong> — 0° / 90° / 180° / 270° 順次切替</li>
            <li><strong>一括配置</strong> — 方向と個数選択モーダル</li>
            <li><strong>対称</strong> — オフ / 左右 / 前後切替</li>
            <li><strong>範囲選択</strong> — 2点タップで範囲指定 → 削除/移動/回転</li>
            <li><strong>レイヤー</strong> — 全体 / 該当階 / 以下モーダル</li>
            <li><strong>元に戻す / やり直し</strong></li>
            <li><strong>保存 / 読込 / 共有 / スクリーンショット / リセット</strong></li>
          </ul>
        `,
      },
    ],
  },
};

const shapeDescriptions = {
  ko: {
    cube: "기본 정육면체 블록",
    wedge: "경사면이 있는 지붕 블록",
    corner: "L자 형태 지붕 모서리 블록",
    cylinder: "수직 원통형 블록",
    hCylinder: "수평으로 누운 원통형 블록",
    halfCylinder: "아래가 평평하고 위가 둥근 반원통 블록",
    halfCube: "기본 블록의 절반 높이 직육면체",
    window: "유리 패널이 달린 프레임 블록",
    slopedWindow: "45° 기울어진 창문 블록",
    arch: "1/4 원호 형태 블록",
    stair: "2단 계단 형태 블록",
    ladder: "양쪽 레일 + 4단 발판 (위아래 연결 가능)",
    rope: "가는 세로줄 블록",
    fence: "두 기둥 + 가로대 블록",
  },
  en: {
    cube: "Standard cube block",
    wedge: "Sloped roof block",
    corner: "L-shaped roof corner block",
    cylinder: "Vertical cylindrical block",
    hCylinder: "Horizontal cylindrical block",
    halfCylinder: "Flat bottom, curved top half-pipe block",
    halfCube: "Half-height rectangular slab",
    window: "Frame block with glass panel",
    slopedWindow: "45° tilted window block",
    arch: "Quarter-circle arc block",
    stair: "Two-step stair block",
    ladder: "Both rails + 4 rungs (stackable vertically)",
    rope: "Thin vertical line block",
    fence: "Two posts + crossbar block",
  },
  ja: {
    cube: "標準の立方体ブロック",
    wedge: "傾斜面のある屋根ブロック",
    corner: "L字型の屋根コーナーブロック",
    cylinder: "縦型の円筒ブロック",
    hCylinder: "横向きの円筒ブロック",
    halfCylinder: "下が平らで上が丸いハーフパイプブロック",
    halfCube: "基本ブロックの半分の高さの直方体",
    window: "ガラスパネル付きフレームブロック",
    slopedWindow: "45°傾いた窓ブロック",
    arch: "1/4円弧ブロック",
    stair: "2段の階段ブロック",
    ladder: "両側レール + 4段（上下連結可能）",
    rope: "細い縦線ブロック",
    fence: "2本の柱 + 横桟ブロック",
  },
};

function renderBlocksGrid(lang) {
  const descs = shapeDescriptions[lang] || shapeDescriptions.en;
  let html = '<div class="guide-blocks-grid">';
  for (const shape of SHAPES) {
    const name = t("shape_" + shape);
    const desc = descs[shape] || "";
    const svgPath = SHAPE_ICONS[shape];
    html += `
      <div class="guide-block-card">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
        <strong>${name}</strong>
        <span class="guide-block-desc">${desc}</span>
      </div>`;
  }
  html += "</div>";
  return html;
}

function renderGuide() {
  const lang = getLang();
  const data = guideContent[lang] || guideContent.en;
  const container = document.querySelector("#guideContent");

  // Title
  document.querySelector("#guidePageTitle").textContent = data.pageTitle;
  const backLink = document.querySelector("#guideBackLink");
  backLink.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>${data.backToApp}`;

  // TOC
  let tocHtml = `<h2>${data.tocTitle}</h2><ul>`;
  for (const section of data.sections) {
    tocHtml += `<li><a href="#${section.id}">${section.title}</a></li>`;
  }
  tocHtml += "</ul>";
  document.querySelector("#guideToc").innerHTML = tocHtml;

  // Sections
  let html = "";
  for (const section of data.sections) {
    let content = section.content;
    if (content === "##BLOCKS##") {
      content = renderBlocksGrid(lang);
    }
    html += `<section id="${section.id}" class="guide-section">
      <h2>${section.title}</h2>
      ${content}
    </section>`;
  }
  container.innerHTML = html;
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  applyLang();
  renderGuide();

  const langSelect = document.querySelector("#guideLangSelect");
  if (langSelect) {
    langSelect.value = getLang();
    langSelect.addEventListener("change", (e) => {
      setLang(e.target.value);
      renderGuide();
    });
  }
});

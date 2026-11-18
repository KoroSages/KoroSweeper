const { BOARD_SETTINGS, createGame, flagsLeft, revealCell, toggleFlag, toggleTurtleMark, chordCell } = globalThis.KoroGame;

const frame = document.querySelector('.game-frame');
const header = document.querySelector('#header-frame');
const boardFrame = document.querySelector('#board-frame');
const boardElement = document.querySelector('#board');
const flagsCounter = document.querySelector('#flags-counter');
const timerCounter = document.querySelector('#timer-counter');
const faceButton = document.querySelector('#new-game');
const message = document.querySelector('#game-message');
const flagMarkButton = document.querySelector('#mark-flag');
const turtleMarkButton = document.querySelector('#mark-turtle');
const rulesElement = document.querySelector('#game-rules');
const completionElement = document.querySelector('#game-completion');
const leaderboardElement = document.querySelector('#game-leaderboard-list');

rulesElement.textContent = (globalThis.KoroRules ?? '').trim();
for (const line of (globalThis.KoroLeaderboard ?? '').trim().split('\n')) {
  const [player, value = ''] = line.split('|').map((part) => part.trim());
  if (!player) continue;
  const item = document.createElement('li');
  const playerElement = document.createElement('span');
  const valueElement = document.createElement('span');
  playerElement.textContent = player;
  valueElement.textContent = value;
  item.append(playerElement, valueElement);
  leaderboardElement.append(item);
}

let game = createGame();
let markMode = 'flag';
let previewAnchor = null;
let cellSize = 46;
let longPressTimer;
let suppressClickUntil = 0;
let pressStart = null;
let timerStartedAt = null;
let timerFinishedAt = null;
let timerInterval;

function frameTile(name, column, row) {
  const tile = document.createElement('span');
  tile.className = `frame-tile frame-tile--${name}`;
  tile.style.gridColumn = column;
  tile.style.gridRow = row;
  tile.setAttribute('aria-hidden', 'true');
  return tile;
}

function buildFrame() {
  const { columns, rows } = BOARD_SETTINGS;
  const headerTiles = [frameTile('top-left', 1, 1), frameTile('top-right', columns + 2, 1)];
  for (let column = 2; column <= columns + 1; column += 1) {
    headerTiles.push(frameTile('top', column, 1));
  }
  for (let row = 2; row <= 3; row += 1) {
    headerTiles.push(frameTile('left', 1, row), frameTile('right', columns + 2, row));
    for (let column = 5; column <= columns - 2; column += 1) {
      headerTiles.push(frameTile('center', column, row));
    }
  }
  header.append(...headerTiles);

  const tiles = [
    frameTile('top-left', 1, 1), frameTile('top-right', columns + 2, 1),
    frameTile('bottom-left', 1, rows + 2), frameTile('bottom-right', columns + 2, rows + 2),
  ];
  for (let column = 2; column <= columns + 1; column += 1) {
    tiles.push(frameTile('top', column, 1), frameTile('bottom', column, rows + 2));
  }
  for (let row = 2; row <= rows + 1; row += 1) {
    tiles.push(frameTile('left', 1, row), frameTile('right', columns + 2, row));
  }
  boardFrame.append(...tiles);

  boardElement.replaceChildren();
  for (let index = 0; index < columns * rows; index += 1) {
    const cell = document.createElement('button');
    cell.className = 'cell cell--hidden';
    cell.type = 'button';
    cell.dataset.index = index;
    boardElement.append(cell);
  }
  const overlays = document.createElement('div');
  overlays.className = 'turtle-overlays';
  overlays.setAttribute('aria-hidden', 'true');
  boardElement.append(overlays);
}

function setCellSize() {
  const size = Math.max(24, Math.min(46, Math.floor((window.innerWidth - 32) / 11)));
  cellSize = size;
  document.querySelectorAll('.mark-button').forEach((button) => {
    button.style.setProperty('--mark-button-size', `${size}px`);
  });
  const values = {
    '--cell-size': size,
    '--size-2': size * 2,
    '--size-3': size * 3,
    '--sprite-width': size * 7,
    '--sprite-height': size * 13,
    '--negative-1': -size,
    '--negative-2': -size * 2,
    '--negative-3': -size * 3,
    '--negative-4': -size * 4,
    '--negative-5': -size * 5,
    '--negative-6': -size * 6,
    '--counter-inset-y': size * 0.1875,
    '--counter-inset-x': size * 0.28125,
    '--digit-width': size * 0.8125,
    '--digit-height': size * 1.625,
    '--digit-sprite-width': size * 5.6875,
    '--digit-sprite-height': size * 10.5625,
    '--digit-offset-1': size * -0.8125,
    '--digit-offset-2': size * -1.625,
    '--digit-offset-3': size * -2.4375,
    '--digit-offset-4': size * -3.25,
    '--digit-row-1': size * -4.0625,
    '--digit-row-2': size * -5.6875,
  };
  for (const [name, value] of Object.entries(values)) frame.style.setProperty(name, `${value}px`);
  frame.style.width = `${size * 11}px`;
  header.style.gridTemplateColumns = `repeat(11, ${size}px)`;
  header.style.gridTemplateRows = `repeat(3, ${size}px)`;
  boardFrame.style.gridTemplateColumns = `repeat(11, ${size}px)`;
  boardFrame.style.gridTemplateRows = `repeat(11, ${size}px)`;
  boardElement.style.gridTemplateColumns = `repeat(9, ${size}px)`;
  boardElement.style.gridTemplateRows = `repeat(9, ${size}px)`;
}

function renderCounter(element, value) {
  const display = document.createElement('div');
  display.className = 'counter-display';
  for (const digit of String(value).padStart(3, '0').slice(-3)) {
    const sprite = document.createElement('span');
    sprite.className = `digit digit--${digit}`;
    sprite.setAttribute('aria-hidden', 'true');
    display.append(sprite);
  }
  element.replaceChildren(display);
}

function elapsedMilliseconds() {
  if (timerStartedAt === null) return 0;
  const end = timerFinishedAt ?? Date.now();
  return end - timerStartedAt;
}

function elapsedSeconds() {
  return Math.floor(elapsedMilliseconds() / 1000);
}

function formatDuration(milliseconds) {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor(milliseconds / 1_000) % 60;
  const remainder = milliseconds % 1_000;
  return `${minutes}:${String(seconds).padStart(2, '0')}:${String(remainder).padStart(3, '0')}`;
}

function renderTimer() {
  const seconds = elapsedSeconds();
  renderCounter(timerCounter, Math.min(seconds, 999));
  timerCounter.setAttribute('aria-label', `${formatDuration(elapsedMilliseconds())} écoulées`);
}

function updateTimerState() {
  if (timerStartedAt === null && game.firstRevealOccurred) {
    timerStartedAt = Date.now();
    timerInterval = window.setInterval(renderTimer, 250);
  }
  if (timerStartedAt !== null && timerFinishedAt === null && game.status !== 'playing') {
    timerFinishedAt = Date.now();
    window.clearInterval(timerInterval);
    timerInterval = undefined;
  }
}

function renderTurtleOverlays() {
  const overlays = boardElement.querySelector('.turtle-overlays');
  const anchors = game.status === 'playing' ? [...game.turtleMarks] : game.turtleAnchors;
  const turtles = anchors.map((anchor) => {
    const overlay = document.createElement('span');
    overlay.className = 'turtle-overlay';
    overlay.style.left = `${anchor % game.settings.columns * cellSize}px`;
    overlay.style.top = `${Math.floor(anchor / game.settings.columns) * cellSize}px`;
    overlay.style.width = `${cellSize * 2}px`;
    overlay.style.height = `${cellSize * 2}px`;
    return overlay;
  });
  if (markMode === 'turtle' && game.status === 'playing' && previewAnchor !== null) {
    const preview = document.createElement('span');
    preview.className = 'turtle-overlay turtle-overlay--preview';
    preview.style.left = `${previewAnchor % game.settings.columns * cellSize}px`;
    preview.style.top = `${Math.floor(previewAnchor / game.settings.columns) * cellSize}px`;
    preview.style.width = `${cellSize * 2}px`;
    preview.style.height = `${cellSize * 2}px`;
    turtles.push(preview);
  }
  overlays.replaceChildren(...turtles);
}

function turtleAnchorAt(clientX, clientY) {
  const rect = boardElement.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;
  const column = Math.max(1, Math.min(game.settings.columns - 1, Math.round(x / cellSize)));
  const row = Math.max(1, Math.min(game.settings.rows - 1, Math.round(y / cellSize)));
  const anchor = (row - 1) * game.settings.columns + column - 1;
  return anchor;
}

function render() {
  updateTimerState();
  flagMarkButton.setAttribute('aria-pressed', String(markMode === 'flag'));
  turtleMarkButton.setAttribute('aria-pressed', String(markMode === 'turtle'));
  renderCounter(flagsCounter, flagsLeft(game));
  renderTimer();
  flagsCounter.setAttribute('aria-label', `${flagsLeft(game)} drapeaux restants`);
  faceButton.className = `face-button face-button--${game.status}`;
  message.textContent = game.status === 'won' ? 'Gagné !' : game.status === 'lost' ? 'Perdu !' : '';
  completionElement.hidden = game.status !== 'won';
  if (game.status === 'won') {
    completionElement.textContent = `Nice job you cleared the mines in ${formatDuration(elapsedMilliseconds())}, Jasmine is unbothered and will keep sleeping. Post your score on discord if you want to appear on the rankings`;
  }

  boardElement.querySelectorAll('.cell').forEach((button, index) => {
    const cell = game.cells[index];
    let appearance = 'hidden';
    if (game.status === 'lost' && index === game.explodedIndex) appearance = 'exploded';
    else if (cell.isRevealed) appearance = cell.hasMine ? 'mine' :
      cell.nearbyMines > 8 ? 'number-high' : `number-${cell.nearbyMines}`;
    else if (cell.isFlagged) appearance = 'flagged';
    else if (game.status === 'lost' && cell.hasMine) appearance = 'mine';
    button.className = `cell cell--${appearance}`;
    if (appearance === 'number-high') button.dataset.number = String(cell.nearbyMines);
    else delete button.dataset.number;
    button.disabled = game.status !== 'playing';
    const description = appearance === 'flagged' ? 'drapeau'
      : appearance === 'mine' || appearance === 'exploded' ? 'mine'
      : cell.isRevealed ? cell.nearbyMines ? `${cell.nearbyMines} dangers voisins` : 'vide'
      : 'cachée';
    button.setAttribute('aria-label', `Ligne ${Math.floor(index / game.settings.columns) + 1}, colonne ${index % game.settings.columns + 1} : ${description}`);
  });
  renderTurtleOverlays();
}

function placeMark(index, clientX, clientY) {
  if (markMode === 'turtle') {
    const anchor = turtleAnchorAt(clientX, clientY);
    if (anchor !== null) {
      toggleTurtleMark(game, anchor);
      previewAnchor = anchor;
    }
  }
  else toggleFlag(game, index);
}

function cellFromEvent(event) {
  return event.target.closest('.cell');
}

boardElement.addEventListener('click', (event) => {
  if (Date.now() < suppressClickUntil) return;
  if (markMode === 'turtle') {
    placeMark(-1, event.clientX, event.clientY);
    render();
    return;
  }
  const button = cellFromEvent(event);
  if (!button) return;
  const index = Number(button.dataset.index);
  if (game.cells[index].isRevealed) chordCell(game, index);
  else revealCell(game, index);
  render();
});

boardElement.addEventListener('contextmenu', (event) => {
  if (markMode === 'turtle') {
    event.preventDefault();
    if (Date.now() < suppressClickUntil) return;
    placeMark(-1, event.clientX, event.clientY);
    render();
    return;
  }
  const button = cellFromEvent(event);
  if (!button) return;
  event.preventDefault();
  if (Date.now() < suppressClickUntil) return;
  placeMark(Number(button.dataset.index), event.clientX, event.clientY);
  render();
});

boardElement.addEventListener('keydown', (event) => {
  const button = cellFromEvent(event);
  if (button && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    toggleFlag(game, Number(button.dataset.index));
    render();
  }
  if (button && event.key.toLowerCase() === 't') {
    event.preventDefault();
    toggleTurtleMark(game, Number(button.dataset.index));
    render();
  }
});

boardElement.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') return;
  const button = cellFromEvent(event);
  if (!button && markMode !== 'turtle') return;
  if (markMode === 'turtle') {
    previewAnchor = turtleAnchorAt(event.clientX, event.clientY);
    renderTurtleOverlays();
  }
  pressStart = { x: event.clientX, y: event.clientY };
  longPressTimer = window.setTimeout(() => {
    placeMark(button ? Number(button.dataset.index) : -1, event.clientX, event.clientY);
    suppressClickUntil = Date.now() + 900;
    render();
    longPressTimer = undefined;
  }, 550);
});

boardElement.addEventListener('pointermove', (event) => {
  if (markMode === 'turtle') {
    const nextAnchor = turtleAnchorAt(event.clientX, event.clientY);
    if (nextAnchor !== previewAnchor) {
      previewAnchor = nextAnchor;
      renderTurtleOverlays();
    }
  }
  if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 10) {
    window.clearTimeout(longPressTimer);
    longPressTimer = undefined;
    pressStart = null;
  }
});

for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  boardElement.addEventListener(type, () => {
    window.clearTimeout(longPressTimer);
    longPressTimer = undefined;
    pressStart = null;
  });
}

boardElement.addEventListener('pointerleave', () => {
  previewAnchor = null;
  renderTurtleOverlays();
});

faceButton.addEventListener('click', () => {
  window.clearInterval(timerInterval);
  timerStartedAt = null;
  timerFinishedAt = null;
  timerInterval = undefined;
  game = createGame();
  previewAnchor = null;
  render();
});

flagMarkButton.addEventListener('click', () => { markMode = 'flag'; previewAnchor = null; render(); });
turtleMarkButton.addEventListener('click', () => { markMode = 'turtle'; previewAnchor = null; render(); });
buildFrame();
setCellSize();
render();
window.addEventListener('resize', () => { setCellSize(); render(); });

(() => {
const BOARD_SETTINGS = Object.freeze({ columns: 9, rows: 9, mineCount: 10, turtleCount: 1 });

function neighbors(index, settings) {
  const row = Math.floor(index / settings.columns);
  const column = index % settings.columns;
  const indexes = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow >= 0 && nextRow < settings.rows && nextColumn >= 0 && nextColumn < settings.columns) {
        indexes.push(nextRow * settings.columns + nextColumn);
      }
    }
  }

  return indexes;
}

function seededRandom(seed) {
  let value = Math.floor(seed) >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function turtleAffects(index, anchor, settings) {
  const row = Math.floor(index / settings.columns);
  const column = index % settings.columns;
  const turtleRow = Math.floor(anchor / settings.columns);
  const turtleColumn = anchor % settings.columns;
  return row >= turtleRow - 1 && row <= turtleRow + 2 &&
    column >= turtleColumn - 1 && column <= turtleColumn + 2;
}

function updateNearbyMines(game) {
  game.cells.forEach((cell, index) => {
    const adjacentMines = neighbors(index, game.settings)
      .filter((neighborIndex) => game.cells[neighborIndex].hasMine).length;
    const nearbyTurtles = game.turtleAnchors
      .filter((anchor) => turtleAffects(index, anchor, game.settings)).length;
    cell.nearbyMines = adjacentMines + nearbyTurtles;
  });
}

function createGame(seed = Math.floor(Math.random() * 0x1_0000_0000), settings = BOARD_SETTINGS) {
  const cellCount = settings.columns * settings.rows;
  const turtleCount = settings.turtleCount ?? 0;
  if (!Number.isInteger(settings.columns) || !Number.isInteger(settings.rows) ||
      settings.columns < 1 || settings.rows < 1 || !Number.isInteger(settings.mineCount) ||
      settings.mineCount < 0 || settings.mineCount >= cellCount ||
      !Number.isInteger(turtleCount) || turtleCount < 0 ||
      (turtleCount > 0 && (settings.columns < 2 || settings.rows < 2 ||
        turtleCount > (settings.columns - 1) * (settings.rows - 1)))) {
    throw new RangeError('Invalid board settings');
  }

  const random = seededRandom(seed);
  const indexes = Array.from({ length: cellCount }, (_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [indexes[index], indexes[other]] = [indexes[other], indexes[index]];
  }
  const mines = new Set(indexes.slice(0, settings.mineCount));
  const turtleCandidates = Array.from({ length: cellCount }, (_, index) => index)
    .filter((index) => index % settings.columns < settings.columns - 1 &&
      Math.floor(index / settings.columns) < settings.rows - 1);
  for (let index = turtleCandidates.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [turtleCandidates[index], turtleCandidates[other]] = [turtleCandidates[other], turtleCandidates[index]];
  }
  const game = {
    settings: { ...settings, turtleCount },
    turtleAnchors: turtleCandidates.slice(0, turtleCount),
    turtleMarks: new Set(),
    cells: Array.from({ length: cellCount }, (_, index) => ({
      hasMine: mines.has(index),
      nearbyMines: 0,
      isRevealed: false,
      isFlagged: false,
    })),
    firstRevealOccurred: false,
    explodedIndex: null,
    status: 'playing',
    seed,
  };
  updateNearbyMines(game);
  return game;
}

function flagsLeft(game) {
  return game.settings.mineCount - game.cells.filter((cell) => cell.isFlagged).length;
}

function toggleFlag(game, index) {
  const cell = game.cells[index];
  if (game.status !== 'playing' || !cell || cell.isRevealed) return false;
  if (!cell.isFlagged && flagsLeft(game) === 0) return false;
  cell.isFlagged = !cell.isFlagged;
  return true;
}

function checkWin(game) {
  if (game.cells.every((cell) => cell.hasMine || cell.isRevealed)) {
    game.status = 'won';
    game.cells.forEach((cell) => { if (cell.hasMine) cell.isFlagged = true; });
  }
}

function toggleTurtleMark(game, anchor) {
  const row = Math.floor(anchor / game.settings.columns);
  const column = anchor % game.settings.columns;
  if (game.status !== 'playing' || !game.cells[anchor] ||
      row >= game.settings.rows - 1 || column >= game.settings.columns - 1 ||
      game.settings.turtleCount === 0) return false;
  if (game.turtleMarks.has(anchor)) game.turtleMarks.delete(anchor);
  else {
    if (game.turtleMarks.size >= game.settings.turtleCount) {
      game.turtleMarks.delete(game.turtleMarks.values().next().value);
    }
    game.turtleMarks.add(anchor);
  }
  return true;
}

function revealCell(game, index) {
  const cell = game.cells[index];
  if (game.status !== 'playing' || !cell || cell.isRevealed || cell.isFlagged) return false;

  if (!game.firstRevealOccurred) {
    if (cell.hasMine) {
      const destination = game.cells.findIndex((candidate, candidateIndex) =>
        candidateIndex !== index && !candidate.hasMine);
      cell.hasMine = false;
      game.cells[destination].hasMine = true;
      updateNearbyMines(game);
    }
    game.firstRevealOccurred = true;
  }

  if (cell.hasMine) {
    cell.isRevealed = true;
    game.explodedIndex = index;
    game.status = 'lost';
    return true;
  }

  const pending = [index];
  while (pending.length > 0) {
    const currentIndex = pending.pop();
    const current = game.cells[currentIndex];
    if (current.isRevealed || current.hasMine) continue;
    current.isFlagged = false;
    current.isRevealed = true;
    if (current.nearbyMines === 0) {
      for (const neighborIndex of neighbors(currentIndex, game.settings)) {
        if (!game.cells[neighborIndex].isRevealed && !game.cells[neighborIndex].hasMine) {
          pending.push(neighborIndex);
        }
      }
    }
  }

  checkWin(game);
  return true;
}

function chordCell(game, index) {
  const cell = game.cells[index];
  if (game.status !== 'playing' || !cell?.isRevealed || cell.hasMine || cell.nearbyMines === 0) return false;

  const adjacent = neighbors(index, game.settings);
  const flaggedCount = adjacent.filter((neighborIndex) => game.cells[neighborIndex].isFlagged).length +
    [...game.turtleMarks].filter((anchor) => turtleAffects(index, anchor, game.settings)).length;
  if (flaggedCount !== cell.nearbyMines) return false;

  const targets = adjacent.filter((neighborIndex) =>
    !game.cells[neighborIndex].isFlagged && !game.cells[neighborIndex].isRevealed);
  const exposedMine = targets.find((neighborIndex) => game.cells[neighborIndex].hasMine);
  if (exposedMine !== undefined) return revealCell(game, exposedMine);

  let changed = false;
  for (const neighborIndex of targets) {
    changed = revealCell(game, neighborIndex) || changed;
    if (game.status !== 'playing') break;
  }
  return changed;
}

globalThis.KoroGame = { BOARD_SETTINGS, createGame, flagsLeft, toggleFlag, toggleTurtleMark, revealCell, chordCell };
})();

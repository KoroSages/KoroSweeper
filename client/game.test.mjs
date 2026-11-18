import assert from 'node:assert/strict';
import test from 'node:test';
import './game.js';

const { createGame, flagsLeft, revealCell, toggleFlag, toggleTurtleMark, chordCell } = globalThis.KoroGame;

test('a new board has 9 × 9 cells and 10 mines', () => {
  const game = createGame(42);
  assert.equal(game.cells.length, 81);
  assert.equal(game.cells.filter((cell) => cell.hasMine).length, 10);
  assert.equal(game.turtleAnchors.length, 1);
  assert.equal(flagsLeft(game), 10);
});

test('the first revealed cell is safe even when it initially contains a mine', () => {
  const game = createGame(42);
  const mineIndex = game.cells.findIndex((cell) => cell.hasMine);
  assert.equal(revealCell(game, mineIndex), true);
  assert.equal(game.cells[mineIndex].hasMine, false);
  assert.equal(game.cells[mineIndex].isRevealed, true);
  assert.equal(game.cells.filter((cell) => cell.hasMine).length, 10);
  assert.equal(game.status, 'playing');
});

test('a flag can be placed and removed without revealing a cell', () => {
  const game = createGame(42);
  assert.equal(toggleFlag(game, 0), true);
  assert.equal(game.cells[0].isFlagged, true);
  assert.equal(revealCell(game, 0), false);
  assert.equal(flagsLeft(game), 9);
  assert.equal(toggleFlag(game, 0), true);
  assert.equal(game.cells[0].isFlagged, false);
});

test('a zero cell opens its safe region', () => {
  const game = createGame(42);
  const zeroIndex = game.cells.findIndex((cell) => !cell.hasMine && cell.nearbyMines === 0);
  assert.ok(zeroIndex >= 0);
  revealCell(game, zeroIndex);
  assert.ok(game.cells.filter((cell) => cell.isRevealed).length > 1);
});

test('revealing a later mine loses; revealing every safe cell wins', () => {
  const lostGame = createGame(42);
  revealCell(lostGame, lostGame.cells.findIndex((cell) => !cell.hasMine));
  const mineIndex = lostGame.cells.findIndex((cell) => cell.hasMine);
  revealCell(lostGame, mineIndex);
  assert.equal(lostGame.status, 'lost');
  assert.equal(lostGame.explodedIndex, mineIndex);

  const wonGame = createGame(42);
  for (let index = 0; index < wonGame.cells.length; index += 1) {
    if (!wonGame.cells[index].hasMine && !wonGame.cells[index].isRevealed) revealCell(wonGame, index);
  }
  assert.equal(wonGame.status, 'won');
  assert.equal(flagsLeft(wonGame), 0);
});

test('a 2 × 2 turtle contributes once to each cell in its surrounding 4 × 4 area', () => {
  const game = createGame(42, { columns: 5, rows: 5, mineCount: 0, turtleCount: 1 });
  const anchor = game.turtleAnchors[0];
  const turtleRow = Math.floor(anchor / 5);
  const turtleColumn = anchor % 5;

  game.cells.forEach((cell, index) => {
    const row = Math.floor(index / 5);
    const column = index % 5;
    const affected = row >= turtleRow - 1 && row <= turtleRow + 2 &&
      column >= turtleColumn - 1 && column <= turtleColumn + 2;
    assert.equal(cell.nearbyMines, affected ? 1 : 0);
    assert.equal(cell.hasMine, false);
  });
});

test('the turtle mark spans a valid 2 × 2 anchor', () => {
  const game = createGame(42, { columns: 5, rows: 5, mineCount: 0, turtleCount: 1 });
  const firstAnchor = game.turtleAnchors[0];
  const nextAnchor = firstAnchor === 0 ? 1 : 0;
  assert.equal(toggleTurtleMark(game, 24), false);
  assert.equal(toggleTurtleMark(game, firstAnchor), true);
  assert.equal(game.turtleMarks.size, 1);
  assert.equal(toggleTurtleMark(game, nextAnchor), true);
  assert.deepEqual([...game.turtleMarks], [nextAnchor]);
  assert.equal(toggleTurtleMark(game, nextAnchor), true);
  assert.equal(game.turtleMarks.size, 0);
});

test('chording counts a turtle mark once for a touched clue', () => {
  const game = createGame(42, { columns: 5, rows: 5, mineCount: 0, turtleCount: 1 });
  const anchor = game.turtleAnchors[0];
  revealCell(game, anchor);
  assert.equal(game.cells[anchor].nearbyMines, 1);
  assert.equal(chordCell(game, anchor), false);
  toggleTurtleMark(game, anchor);
  assert.equal(chordCell(game, anchor), true);
  assert.ok(game.cells.filter((cell) => cell.isRevealed).length > 1);
});

test('chording only opens neighbours when adjacent flags match the number', () => {
  const game = createGame(42, { columns: 3, rows: 3, mineCount: 1 });
  revealCell(game, 4);
  assert.equal(game.cells[4].nearbyMines, 1);
  assert.equal(chordCell(game, 4), false);
  assert.equal(game.cells.filter((cell) => cell.isRevealed).length, 1);

  toggleFlag(game, 7);
  assert.equal(chordCell(game, 4), true);
  assert.equal(game.status, 'won');
  assert.equal(game.cells.filter((cell) => cell.isRevealed).length, 8);
});

test('chording with a misplaced flag reveals an unflagged mine and loses', () => {
  const game = createGame(42, { columns: 3, rows: 3, mineCount: 1 });
  revealCell(game, 4);
  toggleFlag(game, 0);
  assert.equal(chordCell(game, 4), true);
  assert.equal(game.status, 'lost');
  assert.equal(game.explodedIndex, 7);
});

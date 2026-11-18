document.querySelector('.home-description').textContent = (globalThis.KoroDescription ?? '').trim();

const preview = document.querySelector('.home-preview');
let pressedCell = null;

function clearPressedCell() {
  pressedCell?.classList.remove('is-pressed');
  pressedCell = null;
}

preview.addEventListener('pointerdown', (event) => {
  clearPressedCell();
  pressedCell = event.target.closest('.home-preview__cell');
  pressedCell?.classList.add('is-pressed');
});

preview.addEventListener('pointerleave', clearPressedCell);
preview.addEventListener('contextmenu', (event) => {
  if (event.target.closest('.home-preview__cell')) event.preventDefault();
});
window.addEventListener('pointerup', clearPressedCell);
window.addEventListener('pointercancel', clearPressedCell);

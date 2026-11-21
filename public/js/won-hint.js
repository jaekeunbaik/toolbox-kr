// Money inputs (<input data-won>): show 1,000,000-style commas while typing and a Korean reading
// underneath (100000000 -> 1억 원).
import { koreanWon } from '/js/calc.js';

const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
const digits = s => String(s).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
const commas = s => digits(s).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

for (const input of document.querySelectorAll('input[data-won]')) {
  const start = input.value;
  input.type = 'text'; // number inputs can't display commas
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  // page scripts and share.js keep reading/writing .value as plain digits
  Object.defineProperty(input, 'value', {
    get() { return digits(native.get.call(this)); },
    set(v) { native.set.call(this, commas(v)); },
  });
  input.value = start;

  const hint = document.createElement('small');
  hint.className = 'read';
  hint.setAttribute('aria-hidden', 'true'); // screen readers already announce the number itself
  input.after(hint);
  const update = () => { hint.textContent = input.value === '' ? '' : koreanWon(+input.value); };

  // runs on the input itself, so before the page's form-level listener reads the value
  input.addEventListener('input', () => {
    const raw = native.get.call(input);
    const before = digits(raw.slice(0, input.selectionStart ?? raw.length)).length;
    native.set.call(input, commas(raw));
    // put the caret back after the same number of digits
    const text = native.get.call(input);
    let pos = 0;
    for (let seen = 0; pos < text.length && seen < before; pos++) if (/\d/.test(text[pos])) seen++;
    input.setSelectionRange(pos, pos);
    update();
  });
  update();
}

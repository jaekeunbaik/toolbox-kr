// Adds a plain-Korean reading under every <input data-won> (e.g. 100000000 -> 1억 원).
import { koreanWon } from '/js/calc.js';
for (const input of document.querySelectorAll('input[data-won]')) {
  const hint = document.createElement('small');
  hint.className = 'read';
  hint.setAttribute('aria-hidden', 'true'); // screen readers already announce the number itself
  input.after(hint);
  const update = () => { hint.textContent = input.value === '' ? '' : koreanWon(+input.value); };
  input.addEventListener('input', update);
  update();
}

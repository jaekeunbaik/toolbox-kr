// Pure calculation functions shared by the tool pages (tested in test/calc.test.mjs).

// Loan. principal in won, annual rate in %, months. Returns { monthly (first month), totalInterest }.
export function loan(principal, ratePct, months, type) {
  const r = ratePct / 100 / 12;
  if (type === 'equal-principal') { // 원금균등: interest shrinks as principal is repaid
    return { monthly: principal / months + principal * r, totalInterest: (principal * r * (months + 1)) / 2 };
  }
  if (type === 'bullet') { // 만기일시: pay only interest, principal at the end
    return { monthly: principal * r, totalInterest: principal * r * months };
  }
  // 원리금균등 (default): same payment every month
  const monthly = r === 0 ? principal / months : (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  return { monthly, totalInterest: monthly * months - principal };
}

export const percentOf = (a, b) => (a * b) / 100;        // a의 b%
export const ratio = (a, b) => (a / b) * 100;            // a는 b의 몇 %
export const change = (from, to) => ((to - from) / from) * 100; // 증감률

// 만 나이 on a given date. Dates as {y, m, d}; m is 1-12.
export function koreanAge(birth, today) {
  const beforeBirthday = today.m < birth.m || (today.m === birth.m && today.d < birth.d);
  return today.y - birth.y - (beforeBirthday ? 1 : 0);
}

// Whole days from `from` to `to` ({y, m, d}); UTC avoids DST off-by-one.
export const daysBetween = (from, to) =>
  Math.round((Date.UTC(to.y, to.m - 1, to.d) - Date.UTC(from.y, from.m - 1, from.d)) / 86400000);

export const PYEONG_M2 = 400 / 121; // legal definition: 1평 = 400/121 ㎡
export const pyeongToM2 = p => p * PYEONG_M2;
export const m2ToPyeong = m => m / PYEONG_M2;

// "2026-11-21" -> {y, m, d}
export const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
export const todayParts = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };
export const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
export const num = (n, digits = 2) => Number(n.toFixed(digits)).toLocaleString('ko-KR');

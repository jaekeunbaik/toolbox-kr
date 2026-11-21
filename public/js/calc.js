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

// BMI from height (cm) and weight (kg); category per 대한비만학회 (아시아-태평양 기준).
export const bmi = (heightCm, weightKg) => weightKg / (heightCm / 100) ** 2;
export const bmiCategory = v => (v < 18.5 ? '저체중' : v < 23 ? '정상' : v < 25 ? '과체중' : '비만');

export const PYEONG_M2= 400 / 121; // legal definition: 1평 = 400/121 ㎡
export const pyeongToM2 = p => p * PYEONG_M2;
export const m2ToPyeong = m => m / PYEONG_M2;

// "2026-11-21" -> {y, m, d}
export const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
export const todayParts = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };
export const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
export const num = (n, digits = 2) => Number(n.toFixed(digits)).toLocaleString('ko-KR');

// 주휴수당: weekly hours >= 15 earn paid rest = min(h,40)/40 * 8 hours. Month = 365/7/12 weeks.
export const MIN_WAGE_2026 = 10320;
export const WEEKS_PER_MONTH = 365 / 7 / 12;
export function weeklyPay(hourly, weeklyHours) {
  const restHours = weeklyHours >= 15 ? (Math.min(weeklyHours, 40) / 40) * 8 : 0;
  const weekly = (weeklyHours + restHours) * hourly;
  // 고용노동부 기준: 월 소정근로시간 = (주 근무 + 주휴) x 4.345, rounded (40h -> 209h)
  const monthlyHours = Math.round((weeklyHours + restHours) * WEEKS_PER_MONTH);
  return { restHours, restPay: restHours * hourly, weekly, monthlyHours, monthly: monthlyHours * hourly };
}

// 퇴직금 (estimate). `leave` = day after the last working day, as the 고용노동부 calculator uses.
export function severance({ join, leave, pay3m, annualBonus = 0, leavePay = 0 }) {
  const workDays = daysBetween(join, leave);
  // shortcut: day 29-31 with no match 3 months back rolls into the next month (Date.UTC), a 1-3 day error in the 3-month base
  const from = { y: leave.m <= 3 ? leave.y - 1 : leave.y, m: ((leave.m + 8) % 12) + 1, d: leave.d };
  const days3m = daysBetween(from, leave);
  const dailyAvg = (pay3m + (annualBonus * 3) / 12 + (leavePay * 3) / 12) / days3m;
  return { workDays, days3m, dailyAvg, eligible: workDays >= 365, amount: workDays >= 365 ? dailyAvg * 30 * (workDays / 365) : 0 };
}

// 부가세 10%. From supply price, or back out of a VAT-included total.
export const vatFromSupply = supply => { const vat = Math.round(supply * 0.1); return { supply, vat, total: supply + vat }; };
export const vatFromTotal = total => { const supply = Math.round(total / 1.1); return { supply, vat: total - supply, total }; };

// 예금 (lump sum) / 적금 (monthly deposit), simple interest unless compound. taxPct: 15.4 normal, 9.5 우대, 0 비과세.
export function savings({ kind, amount, ratePct, months, taxPct = 15.4, compound = false }) {
  const r = ratePct / 100 / 12;
  const principal = kind === 'deposit' ? amount : amount * months;
  const interest = kind === 'deposit'
    ? (compound ? amount * ((1 + r) ** months - 1) : amount * r * months)
    : amount * r * (months * (months + 1)) / 2; // each deposit earns for its remaining months
  const tax = Math.floor((interest * taxPct) / 100 / 10) * 10; // 원 단위 절사 (10원 미만)
  return { principal, interest, tax, net: principal + interest - tax };
}

export const discounted = (price, pct) => price * (1 - pct / 100);
export const discountRate = (price, sale) => (1 - sale / price) * 100;

// Unit conversion through a base unit (m, g). Temperatures are handled separately.
export const UNITS = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, 'in': 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, '자': 10 / 33 },
  weight: { mg: 0.001, g: 1, kg: 1000, t: 1e6, oz: 28.349523125, lb: 453.59237, '돈': 3.75, '근': 600 },
};
export const convert = (kind, value, from, to) => (value * UNITS[kind][from]) / UNITS[kind][to];
export const cToF = c => (c * 9) / 5 + 32;
export const fToC = f => ((f - 32) * 5) / 9;

// 100000000 -> "1억 원", 123456789 -> "1억 2,345만 6,789 원" (readable hint under money inputs)
export function koreanWon(n) {
  n = Math.floor(Math.abs(n));
  if (!n) return '0원';
  const parts = [];
  for (const [unit, size] of [['조', 1e12], ['억', 1e8], ['만', 1e4]]) {
    const q = Math.floor(n / size) % 1e4;
    if (n >= size && q) parts.push(q.toLocaleString('ko-KR') + unit);
  }
  if (n % 1e4) parts.push((n % 1e4).toLocaleString('ko-KR'));
  return parts.join(' ') + ' 원';
}

// Month-by-month repayment rows: { n, payment, principal, interest, balance }.
export function loanSchedule(principal, ratePct, months, type) {
  const r = ratePct / 100 / 12, rows = [];
  const fixed = loan(principal, ratePct, months).monthly;
  let balance = principal;
  for (let n = 1; n <= months; n++) {
    const interest = balance * r;
    const paid = n === months ? balance // last month clears whatever is left (also absorbs float drift)
      : type === 'equal-principal' ? principal / months
      : type === 'bullet' ? 0
      : fixed - interest;
    balance -= paid;
    rows.push({ n, payment: paid + interest, principal: paid, interest, balance: Math.max(balance, 0) });
  }
  return rows;
}

// {y,m,d} + days -> {y,m,d}
export function addDays(p, days) {
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
export const weekday = p => '일월화수목금토'[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];

// 연차 days the worker is owed at date `on` (근로기준법 60조, assumes 80%+ attendance).
// shortcut: whole months compare day-of-month only (1/31 -> 2/28 counts as 0 months), fine unless someone joins on the 29th-31st.
export function annualLeave(join, on) {
  const months = Math.max(0, (on.y - join.y) * 12 + on.m - join.m - (on.d < join.d ? 1 : 0));
  const years = Math.floor(months / 12);
  return { years, months: months % 12, days: years < 1 ? Math.min(11, months) : Math.min(25, 15 + Math.floor((years - 1) / 2)) };
}

// 물타기: average price after buying more.
export function avgPrice(holdPrice, holdQty, buyPrice, buyQty) {
  const qty = holdQty + buyQty, cost = holdPrice * holdQty + buyPrice * buyQty;
  return { qty, cost, avg: cost / qty };
}

// 전월세 전환: monthly rent for a deposit amount at a yearly conversion rate (%).
export const depositToRent = (deposit, ratePct) => (deposit * ratePct) / 100 / 12;

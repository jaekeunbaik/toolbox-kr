// node test/calc.test.mjs
import assert from 'node:assert/strict';
import * as c from '../public/js/calc.js';

const near = (a, b, eps = 1) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

// 1억, 연 5%, 12개월 원리금균등: 월 8,560,748원 (standard amortization table value)
near(c.loan(1e8, 5, 12).monthly, 8560748);
near(c.loan(1e8, 5, 12).totalInterest, 2728976, 6);
near(c.loan(1.2e7, 0, 12).monthly, 1e6);
// 원금균등: 첫 달 = 1억/12 + 1억*0.05/12, 총이자 = 1억*0.05/12*13/2
near(c.loan(1e8, 5, 12, 'equal-principal').monthly, 8750000);
near(c.loan(1e8, 5, 12, 'equal-principal').totalInterest, 2708333);
near(c.loan(1e8, 5, 12, 'bullet').totalInterest, 5e6);

assert.equal(c.percentOf(200, 15), 30);
assert.equal(c.ratio(30, 200), 15);
assert.equal(c.change(100, 120), 20);

const d = s => c.parseDate(s);
assert.equal(c.koreanAge(d('2000-11-21'), d('2026-11-21')), 26);
assert.equal(c.koreanAge(d('2000-11-22'), d('2026-11-21')), 25);
assert.equal(c.koreanAge(d('2000-02-29'), d('2026-02-28')), 25); // leap-day birthday counts from Mar 1
assert.equal(c.koreanAge(d('2000-02-29'), d('2026-03-01')), 26);

assert.equal(c.daysBetween(d('2026-11-21'), d('2026-12-25')), 34);
assert.equal(c.daysBetween(d('2026-03-01'), d('2026-03-31')), 30); // spans DST in many zones
assert.equal(c.daysBetween(d('2026-11-21'), d('2026-11-20')), -1);

near(c.pyeongToM2(1), 3.305785, 1e-6);
near(c.m2ToPyeong(84), 25.41, 0.01); // 국민평형 84㎡ ≈ 25.4평
console.log('all calc tests passed');

// 주휴수당: 40h at 2026 minimum wage -> 8h rest pay, ~209h/month
let w = c.weeklyPay(10320, 40);
assert.equal(w.restHours, 8); assert.equal(w.monthlyHours, 209); assert.equal(w.monthly, 2156880); // 2026 official monthly min wage
assert.equal(c.weeklyPay(10320, 20).monthlyHours, 104);
assert.equal(c.weeklyPay(10320, 14).restHours, 0);
assert.equal(c.weeklyPay(10320, 20).restHours, 4);
assert.equal(c.weeklyPay(10320, 50).restHours, 8);

// 퇴직금: 2024-01-01 입사, 2026-01-01 퇴직(마지막 근무 2025-12-31), 3개월 900만원
let s = c.severance({ join: d('2024-01-01'), leave: d('2026-01-01'), pay3m: 9e6 });
assert.equal(s.workDays, 731); assert.equal(s.days3m, 92); // 2025-10-01 ~ 2025-12-31
near(s.amount, (9e6 / 92) * 30 * 731 / 365);
assert.equal(c.severance({ join: d('2025-06-01'), leave: d('2026-03-01'), pay3m: 9e6 }).eligible, false);
assert.equal(c.severance({ join: d('2024-01-01'), leave: d('2026-03-15'), pay3m: 9e6 }).days3m, 90); // 12-15 ~ 03-14

assert.deepEqual(c.vatFromSupply(10000), { supply: 10000, vat: 1000, total: 11000 });
assert.deepEqual(c.vatFromTotal(11000), { supply: 10000, vat: 1000, total: 11000 });
assert.equal(c.vatFromTotal(10000).supply + c.vatFromTotal(10000).vat, 10000);

// 예금 1000만원 연 3% 12개월 단리: 이자 30만, 세금 46,200
let v = c.savings({ kind: 'deposit', amount: 1e7, ratePct: 3, months: 12 });
near(v.interest, 3e5); assert.equal(v.tax, 46200); near(v.net, 1e7 + 3e5 - 46200);
// 적금 월 100만 연 3% 12개월: 이자 = 100만 * 0.0025 * 78 = 195,000
near(c.savings({ kind: 'installment', amount: 1e6, ratePct: 3, months: 12 }).interest, 195000);
assert.equal(c.savings({ kind: 'installment', amount: 1e6, ratePct: 3, months: 12, taxPct: 0 }).tax, 0);
near(c.savings({ kind: 'deposit', amount: 1e7, ratePct: 3, months: 12, compound: true }).interest, 304159.569, 0.01);

assert.equal(c.discounted(50000, 20), 40000);
near(c.discountRate(50000, 40000), 20, 1e-9);

near(c.convert('length', 1, 'in', 'cm'), 2.54, 1e-9);
near(c.convert('length', 1, '자', 'cm'), 30.303, 0.001);
near(c.convert('weight', 1, '근', 'kg'), 0.6, 1e-9);
near(c.convert('weight', 1, 'lb', 'kg'), 0.45359237, 1e-12);
assert.equal(c.cToF(100), 212); assert.equal(c.fToC(32), 0);
console.log('new calc tests passed');
assert.equal(c.koreanWon(100000000), '1억 원');
assert.equal(c.koreanWon(123456789), '1억 2,345만 6,789 원');
assert.equal(c.koreanWon(10320), '1만 320 원');
assert.equal(c.koreanWon(3000000000000), '3조 원');
assert.equal(c.koreanWon(0), '0원');
console.log('koreanWon tests passed');

for (const type of ['equal-payment', 'equal-principal', 'bullet']) {
  const rows = c.loanSchedule(1e8, 5, 12, type);
  near(rows.reduce((s, r) => s + r.principal, 0), 1e8, 1e-3);
  near(rows.reduce((s, r) => s + r.interest, 0), c.loan(1e8, 5, 12, type).totalInterest, 1);
  assert.equal(rows.at(-1).balance, 0);
}
near(c.loanSchedule(1e8, 5, 12)[0].payment, 8560748);
assert.deepEqual(c.addDays(d('2026-11-21'), 100), d('2027-03-01'));
assert.deepEqual(c.addDays(d('2024-02-28'), 1), d('2024-02-29'));
assert.deepEqual(c.addDays(d('2026-01-01'), -1), d('2025-12-31'));
assert.equal(c.weekday(d('2026-11-21')), '토');
console.log('schedule/date tests passed');

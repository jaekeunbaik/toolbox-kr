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

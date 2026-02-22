// ============================================================
// CALC — ฟังก์ชันคำนวณทั้งหมด
// ============================================================
import { CONFIG, CURRENT_YEAR_BE, DEFAULT_PROFILE } from './config.js';
import { activeProfile, readState, STATE } from './state.js';

// Helper — fmt shortcut (ใช้เป็น standalone function ใน calcDecisionScores)
function fmt(n) { return new Intl.NumberFormat('th-TH').format(Math.round(n)); }

export const CALC = {
  // จัดรูปแบบตัวเลข
  fmt(n) { return new Intl.NumberFormat('th-TH').format(Math.round(n)); },

  // คำนวณอายุ ณ วันลาออก (อิง activeProfile)
  calcAge(retireYear, retireMonth) {
    let age = retireYear - activeProfile.birthYear;
    if (retireMonth < activeProfile.birthMonth) age--;
    return age;
  },

  // คำนวณอายุงาน (อิง activeProfile)
  calcYearsOfService(retireYear) {
    return retireYear - activeProfile.startWorkYear;
  },

  // หาข้อมูลจาก Master Data (อิง activeProfile)
  getMasterData(retireYear) {
    const md = activeProfile.masterData;
    const found = md.find(d => d.year === retireYear);
    if (found) return found;
    const last = md[md.length - 1];
    const first = md[0];
    if (retireYear > last.year) return last;
    if (retireYear < first.year) return first;
    return md.find(d => d.year >= retireYear) || last;
  },

  // คำนวณแพคเกจตามอายุ (อิง activeProfile)
  calcPackageMonths(age) {
    for (const tier of activeProfile.packageTiers) {
      if (age <= tier.maxAge) return tier.months;
    }
    return 0;
  },

  // หาจุดหน้าผาแพคเกจ (cliff) จาก packageTiers
  // คืน array ของ {beforeAge, afterAge, beforeMonths, afterMonths}
  findPackageCliffs() {
    const tiers = activeProfile.packageTiers || DEFAULT_PROFILE.packageTiers;
    const cliffs = [];
    for (let i = 0; i < tiers.length - 1; i++) {
      const curr = tiers[i];
      const next = tiers[i + 1];
      // ตรวจว่าเดือนลดลง และไม่ใช่ tier สุดท้าย (maxAge=999/Infinity)
      if (curr.months > next.months && curr.maxAge < 999 && curr.maxAge !== Infinity) {
        cliffs.push({
          beforeAge: curr.maxAge,
          afterAge: curr.maxAge + 1,
          beforeMonths: curr.months,
          afterMonths: next.months
        });
      }
    }
    return cliffs;
  },

  // หาจุดหน้าผาหลัก (cliff ที่เดือนลดมากสุด)
  findMainCliff() {
    const cliffs = this.findPackageCliffs();
    if (cliffs.length === 0) return null;
    return cliffs.reduce((max, c) =>
      (c.beforeMonths - c.afterMonths) > (max.beforeMonths - max.afterMonths) ? c : max
    , cliffs[0]);
  },

  // คำนวณ Decision Scores สำหรับแต่ละอายุ breakpoint (ใช้ร่วมกับ Best Strategy + Decision Matrix)
  // return: [{age, year, score, totalIncome, pkg, taxRate, pros:[], cons:[]}]
  calcDecisionScores(mdArr) {
    if (!mdArr || mdArr.length === 0) return [];
    // หาอายุ breakpoint จาก packageTiers
    const tiers = activeProfile.packageTiers || DEFAULT_PROFILE.packageTiers;
    const maxAge = activeProfile.retireMaxAge || DEFAULT_PROFILE.retireMaxAge;
    const tierAges = [];
    tiers.forEach(t => {
      const a = (t.maxAge >= 999 || t.maxAge === Infinity) ? maxAge : t.maxAge;
      if (mdArr.some(d => d.age === a)) tierAges.push(a);
    });
    if (!tierAges.includes(maxAge) && mdArr.some(d => d.age === maxAge)) tierAges.push(maxAge);
    const dtAges = [...new Set(tierAges)].sort((a, b) => a - b);
    if (dtAges.length === 0) return [];

    // คำนวณ scores 6 เกณฑ์ (normalize 0-100)
    const norm = (val, max) => max > 0 ? Math.round(val / max * 100) : 0;
    const twVals = dtAges.map(a => (mdArr.find(d => d.age === a) || {}).totalIncome || 0);
    const twMax = Math.max(...twVals, 1);
    const pkgVals = dtAges.map(a => this.calcPackageMonths(a));
    const pkgMax = Math.max(...pkgVals, 1);
    // Tax Efficiency
    const taxRates = dtAges.map(a => {
      const row = mdArr.find(d => d.age === a);
      if (!row) return 0.1;
      try {
        readState();
        const ts = Object.assign({}, STATE, { retireYear: row.year, retireMonth: 6, packageOverride: 'auto' });
        const res = this.calcFullScenario(ts);
        return res.totalGross > 0 ? (res.totalTax / res.totalGross) : 0;
      } catch(e) { return 0.1; }
    });
    const taxScores = taxRates.map(r => Math.max(0, Math.min(100, Math.round(100 - r * 500))));
    const pvdScores = dtAges.map(a => a >= 55 ? 100 : 30);
    const ssScores = dtAges.map(a => a >= 55 ? 100 : Math.round(30 + (a - (dtAges[0] || 40)) * 2));
    const btScores = dtAges.map((a, i) => {
      if (dtAges.length <= 1) return 100;
      return Math.round(100 - (i / (dtAges.length - 1)) * 90);
    });

    const criteria = [
      { name: 'Total Wealth', weight: 30, scores: dtAges.map((a, i) => norm(twVals[i], twMax)) },
      { name: 'Package Value', weight: 25, scores: dtAges.map((a, i) => norm(pkgVals[i], pkgMax)) },
      { name: 'Tax Efficiency', weight: 15, scores: taxScores },
      { name: 'PVD Flexibility', weight: 15, scores: pvdScores },
      { name: 'Social Security', weight: 10, scores: ssScores },
      { name: 'Business Time', weight: 5, scores: btScores }
    ];

    // คำนวณ weighted totals
    const totals = new Array(dtAges.length).fill(0);
    criteria.forEach(c => { c.scores.forEach((s, i) => { totals[i] += s * c.weight / 100; }); });

    // หาค่า max เพื่อสร้าง pros
    const maxTW = Math.max(...twVals);
    const maxPkg = Math.max(...pkgVals);

    // สร้าง result พร้อม pros/cons
    return dtAges.map((age, i) => {
      const row = mdArr.find(d => d.age === age) || {};
      const pkg = pkgVals[i];
      const tRate = taxRates[i];
      const pros = [];
      const cons = [];
      // ข้อดี
      if (twVals[i] === maxTW) pros.push('รายได้รวมสูงสุด ฿' + fmt(twVals[i]));
      if (pkg === maxPkg && pkg > 0) pros.push('แพคเกจสูงสุด ' + pkg + ' เดือน');
      if (age >= 55) { pros.push('PVD ถอนปลอดภาษีได้เลย'); pros.push('ประกันสังคมครบสิทธิ์'); }
      if (tRate < 0.08) pros.push('ภาษีต่ำ ~' + (tRate * 100).toFixed(1) + '%');
      if (i === 0 && dtAges.length > 1) pros.push('มีเวลาทำธุรกิจมากกว่า');
      // ข้อเสีย
      if (age < 55) cons.push('ต้อง rollover PVD → RMF รอจนอายุ 55');
      if (age < 55) cons.push('ยังไม่ครบสิทธิ์ประกันสังคม ม.33');
      if (pkg === 0) cons.push('ไม่ได้แพคเกจ Early Retire');
      else if (pkg < maxPkg) cons.push('แพคเกจน้อยกว่าออกเร็ว (' + pkg + ' vs ' + maxPkg + ' เดือน)');
      if (twVals[i] < maxTW) cons.push('รายได้รวมน้อยกว่า ฿' + fmt(maxTW - twVals[i]));

      return {
        age, year: row.year || 0, score: Math.round(totals[i] * 10) / 10,
        totalIncome: twVals[i], pkg, taxRate: tRate,
        pros, cons, criteria // เก็บ criteria ไว้ให้ Decision Matrix ใช้
      };
    });
  },

  // คำนวณประกันสังคมตามปี (อัตราใหม่)
  getSocialSecurity(year) {
    for (const tier of CONFIG.socialSecurityTiers) {
      if (year <= tier.maxYear) return tier.monthly;
    }
    return 1150;
  },

  // คำนวณวันชดเชยตามอายุงาน
  calcSeveranceDays(yearsOfService) {
    for (const tier of CONFIG.severanceTiers) {
      if (yearsOfService >= tier.minYears) return tier.days;
    }
    return 30;
  },

  // คำนวณภาษีขั้นบันได
  calcProgressiveTax(netIncome) {
    let tax = 0, prev = 0;
    const steps = [];
    for (const b of CONFIG.taxBrackets) {
      if (netIncome <= prev) break;
      const taxable = Math.min(netIncome, b.limit) - prev;
      const t = taxable * b.rate;
      tax += t;
      steps.push({ from: prev, to: Math.min(netIncome, b.limit), rate: b.rate, taxable, tax: t, cumTax: tax });
      prev = b.limit;
    }
    return { tax: Math.round(tax), steps };
  },

  // คำนวณภาษีเงินก้อน (แยกยื่น)
  calcLumpSumTax(earlyTotal, yearsOfService, exempt600k) {
    let gross = earlyTotal;
    let exemption = exempt600k ? Math.min(600000, earlyTotal) : 0;
    let afterExempt = gross - exemption;
    let yearsDeduction = 7000 * yearsOfService;
    let afterYears = Math.max(0, afterExempt - yearsDeduction);
    let halfDeduction = Math.round(afterYears / 2);
    let netForTax = halfDeduction;
    const { tax, steps } = this.calcProgressiveTax(netForTax);
    return { gross, exemption, afterExempt, yearsDeduction, afterYears, halfDeduction, netForTax, tax, steps };
  },

  // คำนวณรายได้เงินเดือน + โบนัส
  calcSalaryIncome(salary, retireMonth, bonusMid, bonusMidMult, bonusEnd, bonusEndMult) {
    let salaryTotal = salary * retireMonth;
    let bonusMidAmt = 0, bonusEndAmt = 0;
    // โบนัสกลางปี: ต้องทำงานถึงเดือน 6
    if (bonusMid && retireMonth >= 6) bonusMidAmt = salary * bonusMidMult;
    // โบนัสปลายปี: ต้องทำงานถึงเดือน 12
    if (bonusEnd && retireMonth >= 12) bonusEndAmt = salary * bonusEndMult;
    let totalIncome40_1 = salaryTotal + bonusMidAmt + bonusEndAmt;
    return { salaryTotal: Math.round(salaryTotal), bonusMidAmt: Math.round(bonusMidAmt), bonusEndAmt: Math.round(bonusEndAmt), totalIncome40_1: Math.round(totalIncome40_1) };
  },

  // คำนวณภาษีเงินเดือน
  calcSalaryTax(totalIncome40_1, retireMonth, deductions) {
    // หักค่าใช้จ่าย 50% ไม่เกิน 100K
    let expense = Math.min(totalIncome40_1 * 0.5, 100000);
    // รวมค่าลดหย่อน
    let dedTotal = deductions.personal + deductions.parents + deductions.lifeIns + deductions.annuity;
    // PVD contribution ตามเดือนที่ทำงาน
    let pvdContrib = Math.round(deductions.baseSalary * deductions.pvdRate / 100) * retireMonth;
    dedTotal += pvdContrib;
    // ประกันสังคม
    dedTotal += deductions.ss * retireMonth;
    // RMF + ESG
    dedTotal += deductions.rmf + deductions.esg;

    let netIncome = totalIncome40_1 - expense - dedTotal;
    if (netIncome < 0) netIncome = 0;
    const { tax, steps } = this.calcProgressiveTax(netIncome);
    return {
      totalIncome40_1, expense: Math.round(expense),
      dedTotal: Math.round(dedTotal), pvdContrib: Math.round(pvdContrib),
      netIncome: Math.round(netIncome), tax, steps
    };
  },

  // คำนวณภาษี PVD (ถ้าถอน)
  calcPvdTax(pvdAmount, age, yearsOfService) {
    if (age >= 55) return { tax: 0, net: pvdAmount };
    // ถอนก่อน 55: เสียภาษีเหมือนเงินก้อน (ประมาณ)
    const result = this.calcLumpSumTax(pvdAmount, yearsOfService, false);
    return { tax: result.tax, net: pvdAmount - result.tax };
  },

  // === คำนวณ Opportunity Cost (ค่าเสียโอกาส) ===
  // เทียบกับ "ถ้าทำงานจนเกษียณอายุ 58"
  // คิด: เงินเดือนสะสม + สวัสดิการ + PVD สมทบเพิ่ม ที่เสียไป
  calcOpportunityCost(ageOut) {
    const md = activeProfile.masterData;
    const discountRate = (activeProfile.inflationRate || 2.5) / 100; // ใช้เงินเฟ้อเป็น discount rate
    const baseYear = CURRENT_YEAR_BE; // ปีปัจจุบัน (dynamic)
    let totalSalary = 0, totalWelfare = 0, totalPvd = 0, totalPV = 0;
    const breakdown = [];

    for (let i = 0; i < md.length; i++) {
      const d = md[i];
      // นับเฉพาะปีหลังจากที่ออก (ปีที่เสียไป)
      if (d.age <= ageOut) continue;
      const annualSalary = d.salary * 12;
      const welfare = d.welfare;
      // PVD สมทบเพิ่ม = pvd ปีนี้ - pvd ปีก่อน
      const prevPvd = i > 0 ? md[i - 1].pvd : d.pvd;
      const pvdGain = d.pvd - prevPvd;
      const yearlyTotal = annualSalary + welfare + pvdGain;
      // Discount กลับเป็นค่าปัจจุบัน
      const yearsFromNow = d.year - baseYear;
      const pv = Math.round(yearlyTotal / Math.pow(1 + discountRate, Math.max(0, yearsFromNow)));

      totalSalary += annualSalary;
      totalWelfare += welfare;
      totalPvd += pvdGain;
      totalPV += pv;
      breakdown.push({ age: d.age, salary: annualSalary, welfare, pvd: pvdGain, pv });
    }
    return { totalPV, totalSalary, totalWelfare, totalPvd, breakdown };
  },

  // === คำนวณ Scenario ทั้งหมด ===
  calcFullScenario(s) {
    const age = this.calcAge(s.retireYear, s.retireMonth);
    const yearsOfService = this.calcYearsOfService(s.retireYear);
    const md = this.getMasterData(s.retireYear);
    const salary = s.baseSalary || md.salary;

    // แพคเกจ
    let packageMonths;
    if (s.packageOverride === 'auto') {
      packageMonths = this.calcPackageMonths(age);
    } else {
      packageMonths = parseInt(s.packageOverride);
    }

    // เงินก้อน
    const severanceDays = this.calcSeveranceDays(yearsOfService);
    const earlyMerit = salary * packageMonths;
    const severanceAmt = Math.round(salary * severanceDays / 30);
    const earlyTotal = earlyMerit + severanceAmt;

    // ภาษีเงินก้อน
    const lumpTax = this.calcLumpSumTax(earlyTotal, yearsOfService, s.exempt600k);

    // รายได้เงินเดือน
    const salaryIncome = this.calcSalaryIncome(salary, s.retireMonth, s.bonusMid, s.bonusMidMult, s.bonusEnd, s.bonusEndMult);

    // ภาษีเงินเดือน
    const salaryTax = this.calcSalaryTax(salaryIncome.totalIncome40_1, s.retireMonth, {
      personal: s.dedPersonal, parents: s.dedParents,
      lifeIns: s.dedLifeIns, annuity: s.dedAnnuity,
      baseSalary: salary, pvdRate: s.dedPvdRate,
      ss: s.dedSS, rmf: s.dedRmf, esg: s.dedEsg
    });

    // PVD (อ่านจาก masterData หรือ activeProfile)
    const pvd = md.pvd || activeProfile.pvdBalance || 7692847;
    let pvdTax = { tax: 0, net: pvd };
    if (s.pvdHandling === 'withdraw') {
      pvdTax = this.calcPvdTax(pvd, age, yearsOfService);
    }

    // รวม
    const totalGross = salaryIncome.totalIncome40_1 + earlyTotal;
    const totalTax = lumpTax.tax + salaryTax.tax + pvdTax.tax;
    const netIncome = totalGross - totalTax;
    const effectiveRate = totalGross > 0 ? (totalTax / totalGross * 100) : 0;

    return {
      // Input
      retireYear: s.retireYear, retireMonth: s.retireMonth,
      monthLabel: CONFIG.monthNames[s.retireMonth - 1] + ' ' + s.retireYear,
      age, yearsOfService, salary, packageMonths,

      // เงินก้อน
      earlyMerit, severanceDays, severanceAmt, earlyTotal,
      lumpTax,

      // เงินเดือน
      salaryIncome, salaryTax,

      // PVD
      pvd, pvdHandling: s.pvdHandling, pvdTax,

      // รวม
      totalGross, totalTax, netIncome,
      effectiveRate: Math.round(effectiveRate * 100) / 100,

      // สำหรับ comparison
      label: CONFIG.monthNames[s.retireMonth - 1] + ' ' + s.retireYear + ' (อายุ ' + age + ')'
    };
  },

  // NPV
  calcNPV(cashFlows, discountRate) {
    let npv = 0;
    cashFlows.forEach((cf, i) => {
      npv += cf / Math.pow(1 + discountRate / 100, i);
    });
    return Math.round(npv);
  }
};

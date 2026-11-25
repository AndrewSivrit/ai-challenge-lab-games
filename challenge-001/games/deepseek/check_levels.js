// Static sanity check: parse levels, ensure each has platform/coins/goal/moving enemy,
// and that goal sits on ground reachable horizontally (simple check).
const fs = require('fs');
const src = fs.readFileSync('levels.js', 'utf8');
const sandbox = {};
new Function('window', src)(sandbox);
const LEVELS = sandbox.LEVELS;
let ok = true;
LEVELS.forEach((L, i) => {
  const rows = L.map;
  const cols = Math.max(...rows.map(r => r.length));
  const bad = rows.filter(r => r.length !== cols);
  const counts = {};
  for (const r of rows) for (const ch of r) counts[ch] = (counts[ch] || 0) + 1;
  const G = counts.G || 0, S = counts.S || 0, o = counts.o || 0;
  const moving = (counts.e || 0) + (counts.f || 0) + (counts['+'] || 0) + (counts['~'] || 0);
  const problems = [];
  if (bad.length) problems.push('ragged rows: ' + bad.length);
  if (G !== 1) problems.push('goal count ' + G);
  if (S !== 1) problems.push('spawn count ' + S);
  if (!o) problems.push('no coins');
  if (!moving) problems.push('no moving hazard');
  if (problems.length) ok = false;
  console.log(`L${i + 1} ${L.name}: ${cols}x${rows.length} coins=${o} enemies=${counts.e||0}/${counts.f||0} movers=${(counts['+']||0)+(counts['~']||0)} -> ${problems.length ? 'FAIL ' + problems.join(', ') : 'OK'}`);
  // goal column has floor below it?
  let gx = -1, gy = -1;
  rows.forEach((r, y) => { const x = r.indexOf('G'); if (x >= 0) { gx = x; gy = y; } });
  const below = rows[gy + 1] ? rows[gy + 1][gx] : '#';
  console.log('   goal at col', gx, 'row', gy, 'below="' + below + '"');
  if (below !== '#' && below !== '=') { ok = false; console.log('   FAIL: goal floating'); }
});
console.log(ok ? 'ALL LEVELS OK' : 'LEVEL ISSUES FOUND');

/**
 * clean-product-titles.js
 *
 * Normalises messy auto-imported product names, e.g.
 *   "Skecher_s Go Run"      -> "Skecher's Go Run"   (underscore-as-apostrophe)
 *   "SKECHER S SLIP-INS"    -> flagged (manual)     (split word / odd casing)
 *   "Seik o Automatic"      -> flagged (manual)     (single letter split off a word)
 *   "Nike  Air   Jordan"    -> "Nike Air Jordan"    (collapsed whitespace)
 *
 * SAFE BY DEFAULT: runs as a DRY RUN and writes nothing.
 * It prints two groups:
 *   1. AUTO-FIXABLE  — purely mechanical, reversible changes.
 *   2. NEEDS REVIEW  — suspicious titles a human should eyeball.
 *
 * To actually apply ONLY the auto-fixable group, re-run with:  node clean-product-titles.js --apply
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

// Whitespace-only normalisation — safe to auto-apply.
// Deliberately does NOT touch underscores, brand spellings, casing, or symbols:
// the obfuscated brand names (Seik_o, Omeg_a, Cartie_r) are intentional.
function autoNormalize(name) {
  let s = name;
  s = s.replace(/\s+/g, ' ');          // collapse runs of whitespace
  s = s.replace(/\s+([,.])/g, '$1');   // no space before comma/period
  s = s.trim();                         // strip leading/trailing whitespace
  return s;
}

// Heuristics that flag a title as suspicious but NOT auto-fixable
// (fixing these blindly could corrupt legitimate names).
function reviewReason(name) {
  const reasons = [];
  // A single letter floating between spaces: "Seik o", "SKECHER S SLIP"
  if (/(^|\s)[a-zA-Z](\s|$)/.test(name)) reasons.push('isolated single letter');
  // ALL-CAPS multi-word titles (likely raw import, not intentional)
  if (/[A-Z]/.test(name) && name === name.toUpperCase() && /\s/.test(name)) reasons.push('all-caps');
  // Leftover odd characters
  if (/[#@$^*~`|<>{}\\]/.test(name)) reasons.push('stray symbols');
  return reasons;
}

(async () => {
  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  const autoFix = [];
  const review = [];

  for (const p of products) {
    const fixed = autoNormalize(p.name);
    if (fixed !== p.name) autoFix.push({ id: p.id, from: p.name, to: fixed });

    const reasons = reviewReason(fixed);
    if (reasons.length) review.push({ id: p.id, name: p.name, reasons });
  }

  console.log(`\nScanned ${products.length} products.`);
  console.log(`\n=== AUTO-FIXABLE (${autoFix.length}) ===`);
  autoFix.forEach(r => console.log(`  #${r.id}: "${r.from}"  ->  "${r.to}"`));

  console.log(`\n=== NEEDS MANUAL REVIEW (${review.length}) ===`);
  review.forEach(r => console.log(`  #${r.id}: "${r.name}"   [${r.reasons.join(', ')}]`));

  if (APPLY && autoFix.length) {
    console.log(`\nApplying ${autoFix.length} auto-fixes...`);
    for (const r of autoFix) {
      await prisma.product.update({ where: { id: r.id }, data: { name: r.to } });
    }
    console.log('Done. (Manual-review items were left untouched.)');
  } else {
    console.log(`\nDRY RUN — nothing written. Re-run with  --apply  to commit the auto-fixable group only.`);
  }

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

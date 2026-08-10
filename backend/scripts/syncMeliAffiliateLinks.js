const { pool } = require('../db/config');
const { syncAffiliateLinks } = require('../services/meliAffiliateLinks');

async function main() {
  try {
    const summary = await syncAffiliateLinks();
    console.log(`Links afiliados: ${summary.saved} guardados, ${summary.zeroCommission} sin comisión, ${summary.failed} fallidos, ${summary.pending} pendientes revisados`);
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

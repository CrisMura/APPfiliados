const { pool } = require('../db/config');
const { updateMeliBestSellers } = require('../services/meliBestSellers');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está configurada');
  }
  if (!process.env.SCRAPEDO_TOKEN) {
    throw new Error('SCRAPEDO_TOKEN no está configurado');
  }

  const result = await updateMeliBestSellers();
  console.log(JSON.stringify({
    success: true,
    skipped: result.skipped,
    updated: result.updated,
    finishedAt: new Date().toISOString(),
  }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
      finishedAt: new Date().toISOString(),
    }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const { launchAffiliateBrowser, PROFILE_DIR } = require('../services/meliAffiliateLinks');

async function main() {
  const context = await launchAffiliateBrowser({ headless: false });
  const page = context.pages()[0] || await context.newPage();
  const prompt = readline.createInterface({ input: stdin, output: stdout });
  try {
    await page.goto('https://www.mercadolibre.cl/', { waitUntil: 'domcontentloaded' });
    console.log(`\nPerfil local: ${PROFILE_DIR}`);
    console.log('Inicia sesión en la ventana de Mercado Libre. Abre un producto y confirma que ves la barra negra de afiliados.');
    await prompt.question('Cuando esté lista, vuelve aquí y presiona ENTER... ');
    console.log('Sesión guardada localmente. Ya puedes cerrar esta ventana.');
  } finally {
    prompt.close();
    await context.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

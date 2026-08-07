const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[PAGE LOG] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.toString()}`);
  });

  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch (e) {
    console.log(`[GOTO ERROR] ${e.message}`);
  }

  await browser.close();
})();

import { chromium } from "playwright";

function log(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] 🎭 ${msg}`);
}

// Can accept either a URL string (to create new browser) or an existing page object
export async function runActions(urlOrPage, actions) {
  let browser = null;
  let page;

  // If first arg is a string URL, launch browser
  if (typeof urlOrPage === "string") {
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    log(`Navigating to ${urlOrPage}`);
    await page.goto(urlOrPage);
  } else {
    // It's an existing page object
    page = urlOrPage;
  }

  for (let i = 0; i < actions.length; i++) {
    const step = actions[i];
    log(`Action ${i + 1}/${actions.length}: ${step.action} → ${step.selector}`);

    try {
      if (step.action === "goto") {
        await page.goto(step.selector);
        log(`Navigated to ${step.selector}`);
      }

      if (step.action === "wait") {
        await page.waitForSelector(step.selector, { timeout: 10000 });
        log(`Found element: ${step.selector}`);
      }

      if (step.action === "click") {
        await page.click(step.selector);
        log(`Clicked: ${step.selector}`);
      }

      if (step.action === "fill") {
        await page.fill(step.selector, step.value);
        log(`Filled "${step.value}" into ${step.selector}`);
      }

      // Small delay between actions for stability
      await page.waitForTimeout(500);
    } catch (err) {
      log(`⚠️ Error on action ${i + 1}: ${err.message}`);
    }
  }

  return { browser, page };
}

export async function getDOM(page) {
  return await page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll(
        "a, button, input, textarea, select, form"
      )
    );

    return elements.map(el => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") || "",
      name: el.getAttribute("name") || "",
      id: el.id || "",
      class: el.className || "",
      text: (el.innerText || "").slice(0, 50),
      placeholder: el.getAttribute("placeholder") || "",
      href: el.getAttribute("href") || ""
    }));
  });
}

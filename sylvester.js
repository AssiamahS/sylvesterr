import { listModels, chat, extractJSON } from "./ollama.js";
import { runActions, getDOM } from "./playwright.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(q) {
  return new Promise(res => rl.question(q, res));
}

function log(emoji, msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${emoji} ${msg}`);
}

(async () => {
  log("🔍", "Fetching Ollama models...");
  const models = await listModels();

  models.forEach((m, i) => console.log(`  [${i}] ${m}`));
  const choice = await ask("Select model number: ");
  const model = models[Number(choice)];

  log("✅", `Using model: ${model}`);

  const goal = await ask("What do you want to do? ");

  log("🌐", "Opening browser and navigating to site...");
  const { page, browser } = await runActions("https://kasaglowclean.com", []);

  log("📄", "Extracting page DOM...");
  const domData = await getDOM(page);
  const dom = JSON.stringify(domData, null, 2);
  log("📄", `DOM extracted (${domData.length} elements, ${dom.length} chars)`);

  log("🧠", "Asking AI to generate actions...");
  const response = await chat(model, [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Here is the page HTML:\n${dom}\n\nGOAL: ${goal}\n\nRespond with ONLY a JSON array of actions.`
    }
  ]);

  log("🔧", "Parsing AI response...");
  const jsonStr = extractJSON(response);
  log("🔧", `Extracted JSON: ${jsonStr.substring(0, 100)}...`);

  let actions;
  try {
    actions = JSON.parse(jsonStr);
    if (!Array.isArray(actions)) {
      throw new Error("Response is not an array");
    }
  } catch (e) {
    log("❌", `Invalid JSON: ${e.message}`);
    console.log("Raw response:", response);
    console.log("Extracted:", jsonStr);
    await browser.close();
    rl.close();
    process.exit(1);
  }

  log("🧠", `Plan generated with ${actions.length} actions:`);
  actions.forEach((a, i) => {
    console.log(`  [${i + 1}] ${a.action}: ${a.selector}${a.value ? ` = "${a.value}"` : ""}`);
  });

  log("🚀", "Executing actions...");
  await runActions(page, actions);

  log("✅", "All actions completed!");

  const keepOpen = await ask("Keep browser open? (y/n): ");
  if (keepOpen.toLowerCase() !== "y") {
    await browser.close();
  }

  rl.close();
})();

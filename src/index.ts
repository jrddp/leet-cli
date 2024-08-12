import { intro, outro, select, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { copyFileSync, existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { nextProblem } from "./commands/nextProblem.js";
import { showProgress } from "./commands/viewProgress.js";
import { viewRecentlyCompleted } from "./commands/recentlyCompleted.js";
import { Problem, dateReviver, problemsFilePath } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateFilePath = path.join(__dirname, "..", "data", "grind75_template.json");

if (!existsSync(problemsFilePath)) {
  copyFileSync(templateFilePath, problemsFilePath);
  console.log(chalk.yellow("Problems file created with Grind75 template."));
}

export let problems = JSON.parse(readFileSync(problemsFilePath, "utf8"), dateReviver) as Problem[];

async function main() {
  intro(chalk.bold(chalk.green("Welcome to leet-cli!")));

  while (true) {
    const options = [
      { value: "next", label: "Open next problem" },
      { value: "show_progress", label: "View progress" },
      { value: "recent", label: "View recently completed problems" },
      { value: "exit", label: "Exit" },
    ];

    const action = await select({
      message: "Select an action:",
      options,
    });

    if (isCancel(action) || action === "exit") {
      break;
    }

    switch (action) {
      case "next":
        await nextProblem();
        break;
      case "show_progress":
        await showProgress();
        break;
      case "recent":
        await viewRecentlyCompleted();
        break;
    }
  }

  outro(chalk.bold(chalk.green("Goodbye and good luck!")));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };

#!/usr/bin/env bun
import { intro, outro, select, confirm, note, isCancel, text } from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, write, writeFileSync } from "fs";

function dateReviver(key, value) {
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  if (typeof value === "string" && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}

let problems = JSON.parse(readFileSync("/Users/jard/Scripts/leet/grind75.json", "utf8"), dateReviver) as Problem[];

async function main() {
  intro(chalk.bold(chalk.green("Grind75 Manager")));

  while (true) {
    const action = await select({
      message: "Select an action:",
      options: [
        { value: "next", label: "Open next problem" },
        { value: "show_progress", label: "View progress" },
        { value: "list_category", label: "List problems by category" },
        { value: "exit", label: "Exit" },
      ],
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
      case "list_category":
        await listProblemsByCategory();
        break;
    }
  }
}

type Problem = {
  name: string;
  isComplete: boolean;
  timeTaken: string | null;
  timeExpected: string;
  completionDate: Date | null;
  url: string;
  category: string;
  difficulty: string;
};

function writeProblems(): void {
  const content = JSON.stringify(problems, null, 2);
  writeFileSync("grind75.json", content);
}

async function nextProblem() {
  const probIndex = problems.findIndex(p => !p.isComplete);
  if (probIndex === -1) {
    note(chalk.yellow("Congratulations! All problems are completed."));
    return;
  }
  const problem = problems[probIndex];

  const timeTaken = await text({
    message: `${chalk.bold(chalk.green(`${problem.name}: ~${problem.timeExpected}`))}\n${chalk.bold(
      chalk.yellow(problem.url)
    )}\n${chalk.italic(
      "Enter time taken or press Ctrl+C to cancel. Put 0 if you forgot to time it."
    )}`,
    initialValue: "",
  });

  problems[probIndex].isComplete = true;
  problems[probIndex].completionDate = new Date();
  problems[probIndex].timeTaken = String(timeTaken);
  writeProblems();

  console.log(chalk.green(`Nice job! Your progress has been updated.`));
  console.log(
    chalk.yellow(
      chalk.bold(
        `You completed a ${problem.difficulty.toLowerCase()} ${
          problem.category
        } problem in ${String(timeTaken)}.`
      )
    )
  );
}

async function showProgress() {
  const nComplete = problems.filter(p => p.isComplete).length;
  const nTotal = problems.length;
  const percentComplete = Math.round((nComplete / nTotal) * 100);

  const earliestDate = new Date(
    problems.reduce((acc, p) => Math.min(acc, p.completionDate?.getTime() ?? Infinity), Infinity)
  );
  const daysGoing =
    Math.round((new Date().getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dailyAverage = (nComplete / daysGoing).toFixed(2);

  console.log(
    chalk.bold(`${nComplete}/${nTotal} (${percentComplete}%)
Daily average: ${dailyAverage} problems
Days completing problems: ${daysGoing} days
${renderProgressBar(nComplete, nTotal)}`)
  );
}

async function listProblemsByCategory() {}

function renderProgressBar(nComplete: number, nTotal: number): string {
  const nLeft = nTotal - nComplete;
  return "|".repeat(nComplete) + ".".repeat(nLeft);
}

main().catch(console.error);

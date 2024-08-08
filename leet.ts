#!/usr/bin/env bun
import { intro, outro, select, confirm, note, isCancel, text } from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync } from "fs";

const problemsFilePath = "/Users/jard/Scripts/leet/grind75.json";

function dateReviver(key: string, value: any) {
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  if (typeof value === "string" && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}

let problems = JSON.parse(readFileSync(problemsFilePath, "utf8"), dateReviver) as Problem[];

async function main() {
  intro(chalk.bold(chalk.green("Grind75 Manager")));

  while (true) {
    const action = await select({
      message: "Select an action:",
      options: [
        { value: "next", label: "Open next problem" },
        { value: "show_progress", label: "View progress" },
        { value: "list_category", label: "List problems by category" },
        { value: "recent", label: "View recently completed problems" },
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
      case "recent":
        await viewRecentlyCompleted();
        break;
    }
  }
}

type Problem = {
  name: string;
  isComplete: boolean;
  timeTaken: number | null;
  timeExpected: string;
  completionDate: Date | null;
  url: string;
  category: string;
  difficulty: string;
};

function writeProblems(): void {
  const content = JSON.stringify(problems, null, 2);
  writeFileSync(problemsFilePath, content, "utf8");
}

function parseTimeToSeconds(timeString: string): number {
  if (timeString === "0") return 0;
  const [minutes, seconds] = timeString.split(":").map(Number);
  return minutes * 60 + seconds;
}

function formatSecondsToTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function nextProblem() {
  const probIndex = problems.findIndex(p => !p.isComplete);
  if (probIndex === -1) {
    note(chalk.yellow("Congratulations! All problems are completed."));
    return;
  }
  const problem = problems[probIndex];

  let timeTaken: string | symbol;
  timeTaken = await text({
    message: `${chalk.bold(chalk.green(`${problem.name}: ~${problem.timeExpected}`))}\n${chalk.bold(
      chalk.yellow(problem.url)
    )}\n${chalk.italic(
      "Enter time taken in m:ss format. Put 0 if you forgot to time it. Press Ctrl+C to cancel."
    )}`,
    initialValue: "",
    validate: input => {
      if (input === "0" || /^\d+:\d{2}$/.test(input)) {
        return;
      }
      return "Please enter time in m:ss format (e.g., 5:30) or 0";
    },
  });

  if (isCancel(timeTaken)) {
    note(chalk.yellow("Problem completion cancelled."));
    return;
  }

  const timeTakenSeconds = parseTimeToSeconds(timeTaken as string);

  problems[probIndex].isComplete = true;
  problems[probIndex].completionDate = new Date();
  problems[probIndex].timeTaken = timeTakenSeconds;
  writeProblems();

  console.log(chalk.green(`Nice job! Your progress has been updated.`));
  console.log(
    chalk.yellow(
      chalk.bold(
        `You completed a ${problem.difficulty.toLowerCase()} ${
          problem.category
        } problem in ${timeTaken}.`
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

  // Calculate average time for each difficulty
  const difficultyLevels = ["Easy", "Medium", "Hard"];
  difficultyLevels.forEach(difficulty => {
    const relevantProblems = problems.filter(
      p => p.difficulty === difficulty && p.isComplete && p.timeTaken && p.timeTaken > 0
    );
    if (relevantProblems.length > 0) {
      const averageTime =
        relevantProblems.reduce((sum, p) => sum + (p.timeTaken || 0), 0) / relevantProblems.length;
      console.log(
        chalk.cyan(
          `Average time for ${difficulty} problems: ${formatSecondsToTime(Math.round(averageTime))}`
        )
      );
    } else {
      console.log(chalk.cyan(`No completed ${difficulty} problems with valid time taken.`));
    }
  });
}

async function listProblemsByCategory() {}

function renderProgressBar(nComplete: number, nTotal: number): string {
  const nLeft = nTotal - nComplete;
  return "|".repeat(nComplete) + ".".repeat(nLeft);
}

function parseExpectedTime(timeString: string): number {
  const minutes = parseInt(timeString.split(" ")[0]);
  return minutes * 60;
}

function formatTimeDifference(timeDiff: number): string {
  const minutes = Math.floor(Math.abs(timeDiff) / 60);
  const seconds = Math.abs(timeDiff) % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  return timeDiff < 0 ? `${formattedTime} fast` : `${formattedTime} slow`;
}

async function viewRecentlyCompleted() {
  const completedProblems = problems
    .filter(p => p.isComplete && p.completionDate)
    .sort((a, b) => (b.completionDate?.getTime() || 0) - (a.completionDate?.getTime() || 0))
    .slice(0, 5);

  if (completedProblems.length === 0) {
    note(chalk.yellow("No completed problems found."));
    return;
  }

  completedProblems.forEach(problem => {
    const difficultyColor =
      problem.difficulty === "Easy"
        ? chalk.green
        : problem.difficulty === "Medium"
        ? chalk.hex("#FFA500") // Orange
        : chalk.red;

    const expectedTime = parseExpectedTime(problem.timeExpected);
    const timeDiff = (problem.timeTaken || 0) - expectedTime;
    const timeDiffFormatted = formatTimeDifference(timeDiff);
    const timeDiffColor = timeDiff < 0 ? chalk.green : chalk.red;

    const daysSinceCompletion = Math.round(
      (new Date().getTime() - (problem.completionDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)
    );

    console.log(
      `${chalk.bold(problem.name)} ${difficultyColor(problem.difficulty)} ${chalk.blue(
        problem.category
      )} ${chalk.yellow(`Completed: ${problem.completionDate?.toLocaleString()}`)} ${chalk.dim(
        `(${daysSinceCompletion} days ago)`
      )}`
    );
    console.log(
      `Completed in ${
        problem.timeTaken ? formatSecondsToTime(problem.timeTaken) : "0"
      } ${timeDiffColor(`(${timeDiffFormatted})`)}`
    );
    console.log("---");
  });
}

main().catch(console.error);

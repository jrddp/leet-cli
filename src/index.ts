import { intro, outro, select, confirm, note, isCancel, text } from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const problemsFilePath = path.join(__dirname, "..", "data", "grind75.json");

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
}

type Problem = {
  name: string;
  isComplete: boolean;
  timesTaken: number[];
  timeExpected: string;
  completionDate: Date | null;
  url: string;
  category: string;
  difficulty: string;
  attempts: number;
  reviewScheduled: Date | null;
  observations: string[];
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

async function nextProblem(startIndex = 0) {
  const probIndex =
    problems
      .slice(startIndex)
      .findIndex(p =>
        p.isComplete
          ? p.reviewScheduled && p.reviewScheduled < new Date()
          : !(p.reviewScheduled && p.reviewScheduled > new Date())
      ) + startIndex;

  if (probIndex === -1) {
    note(chalk.yellow("Congratulations! All problems are completed."));
    return;
  }
  const problem = problems[probIndex];

  const difficultyText =
    problem.difficulty === "Easy"
      ? chalk.green(problem.difficulty)
      : problem.difficulty === "Medium"
      ? chalk.yellow(problem.difficulty)
      : chalk.red(problem.difficulty);

  const isReview = problem.reviewScheduled && problem.reviewScheduled <= new Date();
  const reviewText = isReview ? chalk.red(" [REVIEW]") : "";
  const header = `${problem.name}: ~${problem.timeExpected} ${chalk.italic(
    difficultyText
  )}${reviewText}`;
  const formattedHeader = isReview ? chalk.red(header) : chalk.green(header);

  let timeTaken: string | symbol;
  timeTaken = await text({
    message: `${chalk.italic(probIndex + 1)} ${chalk.bold(formattedHeader)}\n${chalk.bold(
      chalk.yellow(problem.url)
    )}\n${chalk.italic(
      "Enter time taken in m:ss format. Put 0 if you forgot to time it. Enter 'fail' if you couldn't solve it. Enter 'skip' to skip. Press Ctrl+C to cancel."
    )}`,
    defaultValue: "skip",
    placeholder: "skip",
    validate: input => {
      if (
        !input ||
        input === "0" ||
        input === "fail" ||
        input === "skip" ||
        /^\d+:\d{2}$/.test(input)
      ) {
        return;
      }
      return "Please enter time in m:ss format (e.g., 5:30), 0, 'fail', or 'skip'";
    },
  });

  if (isCancel(timeTaken)) {
    return;
  }

  if (timeTaken === "skip") {
    await nextProblem(probIndex + 1);
    return;
  }

  if (!problem.attempts) {
    problem.attempts = 0;
  }
  problem.attempts++;

  if (!problem.observations) {
    problem.observations = [];
  }

  const observation = await text({
    message:
      timeTaken === "fail"
        ? "What observations did you make about your failure?"
        : "Any observations about the problem?",
    initialValue: "",
  });

  if (!isCancel(observation) && observation) {
    problem.observations.push(observation as string);
  }

  if (timeTaken === "fail") {
    problem.reviewScheduled = new Date(new Date().setDate(new Date().getDate() + 1));
    note(chalk.yellow(`Problem marked for review tomorrow.`));
  } else {
    const timeTakenSeconds = parseTimeToSeconds(timeTaken as string);
    if (!problem.isComplete) {
      problem.isComplete = true;
      problem.completionDate = new Date();
    }
    problem.timesTaken.push(timeTakenSeconds);

    const reviewChoice: symbol | "no" | "1" | "3" | "5" = await select({
      message: "Schedule review?",
      options: [
        { value: "no", label: "No" },
        { value: "1", label: "Tomorrow" },
        { value: "3", label: "In 3 days" },
        { value: "5", label: "In 5 days" },
      ],
    });

    if (isCancel(reviewChoice)) {
      problem.reviewScheduled = new Date(new Date().setDate(new Date().getDate() + 1));
      return;
    }
    problem.reviewScheduled = null;
    if (reviewChoice !== "no") {
      const days = parseInt(reviewChoice);
      problem.reviewScheduled = new Date(new Date().setDate(new Date().getDate() + days));
      note(chalk.green(`Review scheduled in ${days} day${days > 1 ? "s" : ""}.`));
    }

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

  writeProblems();
}

async function reviewProblems() {
  const reviewProblems = problems.filter(p => p.reviewScheduled && p.reviewScheduled <= new Date());

  for (const problem of reviewProblems) {
    const action = await select({
      message: `Review ${chalk.bold(problem.name)}?${
        problem.observations && problem.observations.length > 0
          ? `\nPrevious observations:\n${problem.observations.map(obs => `- ${obs}`).join("\n")}`
          : ""
      }`,
      options: [
        { value: "yes", label: "Yes" },
        { value: "skip", label: "Skip" },
        { value: "cancel", label: "Cancel review session" },
      ],
    });

    if (action === "cancel" || isCancel(action)) {
      break;
    }

    if (action === "yes") {
      await nextProblem();
    } else {
      problem.reviewScheduled = new Date(new Date().setDate(new Date().getDate() + 1));
      note(chalk.yellow(`Problem review postponed to tomorrow.`));
    }
  }

  writeProblems();
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

  let output = chalk.bold(`${nComplete}/${nTotal} (${percentComplete}%)
Daily average: ${dailyAverage} problems
Days completing problems: ${daysGoing} days
${renderProgressBar(nComplete, nTotal)}\n`);

  // Calculate average time for each difficulty
  const difficultyLevels = ["Easy", "Medium", "Hard"];
  difficultyLevels.forEach(difficulty => {
    const relevantProblems = problems.filter(
      p => p.difficulty === difficulty && p.isComplete && p.timesTaken.length > 0
    );
    if (relevantProblems.length > 0) {
      const averageTime =
        relevantProblems.reduce((sum, p) => sum + p.timesTaken[0], 0) / relevantProblems.length;
      output += chalk.cyan(
        `Average first-time completion for ${difficulty} problems: ${formatSecondsToTime(
          Math.round(averageTime)
        )}\n`
      );
    } else {
      output += chalk.cyan(`No completed ${difficulty} problems with valid time taken.\n`);
    }
  });

  await displayAndWait(output);
}

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

  let output = "";
  completedProblems.forEach(problem => {
    const difficultyColor =
      problem.difficulty === "Easy"
        ? chalk.green
        : problem.difficulty === "Medium"
        ? chalk.yellow
        : chalk.red;

    const expectedTime = parseExpectedTime(problem.timeExpected);
    const timeDiff = problem.timesTaken[0] - expectedTime;
    const timeDiffFormatted = formatTimeDifference(timeDiff);
    const timeDiffColor = timeDiff < 0 ? chalk.green : chalk.red;

    const daysSinceCompletion = Math.round(
      (new Date().getTime() - (problem.completionDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)
    );

    output += `${chalk.bold(problem.name)} ${difficultyColor(problem.difficulty)} ${chalk.blue(
      problem.category
    )} ${chalk.yellow(`Completed: ${problem.completionDate?.toLocaleString()}`)} ${chalk.dim(
      `(${daysSinceCompletion} days ago)`
    )}\n`;
    output += `Completed in ${
      problem.timesTaken[0] ? formatSecondsToTime(problem.timesTaken[0]) : "0"
    } ${timeDiffColor(`(${timeDiffFormatted})`)}\n`;
    if (problem.timesTaken.length > 1) {
      output += `Review times: ${problem.timesTaken
        .slice(1)
        .map(t => formatSecondsToTime(t))
        .join(", ")}\n`;
    }
    if (problem.observations && problem.observations.length > 0) {
      output += `Observations:\n${problem.observations.map(obs => `- ${obs}`).join("\n")}\n`;
    }
    output += "---\n";
  });

  await displayAndWait(output);
}

async function displayAndWait(content: string) {
  console.log(content);
  await text({
    message: "Press Enter to continue",
    initialValue: "",
    defaultValue: ":)",
  });
}

main().catch(console.error);

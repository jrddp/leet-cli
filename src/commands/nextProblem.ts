import { text, select, isCancel, note } from "@clack/prompts";
import chalk from "chalk";
import { problems } from "../index.js";
import { Problem, writeProblems, parseTimeToSeconds, formatSecondsToTime } from "../utils.js";

export async function nextProblem(startIndex = 0) {
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

  writeProblems(problems);
}

export async function reviewProblems() {
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

  writeProblems(problems);
}

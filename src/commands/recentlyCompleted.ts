import chalk from "chalk";
import { note } from "@clack/prompts";
import { problems } from "../index.js";
import {
  parseExpectedTime,
  formatTimeDifference,
  formatSecondsToTime,
  displayAndWait,
} from "../utils.js";

export async function viewRecentlyCompleted() {
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

import chalk from "chalk";
import { problems } from "../index.js";
import { renderProgressBar, formatSecondsToTime, displayAndWait } from "../utils.js";

export async function showProgress() {
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

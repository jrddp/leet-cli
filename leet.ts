#!/usr/bin/env bun
import { intro, outro, select, confirm, note } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

type Problem = {
  isComplete: boolean;
  link: string;
  category: string;
};

async function readProblems(): Promise<Problem[]> {
  const content = await fs.readFile('problems.csv', 'utf-8');
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const [isComplete, link, category] = line.split(',');
    return { isComplete: isComplete === 'true', link, category };
  });
}

async function writeProblems(problems: Problem[]): Promise<void> {
  const content = problems.map(p => `${p.isComplete},${p.link},${p.category}`).join('\n');
  await fs.writeFile('problems.csv', content);
}

function getCategoryStats(problems: Problem[]): Record<string, { total: number; completed: number }> {
  const stats: Record<string, { total: number; completed: number }> = {};
  for (const problem of problems) {
    if (!stats[problem.category]) {
      stats[problem.category] = { total: 0, completed: 0 };
    }
    stats[problem.category].total++;
    if (problem.isComplete) {
      stats[problem.category].completed++;
    }
  }
  return stats;
}

function getRandomIncompleteIndex(problems: Problem[]): number {
  const incompleteProblemIndices = problems
    .map((p, index) => ({ isComplete: p.isComplete, index }))
    .filter(p => !p.isComplete)
    .map(p => p.index);
  return incompleteProblemIndices[Math.floor(Math.random() * incompleteProblemIndices.length)];
}

async function listProblemsByCategory(problems: Problem[]): Promise<void> {
  const stats = getCategoryStats(problems);
  const categories = Object.keys(stats).sort();

  while (true) {
    const categoryChoice = await select({
      message: 'Select a category:',
      options: [
        { value: 'back', label: 'Go back' },
        ...categories.map(category => ({
          value: category,
          label: `${category} (${stats[category].completed}/${stats[category].total}, ${(stats[category].completed / stats[category].total * 100).toFixed(1)}%)`
        }))
      ]
    });

    if (categoryChoice === 'back') {
      break;
    }

    const categoryProblems = problems.filter(p => p.category === categoryChoice);
    const incompleteProblems = categoryProblems.filter(p => !p.isComplete);
    const completeProblems = categoryProblems.filter(p => p.isComplete);
    const randomIncompleteIndex = getRandomIncompleteIndex(categoryProblems);

    note(chalk.bold(`${categoryChoice} (${stats[categoryChoice as string].completed}/${stats[categoryChoice as string].total}, ${(stats[categoryChoice as string].completed / stats[categoryChoice as string].total * 100).toFixed(1)}%)`));

    for (const [index, problem] of incompleteProblems.entries()) {
      const isRandom = index === randomIncompleteIndex;
      console.log(isRandom ? chalk.bgYellow.black(`➤ ${problem.link}`) : `  ${problem.link}`);
    }

    for (const problem of completeProblems) {
      console.log(chalk.dim(`  ${problem.link} (completed)`));
    }

    await select({
      message: 'Press Enter to go back',
      options: [{ value: 'back', label: 'Go back' }]
    });
  }
}

async function selectRandomProblem(problems: Problem[]): Promise<void> {
  const incompleteProblemIndices = problems
    .map((p, index) => ({ isComplete: p.isComplete, index }))
    .filter(p => !p.isComplete)
    .map(p => p.index);

  if (incompleteProblemIndices.length === 0) {
    note(chalk.yellow('Congratulations! All problems are completed.'));
    return;
  }

  const randomIndex = incompleteProblemIndices[Math.floor(Math.random() * incompleteProblemIndices.length)];
  const problem = problems[randomIndex];
  const stats = getCategoryStats(problems);

  note(chalk.bold(`${problem.category} (${stats[problem.category].completed}/${stats[problem.category].total}, ${(stats[problem.category].completed / stats[problem.category].total * 100).toFixed(1)}%)`));
  console.log(chalk.green(`Random problem: ${problem.link}`));

  const isCompleted = await confirm({
    message: 'Did you complete this problem?'
  });

  if (isCompleted) {
    problems[randomIndex].isComplete = true;
    await writeProblems(problems);
    note(chalk.green('Problem marked as completed and CSV file updated.'));
  }
}

async function main() {
  intro(chalk.bold('LeetCode Problem Manager'));

  const problems = await readProblems();

  while (true) {
    const action = await select({
      message: 'Choose an action:',
      options: [
        { value: 'list', label: 'List problems by category' },
        { value: 'random', label: 'Select random problem' },
        { value: 'exit', label: 'Exit' }
      ]
    });

    switch (action) {
      case 'list':
        await listProblemsByCategory(problems);
        break;
      case 'random':
        await selectRandomProblem(problems);
        break;
      case 'exit':
        outro(chalk.bold('Goodbye!'));
        process.exit(0);
    }
  }
}

main().catch(console.error);


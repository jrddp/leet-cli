#!/usr/bin/env bun
import { intro, outro, select, confirm, note, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs/promises';

type Problem = {
  isComplete: boolean;
  link: string;
  category: string;
};

async function readProblems(): Promise<Problem[]> {
  const content = await fs.readFile('/Users/jard/Scripts/leet/problems.csv', 'utf-8');
  const lines = content.trim().split('\n');
  return lines.slice(1).map(line => {
    const [isComplete, link, category] = line.split(',');
    return { isComplete: isComplete === '1', link, category };
  });
}

async function writeProblems(problems: Problem[]): Promise<void> {
  const header = 'isComplete,link,category';
  const content = [header, ...problems.map(p => `${p.isComplete ? '1' : '0'},${p.link},${p.category}`)].join('\n');
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

function getRandomIncompleteIndex(problems: Problem[]): number | null {
  const incompleteProblemIndices = problems
    .map((p, index) => ({ isComplete: p.isComplete, index }))
    .filter(p => !p.isComplete)
    .map(p => p.index);
  return incompleteProblemIndices.length > 0
    ? incompleteProblemIndices[Math.floor(Math.random() * incompleteProblemIndices.length)]
    : null;
}

function getRandomIncompleteCategoryIndex(categories: string[], stats: Record<string, { total: number; completed: number }>): number | null {
  const incompleteCategoryIndices = categories
    .map((category, index) => ({ hasIncomplete: stats[category].completed < stats[category].total, index }))
    .filter(c => c.hasIncomplete)
    .map(c => c.index);
  return incompleteCategoryIndices.length > 0
    ? incompleteCategoryIndices[Math.floor(Math.random() * incompleteCategoryIndices.length)]
    : null;
}

async function listProblemsByCategory(problems: Problem[]): Promise<void> {
  while (true) {
    const stats = getCategoryStats(problems);
    const categories = Object.keys(stats).sort();
    let randomCategoryIndex = getRandomIncompleteCategoryIndex(categories, stats);

    const categoryChoice = await select({
      message: 'Select a category (or choose "Reroll" to get a new random category):',
      options: [
        { value: 'back', label: 'Go back' },
        { value: 'reroll', label: 'Reroll random category' },
        ...categories.map((category, index) => ({
          value: category,
          label: `${category} (${stats[category].completed}/${stats[category].total}, ${(stats[category].completed / stats[category].total * 100).toFixed(1)}%)${index === randomCategoryIndex ? ' 🎲' : ''}`
        }))
      ]
    });

    if (isCancel(categoryChoice) || categoryChoice === 'back') {
      break;
    }

    if (categoryChoice === 'reroll') {
      continue;
    }

    const categoryProblems = problems.filter(p => p.category === categoryChoice);
    let randomIncompleteIndex = getRandomIncompleteIndex(categoryProblems);

    while (true) {
      note(chalk.bold(`${categoryChoice} (${stats[categoryChoice as string].completed}/${stats[categoryChoice as string].total}, ${(stats[categoryChoice as string].completed / stats[categoryChoice as string].total * 100).toFixed(1)}%)`));

      const sortedProblems = [
        ...categoryProblems.filter(p => !p.isComplete),
        ...categoryProblems.filter(p => p.isComplete)
      ];

      const problemChoice = await select({
        message: 'Select a problem (or choose "Reroll" to get a new random problem):',
        options: [
          { value: 'back', label: 'Go back to categories' },
          { value: 'reroll', label: 'Reroll random problem' },
          ...sortedProblems.map((problem, index) => ({
            value: categoryProblems.indexOf(problem).toString(),
            label: `${problem.isComplete ? chalk.dim('✓') : ' '} ${problem.link}${categoryProblems.indexOf(problem) === randomIncompleteIndex ? ' 🎲' : ''}`
          }))
        ]
      });

      if (isCancel(problemChoice) || problemChoice === 'back') {
        break;
      }

      if (problemChoice === 'reroll') {
        randomIncompleteIndex = getRandomIncompleteIndex(categoryProblems);
        continue;
      }

      const selectedProblem = categoryProblems[parseInt(problemChoice as string)];
      const newStatus = await confirm({
        message: `Set problem status (current: ${selectedProblem.isComplete ? 'complete' : 'incomplete'}):`,
        initialValue: selectedProblem.isComplete,
      });

      if (isCancel(newStatus)) {
        continue;
      }

      if (newStatus !== selectedProblem.isComplete) {
        selectedProblem.isComplete = newStatus;
        await writeProblems(problems);
        note(chalk.green(`Problem status updated to ${newStatus ? 'complete' : 'incomplete'}.`));
        stats[categoryChoice as string].completed += newStatus ? 1 : -1;
      }

      randomIncompleteIndex = getRandomIncompleteIndex(categoryProblems);
    }
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

  if (isCancel(isCompleted)) {
    return;
  }

  if (isCompleted !== problem.isComplete) {
    problem.isComplete = isCompleted;
    await writeProblems(problems);
    note(chalk.green(`Problem marked as ${isCompleted ? 'completed' : 'incomplete'} and CSV file updated.`));
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

    if (isCancel(action) || action === 'exit') {
      break;
    }

    switch (action) {
      case 'list':
        await listProblemsByCategory(problems);
        break;
      case 'random':
        await selectRandomProblem(problems);
        break;
    }
  }

  outro(chalk.bold('Goodbye!'));
}

main().catch(console.error);


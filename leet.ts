#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { intro, outro, select, confirm, spinner } from '@clack/prompts';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Problem {
  isComplete: string;
  link: string;
  category: string;
}

let problems: Problem[] = [];

async function loadProblems(): Promise<Problem[]> {
  const filePath = path.join(__dirname, 'problems.csv');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  return parse(fileContent, { columns: true }) as Problem[];
}

async function saveProblems(problems: Problem[]): Promise<void> {
  const filePath = path.join(__dirname, 'problems.csv');
  const csv = stringify(problems, { header: true });
  await fs.writeFile(filePath, csv);
}

function getRandomIncompleteProblem(): Problem | null {
  const incompleteProblems = problems.filter(p => p.isComplete === '0');
  if (incompleteProblems.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * incompleteProblems.length);
  return incompleteProblems[randomIndex];
}

function showIncompleteByCategory(): void {
  const categories = [...new Set(problems.map(p => p.category))];
  categories.forEach(category => {
    const incompleteProblems = problems.filter(p => p.category === category && p.isComplete === '0');
    if (incompleteProblems.length > 0) {
      console.log(chalk.cyan(`\n${category}:`));
      incompleteProblems.forEach(p => console.log(chalk.blue(p.link)));
    }
  });
}

function showAllIncomplete(): void {
  const incompleteProblems = problems.filter(p => p.isComplete === '0');
  incompleteProblems.forEach(p => {
    console.log(chalk.cyan(`${p.category}:`), chalk.blue(p.link));
  });
}

function showCategoryStats(): void {
  const categories = [...new Set(problems.map(p => p.category))];
  categories.forEach(category => {
    const categoryProblems = problems.filter(p => p.category === category);
    const completeCount = categoryProblems.filter(p => p.isComplete === '1').length;
    const totalCount = categoryProblems.length;
    const percentComplete = ((completeCount / totalCount) * 100).toFixed(2);
    console.log(chalk.cyan(`${category}:`), 
      chalk.green(`${completeCount}/${totalCount} (${percentComplete}%)`));
  });
}

async function main() {
  intro(chalk.bold('LeetCode Problem Tracker'));

  const s = spinner();
  s.start('Loading problems');
  problems = await loadProblems();
  s.stop('Problems loaded');

  while (true) {
    const action = await select({
      message: 'What would you like to do?',
      options: [
        { value: 'random', label: 'Get random incomplete problem' },
        { value: 'byCategory', label: 'Show incomplete by category' },
        { value: 'allIncomplete', label: 'Show all incomplete' },
        { value: 'stats', label: 'Show category stats' },
        { value: 'exit', label: 'Exit' },
      ],
    }) as string;

    switch (action) {
      case 'random': {
        const problem = getRandomIncompleteProblem();
        if (problem) {
          console.log(chalk.green(`Random incomplete problem: ${problem.link}`));
          const completed = await confirm({
            message: 'Have you completed this problem?',
          });
          if (completed) {
            problem.isComplete = '1';
            await saveProblems(problems);
            console.log(chalk.green('Problem marked as completed!'));
          }
        } else {
          console.log(chalk.yellow('All problems are completed!'));
        }
        break;
      }
      case 'byCategory':
        showIncompleteByCategory();
        break;
      case 'allIncomplete':
        showAllIncomplete();
        break;
      case 'stats':
        showCategoryStats();
        break;
      case 'exit':
        outro(chalk.yellow('Goodbye!'));
        process.exit(0);
    }
  }
}

main().catch(console.error);


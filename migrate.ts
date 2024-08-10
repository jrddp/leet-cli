#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "fs";

const problemsFilePath = "/Users/jard/Scripts/leet/grind75.json";

function dateReviver(key: string, value: any) {
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  if (typeof value === "string" && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}

type OldProblem = {
  name: string;
  isComplete: boolean;
  timeTaken: number | null;
  timeExpected: string;
  completionDate: Date | null;
  url: string;
  category: string;
  difficulty: string;
  attempts?: number;
  reviewScheduled?: Date | null;
  failDesc?: string | null;
};

type NewProblem = {
  name: string;
  isComplete: boolean;
  timeTaken: number | null;
  timeExpected: string;
  completionDate: Date | null;
  url: string;
  category: string;
  difficulty: string;
  attempts: number;
  reviewScheduled: Date | null;
  observations: string[];
};

function migrateData(oldProblems: OldProblem[]): NewProblem[] {
  return oldProblems.map(oldProblem => {
    const newProblem: NewProblem = {
      ...oldProblem,
      attempts: oldProblem.attempts ?? (oldProblem.isComplete ? 1 : 0),
      reviewScheduled: oldProblem.reviewScheduled ?? null,
      observations: [],
    };

    if (oldProblem.failDesc) {
      newProblem.observations.push(oldProblem.failDesc);
    }

    return newProblem;
  });
}

// Read the old data
const oldProblems = JSON.parse(readFileSync(problemsFilePath, "utf8"), dateReviver) as OldProblem[];

// Migrate the data
const newProblems = migrateData(oldProblems);

// Write the new data
const content = JSON.stringify(newProblems, null, 2);
writeFileSync(problemsFilePath, content, "utf8");

console.log("Data migration completed successfully!");

import { writeFileSync } from "fs";
import { text } from "@clack/prompts";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const problemsFilePath = path.join(__dirname, "..", "data", "grind75.json");

export type Problem = {
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

export function dateReviver(key: string, value: any) {
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  if (typeof value === "string" && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}

export function writeProblems(problems: Problem[]): void {
  const content = JSON.stringify(problems, null, 2);
  writeFileSync(problemsFilePath, content, "utf8");
}

export function parseTimeToSeconds(timeString: string): number {
  if (timeString === "0") return 0;
  const [minutes, seconds] = timeString.split(":").map(Number);
  return minutes * 60 + seconds;
}

export function formatSecondsToTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function renderProgressBar(nComplete: number, nTotal: number): string {
  const nLeft = nTotal - nComplete;
  return "|".repeat(nComplete) + ".".repeat(nLeft);
}

export function parseExpectedTime(timeString: string): number {
  const minutes = parseInt(timeString.split(" ")[0]);
  return minutes * 60;
}

export function formatTimeDifference(timeDiff: number): string {
  const minutes = Math.floor(Math.abs(timeDiff) / 60);
  const seconds = Math.abs(timeDiff) % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  return timeDiff < 0 ? `${formattedTime} fast` : `${formattedTime} slow`;
}

export async function displayAndWait(content: string) {
  console.log(content);
  await text({
    message: "Press Enter to continue",
    initialValue: "",
    defaultValue: ":)",
  });
}

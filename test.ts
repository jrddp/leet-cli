#!/usr/bin/env bun
import { intro, outro, select } from "@clack/prompts";
import chalk from "chalk";

async function main() {
  intro(chalk.bold("Hello world!"));
  const res = await select({
    message: "Select an option:",
    options: [
      { value: "foo", label: "Foo" },
      { value: "bar", label: "Bar", hint: "This is a hint" },
    ],
  });
  outro(chalk.bold("Goodbye! " + res));
}

main().catch(console.error);

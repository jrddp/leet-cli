# leet-cli

A CLI tool to manage a given list of LeetCode problems with detailed tracking and review scheduling.

A default list of the full [Grind75](https://grind75.com/) problems list is provided.

Tracks progress, time taken, failures, and reflections.

![Usage GIF](https://github.com/jrddp/leet-cli/raw/main/images/usage.gif)

## Features

- Open next problem:

  - Provides a link to the next problem that is either incomplete or scheduled for review.
  - After completing the problem or giving up, the user will input their time taken or "fail".
  - The user will then be prompted for notes on the problem's completion/failure
  - The user will then be prompted to schedule a review of the problem.

- View progress:

  - Displays the progress to completing the problems in the list.
  - Displays average problems completed per day (since the first completion)
  - Displays average time taken for each difficulty level

- View recently completed problems:
  - Displays a list of the most recently completed problems along with their category, difficulty, completion time, notes, etc.

## Usage

- just run `leet` to start the program!

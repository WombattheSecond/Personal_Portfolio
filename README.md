# Personal Projects

This repository contains four personal software projects that I have developed across robotics, web development, game development, and machine learning. Each project was created to solve a particular problem or explore an area of technology that I am interested in.

---

## 1. FLL Tournament Leaderboard

A web-based leaderboard designed for use during a **FIRST LEGO League (FLL) robotics tournament** hosted by my school.

The system records the scores achieved by each team across their three competition runs and automatically ranks teams based on their highest-scoring run. It provides organisers with a centralised way to enter, track, and compare scores throughout the tournament, removing the need to manually calculate rankings.

The project focuses on making tournament scoring faster, more reliable, and easier for organisers to manage.

**Key features:**

* Team registration and management
* Recording scores for three runs per team
* Automatic ranking based on each team's highest score
* Live updating of standings
* Designed for use across a school network during a tournament

---

## 2. FLL Robotics Schedule Generator

A scheduling application designed to simplify the process of creating match schedules for an **FLL robotics tournament**.

The application takes a CSV file containing the participating teams, their team numbers and names, along with the number of competition tables and tournament start time. It then generates a complete competition schedule automatically.

Rather than requiring organisers to manually assign teams to every time slot, the program evaluates **500 possible schedules** and selects the best one based on factors such as the amount of rest time between matches. It also ensures that a team cannot be assigned to multiple tables within the same time slot.

This project was created to make tournament organisation significantly faster and reduce scheduling conflicts.

**Key features:**

* CSV-based team input
* Configurable number of competition tables
* Configurable tournament start time
* Automatic time-slot and table allocation
* Checks for teams being scheduled more than once in a time slot
* Evaluates 500 possible schedules to find a strong arrangement
* Optimises rest time between matches

---

## 3. Soccer Management Game

A browser-based soccer management simulation inspired by real-world European football.

The goal of the project was to create a simplified but comprehensive soccer management experience where the player controls the major aspects of running a football club. The game incorporates tactical decisions, player roles, transfers, youth development, coaching, and managerial progression.

Players can build and adjust their squad, sign and sell players, develop their youth academy, improve their coaching department, select tactical systems, and manage their team throughout a career.

The game is currently deployed as a **GitHub Pages** web application.

**Key features:**

* Club and squad management
* Player transfers and sales
* Tactical systems and individual player roles
* Youth academy development
* Coaching department development
* Match simulation
* League competition and progression
* Manager career progression

The project is still being refined, particularly its match presentation and some aspects of match and managerial logic.

The project can be found here: https://shadow-blade789.github.io/Premier-League-Touchline-Manager/

---

## 4. Fantasy Premier League Prediction Neural Network

A machine learning project focused on predicting **Fantasy Premier League (FPL) points per game week** for individual players.

The project uses historical FPL data to train a neural network to identify patterns in player performance and predict future fantasy points. The current approach uses five seasons of historical data for training, with the most recent season being used for testing before applying the model to the current season.

The project is being developed using **PyTorch and NumPy**, with particular attention being given to the challenges involved in modelling real-world football data.

One of the major challenges is accounting for player availability and playing time. A player who does not play, or only plays part of a match, can produce very different results from a player who plays the full match. Future development will therefore involve predicting whether a player will play and approximately how much playing time they will receive.

Another area of development is handling the irregular scheduling of Premier League fixtures. The model needs to account for postponed and rescheduled matches so that predictions are associated with the actual date a match is expected to be played rather than simply assuming every team plays once in every game week.

This is currently the least complete of the four projects and is the project I am actively developing.

**Current technologies:**

* Python
* PyTorch
* NumPy
* Historical Fantasy Premier League datasets
* Neural network / machine learning techniques

**Current development goals:**

* Improve handling of players who do not play
* Predict player availability and expected playing time
* Improve the model's treatment of postponed and rescheduled fixtures
* Complete training and testing of the neural network
* Evaluate predictions against the current FPL season

---

## Project Overview

| Project                         | Area                    | Main Purpose                                 |
| ------------------------------- | ----------------------- | -------------------------------------------- |
| FLL Tournament Leaderboard      | Web Development         | Track and rank robotics tournament scores    |
| FLL Robotics Schedule Generator | Algorithms / Automation | Automatically generate competition schedules |
| Soccer Management Game          | Game Development        | Simulate managing a European football club   |
| FPL Prediction Neural Network   | Machine Learning        | Predict Fantasy Premier League player points |

These projects represent my work across **software development, automation, algorithms, game development, data analysis, and machine learning**, with each project involving a different technical challenge and approach.

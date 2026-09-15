# FLL Tournament Scoreboard

The FLL Tournament Scoreboard is a web-based scoring and leaderboard system that I developed for a **FIRST LEGO League (FLL) robotics tournament** hosted by my school.

I created this project to provide organisers with a simple way to record and track the scores of teams throughout the competition. Instead of manually calculating rankings after every run, scores can be entered into the system and the leaderboard automatically updates to show the current standings.

The system is designed to be used across the school's network during the tournament, allowing the scoreboard to be accessed from different devices.

## What It Does

The scoreboard records the results of each team's three competition runs and automatically determines their position on the leaderboard.

For each team, the system keeps track of:

* Team number
* Team name
* Check-in status
* Score from each of the three runs
* Highest score achieved
* Current ranking

The leaderboard ranks teams according to their **highest-scoring run**, allowing the standings to update automatically as teams complete their runs.

## Tournament Management

The system also includes basic tournament management features to allow organisers to configure the competition.

Organisers can manage information such as:

* Tournament name
* Season
* Venue
* Number of competition tables
* Tournament status
* Participating teams

Teams can also be checked in and managed through the system before and during the competition.

## How It Works

The scoreboard uses a client-server architecture so that multiple devices can interact with the same competition data.

The general process is:

1. Set up the tournament information.
2. Add the participating teams.
3. Check teams in as they arrive.
4. Enter each team's score after their runs.
5. The system records the result.
6. The team's highest score is automatically determined.
7. The leaderboard is recalculated and displayed.
8. Organisers can continue entering results as the tournament progresses.

Because the scores are stored centrally, the leaderboard can be accessed and updated from multiple devices connected to the same network.

## Technologies

The project uses:

* **Node.js**
* **Express**
* **Socket.IO**
* **SQLite**
* **JavaScript**
* **HTML/CSS**

Socket.IO is used to allow changes to the scoreboard to be communicated between connected devices, while SQLite provides persistent storage for the tournament data.

## Why I Made It

I made this project to solve a practical problem with running a robotics tournament.

During an FLL competition, teams complete multiple runs and their scores need to be recorded and compared throughout the event. Manually maintaining a leaderboard can become difficult as more teams complete their runs.

By creating a dedicated scoreboard, the process of entering results and determining rankings can be automated. This reduces the amount of manual work required by organisers and provides a clearer way for the current standings to be displayed.

## Current State

The scoreboard is currently functional and is being developed for use during the FLL tournament hosted by my school.

The core system for managing teams, recording three runs and automatically ranking teams based on their highest score is complete.

The project may continue to be refined as it is used in a real tournament, particularly based on how organisers interact with the system and any issues that are identified during testing.

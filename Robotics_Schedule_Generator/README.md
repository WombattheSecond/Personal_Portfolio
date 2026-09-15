# FLL Robotics Schedule Generator

The FLL Robotics Schedule Generator is a program that I developed to automatically create match schedules for a **FIRST LEGO League (FLL) robotics tournament**.

I made this project to help simplify the organisation of an FLL competition. Creating a schedule manually can take a significant amount of time, especially when there are a large number of teams and multiple competition tables. The program automates this process and searches for a schedule that gives teams a reasonable amount of rest between their matches while avoiding scheduling conflicts.

The program will be used to help organise a robotics tournament hosted by my school.

## What It Does

The program takes information about the competition and participating teams and automatically produces a complete schedule.

The input includes:

* A CSV file containing the participating teams
* Team numbers
* Team names
* Number of competition tables
* Tournament start time

From this information, the program determines which teams should compete at each table during each time slot.

The result is a complete schedule showing **which teams are competing, when they are competing, and which table they are assigned to**.

## Schedule Generation

The scheduling system uses **Google OR-Tools** to solve the scheduling problem and find suitable team allocations.

The program generates and evaluates **500 different possible schedules**, looking for an arrangement that satisfies the competition's constraints while providing good rest periods for teams.

Each schedule is checked to make sure that:

* A team is not assigned to multiple tables during the same time slot
* Teams are distributed across the available tables
* Teams receive reasonable rest periods between matches
* The schedule fits within the available competition times

The schedules are then compared and the best option is selected based on the scheduling criteria.

Using OR-Tools allows the project to handle the large number of possible combinations involved in creating a tournament schedule while ensuring that the required constraints are satisfied.

## Why I Made It

I made this project because tournament scheduling is a problem that is well suited to automation.

With multiple teams competing across multiple tables, changing one team's position can affect the rest of the schedule. Doing this manually makes it easy to create conflicts or give some teams significantly less rest than others.

By having a program generate and compare schedules automatically, the process becomes much faster and reduces the possibility of human error.

## How It Works

The project is written in **Python** and is separated into components for reading the input data and generating the schedule.

The general process is:

1. Read the team information from the CSV file.
2. Validate the competition information and available tables.
3. Use OR-Tools to generate valid schedule arrangements.
4. Check the generated schedules for conflicts.
5. Evaluate each schedule based on factors such as team rest time.
6. Compare the 500 generated schedules.
7. Select the best schedule.
8. Display the final competition schedule.

## Technologies

The project uses:

* **Python**
* **Google OR-Tools**
* **CSV data**
* Constraint-solving and scheduling techniques

The project is primarily focused on using programming and optimisation to solve a practical organisational problem rather than requiring tournament organisers to manually create the schedule.

## Current State

The schedule generator is currently functional and is designed to be used for the FLL tournament hosted by my school.

The main scheduling system is complete, with the program able to take the tournament information, generate possible schedules, evaluate them, and produce a final schedule for the organisers to use.

I will continue refining the project as it is used in practice and identifying any improvements that could make the scheduling process even more efficient.

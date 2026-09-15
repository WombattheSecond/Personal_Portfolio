# Fantasy Premier League Prediction Neural Network

This is a machine learning project I am currently developing to try to predict the **Fantasy Premier League (FPL) points that each player will score in a given gameweek**.

The goal is to build a neural network that can use historical player and gameweek data to identify patterns in performance and then use those patterns to make predictions about future FPL points.

This is currently the least complete of my four projects, but it is also the one I am actively working on and developing further.

## What I Am Trying to Build

The main goal of the project is to predict how many FPL points a player is likely to score in a future gameweek.

I am using historical FPL data to train the model and then testing it against a season that the model has not been trained on.

My current plan is to use **five seasons of historical data to train the model**, then use the following season to test how well it performs. Once the model is working reliably, I want to use it to make predictions for the current FPL season.

## Data

The data I am using comes from the **[vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)** GitHub repository.

The dataset contains historical FPL player information as well as gameweek-specific statistics. This gives me the information needed to examine how player performance changes from one gameweek to another.

I am currently using the historical data to experiment with how the information should be structured and which variables are useful for the model.

## Current Development

At the moment, I am working primarily in **Jupyter Notebooks** while I experiment with the data and develop the model.

This allows me to test different approaches to:

* Cleaning and preparing the data
* Splitting training and testing data
* Selecting useful features
* Structuring the input data
* Training the neural network
* Evaluating the predictions
* Identifying problems with the dataset

Once these approaches are working correctly, I plan to move the finished components into the main project structure.

## Neural Network

I plan to build the prediction model using **PyTorch**.

The network will take information about a player and their previous performance and attempt to predict their expected FPL points for a future gameweek.

I am also using **NumPy** for numerical processing and working with the data before it is passed into the model.

The exact structure of the neural network is still being developed, as I want to experiment with the data first rather than committing to a particular model architecture too early.

## Challenges

One of the biggest challenges with this project is that a player's FPL score does not necessarily represent how well they would have performed if they had played a full match.

Players can:

* Not play at all
* Start on the bench
* Be substituted on
* Be substituted off
* Miss matches through injury or suspension
* Have different amounts of playing time from week to week

At the moment, the model does not properly account for all of these factors. One of my goals is therefore to improve the model so that it can account for **whether a player is likely to play and how much playing time they are likely to receive**.

This is important because predicting a player's points without considering their expected minutes could produce misleading results.

Another challenge is dealing with the Premier League's fixture schedule. A team does not necessarily play exactly once in every FPL gameweek. Matches can be postponed and rescheduled, creating blank and double gameweeks.

I want the final system to account for the **actual dates and scheduling of fixtures**, rather than simply assuming that every team plays once per gameweek.

## Planned Development

The current development goals for the project are:

* Clean and prepare the historical FPL data
* Determine which player statistics are useful for prediction
* Build the initial PyTorch neural network
* Train the model using historical seasons
* Test the model against an unseen season
* Improve the model's handling of player availability
* Predict expected playing time
* Account for postponed and rescheduled fixtures
* Test the model against the current FPL season
* Evaluate how accurate the predictions are

## Technologies

The project is being developed using:

* **Python**
* **Jupyter Notebook**
* **PyTorch**
* **NumPy**
* **Historical Fantasy Premier League data**

The project is still under active development, so the model and data-processing methods are likely to change as I learn more about the dataset and identify better ways to approach the prediction problem.

## Current State

This project is currently in the **early development stage**.

I have obtained the historical data I want to use and am currently working through the process of understanding, cleaning and preparing it before building the final neural network.

The main focus at the moment is making sure the data is structured correctly and that the model is being trained and tested in a way that produces meaningful results.

The eventual goal is to have a model capable of making FPL player-point predictions for upcoming gameweeks and then compare those predictions against the actual results throughout the season.

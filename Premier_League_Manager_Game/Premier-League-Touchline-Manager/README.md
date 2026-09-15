# PLFC Touchline Manager

PLFC Touchline Manager is a browser-based football management game that I developed from scratch. The aim of the project was to create a simplified version of a real football management game, while still including as many realistic systems as I could.

The game is based around European football, with the current version including the **English and Spanish football leagues**. The player takes control of a club and manages its squad, tactics, transfers, staff, youth academy and matches throughout a career.

## Play the Game

The game is currently live and playable through GitHub Pages:

**https://shadow-blade789.github.io/Premier-League-Touchline-Manager/**

The game runs entirely in the browser using HTML, CSS and JavaScript, with career saves and game data stored locally.

## What I Built

The game includes a number of different systems that work together to create a full football management experience.

### Club & Squad Management

Players can take control of a club and manage their squad throughout multiple seasons. This includes:

* Selecting a starting XI and substitutes
* Choosing formations and tactics
* Assigning individual player roles
* Buying and selling players
* Managing squad depth
* Developing players over time
* Managing player careers and statistics

### Transfers

The transfer system allows players to buy players from a shared transfer market and sell players to other clubs.

Instead of players being sold instantly, rival clubs can make offers for players during transfer windows. Players can also be placed on the transfer list to attract more interest.

AI clubs also make transfers between themselves, meaning the football world changes over time rather than remaining static.

### Tactics & Matches

Matches are simulated using the player's squad, tactics and individual player roles.

The main match system generates a minute-by-minute timeline containing events such as:

* Goals
* Chances
* Cards
* Substitutions
* Half-time and full-time events

The match can then be watched at different speeds, with a live commentary system and momentum indicator.

### Leagues & Promotion/Relegation

The game currently includes six divisions across England and Spain:

**England**

* Premier League
* Championship
* League One
* League Two

**Spain**

* La Liga
* Segunda División

Each league has its own fixtures, league table, statistics, promotion and relegation system.

Careers can progress through the different divisions, allowing a club to be promoted or relegated while continuing the same career.

### Domestic & European Competitions

The game also includes several cup and European competitions.

These currently include:

* FA Cup
* Carabao Cup
* Vertu Trophy
* Community Shield
* Copa del Rey
* Supercopa de España
* Champions League
* Europa League
* Conference League

European competitions use a 36-team league phase followed by knockout rounds.

### Coaching & Youth Academy

I also wanted the game to have more depth than simply buying and selling players.

Clubs can hire and improve coaching staff, with coaching quality affecting player development.

There is also a youth academy where scouts find young prospects and youth coaches develop them over time. Players can eventually graduate from the academy and join the senior squad.

### Player Development

Players develop throughout their careers based on their age, ability, performances and the quality of their club's coaching staff.

This also applies to AI-controlled clubs, meaning rival teams can improve or decline between seasons.

Club reputations can also change depending on their performances. This allows smaller clubs to grow into stronger teams while previously successful clubs can decline.

### Statistics & Awards

Player statistics are tracked throughout the season, including:

* Goals
* Assists
* Appearances
* Clean sheets
* Saves

The game also includes season awards such as the Golden Boot, Playmaker, Best Defender, Golden Glove and Shot Stopper.

Player career statistics continue across multiple seasons.

## How It Was Built

The game is built using:

* **HTML**
* **CSS**
* **JavaScript**
* **LocalStorage**
* **GitHub Pages**

It does not require a server or build process. The game runs entirely client-side.

The code is separated into different JavaScript files for the major systems, including the match engine, league system, transfers, player development, coaching, academy, cups and European competitions.

## Current State

The game is currently playable and has most of the major management systems I wanted to implement.

There are still some areas I want to improve. The biggest of these is the visual presentation of the match screen, as I want matches to feel more polished and engaging to watch. There are also a few smaller logic issues, particularly around penalties, as well as some further improvements I want to make to the manager market and changing clubs during a career.

Despite these remaining improvements, the core game is fully playable and the majority of the systems work together as intended.

I am continuing to develop the project and add improvements as I find areas that can be made more realistic or enjoyable.

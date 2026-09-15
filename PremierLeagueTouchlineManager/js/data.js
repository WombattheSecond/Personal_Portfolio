/* =========================================================================
   PLFC TOUCHLINE MANAGER — DATA
   Club & player data for the 2026/27 Premier League season.
   Rosters are approximate first-team groups as of mid-2026 and are meant
   for gameplay, not a live transfer database — names will drift out of
   date as real windows open. Swap CLUBS below to keep it current.
   ========================================================================= */

   let _pid = 1;

   // Realistic "par" weekly wage in £k, calibrated to real 2025/26 top-flight
   // pay: an 84-rated 33-year-old (≈ Emiliano Martínez) lands on ~£150k/wk, a
   // 91 on ~£370k, a 70 on ~£34k, a 60 on ~£5k. This is the ENGLISH TOP-FLIGHT
   // reference; Contracts.wageFactor scales it down by league/country economy so
   // minor leagues pay far less. Only depends on rating + age so it stays
   // current as players develop.
   function parWage(rating, age) {
     const rf = Math.max(1, rating - 50);
     let w = 0.0083 * Math.pow(rf, 2.78);
     if (rating >= 86) w *= 1 + (rating - 86) * 0.09; // superstar premium at the very top
     const am = age < 20 ? 0.5 : age < 23 ? 0.72 : age < 34 ? 1.0 : age < 37 ? 0.9 : 0.78;
     return Math.max(1, Math.round(w * am));
   }

   // Market value (£m) from rating + age. Value peaks in a player's early-mid
   // 20s and falls away sharply through their 30s — a 33-year-old is worth a
   // fraction of the same player at peak, a 36+ veteran very little. Shared by
   // P(), seasonal ageing and the scout watchlist.
   function ageValueMult(age) {
     return age <= 21 ? 1.35 :   // teens / high-potential youth
            age <= 24 ? 1.2  :   // rising into prime
            age <= 27 ? 1.0  :   // peak years
            age <= 29 ? 0.8  :
            age <= 30 ? 0.65 :
            age <= 31 ? 0.5  :
            age <= 32 ? 0.4  :
            age <= 33 ? 0.3  :
            age <= 34 ? 0.22 :
            age <= 35 ? 0.16 :
            age <= 36 ? 0.11 : 0.07; // 37+ — nominal resale value
   }
   function parValue(rating, age) {
     const rf = Math.max(0, rating - 55);
     return Math.max(0.3, Math.round(Math.pow(rf, 1.7) * ageValueMult(age) * 0.16 * 10) / 10);
   }

   function growthRoom(age) {
     if (age <= 20) return 10 + Math.round(Math.random() * 8);   // +10..18
     if (age <= 23) return 5 + Math.round(Math.random() * 5);    // +5..10
     if (age <= 26) return 1 + Math.round(Math.random() * 4);    // +1..5
     if (age <= 29) return Math.round(Math.random() * 2);        // +0..2
     return 0;
   }
   // Every player carries a lifetime record. Since we have no real historical
   // data, seed it from rating + age + position so a 30-year-old star looks
   // like one (hundreds of apps, plenty of output) and a teenager barely
   // features yet. In-game appearances then accumulate on top of this.
   function estimateCareer(rating, age, pos) {
     const seasons = Math.max(0, Math.min(17, age - 18));
     const appsPerSeason = Math.max(6, Math.min(40, 12 + (rating - 50) * 0.65));
     const apps = Math.round(seasons * appsPerSeason * (0.8 + Math.random() * 0.4));
     const q = Math.max(0.1, Math.min(1.2, (rating - 50) / 40));
     const gpg = ({ FW: 0.42, MF: 0.18, DF: 0.05, GK: 0 })[pos] || 0;
     const apg = ({ FW: 0.15, MF: 0.30, DF: 0.08, GK: 0 })[pos] || 0;
     const csg = ({ GK: 0.30, DF: 0.28, MF: 0, FW: 0 })[pos] || 0;
     const svg = ({ GK: 2.6, DF: 0, MF: 0, FW: 0 })[pos] || 0;
     return {
       apps,
       goals: Math.round(apps * gpg * q),
       assists: Math.round(apps * apg * q),
       cleanSheets: Math.round(apps * csg),
       saves: Math.round(apps * svg * (0.7 + q * 0.3)),
     };
   }

   function P(name, pos, age, rating, opts = {}) {
     const id = "p" + (_pid++);
     const rf = Math.max(0, rating - 55);
     const ageMult =
       age < 21 ? 1.35 :
       age < 24 ? 1.2 :
       age < 29 ? 1.0 :
       age < 32 ? 0.7 :
       age < 35 ? 0.45 : 0.25;
     const value = parValue(rating, age);
     const wage = parWage(rating, age); // top-flight par; scaled by league in Contracts.effWage
   
     let potential = Math.min(96, rating + growthRoom(age));
     let wonderkid = false;
     if (age <= 21 && Math.random() < 0.08) {
       potential = Math.min(97, potential + 7 + Math.round(Math.random() * 8));
       wonderkid = true;
     }
     if (opts.potential != null) potential = opts.potential;
     if (opts.wonderkid != null) wonderkid = opts.wonderkid;
   
     return {
       id, name, pos, age, rating,
       potential, wonderkid,
       nat: opts.nat || "ENG",
       value, wage,
       morale: 70 + Math.round(Math.random() * 15),
       fitness: 100,
       form: 0,
       club: null,
       stats: { goals: 0, assists: 0, cleanSheets: 0, saves: 0, apps: 0 },
       bonus: { goal: 0, assist: 0, keeper: 0, defense: 0 },
       career: estimateCareer(rating, age, pos),
     };
   }
   
   // Nationality-flavoured name pools, weighted roughly like a real Premier
   // League squad sheet, used for generated free agents, academy fillers and
   // transfer-market youth prospects.
   const NATION_POOLS = {
     ENG: { first: ["Jack","Tom","Harry","Luke","Sam","Josh","Connor","Liam","Ryan","Callum","Marcus","Lewis","Owen","Ethan","Mason","Jamie","Aaron","Kyle","Reece","Bradley","Theo","Charlie","Dylan","Ben","Will","Adam","Joe","Max","Nathan","Dan","Alfie","Archie","George","Oliver","Freddie","Louie","Harvey","Riley","Toby","Jude","Rory","Elliot","Isaac","Oscar","Leo","Finley","Cole","Sonny","Kai","Jenson","Bailey","Corey","Ashton","Declan","Morgan","Regan","Tyler","Frankie","Rhys","Spencer"],
               last:  ["Walker","Hughes","Foster","Bennett","Sutton","Marshall","Hayes","Pearce","Russell","Bishop","Carter","Wells","Holloway","Mercer","Doyle","Kerr","Fletcher","Lowe","Whitfield","Sharpe","Donnelly","Bartley","Quinn","Hartley","Stokes","Vine","Crouch","Dunne","Mabey","Sinclair","Barker","Hammond","Prescott","Rowe","Cross","Rhodes","Ashworth","Baldwin","Pemberton","Yates","Osborne","Trott","Ainsworth","Rutherford","Sowerby","Hedges","Colville","Napier","Merrick","Radford","Ellison","Cavendish","Beckett","Slater","Whitmore","Tomlinson","Grimshaw","Hardcastle","Collier","Fairbanks"] },
     IRL: { first: ["Conor","Aidan","Sean","Cian","Darragh","Eoin","Liam","Cormac","Oisin","Fionn","Ronan","Padraig","Niall","Callum","Rian","Tadhg","Dara","Cathal","Killian","Senan"], last: ["Brennan","Kelly","Doyle","Walsh","Byrne","McGrath","Hogan","Nolan","Kavanagh","Murphy","O'Sullivan","Gallagher","Fitzgerald","Boyle","Donovan","Clarke","Reilly","Whelan","Fahey","Sheridan"] },
     FRA: { first: ["Hugo","Mathis","Lucas","Théo","Enzo","Yanis","Noah","Rayan","Nathan","Ethan","Léo","Adam","Gabriel","Jules","Louis","Raphaël","Sacha","Malo","Timéo","Aaron","Clément","Antoine","Maxime","Baptiste","Corentin"], last: ["Moreau","Lemaire","Girard","Caron","Rousseau","Fontaine","Bertrand","Lemoine","Dubois","Laurent","Garnier","Chevalier","Renard","Marchand","Perrot","Guillet","Da Silva","Barbier","Colin","Roussel","Muller","Faure","Blanchard","Leclerc","Vasseur"] },
     BRA: { first: ["Gabriel","Lucas","Matheus","Bruno","Rafael","Caio","Wesley","Igor","João","Pedro","Felipe","Vinícius","Guilherme","Enzo","Murilo","Kaique","Yuri","Éverton","Léo","Danilo","Gustavo","Thiago","Bernardo","Arthur"], last: ["Souza","Oliveira","Pereira","Costa","Almeida","Barbosa","Ribeiro","Fernandes","Santos","Rodrigues","Carvalho","Gomes","Martins","Araújo","Cardoso","Nascimento","Moreira","Teixeira","Correia","Pinho","Vieira","Rocha","Batista","Freitas"] },
     ESP: { first: ["Marc","Pol","Iker","Álvaro","Hugo","Mateo","Nico","Sergio","Pablo","Adrián","Javier","Diego","Rubén","Aitor","Iván","Gonzalo","Bryan","Óscar","Unai","Carlos","Manuel","Fran","Dani","Rodri"], last: ["Serrano","Navarro","Cano","Vidal","Marín","Castro","Soler","Reyes","García","Fernández","Martínez","Sánchez","Romero","Torres","Ramos","Ortega","Molina","Herrera","Gallardo","Blanco","Iglesias","Ferrer","Campos","Peña"] },
     NED: { first: ["Daan","Sem","Luuk","Bram","Finn","Milan","Noud","Stijn","Jesse","Sven","Thijs","Ruben","Julian","Lars","Teun","Cas","Gijs","Mees","Bas","Joris","Koen","Tim","Rick","Niek"], last: ["Visser","Bakker","Janssen","Smit","De Boer","Mulder","Dekker","Hendriks","De Jong","Van Dijk","Bos","Vermeulen","Van der Berg","Meijer","Kramer","Timmermans","Willemsen","Groot","Koning","Schouten","Brouwer","Peters","Kuijpers","Van Dam"] },
     NGA: { first: ["Chidi","Emeka","Tunde","Femi","Segun","Uche","Bayo","Ifeanyi","Obi","Chinedu","Kelechi","Samuel","Musa","David","Ola","Kingsley","Ebuka","Nnamdi","Sadiq","Taiwo","Kenneth","Victor","Chibuzo","Yusuf"], last: ["Okafor","Adeyemi","Okoro","Eze","Balogun","Nwosu","Olawale","Chukwu","Adebayo","Obi","Okonkwo","Ibrahim","Nwankwo","Bello","Uche","Aliyu","Osei","Ogundele","Afolabi","Onyeka","Madu","Ezenwa","Ojo","Chukwuma"] },
     ARG: { first: ["Joaquín","Santiago","Tomás","Agustín","Nicolás","Lautaro","Mateo","Bautista","Thiago","Benjamín","Franco","Facundo","Valentín","Julián","Máximo","Gino","Lucas","Emiliano","Ignacio","Ramiro","Bruno","Alan","Enzo","Gastón"], last: ["Acosta","Romero","Cabrera","Ferreyra","Aguirre","Ledesma","Quiroga","Sosa","González","Gómez","Fernández","Ruiz","Domínguez","Ojeda","Molina","Paredes","Godoy","Vera","Ibáñez","Rojas","Cáceres","Bustos","Correa","Luna"] },
     GER: { first: ["Finn","Luca","Jonas","Elias","Niklas","Tim","Leon","Maximilian","Ben","Paul","Felix","Moritz","Julian","Lukas","Noah","Emil","Anton","Jannik","Fabian","Tom","Henry","David","Erik","Marlon"], last: ["Wagner","Becker","Hoffmann","Schreiber","Krüger","Lang","Vogel","Brandt","Schmidt","Fischer","Weber","Meyer","Schulz","Richter","Klein","Wolf","Neumann","Schwarz","Zimmermann","Braun","Krause","Hartmann","Werner","Köhler"] },
     POR: { first: ["Rui","Tiago","Gonçalo","Diogo","Bernardo","André","Vasco","Nuno","Miguel","Rodrigo","Afonso","Tomás","Duarte","Guilherme","Martim","Salvador","Francisco","Henrique","Rafael","João","Gabriel","Dinis","Simão","Leandro"], last: ["Carvalho","Pinto","Teixeira","Cardoso","Lopes","Mendes","Faria","Esteves","Silva","Santos","Ferreira","Costa","Rodrigues","Sousa","Fonseca","Machado","Nunes","Antunes","Ramos","Baptista","Moura","Tavares","Correia","Cunha"] },
     NOR: { first: ["Erik","Magnus","Sander","Jonas","Kristian","Markus","Henrik","Oskar","Elias","Emil","Mathias","Håkon","Jakob","Tobias","Sondre","Aksel","Filip","Nikolai","Even","Andreas","Martin","Kasper","Ludvig","Herman"], last: ["Haugen","Berg","Larsen","Solberg","Andersen","Strand","Nilsen","Kristiansen","Hansen","Johansen","Olsen","Pedersen","Bakken","Moen","Lie","Dahl","Halvorsen","Iversen","Rønning","Eriksen","Fossum","Sæther","Aas","Ødegaard"] },
     SEN: { first: ["Mamadou","Ibrahima","Cheikh","Pape","Ousmane","Lamine","Abdou","Moussa","Idrissa","Aliou","Sadio","Boubacar","Modou","Assane","Serigne","Babacar","Alassane","Malick","Habib","Souleymane"], last: ["Diallo","Ndiaye","Cissé","Faye","Diop","Sow","Toure","Mbaye","Gueye","Sarr","Ba","Fall","Camara","Seck","Niang","Diouf","Sane","Coly","Badji","Thiam"] },
     JPN: { first: ["Ren","Sota","Haruto","Yuto","Kaito","Riku","Sho","Hayato","Takumi","Sora","Yuki","Daiki","Kenta","Ryo","Hiroto","Kota","Yamato","Shota","Rikuto","Tatsuya"], last: ["Saito","Suzuki","Takahashi","Kobayashi","Yamamoto","Watanabe","Nakamura","Ito","Tanaka","Sato","Kato","Yoshida","Yamada","Sasaki","Matsumoto","Inoue","Kimura","Hayashi","Shimizu","Mori"] },
     USA: { first: ["Tyler","Jackson","Cole","Bryce","Mason","Dylan","Cameron","Hunter","Landon","Caleb","Chase","Brady","Colton","Weston","Gavin","Blake","Trevor","Preston","Cade","Nolan","Grant","Zach","Brayden","Easton"], last: ["Brooks","Reilly","Walsh","Anderson","Carter","Howard","Miller","Davis","Wilson","Robinson","Ramirez","Sullivan","Meyer","Coleman","Hoffman","Jennings","Bradley","Marsh","Delgado","Schneider","Kowalski","Vega","Boone","Hale"] },
     COL: { first: ["Santiago","Andrés","Camilo","Esteban","Mateo","Juan","Sebastián","Cristian","Nicolás","Samuel","Emmanuel","Jhon","Miguel","Daniel","David","Kevin","Brayan","Óscar","Steven","Yerson","Carlos","Julián","Fabián","Deiver"], last: ["Quintero","Salazar","Restrepo","Mosquera","Valencia","Cuesta","Hinestroza","Mina","Ramírez","Cardona","Arias","Zapata","Muñoz","Palacios","Rentería","Córdoba","Bolaños","Guerrero","Ospina","Vergara","Angulo","Caicedo","Lozano","Tapias"] },
     HRV: { first: ["Luka","Marko","Ivan","Petar","Josip","Filip","Ante","Karlo","Mateo","Nikola","Toma","Bruno","Roko","David","Lovro","Šime","Fran","Borna","Duje","Marin"], last: ["Horvat","Kovačić","Babić","Vuković","Jurić","Marić","Pavić","Knežević","Marković","Petrović","Novak","Kovačević","Matić","Perić","Radić","Blažević","Jukić","Tomić","Grgić","Šarić"] },
     ITA: { first: ["Lorenzo","Marco","Andrea","Matteo","Francesco","Alessandro","Giovanni","Federico","Davide","Simone","Luca","Riccardo","Gabriele","Nicolò","Tommaso","Edoardo","Filippo","Leonardo","Antonio","Stefano","Emanuele","Christian","Michele","Samuele"], last: ["Rossi","Russo","Ferrari","Esposito","Bianchi","Romano","Colombo","Ricci","Marino","Greco","Bruno","Gallo","Conti","De Luca","Mancini","Costa","Giordano","Rizzo","Lombardi","Moretti","Barbieri","Fontana","Santoro","Mariani"] },
     POL: { first: ["Kacper","Jakub","Szymon","Mateusz","Filip","Bartosz","Wojciech","Piotr","Kamil","Michał","Antoni","Franciszek","Aleksander","Nikodem","Wiktor","Ignacy","Oliwier","Tymon","Adam","Marcel"], last: ["Nowak","Kowalski","Wiśniewski","Wójcik","Kowalczyk","Kamiński","Zieliński","Szymański","Woźniak","Mazur","Krawczyk","Piotrowski","Grabowski","Pawłowski","Michalski","Nowakowski","Jankowski","Wojciechowski","Kwiatkowski","Kaczmarek"] },
     TUR: { first: ["Emre","Mert","Burak","Yusuf","Arda","Kaan","Cenk","Ozan","Berkay","Efe","Kerem","Baran","Eren","Umut","Tolga","Hakan","Yiğit","Deniz","Onur","Bora"], last: ["Yılmaz","Kaya","Demir","Şahin","Çelik","Yıldız","Yıldırım","Öztürk","Aydın","Arslan","Doğan","Kılıç","Aslan","Çetin","Şimşek","Koç","Kurt","Özdemir","Erdoğan","Polat"] },
     BEL: { first: ["Lars","Wout","Jonas","Senne","Milan","Lucas","Aaron","Vic","Simon","Arne","Robbe","Lander","Stan","Tuur","Warre","Mauro","Kobe","Vince","Jef","Nand"], last: ["Peeters","Janssens","Maes","Jacobs","Willems","Claes","Wouters","De Smet","Dupont","Michiels","Mertens","Goossens","Van Damme","Verhoeven","De Clercq","Lambert","Vandenberghe","Segers","Coppens","De Backer"] },
     AUT: { first: ["Lukas","David","Julian","Marcel","Florian","Stefan","Manuel","Fabian","Simon","Andreas","Tobias","Alexander","Dominik","Sebastian","Philipp","Matthias","Elias","Michael","Raphael","Jakob"], last: ["Gruber","Bauer","Pichler","Steiner","Moser","Mayer","Berger","Hofer","Leitner","Wimmer","Huber","Wagner","Maier","Fuchs","Weber","Winkler","Reiter","Aigner","Egger","Lehner"] },
     DEN: { first: ["Mikkel","Frederik","Mathias","Emil","Oliver","Magnus","Victor","Rasmus","Anton","Malte","William","Noah","Oscar","Carl","August","Alfred","Villads","Elias","Storm","Lucas"], last: ["Nielsen","Jensen","Hansen","Pedersen","Andersen","Christensen","Larsen","Sørensen","Rasmussen","Madsen","Kristensen","Olsen","Thomsen","Poulsen","Johansen","Møller","Mortensen","Jørgensen","Knudsen","Holm"] },
     GRE: { first: ["Giorgos","Dimitris","Kostas","Nikos","Panagiotis","Vasilis","Christos","Andreas","Thanasis","Stelios","Yannis","Alexandros","Michalis","Petros","Manolis","Antonis","Spyros","Fotis","Lefteris","Nikolas"], last: ["Papadopoulos","Nikolaou","Georgiou","Vasileiou","Pappas","Makris","Oikonomou","Ioannidis","Alexiou","Katsaros","Papadakis","Antoniou","Christou","Dimitriou","Karagiannis","Samaras","Vlachos","Angelopoulos","Panagiotou","Manolas"] },
     SUI: { first: ["Noah","Luca","Leon","Nico","Elias","Dario","Sven","Loris","Jan","Fabio","Timo","Joel","Levin","Nevio","Andrin","Gian","Robin","Kilian","Yanick","Sandro"], last: ["Meier","Schmid","Keller","Widmer","Zbinden","Brunner","Baumann","Frei","Kobel","Vargas","Steffen","Fässler","Graf","Zürcher","Bühler","Kaufmann","Roth","Gerber","Wyss","Hodel"] },
     HUN: { first: ["Bence","Máté","Levente","Dániel","Ádám","Balázs","Gergő","Zsombor","Dávid","Márton","Botond","Dominik","Milán","Barnabás","Zalán","Kristóf","Nándor","Áron","Bálint","Csanád"], last: ["Nagy","Kovács","Tóth","Szabó","Horváth","Varga","Kiss","Molnár","Németh","Farkas","Balogh","Papp","Takács","Juhász","Lakatos","Mészáros","Oláh","Simon","Fekete","Szalai"] },
     SCO: { first: ["Callum","Ryan","Lewis","Jack","Kieran","Scott","Aiden","Finlay","Cameron","Kyle","Rory","Angus","Fraser","Euan","Struan","Hamish","Lachlan","Corey","Dougie","Alistair","Blair","Ruaridh","Innes","Craig","Grant","Iain","Murray","Stuart","Greig","Duncan","Ross","Connor","Liam","Jamie","Dean","Cole","Nathan","Regan","Kai","Josh"], last: ["Campbell","Stewart","Robertson","Murray","MacLeod","Fraser","Gray","Docherty","Kennedy","Wallace","MacDonald","Ferguson","Mackay","Reid","Muir","Sinclair","Cunningham","Buchanan","Boyd","Hamilton","Baxter","Ross","Munro","Crawford","Kerr","Watt","Rennie","Cochrane","Aitken","Forsyth","MacKinnon","Ogilvie","Ramsay","Bruce","Douglas","Findlay","Nairn","Sutherland","Craig","Millar"] },
     SWE: { first: ["Oscar","William","Lucas","Elias","Hugo","Axel","Viktor","Isak","Filip","Gustav","Emil","Nils","Melker","Anton","Ludvig","Albin","Wilmer","Alfred","Sixten","Vidar","Loke","Kalle","Theo","Malte"], last: ["Andersson","Johansson","Karlsson","Nilsson","Eriksson","Larsson","Olsson","Persson","Svensson","Gustafsson","Pettersson","Jonsson","Jansson","Hansson","Bengtsson","Lindberg","Lindqvist","Berg","Sandberg","Forsberg","Holm","Ström","Ekström","Wallin"] },
     CZE: { first: ["Jan","Tomáš","Jakub","Lukáš","Martin","Adam","Ondřej","Petr","David","Matěj","Vojtěch","Filip","Daniel","Marek","Šimon","Jiří","Dominik","Antonín","Štěpán","Vít"], last: ["Novák","Svoboda","Novotný","Dvořák","Černý","Procházka","Kučera","Veselý","Horák","Němec","Marek","Pospíšil","Pokorný","Hájek","Král","Jelínek","Růžička","Beneš","Fiala","Sedláček"] },
     SRB: { first: ["Nikola","Luka","Stefan","Marko","Aleksa","Filip","Miloš","Petar","Nemanja","Uroš","Lazar","Vukašin","Đorđe","Mihajlo","Andrej","Ognjen","Vasilije","Strahinja","Dušan","Mateja"], last: ["Jovanović","Petrović","Nikolić","Marković","Đorđević","Stojanović","Ilić","Pavlović","Kovačević","Popović","Stanković","Ristić","Todorović","Milošević","Simić","Lukić","Kostić","Mitrović","Đukić","Vasić"] },
     UKR: { first: ["Andriy","Oleksandr","Dmytro","Serhiy","Bohdan","Artem","Maksym","Vladyslav","Yuriy","Denys","Mykyta","Yehor","Illia","Nazar","Danylo","Kyrylo","Roman","Oleh","Volodymyr","Taras"], last: ["Shevchenko","Kovalenko","Bondarenko","Tkachenko","Kravchenko","Melnyk","Boyko","Kovalchuk","Lysenko","Marchenko","Rudenko","Kravets","Savchenko","Bondar","Tkach","Moroz","Poliakov","Koval","Petrenko","Zaitsev"] },
     ROU: { first: ["Andrei","Alexandru","Ionuț","Gabriel","Florin","Cristian","Ștefan","Denis","Rareș","Vlad","Darius","David","Antonio","Robert","Sergiu","Mihai","Cătălin","Bogdan","Răzvan","Ianis"], last: ["Popa","Ionescu","Popescu","Dumitru","Stan","Gheorghe","Matei","Constantin","Marin","Dinu","Radu","Munteanu","Stoica","Nistor","Ilie","Barbu","Tudor","Neagu","Lupu","Diaconu"] },
     SVK: { first: ["Martin","Tomáš","Lukáš","Jakub","Adam","Matúš","Filip","Peter","Michal","Dávid","Samuel","Marek","Patrik","Oliver","Šimon","Matej","Jozef","Andrej","Dominik","Timotej"], last: ["Horváth","Kováč","Varga","Tóth","Baláž","Novák","Molnár","Szabó","Lukáč","Marček","Baran","Hudák","Král","Blaško","Kollár","Šimko","Krajčí","Gajdoš","Beňo","Ďuriš"] },
   };
   const NATION_WEIGHTS = ["ENG","ENG","ENG","ENG","FRA","FRA","BRA","BRA","NED","POR","NGA","ARG","ESP","GER","IRL","SEN","HRV","NOR","JPN","USA","COL","ITA","SWE","DEN","BEL","SCO","POL","SRB"];
   // Each footballing country's primary player nationality, for home-skewed squads.
   const COUNTRY_NAT = {
     ENG: "ENG", ESP: "ESP", GER: "GER", ITA: "ITA", FRA: "FRA", POR: "POR", NED: "NED",
     POL: "POL", TUR: "TUR", BEL: "BEL", AUT: "AUT", DEN: "DEN", GRE: "GRE", SCO: "SCO",
     SUI: "SUI", CRO: "HRV", HUN: "HUN",
     CZE: "CZE", SRB: "SRB", UKR: "UKR", SWE: "SWE", NOR: "NOR", ROU: "ROU", CYP: "GRE", SVK: "SVK",
     // Batch-3 nations reuse the nearest existing name pool (others fall back to a global mix).
     SVN: "HRV", BIH: "HRV", MKD: "SRB", MNE: "SRB", BUL: "SRB", MDA: "ROU", BLR: "UKR",
     AZE: "TUR", IRL: "IRL", NIR: "IRL", WAL: "ENG", GIB: "ESP", AND: "ESP", SMR: "ITA",
     FRO: "DEN", MLT: "ITA",
   };

   // Pick a first + last from a pool, avoiding first === last (e.g. "Ross Ross").
   function nameFromPool(pool) {
     const first = pool.first[Math.floor(Math.random() * pool.first.length)];
     let last = pool.last[Math.floor(Math.random() * pool.last.length)];
     if (last === first && pool.last.length > 1) {
       let guard = 0;
       while (last === first && guard++ < 5) last = pool.last[Math.floor(Math.random() * pool.last.length)];
     }
     return first + " " + last;
   }

   function randomProspect() {
     const nat = NATION_WEIGHTS[Math.floor(Math.random() * NATION_WEIGHTS.length)];
     return { name: nameFromPool(NATION_POOLS[nat]), nat };
   }

   // A prospect skewed toward the club's own country (~65% homegrown, the rest an
   // international mix) — so a German club fields German-sounding names, etc.
   function homeProspect(country) {
     const nat = COUNTRY_NAT[country];
     const pool = nat && NATION_POOLS[nat];
     if (pool && Math.random() < 0.65) return { name: nameFromPool(pool), nat };
     return randomProspect();
   }
   
   // Position groups: GK, DF, MF, FW
   const RAW_CLUBS = [
     { id: "ars", name: "Arsenal", short: "ARS", nick: "The Gunners", city: "London", stadium: "Emirates Stadium", colors: ["#EF0107", "#FFFFFF"], tier: 5,
       squad: [
         P("David Raya", "GK", 31, 86), P("Karl Hein", "GK", 24, 67),
         P("William Saliba", "DF", 25, 88), P("Gabriel Magalhães", "DF", 28, 86), P("Jurrien Timber", "DF", 25, 84), P("Ben White", "DF", 28, 83), P("Riccardo Calafiori", "DF", 24, 82), P("Myles Lewis-Skelly", "DF", 20, 78),
         P("Declan Rice", "MF", 27, 88), P("Martin Ødegaard", "MF", 27, 87), P("Mikel Merino", "MF", 30, 80), P("Eberechi Eze", "MF", 28, 84), P("Christian Nørgaard", "MF", 31, 76),
         P("Bukayo Saka", "FW", 24, 89), P("Gabriel Martinelli", "FW", 25, 82), P("Kai Havertz", "FW", 27, 83), P("Viktor Gyökeres", "FW", 28, 86), P("Leandro Trossard", "FW", 31, 80),
       ]},
     { id: "mci", name: "Manchester City", short: "MCI", nick: "Citizens", city: "Manchester", stadium: "Etihad Stadium", colors: ["#6CABDD", "#1C2C5B"], tier: 5,
       squad: [
         P("Ederson", "GK", 32, 85), P("Stefan Ortega", "GK", 33, 76),
         P("Rúben Dias", "DF", 29, 87), P("John Stones", "DF", 32, 81), P("Joško Gvardiol", "DF", 24, 85), P("Nathan Aké", "DF", 31, 79), P("Abdukodir Khusanov", "DF", 22, 78),
         P("Rodri", "MF", 30, 89), P("İlkay Gündoğan", "MF", 35, 80), P("Bernardo Silva", "MF", 31, 86), P("Phil Foden", "MF", 26, 87), P("Mateo Kovačić", "MF", 32, 77),
         P("Erling Haaland", "FW", 26, 91), P("Jérémy Doku", "FW", 24, 84), P("Savinho", "FW", 22, 81), P("Omar Marmoush", "FW", 27, 82), P("Oscar Bobb", "FW", 22, 77),
       ]},
     { id: "mun", name: "Manchester United", short: "MUN", nick: "Red Devils", city: "Manchester", stadium: "Old Trafford", colors: ["#DA291C", "#FBE122"], tier: 5,
       squad: [
         P("André Onana", "GK", 30, 79), P("Altay Bayındır", "GK", 28, 73),
         P("Lisandro Martínez", "DF", 28, 83), P("Matthijs de Ligt", "DF", 27, 83), P("Noussair Mazraoui", "DF", 28, 78), P("Diogo Dalot", "DF", 27, 79), P("Luke Shaw", "DF", 30, 78),
         P("Bruno Fernandes", "MF", 32, 86), P("Manuel Ugarte", "MF", 25, 79), P("Kobbie Mainoo", "MF", 21, 80), P("Casemiro", "MF", 34, 75),
         P("Bryan Mbeumo", "FW", 26, 84), P("Matheus Cunha", "FW", 27, 83), P("Rasmus Højlund", "FW", 23, 78), P("Alejandro Garnacho", "FW", 22, 80), P("Mason Mount", "FW", 27, 76), P("Amad Diallo", "FW", 24, 79),
       ]},
     { id: "avl", name: "Aston Villa", short: "AVL", nick: "The Villans", city: "Birmingham", stadium: "Villa Park", colors: ["#95BFE5", "#670E36"], tier: 4,
       squad: [
         P("Emiliano Martínez", "GK", 33, 84),
         P("Ezri Konsa", "DF", 28, 81), P("Pau Torres", "DF", 28, 80), P("Lucas Digne", "DF", 32, 77), P("Matty Cash", "DF", 28, 76),
         P("Boubacar Kamara", "MF", 25, 81), P("John McGinn", "MF", 31, 80), P("Youri Tielemans", "MF", 29, 79), P("Amadou Onana", "MF", 24, 80),
         P("Ollie Watkins", "FW", 29, 85), P("Morgan Rogers", "FW", 23, 82), P("Donyell Malen", "FW", 27, 77), P("Jhon Durán", "FW", 22, 78),
       ]},
     { id: "liv", name: "Liverpool", short: "LIV", nick: "The Reds", city: "Liverpool", stadium: "Anfield", colors: ["#C8102E", "#F6EB61"], tier: 5,
       squad: [
         P("Alisson", "GK", 33, 86), P("Giorgi Mamardashvili", "GK", 25, 78),
         P("Virgil van Dijk", "DF", 34, 84), P("Ibrahima Konaté", "DF", 27, 83), P("Jeremie Frimpong", "DF", 25, 81), P("Andy Robertson", "DF", 32, 78), P("Milos Kerkez", "DF", 22, 79),
         P("Ryan Gravenberch", "MF", 24, 84), P("Alexis Mac Allister", "MF", 27, 84), P("Dominik Szoboszlai", "MF", 25, 83), P("Wataru Endo", "MF", 33, 74),
         P("Mohamed Salah", "FW", 34, 88), P("Florian Wirtz", "FW", 23, 87), P("Hugo Ekitiké", "FW", 24, 83), P("Cody Gakpo", "FW", 27, 81), P("Alexander Isak", "FW", 27, 87),
       ]},
     { id: "bou", name: "Bournemouth", short: "BOU", nick: "The Cherries", city: "Bournemouth", stadium: "Dean Court", colors: ["#DA291C", "#000000"], tier: 3,
       squad: [
         P("Đorđe Petrović", "GK", 26, 78),
         P("Marcos Senesi", "DF", 28, 78), P("James Hill", "DF", 24, 73), P("Adam Smith", "DF", 35, 70), P("Julián Araujo", "DF", 24, 75),
         P("Ryan Christie", "MF", 31, 76), P("Alex Scott", "MF", 22, 76), P("Tyler Adams", "MF", 27, 75), P("David Brooks", "MF", 28, 73),
         P("Antoine Semenyo", "FW", 26, 80), P("Evanilson", "FW", 26, 78), P("Justin Kluivert", "FW", 27, 78),
       ]},
     { id: "sun", name: "Sunderland", short: "SUN", nick: "The Black Cats", city: "Sunderland", stadium: "Stadium of Light", colors: ["#EB172B", "#FFFFFF"], tier: 2,
       squad: [
         P("Anthony Patterson", "GK", 24, 75),
         P("Dan Ballard", "DF", 26, 75), P("Trai Hume", "DF", 23, 75), P("Dennis Cirkin", "DF", 24, 73), P("Reinildo Mandava", "DF", 32, 73),
         P("Dan Neil", "MF", 24, 75), P("Chris Rigg", "MF", 19, 77), P("Patrick Roberts", "MF", 29, 73), P("Granit Xhaka", "MF", 33, 78),
         P("Wilson Isidor", "FW", 25, 75), P("Eliezer Mayenda", "FW", 21, 73), P("Romaine Mundle", "FW", 23, 71),
       ]},
     { id: "bha", name: "Brighton & Hove Albion", short: "BHA", nick: "The Seagulls", city: "Brighton", stadium: "Falmer Stadium", colors: ["#0057B8", "#FFFFFF"], tier: 3,
       squad: [
         P("Bart Verbruggen", "GK", 23, 79),
         P("Lewis Dunk", "DF", 34, 78), P("Jan Paul van Hecke", "DF", 25, 78), P("Tariq Lamptey", "DF", 25, 75), P("Pervis Estupiñán", "DF", 28, 78),
         P("Carlos Baleba", "MF", 22, 82), P("Mats Wieffer", "MF", 26, 78), P("Yankuba Minteh", "MF", 21, 78), P("Kaoru Mitoma", "MF", 28, 80),
         P("Danny Welbeck", "FW", 35, 76), P("Stefanos Tzimas", "FW", 20, 73), P("Ferdi Kadıoğlu", "FW", 26, 76),
       ]},
     { id: "new", name: "Newcastle United", short: "NEW", nick: "The Magpies", city: "Newcastle upon Tyne", stadium: "St James' Park", colors: ["#241F20", "#FFFFFF"], tier: 4,
       squad: [
         P("Nick Pope", "GK", 34, 82),
         P("Sven Botman", "DF", 26, 81), P("Fabian Schär", "DF", 34, 78), P("Dan Burn", "DF", 34, 77), P("Lewis Hall", "DF", 22, 78),
         P("Bruno Guimarães", "MF", 28, 86), P("Joelinton", "MF", 29, 81), P("Sandro Tonali", "MF", 26, 83),
         P("Yoane Wissa", "FW", 29, 80), P("Nick Woltemade", "FW", 24, 80), P("Anthony Gordon", "FW", 25, 82), P("Jacob Murphy", "FW", 31, 75),
       ]},
     { id: "che", name: "Chelsea", short: "CHE", nick: "The Blues", city: "London", stadium: "Stamford Bridge", colors: ["#034694", "#FFFFFF"], tier: 5,
       squad: [
         P("Robert Sánchez", "GK", 28, 79), P("Filip Jörgensen", "GK", 24, 75),
         P("Levi Colwill", "DF", 23, 81), P("Wesley Fofana", "DF", 25, 78), P("Marc Cucurella", "DF", 28, 80), P("Reece James", "DF", 27, 81), P("Trevoh Chalobah", "DF", 27, 77),
         P("Moisés Caicedo", "MF", 24, 85), P("Enzo Fernández", "MF", 25, 84), P("Romeo Lavia", "MF", 22, 78),
         P("Cole Palmer", "FW", 24, 87), P("João Pedro", "FW", 24, 81), P("Nicolas Jackson", "FW", 25, 79), P("Pedro Neto", "FW", 26, 80), P("Liam Delap", "FW", 23, 78),
       ]},
     { id: "nfo", name: "Nottingham Forest", short: "NFO", nick: "The Tricky Trees", city: "Nottingham", stadium: "The City Ground", colors: ["#DD0000", "#FFFFFF"], tier: 3,
       squad: [
         P("Matz Sels", "GK", 33, 80),
         P("Murillo", "DF", 23, 80), P("Nikola Milenković", "DF", 28, 80), P("Neco Williams", "DF", 24, 76), P("Ola Aina", "DF", 29, 77),
         P("Morgan Gibbs-White", "MF", 25, 82), P("Elliot Anderson", "MF", 24, 78), P("Ibrahim Sangaré", "MF", 28, 77),
         P("Chris Wood", "FW", 35, 79), P("Callum Hudson-Odoi", "FW", 25, 76), P("Taiwo Awoniyi", "FW", 28, 77),
       ]},
     { id: "tot", name: "Tottenham Hotspur", short: "TOT", nick: "Spurs", city: "London", stadium: "Tottenham Hotspur Stadium", colors: ["#FFFFFF", "#132257"], tier: 5,
       squad: [
         P("Guglielmo Vicario", "GK", 29, 81),
         P("Cristian Romero", "DF", 27, 84), P("Micky van de Ven", "DF", 24, 82), P("Destiny Udogie", "DF", 23, 80), P("Djed Spence", "DF", 25, 73),
         P("Yves Bissouma", "MF", 29, 79), P("Rodrigo Bentancur", "MF", 28, 79), P("Pape Matar Sarr", "MF", 23, 79), P("James Maddison", "MF", 29, 81),
         P("Dominic Solanke", "FW", 28, 79), P("Brennan Johnson", "FW", 24, 78), P("Mathys Tel", "FW", 21, 76), P("Richarlison", "FW", 29, 76),
       ]},
     { id: "eve", name: "Everton", short: "EVE", nick: "The Toffees", city: "Liverpool", stadium: "Hill Dickinson Stadium", colors: ["#003399", "#FFFFFF"], tier: 3,
       squad: [
         P("Jordan Pickford", "GK", 32, 83),
         P("Jarrad Branthwaite", "DF", 24, 81), P("James Tarkowski", "DF", 33, 77), P("Vitaliy Mykolenko", "DF", 27, 76), P("Nathan Patterson", "DF", 24, 73),
         P("Idrissa Gueye", "MF", 36, 73), P("James Garner", "MF", 25, 75), P("Abdoulaye Doucouré", "MF", 33, 75),
         P("Dominic Calvert-Lewin", "FW", 29, 73), P("Iliman Ndiaye", "FW", 25, 79), P("Beto", "FW", 27, 75),
       ]},
     { id: "cry", name: "Crystal Palace", short: "CRY", nick: "The Eagles", city: "London", stadium: "Selhurst Park", colors: ["#1B458F", "#C4122E"], tier: 3,
       squad: [
         P("Dean Henderson", "GK", 29, 80),
         P("Marc Guéhi", "DF", 25, 81), P("Maxence Lacroix", "DF", 25, 79), P("Tyrick Mitchell", "DF", 26, 78), P("Daniel Muñoz", "DF", 30, 77),
         P("Adam Wharton", "MF", 22, 81), P("Will Hughes", "MF", 30, 75), P("Cheick Doucouré", "MF", 26, 76),
         P("Jean-Philippe Mateta", "FW", 28, 79), P("Ismaila Sarr", "FW", 27, 77), P("Yeremy Pino", "FW", 23, 75),
       ]},
     { id: "ful", name: "Fulham", short: "FUL", nick: "The Cottagers", city: "London", stadium: "Craven Cottage", colors: ["#FFFFFF", "#000000"], tier: 3,
       squad: [
         P("Bernd Leno", "GK", 34, 80),
         P("Calvin Bassey", "DF", 25, 76), P("Joachim Andersen", "DF", 29, 79), P("Antonee Robinson", "DF", 28, 78), P("Kenny Tete", "DF", 30, 74),
         P("Sander Berge", "MF", 27, 76), P("Emile Smith Rowe", "MF", 25, 76), P("Harrison Reed", "MF", 30, 72),
         P("Rodrigo Muniz", "FW", 25, 76), P("Alex Iwobi", "FW", 29, 79), P("Raúl Jiménez", "FW", 35, 73),
       ]},
     { id: "bre", name: "Brentford", short: "BRE", nick: "The Bees", city: "London", stadium: "Gtech Community Stadium", colors: ["#E30613", "#FFFFFF"], tier: 3,
       squad: [
         P("Mark Flekken", "GK", 32, 76),
         P("Nathan Collins", "DF", 24, 79), P("Ethan Pinnock", "DF", 32, 76), P("Rico Henry", "DF", 28, 76), P("Aaron Hickey", "DF", 23, 75),
         P("Jordan Henderson", "MF", 36, 77), P("Mathias Jensen", "MF", 30, 76), P("Vitaly Janelt", "MF", 27, 74),
         P("Kevin Schade", "FW", 24, 78), P("Igor Thiago", "FW", 24, 76), P("Fábio Carvalho", "FW", 23, 74),
       ]},
     { id: "lee", name: "Leeds United", short: "LEE", nick: "The Whites", city: "Leeds", stadium: "Elland Road", colors: ["#FFFFFF", "#1D428A"], tier: 2,
       squad: [
         P("Lucas Perri", "GK", 27, 78),
         P("Pascal Struijk", "DF", 26, 76), P("Joe Rodon", "DF", 28, 76), P("Ethan Ampadu", "DF", 25, 78), P("Jayden Bogle", "DF", 25, 74),
         P("Ilia Gruev", "MF", 25, 75), P("Brenden Aaronson", "MF", 25, 75), P("Largie Ramazani", "MF", 25, 73),
         P("Joel Piroe", "FW", 26, 76), P("Lukas Nmecha", "FW", 27, 73), P("Daniel James", "FW", 28, 74),
       ]},
     { id: "cov", name: "Coventry City", short: "COV", nick: "The Sky Blues", city: "Coventry", stadium: "Coventry Building Society Arena", colors: ["#78D0F2", "#000000"], tier: 1,
       squad: [
         P("Bradley Collins", "GK", 31, 72),
         P("Bobby Thomas", "DF", 24, 71), P("Joel Latibeaudiere", "DF", 25, 71), P("Jake Bidwell", "DF", 33, 68), P("Jay Dasilva", "DF", 28, 69),
         P("Ben Sheaf", "MF", 26, 71), P("Josh Eccles", "MF", 25, 70), P("Tatsuhiro Sakamoto", "MF", 28, 72),
         P("Haji Wright", "FW", 28, 74), P("Ellis Simms", "FW", 24, 71), P("Jack Rudoni", "FW", 24, 70),
       ]},
     { id: "ips", name: "Ipswich Town", short: "IPS", nick: "The Tractor Boys", city: "Ipswich", stadium: "Portman Road", colors: ["#1D4290", "#FFFFFF"], tier: 1,
       squad: [
         P("Arijanet Muric", "GK", 27, 73),
         P("Jacob Greaves", "DF", 25, 73), P("Cameron Burgess", "DF", 30, 70), P("Leif Davis", "DF", 26, 74), P("Axel Tuanzebe", "DF", 28, 69),
         P("Sam Morsy", "MF", 34, 72), P("Jens Cajuste", "MF", 26, 71), P("Massimo Luongo", "MF", 33, 68),
         P("George Hirst", "FW", 26, 72), P("Omari Hutchinson", "FW", 22, 76), P("Kayden Jackson", "FW", 31, 67),
       ]},
     { id: "hul", name: "Hull City", short: "HUL", nick: "The Tigers", city: "Hull", stadium: "MKM Stadium", colors: ["#F18A01", "#000000"], tier: 1,
       squad: [
         P("Ivor Pandur", "GK", 24, 71),
         P("Sean McLoughlin", "DF", 28, 70), P("Alfie Jones", "DF", 26, 69), P("Lewie Coyle", "DF", 29, 70), P("Liam Millar", "DF", 26, 69),
         P("Jean Michael Seri", "MF", 34, 73), P("Regan Slater", "MF", 25, 70), P("Ozan Tufan", "MF", 31, 71),
         P("Mason Burstow", "FW", 22, 70), P("Abu Kamara", "FW", 22, 71), P("Anwar El Ghazi", "FW", 30, 69),
       ]},
   ];
   
   // ---- THE CHAMPIONSHIP (second tier) -------------------------------------
   // Real clubs, distinct from the 20 Premier League sides above. Squads are
   // left empty and generated per-career by ensureSquadDepth at tier-
   // appropriate (lower) ratings — the same mechanism promoted clubs use — so
   // the division feels a clear step below the Premier League.
   const RAW_CHAMPIONSHIP = [
     { id: "lei", name: "Leicester City", short: "LEI", nick: "The Foxes", city: "Leicester", stadium: "King Power Stadium", colors: ["#003090", "#FDBE11"], tier: 2, squad: [] },
     { id: "sou", name: "Southampton", short: "SOU", nick: "The Saints", city: "Southampton", stadium: "St Mary's Stadium", colors: ["#D71920", "#FFFFFF"], tier: 2, squad: [] },
     { id: "wba", name: "West Bromwich Albion", short: "WBA", nick: "The Baggies", city: "West Bromwich", stadium: "The Hawthorns", colors: ["#122F67", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nor", name: "Norwich City", short: "NOR", nick: "The Canaries", city: "Norwich", stadium: "Carrow Road", colors: ["#FFF200", "#00A650"], tier: 2, squad: [] },
     { id: "mid", name: "Middlesbrough", short: "MID", nick: "Boro", city: "Middlesbrough", stadium: "Riverside Stadium", colors: ["#E21E26", "#FFFFFF"], tier: 2, squad: [] },
     { id: "shu", name: "Sheffield United", short: "SHU", nick: "The Blades", city: "Sheffield", stadium: "Bramall Lane", colors: ["#EE2737", "#000000"], tier: 2, squad: [] },
     { id: "bur", name: "Burnley", short: "BUR", nick: "The Clarets", city: "Burnley", stadium: "Turf Moor", colors: ["#6C1D45", "#99D6EA"], tier: 2, squad: [] },
     { id: "wol", name: "Wolverhampton Wanderers", short: "WOL", nick: "Wolves", city: "Wolverhampton", stadium: "Molineux Stadium", colors: ["#FDB913", "#231F20"], tier: 2, squad: [] },
     { id: "wat", name: "Watford", short: "WAT", nick: "The Hornets", city: "Watford", stadium: "Vicarage Road", colors: ["#FBEE23", "#ED2127"], tier: 1, squad: [] },
     { id: "sto", name: "Stoke City", short: "STO", nick: "The Potters", city: "Stoke-on-Trent", stadium: "bet365 Stadium", colors: ["#E03A3E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pne", name: "Preston North End", short: "PNE", nick: "The Lilywhites", city: "Preston", stadium: "Deepdale", colors: ["#FFFFFF", "#0000FF"], tier: 1, squad: [] },
     { id: "bbr", name: "Blackburn Rovers", short: "BBR", nick: "Rovers", city: "Blackburn", stadium: "Ewood Park", colors: ["#009EE0", "#E4022C"], tier: 1, squad: [] },
     { id: "swa", name: "Swansea City", short: "SWA", nick: "The Swans", city: "Swansea", stadium: "Swansea.com Stadium", colors: ["#FFFFFF", "#000000"], tier: 1, squad: [] },
     { id: "car", name: "Cardiff City", short: "CAR", nick: "The Bluebirds", city: "Cardiff", stadium: "Cardiff City Stadium", colors: ["#0070B5", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mil", name: "Millwall", short: "MIL", nick: "The Lions", city: "London", stadium: "The Den", colors: ["#001C58", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bri", name: "Bristol City", short: "BRC", nick: "The Robins", city: "Bristol", stadium: "Ashton Gate", colors: ["#E21C38", "#FFFFFF"], tier: 1, squad: [] },
     { id: "qpr", name: "Queens Park Rangers", short: "QPR", nick: "The Hoops", city: "London", stadium: "Loftus Road", colors: ["#1D5BA4", "#FFFFFF"], tier: 1, squad: [] },
     { id: "shw", name: "Sheffield Wednesday", short: "SHW", nick: "The Owls", city: "Sheffield", stadium: "Hillsborough", colors: ["#1F50A1", "#FFFFFF"], tier: 1, squad: [] },
     { id: "der", name: "Derby County", short: "DER", nick: "The Rams", city: "Derby", stadium: "Pride Park Stadium", colors: ["#FFFFFF", "#000000"], tier: 1, squad: [] },
     { id: "ply", name: "Plymouth Argyle", short: "PLY", nick: "The Pilgrims", city: "Plymouth", stadium: "Home Park", colors: ["#007B5F", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bir", name: "Birmingham City", short: "BIR", nick: "The Blues", city: "Birmingham", stadium: "St Andrew's", colors: ["#0000FF", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lut", name: "Luton Town", short: "LUT", nick: "The Hatters", city: "Luton", stadium: "Kenilworth Road", colors: ["#F78F1E", "#FFFFFF"], tier: 2, squad: [] },
     { id: "wyc", name: "Wycombe Wanderers", short: "WYC", nick: "The Chairboys", city: "High Wycombe", stadium: "Adams Park", colors: ["#00B7EB", "#0A0A6E"], tier: 1, squad: [] },
     { id: "leo", name: "Leyton Orient", short: "LEY", nick: "The O's", city: "London", stadium: "Brisbane Road", colors: ["#D2122E", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- EFL LEAGUE ONE (third tier) ----------------------------------------
   const RAW_LEAGUEONE = [
     { id: "bol", name: "Bolton Wanderers", short: "BOL", nick: "The Trotters", city: "Bolton", stadium: "Toughsheet Community Stadium", colors: ["#FFFFFF", "#001C58"], tier: 1, squad: [] },
     { id: "wig", name: "Wigan Athletic", short: "WIG", nick: "The Latics", city: "Wigan", stadium: "Brick Community Stadium", colors: ["#0070B5", "#FFFFFF"], tier: 1, squad: [] },
     { id: "brn", name: "Barnsley", short: "BRN", nick: "The Tykes", city: "Barnsley", stadium: "Oakwell", colors: ["#D2122E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "por", name: "Portsmouth", short: "POR", nick: "Pompey", city: "Portsmouth", stadium: "Fratton Park", colors: ["#001C58", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cha", name: "Charlton Athletic", short: "CHA", nick: "The Addicks", city: "London", stadium: "The Valley", colors: ["#D2122E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hud", name: "Huddersfield Town", short: "HUD", nick: "The Terriers", city: "Huddersfield", stadium: "John Smith's Stadium", colors: ["#0070B5", "#FFFFFF"], tier: 1, squad: [] },
     { id: "oxf", name: "Oxford United", short: "OXF", nick: "The U's", city: "Oxford", stadium: "Kassam Stadium", colors: ["#FFD700", "#001C58"], tier: 1, squad: [] },
     { id: "pet", name: "Peterborough United", short: "PET", nick: "Posh", city: "Peterborough", stadium: "Weston Homes Stadium", colors: ["#0070B5", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lin", name: "Lincoln City", short: "LIN", nick: "The Imps", city: "Lincoln", stadium: "LNER Stadium", colors: ["#D2122E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "brv", name: "Bristol Rovers", short: "BRV", nick: "The Gas", city: "Bristol", stadium: "Memorial Stadium", colors: ["#0070B5", "#FFFFFF"], tier: 1, squad: [] },
     { id: "wre", name: "Wrexham", short: "WRE", nick: "The Red Dragons", city: "Wrexham", stadium: "Racecourse Ground", colors: ["#D2122E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "stk", name: "Stockport County", short: "STK", nick: "The Hatters", city: "Stockport", stadium: "Edgeley Park", colors: ["#0070B5", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bkp", name: "Blackpool", short: "BKP", nick: "The Seasiders", city: "Blackpool", stadium: "Bloomfield Road", colors: ["#F68712", "#FFFFFF"], tier: 1, squad: [] },
     { id: "rot", name: "Rotherham United", short: "ROT", nick: "The Millers", city: "Rotherham", stadium: "AESSEAL New York Stadium", colors: ["#D2122E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cam", name: "Cambridge United", short: "CAM", nick: "The U's", city: "Cambridge", stadium: "Abbey Stadium", colors: ["#FFCC00", "#000000"], tier: 1, squad: [] },
     { id: "nor2", name: "Northampton Town", short: "NTH", nick: "The Cobblers", city: "Northampton", stadium: "Sixfields Stadium", colors: ["#7C2D8A", "#FFFFFF"], tier: 1, squad: [] },
     { id: "shr", name: "Shrewsbury Town", short: "SHR", nick: "The Shrews", city: "Shrewsbury", stadium: "Croud Meadow", colors: ["#0033A0", "#FFD700"], tier: 1, squad: [] },
     { id: "rea", name: "Reading", short: "REA", nick: "The Royals", city: "Reading", stadium: "Select Car Leasing Stadium", colors: ["#004494", "#FFFFFF"], tier: 1, squad: [] },
     { id: "exe", name: "Exeter City", short: "EXE", nick: "The Grecians", city: "Exeter", stadium: "St James Park", colors: ["#D2122E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mns", name: "Mansfield Town", short: "MNS", nick: "The Stags", city: "Mansfield", stadium: "One Call Stadium", colors: ["#FFD700", "#00205B"], tier: 1, squad: [] },
     { id: "bua", name: "Burton Albion", short: "BUA", nick: "The Brewers", city: "Burton upon Trent", stadium: "Pirelli Stadium", colors: ["#FFDF00", "#000000"], tier: 1, squad: [] },
     { id: "pva", name: "Port Vale", short: "PVA", nick: "The Valiants", city: "Stoke-on-Trent", stadium: "Vale Park", colors: ["#FFFFFF", "#000000"], tier: 1, squad: [] },
     { id: "chl", name: "Cheltenham Town", short: "CHL", nick: "The Robins", city: "Cheltenham", stadium: "Whaddon Road", colors: ["#D2122E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "crl", name: "Carlisle United", short: "CRL", nick: "The Cumbrians", city: "Carlisle", stadium: "Brunton Park", colors: ["#0033A0", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- EFL LEAGUE TWO (fourth tier — no relegation below it) ---------------
   const RAW_LEAGUETWO = [
     { id: "nts", name: "Notts County", short: "NTS", nick: "The Magpies", city: "Nottingham", stadium: "Meadow Lane", colors: ["#000000", "#FFFFFF"], tier: 0, squad: [] },
     { id: "grm", name: "Grimsby Town", short: "GRM", nick: "The Mariners", city: "Grimsby", stadium: "Blundell Park", colors: ["#000000", "#FFFFFF"], tier: 0, squad: [] },
     { id: "brd", name: "Bradford City", short: "BRD", nick: "The Bantams", city: "Bradford", stadium: "Valley Parade", colors: ["#8A1538", "#F68712"], tier: 0, squad: [] },
     { id: "cht", name: "Chesterfield", short: "CHT", nick: "The Spireites", city: "Chesterfield", stadium: "SMH Group Stadium", colors: ["#0033A0", "#FFFFFF"], tier: 0, squad: [] },
     { id: "gil", name: "Gillingham", short: "GIL", nick: "The Gills", city: "Gillingham", stadium: "Priestfield Stadium", colors: ["#0033A0", "#FFFFFF"], tier: 0, squad: [] },
     { id: "mkd", name: "MK Dons", short: "MKD", nick: "The Dons", city: "Milton Keynes", stadium: "Stadium MK", colors: ["#FFFFFF", "#000000"], tier: 0, squad: [] },
     { id: "crw", name: "Crawley Town", short: "CRW", nick: "The Red Devils", city: "Crawley", stadium: "Broadfield Stadium", colors: ["#D2122E", "#FFFFFF"], tier: 0, squad: [] },
     { id: "sal", name: "Salford City", short: "SAL", nick: "The Ammies", city: "Salford", stadium: "Peninsula Stadium", colors: ["#D2122E", "#000000"], tier: 0, squad: [] },
     { id: "wal", name: "Walsall", short: "WAL", nick: "The Saddlers", city: "Walsall", stadium: "Poundland Bescot Stadium", colors: ["#D2122E", "#FFFFFF"], tier: 0, squad: [] },
     { id: "don", name: "Doncaster Rovers", short: "DON", nick: "Rovers", city: "Doncaster", stadium: "Eco-Power Stadium", colors: ["#D2122E", "#FFFFFF"], tier: 0, squad: [] },
     { id: "col", name: "Colchester United", short: "COL", nick: "The U's", city: "Colchester", stadium: "JobServe Community Stadium", colors: ["#0033A0", "#FFFFFF"], tier: 0, squad: [] },
     { id: "npt", name: "Newport County", short: "NPT", nick: "The Exiles", city: "Newport", stadium: "Rodney Parade", colors: ["#F68712", "#000000"], tier: 0, squad: [] },
     { id: "trn", name: "Tranmere Rovers", short: "TRN", nick: "The Whites", city: "Birkenhead", stadium: "Prenton Park", colors: ["#FFFFFF", "#0033A0"], tier: 0, squad: [] },
     { id: "cre", name: "Crewe Alexandra", short: "CRE", nick: "The Railwaymen", city: "Crewe", stadium: "Mornflake Stadium", colors: ["#D2122E", "#FFFFFF"], tier: 0, squad: [] },
     { id: "hgt", name: "Harrogate Town", short: "HGT", nick: "The Sulphurites", city: "Harrogate", stadium: "Wetherby Road", colors: ["#FFD700", "#000000"], tier: 0, squad: [] },
     { id: "bar2", name: "Barrow", short: "BAW", nick: "The Bluebirds", city: "Barrow-in-Furness", stadium: "Holker Street", colors: ["#0070B5", "#FFFFFF"], tier: 0, squad: [] },
     { id: "swn", name: "Swindon Town", short: "SWN", nick: "The Robins", city: "Swindon", stadium: "County Ground", colors: ["#D2122E", "#FFFFFF"], tier: 0, squad: [] },
     { id: "acc", name: "Accrington Stanley", short: "ACC", nick: "Stanley", city: "Accrington", stadium: "Wham Stadium", colors: ["#D2122E", "#000000"], tier: 0, squad: [] },
     { id: "mor", name: "Morecambe", short: "MOR", nick: "The Shrimps", city: "Morecambe", stadium: "Mazuma Stadium", colors: ["#D2122E", "#000000"], tier: 0, squad: [] },
     { id: "fle", name: "Fleetwood Town", short: "FLE", nick: "The Cod Army", city: "Fleetwood", stadium: "Highbury Stadium", colors: ["#D2122E", "#FFFFFF"], tier: 0, squad: [] },
     { id: "wim", name: "AFC Wimbledon", short: "WIM", nick: "The Dons", city: "London", stadium: "Plough Lane", colors: ["#003399", "#FFCC00"], tier: 0, squad: [] },
     { id: "brm", name: "Bromley", short: "BRM", nick: "The Ravens", city: "Bromley", stadium: "Hayes Lane", colors: ["#FFFFFF", "#000000"], tier: 0, squad: [] },
     { id: "stv", name: "Stevenage", short: "STV", nick: "Boro", city: "Stevenage", stadium: "Lamex Stadium", colors: ["#D2122E", "#FFFFFF"], tier: 0, squad: [] },
     { id: "sut", name: "Sutton United", short: "SUT", nick: "The U's", city: "Sutton", stadium: "Gander Green Lane", colors: ["#FFCC00", "#000000"], tier: 0, squad: [] },
   ];

   // ---- SPAIN: LA LIGA (20) --------------------------------------------------
   const RAW_LALIGA = [
     { id: "rma", name: "Real Madrid", short: "RMA", nick: "Los Blancos", city: "Madrid", stadium: "Santiago Bernabéu", colors: ["#FEBE10", "#00529F"], tier: 5,
       squad: [
         P("Thibaut Courtois", "GK", 34, 89), P("Andriy Lunin", "GK", 27, 78),
         P("Trent Alexander-Arnold", "DF", 28, 85), P("Éder Militão", "DF", 28, 84), P("Antonio Rüdiger", "DF", 33, 84), P("Dean Huijsen", "DF", 21, 82), P("Ferland Mendy", "DF", 31, 79), P("Fran García", "DF", 27, 78), P("Raúl Asencio", "DF", 23, 77),
         P("Jude Bellingham", "MF", 23, 89), P("Federico Valverde", "MF", 28, 87), P("Aurélien Tchouaméni", "MF", 26, 84), P("Eduardo Camavinga", "MF", 24, 84), P("Arda Güler", "MF", 21, 82), P("Dani Ceballos", "MF", 30, 77),
         P("Kylian Mbappé", "FW", 28, 91), P("Vinícius Júnior", "FW", 26, 90), P("Rodrygo", "FW", 26, 85), P("Brahim Díaz", "FW", 27, 81), P("Endrick", "FW", 20, 78),
       ]},
     { id: "fcb", name: "FC Barcelona", short: "BAR", nick: "Blaugrana", city: "Barcelona", stadium: "Spotify Camp Nou", colors: ["#A50044", "#004D98"], tier: 5,
       squad: [
         P("Joan García", "GK", 25, 82), P("Marc-André ter Stegen", "GK", 34, 83), P("Wojciech Szczęsny", "GK", 36, 78),
         P("Pau Cubarsí", "DF", 19, 83), P("Ronald Araújo", "DF", 27, 84), P("Jules Koundé", "DF", 27, 84), P("Íñigo Martínez", "DF", 35, 80), P("Alejandro Balde", "DF", 23, 82), P("Andreas Christensen", "DF", 30, 78),
         P("Pedri", "MF", 23, 88), P("Frenkie de Jong", "MF", 29, 85), P("Gavi", "MF", 22, 83), P("Dani Olmo", "MF", 28, 84), P("Fermín López", "MF", 23, 80), P("Marc Casadó", "MF", 22, 78),
         P("Lamine Yamal", "FW", 19, 90), P("Raphinha", "FW", 30, 87), P("Robert Lewandowski", "FW", 38, 84), P("Ferran Torres", "FW", 26, 80), P("Marcus Rashford", "FW", 29, 82),
       ]},
     { id: "atm", name: "Atlético Madrid", short: "ATM", nick: "Los Colchoneros", city: "Madrid", stadium: "Metropolitano", colors: ["#CB3524", "#FFFFFF"], tier: 5,
       squad: [
         P("Jan Oblak", "GK", 33, 86), P("Juan Musso", "GK", 32, 76),
         P("Robin Le Normand", "DF", 30, 82), P("José María Giménez", "DF", 31, 82), P("David Hancko", "DF", 28, 81), P("Clément Lenglet", "DF", 31, 78), P("Nahuel Molina", "DF", 28, 79), P("Reinildo", "DF", 32, 77), P("Matteo Ruggeri", "DF", 24, 76),
         P("Rodrigo De Paul", "MF", 32, 82), P("Marcos Llorente", "MF", 31, 81), P("Pablo Barrios", "MF", 23, 80), P("Conor Gallagher", "MF", 26, 80), P("Koke", "MF", 34, 77), P("Johnny Cardoso", "MF", 24, 78),
         P("Julián Álvarez", "FW", 26, 87), P("Antoine Griezmann", "FW", 35, 83), P("Alexander Sørloth", "FW", 30, 81), P("Giacomo Raspadori", "FW", 26, 79), P("Giuliano Simeone", "FW", 23, 78),
       ]},
     { id: "ath", name: "Athletic Club", short: "ATH", nick: "Los Leones", city: "Bilbao", stadium: "San Mamés", colors: ["#EE2523", "#FFFFFF"], tier: 4,
       squad: [
         P("Unai Simón", "GK", 29, 84), P("Álex Padilla", "GK", 23, 72),
         P("Dani Vivian", "DF", 26, 81), P("Aitor Paredes", "DF", 25, 78), P("Yeray Álvarez", "DF", 31, 77), P("Imanol García de Albéniz", "DF", 24, 75), P("Yuri Berchiche", "DF", 36, 75), P("Iñaki Lekue", "DF", 32, 73),
         P("Oihan Sancet", "MF", 26, 82), P("Mikel Jauregizar", "MF", 22, 78), P("Álex Berenguer", "MF", 31, 78), P("Iñigo Ruiz de Galarreta", "MF", 32, 75), P("Beñat Prados", "MF", 24, 74), P("Unai Gómez", "MF", 23, 74),
         P("Nico Williams", "FW", 24, 85), P("Iñaki Williams", "FW", 32, 82), P("Gorka Guruzeta", "FW", 30, 78), P("Robert Navarro", "FW", 24, 74), P("Maroan Sannadi", "FW", 25, 73),
       ]},
     { id: "rso", name: "Real Sociedad", short: "RSO", nick: "La Real", city: "San Sebastián", stadium: "Reale Arena", colors: ["#0067B1", "#FFFFFF"], tier: 4,
       squad: [
         P("Álex Remiro", "GK", 31, 83), P("Unai Marrero", "GK", 22, 71),
         P("Igor Zubeldia", "DF", 29, 80), P("Nayef Aguerd", "DF", 30, 80), P("Duje Ćaleta-Car", "DF", 29, 78), P("Aritz Elustondo", "DF", 32, 75), P("Hamari Traoré", "DF", 34, 76), P("Jon Aramburu", "DF", 23, 75), P("Aihen Muñoz", "DF", 29, 74),
         P("Takefusa Kubo", "MF", 25, 84), P("Brais Méndez", "MF", 29, 81), P("Luka Sučić", "MF", 24, 78), P("Beñat Turrientes", "MF", 24, 76), P("Pablo Marín", "MF", 22, 73), P("Carlos Soler", "MF", 29, 78),
         P("Mikel Oyarzabal", "FW", 29, 84), P("Ander Barrenetxea", "FW", 24, 78), P("Orri Óskarsson", "FW", 21, 77), P("Sheraldo Becker", "FW", 31, 76),
       ]},
     { id: "bet", name: "Real Betis", short: "BET", nick: "Los Verdiblancos", city: "Seville", stadium: "Benito Villamarín", colors: ["#00954C", "#FFFFFF"], tier: 4,
       squad: [
         P("Pau López", "GK", 31, 79), P("Álvaro Valles", "GK", 28, 76),
         P("Natan", "DF", 24, 78), P("Marc Bartra", "DF", 35, 76), P("Diego Llorente", "DF", 33, 77), P("Héctor Bellerín", "DF", 31, 77), P("Valentín Gómez", "DF", 22, 75), P("Ricardo Rodríguez", "DF", 34, 74), P("Romain Perraud", "DF", 28, 74),
         P("Giovani Lo Celso", "MF", 30, 80), P("Isco", "MF", 34, 82), P("Pablo Fornals", "MF", 30, 79), P("Marc Roca", "MF", 29, 78), P("Sergi Altimira", "MF", 24, 76), P("Nelson Deossa", "MF", 25, 76),
         P("Antony", "FW", 26, 83), P("Abde Ezzalzouli", "FW", 24, 79), P("Cucho Hernández", "FW", 27, 79), P("Cédric Bakambu", "FW", 30, 76), P("Chimy Ávila", "FW", 32, 74),
       ]},
     { id: "vil", name: "Villarreal", short: "VIL", nick: "El Submarino Amarillo", city: "Villarreal", stadium: "Estadio de la Cerámica", colors: ["#FFE667", "#004C99"], tier: 4,
       squad: [
         P("Luiz Júnior", "GK", 24, 78), P("Diego Conde", "GK", 27, 72),
         P("Juan Foyth", "DF", 28, 80), P("Renato Veiga", "DF", 23, 79), P("Rafa Marín", "DF", 23, 76), P("Sergi Cardona", "DF", 26, 76), P("Santiago Mouriño", "DF", 23, 75), P("Willy Kambwala", "DF", 21, 76), P("Alfonso Pedraza", "DF", 30, 76),
         P("Dani Parejo", "MF", 37, 79), P("Thomas Partey", "MF", 33, 79), P("Santi Comesaña", "MF", 29, 77), P("Pape Gueye", "MF", 26, 77), P("Alberto Moleiro", "MF", 22, 78),
         P("Georges Mikautadze", "FW", 25, 80), P("Gerard Moreno", "FW", 34, 80), P("Ayoze Pérez", "FW", 33, 79), P("Nicolas Pépé", "FW", 30, 77), P("Tani Oluwaseyi", "FW", 25, 74),
       ]},
     { id: "sev", name: "Sevilla", short: "SEV", nick: "Los Nervionenses", city: "Seville", stadium: "Ramón Sánchez-Pizjuán", colors: ["#D8010F", "#FFFFFF"], tier: 4,
       squad: [
         P("Ørjan Nyland", "GK", 35, 76), P("Odysseas Vlachodimos", "GK", 31, 75),
         P("Loïc Badé", "DF", 25, 80), P("Kike Salas", "DF", 23, 76), P("Marcão", "DF", 29, 76), P("Tanguy Nianzou", "DF", 24, 76), P("José Ángel Carmona", "DF", 24, 76), P("Gabriel Suazo", "DF", 28, 76), P("Ramón Martínez", "DF", 22, 73),
         P("Djibril Sow", "MF", 29, 77), P("Saúl Ñíguez", "MF", 31, 78), P("Lucien Agoumé", "MF", 24, 76), P("Nemanja Gudelj", "MF", 34, 74), P("Joan Jordán", "MF", 31, 74),
         P("Dodi Lukébakio", "FW", 28, 80), P("Rubén Vargas", "FW", 27, 77), P("Isaac Romero", "FW", 25, 76), P("Chidera Ejuke", "FW", 28, 75), P("Akor Adams", "FW", 26, 74),
       ]},
     { id: "vlc", name: "Valencia", short: "VLC", nick: "Los Che", city: "Valencia", stadium: "Mestalla", colors: ["#FF7C00", "#000000"], tier: 3,
       squad: [
         P("Julen Agirrezabala", "GK", 25, 76), P("Stole Dimitrievski", "GK", 32, 74),
         P("Mouctar Diakhaby", "DF", 29, 77), P("José Gayà", "DF", 31, 78), P("Cenk Özkacar", "DF", 25, 74), P("Dimitri Foulquier", "DF", 32, 74), P("Thierry Rendall", "DF", 28, 73), P("Jesús Vázquez", "DF", 23, 73),
         P("Pepelu", "MF", 27, 77), P("Javi Guerra", "MF", 22, 79), P("André Almeida", "MF", 25, 75), P("Baptiste Santamaría", "MF", 30, 74), P("Filip Ugrinic", "MF", 26, 74),
         P("Hugo Duro", "FW", 26, 78), P("Diego López", "FW", 24, 77), P("Luis Rioja", "FW", 32, 74), P("Dani Gómez", "FW", 27, 74), P("Rafa Mir", "FW", 29, 74),
       ]},
     { id: "gir", name: "Girona", short: "GIR", nick: "Blanquivermells", city: "Girona", stadium: "Montilivi", colors: ["#CD1719", "#FFFFFF"], tier: 3,
       squad: [
         P("Paulo Gazzaniga", "GK", 34, 77), P("Vladyslav Krapyvtsov", "GK", 21, 70),
         P("Arnau Martínez", "DF", 23, 77), P("Daley Blind", "DF", 36, 74), P("Vitor Reis", "DF", 20, 76), P("Alejandro Francés", "DF", 23, 75), P("David López", "DF", 36, 73), P("Juanpe", "DF", 34, 73),
         P("Iván Martín", "MF", 26, 76), P("Yaser Asprilla", "MF", 22, 76), P("Donny van de Beek", "MF", 29, 76), P("Oriol Romeu", "MF", 34, 74), P("Axel Witsel", "MF", 37, 74),
         P("Viktor Tsygankov", "FW", 28, 80), P("Bryan Gil", "FW", 25, 77), P("Abel Ruiz", "FW", 26, 75), P("Cristhian Stuani", "FW", 39, 74), P("Vladyslav Vanat", "FW", 23, 77),
       ]},
     { id: "cel", name: "Celta Vigo", short: "CEL", nick: "Os Celestes", city: "Vigo", stadium: "Balaídos", colors: ["#8AC3EE", "#FFFFFF"], tier: 3,
       squad: [
         P("Ionuț Radu", "GK", 29, 77), P("Vicente Guaita", "GK", 39, 74),
         P("Carl Starfelt", "DF", 31, 76), P("Marcos Alonso", "DF", 35, 74), P("Óscar Mingueza", "DF", 27, 78), P("Javi Rodríguez", "DF", 23, 73), P("Carlos Domínguez", "DF", 24, 74), P("Sergio Carreira", "DF", 24, 73),
         P("Fran Beltrán", "MF", 27, 76), P("Ilaix Moriba", "MF", 23, 75), P("Luca de la Torre", "MF", 28, 75), P("Hugo Sotelo", "MF", 21, 73), P("Damián Rodríguez", "MF", 22, 73),
         P("Iago Aspas", "FW", 39, 78), P("Borja Iglesias", "FW", 33, 77), P("Pablo Durán", "FW", 21, 74), P("Williot Swedberg", "FW", 22, 75), P("Jonathan Bamba", "FW", 30, 76),
       ]},
     { id: "osa", name: "Osasuna", short: "OSA", nick: "Los Rojillos", city: "Pamplona", stadium: "El Sadar", colors: ["#0A346F", "#D91A21"], tier: 3,
       squad: [
         P("Sergio Herrera", "GK", 33, 76), P("Aitor Fernández", "GK", 35, 73),
         P("Alejandro Catena", "DF", 32, 75), P("David García", "DF", 32, 76), P("Juan Cruz", "DF", 30, 74), P("Jesús Areso", "DF", 26, 76), P("Rubén Peña", "DF", 34, 73), P("Abel Bretones", "DF", 25, 73),
         P("Lucas Torró", "MF", 32, 75), P("Jon Moncayola", "MF", 27, 77), P("Aimar Oroz", "MF", 24, 77), P("Moi Gómez", "MF", 31, 74), P("Iker Muñoz", "MF", 22, 73),
         P("Ante Budimir", "FW", 35, 78), P("Rubén García", "FW", 32, 74), P("Bryan Zaragoza", "FW", 24, 77), P("Raúl García de Haro", "FW", 27, 73), P("Víctor Muñoz", "FW", 22, 72),
       ]},
     { id: "ray", name: "Rayo Vallecano", short: "RAY", nick: "Los Franjirrojos", city: "Madrid", stadium: "Vallecas", colors: ["#FFFFFF", "#E53027"], tier: 3,
       squad: [
         P("Augusto Batalla", "GK", 29, 76), P("Dani Cárdenas", "GK", 28, 72),
         P("Florian Lejeune", "DF", 35, 76), P("Aridane Hernández", "DF", 37, 73), P("Pep Chavarría", "DF", 28, 75), P("Andrei Rațiu", "DF", 28, 78), P("Iván Balliu", "DF", 34, 74), P("Pacha Espino", "DF", 32, 73),
         P("Óscar Valentín", "MF", 32, 75), P("Pathé Ciss", "MF", 31, 75), P("Unai López", "MF", 30, 75), P("Isi Palazón", "MF", 31, 78), P("Pedro Díaz", "MF", 26, 73), P("Gerard Gumbau", "MF", 31, 73),
         P("Jorge de Frutos", "FW", 29, 77), P("Álvaro García", "FW", 33, 75), P("Sergio Camello", "FW", 25, 76), P("Randy Nteka", "FW", 28, 73),
       ]},
     { id: "get", name: "Getafe", short: "GET", nick: "Los Azulones", city: "Getafe", stadium: "Coliseum", colors: ["#005999", "#FFFFFF"], tier: 3,
       squad: [
         P("David Soria", "GK", 33, 77), P("Jiří Letáček", "GK", 28, 72),
         P("Domingos Duarte", "DF", 31, 76), P("Djené", "DF", 34, 76), P("Abdel Abqar", "DF", 26, 75), P("Juan Iglesias", "DF", 27, 75), P("Diego Rico", "DF", 33, 73), P("Kiko Femenía", "DF", 34, 73),
         P("Luis Milla", "MF", 29, 76), P("Mario Martín", "MF", 22, 73), P("Yellu Santiago", "MF", 23, 73), P("Christantus Uche", "MF", 22, 76), P("Álex Sola", "MF", 25, 73),
         P("Borja Mayoral", "FW", 29, 78), P("Mauro Arambarri", "MF", 31, 77), P("Coba da Costa", "FW", 21, 72), P("Adrián Liso", "FW", 20, 72), P("Peter Federico", "FW", 23, 73),
       ]},
     { id: "mll", name: "Mallorca", short: "MLL", nick: "Los Bermellones", city: "Palma", stadium: "Son Moix", colors: ["#E20613", "#000000"], tier: 2,
       squad: [
         P("Leo Román", "GK", 25, 76), P("Dominik Greif", "GK", 29, 74),
         P("Martin Valjent", "DF", 31, 77), P("Antonio Raíllo", "DF", 35, 75), P("Pablo Maffeo", "DF", 29, 77), P("Toni Lato", "DF", 29, 73), P("Johan Mojica", "DF", 33, 74), P("Mateu Morey", "DF", 26, 73),
         P("Sergi Darder", "MF", 32, 78), P("Antonio Sánchez", "MF", 29, 74), P("Manu Morlanes", "MF", 27, 75), P("Samú Costa", "MF", 25, 76), P("Pablo Torre", "MF", 23, 76),
         P("Vedat Muriqi", "FW", 32, 79), P("Takuma Asano", "FW", 32, 74), P("Mateo Joseph", "FW", 22, 76), P("Jan Virgili", "FW", 20, 72), P("Abdón Prats", "FW", 34, 72),
       ]},
     { id: "esn", name: "Espanyol", short: "ESP", nick: "Los Pericos", city: "Barcelona", stadium: "RCDE Stadium", colors: ["#007FC8", "#FFFFFF"], tier: 2,
       squad: [
         P("Marko Dmitrović", "GK", 34, 76), P("Fernando Pacheco", "GK", 33, 73),
         P("Leandro Cabrera", "DF", 35, 75), P("Sergi Gómez", "DF", 34, 73), P("Fernando Calero", "DF", 30, 75), P("Omar El Hilali", "DF", 22, 75), P("Carlos Romero", "DF", 24, 74), P("Riad Bajić", "DF", 24, 72),
         P("Pol Lozano", "MF", 26, 74), P("Edu Expósito", "MF", 29, 76), P("Ramón Terrats", "MF", 25, 74), P("Charles Pickel", "MF", 29, 74), P("Dani Rodríguez", "MF", 26, 73),
         P("Roberto Fernández", "FW", 23, 76), P("Javi Puado", "FW", 28, 78), P("Jofre Carreras", "FW", 24, 73), P("Kike García", "FW", 36, 74), P("Pere Milla", "FW", 33, 73),
       ]},
     { id: "alv", name: "Alavés", short: "ALV", nick: "El Glorioso", city: "Vitoria-Gasteiz", stadium: "Mendizorroza", colors: ["#0761AF", "#FFFFFF"], tier: 2,
       squad: [
         P("Antonio Sivera", "GK", 30, 76), P("Jesús Owono", "GK", 25, 72),
         P("Nahuel Tenaglia", "DF", 30, 74), P("Víctor Laguardia", "DF", 36, 73), P("Facundo Garcés", "DF", 26, 75), P("Jon Pacheco", "DF", 25, 75), P("Moussa Diarra", "DF", 25, 74), P("Andoni Gorosabel", "DF", 29, 73),
         P("Antonio Blanco", "MF", 25, 76), P("Carlos Vicente", "MF", 27, 75), P("Denis Suárez", "MF", 32, 75), P("Pablo Ibáñez", "MF", 27, 74), P("Jony", "MF", 35, 72),
         P("Stoichkov", "FW", 30, 74), P("Toni Martínez", "FW", 28, 75), P("Carles Aleñá", "MF", 28, 75), P("Lucas Boyé", "FW", 30, 76), P("Mariano Díaz", "FW", 33, 72),
       ]},
     { id: "elc", name: "Elche", short: "ELC", nick: "Los Franjiverdes", city: "Elche", stadium: "Martínez Valero", colors: ["#00913F", "#FFFFFF"], tier: 2,
       squad: [
         P("Matías Dituro", "GK", 38, 74), P("Iñaki Peña", "GK", 27, 76),
         P("Pedro Bigas", "DF", 36, 73), P("Víctor Chust", "DF", 26, 74), P("Adrià Pedrosa", "DF", 27, 73), P("Álvaro Núñez", "DF", 26, 74), P("Héctor Fort", "DF", 20, 74), P("John Donald", "DF", 24, 72),
         P("Aleix Febas", "MF", 30, 74), P("Marc Aguado", "MF", 24, 74), P("Nordin Amrabat", "MF", 39, 72), P("Josan", "MF", 36, 72), P("Nico Fernández", "FW", 25, 73),
         P("André Silva", "FW", 30, 77), P("Germán Valera", "FW", 24, 73), P("Rodrigo Mendoza", "MF", 20, 74), P("Álvaro Rodríguez", "FW", 22, 74), P("Fábio Silva", "FW", 24, 76),
       ]},
     { id: "lev", name: "Levante", short: "LEV", nick: "Los Granotas", city: "Valencia", stadium: "Ciutat de València", colors: ["#9E1C31", "#004B9F"], tier: 2,
       squad: [
         P("Andrés Fernández", "GK", 39, 73), P("Mathew Ryan", "GK", 34, 76),
         P("Unai Elgezabal", "DF", 32, 73), P("Matías Moreno", "DF", 22, 74), P("Jorge Cabello", "DF", 22, 72), P("Manu Sánchez", "DF", 26, 74), P("Adrián de la Fuente", "DF", 23, 72), P("Diego Pampín", "DF", 24, 72),
         P("Unai Vencedor", "MF", 25, 75), P("Kervin Arriaga", "MF", 28, 74), P("Pablo Martínez", "MF", 27, 73), P("Oriol Rey", "MF", 26, 73), P("Carlos Álvarez", "MF", 23, 76),
         P("Iván Romero", "FW", 24, 74), P("Etta Eyong", "FW", 22, 75), P("Goduine Koyalipou", "FW", 25, 73), P("Jeremy Toljan", "DF", 31, 73), P("José Luis Morales", "FW", 39, 73),
       ]},
     { id: "ovi", name: "Real Oviedo", short: "OVI", nick: "Los Carbayones", city: "Oviedo", stadium: "Carlos Tartiere", colors: ["#0033A0", "#FFFFFF"], tier: 2,
       squad: [
         P("Aarón Escandell", "GK", 30, 74), P("Braian Salvareschi", "GK", 26, 72),
         P("David Costas", "DF", 28, 73), P("Dani Calvo", "DF", 31, 74), P("Rahim Alhassane", "DF", 24, 72), P("Lucas Ahijado", "DF", 29, 72), P("Javi López", "DF", 32, 72), P("Nacho Vidal", "DF", 30, 73),
         P("Leander Dendoncker", "MF", 31, 77), P("Santiago Colombatto", "MF", 28, 74), P("Kwasi Sibo", "MF", 27, 73), P("Alberto Reina", "MF", 26, 73), P("Salomón Rondón", "FW", 37, 75),
         P("Haissem Hassan", "FW", 24, 73), P("Ilyas Chaira", "FW", 25, 73), P("Federico Viñas", "FW", 27, 74), P("Josip Brekalo", "FW", 28, 76), P("Alberto Toril", "FW", 23, 72),
       ]},
   ];

   // ---- SPAIN: SEGUNDA DIVISIÓN (22 — the lowest Spanish tier here) ----------
   const RAW_SEGUNDA = [
     { id: "dep", name: "Deportivo La Coruña", short: "DEP", nick: "Depor", city: "A Coruña", stadium: "Riazor", colors: ["#0067B1", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rac", name: "Racing Santander", short: "RAC", nick: "Los Verdiblancos", city: "Santander", stadium: "El Sardinero", colors: ["#009B48", "#FFFFFF"], tier: 2, squad: [] },
     { id: "zar", name: "Real Zaragoza", short: "ZAR", nick: "Los Maños", city: "Zaragoza", stadium: "La Romareda", colors: ["#FFFFFF", "#004B9F"], tier: 2, squad: [] },
     { id: "spg", name: "Sporting Gijón", short: "SPG", nick: "Los Rojiblancos", city: "Gijón", stadium: "El Molinón", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "vld", name: "Real Valladolid", short: "VLD", nick: "Pucela", city: "Valladolid", stadium: "José Zorrilla", colors: ["#7A1E7A", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lpa", name: "Las Palmas", short: "LPA", nick: "Los Amarillos", city: "Las Palmas", stadium: "Gran Canaria", colors: ["#FFE400", "#0055A5"], tier: 2, squad: [] },
     { id: "leg", name: "Leganés", short: "LEG", nick: "Los Pepineros", city: "Leganés", stadium: "Butarque", colors: ["#005BAC", "#FFFFFF"], tier: 2, squad: [] },
     { id: "alm", name: "Almería", short: "ALM", nick: "Los Rojiblancos", city: "Almería", stadium: "Power Horse Stadium", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "gra", name: "Granada", short: "GRA", nick: "Los Nazaríes", city: "Granada", stadium: "Nuevo Los Cármenes", colors: ["#C4122E", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cad", name: "Cádiz", short: "CAD", nick: "El Submarino Amarillo", city: "Cádiz", stadium: "Nuevo Mirandilla", colors: ["#FFE400", "#0055A5"], tier: 1, squad: [] },
     { id: "eib", name: "Eibar", short: "EIB", nick: "Los Armeros", city: "Eibar", stadium: "Ipurua", colors: ["#0A2340", "#E30613"], tier: 1, squad: [] },
     { id: "mag", name: "Málaga", short: "MAG", nick: "Los Boquerones", city: "Málaga", stadium: "La Rosaleda", colors: ["#0088CE", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hue", name: "Huesca", short: "HUE", nick: "Los Oscenses", city: "Huesca", stadium: "El Alcoraz", colors: ["#0055A5", "#E30613"], tier: 1, squad: [] },
     { id: "alb", name: "Albacete", short: "ALB", nick: "Los Manchegos", city: "Albacete", stadium: "Carlos Belmonte", colors: ["#FFFFFF", "#0055A5"], tier: 1, squad: [] },
     { id: "bgs", name: "Burgos", short: "BGS", nick: "Los Blanquinegros", city: "Burgos", stadium: "El Plantío", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cor", name: "Córdoba", short: "COR", nick: "El Califa", city: "Córdoba", stadium: "El Arcángel", colors: ["#00913F", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cst", name: "Castellón", short: "CST", nick: "Los Orelluts", city: "Castellón", stadium: "Castalia", colors: ["#000000", "#FFA300"], tier: 1, squad: [] },
     { id: "mir", name: "Mirandés", short: "MIR", nick: "Los Jabatos", city: "Miranda de Ebro", stadium: "Anduva", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "fer", name: "Racing Ferrol", short: "FER", nick: "Los Departamentales", city: "Ferrol", stadium: "A Malata", colors: ["#00913F", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ctg", name: "Cartagena", short: "CTG", nick: "El Efesé", city: "Cartagena", stadium: "Cartagonova", colors: ["#000000", "#E30613"], tier: 1, squad: [] },
     { id: "ten", name: "Tenerife", short: "TEN", nick: "Los Chicharreros", city: "Santa Cruz", stadium: "Heliodoro Rodríguez", colors: ["#0055A5", "#FFFFFF"], tier: 1, squad: [] },
     { id: "and", name: "FC Andorra", short: "AND", nick: "Els Tricolors", city: "Andorra la Vella", stadium: "Estadi Nacional", colors: ["#E30613", "#FDD000"], tier: 1, squad: [] },
   ];

   // =========================================================================
   // FOREIGN LEAGUES (Phase 3 — straight double round-robin nations)
   // Metadata only; these clubs are strength-only unless you manage in their
   // country (see freshClubsCopy). IDs are nation-prefixed so they can never
   // collide with English/Spanish ids or each other. Two tiers per nation with
   // simple 3-up / 3-down promotion & relegation.
   // =========================================================================

   // ---- GERMANY ----
   const RAW_DE_BL1 = [
     { id: "ger_bay", name: "Bayern Munich", short: "BAY", city: "Munich", stadium: "Allianz Arena", colors: ["#DC052D", "#FFFFFF"], tier: 5,
       squad: [
         P("Manuel Neuer", "GK", 40, 84), P("Jonas Urbig", "GK", 23, 74),
         P("Dayot Upamecano", "DF", 28, 85), P("Jonathan Tah", "DF", 30, 83), P("Kim Min-jae", "DF", 30, 82), P("Alphonso Davies", "DF", 26, 84), P("Josip Stanišić", "DF", 26, 78), P("Konrad Laimer", "DF", 29, 79), P("Sacha Boey", "DF", 26, 76),
         P("Joshua Kimmich", "MF", 31, 87), P("Aleksandar Pavlović", "MF", 22, 81), P("Leon Goretzka", "MF", 31, 80), P("João Palhinha", "MF", 31, 80), P("Tom Bischof", "MF", 21, 76),
         P("Harry Kane", "FW", 33, 89), P("Jamal Musiala", "FW", 23, 87), P("Michael Olise", "FW", 25, 86), P("Luis Díaz", "FW", 29, 84), P("Serge Gnabry", "FW", 31, 82), P("Kingsley Coman", "FW", 30, 82),
       ]},
     { id: "ger_lev", name: "Bayer Leverkusen", short: "LEV", city: "Leverkusen", stadium: "BayArena", colors: ["#E32219", "#000000"], tier: 5,
       squad: [
         P("Mark Flekken", "GK", 33, 79), P("Niklas Lomb", "GK", 33, 72),
         P("Edmond Tapsoba", "DF", 27, 82), P("Jarell Quansah", "DF", 23, 79), P("Alejandro Grimaldo", "DF", 31, 82), P("Nordi Mukiele", "DF", 28, 78), P("Arthur", "DF", 22, 76), P("Ibrahim Maza", "DF", 20, 76),
         P("Robert Andrich", "MF", 31, 79), P("Aleix García", "MF", 28, 79), P("Ezequiel Palacios", "MF", 27, 80), P("Equi Fernández", "MF", 23, 78), P("Claudio Echeverri", "MF", 20, 77),
         P("Patrik Schick", "FW", 30, 82), P("Malik Tillman", "FW", 24, 81), P("Eliesse Ben Seghir", "FW", 21, 78), P("Nathan Tella", "FW", 27, 78), P("Jonas Hofmann", "FW", 34, 76), P("Christian Kofane", "FW", 19, 74),
       ]},
     { id: "ger_rbl", name: "RB Leipzig", short: "RBL", city: "Leipzig", stadium: "Red Bull Arena", colors: ["#DD0741", "#FFFFFF"], tier: 4,
       squad: [
         P("Péter Gulácsi", "GK", 36, 79), P("Maarten Vandevoordt", "GK", 24, 76),
         P("Castello Lukeba", "DF", 24, 81), P("Willi Orbán", "DF", 34, 78), P("Lutsharel Geertruida", "DF", 26, 79), P("David Raum", "DF", 28, 80), P("El Chadaille Bitshiabu", "DF", 21, 77), P("Ridle Baku", "DF", 28, 77),
         P("Nicolas Seiwald", "MF", 25, 78), P("Xaver Schlager", "MF", 29, 79), P("Christoph Baumgartner", "MF", 27, 79), P("Assan Ouédraogo", "MF", 20, 77), P("Kevin Kampl", "MF", 35, 74),
         P("Loïs Openda", "FW", 26, 82), P("Johan Bakayoko", "FW", 23, 80), P("Antonio Nusa", "FW", 21, 80), P("Rômulo", "FW", 21, 77), P("Yussuf Poulsen", "FW", 32, 74),
       ]},
     { id: "ger_bvb", name: "Borussia Dortmund", short: "BVB", city: "Dortmund", stadium: "Signal Iduna Park", colors: ["#FDE100", "#000000"], tier: 5,
       squad: [
         P("Gregor Kobel", "GK", 29, 84), P("Alexander Meyer", "GK", 35, 72),
         P("Nico Schlotterbeck", "DF", 26, 83), P("Waldemar Anton", "DF", 29, 79), P("Niklas Süle", "DF", 31, 79), P("Ramy Bensebaini", "DF", 31, 78), P("Julian Ryerson", "DF", 29, 78), P("Yan Couto", "DF", 24, 78), P("Daniel Svensson", "DF", 24, 76),
         P("Marcel Sabitzer", "MF", 32, 79), P("Felix Nmecha", "MF", 26, 78), P("Jobe Bellingham", "MF", 21, 80), P("Pascal Groß", "MF", 35, 78), P("Carney Chukwuemeka", "MF", 22, 77),
         P("Serhou Guirassy", "FW", 30, 84), P("Karim Adeyemi", "FW", 25, 81), P("Julian Brandt", "FW", 30, 81), P("Maximilian Beier", "FW", 24, 79), P("Julien Duranville", "FW", 20, 75),
       ]},
     { id: "ger_sge", name: "Eintracht Frankfurt", short: "SGE", city: "Frankfurt", stadium: "Deutsche Bank Park", colors: ["#E1000F", "#000000"], tier: 4,
       squad: [
         P("Michael Zetterer", "GK", 31, 77), P("Kaua Santos", "GK", 23, 74),
         P("Robin Koch", "DF", 30, 80), P("Arthur Theate", "DF", 26, 78), P("Tuta", "DF", 27, 79), P("Rasmus Kristensen", "DF", 29, 76), P("Nathaniel Brown", "DF", 22, 76), P("Aurèle Amenda", "DF", 22, 75),
         P("Hugo Larsson", "MF", 22, 81), P("Ellyes Skhiri", "MF", 31, 78), P("Mario Götze", "MF", 34, 77), P("Farès Chaïbi", "MF", 24, 77), P("Can Uzun", "MF", 20, 78),
         P("Jonathan Burkardt", "FW", 26, 79), P("Ritsu Dōan", "FW", 28, 79), P("Ansgar Knauff", "FW", 24, 77), P("Jean-Mattéo Bahoya", "FW", 21, 77), P("Elye Wahi", "FW", 23, 78),
       ]},
     { id: "ger_vfb", name: "VfB Stuttgart", short: "VFB", city: "Stuttgart", stadium: "MHPArena", colors: ["#FFFFFF", "#E32219"], tier: 4,
       squad: [
         P("Alexander Nübel", "GK", 30, 82), P("Fabian Bredlow", "GK", 31, 73),
         P("Jeff Chabot", "DF", 28, 78), P("Ramon Hendriks", "DF", 24, 76), P("Maximilian Mittelstädt", "DF", 29, 79), P("Josha Vagnoman", "DF", 25, 76), P("Lorenz Assignon", "DF", 25, 77), P("Pascal Stenzel", "DF", 30, 73),
         P("Angelo Stiller", "MF", 25, 82), P("Atakan Karazor", "MF", 29, 77), P("Bilal El Khannouss", "MF", 22, 79), P("Chema Andrés", "MF", 21, 77), P("Yannik Keitel", "MF", 26, 74),
         P("Deniz Undav", "FW", 30, 82), P("Ermedin Demirović", "FW", 28, 79), P("Jamie Leweling", "FW", 25, 78), P("Badredine Bouanani", "FW", 21, 77), P("Chris Führich", "FW", 28, 78),
       ]},
     { id: "ger_wob", name: "VfL Wolfsburg", short: "WOB", city: "Wolfsburg", stadium: "Volkswagen Arena", colors: ["#65B32E", "#FFFFFF"], tier: 3,
       squad: [
         P("Kamil Grabara", "GK", 27, 77), P("Marius Müller", "GK", 32, 73),
         P("Konstantinos Koulierakis", "DF", 22, 77), P("Sebastiaan Bornauw", "DF", 27, 76), P("Denis Vavro", "DF", 30, 75), P("Joakim Mæhle", "DF", 29, 76), P("Kilian Fischer", "DF", 26, 74), P("Aleksandar Cvetković", "DF", 22, 73),
         P("Maximilian Arnold", "MF", 32, 77), P("Mattias Svanberg", "MF", 27, 77), P("Aster Vranckx", "MF", 24, 76), P("Yannick Gerhardt", "MF", 32, 74), P("Bence Dárdai", "MF", 20, 74),
         P("Mohamed Amoura", "FW", 26, 80), P("Jonas Wind", "FW", 27, 79), P("Andreas Skov Olsen", "FW", 26, 77), P("Patrick Wimmer", "FW", 25, 76), P("Tiago Tomás", "FW", 24, 76),
       ]},
     { id: "ger_scf", name: "SC Freiburg", short: "SCF", city: "Freiburg", stadium: "Europa-Park Stadion", colors: ["#000000", "#E2001A"], tier: 3,
       squad: [
         P("Noah Atubolu", "GK", 24, 77), P("Florian Müller", "GK", 28, 73),
         P("Philipp Lienhart", "DF", 30, 76), P("Matthias Ginter", "DF", 32, 77), P("Christian Günter", "DF", 33, 75), P("Jordy Makengo", "DF", 27, 74), P("Max Rosenfelder", "DF", 21, 74), P("Lukas Kübler", "DF", 33, 73),
         P("Vincenzo Grifo", "MF", 33, 78), P("Maximilian Eggestein", "MF", 29, 76), P("Merlin Röhl", "MF", 23, 76), P("Patrick Osterhage", "MF", 25, 75), P("Nicolas Höfler", "MF", 35, 74),
         P("Lucas Höler", "FW", 31, 74), P("Junior Adamu", "FW", 24, 75), P("Michael Gregoritsch", "FW", 32, 76), P("Igor Matanović", "FW", 22, 75), P("Eren Dinkçi", "FW", 24, 76),
       ]},
     { id: "ger_svw", name: "Werder Bremen", short: "SVW", city: "Bremen", stadium: "Weserstadion", colors: ["#1D9053", "#FFFFFF"], tier: 3,
       squad: [
         P("Mio Backhaus", "GK", 22, 75), P("Karl Hein", "GK", 24, 73),
         P("Marco Friedl", "DF", 28, 77), P("Amos Pieper", "DF", 28, 75), P("Niklas Stark", "DF", 31, 75), P("Mitchell Weiser", "DF", 32, 76), P("Julián Malatini", "DF", 24, 74), P("Felix Agu", "DF", 26, 74),
         P("Jens Stage", "MF", 29, 75), P("Romano Schmid", "MF", 26, 77), P("Leonardo Bittencourt", "MF", 33, 75), P("Senne Lynen", "MF", 26, 75), P("Karim Coulibaly", "MF", 22, 73),
         P("Marvin Ducksch", "FW", 32, 78), P("Justin Njinmah", "FW", 25, 76), P("Samuel Mbangula", "FW", 22, 77), P("Keke Topp", "FW", 22, 75), P("Isaac Schmidt", "FW", 26, 74),
       ]},
     { id: "ger_fca", name: "FC Augsburg", short: "FCA", city: "Augsburg", stadium: "WWK Arena", colors: ["#BA3733", "#FFFFFF"], tier: 2,
       squad: [
         P("Finn Dahmen", "GK", 28, 75), P("Nediljko Labrović", "GK", 26, 72),
         P("Jeffrey Gouweleeuw", "DF", 34, 73), P("Keven Schlotterbeck", "DF", 29, 73), P("Mads Pedersen", "DF", 30, 75), P("Chrislain Matsima", "DF", 24, 75), P("Henri Koudossou", "DF", 22, 73), P("Robert Gumny", "DF", 28, 73),
         P("Elvis Rexhbeçaj", "MF", 28, 74), P("Arne Maier", "MF", 27, 74), P("Kristijan Jakić", "MF", 28, 75), P("Fabian Rieder", "MF", 24, 77), P("Noahkai Banks", "MF", 19, 73),
         P("Alexis Claude-Maurice", "FW", 27, 76), P("Phillip Tietz", "FW", 28, 74), P("Mert Kömür", "FW", 20, 74), P("Samuel Essende", "FW", 27, 75),
       ]},
     { id: "ger_bmg", name: "Bor. Mönchengladbach", short: "BMG", city: "Mönchengladbach", stadium: "Borussia-Park", colors: ["#000000", "#FFFFFF"], tier: 3,
       squad: [
         P("Moritz Nicolas", "GK", 28, 74), P("Jan Olschowsky", "GK", 24, 72),
         P("Ko Itakura", "DF", 29, 78), P("Nico Elvedi", "DF", 29, 77), P("Marvin Friedrich", "DF", 30, 74), P("Joe Scally", "DF", 23, 76), P("Lukas Ullrich", "DF", 22, 73), P("Fabio Chiarodia", "DF", 21, 73),
         P("Julian Weigl", "MF", 30, 76), P("Rocco Reitz", "MF", 23, 77), P("Kevin Stöger", "MF", 32, 75), P("Florian Neuhaus", "MF", 29, 75), P("Philipp Sander", "MF", 27, 74),
         P("Tim Kleindienst", "FW", 30, 79), P("Franck Honorat", "FW", 29, 78), P("Haris Tabaković", "FW", 31, 75), P("Shuto Machino", "FW", 26, 76), P("Nathan Ngoumou", "FW", 25, 75),
       ]},
     { id: "ger_fcu", name: "Union Berlin", short: "FCU", city: "Berlin", stadium: "An der Alten Försterei", colors: ["#EB1923", "#FFFFFF"], tier: 3,
       squad: [
         P("Frederik Rønnow", "GK", 33, 77), P("Alexander Schwolow", "GK", 33, 72),
         P("Danilho Doekhi", "DF", 28, 77), P("Diogo Leite", "DF", 27, 77), P("Leopold Querfeld", "DF", 22, 74), P("Josip Juranović", "DF", 30, 76), P("Tom Rothe", "DF", 21, 75), P("Christopher Trimmel", "DF", 39, 72),
         P("Rani Khedira", "MF", 32, 76), P("András Schäfer", "MF", 27, 75), P("Janik Haberer", "MF", 32, 74), P("Aljoša Vasić", "MF", 23, 73), P("Ilyas Ansah", "MF", 21, 74),
         P("Andrej Ilić", "FW", 25, 76), P("Benedict Hollerbach", "FW", 24, 76), P("Woo-yeong Jeong", "FW", 26, 75), P("Oliver Burke", "FW", 29, 74), P("Tim Skarke", "FW", 29, 73),
       ]},
     { id: "ger_m05", name: "Mainz 05", short: "M05", city: "Mainz", stadium: "Mewa Arena", colors: ["#C3141E", "#FFFFFF"], tier: 3,
       squad: [
         P("Robin Zentner", "GK", 31, 76), P("Lasse Rieß", "GK", 24, 71),
         P("Sepp van den Berg", "DF", 24, 78), P("Andreas Hanche-Olsen", "DF", 29, 75), P("Stefan Bell", "DF", 34, 73), P("Maxim Leitsch", "DF", 28, 74), P("Phillipp Mwene", "DF", 32, 74), P("Danny da Costa", "DF", 33, 73),
         P("Kaishu Sano", "MF", 25, 77), P("Nadiem Amiri", "MF", 30, 78), P("Dominik Kohr", "MF", 32, 74), P("Paul Nebel", "MF", 23, 76), P("Lee Jae-sung", "MF", 34, 76),
         P("Nelson Weiper", "FW", 21, 75), P("Armindo Sieb", "FW", 23, 75), P("Aymen Barkok", "FW", 27, 74), P("Nikolas Veratschnig", "FW", 21, 73), P("Marco Richter", "FW", 28, 74),
       ]},
     { id: "ger_tsg", name: "TSG Hoffenheim", short: "TSG", city: "Sinsheim", stadium: "PreZero Arena", colors: ["#1C63B7", "#FFFFFF"], tier: 3,
       squad: [
         P("Oliver Baumann", "GK", 36, 77), P("Luca Philipp", "GK", 25, 71),
         P("Ozan Kabak", "DF", 26, 78), P("Stanley Nsoki", "DF", 27, 75), P("Robin Hranáč", "DF", 26, 75), P("Koki Machida", "DF", 28, 75), P("Bernardo", "DF", 31, 74), P("Melayro Bogarde", "DF", 24, 73),
         P("Anton Stach", "MF", 27, 77), P("Grischa Prömel", "MF", 31, 76), P("Dennis Geiger", "MF", 28, 74), P("Umut Tohumcu", "MF", 22, 74), P("Muhammed Damar", "MF", 22, 73),
         P("Andrej Kramarić", "FW", 35, 77), P("Adam Hložek", "FW", 23, 78), P("Fisnik Asllani", "FW", 23, 76), P("Max Moerstedt", "FW", 20, 74), P("Bazoumana Touré", "FW", 21, 75),
       ]},
     { id: "ger_hdh", name: "1. FC Heidenheim", short: "HDH", city: "Heidenheim", stadium: "Voith-Arena", colors: ["#E30613", "#003DA5"], tier: 2,
       squad: [
         P("Kevin Müller", "GK", 34, 73), P("Diant Ramaj", "GK", 24, 75),
         P("Patrick Mainka", "DF", 31, 73), P("Benedikt Gimber", "DF", 28, 72), P("Tim Siersleben", "DF", 25, 73), P("Jonas Föhrenbach", "DF", 29, 72), P("Omar Traoré", "DF", 26, 72), P("Lennard Maloney", "DF", 26, 73),
         P("Niklas Dorsch", "MF", 28, 74), P("Julian Niehues", "MF", 24, 73), P("Léo Scienza", "MF", 27, 75), P("Adrian Beck", "MF", 29, 73), P("Mathias Honsak", "MF", 29, 73),
         P("Budu Zivzivadze", "FW", 31, 74), P("Sirlord Conteh", "FW", 29, 72), P("Marvin Pieringer", "FW", 26, 72), P("Stefan Schimmer", "FW", 31, 71),
       ]},
     { id: "ger_koe", name: "1. FC Köln", short: "KOE", city: "Cologne", stadium: "RheinEnergieStadion", colors: ["#ED1C24", "#FFFFFF"], tier: 3,
       squad: [
         P("Marvin Schwäbe", "GK", 31, 75), P("Matthias Köbbing", "GK", 32, 71),
         P("Timo Hübers", "DF", 30, 74), P("Dominique Heintz", "DF", 33, 72), P("Joel Schmied", "DF", 27, 73), P("Rav van den Berg", "DF", 21, 75), P("Leart Paçarada", "DF", 28, 72), P("Elias Bakatukanda", "DF", 21, 73),
         P("Eric Martel", "MF", 24, 75), P("Denis Huseinbašić", "MF", 25, 73), P("Isak Johannesson", "MF", 23, 74), P("Florian Kainz", "MF", 33, 75), P("Marius Bülter", "MF", 33, 75),
         P("Ragnar Ache", "FW", 27, 77), P("Jakub Kamiński", "FW", 24, 76), P("Luca Waldschmidt", "FW", 30, 75), P("Said El Mala", "FW", 20, 75), P("Damion Downs", "FW", 21, 74),
       ]},
     { id: "ger_hsv", name: "Hamburger SV", short: "HSV", city: "Hamburg", stadium: "Volksparkstadion", colors: ["#0A3F88", "#FFFFFF"], tier: 3,
       squad: [
         P("Daniel Heuer Fernandes", "GK", 33, 74), P("Matheo Raab", "GK", 26, 71),
         P("Sebastian Schonlau", "DF", 32, 73), P("Luka Vušković", "DF", 19, 76), P("Dennis Hadžikadunić", "DF", 27, 73), P("Miro Muheim", "DF", 28, 74), P("Guilherme Ramos", "DF", 28, 73), P("William Mikelbrencis", "DF", 22, 72),
         P("Ludovit Reis", "MF", 25, 76), P("Jonas Meffert", "MF", 31, 74), P("Nicolai Remberg", "MF", 25, 73), P("Immanuel Pherai", "MF", 24, 74), P("Fabio Baldé", "MF", 20, 73),
         P("Robert Glatzel", "FW", 32, 76), P("Ransford Königsdörffer", "FW", 24, 75), P("Jean-Luc Dompé", "FW", 30, 76), P("Rayan Philippe", "FW", 25, 75), P("Bakery Jatta", "FW", 28, 74),
       ]},
     { id: "ger_stp", name: "FC St. Pauli", short: "STP", city: "Hamburg", stadium: "Millerntor", colors: ["#61371F", "#FFFFFF"], tier: 2,
       squad: [
         P("Nikola Vasilj", "GK", 30, 74), P("Ben Voll", "GK", 22, 70),
         P("Hauke Wahl", "DF", 32, 73), P("Karol Mets", "DF", 32, 72), P("Eric Smith", "DF", 29, 73), P("Philipp Treu", "DF", 24, 73), P("Lars Ritzka", "DF", 28, 72), P("James Sands", "DF", 25, 73),
         P("Jackson Irvine", "MF", 33, 75), P("Carlo Boukhalfa", "MF", 26, 73), P("Danel Sinani", "MF", 29, 74), P("Connor Metcalfe", "MF", 26, 74), P("Mathias Pereira Lage", "MF", 28, 73),
         P("Andreas Albers", "FW", 35, 72), P("Oladapo Afolayan", "FW", 28, 74), P("Elias Saad", "FW", 26, 75), P("Martijn Kaars", "FW", 27, 74),
       ]},
   ];
   const RAW_DE_BL2 = [
     { id: "ger_s04", name: "Schalke 04", short: "S04", colors: ["#004D9D", "#FFFFFF"], tier: 3, squad: [] },
     { id: "ger_bsc", name: "Hertha BSC", short: "BSC", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ger_f95", name: "Fortuna Düsseldorf", short: "F95", colors: ["#E2001A", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ger_h96", name: "Hannover 96", short: "H96", colors: ["#00966E", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ger_fck", name: "1. FC Kaiserslautern", short: "FCK", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ger_fcn", name: "1. FC Nürnberg", short: "FCN", colors: ["#8C1B1B", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ger_scp", name: "SC Paderborn", short: "SCP", colors: ["#003D8F", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_svd", name: "SV Darmstadt 98", short: "SVD", colors: ["#004E9E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_ksc", name: "Karlsruher SC", short: "KSC", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_ksv", name: "Holstein Kiel", short: "KSV", colors: ["#005AAA", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_boc", name: "VfL Bochum", short: "BOC", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ger_sgf", name: "Greuther Fürth", short: "SGF", colors: ["#00966E", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_ebs", name: "Eintracht Braunschweig", short: "EBS", colors: ["#FFD700", "#0033A0"], tier: 1, squad: [] },
     { id: "ger_prm", name: "Preußen Münster", short: "PRM", colors: ["#007A33", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_elv", name: "SV Elversberg", short: "ELV", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ger_fcm", name: "1. FC Magdeburg", short: "FCM", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_dsc", name: "Arminia Bielefeld", short: "DSC", colors: ["#0069B4", "#000000"], tier: 1, squad: [] },
     { id: "ger_sgd", name: "Dynamo Dresden", short: "SGD", colors: ["#FFCC00", "#000000"], tier: 1, squad: [] },
   ];

   // ---- ITALY ----
   const RAW_IT_SA = [
     { id: "ita_int", name: "Inter", short: "INT", city: "Milan", stadium: "San Siro", colors: ["#0068A8", "#000000"], tier: 5,
       squad: [
         P("Yann Sommer", "GK", 37, 82), P("Josep Martínez", "GK", 28, 76),
         P("Alessandro Bastoni", "DF", 27, 86), P("Benjamin Pavard", "DF", 30, 82), P("Federico Dimarco", "DF", 29, 83), P("Denzel Dumfries", "DF", 30, 82), P("Yann Bisseck", "DF", 25, 79), P("Francesco Acerbi", "DF", 38, 78), P("Stefan de Vrij", "DF", 34, 77),
         P("Nicolò Barella", "MF", 29, 87), P("Hakan Çalhanoğlu", "MF", 32, 85), P("Davide Frattesi", "MF", 26, 81), P("Piotr Zieliński", "MF", 32, 79), P("Petar Sučić", "MF", 22, 78), P("Henrikh Mkhitaryan", "MF", 37, 77),
         P("Lautaro Martínez", "FW", 29, 88), P("Marcus Thuram", "FW", 29, 85), P("Mehdi Taremi", "FW", 34, 78), P("Ange-Yoan Bonny", "FW", 22, 78), P("Francesco Pio Esposito", "FW", 21, 76),
       ]},
     { id: "ita_mil", name: "AC Milan", short: "MIL", city: "Milan", stadium: "San Siro", colors: ["#FB090B", "#000000"], tier: 5,
       squad: [
         P("Mike Maignan", "GK", 31, 85), P("Marco Sportiello", "GK", 34, 73),
         P("Fikayo Tomori", "DF", 28, 82), P("Strahinja Pavlović", "DF", 25, 80), P("Matteo Gabbia", "DF", 27, 79), P("Pervis Estupiñán", "DF", 28, 79), P("Koni De Winter", "DF", 23, 78), P("Davide Bartesaghi", "DF", 20, 74),
         P("Youssouf Fofana", "MF", 27, 81), P("Samuele Ricci", "MF", 24, 79), P("Luka Modrić", "MF", 40, 80), P("Ardon Jashari", "MF", 23, 78), P("Ruben Loftus-Cheek", "MF", 30, 79), P("Yunus Musah", "MF", 23, 76),
         P("Rafael Leão", "FW", 27, 85), P("Christian Pulisic", "FW", 28, 84), P("Christopher Nkunku", "FW", 28, 81), P("Santiago Giménez", "FW", 25, 79), P("Samuel Chukwueze", "FW", 26, 78),
       ]},
     { id: "ita_juv", name: "Juventus", short: "JUV", city: "Turin", stadium: "Allianz Stadium", colors: ["#000000", "#FFFFFF"], tier: 5,
       squad: [
         P("Michele Di Gregorio", "GK", 29, 81), P("Mattia Perin", "GK", 33, 74),
         P("Gleison Bremer", "DF", 29, 84), P("Andrea Cambiaso", "DF", 26, 81), P("Federico Gatti", "DF", 28, 79), P("Pierre Kalulu", "DF", 26, 79), P("Lloyd Kelly", "DF", 27, 76), P("Juan Cabal", "DF", 24, 76), P("Daniele Rugani", "DF", 32, 73),
         P("Khéphren Thuram", "MF", 25, 81), P("Manuel Locatelli", "MF", 28, 80), P("Teun Koopmeiners", "MF", 28, 80), P("Douglas Luiz", "MF", 28, 78), P("Weston McKennie", "MF", 28, 78), P("Fabio Miretti", "MF", 23, 76),
         P("Kenan Yıldız", "FW", 21, 83), P("Dušan Vlahović", "FW", 26, 82), P("Jonathan David", "FW", 26, 82), P("Randal Kolo Muani", "FW", 27, 81), P("Francisco Conceição", "FW", 23, 79),
       ]},
     { id: "ita_nap", name: "Napoli", short: "NAP", city: "Naples", stadium: "Diego Maradona", colors: ["#12A0D7", "#FFFFFF"], tier: 5,
       squad: [
         P("Alex Meret", "GK", 29, 80), P("Vanja Milinković-Savić", "GK", 29, 78),
         P("Alessandro Buongiorno", "DF", 27, 82), P("Amir Rrahmani", "DF", 32, 81), P("Giovanni Di Lorenzo", "DF", 33, 82), P("Sam Beukema", "DF", 27, 79), P("Mathías Olivera", "DF", 28, 78), P("Leonardo Spinazzola", "DF", 33, 77), P("Juan Jesus", "DF", 35, 73),
         P("Kevin De Bruyne", "MF", 35, 86), P("Scott McTominay", "MF", 29, 84), P("Stanislav Lobotka", "MF", 31, 82), P("Frank Anguissa", "MF", 30, 82), P("Billy Gilmour", "MF", 25, 77), P("Eljif Elmas", "MF", 26, 77),
         P("Romelu Lukaku", "FW", 33, 82), P("Rasmus Højlund", "FW", 23, 80), P("David Neres", "FW", 29, 80), P("Lorenzo Lucca", "FW", 25, 78), P("Noa Lang", "FW", 26, 78), P("Matteo Politano", "FW", 33, 78),
       ]},
     { id: "ita_rom", name: "AS Roma", short: "ROM", city: "Rome", stadium: "Stadio Olimpico", colors: ["#8E1F2F", "#F0BC42"], tier: 4,
       squad: [
         P("Mile Svilar", "GK", 27, 82), P("Pierluigi Gollini", "GK", 31, 73),
         P("Evan Ndicka", "DF", 27, 81), P("Gianluca Mancini", "DF", 30, 80), P("Mario Hermoso", "DF", 31, 78), P("Angeliño", "DF", 29, 79), P("Wesley", "DF", 22, 77), P("Zeki Çelik", "DF", 29, 76), P("Devyne Rensch", "DF", 23, 76),
         P("Manu Koné", "MF", 25, 82), P("Lorenzo Pellegrini", "MF", 30, 80), P("Leandro Paredes", "MF", 32, 79), P("Bryan Cristante", "MF", 31, 78), P("Neil El Aynaoui", "MF", 24, 76), P("Niccolò Pisilli", "MF", 21, 75),
         P("Paulo Dybala", "FW", 33, 83), P("Matías Soulé", "FW", 23, 80), P("Artem Dovbyk", "FW", 28, 80), P("Evan Ferguson", "FW", 22, 77), P("Stephan El Shaarawy", "FW", 33, 76),
       ]},
     { id: "ita_laz", name: "Lazio", short: "LAZ", city: "Rome", stadium: "Stadio Olimpico", colors: ["#87D8F7", "#FFFFFF"], tier: 4,
       squad: [
         P("Ivan Provedel", "GK", 32, 79), P("Christos Mandas", "GK", 25, 75),
         P("Alessio Romagnoli", "DF", 31, 80), P("Mario Gila", "DF", 26, 79), P("Nuno Tavares", "DF", 26, 78), P("Adam Marušić", "DF", 33, 76), P("Manuel Lazzari", "DF", 33, 74), P("Patric", "DF", 33, 73), P("Oliver Provstgaard", "DF", 22, 74),
         P("Nicolò Rovella", "MF", 24, 81), P("Matteo Guendouzi", "MF", 27, 81), P("Mattia Zaccagni", "MF", 31, 81), P("Danilo Cataldi", "MF", 31, 75), P("Fisayo Dele-Bashiru", "MF", 24, 76), P("Toma Bašić", "MF", 29, 73),
         P("Valentín Castellanos", "FW", 28, 79), P("Boulaye Dia", "FW", 30, 78), P("Gustav Isaksen", "FW", 25, 77), P("Pedro", "FW", 39, 76), P("Tijjani Noslin", "FW", 26, 75),
       ]},
     { id: "ita_ata", name: "Atalanta", short: "ATA", city: "Bergamo", stadium: "Gewiss Stadium", colors: ["#1E71B8", "#000000"], tier: 4,
       squad: [
         P("Marco Carnesecchi", "GK", 26, 81), P("Francesco Rossi", "GK", 34, 72),
         P("Isak Hien", "DF", 27, 80), P("Giorgio Scalvini", "DF", 23, 79), P("Berat Djimsiti", "DF", 33, 78), P("Odilon Kossounou", "DF", 25, 77), P("Raoul Bellanova", "DF", 26, 80), P("Davide Zappacosta", "DF", 34, 76), P("Sead Kolašinac", "DF", 33, 76),
         P("Éderson", "MF", 27, 83), P("Charles De Ketelaere", "MF", 25, 82), P("Mario Pašalić", "MF", 31, 78), P("Marten de Roon", "MF", 35, 77), P("Lazar Samardžić", "MF", 24, 78), P("Marc Brescianini", "MF", 23, 76),
         P("Ademola Lookman", "FW", 29, 84), P("Gianluca Scamacca", "FW", 28, 81), P("Nikola Krstović", "FW", 25, 79), P("Daniel Maldini", "FW", 24, 77),
       ]},
     { id: "ita_fio", name: "Fiorentina", short: "FIO", city: "Florence", stadium: "Artemio Franchi", colors: ["#592C82", "#FFFFFF"], tier: 3,
       squad: [
         P("David de Gea", "GK", 36, 81), P("Tommaso Martinelli", "GK", 20, 72),
         P("Pietro Comuzzo", "DF", 21, 78), P("Luca Ranieri", "DF", 27, 77), P("Marin Pongračić", "DF", 29, 77), P("Dodô", "DF", 27, 80), P("Robin Gosens", "DF", 32, 78), P("Pablo Marí", "DF", 33, 74), P("Niccolò Fortini", "DF", 20, 73),
         P("Nicolò Fagioli", "MF", 25, 78), P("Rolando Mandragora", "MF", 29, 77), P("Simon Sohm", "MF", 24, 77), P("Hans Nicolussi Caviglia", "MF", 26, 75), P("Cher Ndour", "MF", 21, 75),
         P("Moise Kean", "FW", 26, 83), P("Albert Guðmundsson", "FW", 29, 80), P("Roberto Piccoli", "FW", 24, 78), P("Edin Džeko", "FW", 40, 76),
       ]},
     { id: "ita_bol", name: "Bologna", short: "BOL", city: "Bologna", stadium: "Renato Dall'Ara", colors: ["#A21C26", "#1A2F48"], tier: 4,
       squad: [
         P("Łukasz Skorupski", "GK", 35, 78), P("Federico Ravaglia", "GK", 26, 73),
         P("Jhon Lucumí", "DF", 27, 79), P("Torbjørn Heggem", "DF", 26, 77), P("Martin Vitík", "DF", 22, 76), P("Emil Holm", "DF", 25, 76), P("Nadir Zortea", "DF", 26, 76), P("Juan Miranda", "DF", 26, 75), P("Charalampos Lykogiannis", "DF", 32, 74),
         P("Lewis Ferguson", "MF", 27, 80), P("Remo Freuler", "MF", 34, 78), P("Giovanni Fabbian", "MF", 22, 77), P("Nikola Moro", "MF", 27, 75), P("Tommaso Pobega", "MF", 26, 76),
         P("Riccardo Orsolini", "FW", 29, 81), P("Santiago Castro", "FW", 21, 79), P("Thijs Dallinga", "FW", 25, 77), P("Jens Odgaard", "FW", 26, 76), P("Federico Bernardeschi", "FW", 32, 76),
       ]},
     { id: "ita_tor", name: "Torino", short: "TOR", city: "Turin", stadium: "Olimpico Grande Torino", colors: ["#8A1E03", "#FFFFFF"], tier: 3,
       squad: [
         P("Franco Israel", "GK", 25, 75), P("Alberto Paleari", "GK", 33, 72),
         P("Saúl Coco", "DF", 26, 77), P("Guillermo Maripán", "DF", 32, 77), P("Adam Masina", "DF", 32, 74), P("Marcus Pedersen", "DF", 25, 74), P("Valentino Lazaro", "DF", 30, 74), P("Ali Dembélé", "DF", 21, 73),
         P("Cesare Casadei", "MF", 23, 78), P("Nikola Vlašić", "MF", 28, 78), P("Ivan Ilić", "MF", 25, 76), P("Gvidas Gineitis", "MF", 22, 74), P("Emirhan İlkhan", "MF", 21, 73),
         P("Che Adams", "FW", 30, 77), P("Giovanni Simeone", "FW", 30, 78), P("Duván Zapata", "FW", 35, 76), P("Cyril Ngonge", "FW", 25, 76), P("Antonio Sanabria", "FW", 30, 75),
       ]},
     { id: "ita_udi", name: "Udinese", short: "UDI", city: "Udine", stadium: "Bluenergy Stadium", colors: ["#000000", "#FFFFFF"], tier: 3,
       squad: [
         P("Maduka Okoye", "GK", 26, 75), P("Razvan Sava", "GK", 23, 73),
         P("Oumar Solet", "DF", 26, 78), P("Thomas Kristensen", "DF", 28, 74), P("Lautaro Giannetti", "DF", 32, 74), P("Kingsley Ehizibue", "DF", 30, 73), P("Jordan Zemura", "DF", 26, 74), P("Hassane Kamara", "DF", 31, 75), P("Christian Kabasele", "DF", 34, 72),
         P("Sandi Lovrić", "MF", 27, 77), P("Arthur Atta", "MF", 22, 76), P("Jesper Karlström", "MF", 30, 74), P("Jurgen Ekkelenkamp", "MF", 25, 74), P("Oier Zarraga", "MF", 26, 74),
         P("Keinan Davis", "FW", 27, 75), P("Iker Bravo", "FW", 20, 74), P("Vakoun Bayo", "FW", 28, 74), P("Nicolò Zaniolo", "FW", 26, 77),
       ]},
     { id: "ita_gen", name: "Genoa", short: "GEN", city: "Genoa", stadium: "Luigi Ferraris", colors: ["#A21C26", "#0A2340"], tier: 2,
       squad: [
         P("Nicola Leali", "GK", 32, 75), P("Daniele Sommariva", "GK", 26, 71),
         P("Johan Vásquez", "DF", 27, 77), P("Alessandro Vogliacco", "DF", 28, 73), P("Aaron Martín", "DF", 29, 74), P("Brooke Norton-Cuffy", "DF", 21, 74), P("Stefano Sabelli", "DF", 33, 73), P("Sebastian Otoa", "DF", 22, 72),
         P("Morten Frendrup", "MF", 25, 77), P("Ruslan Malinovskyi", "MF", 32, 78), P("Nicolae Stanciu", "MF", 33, 76), P("Patrizio Masini", "MF", 23, 73), P("Milan Badelj", "MF", 37, 72),
         P("Andrea Pinamonti", "FW", 27, 78), P("Vitinha", "FW", 25, 76), P("Lorenzo Colombo", "FW", 24, 75), P("Junior Messias", "FW", 35, 74), P("Caleb Ekuban", "FW", 31, 73),
       ]},
     { id: "ita_com", name: "Como", short: "COM", city: "Como", stadium: "Giuseppe Sinigaglia", colors: ["#003DA5", "#FFFFFF"], tier: 2,
       squad: [
         P("Jean Butez", "GK", 30, 75), P("Pepe Reina", "GK", 44, 72),
         P("Marc-Oliver Kempf", "DF", 31, 74), P("Alberto Dossena", "DF", 27, 75), P("Jacobo Ramón", "DF", 20, 74), P("Alex Valle", "DF", 22, 74), P("Fellipe Jack", "DF", 20, 73), P("Edoardo Goldaniga", "DF", 33, 73),
         P("Nico Paz", "MF", 22, 82), P("Máximo Perrone", "MF", 23, 76), P("Sergi Roberto", "MF", 34, 75), P("Lucas Da Cunha", "MF", 24, 75), P("Simone Verdi", "MF", 33, 73),
         P("Álvaro Morata", "FW", 33, 79), P("Assane Diao", "FW", 20, 77), P("Anastasios Douvikas", "FW", 26, 76), P("Patrick Cutrone", "FW", 28, 75), P("Jesús Rodríguez", "FW", 20, 74),
       ]},
     { id: "ita_cag", name: "Cagliari", short: "CAG", city: "Cagliari", stadium: "Unipol Domus", colors: ["#A50021", "#00286B"], tier: 2,
       squad: [
         P("Elia Caprile", "GK", 24, 76), P("Simone Scuffet", "GK", 29, 73),
         P("Yerry Mina", "DF", 31, 76), P("Sebastiano Luperto", "DF", 29, 74), P("Adam Obert", "DF", 23, 73), P("Gabriele Zappa", "DF", 26, 74), P("Tommaso Augello", "DF", 31, 73), P("Riyad Idrissi", "DF", 21, 72),
         P("Antoine Makoumbou", "MF", 27, 74), P("Michel Adopo", "MF", 25, 73), P("Michele Prati", "MF", 22, 73), P("Yerson Mosquera", "MF", 24, 73), P("Matteo Prati", "MF", 22, 74),
         P("Sebastiano Esposito", "FW", 23, 76), P("Andrea Belotti", "FW", 32, 76), P("Zito Luvumbo", "FW", 23, 76), P("Leonardo Pavoletti", "FW", 37, 73), P("Gennaro Borrelli", "FW", 25, 73),
       ]},
     { id: "ita_ver", name: "Hellas Verona", short: "VER", city: "Verona", stadium: "Marcantonio Bentegodi", colors: ["#FFD700", "#0A2340"], tier: 2,
       squad: [
         P("Lorenzo Montipò", "GK", 30, 75), P("Simone Perilli", "GK", 31, 71),
         P("Martin Frese", "DF", 24, 73), P("Daniele Ghilardi", "DF", 23, 74), P("Unai Núñez", "DF", 29, 75), P("Victor Nelsson", "DF", 27, 76), P("Jackson Tchatchoua", "DF", 24, 74), P("Nicolò Bella", "DF", 21, 71),
         P("Suat Serdar", "MF", 29, 75), P("Reda Belahyane", "MF", 22, 74), P("Grigoris Kastanos", "MF", 28, 74), P("Antoine Bernede", "MF", 27, 73), P("Ondrej Duda", "MF", 31, 74),
         P("Gift Orban", "FW", 23, 76), P("Amin Sarr", "FW", 24, 74), P("Casper Tengstedt", "FW", 26, 74), P("Daniel Mosquera", "FW", 24, 73),
       ]},
     { id: "ita_lec", name: "Lecce", short: "LEC", city: "Lecce", stadium: "Via del Mare", colors: ["#FFD700", "#E30613"], tier: 2,
       squad: [
         P("Wladimiro Falcone", "GK", 30, 76), P("Christian Früchtl", "GK", 26, 72),
         P("Federico Baschirotto", "DF", 30, 75), P("Kialonda Gaspar", "DF", 24, 73), P("Frederic Guilbert", "DF", 31, 73), P("Antonino Gallo", "DF", 26, 74), P("Danilo Veiga", "DF", 22, 72), P("Tiago Gabriel", "DF", 21, 73),
         P("Ylber Ramadani", "MF", 29, 75), P("Balthazar Pierret", "MF", 25, 73), P("Lassana Coulibaly", "MF", 29, 74), P("Medon Berisha", "MF", 22, 73), P("Hamza Rafia", "MF", 26, 73),
         P("Nikola Štulić", "FW", 24, 74), P("Santiago Pierotti", "FW", 24, 73), P("Lameck Banda", "FW", 24, 74), P("Francesco Camarda", "FW", 18, 74),
       ]},
     { id: "ita_par", name: "Parma", short: "PAR", city: "Parma", stadium: "Ennio Tardini", colors: ["#FFD700", "#0A2340"], tier: 2,
       squad: [
         P("Zion Suzuki", "GK", 24, 78), P("Filippo Corvi", "GK", 22, 71),
         P("Giovanni Leoni", "DF", 19, 77), P("Yordan Osorio", "DF", 32, 73), P("Lautaro Valenti", "DF", 25, 73), P("Emanuele Valeri", "DF", 28, 73), P("Alessandro Circati", "DF", 22, 75), P("Enrico Delprato", "DF", 26, 74),
         P("Nahuel Estévez", "MF", 30, 73), P("Adrián Bernabé", "MF", 24, 76), P("Drissa Camara", "MF", 24, 73), P("Mandela Keita", "MF", 23, 74), P("Christian Ordóñez", "MF", 21, 73),
         P("Pontus Almqvist", "FW", 26, 74), P("Mateo Pellegrino", "FW", 24, 75), P("Chaka Traoré", "FW", 21, 73), P("Dennis Man", "FW", 28, 77),
       ]},
     { id: "ita_pis", name: "Pisa", short: "PIS", city: "Pisa", stadium: "Arena Garibaldi", colors: ["#0A2340", "#FFFFFF"], tier: 2,
       squad: [
         P("Adrian Šemper", "GK", 28, 73), P("Nicolas Andrade", "GK", 27, 70),
         P("Antonio Caracciolo", "DF", 34, 72), P("Simone Canestrelli", "DF", 25, 75), P("Arturo Calabresi", "DF", 29, 72), P("Giovanni Bonfanti", "DF", 23, 72), P("Michel Aebischer", "DF", 28, 76), P("Samuele Angori", "DF", 22, 72),
         P("Marius Marin", "MF", 27, 74), P("Idrissa Touré", "MF", 27, 73), P("Ebenezer Akinsanmiro", "MF", 21, 74), P("Isak Vural", "MF", 21, 72), P("Daniel Denøli", "MF", 22, 71),
         P("M'Bala Nzola", "FW", 29, 75), P("Henrik Meister", "FW", 22, 73), P("Stefano Moreo", "FW", 32, 72), P("Juan Cuadrado", "FW", 38, 74),
       ]},
     { id: "ita_cre", name: "Cremonese", short: "CRE", city: "Cremona", stadium: "Giovanni Zini", colors: ["#A21C26", "#808080"], tier: 1,
       squad: [
         P("Emil Audero", "GK", 29, 75), P("Marco Silvestri", "GK", 35, 73),
         P("Matteo Bianchetti", "DF", 32, 72), P("Filippo Terracciano", "DF", 22, 74), P("Luka Lochoshvili", "DF", 27, 73), P("Alessio Zerbin", "DF", 26, 73), P("Palmer Salvador", "DF", 24, 71), P("Bartosz Bereszyński", "DF", 33, 72),
         P("Michele Castagnetti", "MF", 36, 71), P("Warren Bondo", "MF", 22, 74), P("Romano Floriani Mussolini", "MF", 22, 72), P("Alberto Grassi", "MF", 30, 72), P("Jamie Vardy", "FW", 39, 75),
         P("Federico Bonazzoli", "FW", 28, 74), P("David Okereke", "FW", 28, 74), P("Manuel De Luca", "FW", 27, 72), P("Franco Vázquez", "FW", 37, 73),
       ]},
     { id: "ita_sas", name: "Sassuolo", short: "SAS", city: "Sassuolo", stadium: "Mapei Stadium", colors: ["#00A752", "#000000"], tier: 2,
       squad: [
         P("Stefano Turati", "GK", 24, 74), P("Alessio Cragno", "GK", 32, 72),
         P("Josh Doig", "DF", 24, 74), P("Tarik Muharemović", "DF", 22, 74), P("Filippo Romagna", "DF", 29, 72), P("Jay Idzes", "DF", 26, 77), P("Wisdom Amey", "DF", 20, 72), P("Fali Candé", "DF", 27, 73),
         P("Kristian Thorstvedt", "MF", 27, 76), P("Daniel Boloca", "MF", 27, 74), P("Nedim Bajrami", "MF", 27, 75), P("Matías Vecino", "MF", 35, 73), P("Ismaël Koné", "MF", 24, 74),
         P("Luca Moro", "FW", 24, 73), P("Domenico Berardi", "FW", 32, 80), P("Armand Laurienté", "FW", 27, 78), P("Walid Cheddira", "FW", 28, 74),
       ]},
   ];
   const RAW_IT_SB = [
     { id: "ita_pal", name: "Palermo", short: "PAL", colors: ["#E5A6C8", "#000000"], tier: 2, squad: [] },
     { id: "ita_sam", name: "Sampdoria", short: "SAM", colors: ["#1B5497", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ita_bari", name: "Bari", short: "BAR", colors: ["#E2001A", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_spe", name: "Spezia", short: "SPE", colors: ["#FFFFFF", "#000000"], tier: 1, squad: [] },
     { id: "ita_ces", name: "Cesena", short: "CES", colors: ["#A21C26", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_fro", name: "Frosinone", short: "FRO", colors: ["#FFD700", "#0A2340"], tier: 1, squad: [] },
     { id: "ita_mod", name: "Modena", short: "MOD", colors: ["#FFD700", "#0A2340"], tier: 1, squad: [] },
     { id: "ita_reg", name: "Reggiana", short: "REG", colors: ["#A21C26", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_cat", name: "Catanzaro", short: "CAT", colors: ["#FFD700", "#E30613"], tier: 1, squad: [] },
     { id: "ita_bre", name: "Brescia", short: "BRE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_cos", name: "Cosenza", short: "COS", colors: ["#E30613", "#0A2340"], tier: 1, squad: [] },
     { id: "ita_sud", name: "Südtirol", short: "SUD", colors: ["#FFFFFF", "#E30613"], tier: 1, squad: [] },
     { id: "ita_sal", name: "Salernitana", short: "SAL", colors: ["#6C1D45", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_jst", name: "Juve Stabia", short: "JST", colors: ["#FFD700", "#0A2340"], tier: 1, squad: [] },
     { id: "ita_car", name: "Carrarese", short: "CAR", colors: ["#FFD700", "#0A2340"], tier: 1, squad: [] },
     { id: "ita_cit", name: "Cittadella", short: "CIT", colors: ["#6C1D45", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- PORTUGAL ----
   const RAW_PT_PP = [
     { id: "por_slb", name: "Benfica", short: "SLB", city: "Lisbon", stadium: "Estádio da Luz", colors: ["#E30613", "#FFFFFF"], tier: 5,
       squad: [
         P("Anatoliy Trubin", "GK", 25, 82), P("Samuel Soares", "GK", 23, 74),
         P("António Silva", "DF", 22, 81), P("Nicolás Otamendi", "DF", 38, 80), P("Tomás Araújo", "DF", 23, 78), P("Álvaro Carreras", "DF", 24, 79), P("Alexander Bah", "DF", 28, 77), P("Samuel Dahl", "DF", 22, 75), P("António Bernardo", "DF", 20, 74),
         P("Fredrik Aursnes", "MF", 30, 80), P("Florentino Luís", "MF", 26, 79), P("Enzo Barrenechea", "MF", 24, 77), P("Orkun Kökçü", "MF", 25, 80), P("João Veloso", "MF", 20, 74),
         P("Vangelis Pavlidis", "FW", 27, 81), P("Kerem Aktürkoğlu", "FW", 27, 80), P("Ángel Di María", "FW", 38, 80), P("Andreas Schjelderup", "FW", 21, 77), P("Franjo Ivanović", "FW", 22, 77), P("Gianluca Prestianni", "FW", 19, 76),
       ]},
     { id: "por_fcp", name: "Porto", short: "POR", city: "Porto", stadium: "Estádio do Dragão", colors: ["#003DA5", "#FFFFFF"], tier: 5,
       squad: [
         P("Diogo Costa", "GK", 26, 83), P("Cláudio Ramos", "GK", 34, 73),
         P("Zaidu Sanusi", "DF", 28, 77), P("Nehuén Pérez", "DF", 25, 78), P("Otávio", "DF", 24, 76), P("Alberto Costa", "DF", 22, 76), P("Francisco Moura", "DF", 26, 75), P("Martim Fernandes", "DF", 20, 76), P("Jan Bednarek", "DF", 30, 78),
         P("Alan Varela", "MF", 24, 81), P("Stephen Eustáquio", "MF", 29, 79), P("Rodrigo Mora", "MF", 19, 79), P("Gabri Veiga", "MF", 24, 80), P("Tomás Pérez", "MF", 21, 75),
         P("Samu Aghehowa", "FW", 21, 81), P("William Gomes", "FW", 19, 76), P("Pepê", "FW", 28, 79), P("Borja Sainz", "FW", 24, 78), P("Deniz Gül", "FW", 22, 74),
       ]},
     { id: "por_scp", name: "Sporting CP", short: "SCP", city: "Lisbon", stadium: "José Alvalade", colors: ["#008057", "#FFFFFF"], tier: 5,
       squad: [
         P("Rui Silva", "GK", 32, 79), P("João Virgínia", "GK", 26, 73),
         P("Gonçalo Inácio", "DF", 25, 82), P("Ousmane Diomande", "DF", 22, 81), P("Zeno Debast", "DF", 22, 78), P("Matheus Reis", "DF", 30, 76), P("Iván Fresneda", "DF", 21, 76), P("Maxi Araújo", "DF", 26, 77), P("Eduardo Quaresma", "DF", 24, 76),
         P("Morten Hjulmand", "MF", 27, 82), P("Hidemasa Morita", "MF", 31, 78), P("João Simões", "MF", 20, 75), P("Pedro Gonçalves", "MF", 27, 81), P("Geny Catamo", "MF", 25, 77),
         P("Geovany Quenda", "FW", 18, 78), P("Francisco Trincão", "FW", 26, 80), P("Conrad Harder", "FW", 20, 77), P("Fotis Ioannidis", "FW", 26, 79), P("Luis Suárez", "FW", 28, 78),
       ]},
     { id: "por_bra", name: "SC Braga", short: "BRA", city: "Braga", stadium: "Estádio Municipal de Braga", colors: ["#E30613", "#FFFFFF"], tier: 4,
       squad: [
         P("Matheus", "GK", 30, 77), P("Tiago Sá", "GK", 29, 73),
         P("Sikou Niakaté", "DF", 27, 76), P("Paulo Oliveira", "DF", 34, 74), P("Adrián Marín", "DF", 29, 74), P("Víctor Gómez", "DF", 26, 75), P("Robson Bambu", "DF", 28, 74), P("Gabri Martínez", "DF", 22, 74),
         P("João Moutinho", "MF", 39, 74), P("Ricardo Horta", "MF", 32, 78), P("Rodrigo Zalazar", "MF", 26, 77), P("André Horta", "MF", 29, 76), P("Vitor Carvalho", "MF", 25, 74),
         P("Fran Navarro", "FW", 27, 76), P("Bruma", "FW", 31, 75), P("Roger Fernandes", "FW", 24, 75), P("El Ouazzani", "FW", 24, 74), P("Pau Víctor", "FW", 24, 76),
       ]},
     { id: "por_vsc", name: "Vitória SC", short: "VSC", city: "Guimarães", stadium: "D. Afonso Henriques", colors: ["#FFFFFF", "#000000"], tier: 3,
       squad: [
         P("Bruno Varela", "GK", 31, 75), P("Jhonatan", "GK", 24, 70),
         P("Zé Carlos", "DF", 27, 73), P("Mikel Villanueva", "DF", 32, 73), P("Bruno Gaspar", "DF", 32, 73), P("Maga", "DF", 24, 73), P("Afonso Freitas", "DF", 25, 73), P("Tomás Ribeiro", "DF", 26, 74),
         P("Tomás Händel", "MF", 24, 75), P("Ismael Gharbi", "MF", 21, 74), P("Mané", "MF", 25, 74), P("Nélson da Luz", "MF", 28, 74), P("Dani Silva", "MF", 22, 72),
         P("Nuno Santos", "FW", 27, 74), P("Kaio César", "FW", 24, 74), P("Telmo Arcanjo", "FW", 22, 74), P("Gustavo Silva", "FW", 22, 73),
       ]},
     { id: "por_mor", name: "Moreirense", short: "MOR", colors: ["#FFD700", "#0A2340"], tier: 2, squad: [] },
     { id: "por_fam", name: "Famalicão", short: "FAM", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "por_gil", name: "Gil Vicente", short: "GIL", colors: ["#E30613", "#0A2340"], tier: 2, squad: [] },
     { id: "por_est", name: "Estoril", short: "EST", colors: ["#FFD700", "#0A2340"], tier: 2, squad: [] },
     { id: "por_cpa", name: "Casa Pia", short: "CPA", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "por_rio", name: "Rio Ave", short: "RIO", colors: ["#00A650", "#E30613"], tier: 2, squad: [] },
     { id: "por_stc", name: "Santa Clara", short: "STC", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "por_aro", name: "Arouca", short: "ARO", colors: ["#FFD700", "#0A2340"], tier: 2, squad: [] },
     { id: "por_amd", name: "Estrela Amadora", short: "AMD", colors: ["#E30613", "#0A2340"], tier: 1, squad: [] },
     { id: "por_nac", name: "Nacional", short: "NAC", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "por_avs", name: "AVS", short: "AVS", colors: ["#0A2340", "#FFFFFF"], tier: 1, squad: [] },
     { id: "por_far", name: "Farense", short: "FAR", colors: ["#FFFFFF", "#000000"], tier: 1, squad: [] },
     { id: "por_boa", name: "Boavista", short: "BOA", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_PT_P2 = [
     { id: "por_ton", name: "Tondela", short: "TON", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "por_pen", name: "Penafiel", short: "PEN", colors: ["#E30613", "#0A2340"], tier: 1, squad: [] },
     { id: "por_cha", name: "Chaves", short: "CHA", colors: ["#E30613", "#0A2340"], tier: 1, squad: [] },
     { id: "por_mar", name: "Marítimo", short: "MAR", colors: ["#E30613", "#00A650"], tier: 1, squad: [] },
     { id: "por_lei", name: "Leixões", short: "LEI", colors: ["#E30613", "#0A2340"], tier: 1, squad: [] },
     { id: "por_avi", name: "Académico Viseu", short: "AVI", colors: ["#0A2340", "#FFD700"], tier: 1, squad: [] },
     { id: "por_udl", name: "União Leiria", short: "UDL", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "por_fei", name: "Feirense", short: "FEI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "por_pfe", name: "Paços de Ferreira", short: "PFE", colors: ["#FFD700", "#00A650"], tier: 2, squad: [] },
     { id: "por_trr", name: "Torreense", short: "TRR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "por_maf", name: "Mafra", short: "MAF", colors: ["#E30613", "#0A2340"], tier: 1, squad: [] },
     { id: "por_alv", name: "Alverca", short: "ALV", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "por_viz", name: "Vizela", short: "VIZ", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "por_ptm", name: "Portimonense", short: "PTM", colors: ["#000000", "#E30613"], tier: 1, squad: [] },
     { id: "por_oli", name: "Oliveirense", short: "OLI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "por_fel", name: "Felgueiras", short: "FEL", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
   ];

   // ---- NETHERLANDS ----
   const RAW_NL_ER = [
     { id: "ned_aja", name: "Ajax", short: "AJA", city: "Amsterdam", stadium: "Johan Cruijff ArenA", colors: ["#E30613", "#FFFFFF"], tier: 5,
       squad: [
         P("Remko Pasveer", "GK", 42, 76), P("Vítězslav Jaroš", "GK", 24, 75),
         P("Josip Šutalo", "DF", 26, 78), P("Youri Baas", "DF", 23, 76), P("Owen Wijndal", "DF", 26, 75), P("Anton Gaaei", "DF", 23, 75), P("Lucas Rosa", "DF", 25, 74), P("Aaron Bouwman", "DF", 20, 73),
         P("Kenneth Taylor", "MF", 24, 79), P("Davy Klaassen", "MF", 33, 77), P("Branco van den Boomen", "MF", 30, 75), P("Sivert Mannsverk", "MF", 23, 75), P("Jorthy Mokio", "MF", 18, 75),
         P("Brian Brobbey", "FW", 24, 79), P("Wout Weghorst", "FW", 34, 78), P("Steven Berghuis", "FW", 34, 77), P("Kasper Dolberg", "FW", 28, 77), P("Mika Godts", "FW", 20, 76), P("Bertrand Traoré", "FW", 31, 76),
       ]},
     { id: "ned_psv", name: "PSV", short: "PSV", city: "Eindhoven", stadium: "Philips Stadion", colors: ["#E30613", "#FFFFFF"], tier: 5,
       squad: [
         P("Walter Benítez", "GK", 33, 80), P("Joël Drommel", "GK", 29, 73),
         P("Olivier Boscagli", "DF", 28, 79), P("Ryan Flamingo", "DF", 23, 77), P("Sergiño Dest", "DF", 26, 78), P("Armando Obispo", "DF", 27, 75), P("Mauro Júnior", "DF", 27, 75), P("Anass Salah-Eddine", "DF", 23, 75),
         P("Joey Veerman", "MF", 28, 81), P("Jerdy Schouten", "MF", 29, 80), P("Ismael Saibari", "MF", 24, 80), P("Guus Til", "MF", 28, 78), P("Richard Ledezma", "MF", 25, 74),
         P("Luuk de Jong", "FW", 36, 78), P("Ivan Perišić", "FW", 37, 78), P("Ricardo Pepi", "FW", 23, 78), P("Myron Boadu", "FW", 25, 76), P("Couhaib Driouech", "FW", 23, 75), P("Esmir Bajraktarević", "FW", 20, 74),
       ]},
     { id: "ned_fey", name: "Feyenoord", short: "FEY", city: "Rotterdam", stadium: "De Kuip", colors: ["#E30613", "#000000"], tier: 5,
       squad: [
         P("Timon Wellenreuther", "GK", 30, 76), P("Justin Bijlow", "GK", 28, 76),
         P("Anel Ahmedhodžić", "DF", 27, 78), P("Gernot Trauner", "DF", 34, 76), P("Tsuyoshi Watanabe", "DF", 29, 75), P("Gijs Smal", "DF", 28, 75), P("Bart Nieuwkoop", "DF", 30, 74), P("Jordan Lotomba", "DF", 27, 75),
         P("Quinten Timber", "MF", 25, 81), P("Sem Steijn", "MF", 24, 79), P("Hwang In-beom", "MF", 30, 78), P("Luciano Valente", "MF", 22, 76), P("Jakub Moder", "MF", 25, 74),
         P("Ayase Ueda", "FW", 27, 78), P("Anis Hadj Moussa", "FW", 23, 77), P("Julián Carranza", "FW", 25, 76), P("Gonçalo Borges", "FW", 24, 75), P("Ibrahim Osman", "FW", 21, 75),
       ]},
     { id: "ned_az", name: "AZ", short: "AZ", city: "Alkmaar", stadium: "AFAS Stadion", colors: ["#E30613", "#FFFFFF"], tier: 4,
       squad: [
         P("Rome-Jayden Owusu-Oduro", "GK", 21, 75), P("Hobie Verhulst", "GK", 32, 72),
         P("Wouter Goes", "DF", 21, 77), P("Alexandre Penetra", "DF", 24, 75), P("Maxim Dekker", "DF", 21, 75), P("Denso Kasius", "DF", 23, 74), P("Mees de Wit", "DF", 27, 74), P("David MÃ¸ller Wolfe", "DF", 24, 72),
         P("Sven Mijnans", "MF", 26, 78), P("Jordy Clasie", "MF", 34, 75), P("Kees Smit", "MF", 19, 76), P("Peer Koopmeiners", "MF", 26, 75), P("Mayckel Lahdo", "MF", 20, 74),
         P("Troy Parrott", "FW", 24, 78), P("Ruben van Bommel", "FW", 22, 76), P("Ibrahim Sadiq", "FW", 25, 75), P("Ernest Poku", "FW", 21, 75), P("Mexx Meerdink", "FW", 22, 74),
       ]},
     { id: "ned_twe", name: "FC Twente", short: "TWE", city: "Enschede", stadium: "De Grolsch Veste", colors: ["#E30613", "#FFFFFF"], tier: 3,
       squad: [
         P("Lars Unnerstall", "GK", 35, 75), P("Przemysław Tytoń", "GK", 39, 72),
         P("Mees Hilgers", "DF", 25, 78), P("Robin Pröpper", "DF", 32, 74), P("Bas Kuipers", "DF", 31, 73), P("Anton Fase", "DF", 22, 73), P("Max Bruns", "DF", 23, 74), P("Gijs Besselink", "DF", 24, 72),
         P("Youri Regeer", "MF", 22, 76), P("Michel Vlap", "MF", 28, 75), P("Carel Eiting", "MF", 28, 75), P("Sayfallah Ltaief", "MF", 25, 74), P("Michal Sadílek", "MF", 26, 74),
         P("Sam Lammers", "FW", 29, 76), P("Ricky van Wolfswinkel", "FW", 37, 73), P("Daan Rots", "FW", 25, 74), P("Naci Ünüvar", "FW", 22, 74), P("Mitchell van Bergen", "FW", 26, 75),
       ]},
     { id: "ned_utr", name: "FC Utrecht", short: "UTR", city: "Utrecht", stadium: "Stadion Galgenwaard", colors: ["#E30613", "#FFFFFF"], tier: 3,
       squad: [
         P("Vasilis Barkas", "GK", 32, 75), P("Michael Brouwer", "GK", 25, 71),
         P("Mike van der Hoorn", "DF", 33, 74), P("Nick Viergever", "DF", 36, 72), P("Souffian El Karouani", "DF", 25, 76), P("Siebe Horemans", "DF", 24, 73), P("Alonzo Engwanda", "DF", 24, 73), P("Hidde ter Avest", "DF", 28, 73),
         P("Can Bozdoğan", "MF", 24, 75), P("Oscar Fraulo", "MF", 22, 74), P("Yoann Cathline", "MF", 22, 75), P("Miguel Rodríguez", "MF", 25, 74), P("Sander van de Streek", "MF", 22, 72),
         P("Sébastien Haller", "FW", 32, 77), P("Victor Jensen", "FW", 25, 75), P("David Min", "FW", 24, 74), P("Ole Romeny", "FW", 24, 75), P("Isac Lidberg", "FW", 26, 74),
       ]},
     { id: "ned_spr", name: "Sparta Rotterdam", short: "SPR", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ned_gae", name: "Go Ahead Eagles", short: "GAE", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
     { id: "ned_hee", name: "sc Heerenveen", short: "HEE", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ned_nec", name: "NEC", short: "NEC", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "ned_for", name: "Fortuna Sittard", short: "FOR", colors: ["#FFD700", "#E30613"], tier: 2, squad: [] },
     { id: "ned_pec", name: "PEC Zwolle", short: "PEC", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ned_gro", name: "FC Groningen", short: "GRO", colors: ["#007A33", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ned_wil", name: "Willem II", short: "WIL", colors: ["#E30613", "#0A2340"], tier: 2, squad: [] },
     { id: "ned_her", name: "Heracles", short: "HER", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ned_nac", name: "NAC Breda", short: "NAC", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "ned_amc", name: "Almere City", short: "AMC", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ned_tel", name: "Telstar", short: "TEL", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
   ];
   const RAW_NL_EE = [
     { id: "ned_vol", name: "FC Volendam", short: "VOL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ned_ado", name: "ADO Den Haag", short: "ADO", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "ned_rod", name: "Roda JC", short: "ROD", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "ned_dgr", name: "De Graafschap", short: "DGR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ned_vvv", name: "VVV-Venlo", short: "VVV", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "ned_cam", name: "SC Cambuur", short: "CAM", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "ned_mvv", name: "MVV Maastricht", short: "MVV", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ned_emm", name: "FC Emmen", short: "EMM", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ned_ein", name: "FC Eindhoven", short: "EIN", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ned_dor", name: "FC Dordrecht", short: "DOR", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ned_hel", name: "Helmond Sport", short: "HEL", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ned_oss", name: "TOP Oss", short: "OSS", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ned_dbo", name: "FC Den Bosch", short: "DBO", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ned_vit", name: "Vitesse", short: "VIT", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "ned_exc", name: "Excelsior", short: "EXC", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ned_rkc", name: "RKC Waalwijk", short: "RKC", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
   ];

   // ---- POLAND ----
   const RAW_PL_EK = [
     { id: "pol_lgw", name: "Legia Warsaw", short: "LGW", city: "Warsaw", stadium: "Stadion Wojska Polskiego", colors: ["#004B23", "#FFFFFF"], tier: 4,
       squad: [
         P("Kacper Tobiasz", "GK", 23, 73),
         P("Steve Kapuadi", "DF", 28, 73), P("Radovan Pankov", "DF", 30, 73), P("Jan Ziółkowski", "DF", 20, 74), P("Ruben Vinagre", "DF", 27, 74), P("Patryk Kun", "DF", 30, 72),
         P("Bartosz Kapustka", "MF", 29, 74), P("Rafał Augustyniak", "MF", 32, 73), P("Claude Gonçalves", "MF", 31, 72), P("Juergen Elitim", "MF", 27, 73),
         P("Marc Gual", "FW", 29, 74), P("Jean-Pierre Nsame", "FW", 32, 74), P("Ilya Shkurin", "FW", 25, 73), P("Kacper Chodyna", "FW", 26, 73),
       ]},
     { id: "pol_lep", name: "Lech Poznań", short: "LEP", city: "Poznań", stadium: "Enea Stadion", colors: ["#005CA9", "#FFFFFF"], tier: 4,
       squad: [
         P("Bartosz Mrozek", "GK", 26, 72),
         P("Antonio Milić", "DF", 31, 73), P("Tomasz Kędziora", "DF", 31, 73), P("Elias Andersson", "DF", 24, 73), P("Joel Pereira", "DF", 28, 72), P("Alan Czerwiński", "DF", 30, 72),
         P("Antoni Kozubal", "MF", 20, 74), P("Radosław Murawski", "MF", 31, 72), P("Afonso Sousa", "MF", 25, 74), P("Dani Ramírez", "MF", 30, 73),
         P("Mikael Ishak", "FW", 33, 75), P("Luis Palma", "FW", 26, 75), P("Filip Szymczak", "FW", 23, 73), P("Bryan Fiabema", "FW", 22, 73),
       ]},
     { id: "pol_rak", name: "Raków Częstochowa", short: "RAK", city: "Częstochowa", stadium: "Stadion Miejski", colors: ["#E30613", "#0A2340"], tier: 4,
       squad: [
         P("Kacper Trelowski", "GK", 22, 72),
         P("Zoran Arsenić", "DF", 32, 73), P("Bogdan Racovițan", "DF", 25, 73), P("Stratos Svarnas", "DF", 28, 73), P("Fran Tudor", "DF", 30, 72),
         P("John Yeboah", "MF", 25, 73), P("Giannis Papanikolaou", "MF", 26, 72), P("Vladyslav Kochergin", "MF", 28, 72), P("Jean Carlos", "MF", 27, 73),
         P("Łukasz Zwoliński", "FW", 32, 72), P("Sonny Kittel", "FW", 32, 73), P("Leonardo Rocha", "FW", 26, 73),
       ]},
     { id: "pol_jag", name: "Jagiellonia Białystok", short: "JAG", city: "Białystok", stadium: "Stadion Miejski", colors: ["#FFD700", "#E30613"], tier: 4,
       squad: [
         P("Sławomir Abramowicz", "GK", 24, 72),
         P("Taras Romanczuk", "DF", 34, 72), P("Nene", "DF", 30, 72), P("Bartłomiej Wdowik", "DF", 23, 73), P("Norbert Wojtuszek", "DF", 24, 72),
         P("Jesús Imaz", "MF", 35, 75), P("Miki Villar", "MF", 26, 73), P("Darko Churlinov", "MF", 25, 73), P("Oskar Pietuszewski", "MF", 18, 74),
         P("Afimico Pululu", "FW", 26, 74), P("Lamine Diaby-Fadiga", "FW", 25, 73), P("Dušan Stojinović", "FW", 27, 72),
       ]},
     { id: "pol_pog", name: "Pogoń Szczecin", short: "POG", colors: ["#005CA9", "#800000"], tier: 3, squad: [] },
     { id: "pol_gor", name: "Górnik Zabrze", short: "GOR", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "pol_cra", name: "Cracovia", short: "CRA", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "pol_wis", name: "Wisła Płock", short: "WIS", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "pol_pia", name: "Piast Gliwice", short: "PIA", colors: ["#800000", "#005CA9"], tier: 3, squad: [] },
     { id: "pol_zag", name: "Zagłębie Lubin", short: "ZAG", colors: ["#FF6600", "#0A2340"], tier: 2, squad: [] },
     { id: "pol_wid", name: "Widzew Łódź", short: "WID", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "pol_rad", name: "Radomiak Radom", short: "RAD", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "pol_mot", name: "Motor Lublin", short: "MOT", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "pol_kor", name: "Korona Kielce", short: "KOR", colors: ["#FFD700", "#800000"], tier: 2, squad: [] },
     { id: "pol_gks", name: "GKS Katowice", short: "GKS", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "pol_lgd", name: "Lechia Gdańsk", short: "LGD", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "pol_ark", name: "Arka Gdynia", short: "ARK", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "pol_bbt", name: "Bruk-Bet Termalica", short: "BBT", colors: ["#E30613", "#0A2340"], tier: 2, squad: [] },
   ];
   const RAW_PL_IL = [
     { id: "pol_lks", name: "ŁKS Łódź", short: "LKS", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "pol_wkr", name: "Wisła Kraków", short: "WKR", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "pol_ruc", name: "Ruch Chorzów", short: "RUC", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pol_mie", name: "Miedź Legnica", short: "MIE", colors: ["#00A650", "#E30613"], tier: 1, squad: [] },
     { id: "pol_tyc", name: "GKS Tychy", short: "TYC", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pol_plw", name: "Polonia Warszawa", short: "PLW", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pol_pod", name: "Podbeskidzie", short: "POD", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "pol_odr", name: "Odra Opole", short: "ODR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pol_chr", name: "Chrobry Głogów", short: "CHR", colors: ["#FF6600", "#0A2340"], tier: 1, squad: [] },
     { id: "pol_gle", name: "Górnik Łęczna", short: "GLE", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pol_zni", name: "Znicz Pruszków", short: "ZNI", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "pol_str", name: "Stal Rzeszów", short: "STR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pol_kot", name: "Kotwica Kołobrzeg", short: "KOT", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pol_pus", name: "Puszcza Niepołomice", short: "PUS", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "pol_zso", name: "Zagłębie Sosnowiec", short: "ZSO", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "pol_war", name: "Warta Poznań", short: "WAR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- TURKEY ----
   const RAW_TR_SL = [
     { id: "tur_gal", name: "Galatasaray", short: "GAL", city: "Istanbul", stadium: "RAMS Park", colors: ["#E30613", "#FFD700"], tier: 5,
       squad: [
         P("Fernando Muslera", "GK", 40, 78), P("Günay Güvenç", "GK", 34, 72),
         P("Davinson Sánchez", "DF", 30, 80), P("Abdülkerim Bardakcı", "DF", 31, 78), P("Kaan Ayhan", "DF", 31, 76), P("Wilfried Singo", "DF", 25, 80), P("Ismail Jakobs", "DF", 26, 76), P("Eren Elmalı", "DF", 25, 75), P("Roland Sallai", "DF", 29, 77),
         P("Lucas Torreira", "MF", 30, 81), P("Gabriel Sara", "MF", 27, 81), P("İlkay Gündoğan", "MF", 35, 81), P("Berkan Kutlu", "MF", 28, 75), P("Yunus Akgün", "MF", 26, 77),
         P("Victor Osimhen", "FW", 27, 87), P("Mauro Icardi", "FW", 33, 82), P("Barış Alper Yılmaz", "FW", 26, 79), P("Leroy Sané", "FW", 30, 83), P("Yusuf Demir", "FW", 23, 74),
       ]},
     { id: "tur_fen", name: "Fenerbahçe", short: "FEN", city: "Istanbul", stadium: "Şükrü Saracoğlu", colors: ["#FFED00", "#0A2340"], tier: 5,
       squad: [
         P("Ederson", "GK", 32, 84), P("İrfan Can Eğribayat", "GK", 27, 74),
         P("Milan Škriniar", "DF", 31, 82), P("Çağlar Söyüncü", "DF", 30, 78), P("Jayden Oosterwolde", "DF", 25, 77), P("Alexander Djiku", "DF", 32, 76), P("Levent Mercan", "DF", 25, 74), P("Archie Brown", "DF", 23, 76), P("Nélson Semedo", "DF", 33, 78),
         P("İsmail Yüksek", "MF", 27, 77), P("Sofyan Amrabat", "MF", 30, 79), P("Fred", "MF", 33, 79), P("Edson Álvarez", "MF", 28, 80), P("Marco Asensio", "MF", 30, 82),
         P("Youssef En-Nesyri", "FW", 29, 81), P("Talisca", "FW", 32, 80), P("Sebastian Szymański", "FW", 27, 78), P("Dorgeles Nene", "FW", 22, 77), P("Cenk Tosun", "FW", 35, 74),
       ]},
     { id: "tur_bjk", name: "Beşiktaş", short: "BJK", city: "Istanbul", stadium: "Tüpraş Stadyumu", colors: ["#000000", "#FFFFFF"], tier: 4,
       squad: [
         P("Mert Günok", "GK", 37, 78), P("Ersin Destanoğlu", "GK", 25, 76),
         P("Gabriel Paulista", "DF", 35, 76), P("Felix Uduokhai", "DF", 28, 76), P("Emirhan Topçu", "DF", 25, 74), P("Jonas Svensson", "DF", 33, 73), P("Arthur Masuaku", "DF", 32, 74), P("Taylan Bulut", "DF", 20, 74),
         P("Gedson Fernandes", "MF", 27, 77), P("Salih Uçan", "MF", 32, 74), P("Wilfred Ndidi", "MF", 29, 79), P("Demir Ege Tıknaz", "MF", 22, 73), P("Necip Uysal", "MF", 34, 72),
         P("Tammy Abraham", "FW", 28, 79), P("El Bilal Touré", "FW", 24, 77), P("Rafa Silva", "FW", 33, 81), P("Ernest Muçi", "FW", 25, 76), P("Cengiz Ünder", "FW", 29, 77),
       ]},
     { id: "tur_tra", name: "Trabzonspor", short: "TRA", city: "Trabzon", stadium: "Papara Park", colors: ["#6C1D45", "#87CEEB"], tier: 4,
       squad: [
         P("Uğurcan Çakır", "GK", 30, 81), P("Erce Kardeşler", "GK", 30, 72),
         P("Stefan Savić", "DF", 35, 76), P("Arseniy Batagov", "DF", 25, 74), P("Rayyan Baniya", "DF", 26, 74), P("Mustafa Eskihellaç", "DF", 27, 73), P("Pape Meïssa Ba", "DF", 24, 73), P("John Lundstram", "DF", 32, 76),
         P("Okay Yokuşlu", "MF", 32, 76), P("Tom Krauß", "MF", 25, 76), P("Ozan Tufan", "MF", 31, 76), P("Christ Oulaï", "MF", 20, 74), P("Edin Višća", "MF", 36, 74),
         P("Paul Onuachu", "FW", 32, 78), P("Felipe Augusto", "FW", 24, 75), P("Anthony Nwakaeme", "FW", 37, 73), P("Simon Banza", "FW", 29, 76), P("Danylo Sikan", "FW", 25, 75),
       ]},
     { id: "tur_ibb", name: "Başakşehir", short: "IBB", colors: ["#E67E22", "#0A2340"], tier: 3,
       squad: [
         P("Volkan Babacan", "GK", 37, 74), P("Muhammed Şengezer", "GK", 26, 72),
         P("Leo Dubois", "DF", 31, 74), P("Onur Bulut", "DF", 31, 73), P("Ousseynou Ba", "DF", 29, 74), P("Christopher Operi", "DF", 28, 73), P("Ahmed Touba", "DF", 27, 73), P("Yuki Kobayashi", "DF", 26, 73),
         P("Berkay Özcan", "MF", 28, 74), P("Deian Sorescu", "MF", 28, 74), P("Ömer Ali Şahiner", "MF", 30, 73), P("Mahmut Tekdemir", "MF", 38, 71), P("Amine Harit", "MF", 29, 77),
         P("Nuno da Costa", "FW", 34, 73), P("Davie Selke", "FW", 31, 75), P("Deniz Türüç", "FW", 33, 74), P("Eldor Shomurodov", "FW", 30, 76),
       ]},
     { id: "tur_sms", name: "Samsunspor", short: "SMS", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "tur_eyp", name: "Eyüpspor", short: "EYP", colors: ["#4B006E", "#FFD700"], tier: 2, squad: [] },
     { id: "tur_kas", name: "Kasımpaşa", short: "KAS", colors: ["#0A2340", "#FFFFFF"], tier: 2, squad: [] },
     { id: "tur_kon", name: "Konyaspor", short: "KON", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "tur_ant", name: "Antalyaspor", short: "ANT", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "tur_kay", name: "Kayserispor", short: "KAY", colors: ["#FFD700", "#E30613"], tier: 2, squad: [] },
     { id: "tur_riz", name: "Rizespor", short: "RIZ", colors: ["#00A650", "#0A2340"], tier: 2, squad: [] },
     { id: "tur_gaz", name: "Gaziantep FK", short: "GAZ", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "tur_ala", name: "Alanyaspor", short: "ALA", colors: ["#FF6600", "#00A650"], tier: 2, squad: [] },
     { id: "tur_siv", name: "Sivasspor", short: "SIV", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "tur_goz", name: "Göztepe", short: "GOZ", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
     { id: "tur_bod", name: "Bodrum FK", short: "BOD", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "tur_koc", name: "Kocaelispor", short: "KOC", colors: ["#00A650", "#000000"], tier: 1, squad: [] },
   ];
   const RAW_TR_T1 = [
     { id: "tur_ads", name: "Adana Demirspor", short: "ADS", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "tur_erz", name: "Erzurumspor", short: "ERZ", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "tur_ban", name: "Bandırmaspor", short: "BAN", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "tur_sak", name: "Sakaryaspor", short: "SAK", colors: ["#00A650", "#000000"], tier: 1, squad: [] },
     { id: "tur_bolu", name: "Boluspor", short: "BOL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "tur_mns", name: "Manisa FK", short: "MNS", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "tur_umr", name: "Ümraniyespor", short: "UMR", colors: ["#E30613", "#0A2340"], tier: 1, squad: [] },
     { id: "tur_kec", name: "Keçiörengücü", short: "KEC", colors: ["#800000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "tur_crm", name: "Çorum FK", short: "CRM", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "tur_snl", name: "Şanlıurfaspor", short: "SNL", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "tur_ist", name: "İstanbulspor", short: "IST", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "tur_amed", name: "Amed SK", short: "AME", colors: ["#00A650", "#E30613"], tier: 1, squad: [] },
     { id: "tur_pnd", name: "Pendikspor", short: "PND", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "tur_igd", name: "Iğdır FK", short: "IGD", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "tur_hat", name: "Hatayspor", short: "HAT", colors: ["#800000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "tur_ank", name: "Ankaragücü", short: "ANK", colors: ["#0A2340", "#FFD700"], tier: 1, squad: [] },
   ];

   // =========================================================================
   // SPLIT-LEAGUE NATIONS (Phase 4 — championship/relegation split top flights)
   // =========================================================================

   // ---- BELGIUM (Pro League splits 8/8, points halved rounded UP) ----
   const RAW_BE_BPL = [
     { id: "bel_clb", name: "Club Brugge", short: "CLB", city: "Bruges", stadium: "Jan Breydel", colors: ["#005CA9", "#000000"], tier: 4,
       squad: [
         P("Simon Mignolet", "GK", 38, 78), P("Nordin Jackers", "GK", 27, 73),
         P("Joel Ordóñez", "DF", 21, 78), P("Brandon Mechele", "DF", 33, 75), P("Bjorn Meijer", "DF", 23, 75), P("Kyriani Sabbe", "DF", 21, 74), P("Joaquín Seys", "DF", 20, 74), P("Zaid Romero", "DF", 23, 74),
         P("Hans Vanaken", "MF", 33, 79), P("Raphael Onyedika", "MF", 25, 78), P("Aleksandar Stanković", "MF", 21, 76), P("Hugo Vetlesen", "MF", 25, 75), P("Cisse Sandra", "MF", 21, 74),
         P("Christos Tzolis", "FW", 24, 79), P("Ferran Jutglà", "FW", 27, 77), P("Chemsdine Talbi", "FW", 20, 76), P("Nicolò Tresoldi", "FW", 21, 75), P("Romeo Vermant", "FW", 21, 75),
       ]},
     { id: "bel_usg", name: "Union SG", short: "USG", city: "Brussels", stadium: "Joseph Marien", colors: ["#FFD700", "#005CA9"], tier: 4,
       squad: [
         P("Kjell Scherpen", "GK", 26, 76), P("Anthony Moris", "GK", 36, 73),
         P("Christian Burgess", "DF", 34, 74), P("Kevin Mac Allister", "DF", 26, 75), P("Ismaël Kandouss", "DF", 27, 74), P("Ross Sykes", "DF", 27, 74), P("Fedde Leysen", "DF", 20, 74), P("Marc Giger", "DF", 24, 73),
         P("Noah Sadiki", "MF", 21, 76), P("Alessio Castro-Montes", "MF", 28, 74), P("Anan Khalaili", "MF", 22, 74), P("Mathias Rasmussen", "MF", 28, 74), P("Ousseynou Niang", "MF", 22, 74),
         P("Promise David", "FW", 25, 77), P("Raúl Florucz", "FW", 24, 76), P("Kevin Rodríguez", "FW", 26, 75), P("Dennis Eckert Ayensa", "FW", 28, 74),
       ]},
     { id: "bel_and", name: "Anderlecht", short: "AND", city: "Brussels", stadium: "Lotto Park", colors: ["#4B2E83", "#FFFFFF"], tier: 4,
       squad: [
         P("Colin Coosemans", "GK", 33, 74), P("Mads Kikkenborg", "GK", 26, 72),
         P("Jan Vertonghen", "DF", 39, 75), P("Killian Sardella", "DF", 25, 75), P("Lucas Hey", "DF", 22, 74), P("Ludwig Augustinsson", "DF", 32, 74), P("Thomas Foket", "DF", 31, 73), P("Moussa N'Diaye", "DF", 23, 73),
         P("Yari Verschaeren", "MF", 24, 76), P("Mario Stroeykens", "MF", 21, 76), P("Théo Leoni", "MF", 24, 74), P("Enric Llansana", "MF", 23, 74), P("Nathan De Cat", "MF", 18, 74),
         P("Luis Vázquez", "FW", 26, 75), P("Adriano Bertaccini", "FW", 25, 76), P("Thorgan Hazard", "FW", 33, 75), P("Mihajlo Cvetković", "FW", 21, 74),
       ]},
     { id: "bel_gnk", name: "Genk", short: "GNK", city: "Genk", stadium: "Cegeka Arena", colors: ["#005CA9", "#FFFFFF"], tier: 4,
       squad: [
         P("Hendrik Van Crombrugge", "GK", 33, 76), P("Tobias Lawal", "GK", 25, 72),
         P("Matte Smets", "DF", 22, 75), P("Mujaid Sadick", "DF", 27, 73), P("Zakaria El Ouahdi", "DF", 25, 75), P("Joris Kayembe", "DF", 30, 74), P("Ken Nkuba", "DF", 22, 73), P("Robin Seppuri", "DF", 24, 72),
         P("Bryan Heynen", "MF", 29, 77), P("Patrik Hrošovský", "MF", 34, 73), P("Aziz Ouattara", "MF", 24, 74), P("Nikolas Sattlberger", "MF", 24, 73), P("Jarne Steuckers", "MF", 22, 74),
         P("Tolu Arokodare", "FW", 25, 79), P("Yira Sor", "FW", 25, 76), P("Oh Hyun-gyu", "FW", 25, 76), P("Ianis Hagi", "FW", 27, 76),
       ]},
     { id: "bel_ant", name: "Antwerp", short: "ANT", city: "Antwerp", stadium: "Bosuilstadion", colors: ["#E30613", "#FFFFFF"], tier: 3,
       squad: [
         P("Ortwin De Wolf", "GK", 28, 73), P("Kjell Peersman", "GK", 28, 71),
         P("Toby Alderweireld", "DF", 37, 75), P("Zeno Van Den Bosch", "DF", 22, 74), P("Jelle Bataille", "DF", 26, 73), P("Bjorn Engels", "DF", 31, 73), P("Denis Odoi", "DF", 24, 72), P("Dinis Almeida", "DF", 32, 72),
         P("Dennis Praet", "MF", 32, 75), P("Alhassan Yusuf", "MF", 26, 74), P("Mahamadou Doumbia", "MF", 23, 73), P("Kobe Corbanie", "MF", 20, 73), P("Mohamed Bangoura", "MF", 22, 73),
         P("Vincent Janssen", "FW", 32, 74), P("Michel-Ange Balikwisha", "FW", 25, 76), P("Gyrano Kerk", "FW", 30, 73), P("Tjaronn Chery", "FW", 37, 73),
       ]},
     { id: "bel_gnt", name: "Gent", short: "GNT", city: "Ghent", stadium: "Ghelamco Arena", colors: ["#005CA9", "#FFFFFF"], tier: 3,
       squad: [
         P("Paul Nardi", "GK", 32, 73), P("Davy Roef", "GK", 31, 72),
         P("Michael Ngadeu", "DF", 35, 73), P("Jordan Torunarigha", "DF", 29, 74), P("Nurio Fortuna", "DF", 30, 73), P("Matisse Samoise", "DF", 24, 73), P("Ilay Camara", "DF", 22, 74), P("Noah Fadiga", "DF", 25, 73),
         P("Sven Kums", "MF", 38, 73), P("Pieter Gerkens", "MF", 30, 73), P("Jens Petter Hauge", "MF", 27, 76), P("Andrew Hjulsager", "MF", 30, 74), P("Yuki Hirata", "MF", 24, 73),
         P("Andri Gudjohnsen", "FW", 27, 75), P("Max Dean", "FW", 23, 73), P("Franck Surano", "FW", 21, 72), P("Omri Gandelman", "FW", 22, 73),
       ]},
     { id: "bel_cer", name: "Cercle Brugge", short: "CER", city: "Bruges", stadium: "Jan Breydel", colors: ["#00A650", "#000000"], tier: 2, squad: [] },
     { id: "bel_std", name: "Standard Liège", short: "STD", city: "Liège", stadium: "Maurice Dufrasne", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "bel_cha", name: "Charleroi", short: "CHA", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bel_mec", name: "Mechelen", short: "MEC", colors: ["#FFD700", "#E30613"], tier: 2, squad: [] },
     { id: "bel_ohl", name: "OH Leuven", short: "OHL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bel_wes", name: "Westerlo", short: "WES", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "bel_stv", name: "Sint-Truiden", short: "STV", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "bel_kor", name: "Kortrijk", short: "KOR", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bel_den", name: "Dender", short: "DEN", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "bel_bee", name: "Beerschot", short: "BEE", colors: ["#4B2E83", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_BE_BCH = [
     { id: "bel_rwd", name: "RWDM", short: "RWD", colors: ["#000000", "#E30613"], tier: 2, squad: [] },
     { id: "bel_zwa", name: "Zulte Waregem", short: "ZWA", colors: ["#E30613", "#00A650"], tier: 2, squad: [] },
     { id: "bel_bev", name: "SK Beveren", short: "BEV", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "bel_lom", name: "Lommel", short: "LOM", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bel_pat", name: "Patro Eisden", short: "PAT", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "bel_lie", name: "Lierse", short: "LIE", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "bel_dei", name: "Deinze", short: "DEI", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bel_ser", name: "Seraing", short: "SER", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "bel_eup", name: "Eupen", short: "EUP", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "bel_fbo", name: "Francs Borains", short: "FBO", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bel_llo", name: "La Louvière", short: "LLO", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bel_olc", name: "Olympic Charleroi", short: "OLC", colors: ["#000000", "#E30613"], tier: 1, squad: [] },
     { id: "bel_lok", name: "Lokeren-Temse", short: "LOK", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "bel_nin", name: "Ninove", short: "NIN", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
   ];

   // ---- AUSTRIA (Bundesliga splits 6/6, points halved rounded DOWN) ----
   const RAW_AT_ABL = [
     { id: "aut_sal", name: "RB Salzburg", short: "SAL", city: "Salzburg", stadium: "Red Bull Arena", colors: ["#E2001A", "#FFFFFF"], tier: 5,
       squad: [
         P("Alexander Schlager", "GK", 30, 77), P("Janis Blaswich", "GK", 34, 76),
         P("Aleksa Terzić", "DF", 26, 74), P("Hendry Blank", "DF", 21, 75), P("Frans Krätzig", "DF", 23, 75), P("Joane Gadou", "DF", 20, 74), P("Daouda Guindo", "DF", 23, 73),
         P("Oscar Gloukh", "MF", 22, 78), P("Mads Bidstrup", "MF", 25, 76), P("Maurits Kjærgaard", "MF", 23, 76), P("Bobby Clark", "MF", 21, 75), P("Sota Kitano", "MF", 21, 75),
         P("Petar Ratkov", "FW", 22, 76), P("Karim Onisiwo", "FW", 34, 74), P("Edmund Baidoo", "FW", 22, 74), P("Kerim Alajbegović", "FW", 19, 74),
       ]},
     { id: "aut_stu", name: "Sturm Graz", short: "STU", city: "Graz", stadium: "Merkur Arena", colors: ["#000000", "#FFFFFF"], tier: 4,
       squad: [
         P("Oliver Christensen", "GK", 26, 75),
         P("Gregory Wüthrich", "DF", 31, 73), P("Max Johnston", "DF", 22, 74), P("Jusuf Gazibegović", "DF", 26, 73), P("Saïdou Sow", "DF", 23, 74),
         P("Otar Kiteishvili", "MF", 30, 76), P("Malick Yalcouyé", "MF", 20, 75), P("Jon Gorenc Stanković", "MF", 30, 73), P("Tomi Horvat", "MF", 26, 74), P("Dimitri Lavalée", "MF", 28, 73),
         P("William Böving", "FW", 22, 74), P("Seedy Jatta", "FW", 21, 73), P("Belmin Beganović", "FW", 20, 73),
       ]},
     { id: "aut_las", name: "LASK", short: "LAS", city: "Linz", stadium: "Raiffeisen Arena", colors: ["#000000", "#FFFFFF"], tier: 3,
       squad: [
         P("Lukas Jungwirth", "GK", 23, 72),
         P("Philipp Ziereis", "DF", 32, 72), P("Maximilian Talovierov", "DF", 25, 73), P("Andrés Andrade", "DF", 27, 73), P("Jérôme Boateng", "DF", 37, 73),
         P("Sascha Horvath", "MF", 29, 72), P("Ibrahim Mustapha", "MF", 22, 72), P("Valentino Müller", "MF", 26, 72), P("Branko Jovičić", "MF", 31, 72),
         P("Robert Žulj", "FW", 33, 73), P("Moses Usor", "FW", 23, 73), P("Florian Flecker", "FW", 30, 72),
       ]},
     { id: "aut_rap", name: "Rapid Wien", short: "RAP", city: "Vienna", stadium: "Allianz Stadion", colors: ["#00A650", "#FFFFFF"], tier: 3,
       squad: [
         P("Niklas Hedl", "GK", 24, 74),
         P("Martin Koscelník", "DF", 31, 73), P("Serge-Philippe Raux-Yao", "DF", 22, 73), P("Nenad Cvetković", "DF", 24, 72), P("Jonas Auer", "DF", 25, 72),
         P("Matthias Seidl", "MF", 25, 74), P("Nikolaus Wurmbrand", "MF", 20, 74), P("Louis Schaub", "MF", 31, 73), P("Petter Nosa Dahl", "MF", 20, 73),
         P("Guido Burgstaller", "FW", 37, 73), P("Claudy Mbuyi", "FW", 23, 73), P("Janis Antiste", "FW", 23, 73),
       ]},
     { id: "aut_auw", name: "Austria Wien", short: "AUW", city: "Vienna", stadium: "Generali Arena", colors: ["#4B2E83", "#FFFFFF"], tier: 3, squad: [] },
     { id: "aut_wac", name: "Wolfsberger AC", short: "WAC", colors: ["#FFFFFF", "#000000"], tier: 2, squad: [] },
     { id: "aut_har", name: "Hartberg", short: "HAR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aut_klg", name: "Austria Klagenfurt", short: "KLG", colors: ["#4B2E83", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aut_bwl", name: "Blau-Weiß Linz", short: "BWL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aut_alt", name: "Altach", short: "ALT", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aut_tir", name: "WSG Tirol", short: "TIR", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aut_gak", name: "Grazer AK", short: "GAK", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_AT_A2L = [
     { id: "aut_stp", name: "SKN St. Pölten", short: "STP", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "aut_rie", name: "SV Ried", short: "RIE", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aut_adm", name: "Admira Wacker", short: "ADM", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aut_vie", name: "First Vienna", short: "VIE", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "aut_kap", name: "Kapfenberg", short: "KAP", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aut_ams", name: "SKU Amstetten", short: "AMS", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "aut_laf", name: "SV Lafnitz", short: "LAF", colors: ["#00A650", "#000000"], tier: 1, squad: [] },
     { id: "aut_dor", name: "FC Dornbirn", short: "DOR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aut_bre", name: "SW Bregenz", short: "BRE", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aut_leo", name: "DSV Leoben", short: "LEO", colors: ["#005CA9", "#000000"], tier: 1, squad: [] },
     { id: "aut_hrn", name: "SV Horn", short: "HRN", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "aut_fac", name: "Floridsdorfer AC", short: "FAC", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aut_voi", name: "ASK Voitsberg", short: "VOI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aut_stf", name: "SV Stripfing", short: "STF", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aut_ste", name: "Vorwärts Steyr", short: "STE", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "aut_inn", name: "Wacker Innsbruck", short: "INN", colors: ["#005CA9", "#000000"], tier: 1, squad: [] },
   ];

   // ---- DENMARK (Superliga splits 6/6, points carried) ----
   const RAW_DK_DSL = [
     { id: "den_fck", name: "FC København", short: "FCK", city: "Copenhagen", stadium: "Parken", colors: ["#FFFFFF", "#005CA9"], tier: 4,
       squad: [
         P("Theo Sander", "GK", 22, 73),
         P("Elias Jelert", "DF", 22, 74), P("Kye Rowles", "DF", 27, 74), P("Pantelis Hatzidiakos", "DF", 29, 74), P("Birger Meling", "DF", 31, 73), P("Gabriel Pereira", "DF", 24, 73),
         P("Rasmus Falk", "MF", 34, 74), P("Lukas Lerager", "MF", 32, 73), P("Magnus Mattsson", "MF", 25, 73), P("William Clem", "MF", 21, 73),
         P("Jordan Larsson", "FW", 28, 75), P("Viktor Claesson", "FW", 34, 74), P("Youssoufa Moukoko", "FW", 21, 76), P("Andreas Cornelius", "FW", 33, 73),
       ]},
     { id: "den_fcm", name: "Midtjylland", short: "FCM", city: "Herning", stadium: "MCH Arena", colors: ["#000000", "#E30613"], tier: 4,
       squad: [
         P("Elias Olafsson", "GK", 26, 73),
         P("Stefan Gartenmann", "DF", 29, 73), P("Kevin Mbabu", "DF", 31, 74), P("Frederik Alves", "DF", 26, 73), P("Valdemar Byskov", "DF", 22, 73),
         P("Kristoffer Olsson", "MF", 30, 74), P("Aral Şimşir", "MF", 21, 73), P("Mikel Gogorza", "MF", 27, 73), P("Charles", "MF", 26, 73),
         P("Franculino Djú", "FW", 21, 76), P("Darío Osorio", "FW", 22, 75), P("Mikael Anderson", "FW", 27, 74), P("Junior Brumado", "FW", 26, 73),
       ]},
     { id: "den_bif", name: "Brøndby", short: "BIF", city: "Brøndby", stadium: "Brøndby Stadion", colors: ["#FFD700", "#005CA9"], tier: 4,
       squad: [
         P("Patrick Pentz", "GK", 28, 74),
         P("Rasmus Lauritsen", "DF", 29, 73), P("Sean Klaiber", "DF", 31, 72), P("Daniel Wass", "DF", 37, 73), P("Frederik Bak", "DF", 24, 72),
         P("Nicolai Vallys", "MF", 28, 73), P("Josip Radošević", "MF", 31, 72), P("Matt Smith", "MF", 26, 72), P("Sofus Berger", "MF", 22, 72),
         P("Mathias Kvistgaarden", "FW", 23, 74), P("Ohi Omoijuanfo", "FW", 31, 74), P("Emil Højlund", "FW", 21, 73), P("Marko Divković", "FW", 25, 72),
       ]},
     { id: "den_fcn", name: "Nordsjælland", short: "FCN", city: "Farum", stadium: "Right to Dream Park", colors: ["#E30613", "#FFD700"], tier: 3, squad: [] },
     { id: "den_agf", name: "AGF Aarhus", short: "AGF", city: "Aarhus", stadium: "Ceres Park", colors: ["#FFFFFF", "#005CA9"], tier: 3, squad: [] },
     { id: "den_ran", name: "Randers", short: "RAN", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "den_sil", name: "Silkeborg", short: "SIL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "den_vib", name: "Viborg", short: "VIB", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "den_lyn", name: "Lyngby", short: "LYN", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "den_vej", name: "Vejle", short: "VEJ", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "den_sdj", name: "SønderjyskE", short: "SDJ", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "den_aab", name: "AaB", short: "AAB", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_DK_D1D = [
     { id: "den_hvi", name: "Hvidovre", short: "HVI", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "den_hob", name: "Hobro", short: "HOB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "den_fre", name: "Fredericia", short: "FRE", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "den_kol", name: "Kolding", short: "KOL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "den_hil", name: "Hillerød", short: "HIL", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "den_koe", name: "HB Køge", short: "KOE", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "den_esb", name: "Esbjerg", short: "ESB", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "den_odb", name: "OB Odense", short: "ODB", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "den_hor", name: "Horsens", short: "HOR", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "den_b93", name: "B.93", short: "B93", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "den_nyk", name: "Nykøbing", short: "NYK", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "den_ski", name: "Skive", short: "SKI", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
   ];

   // ---- GREECE (Super League splits 7/7, points carried) ----
   const RAW_GR_GSL = [
     { id: "gre_oly", name: "Olympiacos", short: "OLY", city: "Piraeus", stadium: "Karaiskakis", colors: ["#E30613", "#FFFFFF"], tier: 5,
       squad: [
         P("Konstantinos Tzolakis", "GK", 23, 77), P("Alexandros Paschalakis", "GK", 36, 72),
         P("Panagiotis Retsos", "DF", 28, 76), P("David Carmo", "DF", 26, 76), P("Francisco Ortega", "DF", 26, 74), P("Rodinei", "DF", 34, 74), P("Bruno Onyemaechi", "DF", 27, 74), P("Lorenzo Scipioni", "DF", 24, 73),
         P("Santiago Hezze", "MF", 24, 77), P("Chiquinho", "MF", 30, 76), P("Gabriel Neves", "MF", 28, 74), P("Dani García", "MF", 35, 74), P("Willian Arão", "MF", 33, 74),
         P("Ayoub El Kaabi", "FW", 33, 80), P("Gelson Martins", "FW", 31, 77), P("Daniel Podence", "FW", 30, 77), P("Roman Yaremchuk", "FW", 30, 75), P("Mehdi Taremi", "FW", 34, 79),
       ]},
     { id: "gre_pao", name: "PAOK", short: "PAO", city: "Thessaloniki", stadium: "Toumba", colors: ["#000000", "#FFFFFF"], tier: 4,
       squad: [
         P("Dominik Kotarski", "GK", 26, 76), P("Antonis Tsiftsis", "GK", 24, 72),
         P("Giannis Michailidis", "DF", 26, 75), P("Abdul Rahman Baba", "DF", 32, 74), P("Rafa Soares", "DF", 29, 73), P("Loukas Vrousai", "DF", 22, 73), P("Mario Branco", "DF", 24, 72), P("Otto Baker", "DF", 23, 72),
         P("Andrija Živković", "MF", 30, 77), P("Soualiho Meïté", "MF", 32, 75), P("Magomed Ozdoev", "MF", 33, 74), P("Mady Camara", "MF", 29, 76), P("Giannis Konstantelias", "MF", 23, 78),
         P("Chuba Akpom", "FW", 30, 76), P("Kiril Despodov", "FW", 30, 77), P("Fedor Chalov", "FW", 28, 75), P("Luka Ivanušec", "FW", 27, 76),
       ]},
     { id: "gre_aek", name: "AEK Athens", short: "AEK", city: "Athens", stadium: "OPAP Arena", colors: ["#FFD700", "#000000"], tier: 4,
       squad: [
         P("Thomas Strakosha", "GK", 31, 75), P("Cican Stanković", "GK", 33, 73),
         P("Harold Moukoudi", "DF", 28, 75), P("Gerasimos Mitoglou", "DF", 28, 73), P("Milad Mohammadi", "DF", 32, 73), P("Lazaros Rota", "DF", 27, 73), P("Domagoj Vida", "DF", 37, 73), P("Filip Mladenović", "DF", 34, 72),
         P("Orbelín Pineda", "MF", 30, 77), P("Erik Lamela", "MF", 34, 76), P("Petros Mantalos", "MF", 34, 74), P("Damian Szymański", "MF", 31, 74), P("Roberto Pereyra", "MF", 35, 75),
         P("Anthony Martial", "FW", 30, 77), P("Levi García", "FW", 28, 77), P("Ezequiel Ponce", "FW", 28, 76), P("Niclas Eliasson", "FW", 30, 75),
       ]},
     { id: "gre_pan", name: "Panathinaikos", short: "PAN", city: "Athens", stadium: "Apostolos Nikolaidis", colors: ["#00A650", "#FFFFFF"], tier: 4,
       squad: [
         P("Bartłomiej Drągowski", "GK", 28, 76), P("Yannis Kotsiras", "GK", 24, 71),
         P("Tin Jedvaj", "DF", 30, 74), P("Giorgos Vagiannidis", "DF", 24, 74), P("Bart Schenkeveld", "DF", 34, 73), P("Georgios Kyriakopoulos", "DF", 29, 74), P("Juankar", "DF", 34, 72), P("Vasilis Sourlis", "DF", 27, 73),
         P("Adam Gnezda Čerin", "MF", 26, 75), P("Facundo Pellistri", "MF", 24, 76), P("Filip Đuričić", "MF", 34, 75), P("Tonny Vilhena", "MF", 31, 74), P("Rúben Pérez", "MF", 36, 72),
         P("Karol Świderski", "FW", 29, 76), P("Bernard Tekpetey", "FW", 28, 75), P("Andraž Šporar", "FW", 32, 74), P("Tetê", "FW", 26, 78),
       ]},
     { id: "gre_ari", name: "Aris", short: "ARI", city: "Thessaloniki", stadium: "Kleanthis Vikelidis", colors: ["#FFD700", "#000000"], tier: 3, squad: [] },
     { id: "gre_pae", name: "Panetolikos", short: "PAE", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "gre_ofi", name: "OFI Crete", short: "OFI", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "gre_atr", name: "Atromitos", short: "ATR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "gre_vol", name: "Volos", short: "VOL", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "gre_lam", name: "Lamia", short: "LAM", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "gre_kal", name: "Kallithea", short: "KAL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "gre_lev", name: "Levadiakos", short: "LEV", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "gre_pns", name: "Panserraikos", short: "PNS", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "gre_ast", name: "Asteras Tripolis", short: "AST", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
   ];
   const RAW_GR_GS2 = [
     { id: "gre_kif", name: "Kifisia", short: "KIF", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_ilp", name: "Ilioupoli", short: "ILP", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_cha", name: "Chania", short: "CHA", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "gre_niv", name: "Niki Volos", short: "NIV", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_mak", name: "Makedonikos", short: "MAK", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_kmp", name: "Kampaniakos", short: "KMP", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_lar", name: "AEL Larissa", short: "LAR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_pnc", name: "Panachaiki", short: "PNC", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "gre_erg", name: "Ergotelis", short: "ERG", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "gre_mrk", name: "Marko", short: "MRK", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_aig", name: "Aiginiakos", short: "AIG", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_dia", name: "Diagoras", short: "DIA", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "gre_kar", name: "Anagennisi Karditsa", short: "KAR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gre_ovl", name: "Olympiacos Volos", short: "OVL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // =========================================================================
   // N-TIMES ROUND-ROBIN NATIONS (Phase 5 — triple / quadruple leagues)
   // =========================================================================

   // ---- SCOTLAND (Premiership: triple round-robin then 6/6 split) ----
   const RAW_SC_SPL = [
     { id: "sco_cel", name: "Celtic", short: "CEL", city: "Glasgow", stadium: "Celtic Park", colors: ["#16984B", "#FFFFFF"], tier: 4,
       squad: [
         P("Kasper Schmeichel", "GK", 39, 78), P("Viljami Sinisalo", "GK", 24, 73),
         P("Cameron Carter-Vickers", "DF", 28, 79), P("Liam Scales", "DF", 27, 76), P("Auston Trusty", "DF", 27, 77), P("Alistair Johnston", "DF", 27, 77), P("Kieran Tierney", "DF", 29, 78), P("Anthony Ralston", "DF", 27, 73),
         P("Callum McGregor", "MF", 32, 78), P("Reo Hatate", "MF", 28, 78), P("Arne Engels", "MF", 22, 77), P("Paulo Bernardo", "MF", 24, 75), P("Benjamin Nygren", "MF", 24, 76),
         P("Daizen Maeda", "FW", 28, 79), P("Johnny Kenny", "FW", 22, 73), P("Nicolas Kühn", "FW", 26, 78), P("Adam Idah", "FW", 25, 75), P("Luke McCowan", "FW", 27, 73),
       ]},
     { id: "sco_ran", name: "Rangers", short: "RAN", city: "Glasgow", stadium: "Ibrox", colors: ["#1B458F", "#FFFFFF"], tier: 4,
       squad: [
         P("Jack Butland", "GK", 33, 78), P("Liam Kelly", "GK", 30, 72),
         P("John Souttar", "DF", 30, 76), P("Nasser Djiga", "DF", 23, 75), P("Dujon Sterling", "DF", 26, 74), P("James Tavernier", "DF", 34, 75), P("Jefté", "DF", 22, 74), P("Max Aarons", "DF", 26, 76),
         P("Nicolas Raskin", "MF", 25, 77), P("Mohamed Diomande", "MF", 24, 76), P("Connor Barron", "MF", 23, 74), P("Vaclav Cerny", "MF", 28, 76), P("Joe Rothwell", "MF", 31, 74),
         P("Cyriel Dessers", "FW", 31, 76), P("Danilo", "FW", 26, 75), P("Oscar Cortés", "FW", 22, 74), P("Findlay Curtis", "FW", 20, 73), P("Djeidi Gassama", "FW", 22, 74),
       ]},
     { id: "sco_abe", name: "Aberdeen", short: "ABE", city: "Aberdeen", stadium: "Pittodrie", colors: ["#E03A3E", "#FFFFFF"], tier: 3,
       squad: [
         P("Dimitar Mitov", "GK", 28, 74), P("Ross Doohan", "GK", 28, 71),
         P("Slobodan Rubežić", "DF", 25, 74), P("Angus MacDonald", "DF", 33, 72), P("Jack MacKenzie", "DF", 25, 73), P("Nicky Devlin", "DF", 32, 73), P("Gavin Molloy", "DF", 24, 73), P("Mats Knoester", "DF", 27, 73),
         P("Graeme Shinnie", "MF", 34, 73), P("Sivert Heltne Nilsen", "MF", 34, 73), P("Leighton Clarkson", "MF", 24, 75), P("Dante Polvara", "MF", 25, 72), P("Topi Keskinen", "MF", 22, 73),
         P("Kevin Nisbet", "FW", 29, 74), P("Ester Sokler", "FW", 26, 73), P("Pape Habib Gueye", "FW", 26, 73), P("Shayden Morris", "FW", 23, 73),
       ]},
     { id: "sco_hea", name: "Hearts", short: "HEA", city: "Edinburgh", stadium: "Tynecastle", colors: ["#7A263A", "#FFFFFF"], tier: 3,
       squad: [
         P("Craig Gordon", "GK", 43, 74), P("Zander Clark", "GK", 33, 73),
         P("Frankie Kent", "DF", 30, 73), P("Craig Halkett", "DF", 30, 72), P("Stephen Kingsley", "DF", 31, 73), P("Adam Forrester", "DF", 22, 72), P("Gerald Taylor", "DF", 23, 72), P("Michael Steinwender", "DF", 27, 73),
         P("Cammy Devlin", "MF", 27, 74), P("Beni Baningime", "MF", 27, 74), P("Calem Nieuwenhof", "MF", 24, 74), P("Blair Spittal", "MF", 30, 73), P("Yan Dhanda", "MF", 27, 73),
         P("Lawrence Shankland", "FW", 30, 76), P("Musa Drammeh", "FW", 22, 72), P("Elton Kabangu", "FW", 27, 73), P("James Wilson", "FW", 19, 73),
       ]},
     { id: "sco_hib", name: "Hibernian", short: "HIB", city: "Edinburgh", stadium: "Easter Road", colors: ["#00752F", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sco_dun", name: "Dundee United", short: "DUN", colors: ["#FF6600", "#000000"], tier: 2, squad: [] },
     { id: "sco_kil", name: "Kilmarnock", short: "KIL", colors: ["#003399", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sco_stm", name: "St Mirren", short: "STM", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sco_mot", name: "Motherwell", short: "MOT", colors: ["#FFC20E", "#8A1538"], tier: 2, squad: [] },
     { id: "sco_dee", name: "Dundee", short: "DEE", colors: ["#0A2340", "#E30613"], tier: 2, squad: [] },
     { id: "sco_ros", name: "Ross County", short: "ROS", colors: ["#000000", "#0A2340"], tier: 2, squad: [] },
     { id: "sco_stj", name: "St Johnstone", short: "STJ", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_SC_SC2 = [
     { id: "sco_fal", name: "Falkirk", short: "FAL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sco_liv", name: "Livingston", short: "LIV", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "sco_par", name: "Partick Thistle", short: "PAR", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "sco_rai", name: "Raith Rovers", short: "RAI", colors: ["#0A2340", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sco_dnf", name: "Dunfermline", short: "DNF", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sco_ayr", name: "Ayr United", short: "AYR", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sco_mor", name: "Greenock Morton", short: "MOR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sco_qpk", name: "Queen's Park", short: "QPK", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sco_air", name: "Airdrieonians", short: "AIR", colors: ["#FFFFFF", "#E30613"], tier: 1, squad: [] },
     { id: "sco_ham", name: "Hamilton", short: "HAM", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- SWITZERLAND (Super League: triple round-robin then 6/6 split) ----
   // FC Vaduz (Liechtenstein) plays in the Swiss pyramid — folded in here.
   const RAW_CH_SSL = [
     { id: "sui_ybb", name: "Young Boys", short: "YBB", city: "Bern", stadium: "Wankdorf", colors: ["#FFD700", "#000000"], tier: 4,
       squad: [
         P("Marvin Keller", "GK", 23, 74),
         P("Loris Benito", "DF", 33, 73), P("Mohamed Ali Camara", "DF", 25, 73), P("Jaouen Hadjam", "DF", 23, 74), P("Saidy Janko", "DF", 30, 73), P("Lewin Blum", "DF", 24, 73),
         P("Sandro Lauper", "MF", 29, 73), P("Darian Males", "MF", 25, 74), P("Filip Ugrinic", "MF", 26, 74), P("Lukasz Lakomy", "MF", 24, 73),
         P("Cedric Itten", "FW", 29, 74), P("Joël Monteiro", "FW", 26, 74), P("Chris Bedia", "FW", 29, 73), P("Alan Virginius", "FW", 23, 73),
       ]},
     { id: "sui_bas", name: "Basel", short: "BAS", city: "Basel", stadium: "St. Jakob-Park", colors: ["#E30613", "#005CA9"], tier: 4,
       squad: [
         P("Marwin Hitz", "GK", 38, 74),
         P("Adrian Barišić", "DF", 24, 73), P("Jonas Adjetey", "DF", 22, 74), P("Nicolas Vouilloz", "DF", 24, 73), P("Dominik Schmid", "DF", 27, 73), P("Finn van Breemen", "DF", 22, 73),
         P("Xherdan Shaqiri", "MF", 34, 78), P("Leon Avdullahu", "MF", 22, 74), P("Marin Šoticek", "MF", 24, 73), P("Koba Koindredi", "MF", 23, 73),
         P("Philip Otele", "FW", 26, 74), P("Albian Ajeti", "FW", 28, 73), P("Bénie Traoré", "FW", 23, 74), P("Ibrahim Salah", "FW", 24, 73),
       ]},
     { id: "sui_ser", name: "Servette", short: "SER", city: "Geneva", stadium: "Stade de Genève", colors: ["#7A263A", "#FFFFFF"], tier: 3,
       squad: [
         P("Jérémy Frick", "GK", 32, 73),
         P("Steve Rouiller", "DF", 34, 72), P("Yoan Severin", "DF", 28, 72), P("Bradley Mazikou", "DF", 28, 72), P("Keigo Tsunemoto", "DF", 25, 73),
         P("Timothé Cognat", "MF", 27, 73), P("Gaël Ondoua", "MF", 30, 72), P("Alexis Antunes", "MF", 24, 73), P("Miroslav Stevanović", "MF", 35, 73),
         P("Dereck Kutesa", "FW", 27, 74), P("Enzo Crivelli", "FW", 30, 73), P("Jérémy Guillemenot", "FW", 27, 72),
       ]},
     { id: "sui_lug", name: "Lugano", short: "LUG", city: "Lugano", stadium: "Cornaredo", colors: ["#000000", "#FFFFFF"], tier: 3,
       squad: [
         P("Amir Saipi", "GK", 25, 72),
         P("Jonathan Sabbatini", "DF", 33, 72), P("Albian Hajdari", "DF", 22, 73), P("Martim Marques", "DF", 24, 72), P("Ousmane Doumbia", "DF", 33, 72),
         P("Uran Bislimi", "MF", 26, 73), P("Anto Grgić", "MF", 28, 72), P("Mohamed Mahou", "MF", 22, 72), P("Hicham Mahou", "MF", 22, 72),
         P("Renato Steffen", "FW", 34, 74), P("Žan Celar", "FW", 26, 73), P("Shkelqim Vladi", "FW", 23, 72),
       ]},
     { id: "sui_sga", name: "St. Gallen", short: "SGA", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sui_zur", name: "Zürich", short: "ZUR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sui_lau", name: "Lausanne", short: "LAU", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sui_luz", name: "Luzern", short: "LUZ", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sui_gra", name: "Grasshopper", short: "GRA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sui_sio", name: "Sion", short: "SIO", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sui_yve", name: "Yverdon", short: "YVE", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "sui_win", name: "Winterthur", short: "WIN", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_CH_SCL = [
     { id: "sui_aar", name: "Aarau", short: "AAR", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sui_thu", name: "Thun", short: "THU", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sui_vad", name: "Vaduz", short: "VAD", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "sui_wil", name: "Wil", short: "WIL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sui_xam", name: "Neuchâtel Xamax", short: "XAM", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "sui_sch", name: "Schaffhausen", short: "SCH", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "sui_bel", name: "Bellinzona", short: "BEL", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "sui_nyo", name: "Stade Nyonnais", short: "NYO", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "sui_car", name: "Étoile Carouge", short: "CAR", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "sui_rap", name: "Rapperswil-Jona", short: "RAP", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- CROATIA (HNL: quadruple round-robin) ----
   const RAW_HR_HNL = [
     { id: "cro_din", name: "Dinamo Zagreb", short: "DIN", city: "Zagreb", stadium: "Maksimir", colors: ["#005CA9", "#FFFFFF"], tier: 4,
       squad: [
         P("Ivan Nevistić", "GK", 27, 74),
         P("Scott McKenna", "DF", 29, 75), P("Maroje Brajković", "DF", 22, 73), P("Moris Valinčić", "DF", 25, 73), P("Stefan Ristovski", "DF", 34, 72), P("Mario Stojaković", "DF", 22, 72),
         P("Dejan Ljubičić", "MF", 27, 75), P("Josip Mišić", "MF", 31, 74), P("Miha Zajc", "MF", 31, 74), P("Gabriel Vidović", "MF", 22, 74), P("Luka Stojković", "MF", 20, 73),
         P("Bruno Petković", "FW", 31, 76), P("Sandro Kulenović", "FW", 25, 74), P("Arber Hoxha", "FW", 26, 74), P("Dion Drena Beljo", "FW", 23, 74),
       ]},
     { id: "cro_haj", name: "Hajduk Split", short: "HAJ", city: "Split", stadium: "Poljud", colors: ["#005CA9", "#FFFFFF"], tier: 4,
       squad: [
         P("Ivan Lučić", "GK", 30, 73),
         P("Zvonimir Šarlija", "DF", 29, 73), P("Filip Uremović", "DF", 28, 73), P("Niko Sigur", "DF", 24, 73), P("Dario Melnjak", "DF", 32, 72), P("Branimir Mlačić", "DF", 22, 72),
         P("Filip Krovinović", "MF", 30, 75), P("Emir Sahiti", "MF", 25, 74), P("Rokas Pukštas", "MF", 21, 74), P("Nikola Kalinić", "MF", 27, 73), P("Anthony Kalik", "MF", 27, 73),
         P("Marko Livaja", "FW", 32, 77), P("Adrion Pajaziti", "FW", 21, 72), P("Roko Brajković", "FW", 20, 72),
       ]},
     { id: "cro_rij", name: "Rijeka", short: "RIJ", city: "Rijeka", stadium: "Rujevica", colors: ["#FFFFFF", "#005CA9"], tier: 3, squad: [] },
     { id: "cro_osi", name: "Osijek", short: "OSI", city: "Osijek", stadium: "Opus Arena", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "cro_sla", name: "Slaven Belupo", short: "SLA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cro_lok", name: "Lokomotiva", short: "LOK", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "cro_gor", name: "Gorica", short: "GOR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cro_var", name: "Varaždin", short: "VAR", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "cro_ist", name: "Istra 1961", short: "IST", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
     { id: "cro_sib", name: "Šibenik", short: "SIB", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_HR_HN2 = [
     { id: "cro_cib", name: "Cibalia", short: "CIB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cro_dub", name: "Dubrava", short: "DUB", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cro_ses", name: "Sesvete", short: "SES", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cro_jar", name: "Jarun", short: "JAR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cro_bbr", name: "Bijelo Brdo", short: "BBR", colors: ["#FFFFFF", "#005CA9"], tier: 1, squad: [] },
     { id: "cro_ori", name: "Orijent", short: "ORI", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cro_rud", name: "Rudeš", short: "RUD", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cro_vuk", name: "Vukovar 1991", short: "VUK", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cro_zmi", name: "Zmijavci", short: "ZMI", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "cro_sol", name: "Solin", short: "SOL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cro_kus", name: "Kustošija", short: "KUS", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "cro_opa", name: "Opatija", short: "OPA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- HUNGARY (NB I: triple round-robin, no split) ----
   const RAW_HU_NB1 = [
     { id: "hun_fer", name: "Ferencváros", short: "FER", city: "Budapest", stadium: "Groupama Aréna", colors: ["#00A650", "#FFFFFF"], tier: 4,
       squad: [
         P("Dénes Dibusz", "GK", 35, 74),
         P("Cebrail Makreckis", "DF", 25, 72), P("Samy Mmaee", "DF", 28, 73), P("Raul Gustavo", "DF", 26, 73), P("Ibrahim Cissé", "DF", 24, 73), P("Eldar ÄiviÄ", "DF", 29, 72),
         P("Naby Keïta", "MF", 31, 74), P("Mohammed Abu Fani", "MF", 27, 74), P("Kristoffer Zachariassen", "MF", 31, 73), P("Callum O'Dowda", "MF", 30, 73), P("Gabi Kanichowsky", "MF", 27, 73),
         P("Barnabás Varga", "FW", 26, 75), P("Adama Traoré", "FW", 30, 73), P("Aleksandar Pešić", "FW", 34, 72),
       ]},
     { id: "hun_pus", name: "Puskás Akadémia", short: "PUS", city: "Felcsút", stadium: "Pancho Aréna", colors: ["#005CA9", "#FFD700"], tier: 3, squad: [] },
     { id: "hun_pak", name: "Paks", short: "PAK", colors: ["#00A650", "#FFFFFF"], tier: 3, squad: [] },
     { id: "hun_feh", name: "Fehérvár", short: "FEH", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "hun_deb", name: "Debrecen", short: "DEB", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "hun_kis", name: "Kisvárda", short: "KIS", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "hun_ujp", name: "Újpest", short: "UJP", colors: ["#4B2E83", "#FFFFFF"], tier: 2, squad: [] },
     { id: "hun_mtk", name: "MTK Budapest", short: "MTK", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "hun_dio", name: "Diósgyőr", short: "DIO", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "hun_zal", name: "Zalaegerszeg", short: "ZAL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "hun_nyi", name: "Nyíregyháza", short: "NYI", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "hun_kec", name: "Kecskemét", short: "KEC", colors: ["#8A1538", "#FFD700"], tier: 2, squad: [] },
   ];
   const RAW_HU_NB2 = [
     { id: "hun_vas", name: "Vasas", short: "VAS", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "hun_hon", name: "Honvéd", short: "HON", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "hun_eto", name: "ETO Győr", short: "ETO", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_sze", name: "Szeged", short: "SZE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_vac", name: "Vác", short: "VAC", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "hun_ajk", name: "Ajka", short: "AJK", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_csa", name: "Csákvár", short: "CSA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_bek", name: "Békéscsaba", short: "BEK", colors: ["#4B0082", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_bud", name: "Budafok", short: "BUD", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_hal", name: "Haladás", short: "HAL", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_koz", name: "Kozármisleny", short: "KOZ", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_sio", name: "Siófok", short: "SIO", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "hun_tis", name: "Tiszakécske", short: "TIS", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_mos", name: "Mosonmagyaróvár", short: "MOS", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "hun_sor", name: "Soroksár", short: "SOR", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "hun_kar", name: "Karcag", short: "KAR", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
   ];

   // =========================================================================
   // TOP-5 FULL PYRAMIDS — France (new, 4 tiers) + 3rd/4th tiers for Spain,
   // Germany, Italy so each of the big five nations has four divisions.
   // =========================================================================

   // ---- FRANCE (Ligue 1 / Ligue 2 / National / National 2) ----
   const RAW_FR_FL1 = [
     { id: "fra_psg", name: "Paris Saint-Germain", short: "PSG", city: "Paris", stadium: "Parc des Princes", colors: ["#004170", "#E30613"], tier: 5,
       squad: [
         P("Lucas Chevalier", "GK", 24, 81), P("Matvey Safonov", "GK", 27, 77),
         P("Marquinhos", "DF", 32, 84), P("Willian Pacho", "DF", 25, 83), P("Achraf Hakimi", "DF", 28, 86), P("Nuno Mendes", "DF", 24, 84), P("Lucas Beraldo", "DF", 22, 78), P("Lucas Hernández", "DF", 30, 79), P("Presnel Kimpembe", "DF", 31, 76),
         P("Vitinha", "MF", 26, 86), P("João Neves", "MF", 22, 84), P("Fabián Ruiz", "MF", 30, 83), P("Warren Zaïre-Emery", "MF", 20, 82), P("Lee Kang-in", "MF", 25, 80), P("Senny Mayulu", "MF", 20, 77),
         P("Ousmane Dembélé", "FW", 29, 88), P("Khvicha Kvaratskhelia", "FW", 25, 87), P("Bradley Barcola", "FW", 24, 84), P("Désiré Doué", "FW", 21, 83), P("Gonçalo Ramos", "FW", 25, 80),
       ]},
     { id: "fra_mar", name: "Marseille", short: "MAR", city: "Marseille", stadium: "Vélodrome", colors: ["#2FAEE0", "#FFFFFF"], tier: 4,
       squad: [
         P("Gerónimo Rulli", "GK", 34, 79), P("Jeffrey de Lange", "GK", 27, 72),
         P("Leonardo Balerdi", "DF", 27, 79), P("Facundo Medina", "DF", 27, 78), P("CJ Egan-Riley", "DF", 24, 76), P("Emerson", "DF", 27, 76), P("Amir Murillo", "DF", 30, 75), P("Ulisses Garcia", "DF", 29, 74),
         P("Pierre-Emile Højbjerg", "MF", 31, 80), P("Geoffrey Kondogbia", "MF", 33, 77), P("Angel Gomes", "MF", 26, 78), P("Matt O'Riley", "MF", 25, 79), P("Arthur Vermeeren", "MF", 21, 77),
         P("Mason Greenwood", "FW", 25, 82), P("Amine Gouiri", "FW", 26, 79), P("Igor Paixão", "FW", 26, 79), P("Pierre-Emerick Aubameyang", "FW", 37, 78), P("Neal Maupay", "FW", 30, 75),
       ]},
     { id: "fra_mon", name: "Monaco", short: "MON", city: "Monaco", stadium: "Louis II", colors: ["#E30613", "#FFFFFF"], tier: 4,
       squad: [
         P("Philipp Köhn", "GK", 28, 77), P("Radosław Majecki", "GK", 26, 74),
         P("Thilo Kehrer", "DF", 30, 78), P("Mohammed Salisu", "DF", 27, 78), P("Vanderson", "DF", 25, 79), P("Caio Henrique", "DF", 29, 77), P("Jordan Teze", "DF", 27, 76), P("Eric Dier", "DF", 32, 77),
         P("Denis Zakaria", "MF", 29, 81), P("Maghnes Akliouche", "MF", 24, 81), P("Aleksandr Golovin", "MF", 30, 79), P("Lamine Camara", "MF", 22, 79), P("Paul Pogba", "MF", 33, 76),
         P("Folarin Balogun", "FW", 25, 79), P("Mika Biereth", "FW", 23, 79), P("Takumi Minamino", "FW", 31, 77), P("Ansu Fati", "FW", 24, 77), P("George Ilenikhena", "FW", 20, 76),
       ]},
     { id: "fra_lil", name: "Lille", short: "LIL", city: "Lille", stadium: "Pierre-Mauroy", colors: ["#E30613", "#005CA9"], tier: 4,
       squad: [
         P("Berke Özer", "GK", 26, 76), P("Arnaud Bodart", "GK", 28, 75),
         P("Alexsandro", "DF", 26, 78), P("Nathan Ngoy", "DF", 22, 75), P("Aïssa Mandi", "DF", 34, 74), P("Thomas Meunier", "DF", 34, 74), P("Gabriel Gudmundsson", "DF", 27, 76), P("Ismaily", "DF", 36, 72),
         P("Benjamin André", "MF", 35, 76), P("Ayyoub Bouaddi", "MF", 19, 77), P("Ngal'ayel Mukau", "MF", 21, 76), P("Rémy Cabella", "MF", 36, 75), P("Ethan Mbappé", "MF", 19, 74),
         P("Olivier Giroud", "FW", 40, 76), P("Hamza Igamane", "FW", 23, 77), P("Félix Correia", "FW", 25, 75), P("Matias Fernandez-Pardo", "FW", 20, 75), P("Osame Sahraoui", "FW", 24, 76),
       ]},
     { id: "fra_lyo", name: "Lyon", short: "LYO", city: "Lyon", stadium: "Groupama Stadium", colors: ["#005CA9", "#E30613"], tier: 3,
       squad: [
         P("Rémy Descamps", "GK", 29, 74), P("Dominik Greif", "GK", 29, 74),
         P("Moussa Niakhaté", "DF", 30, 77), P("Clinton Mata", "DF", 33, 76), P("Nicolás Tagliafico", "DF", 34, 76), P("Abner", "DF", 26, 75), P("Saël Kumbedi", "DF", 21, 75), P("Ainsley Maitland-Niles", "DF", 29, 76),
         P("Corentin Tolisso", "MF", 32, 78), P("Tanner Tessmann", "MF", 24, 77), P("Pavel Šulc", "MF", 25, 78), P("Tyler Morton", "MF", 23, 77), P("Nemanja Matić", "MF", 38, 75),
         P("Malick Fofana", "FW", 21, 79), P("Martín Satriano", "FW", 25, 75), P("Afonso Moreira", "FW", 21, 74), P("Rachid Ghezzal", "FW", 34, 73),
       ]},
     { id: "fra_nic", name: "Nice", short: "NIC", city: "Nice", stadium: "Allianz Riviera", colors: ["#E30613", "#000000"], tier: 3,
       squad: [
         P("Marcin Bułka", "GK", 26, 78), P("Teddy Boulhendi", "GK", 24, 72),
         P("Dante", "DF", 43, 72), P("Moïse Bombito", "DF", 26, 77), P("Melvin Bard", "DF", 26, 76), P("Antoine Mendy", "DF", 22, 74), P("Ali Abdi", "DF", 32, 74), P("Mohamed Abdelmonem", "DF", 27, 74),
         P("Hicham Boudaoui", "MF", 27, 76), P("Sofiane Diop", "MF", 26, 77), P("Pablo Rosario", "MF", 29, 76), P("Morgan Sanson", "MF", 32, 75), P("Tom Louchet", "MF", 21, 73),
         P("Terem Moffi", "FW", 27, 78), P("Jérémie Boga", "FW", 29, 77), P("Mohamed-Ali Cho", "FW", 22, 76), P("Kevin Carlos", "FW", 24, 75),
       ]},
     { id: "fra_len", name: "Lens", short: "LEN", city: "Lens", stadium: "Bollaert-Delelis", colors: ["#FFD700", "#E30613"], tier: 3,
       squad: [
         P("Robin Risser", "GK", 21, 74), P("Hervé Koffi", "GK", 29, 74),
         P("Jonathan Gradit", "DF", 33, 74), P("Malang Sarr", "DF", 27, 75), P("Ruben Aguilar", "DF", 33, 73), P("Deiver Machado", "DF", 32, 74), P("Jhoanner Chávez", "DF", 23, 74), P("Ismaël Boura", "DF", 24, 73),
         P("Adrien Thomasson", "MF", 32, 75), P("Andy Diouf", "MF", 23, 77), P("Hamzat Ojediran", "MF", 22, 73), P("Adrien Louveau", "MF", 21, 72),
         P("Florian Sotoca", "FW", 35, 76), P("Odsonne Édouard", "FW", 28, 76), P("Wesley Saïd", "FW", 31, 74), P("Rayan Fofana", "FW", 20, 74),
       ]},
     { id: "fra_ren", name: "Rennes", short: "REN", city: "Rennes", stadium: "Roazhon Park", colors: ["#E30613", "#000000"], tier: 3,
       squad: [
         P("Brice Samba", "GK", 32, 79), P("Gauthier Gallon", "GK", 32, 73),
         P("Christopher Wooh", "DF", 24, 77), P("Anthony Rouault", "DF", 25, 75), P("Jérémy Jacquet", "DF", 20, 75), P("Alidu Seidu", "DF", 26, 74), P("Brendan Chardonnet", "DF", 31, 74), P("Przemysław Frankowski", "DF", 31, 75),
         P("Valentin Rongier", "MF", 31, 78), P("Djaoui Cissé", "MF", 21, 75), P("Azor Matusiwa", "MF", 27, 76), P("Ludovic Blas", "MF", 28, 77), P("Kader Meïté", "MF", 20, 74),
         P("Esteban Lepaul", "FW", 25, 76), P("Breel Embolo", "FW", 29, 78), P("Jordan James", "FW", 21, 75), P("Henrik Meister", "FW", 22, 74),
       ]},
     { id: "fra_str", name: "Strasbourg", short: "STR", colors: ["#005CA9", "#FFFFFF"], tier: 2,
       squad: [
         P("Mike Penders", "GK", 20, 75), P("Alaa Bellaarouch", "GK", 21, 71),
         P("Ismaël Doukouré", "DF", 23, 75), P("Abakar Sylla", "DF", 23, 74), P("Guela Doué", "DF", 23, 76), P("Marvin Senaya", "DF", 23, 74), P("Thomas Delaine", "DF", 33, 72), P("Mamadou Sarr", "DF", 20, 74),
         P("Dilane Bakwa", "MF", 23, 78), P("Andrey Santos", "MF", 22, 78), P("Sebastian Nanasi", "MF", 23, 75), P("Valentín Barco", "MF", 21, 76), P("Pape Diong", "MF", 20, 73),
         P("Emanuel Emegha", "FW", 23, 78), P("Joaquín Panichelli", "FW", 23, 76), P("Félix Lemaréchal", "FW", 20, 74), P("Abdoul Ouattara", "FW", 20, 73),
       ]},
     { id: "fra_bre", name: "Brest", short: "BRE", colors: ["#E30613", "#FFFFFF"], tier: 2,
       squad: [
         P("Marco Bizot", "GK", 35, 76), P("Grégoire Coudert", "GK", 26, 73),
         P("Bradley Locko", "DF", 24, 75), P("Soumaïla Coulibaly", "DF", 22, 74), P("Kenny Lala", "DF", 34, 73), P("Massadio Haïdara", "DF", 33, 72), P("Julien Le Cardinal", "DF", 28, 73), P("Lilian Brassier", "DF", 26, 75),
         P("Pierre Lees-Melou", "MF", 32, 76), P("Hugo Magnetti", "MF", 28, 74), P("Romain Del Castillo", "MF", 30, 75), P("Kamory Doumbia", "MF", 23, 75), P("Mahdi Camara", "MF", 27, 74),
         P("Ludovic Ajorque", "FW", 32, 77), P("Abdallah Sima", "FW", 24, 76), P("Mama Baldé", "FW", 30, 74), P("Jérémy Le Douaron", "FW", 27, 74),
       ]},
     { id: "fra_tou", name: "Toulouse", short: "TOU", colors: ["#4B2E83", "#FFFFFF"], tier: 2,
       squad: [
         P("Guillaume Restes", "GK", 21, 77), P("Alban Lafont", "GK", 27, 76),
         P("Charlie Cresswell", "DF", 24, 76), P("Rasmus Nicolaisen", "DF", 28, 73), P("Kevin Keben", "DF", 22, 73), P("Mikkel Desler", "DF", 30, 73), P("Warren Kamanzi", "DF", 24, 73), P("Jaydee Canvot", "DF", 19, 73),
         P("Vincent Sierro", "MF", 30, 76), P("Cristian Cásseres", "MF", 26, 75), P("Aron Dønnum", "MF", 27, 75), P("Shavy Babicka", "MF", 22, 73),
         P("Yann Gboho", "FW", 24, 75), P("Frank Magri", "FW", 26, 74), P("Santiago Hidalgo", "FW", 21, 73), P("Emersonn", "FW", 24, 76),
       ]},
     { id: "fra_nan", name: "Nantes", short: "NAN", colors: ["#FFD700", "#00A650"], tier: 2,
       squad: [
         P("Anthony Lopes", "GK", 36, 75), P("Patrik Carlgren", "GK", 33, 72),
         P("Nicolas Cozza", "DF", 27, 74), P("Jean-Charles Castelletto", "DF", 31, 74), P("Nathan Zézé", "DF", 21, 75), P("Chidozie Awaziem", "DF", 29, 73), P("Jean-Kévin Duverne", "DF", 28, 73), P("Tylel Tati", "DF", 19, 73),
         P("Pedro Chirivella", "MF", 28, 75), P("Douglas Augusto", "MF", 28, 74), P("Johann Lepenant", "MF", 24, 75), P("Kwon Hyeok-kyu", "MF", 24, 74), P("Sorba Thomas", "MF", 27, 74),
         P("Matthis Abline", "FW", 23, 77), P("Mostafa Mohamed", "FW", 28, 76), P("Herba Guirassy", "FW", 22, 73), P("Bahereba Guirassy", "FW", 20, 72),
       ]},
     { id: "fra_lha", name: "Le Havre", short: "LHA", colors: ["#005CA9", "#87CEEB"], tier: 2,
       squad: [
         P("Mory Diaw", "GK", 32, 73), P("Arthur Desmas", "GK", 31, 71),
         P("Arouna Sangante", "DF", 23, 73), P("Étienne Youte Kinkoue", "DF", 23, 73), P("Gautier Lloris", "DF", 28, 72), P("Christopher Opéri", "DF", 28, 72), P("Yoann Salmier", "DF", 33, 72), P("Emmanuel Sabbi", "DF", 28, 72),
         P("Rassoul Ndiaye", "MF", 24, 73), P("Daler Kuzyaev", "MF", 32, 74), P("Abdoulaye Touré", "MF", 32, 74), P("Gökhan Gül", "MF", 27, 72), P("Yassine Kechta", "MF", 22, 73),
         P("Issa Soumaré", "FW", 24, 73), P("Simon Ebonog", "FW", 21, 72), P("Godson Kyeremeh", "FW", 24, 72), P("Ahmed Hassan", "FW", 23, 72),
       ]},
     { id: "fra_rei", name: "Reims", short: "REI", colors: ["#E30613", "#FFFFFF"], tier: 2,
       squad: [
         P("Yehvann Diouf", "GK", 26, 74), P("Alexandre Olliero", "GK", 29, 71),
         P("Yunis Abdelhamid", "DF", 38, 73), P("Cédric Kipré", "DF", 29, 74), P("Sergio Akieme", "DF", 28, 73), P("Thibault De Smet", "DF", 27, 72), P("Joseph Okumu", "DF", 28, 74), P("Maxime Busi", "DF", 26, 72),
         P("Valentin Atangana", "MF", 20, 74), P("Teddy Teuma", "MF", 32, 74), P("Sekou Keita", "MF", 22, 73), P("Yaya Fofana", "MF", 24, 73), P("Ibrahim Diakité", "MF", 23, 72),
         P("Keito Nakamura", "FW", 26, 76), P("Mohamed Daramy", "FW", 24, 75), P("Oumar Diakité", "FW", 22, 73), P("Amadou Koné", "FW", 22, 72),
       ]},
     { id: "fra_aux", name: "Auxerre", short: "AUX", colors: ["#005CA9", "#FFFFFF"], tier: 2,
       squad: [
         P("Donovan Léon", "GK", 33, 72), P("Théo De Percin", "GK", 24, 70),
         P("Jubal", "DF", 32, 72), P("Clément Akpa", "DF", 25, 72), P("Sinaly Diomandé", "DF", 25, 73), P("Paul Joly", "DF", 26, 72), P("Gideon Mensah", "DF", 28, 72), P("Marvin Tshibuabua", "DF", 24, 72),
         P("Gaëtan Perrin", "MF", 29, 74), P("Elisha Owusu", "MF", 28, 74), P("Rayan Raveloson", "MF", 29, 73), P("Lassine Sinayoko", "MF", 26, 74), P("Kevin Danois", "MF", 22, 71),
         P("Sékou Mara", "FW", 24, 74), P("Ado Onaiwu", "FW", 30, 73), P("Hamed Traoré", "FW", 26, 75), P("Danay Ba", "FW", 22, 71),
       ]},
     { id: "fra_ang", name: "Angers", short: "ANG", colors: ["#000000", "#FFFFFF"], tier: 2,
       squad: [
         P("Yahia Fofana", "GK", 25, 73), P("Paul Bernardoni", "GK", 29, 74),
         P("Chico Lamba", "DF", 23, 73), P("Yan Valery", "DF", 27, 73), P("Jacques Ekomié", "DF", 30, 72), P("Lilian Raolisoa", "DF", 22, 72), P("Ondřej Mihálik", "DF", 28, 71), P("Emmanuel Bianchini", "DF", 21, 71),
         P("Himad Abdelli", "MF", 26, 76), P("Jim Allevinah", "MF", 30, 73), P("Marius Courcoul", "MF", 21, 72), P("Yassin Belkhdim", "MF", 22, 72), P("Jean-Eudes Aholou", "MF", 32, 73),
         P("Sidiki Chérif", "FW", 22, 73), P("Bamba Dieng", "FW", 26, 75), P("Farid El Melali", "FW", 28, 73), P("Zinédine Ould Khaled", "FW", 21, 72),
       ]},
     { id: "fra_set", name: "Saint-Étienne", short: "SET", colors: ["#00A650", "#FFFFFF"], tier: 2,
       squad: [
         P("Gautier Larsonneur", "GK", 29, 74), P("Brian Barnard", "GK", 22, 70),
         P("Mickaël Nadé", "DF", 26, 73), P("Dylan Batubinsika", "DF", 30, 74), P("Dennis Appiah", "DF", 34, 72), P("Yvann Maçon", "DF", 27, 72), P("Léo Pétrot", "DF", 29, 72), P("Maxime Bernauer", "DF", 27, 72),
         P("Pierre Ekwah", "MF", 24, 75), P("Aïmen Moueffek", "MF", 25, 74), P("Florian Tardieu", "MF", 33, 73), P("Benjamin Bouchouari", "MF", 24, 74), P("Igor Miladinović", "MF", 22, 73),
         P("Lucas Stassin", "FW", 21, 77), P("Zuriko Davitashvili", "FW", 25, 77), P("Irvin Cardona", "FW", 28, 74), P("Ibrahim Sissoko", "FW", 28, 74),
       ]},
     { id: "fra_mtp", name: "Montpellier", short: "MTP", colors: ["#005CA9", "#FF6600"], tier: 2,
       squad: [
         P("Benjamin Lecomte", "GK", 34, 74), P("Dimitry Bertaud", "GK", 27, 73),
         P("Théo Sainte-Luce", "DF", 24, 72), P("Modibo Sagnan", "DF", 26, 72), P("Enzo Tchato", "DF", 23, 73), P("Kiki Kouyaté", "DF", 28, 73), P("Christopher Jullien", "DF", 33, 73), P("Falaye Sacko", "DF", 30, 72),
         P("Jordan Ferri", "MF", 33, 73), P("Téji Savanier", "MF", 34, 76), P("Joris Chotard", "MF", 24, 74), P("Khalil Fayad", "MF", 22, 74), P("Wahbi Khazri", "MF", 35, 73),
         P("Musa Al-Taamari", "FW", 28, 76), P("Arnaud Nordin", "FW", 27, 74), P("Andy Delort", "FW", 34, 74), P("Junior Ndiaye", "FW", 22, 72),
       ]},
   ];
   const RAW_FR_FL2 = [
     { id: "fra_met", name: "Metz", short: "MET", colors: ["#8A1538", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fra_lor", name: "Lorient", short: "LOR", colors: ["#FF6600", "#000000"], tier: 2, squad: [] },
     { id: "fra_bor", name: "Bordeaux", short: "BOR", colors: ["#00205B", "#E30613"], tier: 2, squad: [] },
     { id: "fra_gui", name: "Guingamp", short: "GUI", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "fra_bas", name: "Bastia", short: "BAS", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_gre", name: "Grenoble", short: "GRE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_pfc", name: "Paris FC", short: "PFC", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fra_cae", name: "Caen", short: "CAE", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "fra_aja", name: "Ajaccio", short: "AJA", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_ami", name: "Amiens", short: "AMI", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_ann", name: "Annecy", short: "ANN", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_dun", name: "Dunkerque", short: "DUN", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "fra_lav", name: "Laval", short: "LAV", colors: ["#FF6600", "#000000"], tier: 1, squad: [] },
     { id: "fra_pau", name: "Pau", short: "PAU", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "fra_rod", name: "Rodez", short: "ROD", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "fra_tro", name: "Troyes", short: "TRO", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fra_cle", name: "Clermont", short: "CLE", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "fra_rst", name: "Red Star", short: "RST", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
   ];
   const RAW_FR_FN1 = [
     { id: "fra_lem", name: "Le Mans", short: "LEM", colors: ["#FFD700", "#E30613"], tier: 1, squad: [] },
     { id: "fra_ncy", name: "Nancy", short: "NCY", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_orl", name: "Orléans", short: "ORL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_cha", name: "Châteauroux", short: "CHA", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "fra_nim", name: "Nîmes", short: "NIM", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_soc", name: "Sochaux", short: "SOC", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "fra_bou", name: "Boulogne", short: "BOU", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "fra_dij", name: "Dijon", short: "DIJ", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_con", name: "Concarneau", short: "CON", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_qro", name: "Quevilly-Rouen", short: "QRO", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_mrt", name: "Martigues", short: "MRT", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "fra_bpe", name: "Bourg-Péronnas", short: "BPE", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "fra_vil", name: "Villefranche", short: "VIL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_ver", name: "Versailles", short: "VER", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "fra_epi", name: "Épinal", short: "EPI", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_fle", name: "Fleury", short: "FLE", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
   ];
   const RAW_FR_FN2 = [
     { id: "fra_cho", name: "Cholet", short: "CHO", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_her", name: "Les Herbiers", short: "HER", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_sma", name: "Saint-Malo", short: "SMA", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "fra_hye", name: "Hyères", short: "HYE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_rum", name: "Rumilly", short: "RUM", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "fra_puy", name: "Le Puy", short: "PUY", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_bel", name: "Belfort", short: "BEL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_was", name: "Wasquehal", short: "WAS", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "fra_blo", name: "Blois", short: "BLO", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "fra_sau", name: "Saumur", short: "SAU", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_poi", name: "Poissy", short: "POI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_p13", name: "Paris 13 Atletico", short: "P13", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "fra_sed", name: "Sedan", short: "SED", colors: ["#00A650", "#E30613"], tier: 1, squad: [] },
     { id: "fra_duc", name: "Lyon La Duchère", short: "DUC", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fra_gfc", name: "GOAL FC", short: "GFC", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "fra_mci", name: "Marignane", short: "MCI", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
   ];

   // ---- SPAIN tier 3-4 (Primera Federación / Segunda Federación) ----
   const RAW_ES_PRF = [
     { id: "esp_pon", name: "Ponferradina", short: "PON", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "esp_nas", name: "Nàstic Tarragona", short: "NAS", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "esp_mur", name: "Real Murcia", short: "MUR", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "esp_her", name: "Hércules", short: "HER", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_sab", name: "Sabadell", short: "SAB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_mrb", name: "Marbella", short: "MRB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_ceu", name: "AD Ceuta", short: "CEU", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_ibi", name: "UD Ibiza", short: "IBI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_ant", name: "Antequera", short: "ANT", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_tar", name: "Tarazona", short: "TAR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_san", name: "Sanluqueño", short: "SAN", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_ter", name: "Teruel", short: "TER", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_bar", name: "Barakaldo", short: "BAR", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "esp_are", name: "Arenteiro", short: "ARE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_gui", name: "Guijuelo", short: "GUI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_yec", name: "Yeclano", short: "YEC", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "esp_lug", name: "Lugo", short: "LUG", colors: ["#FFFFFF", "#E30613"], tier: 1, squad: [] },
     { id: "esp_zam", name: "Zamora", short: "ZAM", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
   ];
   const RAW_ES_SGF = [
     { id: "esp_num", name: "Numancia", short: "NUM", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_ptv", name: "Pontevedra", short: "PTV", colors: ["#005CA9", "#000000"], tier: 1, squad: [] },
     { id: "esp_maj", name: "Rayo Majadahonda", short: "MAJ", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_ses", name: "Sestao River", short: "SES", colors: ["#000000", "#E30613"], tier: 1, squad: [] },
     { id: "esp_avi", name: "Real Avilés", short: "AVI", colors: ["#FFFFFF", "#005CA9"], tier: 1, squad: [] },
     { id: "esp_cac", name: "Cacereño", short: "CAC", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_tal", name: "Talavera", short: "TAL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_mer", name: "Mérida", short: "MER", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "esp_cor", name: "Coria", short: "COR", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_utr", name: "Utrera", short: "UTR", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_est", name: "Estepona", short: "EST", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_lin", name: "Linares", short: "LIN", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "esp_ori", name: "Orihuela", short: "ORI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_agu", name: "Águilas", short: "AGU", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "esp_mel", name: "Melilla", short: "MEL", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "esp_lor", name: "Lorca", short: "LOR", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- GERMANY tier 3-4 (3. Liga / Regionalliga) ----
   const RAW_DE_BL3 = [
     { id: "ger_m60", name: "1860 Munich", short: "M60", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ger_cot", name: "Energie Cottbus", short: "COT", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_rwe", name: "Rot-Weiss Essen", short: "RWE", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_wal", name: "Waldhof Mannheim", short: "WAL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_saa", name: "1. FC Saarbrücken", short: "SAA", colors: ["#005CA9", "#000000"], tier: 1, squad: [] },
     { id: "ger_aue", name: "Erzgebirge Aue", short: "AUE", colors: ["#4B2E83", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_ing", name: "Ingolstadt", short: "ING", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ger_osn", name: "Osnabrück", short: "OSN", colors: ["#4B2E83", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_vik", name: "Viktoria Köln", short: "VIK", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_ver", name: "SC Verl", short: "VER", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_san", name: "Sandhausen", short: "SAN", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "ger_han", name: "Hansa Rostock", short: "HAN", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_hav", name: "TSV Havelse", short: "HAV", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_weh", name: "Wehen Wiesbaden", short: "WEH", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ger_dui", name: "MSV Duisburg", short: "DUI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_aac", name: "Alemannia Aachen", short: "AAC", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "ger_uhc", name: "Unterhaching", short: "UHC", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "ger_swf", name: "Schweinfurt", short: "SWF", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
   ];
   const RAW_DE_BL4 = [
     { id: "ger_off", name: "Kickers Offenbach", short: "OFF", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_hom", name: "FC Homburg", short: "HOM", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_stk", name: "Stuttgart Kickers", short: "STK", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "ger_ulm", name: "SSV Ulm", short: "ULM", colors: ["#FFFFFF", "#000000"], tier: 1, squad: [] },
     { id: "ger_bal", name: "TSG Balingen", short: "BAL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_bah", name: "Bahlinger SC", short: "BAH", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ger_fsv", name: "FSV Frankfurt", short: "FSV", colors: ["#000000", "#E30613"], tier: 1, squad: [] },
     { id: "ger_fre", name: "SGV Freiberg", short: "FRE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_ste", name: "TSV Steinbach", short: "STE", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_kob", name: "Rot-Weiß Koblenz", short: "KOB", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_tri", name: "Eintracht Trier", short: "TRI", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "ger_wor", name: "Wormatia Worms", short: "WOR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_byr", name: "SpVgg Bayreuth", short: "BYR", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "ger_wue", name: "Würzburger Kickers", short: "WUE", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ger_asc", name: "Viktoria Aschaffenburg", short: "ASC", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "ger_aal", name: "VfR Aalen", short: "AAL", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // ---- ITALY tier 3-4 (Serie C / Serie D) ----
   const RAW_IT_SEC = [
     { id: "ita_vic", name: "Vicenza", short: "VIC", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ita_ter", name: "Ternana", short: "TER", colors: ["#00A650", "#E30613"], tier: 1, squad: [] },
     { id: "ita_cta", name: "Catania", short: "CTA", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "ita_ave", name: "Avellino", short: "AVE", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_ben", name: "Benevento", short: "BEN", colors: ["#FFD700", "#E30613"], tier: 1, squad: [] },
     { id: "ita_cro", name: "Crotone", short: "CRO", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "ita_pes", name: "Pescara", short: "PES", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_fog", name: "Foggia", short: "FOG", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ita_tra", name: "Trapani", short: "TRA", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "ita_cer", name: "Cerignola", short: "CER", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "ita_lat", name: "Latina", short: "LAT", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_cas", name: "Casertana", short: "CAS", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ita_pad", name: "Padova", short: "PAD", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_trs", name: "Triestina", short: "TRS", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_pvc", name: "Pro Vercelli", short: "PVC", colors: ["#FFFFFF", "#000000"], tier: 1, squad: [] },
     { id: "ita_alb", name: "AlbinoLeffe", short: "ALB", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "ita_nov", name: "Novara", short: "NOV", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_per", name: "Pergolettese", short: "PER", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
   ];
   const RAW_IT_SED = [
     { id: "ita_noc", name: "Nocerina", short: "NOC", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ita_csr", name: "Casarano", short: "CSR", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "ita_chi", name: "Chieri", short: "CHI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_sgi", name: "Sangiuliano", short: "SGI", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_fan", name: "Fanfulla", short: "FAN", colors: ["#FFFFFF", "#005CA9"], tier: 1, squad: [] },
     { id: "ita_leg", name: "Legnano", short: "LEG", colors: ["#4B2E83", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_vae", name: "Varese", short: "VAE", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_snr", name: "Sanremese", short: "SNR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_cal", name: "Caldiero", short: "CAL", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "ita_fzu", name: "Fiorenzuola", short: "FZU", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ita_rav", name: "Ravenna", short: "RAV", colors: ["#FFD700", "#E30613"], tier: 1, squad: [] },
     { id: "ita_for", name: "Forlì", short: "FOR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_imo", name: "Imolese", short: "IMO", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "ita_luc", name: "Lucchese", short: "LUC", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ita_ppa", name: "Pro Patria", short: "PPA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ita_cle", name: "Real Calepina", short: "CLE", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
   ];

   // =========================================================================
   // FURTHER UEFA NATIONS (batch 2) — top flight + second tier each.
   // =========================================================================
   const RAW_CZ_CZ1 = [
     { id: "cze_sla", name: "Slavia Praha", short: "SLA", colors: ["#E30613", "#FFFFFF"], tier: 4,
       squad: [
         P("Jindřich Staněk", "GK", 29, 77),
         P("David Zima", "DF", 26, 75), P("Igoh Ogbu", "DF", 26, 75), P("David Jurásek", "DF", 25, 75), P("David Douděra", "DF", 27, 74), P("Štěpán Chaloupek", "DF", 22, 73),
         P("Christos Zafeiris", "MF", 23, 76), P("Lukáš Provod", "MF", 29, 76), P("Oscar Dorley", "MF", 27, 74), P("Dominik Javorček", "MF", 25, 73), P("Michal Sadílek", "MF", 26, 73),
         P("Tomáš Chorý", "FW", 31, 76), P("Ivan Schranz", "FW", 32, 75), P("Mojmír Chytil", "FW", 27, 75), P("Vasil Kušej", "FW", 27, 74),
       ]},
     { id: "cze_spa", name: "Sparta Praha", short: "SPA", colors: ["#8A1538", "#FFD700"], tier: 4,
       squad: [
         P("Peter Vindahl", "GK", 27, 75),
         P("Asger Sørensen", "DF", 29, 74), P("Filip Panák", "DF", 30, 74), P("James Gomez", "DF", 23, 73), P("Angelo Preciado", "DF", 27, 74), P("Jaroslav Zelený", "DF", 33, 72),
         P("Kaan Kairinen", "MF", 27, 75), P("Lukáš Haraslín", "MF", 29, 77), P("Veljko Birmančević", "MF", 27, 76), P("Qazim Laçi", "MF", 29, 73), P("Lukáš Sadílek", "MF", 29, 73),
         P("Victor Olatunji", "FW", 26, 75), P("Albion Rrahmani", "FW", 25, 74), P("Ermal Krasniqi", "FW", 27, 73),
       ]},
     { id: "cze_plz", name: "Viktoria Plzeň", short: "PLZ", colors: ["#005CA9", "#E30613"], tier: 3, squad: [] },
     { id: "cze_ban", name: "Baník Ostrava", short: "BAN", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "cze_olo", name: "Sigma Olomouc", short: "OLO", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cze_slo", name: "Slovácko", short: "SLO", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cze_jab", name: "Jablonec", short: "JAB", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
     { id: "cze_boh", name: "Bohemians 1905", short: "BOH", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cze_mbo", name: "Mladá Boleslav", short: "MBO", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cze_tep", name: "Teplice", short: "TEP", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "cze_hra", name: "Hradec Králové", short: "HRA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cze_kar", name: "Karviná", short: "KAR", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cze_duk", name: "Dukla Praha", short: "DUK", colors: ["#8A1538", "#FFD700"], tier: 2, squad: [] },
     { id: "cze_par", name: "Pardubice", short: "PAR", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cze_zli", name: "Zlín", short: "ZLI", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "cze_lib", name: "Liberec", short: "LIB", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_CZ_CZ2 = [
     { id: "cze_vla", name: "Vlašim", short: "VLA", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cze_chr", name: "Chrudim", short: "CHR", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "cze_pri", name: "Příbram", short: "PRI", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "cze_tab", name: "Táborsko", short: "TAB", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cze_pro", name: "Prostějov", short: "PRO", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cze_vys", name: "Vyškov", short: "VYS", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "cze_ust", name: "Ústí nad Labem", short: "UST", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cze_kro", name: "Kroměříž", short: "KRO", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cze_opa", name: "Opava", short: "OPA", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "cze_lis", name: "Líšeň", short: "LIS", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cze_brn", name: "Zbrojovka Brno", short: "BRN", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "cze_jih", name: "Jihlava", short: "JIH", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cze_tri", name: "Třinec", short: "TRI", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cze_zno", name: "Znojmo", short: "ZNO", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
   ];

   const RAW_SR_SR1 = [
     { id: "srb_czv", name: "Crvena zvezda", short: "CZV", colors: ["#E30613", "#FFFFFF"], tier: 4,
       squad: [
         P("Omri Glazer", "GK", 29, 76),
         P("Uroš Spajić", "DF", 32, 74), P("Seol Young-woo", "DF", 27, 73), P("Veljko Milosavljević", "DF", 18, 74), P("Milan Rodić", "DF", 34, 72), P("Nikola Stanković", "DF", 22, 72),
         P("Timi Max Elšnik", "MF", 27, 76), P("Mirko Ivanić", "MF", 32, 76), P("Guélor Kanga", "MF", 35, 74), P("Kings Kangwa", "MF", 26, 74), P("Andrija Maksimović", "MF", 18, 75),
         P("Marko Arnautović", "FW", 37, 76), P("Cherif Ndiaye", "FW", 29, 74), P("Nemanja Radonjić", "FW", 30, 75), P("Felício Milson", "FW", 25, 73),
       ]},
     { id: "srb_par", name: "Partizan", short: "PAR", colors: ["#000000", "#FFFFFF"], tier: 4,
       squad: [
         P("Aleksandar Jovanović", "GK", 26, 72),
         P("Svetozar Marković", "DF", 25, 73), P("Aldo Kalulu", "DF", 29, 73), P("Slobodan Urošević", "DF", 28, 72), P("Nemanja Trifunović", "DF", 22, 72), P("Marko Milovanović", "DF", 22, 72),
         P("Bibras Natcho", "MF", 37, 73), P("Vanja Dragojević", "MF", 24, 72), P("Andrej Kostić", "MF", 21, 73), P("Nemanja Jović", "MF", 22, 72), P("Mateus Fernandes", "MF", 22, 72),
         P("Jovan Milošević", "FW", 21, 74), P("Milan Vukotić", "FW", 24, 72), P("Bogdan Kostić", "FW", 22, 72),
       ]},
     { id: "srb_voj", name: "Vojvodina", short: "VOJ", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "srb_tsc", name: "TSC Bačka Topola", short: "TSC", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "srb_cuk", name: "Čukarički", short: "CUK", colors: ["#005CA9", "#000000"], tier: 2, squad: [] },
     { id: "srb_rni", name: "Radnički Niš", short: "RNI", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "srb_nap", name: "Napredak", short: "NAP", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "srb_spa", name: "Spartak Subotica", short: "SPA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "srb_mla", name: "Mladost", short: "MLA", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "srb_imt", name: "IMT", short: "IMT", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "srb_npa", name: "Novi Pazar", short: "NPA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "srb_zel", name: "Železničar", short: "ZEL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "srb_rad", name: "Radnik", short: "RAD", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "srb_jav", name: "Javor", short: "JAV", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "srb_ofk", name: "OFK Beograd", short: "OFK", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "srb_tek", name: "Tekstilac", short: "TEK", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_SR_SR2 = [
     { id: "srb_gra", name: "Grafičar", short: "GRA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_zem", name: "Zemun", short: "ZEM", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "srb_kol", name: "Kolubara", short: "KOL", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_dub", name: "Dubočica", short: "DUB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_tra", name: "Trajal", short: "TRA", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_slo", name: "Sloboda Užice", short: "SLO", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_r23", name: "Radnički 1923", short: "R23", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "srb_jed", name: "Jedinstvo", short: "JED", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_loz", name: "Loznica", short: "LOZ", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_sin", name: "Sinđelić", short: "SIN", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_bud", name: "Budućnost", short: "BUD", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "srb_zpa", name: "Železničar Pančevo", short: "ZPA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_gat", name: "Mladost GAT", short: "GAT", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "srb_sme", name: "Smederevo", short: "SME", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
   ];

   const RAW_UA_UA1 = [
     { id: "ukr_sha", name: "Shakhtar Donetsk", short: "SHA", colors: ["#FF6600", "#000000"], tier: 4,
       squad: [
         P("Dmytro Riznyk", "GK", 26, 76),
         P("Mykola Matviyenko", "DF", 29, 77), P("Yukhym Konoplia", "DF", 26, 75), P("Valeriy Bondar", "DF", 26, 74), P("Irakli Azarovi", "DF", 23, 74), P("Vinícius Tobias", "DF", 22, 74),
         P("Georgiy Sudakov", "MF", 23, 80), P("Pedrinho", "MF", 27, 76), P("Marlon Gomes", "MF", 22, 75), P("Oleh Ocheretko", "MF", 21, 74), P("Dmytro Kryskiv", "MF", 22, 73),
         P("Kaua Elias", "FW", 20, 75), P("Eguinaldo", "FW", 21, 75), P("Lucas Ferreira", "FW", 19, 74),
       ]},
     { id: "ukr_dyn", name: "Dynamo Kyiv", short: "DYN", colors: ["#005CA9", "#FFFFFF"], tier: 4,
       squad: [
         P("Ruslan Neshcheret", "GK", 23, 75),
         P("Denys Popov", "DF", 26, 74), P("Oleksandr Tymchyk", "DF", 28, 74), P("Taras Mykhavko", "DF", 21, 74), P("Kostiantyn Vivcharenko", "DF", 24, 73), P("Christian Bilovar", "DF", 26, 73),
         P("Mykola Shaparenko", "MF", 27, 76), P("Volodymyr Brazhko", "MF", 23, 76), P("Nazar Voloshyn", "MF", 23, 75), P("Oleksandr Pikhalyonok", "MF", 23, 74), P("Serhiy Buletsa", "MF", 26, 73),
         P("Andriy Yarmolenko", "FW", 37, 74), P("Vladyslav Kabaiev", "FW", 30, 74), P("Matvii Ponomarenko", "FW", 19, 73),
       ]},
     { id: "ukr_zor", name: "Zorya Luhansk", short: "ZOR", colors: ["#000000", "#E30613"], tier: 3, squad: [] },
     { id: "ukr_dn1", name: "Dnipro-1", short: "DN1", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ukr_vor", name: "Vorskla", short: "VOR", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ukr_kry", name: "Kryvbas", short: "KRY", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "ukr_ole", name: "Oleksandriya", short: "OLE", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "ukr_kol", name: "Kolos Kovalivka", short: "KOL", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ukr_ruk", name: "Rukh Lviv", short: "RUK", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "ukr_pol", name: "Polissya", short: "POL", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
     { id: "ukr_ver", name: "Veres Rivne", short: "VER", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "ukr_obo", name: "Obolon", short: "OBO", colors: ["#005CA9", "#00A650"], tier: 2, squad: [] },
     { id: "ukr_lnz", name: "LNZ Cherkasy", short: "LNZ", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ukr_cho", name: "Chornomorets", short: "CHO", colors: ["#005CA9", "#000000"], tier: 2, squad: [] },
     { id: "ukr_krp", name: "Karpaty", short: "KRP", colors: ["#00A650", "#E30613"], tier: 2, squad: [] },
     { id: "ukr_liv", name: "Livyi Bereh", short: "LIV", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_UA_UA2 = [
     { id: "ukr_met", name: "Metalist Kharkiv", short: "MET", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "ukr_ahr", name: "Ahrobiznes", short: "AHR", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ukr_fen", name: "Feniks", short: "FEN", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "ukr_buk", name: "Bukovyna", short: "BUK", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "ukr_nyt", name: "Nyva Ternopil", short: "NYT", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "ukr_pry", name: "Prykarpattia", short: "PRY", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "ukr_cha", name: "Chaika", short: "CHA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ukr_mzp", name: "Metalurh", short: "MZP", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ukr_kra", name: "Kramatorsk", short: "KRA", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ukr_yar", name: "Yarud", short: "YAR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ukr_vik", name: "Viktoriya", short: "VIK", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "ukr_nyv", name: "Nyva Vinnytsia", short: "NYV", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "ukr_che", name: "Cherkasy", short: "CHE", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ukr_ep1", name: "Epitsentr", short: "EP1", colors: ["#FF6600", "#FFFFFF"], tier: 1, squad: [] },
   ];

   const RAW_SE_SE1 = [
     { id: "swe_mal", name: "Malmö FF", short: "MAL", colors: ["#0072CE", "#FFFFFF"], tier: 4,
       squad: [
         P("Melker Ellborg", "GK", 27, 72),
         P("Pontus Jansson", "DF", 35, 73), P("Gabriel Busanello", "DF", 27, 72), P("Hugo Bolin", "DF", 21, 72), P("Colin Rösler", "DF", 26, 72),
         P("Sergio Peña", "MF", 30, 73), P("Adi Nalić", "MF", 27, 72), P("Alexander Fransson", "MF", 31, 72), P("Johan Grahn", "MF", 22, 71),
         P("Isaac Kiese Thelin", "FW", 33, 73), P("Erik Botheim", "FW", 26, 74), P("Taha Ali", "FW", 26, 72),
       ]},
     { id: "swe_aik", name: "AIK", short: "AIK", colors: ["#000000", "#FFD700"], tier: 3, squad: [] },
     { id: "swe_dju", name: "Djurgården", short: "DJU", colors: ["#005CA9", "#E30613"], tier: 3,
       squad: [
         P("Jacob Rinne", "GK", 32, 72),
         P("Jacob Une Larsson", "DF", 30, 72), P("Marcus Danielson", "DF", 36, 72), P("Elliot Käck", "DF", 35, 71), P("Adam Adouani", "DF", 22, 71),
         P("Hampus Finndell", "MF", 26, 73), P("Magnus Eriksson", "MF", 35, 73), P("Rasmus Schüller", "MF", 34, 72), P("Besard Sabovic", "MF", 26, 72),
         P("Tobias Gulliksen", "FW", 22, 73), P("Joel Asoro", "FW", 26, 73), P("Tokmac Nguen", "FW", 32, 73),
       ]},
     { id: "swe_ham", name: "Hammarby", short: "HAM", colors: ["#00A650", "#FFFFFF"], tier: 3,
       squad: [
         P("Davor Blažević", "GK", 30, 72),
         P("Simon Strand", "DF", 26, 72), P("Casper Källqvist", "DF", 22, 71), P("Nikola Vasić", "DF", 24, 71), P("Adam Ström", "DF", 22, 71),
         P("Nahir Besara", "MF", 34, 73), P("Abdelrahman Saidi", "MF", 22, 72), P("Tesfaldet Tekie", "MF", 27, 72), P("Victor Djukanovic", "MF", 24, 72),
         P("Deniz Hümmet", "FW", 26, 73), P("Jusef Erabi", "FW", 23, 73), P("Sander Svartedal", "FW", 23, 71),
       ]},
     { id: "swe_gbg", name: "IFK Göteborg", short: "GBG", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "swe_elf", name: "IF Elfsborg", short: "ELF", colors: ["#FFD700", "#000000"], tier: 3, squad: [] },
     { id: "swe_hac", name: "BK Häcken", short: "HAC", colors: ["#FFD700", "#000000"], tier: 3, squad: [] },
     { id: "swe_nor", name: "IFK Norrköping", short: "NOR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "swe_mja", name: "Mjällby", short: "MJA", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "swe_kal", name: "Kalmar", short: "KAL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "swe_hal", name: "Halmstad", short: "HAL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "swe_gai", name: "GAIS", short: "GAI", colors: ["#00A650", "#000000"], tier: 2, squad: [] },
     { id: "swe_sir", name: "Sirius", short: "SIR", colors: ["#005CA9", "#000000"], tier: 2, squad: [] },
     { id: "swe_var", name: "Värnamo", short: "VAR", colors: ["#FFFFFF", "#E30613"], tier: 2, squad: [] },
     { id: "swe_bro", name: "Brommapojkarna", short: "BRO", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "swe_deg", name: "Degerfors", short: "DEG", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_SE_SE2 = [
     { id: "swe_org", name: "Örgryte", short: "ORG", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "swe_hbg", name: "Helsingborg", short: "HBG", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "swe_ost", name: "Östers", short: "OST", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "swe_lan", name: "Landskrona", short: "LAN", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "swe_tre", name: "Trelleborg", short: "TRE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "swe_uts", name: "Utsikten", short: "UTS", colors: ["#00A650", "#000000"], tier: 1, squad: [] },
     { id: "swe_sun", name: "Sundsvall", short: "SUN", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "swe_ore", name: "Örebro", short: "ORE", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "swe_san", name: "Sandvikens", short: "SAN", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "swe_sko", name: "Skövde", short: "SKO", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "swe_odd", name: "Oddevold", short: "ODD", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "swe_kri", name: "Kristianstad", short: "KRI", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "swe_sol", name: "Sölvesborg", short: "SOL", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "swe_gef", name: "Gefle", short: "GEF", colors: ["#FFFFFF", "#00A650"], tier: 1, squad: [] },
   ];

   const RAW_NO_NO1 = [
     { id: "nor_bod", name: "Bodø/Glimt", short: "BOD", colors: ["#FFD700", "#000000"], tier: 4,
       squad: [
         P("Nikita Haikin", "GK", 30, 74),
         P("Brede Moe", "DF", 30, 73), P("Odin Bjørtuft", "DF", 25, 73), P("Villads Nielsen", "DF", 23, 73), P("Fredrik Sjøvold", "DF", 24, 72),
         P("Patrick Berg", "MF", 28, 75), P("Håkon Evjen", "MF", 25, 74), P("Ulrik Saltnes", "MF", 33, 73), P("Sondre Brunstad Fet", "MF", 27, 73),
         P("Kasper Høgh", "FW", 28, 74), P("Andreas Helmersen", "FW", 26, 73), P("Sondre Auklend", "FW", 24, 73), P("Ole Blomberg", "FW", 27, 73),
       ]},
     { id: "nor_mol", name: "Molde", short: "MOL", colors: ["#005CA9", "#FFFFFF"], tier: 3,
       squad: [
         P("Oliver Petersen", "GK", 22, 71),
         P("Martin Bjørnbak", "DF", 33, 72), P("Kristoffer Haugen", "DF", 31, 72), P("Valon Zumberi", "DF", 23, 72), P("Mathis Bolly", "DF", 35, 71),
         P("Emil Breivik", "MF", 25, 73), P("Kristian Eriksen", "MF", 27, 72), P("Mathias Løvik", "MF", 24, 72), P("Magnus Wolff Eikrem", "MF", 35, 73),
         P("Ola Brynhildsen", "FW", 27, 73), P("Isak Amundsen", "FW", 21, 72), P("Endre Kupen", "FW", 23, 72),
       ]},
     { id: "nor_bra", name: "Brann", short: "BRA", colors: ["#E30613", "#FFFFFF"], tier: 3,
       squad: [
         P("Mathias Dyngeland", "GK", 30, 72),
         P("Japhet Sery Larsen", "DF", 26, 72), P("Ruben Kristiansen", "DF", 34, 71), P("Fredrik Pallesen Knudsen", "DF", 24, 72), P("Vetle Dragsnes", "DF", 30, 72),
         P("Felix Horn Myhre", "MF", 26, 72), P("Emil Kornvig", "MF", 27, 72), P("Bård Finne", "MF", 30, 72), P("Magnus Knudsen", "MF", 24, 72),
         P("Aune Heggebø", "FW", 24, 73), P("Noah Holm", "FW", 27, 73), P("Bassel Jradi", "FW", 32, 72),
       ]},
     { id: "nor_ros", name: "Rosenborg", short: "ROS", colors: ["#FFFFFF", "#000000"], tier: 3, squad: [] },
     { id: "nor_vik", name: "Viking", short: "VIK", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "nor_lil", name: "Lillestrøm", short: "LIL", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "nor_tro", name: "Tromsø", short: "TRO", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nor_sar", name: "Sarpsborg 08", short: "SAR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nor_str", name: "Strømsgodset", short: "STR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nor_fre", name: "Fredrikstad", short: "FRE", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nor_ham", name: "HamKam", short: "HAM", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nor_hau", name: "Haugesund", short: "HAU", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nor_kfu", name: "KFUM Oslo", short: "KFU", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "nor_kri", name: "Kristiansund", short: "KRI", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nor_san", name: "Sandefjord", short: "SAN", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "nor_bry", name: "Bryne", short: "BRY", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_NO_NO2 = [
     { id: "nor_val", name: "Vålerenga", short: "VAL", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "nor_sta", name: "Start", short: "STA", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "nor_mjo", name: "Mjøndalen", short: "MJO", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nor_ran", name: "Ranheim", short: "RAN", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nor_rau", name: "Raufoss", short: "RAU", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nor_sog", name: "Sogndal", short: "SOG", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nor_asa", name: "Åsane", short: "ASA", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "nor_ege", name: "Egersund", short: "EGE", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "nor_lev", name: "Levanger", short: "LEV", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nor_sta2", name: "Stabæk", short: "STB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nor_mos", name: "Moss", short: "MOS", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nor_lyn", name: "Lyn", short: "LYN", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "nor_ske", name: "Skeid", short: "SKE", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nor_kon", name: "Kongsvinger", short: "KON", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
   ];

   const RAW_RO_RO1 = [
     { id: "rou_fcs", name: "FCSB", short: "FCS", colors: ["#E30613", "#005CA9"], tier: 4,
       squad: [
         P("Ștefan Târnovanu", "GK", 25, 74),
         P("Siyabonga Ngezana", "DF", 27, 73), P("Mihai Popescu", "DF", 32, 72), P("Joyskim Dawa", "DF", 30, 72), P("Risto Radunović", "DF", 33, 72), P("Valentin Crețu", "DF", 37, 71),
         P("Darius Olaru", "MF", 27, 75), P("Florin Tănase", "MF", 31, 75), P("Adrian Șut", "MF", 26, 73), P("Baba Alhassan", "MF", 26, 72), P("Vlad Chiricheș", "MF", 36, 73),
         P("Daniel Bîrligea", "FW", 25, 74), P("David Miculescu", "FW", 24, 73), P("Juri Cisotti", "FW", 31, 72), P("Marius Ștefănescu", "FW", 27, 72),
       ]},
     { id: "rou_cfr", name: "CFR Cluj", short: "CFR", colors: ["#8A1538", "#FFFFFF"], tier: 3, squad: [] },
     { id: "rou_ucr", name: "U. Craiova", short: "UCR", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "rou_rap", name: "Rapid București", short: "RAP", colors: ["#8A1538", "#FFFFFF"], tier: 3, squad: [] },
     { id: "rou_far", name: "Farul Constanța", short: "FAR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rou_sep", name: "Sepsi", short: "SEP", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rou_ucl", name: "U. Cluj", short: "UCL", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rou_pet", name: "Petrolul", short: "PET", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "rou_uta", name: "UTA Arad", short: "UTA", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rou_din", name: "Dinamo București", short: "DIN", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rou_bot", name: "Botoșani", short: "BOT", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
     { id: "rou_ote", name: "Oțelul Galați", short: "OTE", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rou_her", name: "Hermannstadt", short: "HER", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "rou_buz", name: "Gloria Buzău", short: "BUZ", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rou_slo", name: "Unirea Slobozia", short: "SLO", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "rou_ias", name: "Poli Iași", short: "IAS", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_RO_RO2 = [
     { id: "rou_ste", name: "Steaua București", short: "STE", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "rou_cor", name: "Corvinul", short: "COR", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "rou_cam", name: "Câmpulung", short: "CAM", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "rou_met", name: "Metaloglobus", short: "MET", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "rou_chi", name: "Concordia Chiajna", short: "CHI", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "rou_dum", name: "Dumbrăvița", short: "DUM", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "rou_res", name: "Reșița", short: "RES", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "rou_sla", name: "Slatina", short: "SLA", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "rou_tar", name: "Chindia Târgoviște", short: "TAR", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "rou_vol", name: "Voluntari", short: "VOL", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "rou_bac", name: "Bacău", short: "BAC", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "rou_tun", name: "Tunari", short: "TUN", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "rou_sel", name: "Șelimbăr", short: "SEL", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "rou_bih", name: "Bihor Oradea", short: "BIH", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
   ];

   const RAW_CY_CY1 = [
     { id: "cyp_apo", name: "APOEL", short: "APO", colors: ["#FFD700", "#005CA9"], tier: 3, squad: [] },
     { id: "cyp_omo", name: "Omonia", short: "OMO", colors: ["#00A650", "#FFFFFF"], tier: 3,
       squad: [
         P("Loizos Loizou", "MF", 24, 73), P("Willy Semedo", "FW", 32, 73), P("Nikolas Panagiotou", "DF", 27, 72),
         P("Bruno Felipe", "MF", 27, 72), P("Charalampos Kyriakou", "MF", 31, 72),
       ]},
     { id: "cyp_aek", name: "AEK Larnaca", short: "AEK", colors: ["#FFD700", "#005CA9"], tier: 3, squad: [] },
     { id: "cyp_ari", name: "Aris Limassol", short: "ARI", colors: ["#005CA9", "#FFD700"], tier: 3, squad: [] },
     { id: "cyp_apl", name: "Apollon", short: "APL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cyp_paf", name: "Pafos", short: "PAF", colors: ["#005CA9", "#E30613"], tier: 2,
       squad: [
         P("David Luiz", "DF", 39, 74), P("Mislav Oršić", "FW", 33, 74), P("Domingos Quina", "MF", 26, 73),
         P("Jajá", "FW", 30, 73), P("João Correia", "FW", 26, 73), P("Pêpê Rodrigues", "MF", 28, 72), P("Vlad Dragomir", "MF", 26, 73),
       ]},
     { id: "cyp_ael", name: "AEL Limassol", short: "AEL", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "cyp_ano", name: "Anorthosis", short: "ANO", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cyp_eth", name: "Ethnikos Achna", short: "ETH", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "cyp_nsa", name: "Nea Salamina", short: "NSA", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cyp_kar", name: "Karmiotissa", short: "KAR", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cyp_dox", name: "Doxa", short: "DOX", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "cyp_akr", name: "Akritas", short: "AKR", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "cyp_oth", name: "Othellos", short: "OTH", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_CY_CY2 = [
     { id: "cyp_par", name: "Enosis Paralimni", short: "PAR", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "cyp_oly", name: "Olympiakos Nic.", short: "OLY", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cyp_dig", name: "Digenis", short: "DIG", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cyp_asi", name: "ASIL", short: "ASI", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "cyp_xyl", name: "PO Xylotymbou", short: "XYL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cyp_oni", name: "Onisilos", short: "ONI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cyp_ana", name: "Ayia Napa", short: "ANA", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "cyp_ara", name: "Omonia Aradippou", short: "ARA", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cyp_ena", name: "ENAD", short: "ENA", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "cyp_ach", name: "Achyronas", short: "ACH", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cyp_cha", name: "Chalkanoras", short: "CHA", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "cyp_erm", name: "Ermis", short: "ERM", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "cyp_pae", name: "PAEEK", short: "PAE", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "cyp_yps", name: "Ypsonas", short: "YPS", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
   ];

   const RAW_SK_SK1 = [
     { id: "svk_slo", name: "Slovan Bratislava", short: "SLO", colors: ["#005CA9", "#FFFFFF"], tier: 4,
       squad: [
         P("Dominik Takáč", "GK", 27, 72),
         P("Guram Kashia", "DF", 38, 72), P("Kenan Bajrić", "DF", 30, 72), P("Lukáš Pauschek", "DF", 33, 72), P("César Blackman", "DF", 27, 72), P("Sebastian Kóša", "DF", 22, 72),
         P("Juraj Kucka", "MF", 39, 73), P("Marko Tolić", "MF", 27, 73), P("Tigran Barseghyan", "MF", 32, 73), P("Ibrahim Rabii", "MF", 26, 72),
         P("David Strelec", "FW", 24, 75), P("Mykola Kukharevych", "FW", 24, 73), P("Nino Marcelli", "FW", 24, 72), P("Rahim Ibrahim", "FW", 23, 72),
       ]},
     { id: "svk_trn", name: "Spartak Trnava", short: "TRN", colors: ["#000000", "#E30613"], tier: 3, squad: [] },
     { id: "svk_zil", name: "Žilina", short: "ZIL", colors: ["#00A650", "#FFD700"], tier: 3, squad: [] },
     { id: "svk_dac", name: "Dunajská Streda", short: "DAC", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "svk_mic", name: "Michalovce", short: "MIC", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "svk_ruz", name: "Ružomberok", short: "RUZ", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "svk_kos", name: "Košice", short: "KOS", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "svk_tre", name: "Trenčín", short: "TRE", colors: ["#E30613", "#00A650"], tier: 2, squad: [] },
     { id: "svk_pod", name: "Podbrezová", short: "POD", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "svk_ska", name: "Skalica", short: "SKA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "svk_zmo", name: "Zlaté Moravce", short: "ZMO", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "svk_kom", name: "Komárno", short: "KOM", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_SK_SK2 = [
     { id: "svk_pet", name: "Petržalka", short: "PET", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_bby", name: "Banská Bystrica", short: "BBY", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_pre", name: "Prešov", short: "PRE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_puc", name: "Púchov", short: "PUC", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_lmi", name: "Liptovský Mikuláš", short: "LMI", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "svk_dub", name: "Dubnica", short: "DUB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_sam", name: "Šamorín", short: "SAM", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "svk_tat", name: "Tatran", short: "TAT", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_nit", name: "Nitra", short: "NIT", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_bar", name: "Bardejov", short: "BAR", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "svk_hum", name: "Humenné", short: "HUM", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "svk_bol", name: "Boleráz", short: "BOL", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_mal", name: "Malženice", short: "MAL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svk_zvo", name: "Zvolen", short: "ZVO", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
   ];

   // =========================================================================
   // ALL REMAINING UEFA NATIONS (batch 3). Top flight + a small 2nd tier each
   // (San Marino single tier). Metadata only — strength-only unless managed.
   // =========================================================================
   const mk = (arr) => arr; // identity, for readability

   // --- SLOVENIA (PrvaLiga, quad) ---
   const RAW_SVN1 = [
     { id: "svn_oli", name: "Olimpija Ljubljana", short: "OLI", colors: ["#00A650", "#FFFFFF"], tier: 3, squad: [] },
     { id: "svn_mar", name: "Maribor", short: "MAR", colors: ["#4B2E83", "#FFD700"], tier: 3, squad: [] },
     { id: "svn_cel", name: "Celje", short: "CEL", colors: ["#005CA9", "#FFD700"], tier: 3,
       squad: [
         P("Franko Kovačević", "FW", 26, 75), P("Aljoša Matko", "FW", 25, 73), P("Žan Karničnik", "DF", 30, 73),
         P("Mark Zabukovnik", "MF", 22, 73), P("Nikita Iosifov", "MF", 22, 72), P("Klemen Nemanič", "DF", 22, 72),
       ]},
     { id: "svn_mur", name: "Mura", short: "MUR", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "svn_kop", name: "Koper", short: "KOP", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "svn_bra", name: "Bravo", short: "BRA", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "svn_dom", name: "Domžale", short: "DOM", colors: ["#FFD700", "#00A650"], tier: 2, squad: [] },
     { id: "svn_rad", name: "Radomlje", short: "RAD", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "svn_naf", name: "Nafta", short: "NAF", colors: ["#000000", "#FFD700"], tier: 2, squad: [] },
     { id: "svn_pri", name: "Primorje", short: "PRI", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_SVN2 = [
     { id: "svn_tri", name: "Triglav", short: "TRI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svn_rog", name: "Rogaška", short: "ROG", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svn_bel", name: "Beltinci", short: "BEL", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svn_ili", name: "Ilirija", short: "ILI", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "svn_krk", name: "Krka", short: "KRK", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svn_bil", name: "Bilje", short: "BIL", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "svn_bri", name: "Brinje", short: "BRI", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "svn_dob", name: "Dob", short: "DOB", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "svn_fuz", name: "Fužinar", short: "FUZ", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "svn_jad", name: "Jadran", short: "JAD", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- ISRAEL (Ligat ha'Al, split 7/7) ---
   const RAW_ISR1 = [
     { id: "isr_mtl", name: "Maccabi Tel Aviv", short: "MTL", colors: ["#FFD700", "#005CA9"], tier: 4,
       squad: [
         P("Roi Mishpati", "GK", 25, 72),
         P("Tyrese Asante", "DF", 25, 73), P("Roy Revivo", "DF", 25, 72), P("Sean Goldberg", "DF", 27, 72), P("Idan Nachmias", "DF", 25, 72),
         P("Dor Peretz", "MF", 30, 73), P("Ethan Azoulay", "MF", 22, 73), P("Osher Davida", "MF", 24, 73), P("Gaoussou Diarra", "MF", 24, 72),
         P("Sagiv Jehezkel", "FW", 30, 74), P("Dor Turgeman", "FW", 22, 73), P("Elad Madmon", "FW", 23, 72),
       ]},
     { id: "isr_mha", name: "Maccabi Haifa", short: "MHA", colors: ["#00A650", "#FFFFFF"], tier: 4,
       squad: [
         P("Josh Cohen", "GK", 33, 72),
         P("Abdoulaye Seck", "DF", 33, 73), P("Pierre Cornud", "DF", 28, 72), P("Daniel Sundgren", "DF", 34, 72), P("Ilay Feingold", "DF", 22, 72),
         P("Ali Mohamed", "MF", 28, 73), P("Mahmoud Jaber", "MF", 23, 73), P("Goni Naor", "MF", 24, 72), P("Dolev Haziza", "MF", 29, 73),
         P("Dean David", "FW", 28, 73), P("Frantzdy Pierrot", "FW", 30, 73), P("Suf Podgoreanu", "FW", 24, 72),
       ]},
     { id: "isr_hbs", name: "Hapoel Beer Sheva", short: "HBS", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "isr_htl", name: "Hapoel Tel Aviv", short: "HTL", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "isr_bei", name: "Beitar Jerusalem", short: "BEI", colors: ["#FFD700", "#000000"], tier: 3, squad: [] },
     { id: "isr_net", name: "Maccabi Netanya", short: "NET", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "isr_hha", name: "Hapoel Haifa", short: "HHA", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isr_sak", name: "Bnei Sakhnin", short: "SAK", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isr_ash", name: "Ashdod", short: "ASH", colors: ["#FFD700", "#E30613"], tier: 2, squad: [] },
     { id: "isr_had", name: "Hapoel Hadera", short: "HAD", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isr_rei", name: "Bnei Reineh", short: "REI", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isr_hpt", name: "Hapoel Petah Tikva", short: "HPT", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "isr_ksh", name: "Ironi Kiryat Shmona", short: "KSH", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "isr_hje", name: "Hapoel Jerusalem", short: "HJE", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
   ];
   const RAW_ISR2 = [
     { id: "isr_ris", name: "Hapoel Rishon", short: "RIS", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isr_nof", name: "Hapoel Nof HaGalil", short: "NOF", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "isr_kfs", name: "Hapoel Kfar Saba", short: "KFS", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isr_her", name: "Maccabi Herzliya", short: "HER", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "isr_rga", name: "Hapoel Ramat Gan", short: "RGA", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isr_umm", name: "Hapoel Umm al-Fahm", short: "UMM", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isr_nes", name: "Sektzia Nes Tziona", short: "NES", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isr_sha", name: "Hapoel Kfar Shalem", short: "SHA", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "isr_jaf", name: "Maccabi Jaffa", short: "JAF", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "isr_afu", name: "Hapoel Afula", short: "AFU", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- FINLAND (Veikkausliiga, split 6/6) ---
   const RAW_FIN1 = [
     { id: "fin_hjk", name: "HJK", short: "HJK", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "fin_kup", name: "KuPS", short: "KUP", colors: ["#FFD700", "#000000"], tier: 3, squad: [] },
     { id: "fin_int", name: "Inter Turku", short: "INT", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fin_ilv", name: "Ilves", short: "ILV", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
     { id: "fin_sjk", name: "SJK", short: "SJK", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fin_hak", name: "Haka", short: "HAK", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fin_vps", name: "VPS", short: "VPS", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "fin_hon", name: "Honka", short: "HON", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
     { id: "fin_ktp", name: "KTP", short: "KTP", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fin_lah", name: "Lahti", short: "LAH", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fin_oul", name: "AC Oulu", short: "OUL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fin_ifk", name: "IFK Mariehamn", short: "IFK", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_FIN2 = [
     { id: "fin_gni", name: "Gnistan", short: "GNI", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fin_eif", name: "EIF", short: "EIF", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fin_jar", name: "Jaro", short: "JAR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fin_tps", name: "TPS", short: "TPS", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fin_jip", name: "Jippo", short: "JIP", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "fin_mp", name: "MP", short: "MP", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "fin_kap", name: "KäPa", short: "KAP", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fin_pk3", name: "PK-35", short: "PK3", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "fin_sal", name: "SalPa", short: "SAL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fin_kok", name: "Kokkola", short: "KOK", colors: ["#000000", "#E30613"], tier: 1, squad: [] },
   ];

   // --- BULGARIA (Parva Liga, split 8/8) ---
   const RAW_BUL1 = [
     { id: "bul_lud", name: "Ludogorets", short: "LUD", colors: ["#00A650", "#FFFFFF"], tier: 4,
       squad: [
         P("Sergio Padt", "GK", 35, 73),
         P("Igor Plastun", "DF", 35, 72), P("Olivier Verdon", "DF", 30, 73), P("Anton Nedyalkov", "DF", 33, 72), P("Son", "DF", 27, 72), P("Dinis Almeida", "DF", 32, 72),
         P("Rick", "MF", 28, 73), P("Show", "MF", 33, 72), P("Dominik Yankov", "MF", 25, 72), P("Ivan Yordanov", "MF", 22, 72),
         P("Kwadwo Duah", "FW", 28, 74), P("Erick Marcus", "FW", 22, 73), P("Matías Tissera", "FW", 24, 73), P("Nonso Anselm", "FW", 24, 72),
       ]},
     { id: "bul_csk", name: "CSKA Sofia", short: "CSK", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "bul_lev", name: "Levski Sofia", short: "LEV", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "bul_lpl", name: "Lokomotiv Plovdiv", short: "LPL", colors: ["#000000", "#E30613"], tier: 2, squad: [] },
     { id: "bul_bpl", name: "Botev Plovdiv", short: "BPL", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "bul_sla", name: "Slavia Sofia", short: "SLA", colors: ["#FFFFFF", "#E30613"], tier: 2, squad: [] },
     { id: "bul_ard", name: "Arda", short: "ARD", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bul_cmo", name: "Cherno More", short: "CMO", colors: ["#000000", "#005CA9"], tier: 2, squad: [] },
     { id: "bul_ber", name: "Beroe", short: "BER", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bul_kru", name: "Krumovgrad", short: "KRU", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "bul_spv", name: "Spartak Varna", short: "SPV", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bul_sep", name: "Septemvri Sofia", short: "SEP", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bul_heb", name: "Hebar", short: "HEB", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
     { id: "bul_c48", name: "CSKA 1948", short: "C48", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "bul_bvr", name: "Botev Vratsa", short: "BVR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bul_lso", name: "Lokomotiv Sofia", short: "LSO", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
   ];
   const RAW_BUL2 = [
     { id: "bul_mon", name: "Montana", short: "MON", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bul_dob", name: "Dobrudzha", short: "DOB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bul_eta", name: "Etar", short: "ETA", colors: ["#4B2E83", "#FFD700"], tier: 1, squad: [] },
     { id: "bul_bal", name: "Chernomorets Balchik", short: "BAL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bul_mar", name: "Marek", short: "MAR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bul_fra", name: "Fratria", short: "FRA", colors: ["#005CA9", "#000000"], tier: 1, squad: [] },
     { id: "bul_bela", name: "Belasitsa", short: "BLS", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bul_yan", name: "Yantra", short: "YAN", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bul_lit", name: "Litex", short: "LIT", colors: ["#FF6600", "#000000"], tier: 1, squad: [] },
     { id: "bul_pir", name: "Pirin", short: "PIR", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bul_ple", name: "Spartak Pleven", short: "PLE", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bul_soz", name: "Sozopol", short: "SOZ", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
   ];

   // --- BOSNIA (Premier League) ---
   const RAW_BIH1 = [
     { id: "bih_zri", name: "Zrinjski", short: "ZRI", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "bih_bor", name: "Borac Banja Luka", short: "BOR", colors: ["#E30613", "#005CA9"], tier: 3, squad: [] },
     { id: "bih_sar", name: "Sarajevo", short: "SAR", colors: ["#8A1538", "#FFFFFF"], tier: 3, squad: [] },
     { id: "bih_zel", name: "Željezničar", short: "ZEL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bih_vel", name: "Velež", short: "VEL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bih_sbr", name: "Široki Brijeg", short: "SBR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bih_tuz", name: "Tuzla City", short: "TUZ", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "bih_zvi", name: "Zvijezda 09", short: "ZVI", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "bih_slo", name: "Sloga Doboj", short: "SLO", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bih_igm", name: "Igman", short: "IGM", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bih_pos", name: "Posušje", short: "POS", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "bih_rad", name: "Radnik", short: "RAD", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
   ];
   const RAW_BIH2 = [
     { id: "bih_cel", name: "Čelik", short: "CEL", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "bih_gos", name: "GOŠK", short: "GOS", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bih_leo", name: "Leotar", short: "LEO", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bih_rud", name: "Rudar Prijedor", short: "RUD", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "bih_zgr", name: "Zvijezda Gradačac", short: "ZGR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bih_fam", name: "Famos", short: "FAM", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bih_jed", name: "Jedinstvo", short: "JED", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bih_tos", name: "TOŠK", short: "TOS", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "bih_mdk", name: "Mladost DK", short: "MDK", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "bih_slt", name: "Sloboda Tuzla", short: "SLT", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- ICELAND (Besta deild, split 6/6) ---
   const RAW_ISL1 = [
     { id: "isl_bre", name: "Breiðablik", short: "BRE", colors: ["#00A650", "#FFFFFF"], tier: 3, squad: [] },
     { id: "isl_vik", name: "Víkingur R", short: "VIK", colors: ["#E30613", "#000000"], tier: 3, squad: [] },
     { id: "isl_kr", name: "KR", short: "KR", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isl_val", name: "Valur", short: "VAL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isl_fh", name: "FH", short: "FH", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isl_stj", name: "Stjarnan", short: "STJ", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "isl_fra", name: "Fram", short: "FRA", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "isl_ia", name: "ÍA", short: "IA", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "isl_ka", name: "KA", short: "KA", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isl_aft", name: "Afturelding", short: "AFT", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "isl_ves", name: "Vestri", short: "VES", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "isl_fjo", name: "Fjölnir", short: "FJO", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
   ];
   const RAW_ISL2 = [
     { id: "isl_thr", name: "Þróttur", short: "THR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isl_kef", name: "Keflavík", short: "KEF", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isl_gri", name: "Grindavík", short: "GRI", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "isl_hk", name: "HK", short: "HK", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "isl_lei", name: "Leiknir", short: "LEI", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isl_nja", name: "Njarðvík", short: "NJA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isl_fyl", name: "Fylkir", short: "FYL", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "isl_sel", name: "Selfoss", short: "SEL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "isl_thor", name: "Þór", short: "THO", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "isl_gro", name: "Grótta", short: "GRO", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
   ];

   // --- REPUBLIC OF IRELAND (Premier Division, quad) ---
   const RAW_IRL1 = [
     { id: "irl_sha", name: "Shamrock Rovers", short: "SHA", colors: ["#00A650", "#FFFFFF"], tier: 3,
       squad: [
         P("Jack Byrne", "MF", 29, 74), P("Graham Burke", "FW", 32, 73), P("Roberto Lopes", "DF", 33, 72),
         P("Lee Grace", "DF", 32, 72), P("Rory Gaffney", "FW", 36, 72), P("Josh Honohan", "DF", 24, 72),
       ]},
     { id: "irl_she", name: "Shelbourne", short: "SHE", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "irl_der", name: "Derry City", short: "DER", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "irl_stp", name: "St Patrick's", short: "STP", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "irl_boh", name: "Bohemians", short: "BOH", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "irl_gal", name: "Galway United", short: "GAL", colors: ["#8A1538", "#FFFFFF"], tier: 2, squad: [] },
     { id: "irl_wat", name: "Waterford", short: "WAT", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "irl_dro", name: "Drogheda", short: "DRO", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "irl_sli", name: "Sligo Rovers", short: "SLI", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "irl_cor", name: "Cork City", short: "COR", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_IRL2 = [
     { id: "irl_cob", name: "Cobh Ramblers", short: "COB", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "irl_bra", name: "Bray Wanderers", short: "BRA", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "irl_ath", name: "Athlone Town", short: "ATH", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "irl_ucd", name: "UCD", short: "UCD", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "irl_fin", name: "Finn Harps", short: "FIN", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "irl_lon", name: "Longford Town", short: "LON", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "irl_ker", name: "Kerry", short: "KER", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "irl_tre", name: "Treaty United", short: "TRE", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "irl_wex", name: "Wexford", short: "WEX", colors: ["#4B2E83", "#FFD700"], tier: 1, squad: [] },
     { id: "irl_dun", name: "Dundalk", short: "DUN", colors: ["#FFFFFF", "#000000"], tier: 1, squad: [] },
   ];

   // --- ALBANIA (Kategoria Superiore, quad) ---
   const RAW_ALB1 = [
     { id: "alb_tir", name: "Tirana", short: "TIR", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "alb_prt", name: "Partizani", short: "PRT", colors: ["#E30613", "#FFFFFF"], tier: 3, squad: [] },
     { id: "alb_egn", name: "Egnatia", short: "EGN", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "alb_vll", name: "Vllaznia", short: "VLL", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "alb_din", name: "Dinamo City", short: "DIN", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "alb_elb", name: "Elbasani", short: "ELB", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "alb_ske", name: "Skënderbeu", short: "SKE", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "alb_lac", name: "Laçi", short: "LAC", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "alb_teu", name: "Teuta", short: "TEU", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "alb_erz", name: "Erzeni", short: "ERZ", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
   ];
   const RAW_ALB2 = [
     { id: "alb_byl", name: "Bylis", short: "BYL", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "alb_fla", name: "Flamurtari", short: "FLA", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "alb_kas", name: "Kastrioti", short: "KAS", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
     { id: "alb_apo", name: "Apolonia", short: "APO", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "alb_bes", name: "Besa", short: "BES", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "alb_luf", name: "Luftëtari", short: "LUF", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "alb_pog", name: "Pogradeci", short: "POG", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "alb_tur", name: "Turbina", short: "TUR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "alb_tom", name: "Tomori", short: "TOM", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "alb_kor", name: "Korabi", short: "KOR", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
   ];

   // --- NORTH MACEDONIA (Prva Liga) ---
   const RAW_MKD1 = [
     { id: "mkd_shk", name: "Shkëndija", short: "SHK", colors: ["#E30613", "#000000"], tier: 3, squad: [] },
     { id: "mkd_str", name: "Struga", short: "STR", colors: ["#000000", "#FFD700"], tier: 3, squad: [] },
     { id: "mkd_var", name: "Vardar", short: "VAR", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "mkd_rab", name: "Rabotnički", short: "RAB", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mkd_sil", name: "Sileks", short: "SIL", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "mkd_mgp", name: "Makedonija GP", short: "MGP", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mkd_bre", name: "Bregalnica", short: "BRE", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mkd_tik", name: "Tikvesh", short: "TIK", colors: ["#8A1538", "#FFD700"], tier: 2, squad: [] },
     { id: "mkd_vos", name: "Voska Sport", short: "VOS", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mkd_gos", name: "Gostivar", short: "GOS", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mkd_sku", name: "Shkupi", short: "SKU", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "mkd_bor", name: "Borec", short: "BOR", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_MKD2 = [
     { id: "mkd_pob", name: "Pobeda", short: "POB", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "mkd_pel", name: "Pelister", short: "PEL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mkd_bela", name: "Belasica", short: "BLS", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mkd_det", name: "Detonit", short: "DET", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "mkd_ohr", name: "Ohrid", short: "OHR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mkd_kar", name: "Karaorman", short: "KAR", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mkd_eur", name: "Euromilk", short: "EUR", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "mkd_sas", name: "Sasa", short: "SAS", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mkd_nov", name: "Novaci", short: "NOV", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mkd_neg", name: "Vardar Negotino", short: "NEG", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- MOLDOVA (Super Liga) ---
   const RAW_MDA1 = [
     { id: "mda_she", name: "Sheriff Tiraspol", short: "SHE", colors: ["#FFD700", "#000000"], tier: 3, squad: [] },
     { id: "mda_zim", name: "Zimbru", short: "ZIM", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
     { id: "mda_mil", name: "Milsami", short: "MIL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mda_pet", name: "Petrocub", short: "PET", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "mda_din", name: "Dinamo-Auto", short: "DIN", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mda_bal", name: "Bălți", short: "BAL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mda_sfg", name: "Sfîntul Gheorghe", short: "SFG", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mda_flo", name: "Florești", short: "FLO", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_MDA2 = [
     { id: "mda_dac", name: "Dacia Buiucani", short: "DAC", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mda_spa", name: "Spartanii", short: "SPA", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "mda_csf", name: "CSF Bălți", short: "CSF", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mda_vic", name: "Victoria", short: "VIC", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mda_cod", name: "Codru", short: "COD", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mda_rea", name: "Real-Succes", short: "REA", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "mda_ung", name: "Ungheni", short: "UNG", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mda_cah", name: "Cahul", short: "CAH", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mda_spt", name: "Spartac", short: "SPT", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "mda_bar", name: "Bardar", short: "BAR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- BELARUS (Vysshaya Liga) ---
   const RAW_BLR1 = [
     { id: "blr_dmi", name: "Dinamo Minsk", short: "DMI", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "blr_bat", name: "BATE Borisov", short: "BAT", colors: ["#FFD700", "#005CA9"], tier: 3, squad: [] },
     { id: "blr_sha", name: "Shakhtyor Soligorsk", short: "SHA", colors: ["#E30613", "#000000"], tier: 3, squad: [] },
     { id: "blr_nem", name: "Neman Grodno", short: "NEM", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "blr_dne", name: "Dnepr Mogilev", short: "DNE", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "blr_tor", name: "Torpedo Zhodino", short: "TOR", colors: ["#000000", "#FFD700"], tier: 2, squad: [] },
     { id: "blr_isl", name: "Isloch", short: "ISL", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "blr_sla", name: "Slavia Mozyr", short: "SLA", colors: ["#FFFFFF", "#005CA9"], tier: 2, squad: [] },
     { id: "blr_gom", name: "Gomel", short: "GOM", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "blr_naf", name: "Naftan", short: "NAF", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "blr_vit", name: "Vitebsk", short: "VIT", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "blr_slu", name: "Slutsk", short: "SLU", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "blr_mol", name: "Molodechno", short: "MOL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "blr_ars", name: "Arsenal Dzerzhinsk", short: "ARS", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "blr_mlv", name: "ML Vitebsk", short: "MLV", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "blr_smo", name: "Smorgon", short: "SMO", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
   ];
   const RAW_BLR2 = [
     { id: "blr_bre", name: "Dinamo Brest", short: "BRE", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "blr_vol", name: "Volna Pinsk", short: "VOL", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "blr_lid", name: "Lida", short: "LID", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "blr_bum", name: "Bumprom", short: "BUM", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "blr_ost", name: "Ostrovets", short: "OST", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "blr_bab", name: "Baranovichi", short: "BAB", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "blr_ors", name: "Orsha", short: "ORS", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "blr_ruk", name: "Rukh Brest", short: "RUK", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "blr_bel", name: "Belshina", short: "BEL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "blr_zvb", name: "Zvezda-BGU", short: "ZVB", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
   ];

   // --- AZERBAIJAN (Premier League, quad) ---
   const RAW_AZE1 = [
     { id: "aze_qar", name: "Qarabağ", short: "QAR", colors: ["#000000", "#FFFFFF"], tier: 3,
       squad: [
         P("Mateusz Kochalski", "GK", 25, 73),
         P("Bahlul Mustafazade", "DF", 28, 74), P("Elvin Cafarquliyev", "DF", 24, 73), P("Kevin Medina", "DF", 30, 73), P("Badavi Guseynov", "DF", 34, 72), P("Matheus Silva", "DF", 25, 73),
         P("Marko Janković", "MF", 30, 73), P("Abdellah Zoubir", "MF", 34, 75), P("Leandro Andrade", "MF", 26, 74), P("Toral Bayramov", "MF", 25, 73), P("Ibrahima Wadji", "MF", 30, 72),
         P("Nariman Akhundzade", "FW", 22, 75), P("Juninho", "FW", 28, 73), P("Emmanuel Addai", "FW", 24, 73), P("Kady Borges", "FW", 30, 73),
       ]},
     { id: "aze_nef", name: "Neftçi", short: "NEF", colors: ["#000000", "#FFFFFF"], tier: 3, squad: [] },
     { id: "aze_zir", name: "Zira", short: "ZIR", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "aze_sab", name: "Sabah", short: "SAB", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aze_ara", name: "Araz", short: "ARA", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aze_sum", name: "Sumqayıt", short: "SUM", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aze_kep", name: "Kəpəz", short: "KEP", colors: ["#8A1538", "#FFD700"], tier: 2, squad: [] },
     { id: "aze_tur", name: "Turan Tovuz", short: "TUR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "aze_seb", name: "Səbail", short: "SEB", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "aze_sam", name: "Şamaxı", short: "SAM", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_AZE2 = [
     { id: "aze_dif", name: "Difai", short: "DIF", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aze_krv", name: "Karvan", short: "KRV", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aze_moi", name: "MOIK", short: "MOI", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aze_goy", name: "Göyəzən", short: "GOY", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "aze_mil", name: "Mil-Muğan", short: "MIL", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aze_ceb", name: "Cəbrayıl", short: "CEB", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "aze_sek", name: "Şəki", short: "SEK", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "aze_ags", name: "Ağsu", short: "AGS", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "aze_yen", name: "Yeni Çağ", short: "YEN", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "aze_kur", name: "Kür-Araz", short: "KUR", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
   ];

   // --- KAZAKHSTAN (Premier League) ---
   const RAW_KAZ1 = [
     { id: "kaz_ast", name: "Astana", short: "AST", colors: ["#FFD700", "#005CA9"], tier: 3,
       squad: [
         P("Marin Tomasov", "FW", 37, 73), P("Abzal Beysebekov", "DF", 33, 72), P("Askhat Tagybergen", "MF", 36, 72),
         P("Dušan Jovančić", "MF", 31, 72),
       ]},
     { id: "kaz_kai", name: "Kairat", short: "KAI", colors: ["#FFD700", "#000000"], tier: 3,
       squad: [
         P("Dastan Satpaev", "FW", 18, 75), P("Jorginho", "FW", 27, 73), P("Valeriy Gromyko", "MF", 24, 72),
         P("Aleksandr Martynovich", "DF", 38, 72),
       ]},
     { id: "kaz_tob", name: "Tobol", short: "TOB", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kaz_akt", name: "Aktobe", short: "AKT", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kaz_ord", name: "Ordabasy", short: "ORD", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "kaz_kyz", name: "Kyzylzhar", short: "KYZ", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kaz_zhe", name: "Zhenis", short: "ZHE", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kaz_trn", name: "Turan", short: "TRN", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kaz_aty", name: "Atyrau", short: "ATY", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kaz_eli", name: "Elimai", short: "ELI", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "kaz_okz", name: "Okzhetpes", short: "OKZ", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "kaz_jet", name: "Jetisu", short: "JET", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kaz_kas", name: "Kaspiy", short: "KAS", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kaz_uly", name: "Ulytau", short: "ULY", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
   ];
   const RAW_KAZ2 = [
     { id: "kaz_kzh", name: "Kairat-Zhastar", short: "KZH", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "kaz_eki", name: "Ekibastuz", short: "EKI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kaz_aks", name: "Aksu", short: "AKS", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kaz_mak", name: "Maktaaral", short: "MAK", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "kaz_kht", name: "Khan Tengri", short: "KHT", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kaz_bai", name: "Baikonur", short: "BAI", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "kaz_kyr", name: "Kyran", short: "KYR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kaz_yas", name: "Yassy", short: "YAS", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kaz_ont", name: "Akademiya Ontustik", short: "ONT", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kaz_cs2", name: "Caspiy-2", short: "CS2", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
   ];

   // --- GEORGIA (Erovnuli Liga, quad) ---
   const RAW_GEO1 = [
     { id: "geo_dtb", name: "Dinamo Tbilisi", short: "DTB", colors: ["#005CA9", "#FFFFFF"], tier: 3,
       squad: [
         P("Giorgi Kvernadze", "FW", 23, 74), P("Luka Gagnidze", "MF", 22, 73), P("Nika Kvekveskiri", "MF", 34, 72),
         P("Saba Sazonov", "DF", 23, 73),
       ]},
     { id: "geo_dba", name: "Dinamo Batumi", short: "DBA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "geo_tor", name: "Torpedo Kutaisi", short: "TOR", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "geo_ibe", name: "Iberia 1999", short: "IBE", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "geo_sab", name: "Saburtalo", short: "SAB", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "geo_dil", name: "Dila", short: "DIL", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "geo_gag", name: "Gagra", short: "GAG", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "geo_kol", name: "Kolkheti Poti", short: "KOL", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "geo_sam", name: "Samgurali", short: "SAM", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "geo_tel", name: "Telavi", short: "TEL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_GEO2 = [
     { id: "geo_spa", name: "Spaeri", short: "SPA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "geo_k13", name: "Kolkheti-1913", short: "K13", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "geo_gar", name: "Gareji", short: "GAR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "geo_sio", name: "Sioni", short: "SIO", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "geo_mer", name: "Merani", short: "MER", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "geo_nor", name: "Norchi Dinamoeli", short: "NOR", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "geo_loc", name: "Locomotive Tbilisi", short: "LOC", colors: ["#00A650", "#E30613"], tier: 1, squad: [] },
     { id: "geo_chi", name: "Chikhura", short: "CHI", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "geo_gur", name: "Guria", short: "GUR", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "geo_bet", name: "Betlemi", short: "BET", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- ARMENIA (Premier League, quad) ---
   const RAW_ARM1 = [
     { id: "arm_ara", name: "Ararat-Armenia", short: "ARA", colors: ["#E30613", "#005CA9"], tier: 3, squad: [] },
     { id: "arm_pyu", name: "Pyunik", short: "PYU", colors: ["#E30613", "#FFD700"], tier: 3, squad: [] },
     { id: "arm_noa", name: "Noah", short: "NOA", colors: ["#000000", "#FFD700"], tier: 2, squad: [] },
     { id: "arm_ura", name: "Urartu", short: "URA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "arm_ala", name: "Alashkert", short: "ALA", colors: ["#8A1538", "#FFFFFF"], tier: 2, squad: [] },
     { id: "arm_ary", name: "Ararat Yerevan", short: "ARY", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "arm_van", name: "Van", short: "VAN", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "arm_wes", name: "West Armenia", short: "WES", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "arm_shi", name: "Shirak", short: "SHI", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "arm_bkm", name: "BKMA", short: "BKM", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_ARM2 = [
     { id: "arm_syu", name: "Syunik", short: "SYU", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "arm_ler", name: "Lernayin Artsakh", short: "LER", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "arm_kot", name: "Kotayk", short: "KOT", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "arm_sev", name: "Sevan", short: "SEV", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "arm_d20", name: "Dinamo-2000", short: "D20", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "arm_ar2", name: "Ararat-2", short: "AR2", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "arm_py2", name: "Pyunik-2", short: "PY2", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "arm_no2", name: "Noah-2", short: "NO2", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "arm_va2", name: "Van-2", short: "VA2", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "arm_jse", name: "Junior Sevan", short: "JSE", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- LATVIA (Virslīga, quad) ---
   const RAW_LVA1 = [
     { id: "lva_rig", name: "Riga FC", short: "RIG", colors: ["#000000", "#E30613"], tier: 3, squad: [] },
     { id: "lva_rfs", name: "RFS", short: "RFS", colors: ["#8A1538", "#FFFFFF"], tier: 3, squad: [] },
     { id: "lva_aud", name: "Auda", short: "AUD", colors: ["#00A650", "#000000"], tier: 2, squad: [] },
     { id: "lva_val", name: "Valmiera", short: "VAL", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "lva_lie", name: "Liepāja", short: "LIE", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lva_dau", name: "Daugavpils", short: "DAU", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lva_sno", name: "Super Nova", short: "SNO", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "lva_met", name: "Metta", short: "MET", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "lva_tuk", name: "Tukums", short: "TUK", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lva_jel", name: "Jelgava", short: "JEL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_LVA2 = [
     { id: "lva_gro", name: "Grobiņa", short: "GRO", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lva_rez", name: "Rēzekne", short: "REZ", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lva_alb", name: "Alberts", short: "ALB", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "lva_lee", name: "Leevon", short: "LEE", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lva_smi", name: "Smiltene", short: "SMI", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lva_sal", name: "Salaspils", short: "SAL", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "lva_drig", name: "Dinamo Rīga", short: "DRI", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "lva_ogr", name: "Ogre", short: "OGR", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "lva_sta", name: "Staicele", short: "STA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lva_jur", name: "Jūrmala", short: "JUR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- LITHUANIA (A Lyga, quad) ---
   const RAW_LTU1 = [
     { id: "ltu_zal", name: "Žalgiris", short: "ZAL", colors: ["#00A650", "#FFFFFF"], tier: 3, squad: [] },
     { id: "ltu_kza", name: "Kauno Žalgiris", short: "KZA", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
     { id: "ltu_pan", name: "Panevėžys", short: "PAN", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ltu_sud", name: "Sūduva", short: "SUD", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
     { id: "ltu_heg", name: "Hegelmann", short: "HEG", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ltu_ban", name: "Banga", short: "BAN", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "ltu_dai", name: "Dainava", short: "DAI", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ltu_rit", name: "Riteriai", short: "RIT", colors: ["#000000", "#FFD700"], tier: 2, squad: [] },
     { id: "ltu_dzi", name: "Džiugas", short: "DZI", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "ltu_tra", name: "TransINVEST", short: "TRA", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_LTU2 = [
     { id: "ltu_nep", name: "Neptūnas", short: "NEP", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ltu_jon", name: "Jonava", short: "JON", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ltu_sia", name: "Šiauliai", short: "SIA", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "ltu_da2", name: "Dainava-2", short: "DA2", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "ltu_mar", name: "Marijampolė", short: "MAR", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "ltu_trk", name: "Trakai", short: "TRK", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "ltu_nev", name: "Nevėžis", short: "NEV", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ltu_gar", name: "Garliava", short: "GAR", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "ltu_sil", name: "Šilas", short: "SIL", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "ltu_min", name: "Minija", short: "MIN", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- KOSOVO (Superliga, quad) ---
   const RAW_KVX1 = [
     { id: "kvx_bal", name: "Ballkani", short: "BAL", colors: ["#E30613", "#000000"], tier: 3, squad: [] },
     { id: "kvx_dri", name: "Drita", short: "DRI", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kvx_pri", name: "Prishtina", short: "PRI", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "kvx_mal", name: "Malisheva", short: "MAL", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kvx_lla", name: "Llapi", short: "LLA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kvx_duk", name: "Dukagjini", short: "DUK", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kvx_gji", name: "Gjilani", short: "GJI", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "kvx_fer", name: "Ferizaj", short: "FER", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kvx_vel", name: "Vëllaznimi", short: "VEL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "kvx_tre", name: "Trepça 89", short: "TRE", colors: ["#000000", "#E30613"], tier: 2, squad: [] },
   ];
   const RAW_KVX2 = [
     { id: "kvx_ram", name: "Ramiz Sadiku", short: "RAM", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kvx_fus", name: "Fushë Kosova", short: "FUS", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kvx_rah", name: "Rahoveci", short: "RAH", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kvx_ulp", name: "Ulpiana", short: "ULP", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "kvx_kek", name: "Kek", short: "KEK", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "kvx_fnk", name: "Feronikeli", short: "FNK", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kvx_lir", name: "Liria", short: "LIR", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "kvx_bes", name: "Besa Pejë", short: "BES", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kvx_arb", name: "Arbëria", short: "ARB", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "kvx_fla", name: "Flamurtari Pristina", short: "FLA", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
   ];

   // --- MONTENEGRO (Prva CFL, quad) ---
   const RAW_MNE1 = [
     { id: "mne_bud", name: "Budućnost", short: "BUD", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "mne_sut", name: "Sutjeska", short: "SUT", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "mne_dec", name: "Dečić", short: "DEC", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "mne_tiv", name: "Arsenal Tivat", short: "TIV", colors: ["#E30613", "#005CA9"], tier: 2, squad: [] },
     { id: "mne_jez", name: "Jezero", short: "JEZ", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mne_pet", name: "Petrovac", short: "PET", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mne_mla", name: "Mladost", short: "MLA", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mne_rud", name: "Rudar", short: "RUD", colors: ["#000000", "#FFD700"], tier: 2, squad: [] },
     { id: "mne_otr", name: "Otrant", short: "OTR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mne_mor", name: "Mornar", short: "MOR", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
   ];
   const RAW_MNE2 = [
     { id: "mne_bok", name: "Bokelj", short: "BOK", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mne_isk", name: "Iskra", short: "ISK", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mne_zet", name: "Zeta", short: "ZET", colors: ["#FFD700", "#00A650"], tier: 1, squad: [] },
     { id: "mne_pod", name: "Podgorica", short: "POD", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "mne_ber", name: "Berane", short: "BER", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mne_iga", name: "Igalo", short: "IGA", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "mne_cet", name: "Cetinje", short: "CET", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "mne_grb", name: "Grbalj", short: "GRB", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mne_kom", name: "Kom", short: "KOM", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mne_lov", name: "Lovćen", short: "LOV", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
   ];

   // --- ESTONIA (Meistriliiga, quad) ---
   const RAW_EST1 = [
     { id: "est_flo", name: "Flora", short: "FLO", colors: ["#00A650", "#FFFFFF"], tier: 3, squad: [] },
     { id: "est_lev", name: "Levadia", short: "LEV", colors: ["#005CA9", "#000000"], tier: 3, squad: [] },
     { id: "est_pai", name: "Paide", short: "PAI", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "est_kal", name: "Kalju", short: "KAL", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "est_tkl", name: "Tallinna Kalev", short: "TKL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "est_vap", name: "Vaprus", short: "VAP", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "est_trn", name: "Trans Narva", short: "TRN", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
     { id: "est_tam", name: "Tammeka", short: "TAM", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "est_har", name: "Harju", short: "HAR", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "est_kur", name: "Kuressaare", short: "KUR", colors: ["#FFD700", "#005CA9"], tier: 2, squad: [] },
   ];
   const RAW_EST2 = [
     { id: "est_tul", name: "Tulevik", short: "TUL", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "est_elv", name: "Elva", short: "ELV", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "est_amb", name: "Ambla", short: "AMB", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "est_laa", name: "Läänemaa", short: "LAA", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "est_nom", name: "Nõmme United", short: "NOM", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "est_wel", name: "Welco", short: "WEL", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "est_maa", name: "Maardu", short: "MAA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "est_leg", name: "Legion", short: "LEG", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
     { id: "est_tar", name: "Tartu", short: "TAR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "est_kl2", name: "Kalev II", short: "KL2", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
   ];

   // --- LUXEMBOURG (National Division) ---
   const RAW_LUX1 = [
     { id: "lux_dud", name: "F91 Dudelange", short: "DUD", colors: ["#E30613", "#FFD700"], tier: 3, squad: [] },
     { id: "lux_swi", name: "Swift Hesperange", short: "SWI", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "lux_rac", name: "Racing Union", short: "RAC", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lux_dif", name: "Differdange", short: "DIF", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "lux_pro", name: "Progrès Niederkorn", short: "PRO", colors: ["#000000", "#FFD700"], tier: 2, squad: [] },
     { id: "lux_una", name: "UNA Strassen", short: "UNA", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lux_hos", name: "Hostert", short: "HOS", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lux_wil", name: "Wiltz", short: "WIL", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "lux_ros", name: "Rosport", short: "ROS", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "lux_mon", name: "Mondorf", short: "MON", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lux_kae", name: "Käerjéng", short: "KAE", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lux_mdc", name: "Mondercange", short: "MDC", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lux_etz", name: "Etzella", short: "ETZ", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "lux_rum", name: "Rumelange", short: "RUM", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "lux_pet", name: "Titus Pétange", short: "PET", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "lux_bet", name: "Bettembourg", short: "BET", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_LUX2 = [
     { id: "lux_keh", name: "Kehlen", short: "KEH", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lux_muh", name: "Mühlenbach", short: "MUH", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lux_san", name: "Sandweiler", short: "SAN", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lux_erp", name: "Erpeldange", short: "ERP", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "lux_hob", name: "Hobscheid", short: "HOB", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "lux_gre", name: "Grevenmacher", short: "GRE", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "lux_ber", name: "Berdorf", short: "BER", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lux_wor", name: "Wormeldange", short: "WOR", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "lux_sch", name: "Schifflange", short: "SCH", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "lux_can", name: "Canach", short: "CAN", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- NORTHERN IRELAND (NIFL Premiership, triple + split 6/6) ---
   const RAW_NIR1 = [
     { id: "nir_lin", name: "Linfield", short: "LIN", colors: ["#005CA9", "#E30613"], tier: 3, squad: [] },
     { id: "nir_lar", name: "Larne", short: "LAR", colors: ["#E30613", "#000000"], tier: 3, squad: [] },
     { id: "nir_gle", name: "Glentoran", short: "GLE", colors: ["#00A650", "#E30613"], tier: 2, squad: [] },
     { id: "nir_cli", name: "Cliftonville", short: "CLI", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nir_cru", name: "Crusaders", short: "CRU", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "nir_col", name: "Coleraine", short: "COL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nir_gla", name: "Glenavon", short: "GLA", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "nir_dun", name: "Dungannon", short: "DUN", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nir_car", name: "Carrick", short: "CAR", colors: ["#000000", "#FFD700"], tier: 2, squad: [] },
     { id: "nir_bal", name: "Ballymena", short: "BAL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nir_lou", name: "Loughgall", short: "LOU", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "nir_por", name: "Portadown", short: "POR", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_NIR2 = [
     { id: "nir_ann", name: "Annagh United", short: "ANN", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nir_new", name: "Newry City", short: "NEW", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nir_bcl", name: "Ballyclare", short: "BCL", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "nir_ins", name: "Institute", short: "INS", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "nir_dde", name: "Dundela", short: "DDE", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "nir_hw", name: "H&W Welders", short: "HW", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "nir_ban", name: "Bangor", short: "BAN", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nir_ard", name: "Ards", short: "ARD", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "nir_pst", name: "Portstewart", short: "PST", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nir_lim", name: "Limavady", short: "LIM", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nir_kno", name: "Knockbreda", short: "KNO", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
     { id: "nir_der", name: "Dergview", short: "DER", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
   ];

   // --- MALTA (Premier League) ---
   const RAW_MLT1 = [
     { id: "mlt_ham", name: "Ħamrun Spartans", short: "HAM", colors: ["#E30613", "#000000"], tier: 3, squad: [] },
     { id: "mlt_bir", name: "Birkirkara", short: "BIR", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
     { id: "mlt_flo", name: "Floriana", short: "FLO", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mlt_sli", name: "Sliema Wanderers", short: "SLI", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mlt_val", name: "Valletta", short: "VAL", colors: ["#FFFFFF", "#000000"], tier: 2, squad: [] },
     { id: "mlt_bal", name: "Balzan", short: "BAL", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "mlt_gzi", name: "Gżira United", short: "GZI", colors: ["#8A1538", "#FFD700"], tier: 2, squad: [] },
     { id: "mlt_hib", name: "Hibernians", short: "HIB", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mlt_mar", name: "Marsaxlokk", short: "MAR", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "mlt_nax", name: "Naxxar Lions", short: "NAX", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
     { id: "mlt_mos", name: "Mosta", short: "MOS", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "mlt_zab", name: "Żabbar St Patrick", short: "ZAB", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
   ];
   const RAW_MLT2 = [
     { id: "mlt_zej", name: "Żejtun Corinthians", short: "ZEJ", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mlt_pie", name: "Pietà Hotspurs", short: "PIE", colors: ["#000000", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mlt_sta", name: "St Andrews", short: "STA", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "mlt_zeb", name: "Żebbuġ Rangers", short: "ZEB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mlt_mel", name: "Melita", short: "MEL", colors: ["#8A1538", "#FFD700"], tier: 1, squad: [] },
     { id: "mlt_slu", name: "Santa Lucia", short: "SLU", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "mlt_swi", name: "Swieqi United", short: "SWI", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mlt_att", name: "Attard", short: "ATT", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "mlt_xew", name: "Xewkija Tigers", short: "XEW", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "mlt_vic", name: "Victoria Hotspurs", short: "VIC", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- FAROE ISLANDS (Betri deildin, triple) ---
   const RAW_FRO1 = [
     { id: "fro_ki", name: "KÍ Klaksvík", short: "KI", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "fro_vik", name: "Víkingur", short: "VIK", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "fro_hb", name: "HB Tórshavn", short: "HB", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fro_b36", name: "B36", short: "B36", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fro_nsi", name: "NSÍ", short: "NSI", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fro_ska", name: "Skála", short: "SKA", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "fro_ebs", name: "EB/Streymur", short: "EBS", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fro_tb", name: "TB", short: "TB", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fro_07v", name: "07 Vestur", short: "07V", colors: ["#00A650", "#FFFFFF"], tier: 2, squad: [] },
     { id: "fro_ab", name: "AB", short: "AB", colors: ["#005CA9", "#000000"], tier: 2, squad: [] },
   ];
   const RAW_FRO2 = [
     { id: "fro_b68", name: "B68", short: "B68", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "fro_if", name: "ÍF", short: "IF", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "fro_fsv", name: "FS Vágar", short: "FSV", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fro_und", name: "Undrið", short: "UND", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fro_giz", name: "Giza", short: "GIZ", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fro_roy", name: "Royn", short: "ROY", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "fro_vb", name: "VB", short: "VB", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "fro_sum", name: "Sumba", short: "SUM", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "fro_mb", name: "MB", short: "MB", colors: ["#000000", "#E30613"], tier: 1, squad: [] },
     { id: "fro_lif", name: "Leikní", short: "LIF", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- WALES (Cymru Premier, split 6/6) ---
   const RAW_WAL1 = [
     { id: "wal_tns", name: "The New Saints", short: "TNS", colors: ["#005CA9", "#FFFFFF"], tier: 3, squad: [] },
     { id: "wal_cqn", name: "Connah's Quay", short: "CQN", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "wal_bal", name: "Bala Town", short: "BAL", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "wal_pen", name: "Penybont", short: "PEN", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "wal_hav", name: "Haverfordwest", short: "HAV", colors: ["#005CA9", "#000000"], tier: 2, squad: [] },
     { id: "wal_abe", name: "Aberystwyth", short: "ABE", colors: ["#00A650", "#000000"], tier: 2, squad: [] },
     { id: "wal_cae", name: "Caernarfon", short: "CAE", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "wal_new", name: "Newtown", short: "NEW", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "wal_bar", name: "Barry Town", short: "BAR", colors: ["#FFD700", "#000000"], tier: 2, squad: [] },
     { id: "wal_fli", name: "Flint Town", short: "FLI", colors: ["#005CA9", "#FFD700"], tier: 2, squad: [] },
     { id: "wal_bri", name: "Briton Ferry", short: "BRI", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "wal_met", name: "Cardiff Met", short: "MET", colors: ["#000000", "#FFD700"], tier: 2, squad: [] },
   ];
   const RAW_WAL2 = [
     { id: "wal_col", name: "Colwyn Bay", short: "COL", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "wal_lla", name: "Llanelli", short: "LLA", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "wal_tre", name: "Trefelin", short: "TRE", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "wal_rut", name: "Ruthin Town", short: "RUT", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "wal_hol", name: "Holywell Town", short: "HOL", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "wal_gui", name: "Guilsfield", short: "GUI", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "wal_air", name: "Airbus UK", short: "AIR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "wal_pre", name: "Prestatyn", short: "PRE", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "wal_buc", name: "Buckley", short: "BUC", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "wal_lld", name: "Llandudno", short: "LLD", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "wal_prh", name: "Penrhyncoch", short: "PRH", colors: ["#00A650", "#000000"], tier: 1, squad: [] },
     { id: "wal_cam", name: "Cambrian", short: "CAM", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- GIBRALTAR (Gibraltar Football League) ---
   const RAW_GIB1 = [
     { id: "gib_lin", name: "Lincoln Red Imps", short: "LIN", colors: ["#E30613", "#000000"], tier: 2, squad: [] },
     { id: "gib_bru", name: "Bruno's Magpies", short: "BRU", colors: ["#000000", "#FFFFFF"], tier: 2, squad: [] },
     { id: "gib_stj", name: "St Joseph's", short: "STJ", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "gib_eur", name: "Europa", short: "EUR", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "gib_lio", name: "Lions Gibraltar", short: "LIO", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "gib_mon", name: "Mons Calpe", short: "MON", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gib_m62", name: "Manchester 62", short: "M62", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gib_gla", name: "Glacis United", short: "GLA", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gib_epo", name: "Europa Point", short: "EPO", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "gib_col", name: "College 1975", short: "COL", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
   ];
   const RAW_GIB2 = [
     { id: "gib_lyn", name: "Lynx", short: "LYN", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "gib_boc", name: "Boca Gibraltar", short: "BOC", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "gib_gut", name: "Gibraltar United", short: "GUT", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gib_oly", name: "Olympic", short: "OLY", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "gib_ang", name: "Angels", short: "ANG", colors: ["#FFFFFF", "#005CA9"], tier: 1, squad: [] },
     { id: "gib_can", name: "Cannons", short: "CAN", colors: ["#000000", "#E30613"], tier: 1, squad: [] },
     { id: "gib_leo", name: "Leo", short: "LEO", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "gib_roc", name: "Rock", short: "ROC", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- ANDORRA (Primera Divisió, triple) ---
   const RAW_AND1 = [
     { id: "and_int", name: "Inter Escaldes", short: "INT", colors: ["#005CA9", "#000000"], tier: 2, squad: [] },
     { id: "and_atl", name: "Atlètic Escaldes", short: "ATL", colors: ["#E30613", "#FFFFFF"], tier: 2, squad: [] },
     { id: "and_sju", name: "Sant Julià", short: "SJU", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "and_sco", name: "Santa Coloma", short: "SCO", colors: ["#005CA9", "#E30613"], tier: 2, squad: [] },
     { id: "and_uec", name: "UE Santa Coloma", short: "UEC", colors: ["#E30613", "#FFD700"], tier: 2, squad: [] },
     { id: "and_enc", name: "Encamp", short: "ENC", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "and_ord", name: "Ordino", short: "ORD", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "and_pen", name: "Penya Encarnada", short: "PEN", colors: ["#8A1538", "#FFFFFF"], tier: 1, squad: [] },
     { id: "and_car", name: "Carroi", short: "CAR", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "and_ran", name: "Ranger's", short: "RAN", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
   ];
   const RAW_AND2 = [
     { id: "and_lus", name: "Lusitans", short: "LUS", colors: ["#00A650", "#E30613"], tier: 1, squad: [] },
     { id: "and_esp", name: "Esperança", short: "ESP", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "and_ext", name: "Extremenya", short: "EXT", colors: ["#00A650", "#FFFFFF"], tier: 1, squad: [] },
     { id: "and_jen", name: "Jenlai", short: "JEN", colors: ["#E30613", "#FFD700"], tier: 1, squad: [] },
     { id: "and_pra", name: "Prada", short: "PRA", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "and_bet", name: "Betzalel", short: "BET", colors: ["#000000", "#FFD700"], tier: 1, squad: [] },
     { id: "and_man", name: "Manlleu", short: "MAN", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "and_pas", name: "Pas de la Casa", short: "PAS", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // --- SAN MARINO (Campionato Sammarinese — single amateur tier) ---
   const RAW_SMR1 = [
     { id: "smr_trf", name: "Tre Fiori", short: "TRF", colors: ["#FFD700", "#00A650"], tier: 2, squad: [] },
     { id: "smr_trp", name: "Tre Penne", short: "TRP", colors: ["#005CA9", "#FFFFFF"], tier: 2, squad: [] },
     { id: "smr_laf", name: "La Fiorita", short: "LAF", colors: ["#00A650", "#FFD700"], tier: 2, squad: [] },
     { id: "smr_vir", name: "Virtus", short: "VIR", colors: ["#E30613", "#000000"], tier: 1, squad: [] },
     { id: "smr_fol", name: "Folgore", short: "FOL", colors: ["#FFD700", "#E30613"], tier: 1, squad: [] },
     { id: "smr_cos", name: "Cosmos", short: "COS", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
     { id: "smr_dom", name: "Domagnano", short: "DOM", colors: ["#FFD700", "#005CA9"], tier: 1, squad: [] },
     { id: "smr_fio", name: "Fiorentino", short: "FIO", colors: ["#4B2E83", "#FFFFFF"], tier: 1, squad: [] },
     { id: "smr_lib", name: "Libertas", short: "LIB", colors: ["#FFD700", "#000000"], tier: 1, squad: [] },
     { id: "smr_mur", name: "Murata", short: "MUR", colors: ["#005CA9", "#E30613"], tier: 1, squad: [] },
     { id: "smr_pen", name: "Pennarossa", short: "PEN", colors: ["#E30613", "#FFFFFF"], tier: 1, squad: [] },
     { id: "smr_sgi", name: "San Giovanni", short: "SGI", colors: ["#E30613", "#005CA9"], tier: 1, squad: [] },
     { id: "smr_cai", name: "Cailungo", short: "CAI", colors: ["#00A650", "#FFD700"], tier: 1, squad: [] },
     { id: "smr_fae", name: "Faetano", short: "FAE", colors: ["#005CA9", "#FFD700"], tier: 1, squad: [] },
     { id: "smr_juv", name: "Juvenes-Dogana", short: "JUV", colors: ["#005CA9", "#FFFFFF"], tier: 1, squad: [] },
   ];

   // Attach league tag, club reference & ids onto every club / player.
   const CLUBS = [
     ...RAW_CLUBS.map(c => {
       c.league = "PL";
       c.squad.forEach(p => { p.club = c.id; });
       c.crestInitials = c.short;
       return c;
     }),
     ...RAW_CHAMPIONSHIP.map(c => { c.league = "CH"; c.crestInitials = c.short; return c; }),
     ...RAW_LEAGUEONE.map(c => { c.league = "L1"; c.crestInitials = c.short; return c; }),
     ...RAW_LEAGUETWO.map(c => { c.league = "L2"; c.crestInitials = c.short; return c; }),
     ...RAW_LALIGA.map(c => { c.league = "LL"; c.crestInitials = c.short; return c; }),
     ...RAW_SEGUNDA.map(c => { c.league = "SG"; c.crestInitials = c.short; return c; }),
     ...RAW_DE_BL1.map(c => { c.league = "BL1"; c.crestInitials = c.short; return c; }),
     ...RAW_DE_BL2.map(c => { c.league = "BL2"; c.crestInitials = c.short; return c; }),
     ...RAW_IT_SA.map(c => { c.league = "SA"; c.crestInitials = c.short; return c; }),
     ...RAW_IT_SB.map(c => { c.league = "SB"; c.crestInitials = c.short; return c; }),
     ...RAW_PT_PP.map(c => { c.league = "PP"; c.crestInitials = c.short; return c; }),
     ...RAW_PT_P2.map(c => { c.league = "P2"; c.crestInitials = c.short; return c; }),
     ...RAW_NL_ER.map(c => { c.league = "ER"; c.crestInitials = c.short; return c; }),
     ...RAW_NL_EE.map(c => { c.league = "EE"; c.crestInitials = c.short; return c; }),
     ...RAW_PL_EK.map(c => { c.league = "EK"; c.crestInitials = c.short; return c; }),
     ...RAW_PL_IL.map(c => { c.league = "IL"; c.crestInitials = c.short; return c; }),
     ...RAW_TR_SL.map(c => { c.league = "SL"; c.crestInitials = c.short; return c; }),
     ...RAW_TR_T1.map(c => { c.league = "T1"; c.crestInitials = c.short; return c; }),
     ...RAW_BE_BPL.map(c => { c.league = "BPL"; c.crestInitials = c.short; return c; }),
     ...RAW_BE_BCH.map(c => { c.league = "BCH"; c.crestInitials = c.short; return c; }),
     ...RAW_AT_ABL.map(c => { c.league = "ABL"; c.crestInitials = c.short; return c; }),
     ...RAW_AT_A2L.map(c => { c.league = "A2L"; c.crestInitials = c.short; return c; }),
     ...RAW_DK_DSL.map(c => { c.league = "DSL"; c.crestInitials = c.short; return c; }),
     ...RAW_DK_D1D.map(c => { c.league = "D1D"; c.crestInitials = c.short; return c; }),
     ...RAW_GR_GSL.map(c => { c.league = "GSL"; c.crestInitials = c.short; return c; }),
     ...RAW_GR_GS2.map(c => { c.league = "GS2"; c.crestInitials = c.short; return c; }),
     ...RAW_SC_SPL.map(c => { c.league = "SPL"; c.crestInitials = c.short; return c; }),
     ...RAW_SC_SC2.map(c => { c.league = "SC2"; c.crestInitials = c.short; return c; }),
     ...RAW_CH_SSL.map(c => { c.league = "SSL"; c.crestInitials = c.short; return c; }),
     ...RAW_CH_SCL.map(c => { c.league = "SCL"; c.crestInitials = c.short; return c; }),
     ...RAW_HR_HNL.map(c => { c.league = "HNL"; c.crestInitials = c.short; return c; }),
     ...RAW_HR_HN2.map(c => { c.league = "HN2"; c.crestInitials = c.short; return c; }),
     ...RAW_HU_NB1.map(c => { c.league = "NB1"; c.crestInitials = c.short; return c; }),
     ...RAW_HU_NB2.map(c => { c.league = "NB2"; c.crestInitials = c.short; return c; }),
     ...RAW_CZ_CZ1.map(c => { c.league = "CZ1"; c.crestInitials = c.short; return c; }),
     ...RAW_CZ_CZ2.map(c => { c.league = "CZ2"; c.crestInitials = c.short; return c; }),
     ...RAW_SR_SR1.map(c => { c.league = "SR1"; c.crestInitials = c.short; return c; }),
     ...RAW_SR_SR2.map(c => { c.league = "SR2"; c.crestInitials = c.short; return c; }),
     ...RAW_UA_UA1.map(c => { c.league = "UA1"; c.crestInitials = c.short; return c; }),
     ...RAW_UA_UA2.map(c => { c.league = "UA2"; c.crestInitials = c.short; return c; }),
     ...RAW_SE_SE1.map(c => { c.league = "SE1"; c.crestInitials = c.short; return c; }),
     ...RAW_SE_SE2.map(c => { c.league = "SE2"; c.crestInitials = c.short; return c; }),
     ...RAW_NO_NO1.map(c => { c.league = "NO1"; c.crestInitials = c.short; return c; }),
     ...RAW_NO_NO2.map(c => { c.league = "NO2"; c.crestInitials = c.short; return c; }),
     ...RAW_RO_RO1.map(c => { c.league = "RO1"; c.crestInitials = c.short; return c; }),
     ...RAW_RO_RO2.map(c => { c.league = "RO2"; c.crestInitials = c.short; return c; }),
     ...RAW_CY_CY1.map(c => { c.league = "CY1"; c.crestInitials = c.short; return c; }),
     ...RAW_CY_CY2.map(c => { c.league = "CY2"; c.crestInitials = c.short; return c; }),
     ...RAW_SK_SK1.map(c => { c.league = "SK1"; c.crestInitials = c.short; return c; }),
     ...RAW_SK_SK2.map(c => { c.league = "SK2"; c.crestInitials = c.short; return c; }),
     ...RAW_FR_FL1.map(c => { c.league = "FL1"; c.crestInitials = c.short; return c; }),
     ...RAW_FR_FL2.map(c => { c.league = "FL2"; c.crestInitials = c.short; return c; }),
     ...RAW_FR_FN1.map(c => { c.league = "FN1"; c.crestInitials = c.short; return c; }),
     ...RAW_FR_FN2.map(c => { c.league = "FN2"; c.crestInitials = c.short; return c; }),
     ...RAW_ES_PRF.map(c => { c.league = "PRF"; c.crestInitials = c.short; return c; }),
     ...RAW_ES_SGF.map(c => { c.league = "SGF"; c.crestInitials = c.short; return c; }),
     ...RAW_DE_BL3.map(c => { c.league = "BL3"; c.crestInitials = c.short; return c; }),
     ...RAW_DE_BL4.map(c => { c.league = "BL4"; c.crestInitials = c.short; return c; }),
     ...RAW_IT_SEC.map(c => { c.league = "SEC"; c.crestInitials = c.short; return c; }),
     ...RAW_IT_SED.map(c => { c.league = "SED"; c.crestInitials = c.short; return c; }),
     ...RAW_SVN1.map(c => { c.league = "SN1"; c.crestInitials = c.short; return c; }),
     ...RAW_SVN2.map(c => { c.league = "SN2"; c.crestInitials = c.short; return c; }),
     ...RAW_ISR1.map(c => { c.league = "IS1"; c.crestInitials = c.short; return c; }),
     ...RAW_ISR2.map(c => { c.league = "IS2"; c.crestInitials = c.short; return c; }),
     ...RAW_FIN1.map(c => { c.league = "FI1"; c.crestInitials = c.short; return c; }),
     ...RAW_FIN2.map(c => { c.league = "FI2"; c.crestInitials = c.short; return c; }),
     ...RAW_BUL1.map(c => { c.league = "BG1"; c.crestInitials = c.short; return c; }),
     ...RAW_BUL2.map(c => { c.league = "BG2"; c.crestInitials = c.short; return c; }),
     ...RAW_BIH1.map(c => { c.league = "BA1"; c.crestInitials = c.short; return c; }),
     ...RAW_BIH2.map(c => { c.league = "BA2"; c.crestInitials = c.short; return c; }),
     ...RAW_ISL1.map(c => { c.league = "IC1"; c.crestInitials = c.short; return c; }),
     ...RAW_ISL2.map(c => { c.league = "IC2"; c.crestInitials = c.short; return c; }),
     ...RAW_IRL1.map(c => { c.league = "IE1"; c.crestInitials = c.short; return c; }),
     ...RAW_IRL2.map(c => { c.league = "IE2"; c.crestInitials = c.short; return c; }),
     ...RAW_ALB1.map(c => { c.league = "AL1"; c.crestInitials = c.short; return c; }),
     ...RAW_ALB2.map(c => { c.league = "AL2"; c.crestInitials = c.short; return c; }),
     ...RAW_MKD1.map(c => { c.league = "MK1"; c.crestInitials = c.short; return c; }),
     ...RAW_MKD2.map(c => { c.league = "MK2"; c.crestInitials = c.short; return c; }),
     ...RAW_MDA1.map(c => { c.league = "MD1"; c.crestInitials = c.short; return c; }),
     ...RAW_MDA2.map(c => { c.league = "MD2"; c.crestInitials = c.short; return c; }),
     ...RAW_BLR1.map(c => { c.league = "BY1"; c.crestInitials = c.short; return c; }),
     ...RAW_BLR2.map(c => { c.league = "BY2"; c.crestInitials = c.short; return c; }),
     ...RAW_AZE1.map(c => { c.league = "AZ1"; c.crestInitials = c.short; return c; }),
     ...RAW_AZE2.map(c => { c.league = "AZ2"; c.crestInitials = c.short; return c; }),
     ...RAW_KAZ1.map(c => { c.league = "KZ1"; c.crestInitials = c.short; return c; }),
     ...RAW_KAZ2.map(c => { c.league = "KZ2"; c.crestInitials = c.short; return c; }),
     ...RAW_GEO1.map(c => { c.league = "GE1"; c.crestInitials = c.short; return c; }),
     ...RAW_GEO2.map(c => { c.league = "GE2"; c.crestInitials = c.short; return c; }),
     ...RAW_ARM1.map(c => { c.league = "AM1"; c.crestInitials = c.short; return c; }),
     ...RAW_ARM2.map(c => { c.league = "AM2"; c.crestInitials = c.short; return c; }),
     ...RAW_LVA1.map(c => { c.league = "LV1"; c.crestInitials = c.short; return c; }),
     ...RAW_LVA2.map(c => { c.league = "LV2"; c.crestInitials = c.short; return c; }),
     ...RAW_LTU1.map(c => { c.league = "LT1"; c.crestInitials = c.short; return c; }),
     ...RAW_LTU2.map(c => { c.league = "LT2"; c.crestInitials = c.short; return c; }),
     ...RAW_KVX1.map(c => { c.league = "XK1"; c.crestInitials = c.short; return c; }),
     ...RAW_KVX2.map(c => { c.league = "XK2"; c.crestInitials = c.short; return c; }),
     ...RAW_MNE1.map(c => { c.league = "ME1"; c.crestInitials = c.short; return c; }),
     ...RAW_MNE2.map(c => { c.league = "ME2"; c.crestInitials = c.short; return c; }),
     ...RAW_EST1.map(c => { c.league = "ET1"; c.crestInitials = c.short; return c; }),
     ...RAW_EST2.map(c => { c.league = "ET2"; c.crestInitials = c.short; return c; }),
     ...RAW_LUX1.map(c => { c.league = "LU1"; c.crestInitials = c.short; return c; }),
     ...RAW_LUX2.map(c => { c.league = "LU2"; c.crestInitials = c.short; return c; }),
     ...RAW_NIR1.map(c => { c.league = "NI1"; c.crestInitials = c.short; return c; }),
     ...RAW_NIR2.map(c => { c.league = "NI2"; c.crestInitials = c.short; return c; }),
     ...RAW_MLT1.map(c => { c.league = "MT1"; c.crestInitials = c.short; return c; }),
     ...RAW_MLT2.map(c => { c.league = "MT2"; c.crestInitials = c.short; return c; }),
     ...RAW_FRO1.map(c => { c.league = "FO1"; c.crestInitials = c.short; return c; }),
     ...RAW_FRO2.map(c => { c.league = "FO2"; c.crestInitials = c.short; return c; }),
     ...RAW_WAL1.map(c => { c.league = "WA1"; c.crestInitials = c.short; return c; }),
     ...RAW_WAL2.map(c => { c.league = "WA2"; c.crestInitials = c.short; return c; }),
     ...RAW_GIB1.map(c => { c.league = "GI1"; c.crestInitials = c.short; return c; }),
     ...RAW_GIB2.map(c => { c.league = "GI2"; c.crestInitials = c.short; return c; }),
     ...RAW_AND1.map(c => { c.league = "AD1"; c.crestInitials = c.short; return c; }),
     ...RAW_AND2.map(c => { c.league = "AD2"; c.crestInitials = c.short; return c; }),
     ...RAW_SMR1.map(c => { c.league = "SM1"; c.crestInitials = c.short; return c; }),
   ];

   function clubById(id) { return CLUBS.find(c => c.id === id); }

   // ---- League registry: the single source of truth for the world ----------
   // Every league in the game is one entry here, listed top-to-bottom within
   // each country (that order IS the promotion/relegation chain). Adding a
   // country to the world is a matter of appending its leagues here (plus club
   // metadata and, later, its cups) — every derived map below fans out for
   // free. `econ` is the per-division money multiplier (lower leagues are far
   // poorer). Only the country you manage in carries real player squads; every
   // other country's clubs are strength-only (see state.js / match.js).
   const LEAGUE_REGISTRY = [
     { code: "PL", name: "Premier League",   short: "Prem",    country: "ENG", econ: 1 },
     { code: "CH", name: "Championship",     short: "Champ",   country: "ENG", econ: 1 },
     { code: "L1", name: "League One",       short: "Lg 1",    country: "ENG", econ: 0.4 },
     { code: "L2", name: "League Two",       short: "Lg 2",    country: "ENG", econ: 0.18 },
     { code: "LL", name: "La Liga",          short: "La Liga", country: "ESP", econ: 1 },
     { code: "SG", name: "Segunda División", short: "Segunda", country: "ESP", econ: 0.6 },
     { code: "PRF", name: "Primera Federación", short: "Primera Fed", country: "ESP", econ: 0.35 },
     { code: "SGF", name: "Segunda Federación", short: "Segunda Fed", country: "ESP", econ: 0.15 },
     { code: "BL1", name: "Bundesliga",        short: "Bundesliga", country: "GER", econ: 1 },
     { code: "BL2", name: "2. Bundesliga",     short: "2.Bundesliga", country: "GER", econ: 0.55 },
     { code: "BL3", name: "3. Liga",           short: "3. Liga",    country: "GER", econ: 0.35 },
     { code: "BL4", name: "Regionalliga",      short: "Regionalliga", country: "GER", econ: 0.15 },
     { code: "SA",  name: "Serie A",           short: "Serie A",    country: "ITA", econ: 1 },
     { code: "SB",  name: "Serie B",           short: "Serie B",    country: "ITA", econ: 0.55 },
     { code: "SEC", name: "Serie C",           short: "Serie C",    country: "ITA", econ: 0.35 },
     { code: "SED", name: "Serie D",           short: "Serie D",    country: "ITA", econ: 0.15 },
     { code: "FL1", name: "Ligue 1",           short: "Ligue 1",    country: "FRA", econ: 1 },
     { code: "FL2", name: "Ligue 2",           short: "Ligue 2",    country: "FRA", econ: 0.5 },
     { code: "FN1", name: "National",          short: "National",   country: "FRA", econ: 0.3 },
     { code: "FN2", name: "National 2",        short: "National 2", country: "FRA", econ: 0.15 },
     { code: "PP",  name: "Primeira Liga",     short: "Primeira",   country: "POR", econ: 0.8 },
     { code: "P2",  name: "Liga Portugal 2",   short: "Liga 2",     country: "POR", econ: 0.4 },
     { code: "ER",  name: "Eredivisie",        short: "Eredivisie", country: "NED", econ: 0.8 },
     { code: "EE",  name: "Eerste Divisie",    short: "Eerste",     country: "NED", econ: 0.4 },
     { code: "EK",  name: "Ekstraklasa",       short: "Ekstraklasa",country: "POL", econ: 0.55 },
     { code: "IL",  name: "I liga",            short: "I liga",     country: "POL", econ: 0.28 },
     { code: "SL",  name: "Süper Lig",         short: "Süper Lig",  country: "TUR", econ: 0.7 },
     { code: "T1",  name: "1. Lig",            short: "1. Lig",     country: "TUR", econ: 0.35 },
     // Championship/relegation-split nations (Phase 4).
     { code: "BPL", name: "Belgian Pro League", short: "Pro League", country: "BEL", econ: 0.6,  format: { split: { groups: [8, 8], legs: 1, points: "halveUp" } } },
     { code: "BCH", name: "Challenger Pro League", short: "Challenger", country: "BEL", econ: 0.3 },
     { code: "ABL", name: "Austrian Bundesliga", short: "A-Bundesliga", country: "AUT", econ: 0.55, format: { split: { groups: [6, 6], legs: 1, points: "halveDown" } } },
     { code: "A2L", name: "2. Liga",            short: "2. Liga",    country: "AUT", econ: 0.28 },
     { code: "DSL", name: "Superliga",          short: "Superliga",  country: "DEN", econ: 0.6,  format: { split: { groups: [6, 6], legs: 1, points: "carry" } } },
     { code: "D1D", name: "1. Division",        short: "1. Division", country: "DEN", econ: 0.3 },
     { code: "GSL", name: "Super League",       short: "Super League", country: "GRE", econ: 0.5, format: { split: { groups: [7, 7], legs: 1, points: "carry" } } },
     { code: "GS2", name: "Super League 2",     short: "Super Lg 2", country: "GRE", econ: 0.25 },
     // N-times round-robin nations (Phase 5).
     { code: "SPL", name: "Scottish Premiership", short: "Premiership", country: "SCO", econ: 0.6, format: { rounds: 3, split: { groups: [6, 6], legs: 1, points: "carry" } } },
     { code: "SC2", name: "Scottish Championship", short: "Championship", country: "SCO", econ: 0.3, format: { rounds: 4 } },
     { code: "SSL", name: "Swiss Super League",  short: "Super League", country: "SUI", econ: 0.6, format: { rounds: 3, split: { groups: [6, 6], legs: 1, points: "carry" } } },
     { code: "SCL", name: "Challenge League",    short: "Challenge", country: "SUI", econ: 0.3, format: { rounds: 4 } },
     { code: "HNL", name: "SuperSport HNL",      short: "HNL",       country: "CRO", econ: 0.4, format: { rounds: 4 } },
     { code: "HN2", name: "Prva NL",             short: "Prva NL",   country: "CRO", econ: 0.2 },
     { code: "NB1", name: "Nemzeti Bajnokság I", short: "NB I",      country: "HUN", econ: 0.4, format: { rounds: 3 } },
     { code: "NB2", name: "Nemzeti Bajnokság II", short: "NB II",    country: "HUN", econ: 0.2 },
     // Batch 2 nations.
     { code: "CZ1", name: "Chance Liga",        short: "Chance Liga", country: "CZE", econ: 0.5, format: { split: { groups: [8, 8], legs: 1, points: "carry" } } },
     { code: "CZ2", name: "Národní Liga",       short: "FNL",        country: "CZE", econ: 0.22 },
     { code: "SR1", name: "SuperLiga",          short: "SuperLiga",  country: "SRB", econ: 0.45, format: { split: { groups: [8, 8], legs: 1, points: "carry" } } },
     { code: "SR2", name: "Prva Liga",          short: "Prva Liga",  country: "SRB", econ: 0.2 },
     { code: "UA1", name: "Ukrainian Premier League", short: "UPL",  country: "UKR", econ: 0.5, format: { split: { groups: [8, 8], legs: 1, points: "carry" } } },
     { code: "UA2", name: "Persha Liha",        short: "Persha Liha", country: "UKR", econ: 0.22 },
     { code: "SE1", name: "Allsvenskan",        short: "Allsvenskan", country: "SWE", econ: 0.5 },
     { code: "SE2", name: "Superettan",         short: "Superettan", country: "SWE", econ: 0.25 },
     { code: "NO1", name: "Eliteserien",        short: "Eliteserien", country: "NOR", econ: 0.5 },
     { code: "NO2", name: "OBOS-ligaen",        short: "OBOS",       country: "NOR", econ: 0.25 },
     { code: "RO1", name: "SuperLiga",          short: "Liga I",     country: "ROU", econ: 0.45, format: { split: { groups: [8, 8], legs: 1, points: "halveDown" } } },
     { code: "RO2", name: "Liga II",            short: "Liga II",    country: "ROU", econ: 0.2 },
     { code: "CY1", name: "First Division",     short: "First Div",  country: "CYP", econ: 0.45, format: { split: { groups: [7, 7], legs: 1, points: "carry" } } },
     { code: "CY2", name: "Second Division",    short: "Second Div", country: "CYP", econ: 0.2 },
     { code: "SK1", name: "Niké Liga",          short: "Niké Liga",  country: "SVK", econ: 0.4, format: { split: { groups: [6, 6], legs: 1, points: "carry" } } },
     { code: "SK2", name: "2. Liga",            short: "2. Liga",    country: "SVK", econ: 0.2 },
     // Batch 3 — all remaining UEFA nations.
     { code: "SN1", name: "PrvaLiga",           short: "PrvaLiga",   country: "SVN", econ: 0.35, format: { rounds: 4 } },
     { code: "SN2", name: "2. SNL",             short: "2. SNL",     country: "SVN", econ: 0.15 },
     { code: "IS1", name: "Ligat ha'Al",        short: "Ligat ha'Al", country: "ISR", econ: 0.4, format: { split: { groups: [7, 7], legs: 1, points: "carry" } } },
     { code: "IS2", name: "Liga Leumit",        short: "Leumit",     country: "ISR", econ: 0.18 },
     { code: "FI1", name: "Veikkausliiga",      short: "Veikkausliiga", country: "FIN", econ: 0.35, format: { split: { groups: [6, 6], legs: 1, points: "carry" } } },
     { code: "FI2", name: "Ykkösliiga",         short: "Ykkösliiga", country: "FIN", econ: 0.15 },
     { code: "BG1", name: "Parva Liga",         short: "Parva Liga", country: "BUL", econ: 0.4, format: { split: { groups: [8, 8], legs: 1, points: "carry" } } },
     { code: "BG2", name: "Vtora Liga",         short: "Vtora Liga", country: "BUL", econ: 0.18 },
     { code: "BA1", name: "Premijer Liga",      short: "Premijer",   country: "BIH", econ: 0.35 },
     { code: "BA2", name: "Prva Liga",          short: "Prva Liga",  country: "BIH", econ: 0.15 },
     { code: "IC1", name: "Besta deild",        short: "Besta deild", country: "ISL", econ: 0.3, format: { split: { groups: [6, 6], legs: 1, points: "carry" } } },
     { code: "IC2", name: "1. deild",           short: "1. deild",   country: "ISL", econ: 0.13 },
     { code: "IE1", name: "Premier Division",   short: "Premier Div", country: "IRL", econ: 0.35, format: { rounds: 4 } },
     { code: "IE2", name: "First Division",     short: "First Div",  country: "IRL", econ: 0.15, format: { rounds: 4 } },
     { code: "AL1", name: "Kategoria Superiore", short: "Superiore", country: "ALB", econ: 0.3, format: { rounds: 4 } },
     { code: "AL2", name: "Kategoria e Parë",   short: "e Parë",     country: "ALB", econ: 0.13 },
     { code: "MK1", name: "Prva Liga",          short: "Prva Liga",  country: "MKD", econ: 0.3, format: { rounds: 3 } },
     { code: "MK2", name: "Vtora Liga",         short: "Vtora Liga", country: "MKD", econ: 0.13 },
     { code: "MD1", name: "Super Liga",         short: "Super Liga", country: "MDA", econ: 0.3 },
     { code: "MD2", name: "Liga 1",             short: "Liga 1",     country: "MDA", econ: 0.13 },
     { code: "BY1", name: "Vysshaya Liga",      short: "Vysshaya",   country: "BLR", econ: 0.35 },
     { code: "BY2", name: "Pershaya Liga",      short: "Pershaya",   country: "BLR", econ: 0.15 },
     { code: "AZ1", name: "Premier Liqası",     short: "Premier Liq", country: "AZE", econ: 0.35, format: { rounds: 4 } },
     { code: "AZ2", name: "Birinci Dəstə",      short: "Birinci",    country: "AZE", econ: 0.15 },
     { code: "KZ1", name: "Premier League",     short: "Premier Lg", country: "KAZ", econ: 0.35 },
     { code: "KZ2", name: "First League",       short: "First Lg",   country: "KAZ", econ: 0.15 },
     { code: "GE1", name: "Erovnuli Liga",      short: "Erovnuli",   country: "GEO", econ: 0.3, format: { rounds: 4 } },
     { code: "GE2", name: "Erovnuli Liga 2",    short: "Liga 2",     country: "GEO", econ: 0.13, format: { rounds: 4 } },
     { code: "AM1", name: "Bardz. Khumb",       short: "Premier Lg", country: "ARM", econ: 0.3, format: { rounds: 4 } },
     { code: "AM2", name: "Aradzin Khumb",      short: "First Lg",   country: "ARM", econ: 0.13 },
     { code: "LV1", name: "Virslīga",           short: "Virslīga",   country: "LVA", econ: 0.3, format: { rounds: 4 } },
     { code: "LV2", name: "1. līga",            short: "1. līga",    country: "LVA", econ: 0.13 },
     { code: "LT1", name: "A Lyga",             short: "A Lyga",     country: "LTU", econ: 0.3, format: { rounds: 4 } },
     { code: "LT2", name: "I Lyga",             short: "I Lyga",     country: "LTU", econ: 0.13 },
     { code: "XK1", name: "Superliga",          short: "Superliga",  country: "KVX", econ: 0.3, format: { rounds: 4 } },
     { code: "XK2", name: "Liga e Parë",        short: "e Parë",     country: "KVX", econ: 0.13 },
     { code: "ME1", name: "Prva CFL",           short: "Prva CFL",   country: "MNE", econ: 0.3, format: { rounds: 4 } },
     { code: "ME2", name: "Druga CFL",          short: "Druga CFL",  country: "MNE", econ: 0.13 },
     { code: "ET1", name: "Meistriliiga",       short: "Meistriliiga", country: "EST", econ: 0.3, format: { rounds: 4 } },
     { code: "ET2", name: "Esiliiga",           short: "Esiliiga",   country: "EST", econ: 0.13, format: { rounds: 4 } },
     { code: "LU1", name: "National Division",  short: "National Div", country: "LUX", econ: 0.3 },
     { code: "LU2", name: "Promotion d'Honneur", short: "Promotion", country: "LUX", econ: 0.13 },
     { code: "NI1", name: "NIFL Premiership",   short: "Premiership", country: "NIR", econ: 0.35, format: { rounds: 3, split: { groups: [6, 6], legs: 1, points: "carry" } } },
     { code: "NI2", name: "NIFL Championship",  short: "Championship", country: "NIR", econ: 0.15 },
     { code: "MT1", name: "Premier League",     short: "Premier Lg", country: "MLT", econ: 0.3 },
     { code: "MT2", name: "Challenge League",   short: "Challenge",  country: "MLT", econ: 0.13 },
     { code: "FO1", name: "Betri deildin",      short: "Betri deildin", country: "FRO", econ: 0.28, format: { rounds: 3 } },
     { code: "FO2", name: "1. deild",           short: "1. deild",   country: "FRO", econ: 0.12 },
     { code: "WA1", name: "Cymru Premier",      short: "Cymru Premier", country: "WAL", econ: 0.3, format: { split: { groups: [6, 6], legs: 1, points: "carry" } } },
     { code: "WA2", name: "Cymru North",        short: "Cymru North", country: "WAL", econ: 0.12 },
     { code: "GI1", name: "Gibraltar Football League", short: "GFL", country: "GIB", econ: 0.25 },
     { code: "GI2", name: "Intermediate League", short: "Intermediate", country: "GIB", econ: 0.1 },
     { code: "AD1", name: "Primera Divisió",    short: "Primera Div", country: "AND", econ: 0.25, format: { rounds: 3 } },
     { code: "AD2", name: "Segona Divisió",     short: "Segona Div", country: "AND", econ: 0.1 },
     { code: "SM1", name: "Campionato Sammarinese", short: "Campionato", country: "SMR", econ: 0.2 },
   ];
   const COUNTRY_NAMES = {
     ENG: "England", ESP: "Spain", GER: "Germany", ITA: "Italy", FRA: "France",
     POR: "Portugal", NED: "Netherlands", POL: "Poland", TUR: "Turkey",
     BEL: "Belgium", AUT: "Austria", DEN: "Denmark", GRE: "Greece",
     SCO: "Scotland", SUI: "Switzerland", CRO: "Croatia", HUN: "Hungary",
     CZE: "Czechia", SRB: "Serbia", UKR: "Ukraine", SWE: "Sweden",
     NOR: "Norway", ROU: "Romania", CYP: "Cyprus", SVK: "Slovakia",
     SVN: "Slovenia", ISR: "Israel", FIN: "Finland", BUL: "Bulgaria",
     BIH: "Bosnia & Herz.", ISL: "Iceland", IRL: "Ireland", ALB: "Albania",
     MKD: "North Macedonia", MDA: "Moldova", BLR: "Belarus", AZE: "Azerbaijan",
     KAZ: "Kazakhstan", GEO: "Georgia", ARM: "Armenia", LVA: "Latvia",
     LTU: "Lithuania", KVX: "Kosovo", MNE: "Montenegro", EST: "Estonia",
     LUX: "Luxembourg", NIR: "N. Ireland", MLT: "Malta", FRO: "Faroe Islands",
     WAL: "Wales", GIB: "Gibraltar", AND: "Andorra", SMR: "San Marino",
   };

   const LEAGUES        = LEAGUE_REGISTRY.map(l => l.code);
   const LEAGUE_NAMES   = Object.fromEntries(LEAGUE_REGISTRY.map(l => [l.code, l.name]));
   const LEAGUE_SHORT   = Object.fromEntries(LEAGUE_REGISTRY.map(l => [l.code, l.short]));
   const LEAGUE_ECON    = Object.fromEntries(LEAGUE_REGISTRY.map(l => [l.code, l.econ]));
   const LEAGUE_COUNTRY = Object.fromEntries(LEAGUE_REGISTRY.map(l => [l.code, l.country]));
   // Optional per-league format (championship/relegation split etc.); most
   // leagues have none (a plain double round-robin).
   const LEAGUE_FORMAT = Object.fromEntries(LEAGUE_REGISTRY.filter(l => l.format).map(l => [l.code, l.format]));
   function leagueFormat(league) { return LEAGUE_FORMAT[league] || null; }
   // Countries in registry order; each country's chain is its leagues top-down.
   const COUNTRIES = [...new Set(LEAGUE_REGISTRY.map(l => l.country))];
   const LEAGUE_CHAINS = COUNTRIES.reduce((acc, co) => {
     acc[co] = LEAGUE_REGISTRY.filter(l => l.country === co).map(l => l.code);
     return acc;
   }, {});
   function chainFor(league) { return LEAGUE_CHAINS[LEAGUE_COUNTRY[league]] || LEAGUE_CHAINS[COUNTRIES[0]]; }

   // Baseline XI strength for a strength-only (foreign) club at a given
   // reputation tier — anchored to the same scale Dynamics gravitates rivals
   // toward, with a touch of jitter so a division isn't perfectly uniform.
   function baseStrengthForTier(tier) {
     const base = { 5: 84, 4: 79, 3: 74, 2: 69, 1: 64, 0: 59 }[tier] ?? 66;
     return Math.max(45, Math.min(90, base + Math.floor(Math.random() * 5) - 2));
   }

   const POSITIONS = ["GK", "DF", "MF", "FW"];
   
   // Formation definitions: required counts per outfield role group.
   const FORMATIONS = {
     "4-4-2": { GK: 1, DF: 4, MF: 4, FW: 2 },
     "4-3-3": { GK: 1, DF: 4, MF: 3, FW: 3 },
     "4-2-3-1": { GK: 1, DF: 4, MF: 5, FW: 1 },
     "3-5-2": { GK: 1, DF: 3, MF: 5, FW: 2 },
     "5-3-2": { GK: 1, DF: 5, MF: 3, FW: 2 },
     "4-5-1": { GK: 1, DF: 4, MF: 5, FW: 1 },
   };
   
   // Pitch coordinate presets (percent of pitch width/height) for each formation,
   // used to lay starters out visually on the tactics board.
   const FORMATION_LAYOUT = {
     "4-4-2": [
       [50,92],
       [18,72],[38,75],[62,75],[82,72],
       [16,48],[38,52],[62,52],[84,48],
       [38,22],[62,22],
     ],
     "4-3-3": [
       [50,92],
       [18,72],[38,75],[62,75],[82,72],
       [30,50],[50,55],[70,50],
       [22,22],[50,18],[78,22],
     ],
     "4-2-3-1": [
       [50,92],
       [18,72],[38,75],[62,75],[82,72],
       [38,58],[62,58],
       [22,32],[50,28],[78,32],
       [50,14],
     ],
     "3-5-2": [
       [50,92],
       [28,74],[50,78],[72,74],
       [12,50],[34,52],[50,56],[66,52],[88,50],
       [38,22],[62,22],
     ],
     "5-3-2": [
       [50,92],
       [10,68],[28,74],[50,78],[72,74],[90,68],
       [32,48],[50,52],[68,48],
       [38,22],[62,22],
     ],
     "4-5-1": [
       [50,92],
       [18,72],[38,75],[62,75],[82,72],
       [12,48],[32,52],[50,56],[68,52],[88,48],
       [50,18],
     ],
   };
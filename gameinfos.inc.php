<?php

$gameinfos = array( 


// Game designer (or game designers, separated by commas)
'designer' => 'David G. Royffe',       

// Game artist (or game artists, separated by commas)
'artist' => '',         

// Year of FIRST publication of this game. Can be negative.
'year' => 1994,                 

// Game publisher
'publisher' => 'Gigamic',                     

// Url of game publisher website
'publisher_website' => 'http://www.gigamic.com',   

// Board Game Geek ID of the publisher
'publisher_bgg_id' => 155,

// Board game geek if of the game
'bgg_id' => 1419,


// Players configuration that can be played (ex: 2 to 4 players)
'players' => array( 2 ),    

// Suggest players to play with this number of players. Must be null if there is no such advice, or if there is only one possible player configuration.
'suggest_player_number' => null,

// Discourage players to play with this number of players. Must be null if there is no such advice.
'not_recommend_player_number' => array( ),



// Estimated game duration, in minutes (used only for the launch, afterward the real duration is computed)
'estimated_duration' => 8,           

// Time in second add to a player when "giveExtraTime" is called (speed profile = fast)
'fast_additional_time' => 15,           

// Time in second add to a player when "giveExtraTime" is called (speed profile = medium)
'medium_additional_time' => 25,           

// Time in second add to a player when "giveExtraTime" is called (speed profile = slow)
'slow_additional_time' => 40,           


// Game is "beta". A game MUST set is_beta=1 when published on BGA for the first time, and must remains like this until all bugs are fixed.
'is_beta' => 1,                     

// Is this game cooperative (all players wins together or loose together)
'is_coop' => 0, 


// Complexity of the game, from 0 (extremely simple) to 5 (extremely complex)
'complexity' => 2,    

// Luck of the game, from 0 (absolutely no luck in this game) to 5 (totally luck driven)
'luck' => 0,    

// Strategy of the game, from 0 (no strategy can be setup) to 5 (totally based on strategy)
'strategy' => 4,    

// Diplomacy of the game, from 0 (no interaction in this game) to 5 (totally based on interaction and discussion between players)
'diplomacy' => 0,    


// Games categories
//  You can attribute any number of "tags" to your game.
//  Each tag has a specific ID (ex: 22 for the category "Prototype", 101 for the tag "Science-fiction theme game")
'tags' => array( 1 )
);

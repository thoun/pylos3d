<?php
/**
 *------
 * BGA framework: Âc Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Pylos implementation : Âc Stanislav Stepanenko <stst75@inbox.ru>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * material.inc.php
 *
 * Pylos game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */


/*

Example:

$this->card_types = array(
    1 => array( "card_name" => ...,
                ...
              )
);

*/

$this->gameConstants = array(
        "LIGHT_COLOR" => "f19a00",
        "DARK_COLOR" => "3d1303",

		"BALL_WIDTH" => 80,
		"BALL_HEIGHT" => 80,
		"POS_SELECTION_WIDTH" => 55,
		"POS_SELECTION_HEIGHT" => 55,

		"POSITION_X0_Z0" => 172, // Position center with coordinates: X0, Y0...3, Z0
        "POSITION_X1_Z0" => 266, // Position center with coordinates: X1, Y0...3, Z0
        "POSITION_X2_Z0" => 359, // Position center with coordinates: X2, Y0...3, Z0
        "POSITION_X3_Z0" => 452, // Position center with coordinates: X3, Y0...3, Z0

        "POSITION_Y0_Z0" => 447, // Position center with coordinates: X0...3, Y0, Z0
        "POSITION_Y1_Z0" => 354, // Position center with coordinates: X0...3, Y1, Z0
        "POSITION_Y2_Z0" => 260, // Position center with coordinates: X0...3, Y2, Z0
        "POSITION_Y3_Z0" => 167, // Position center with coordinates: X0...3, Y3, Z0

        "POSITION_X0_Z1" => 218, // Position center with coordinates: X0, Y0...2, Z1
        "POSITION_X1_Z1" => 313, // Position center with coordinates: X1, Y0...2, Z1
        "POSITION_X2_Z1" => 406, // Position center with coordinates: X2, Y0...2, Z1

        "POSITION_Y0_Z1" => 400, // Position center with coordinates: X0...2, Y0, Z1
        "POSITION_Y1_Z1" => 307, // Position center with coordinates: X0...2, Y1, Z1
        "POSITION_Y2_Z1" => 213, // Position center with coordinates: X0...2, Y2, Z1

        "POSITION_X0_Z2" => 266, // Position center with coordinates: X0, Y0...1, Z2
        "POSITION_X1_Z2" => 359, // Position center with coordinates: X1, Y0...1, Z2

        "POSITION_Y0_Z2" => 354, // Position center with coordinates: X0...1, Y0, Z2
        "POSITION_Y1_Z2" => 260, // Position center with coordinates: X0...1, Y1, Z2

        "POSITION_X0_Z3" => 313, // Position center with coordinates: X0, Y0, Z3
        "POSITION_Y0_Z3" => 307, // Position center with coordinates: X0, Y0, Z3

        "POS_BOUNDED_X1_Y1_Z0" => 'pos_selection_0_0_2', // Bouded positions
        "POS_BOUNDED_X2_Y1_Z0" => 'pos_selection_1_0_2',
        "POS_BOUNDED_X1_Y2_Z0" => 'pos_selection_0_1_2',
        "POS_BOUNDED_X2_Y2_Z0" => 'pos_selection_1_1_2',

        "POS_BOUNDED_X0_Y0_Z2" => 'pos_selection_1_1_0',
        "POS_BOUNDED_X1_Y0_Z2" => 'pos_selection_2_1_0',
        "POS_BOUNDED_X0_Y1_Z2" => 'pos_selection_1_2_0',
        "POS_BOUNDED_X1_Y1_Z2" => 'pos_selection_2_2_0',

        "POS_BOUNDED_X1_Y1_Z1" => 'pos_selection_0_0_3',

        "POS_BOUNDED_X0_Y0_Z3" => 'pos_selection_1_1_1',

        "BALL_FROM_RESERVE" => 5 // Ball from reserve
);

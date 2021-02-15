<?php
 /**
  *------
  * BGA framework: �c Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
  * Pylos implementation : �c Stanislav Stepanenko <stst75@inbox.ru>
  *
  * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
  * See http://en.boardgamearena.com/#!doc/Studio for more information.
  * -----
  *
  * pylos.game.php
  *
  * This is the main file for your game logic.
  *
  * In this PHP file, you are going to defines the rules of the game.
  *
  */


require_once( APP_GAMEMODULE_PATH.'module/table/table.game.php' );

// Local constants
define( "VARIANT_GAME_SQUARE", 1 );
define( "VARIANT_GAME_SQUARE_LINE", 2 );
define( "VARIANT_GAME_SIMPLE", 3 );

class PylosD extends Table
{
	function __construct( )
	{


        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();self::initGameStateLabels( array(
                  "end_of_game" => 10,
            //    "my_second_global_variable" => 11,
            //      ...
                  "game_variant" => 100,
            //    "my_second_game_variant" => 101,
            //      ...
        ) );
	}

    protected function getGameName( )
    {
        return "pylosd";
    }

    /*
        setupNewGame:

        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
    protected function setupNewGame( $players, $options = array() )
    {
        $sql = "DELETE FROM player WHERE 1 ";
        self::DbQuery( $sql );

        // Set the colors of the players with HTML color code
        // The default is red/green/blue/yellow
        // The number of colors defined here must correspond to the maximum number of players allowed for the game
        $light_color = $this->gameConstants["LIGHT_COLOR"];
        $dark_color = $this->gameConstants["DARK_COLOR"];
        $default_colors = array( $light_color, $dark_color, ); // light, dark colors

        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = array();
        foreach( $players as $player_id => $player )
        {
            $color = array_shift( $default_colors );
            $values[] = "('".$player_id."','$color','".$player['player_canal']."','".addslashes( $player['player_name'] )."','".addslashes( $player['player_avatar'] )."')";
        }
        $sql .= implode( $values, ',' );
        self::DbQuery( $sql );
        self::reloadPlayersBasicInfos();

        //************ Start the game initialization *****

        // Init global values with their initial values
        // Example:
        // self::setGameStateInitialValue( 'my_first_global_variable', 0 );
        self::setGameStateInitialValue( 'end_of_game', 0 );

        // Init game statistics
        // (note: statistics used in this file must be defined in your stats.inc.php file)
        // Examples:
        //self::initStat( 'table', 'table_teststat1', 0 );    // Init a table statistics
        //self::initStat( 'player', 'player_teststat1', 0 );  // Init a player statistics (for all players)
        self::initStat( 'player', 'ballsRemained', 15 );
        self::initStat( 'player', 'ballsReturned', 0 );
        self::initStat( 'player', 'ballsMovedUp', 0 );
        self::initStat( 'player', 'numberOfSquares', 0 );
        self::initStat( 'player', 'numberOfLines', 0 );

        // Insert (empty) positions into database
        $sql = "INSERT INTO position (coord_x, coord_y, coord_z) VALUES ";
        $values = array();
        for ($z = 0; $z < 4; $z++) {
            for ($y = 0; $y < 4-$z; $y++) {
                for ($x = 0; $x < 4-$z; $x++) {
            	    $values[] = "($x, $y, $z)";
                }
            }
        }
        $sql .= implode( $values, ',' );
        self::DbQuery( $sql );

        // Active first player (which is in general a good idea :) )

        // Light plays first
        $sql = "SELECT player_id, player_name FROM player WHERE player_color = '$light_color' ";
        $light_player = self::getNonEmptyObjectFromDb( $sql );

        $this->gamestate->changeActivePlayer( $light_player['player_id'] );

        /************ End of the game initialization *****/
    }


    /*
        getAllDatas:

        Gather all informations about current game situation (visible by the current player).

        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
    */
    protected function getAllDatas()
    {
        $result = array( 'players' => array() );

        $current_player_id = self::getCurrentPlayerId();    // !! We must only return informations visible by this player !!

        // Get information about players
        // Note: you can retrieve some extra fields you added for "player" table in "dbmodel.sql" if you need them.
        $sql = "SELECT player_id id, player_score score FROM player ";
        $result['players'] = self::getCollectionFromDb( $sql );

        // Gather all informations about current game situation (visible by player $current_player_id).

        // Positions
        $sql = "SELECT id, coord_x, coord_y, coord_z,
                    case when ball_color is null then
                        null
                    else
                        case when ball_color = 'l' then 'light' else 'dark' end
                    end ball_color
                FROM position ";


        $result['positions'] = self::getCollectionFromDb( $sql );

        // Constants
        $result['constants'] = $this->gameConstants;

        // Counters
        $result['counters'] = $this->getGameCounters();

        return $result;
    }

    /*
        getGameCounters:

        Gather all relevant counters about current game situation (visible by the current player).
    */
    function getGameCounters() {
        $light_color = $this->gameConstants["LIGHT_COLOR"];
    	$sql = "
    		SELECT
    			concat('ballcount_p', cast(p.player_id as char)) counter_name, 15 - count(id) counter_value
    		FROM (select player_id, case when player_color = '$light_color' then 'l' else 'd' end player_color FROM player) p
    		LEFT JOIN position ps on ps.ball_color = p.player_color
    		GROUP BY p.player_color, p.player_id
    		   ";

    	return self::getNonEmptyCollectionFromDB( $sql );
    }

    /*
        getGameProgression:

        Compute and return the current game progression.
        The number returned must be an integer beween 0 (=the game just started) and
        100 (= the game is finished or almost finished).

        This method is called each time we are in a game state with "updateGameProgression" property (see states.inc.php)
    */
    function getGameProgression()
    {
        // Compute and return the game progression
        $sql = "SELECT round(100 * count(id) / 30 ) as value from position WHERE ball_color is not null";
    	$counter = self::getNonEmptyObjectFromDB( $sql );

        return $counter['value'];
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////

    /*
        In this space, you can put any utility methods useful for your game logic
    */

    function getPlayerScores()
    {
        $sql = "SELECT player_id id, player_score score FROM player";
        return self::getCollectionFromDb( $sql );
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Player actions
////////////

    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in pylos.action.php)
    */

    /*

    Example:

    function playCard( $card_id )
    {
        // Check that this is the player's turn and that it is a "possible action" at this game state (see states.inc.php)
        self::checkAction( 'playCard' );

        $player_id = self::getActivePlayerId();

        // Add your game logic to play a card there
        ...

        // Notify all players about the card played
        self::notifyAllPlayers( "cardPlayed", clienttranslate( '${player_name} played ${card_name}', array(
            'player_id' => $player_id,
            'player_name' => self::getActivePlayerName(),
            'card_name' => $card_name,
            'card_id' => $card_id
        ) );

    }

    */

    function playBall( $ball_coord_x, $ball_coord_y, $ball_coord_z, $pos_coord_x, $pos_coord_y, $pos_coord_z )
    {
        // Check that this is player's turn and that it is a "possible action" at this game state (see states.inc.php)
        self::checkAction( 'playBall' );

        $player_id = self::getActivePlayerId();

        // Get player color
        $color = self::getPlayerColor( $player_id );

        // Check that this positon is free
        $sql = "SELECT
                    id, coord_x, coord_y, coord_z
                FROM
                    position
                WHERE
                    coord_x = $pos_coord_x
                    AND coord_y = $pos_coord_y
                    AND coord_z = $pos_coord_z
                    AND ball_color is null
               ";
        $position = self::getObjectFromDb( $sql );

        if ($position == null) {
            throw new BgaUserException( self::_("There is already a ball on this position, you can't play there") );
        }

        $reserve = $this->gameConstants["BALL_FROM_RESERVE"];

        if ($ball_coord_x != $reserve && $ball_coord_y != $reserve && $ball_coord_z != $reserve) {
            // Check that ball on the board (if ball on the board to moves up)
            $sql = "SELECT
                id, coord_x, coord_y, coord_z
            FROM
                position
            WHERE
                coord_x = $ball_coord_x
                AND coord_y = $ball_coord_y
                AND coord_z = $ball_coord_z
                AND ball_color = '$color'
              ";
            $ball = self::getObjectFromDb( $sql );

            if ($ball == null) {
                throw new BgaUserException( self::_("There is no ball on the board") );
            }
            if ($pos_coord_z <= $ball_coord_z) {
                throw new BgaUserException( self::_("The position is not available for moving the ball, you can't play there") );
            }
        }

        if ($ball_coord_x == $reserve && $ball_coord_y == $reserve && $ball_coord_z == $reserve) {
            $sql = "SELECT count(id) as value FROM position WHERE ball_color = '$color'";
    	    $counter = self::getNonEmptyObjectFromDB( $sql );
    	    if ($counter['value'] >= 15)
    	        throw new BgaUserException( self::_("There are no balls in the reserve") );
        }

        if ($pos_coord_z > 0) {
            // Check that ball is placing on the square of the balls (if level > 0)
            if (!self::checkBallOnSquare($pos_coord_x, $pos_coord_y, $pos_coord_z)) {
                throw new BgaUserException( self::_("The position is not available for placing the ball, you can't play there") );
            }
        }

        // Update the position with a ball of the appropriate color (installed new ball always is up balls count = 0)
        $position_id = $position['id'];
        $sql = "UPDATE
                    position
                SET
                    ball_color = '$color',
                    up_balls_cnt = 0
                WHERE
                    id = $position_id
               ";
        self::DbQuery($sql);

        // Increment up balls count for 4 balls (on these balls set this ball)
        self::incrementUpBallsCount(1, $pos_coord_x, $pos_coord_y, $pos_coord_z);

        // Increment down balls count for 4 positions (these positions on this ball)
        self::incrementDownBallsCount(1, $pos_coord_x, $pos_coord_y, $pos_coord_z);

        if ($ball_coord_x != $reserve && $ball_coord_y != $reserve && $ball_coord_z != $reserve) {
            // Remove ball (if ball on the board to moves up)
            $position_id = $ball['id'];
            $sql = "UPDATE
                        position
                    SET
                        ball_color = null,
                        up_balls_cnt = 0
                    WHERE
                        id = $position_id
                   ";
            self::DbQuery($sql);

            // Decrement up balls count
            self::incrementUpBallsCount(-1, $ball_coord_x, $ball_coord_y, $ball_coord_z);

            // Decrement down balls count
            self::incrementDownBallsCount(-1, $ball_coord_x, $ball_coord_y, $ball_coord_z);
        }

        if ($ball_coord_x == $reserve && $ball_coord_y == $reserve && $ball_coord_z == $reserve) {
            // Statistics
    	    self::incStat( -1, 'ballsRemained', $player_id );

            // Notify all players
            self::notifyAllPlayers( "ballPlaced", clienttranslate( '${player_name} places a ball ${coordinates}' ), array(
               'player_id' => $player_id,
               'player_name' => self::getActivePlayerName(),
               'coordinates' => $this->getFormattedCoordinates($pos_coord_x, $pos_coord_y, $pos_coord_z),
               'coord_x' => $pos_coord_x,
               'coord_y' => $pos_coord_y,
               'coord_z' => $pos_coord_z,
               'color' => $color == 'l' ? 'light':'dark',
               'counters' => $this->getGameCounters()
           ) );
        }
        else
        {
            // Statistics
    	    self::incStat( 1, 'ballsMovedUp', $player_id );

            // Notify all players
            self::notifyAllPlayers( "ballMovedUp", clienttranslate( '${player_name} moves up a ball from ${from_coordinates} to ${to_coordinates}' ), array(
                'player_id' => $player_id,
                'player_name' => self::getActivePlayerName(),
                'from_coordinates' => $this->getFormattedCoordinates($ball_coord_x, $ball_coord_y, $ball_coord_z),
                'to_coordinates' => $this->getFormattedCoordinates($pos_coord_x, $pos_coord_y, $pos_coord_z),
                'from_coord_x' => $ball_coord_x,
                'from_coord_y' => $ball_coord_y,
                'from_coord_z' => $ball_coord_z,
                'to_coord_x' => $pos_coord_x,
                'to_coord_y' => $pos_coord_y,
                'to_coord_z' => $pos_coord_z,
                'color' => $color == 'l' ? 'light':'dark',
                'counters' => $this->getGameCounters()
        ) );
        }

        $squareOrLineIsPresent = false;

        if (self::getGameStateValue('game_variant') == VARIANT_GAME_SQUARE ||
            self::getGameStateValue('game_variant') == VARIANT_GAME_SQUARE_LINE)
        {
            // Check that the square of the player's balls is present
            if (self::checkPlayerSquareOfBallsIsPresent($pos_coord_x, $pos_coord_y, $pos_coord_z, $color)) {
                // Statistics
    	        self::incStat( 1, 'numberOfSquares', $player_id );

                // Notify all players
                self::notifyAllPlayers( "squareMade", clienttranslate( '${player_name} makes a square of his balls' ),
                                        array( 'player_name' => self::getActivePlayerName() ) );

                $squareOrLineIsPresent = true;
            }

            if (self::getGameStateValue('game_variant') == VARIANT_GAME_SQUARE_LINE /*&& !$squareOrLineIsPresent*/) {
                // Check that the line of the player's balls is present

                // Horizontal line on level 0 (z=0) or level 1 (z=1)
                if (self::checkPlayerHorzLineOfBallsIsPresent($pos_coord_y, $pos_coord_z, $color)) {
                    // Statistics
    	            self::incStat( 1, 'numberOfLines', $player_id );

                    // Notify all players
                    self::notifyAllPlayers( "lineMade", clienttranslate( '${player_name} makes a line of his balls' ),
                                            array( 'player_name' => self::getActivePlayerName() ) );

                    $squareOrLineIsPresent = true;
                }

                // Vertical line on level 0 (z=0) or level 1 (z=1)
                /*if (!$squareOrLineIsPresent)*/ {
                    if (self::checkPlayerVertLineOfBallsIsPresent($pos_coord_x, $pos_coord_z, $color)) {
                        // Statistics
    	                self::incStat( 1, 'numberOfLines', $player_id );

                        // Notify all players
                        self::notifyAllPlayers( "lineMade", clienttranslate( '${player_name} makes a line of his balls' ),
                                                array( 'player_name' => self::getActivePlayerName() ) );

                        $squareOrLineIsPresent = true;
                    }
                }
            }
        }

        if (self::getGameStateValue("game_variant") == VARIANT_GAME_SIMPLE || !$squareOrLineIsPresent)
            $transition = "turnCompleted";
        else
            $transition = "squareOrLineIsPresent";

        // Go to next game state
        $this->gamestate->nextState( $transition );
    }

    function zombiePlayBall()
    {
        // Check that this is player's turn and that it is a "possible action" at this game state (see states.inc.php)
        self::checkAction( 'playBall' );

        $player_id = self::getActivePlayerId();

        // Get player color
        $color = self::getPlayerColor( $player_id );
		$opponent_color = ($color == 'l'?  'd' : 'l');

        /*
	    $sql = "SELECT count(id) as value FROM position WHERE ball_color = '$opponent_color'";
    	$counter = self::getNonEmptyObjectFromDB( $sql );
    	if ($counter['value'] >= 15)
    	{
    	    // Set zombie player score to 1 (he is the winner)
            $sql = "UPDATE player SET player_score = 1 WHERE player_id = $player_id";
            self::DbQuery($sql);

    	    // Set global variable flag to pass on the information that the game has ended
            self::setGameStateValue('end_of_game', 1);
    	    return;
    	}
        */

        $sql = "SELECT count(id) as value FROM position WHERE ball_color = '$color'";
    	$counter = self::getNonEmptyObjectFromDB( $sql );
    	if ($counter['value'] >= 15)
        {
    	    // Set no zombie player score to 1 (he is the winner)
            $sql = "UPDATE player SET player_score = 1 WHERE player_id != $player_id";
            self::DbQuery($sql);

    	    // Set global variable flag to pass on the information that the game has ended
            self::setGameStateValue('end_of_game', 1);
    	    return;
        }

    	// Finding a free position
        $sql = "SELECT
                    id, coord_x, coord_y, coord_z
                FROM
                    position
                WHERE
                    (coord_z = 0 OR (coord_z > 0 AND down_balls_cnt = 4))
                    AND up_balls_cnt = 0
                    AND ball_color is null
                ORDER BY id
                LIMIT 1
               ";

        $position = self::getObjectFromDb( $sql );

        if ($position == null) {
            // Set opponent player score to 1 (he is the winner)
            $sql = "UPDATE player SET player_score = 1 WHERE player_id != $player_id";
            self::DbQuery($sql);

            // Set global variable flag to pass on the information that the game has ended
            self::setGameStateValue('end_of_game', 1);
            return;
        }

        // Update the position with a ball of the appropriate color (installed new ball always is up balls count = 0)
        $position_id = $position['id'];
        $sql = "UPDATE
                    position
                SET
                    ball_color = '$color',
                    up_balls_cnt = 0
                WHERE
                    id = $position_id
               ";
        self::DbQuery($sql);

        // Increment up balls count for 4 balls (on these balls set this ball)
        self::incrementUpBallsCount(1, $position['coord_x'], $position['coord_y'], $position['coord_z']);

        // Increment down balls count for 4 positions (these positions on this ball)
        self::incrementDownBallsCount(1, $position['coord_x'], $position['coord_y'], $position['coord_z']);

        // Statistics
    	self::incStat( -1, 'ballsRemained', $player_id );

        // Notify all players
        self::notifyAllPlayers( "ballPlaced", clienttranslate( '${player_name} places a ball ${coordinates}' ), array(
               'player_id' => $player_id,
               'player_name' => self::getActivePlayerName(),
               'coordinates' => $this->getFormattedCoordinates($position['coord_x'], $position['coord_y'], $position['coord_z']),
               'coord_x' => $position['coord_x'],
               'coord_y' => $position['coord_y'],
               'coord_z' => $position['coord_z'],
               'color' => $color == 'l' ? 'light':'dark',
               'counters' => $this->getGameCounters()
        ) );
    }

    function returnFirstBall( $ball_coord_x, $ball_coord_y, $ball_coord_z )
    {
        // Check that this is player's turn and that it is a "possible action" at this game state (see states.inc.php)
        self::checkAction( 'returnFirstBall' );

        if ($ball_coord_z >= 4 || $ball_coord_x >= 4-$ball_coord_z || $ball_coord_y >= 4-$ball_coord_z) {
            throw new BgaUserException( self::_("Incorrect coordinates of the ball") );
        }

        self::returnBall( $ball_coord_x, $ball_coord_y, $ball_coord_z );

        $transition = "ballReturned";

        // Go to next game state
        $this->gamestate->nextState( $transition );
    }

    function returnSecondBall( $ball_coord_x, $ball_coord_y, $ball_coord_z )
    {
        // Check that this is player's turn and that it is a "possible action" at this game state (see states.inc.php)
        self::checkAction( 'returnSecondBall' );

        $player_id = self::getActivePlayerId();

        // Get player color
        $color = self::getPlayerColor( $player_id );

        $reserve = $this->gameConstants["BALL_FROM_RESERVE"];

        if (($ball_coord_z >= 4 || $ball_coord_x >= 4-$ball_coord_z || $ball_coord_y >= 4-$ball_coord_z) &&
            ($ball_coord_x != $reserve || $ball_coord_y != $reserve || $ball_coord_z != $reserve) /* cancel return ball */) {
            throw new BgaUserException( self::_("Incorrect coordinates of the ball") );
        }

        if ($ball_coord_x == $reserve && $ball_coord_y == $reserve && $ball_coord_z == $reserve) {
            // Notify all players
            self::notifyAllPlayers( "returnCanceled", clienttranslate( '${player_name} does not return second a ball' ), array(
                'player_name' => self::getActivePlayerName()
            ) );

            $transition = "cancelReturn";
        }
        else {
            self::returnBall( $ball_coord_x, $ball_coord_y, $ball_coord_z );
            $transition = "ballReturned";
        }

        $this->gamestate->nextState( $transition );
    }

    function returnBall( $ball_coord_x, $ball_coord_y, $ball_coord_z )
    {
        $player_id = self::getActivePlayerId();

        // Get player color
        $color = self::getPlayerColor( $player_id );

        // Check that returned ball is set on the board and up balls count = 0
        $sql = "SELECT
                    id
                FROM
                    position
                WHERE
                    ball_color = '$color'
                    AND up_balls_cnt = 0
                    AND (coord_x = $ball_coord_x AND coord_y = $ball_coord_y AND coord_z = $ball_coord_z)
               ";

        $returnBall = self::getObjectFromDb( $sql );

        // Return ball
        $sql = "UPDATE
                    position
                SET
                    ball_color = null,
                    up_balls_cnt = 0
                WHERE
                    id = {$returnBall['id']}
               ";
        self::DbQuery( $sql );

        // Decrement up balls count
        self::incrementUpBallsCount(-1, $ball_coord_x, $ball_coord_y, $ball_coord_z);

        // Decrement down balls count
        self::incrementDownBallsCount(-1, $ball_coord_x, $ball_coord_y, $ball_coord_z);


        // Notify all players
        self::notifyAllPlayers( "ballReturned", clienttranslate( '${player_name} returned to reserve the ball ${coordinates}' ), array(
                    'player_id' => $player_id,
                    'player_name' => self::getActivePlayerName(),
                    'coordinates' => $this->getFormattedCoordinates($ball_coord_x, $ball_coord_y, $ball_coord_z),
                    'coord_x' => $ball_coord_x,
                    'coord_y' => $ball_coord_y,
                    'coord_z' => $ball_coord_z,
                    'color' => $color == 'l' ? 'light':'dark',
                    'counters' => $this->getGameCounters()
        ) );

        // Statistics
    	self::incStat( 1, 'ballsRemained', $player_id );

    	self::incStat( 1, 'ballsReturned', $player_id );
    }

    function fillPiramid()
    {
        $sql = "SELECT player_id, player_name, player_color, player_score FROM player WHERE player_score = 1";
        $player = self::getNonEmptyObjectFromDb( $sql );

        if ( $player['player_color'] == $this->gameConstants["LIGHT_COLOR"] )
            $color = 'l';
        else
            $color = 'd';

        $player_id = $player['player_id'];

        $sql = "SELECT count(id) as value FROM position WHERE ball_color = '$color'";
    	$ballsCounter = self::getNonEmptyObjectFromDB( $sql );

        $sql = "SELECT id, coord_x, coord_y, coord_z FROM position WHERE ball_color is null ORDER BY id";
        $freePositions = self::getCollectionFromDB( $sql );
        $freePosCount = count($freePositions);
        $ballsInReserve = 15-$ballsCounter['value'];

        if ($ballsInReserve != $freePosCount)
            throw new BgaUserException( self::_("Incorrect number of balls in reserve") );

        $sql = "UPDATE position SET ball_color = '$color' WHERE ball_color is null";
        self::DbQuery($sql);

        // Notify all players
        self::notifyAllPlayers( "piramidCompleted", clienttranslate( '${player_name} completes the pyramid' ), array(
                    'player_id' => $player_id,
                    'player_name' => $player['player_name'],
                    'balls_piramid' => $freePositions,
                    'color' => $color == 'l' ? 'light':'dark',
                    'counters' => $this->getGameCounters()) );
    }

    // Get player color
    function getPlayerColor( $player_id )
    {

        $sql = "SELECT
                    player_id, player_color
                FROM
                    player
                WHERE
                    player_id = $player_id
               ";
        $player = self::getNonEmptyObjectFromDb( $sql );
        $color = ($player['player_color'] == $this->gameConstants["LIGHT_COLOR"] ? 'l' : 'd'); // light or dark
        return $color;
     }


    function getFormattedCoordinates( $coord_x, $coord_y, $coord_z )
    {
        return "(" . ($coord_x+1) . ", " . ($coord_y+1) . ", " . ($coord_z+1) . ")";
    }

    function checkForWin()
    {
        $wins = false;

        $player_id = self::getActivePlayerId();

        $sql = "SELECT player_color FROM player WHERE player_id = $player_id";
        $player = self::getNonEmptyObjectFromDb( $sql );
        if ($player['player_color'] == $this->gameConstants["LIGHT_COLOR"])
            $opponent_color = 'd';
        else
            $opponent_color = 'l';

        $sql = "SELECT ball_color FROM position WHERE coord_x = 0 AND coord_y = 0 AND coord_z = 3";
        $ballOnTop = self::getNonEmptyObjectFromDB( $sql );

        if ($ballOnTop['ball_color'] == null)
        {
            $sql = "SELECT count(id) as value FROM position WHERE ball_color = '$opponent_color'";
    	    $counter = self::getNonEmptyObjectFromDB( $sql );

            if ($counter['value'] == 15)
            {
                if (count( self::getAvailableMoveUpBalls( $opponent_color ) ) == 0)
                    $wins = true;
            }
        }
        else
           $wins = true;

        if ($wins) {
            // Set active player score to 1 (he is the winner)
            $sql = "UPDATE player SET player_score = 1 WHERE player_id = $player_id";
            self::DbQuery($sql);

            // Set global variable flag to pass on the information that the game has ended
            self::setGameStateValue('end_of_game', 1);

            return true;
        }
        return false;
    }

    function checkBallOnSquare( $coord_x, $coord_y, $coord_z )
    {
        // Check that ball placing on the square of the balls
        $sql = "SELECT
            count(id) as value
        FROM
            position
        WHERE
            ball_color is not null
            AND coord_z = $coord_z-1
            AND ((coord_x = $coord_x AND coord_y = $coord_y) OR
                 (coord_x = $coord_x+1 AND coord_y = $coord_y) OR
                 (coord_x = $coord_x AND coord_y = $coord_y+1) OR
                 (coord_x = $coord_x+1 AND coord_y = $coord_y+1)
                )
               ";
        $count = self::getNonEmptyObjectFromDB( $sql );
        if ($count['value'] == 4)
            return true;

        return false;
    }

    function checkPlayerSquareOfBallsIsPresent( $coord_x, $coord_y, $coord_z, $color )
    {
        // Check that the square of the player's balls is present
        for ($i = 0; $i < 4; $i++) {
            switch ($i) {
            case 0:
                // Square 1
                $x0 = $coord_x-1; $y0 = $coord_y-1;
                $x1 = $coord_x  ; $y1 = $coord_y-1;
                $x2 = $coord_x-1; $y2 = $coord_y  ;
                $x3 = $coord_x  ; $y3 = $coord_y  ;
                break;
            case 1:
                // Square 2
                $x0 = $coord_x  ; $y0 = $coord_y-1;
                $x1 = $coord_x+1; $y1 = $coord_y-1;
                $x2 = $coord_x  ; $y2 = $coord_y  ;
                $x3 = $coord_x+1; $y3 = $coord_y  ;
                break;
            case 2:
                // Square 3
                $x0 = $coord_x-1; $y0 = $coord_y  ;
                $x1 = $coord_x  ; $y1 = $coord_y  ;
                $x2 = $coord_x-1; $y2 = $coord_y+1;
                $x3 = $coord_x  ; $y3 = $coord_y+1;
                break;
            case 3:
            default:
                // Square 4
                $x0 = $coord_x  ; $y0 = $coord_y  ;
                $x1 = $coord_x+1; $y1 = $coord_y  ;
                $x2 = $coord_x  ; $y2 = $coord_y+1;
                $x3 = $coord_x+1; $y3 = $coord_y+1;
                break;
            }

            $sql = "SELECT
                        count(id) as value
                    FROM
                        position
                    WHERE
                        ball_color = '$color'
                        AND coord_z = $coord_z
                        AND ((coord_x = $x0 AND coord_y = $y0) OR
                             (coord_x = $x1 AND coord_y = $y1) OR
                             (coord_x = $x2 AND coord_y = $y2) OR
                             (coord_x = $x3 AND coord_y = $y3)
                            )
                    ";
            $count = self::getNonEmptyObjectFromDB( $sql );
            if ($count['value'] == 4) {
                return true;
            }
        }
        return false;
    }

    function checkPlayerHorzLineOfBallsIsPresent( $coord_y, $coord_z, $color )
    {
        // Check that the line of the player's balls is present
        // Horizontal line on level 0 (z=0) or level 1 (z=1)
        $sql = "SELECT
                    count(id) as value
                FROM
                    position
                WHERE
                    ball_color = '$color'
                    AND coord_z = $coord_z
                    AND coord_y = $coord_y
                    AND ($coord_z = 0 OR $coord_z = 1)
               ";
        $count = self::getNonEmptyObjectFromDB( $sql );
        if (($coord_z == 0 && $count['value'] == 4) || ($coord_z == 1 && $count['value'] == 3))
            return true;

        return false;
    }

    function checkPlayerVertLineOfBallsIsPresent( $coord_x, $coord_z, $color )
    {
        // Check that the line of the balls the player is present
        // Vertical line on level 0 (z=0) or level 1 (z=1)
        $sql = "SELECT
                    count(id) as value
                FROM
                    position
                WHERE
                    ball_color = '$color'
                    AND coord_z = $coord_z
                    AND coord_x = $coord_x
                    AND ($coord_z = 0 OR $coord_z = 1)
               ";
        $count = self::getNonEmptyObjectFromDB( $sql );
        if (($coord_z == 0 && $count['value'] == 4) || ($coord_z == 1 && $count['value'] == 3))
            return true;

        return false;
    }

    // Increment up balls count for 4 balls (on these balls set this ball)
    function incrementUpBallsCount( $value, $ball_coord_x, $ball_coord_y, $ball_coord_z )
    {
        if ($value >= 0)
            $sValue = "+$value";
        else
            $sValue = $value;

        if ($ball_coord_z > 0) {
            $sql = "UPDATE
                        position
                    SET
                        up_balls_cnt = up_balls_cnt$sValue
                    WHERE
                        ball_color is not null
                        AND coord_z = $ball_coord_z-1
                        AND ((coord_x = $ball_coord_x AND coord_y = $ball_coord_y) OR
                             (coord_x = $ball_coord_x+1 AND coord_y = $ball_coord_y) OR
                             (coord_x = $ball_coord_x AND coord_y = $ball_coord_y+1) OR
                             (coord_x = $ball_coord_x+1 AND coord_y = $ball_coord_y+1)
                            )
                   ";

            self::DbQuery($sql);
        }
    }

    // Increment down balls count for 4 positions (these positions on this ball)
    function incrementDownBallsCount( $value, $ball_coord_x, $ball_coord_y, $ball_coord_z )
    {
        if ($value >= 0)
            $sValue = "+$value";
        else
            $sValue = $value;

        if ($ball_coord_z < 3) {
            $sql = "UPDATE
                        position
                    SET
                        down_balls_cnt = down_balls_cnt$sValue
                    WHERE
                        coord_z = $ball_coord_z+1
                        AND ((coord_x = $ball_coord_x-1 AND coord_y = $ball_coord_y-1) OR
                             (coord_x = $ball_coord_x AND coord_y = $ball_coord_y-1) OR
                             (coord_x = $ball_coord_x-1 AND coord_y = $ball_coord_y) OR
                             (coord_x = $ball_coord_x AND coord_y = $ball_coord_y)
                            )
                   ";

            self::DbQuery($sql);
        }
    }

    // Get the list of available positions
    function getAvailablePositions()
    {
        // Select all available positions
        $sql = "SELECT
                    id ID, coord_x X, coord_y Y, coord_z Z
                FROM
                    position
                WHERE
                    (coord_z = 0 AND ball_color is null) OR
                    (coord_z > 0 AND ball_color is null AND down_balls_cnt = 4)
               ";
        $result = self::getCollectionFromDb( $sql );

        return $result;
    }

    // Get the list of available player balls
    function getAvailablePlayerBalls( $player_id )
    {
        // Get player color
        $color = self::getPlayerColor( $player_id );

        // Select all available player balls
        $sql = "SELECT
                    id ID, coord_x X, coord_y Y, coord_z Z
                FROM
                    position
                WHERE
                    ball_color = '$color'
                    AND up_balls_cnt = 0
               ";

        $result = self::getCollectionFromDb( $sql );

        return $result;
    }

    // Get the list of available balls for move up
    function getAvailableMoveUpBalls( $color )
    {
        // Select all available balls for move up
        $sql = "SELECT
                    b.id ID, b.coord_x X, b.coord_y Y, b.coord_z Z
                FROM
                    (SELECT id, coord_x, coord_y, coord_z FROM position WHERE ball_color = '$color' AND up_balls_cnt = 0) b
                    LEFT JOIN
                    (SELECT id, coord_x, coord_y, coord_z FROM position WHERE coord_z > 0 AND ball_color is null AND down_balls_cnt = 4) p
                    on (p.coord_z > b.coord_z) AND ((p.coord_z = b.coord_z+1 AND
                    NOT ((p.coord_x = b.coord_x AND p.coord_y = b.coord_y) OR
                    (p.coord_x = b.coord_x AND p.coord_y+1 = b.coord_y) OR
                    (p.coord_x+1 = b.coord_x AND p.coord_y = b.coord_y) OR
                    (p.coord_x+1 = b.coord_x AND p.coord_y+1 = b.coord_y))) OR p.coord_z != b.coord_z+1)
                WHERE p.id is not null
               ";

        $result = self::getCollectionFromDb( $sql );

        return $result;
    }




//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */

    /*

    Example for game state "MyGameState":

    function argMyGameState()
    {
        // Get some values from the current game situation in database...

        // return values:
        return array(
            'variable1' => $value1,
            'variable2' => $value2,
            ...
        );
    }
    */


    function argPlayerTurn()
    {
        $player_id = self::getActivePlayerId();
        $color = self::getPlayerColor( $player_id );

        $sql = "SELECT count(id) as value FROM position WHERE ball_color = '$color'";
    	$counter = self::getNonEmptyObjectFromDB( $sql );

        return array(
            'ballColor' => $color == 'l'? 'light' : 'dark',
            'availablePositions' => self::getAvailablePositions(),
            'availableMoveUpBalls' => self::getAvailableMoveUpBalls( $color ),
            'ballsInReserve' => ( 15 - $counter['value'] )
        );
    }

    function argPlayerReturnBall()
    {
        $player_id = self::getActivePlayerId();

        return array(
            'ballColor' => self::getPlayerColor( $player_id ) == 'l'? 'light' : 'dark',
            'availablePlayerBalls' => self::getAvailablePlayerBalls( self::getActivePlayerId() )
        );
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

    /*

    Example for game state "MyGameState":

    function stMyGameState()
    {
        // Do some stuff ...

        // (very often) go to another gamestate
        $this->gamestate->nextState( 'some_gamestate_transition' );
    }
    */

    function stCheckAvailableBalls()
    {
        self::trace( "stCheckAvailableBalls" );

        $player_id = self::getActivePlayerId();

        // Get player color
        $color = self::getPlayerColor( $player_id );

        $sql = "SELECT count(id) as value FROM position WHERE ball_color = '$color' AND up_balls_cnt = 0";
        $counter = self::getNonEmptyObjectFromDB( $sql );
    	if ($counter['value'] > 0)
    	    $transition = "ballsExists";
    	else
            $transition = "notExists";

        $this->gamestate->nextState( $transition );
    }

    function stCheckEndOfGame()
    {
        self::trace( "stCheckEndOfGame" );

        $wins = false;
        $transition = "notEndedYet";

        // If the 'end of game' flag has been set, end the game
        if (self::getGameStateValue('end_of_game') == 1)
            $wins = true;

        if (!$wins) {
            if ( self ::checkForWin() )
                $wins = true;
        }

        if ($wins) {
            /*
            // Notify final score
            $this->notifyAllPlayers( "finalScore",
    					clienttranslate( '${player_name} wins the game!' ),
    					array(
    							"player_name" => self::getActivePlayerName(),
    							"player_id" => $player_id,
    							"score_delta" => 1,
    					)
   			);

            // End of game message
            $this->notifyAllPlayers( "message",
    				clienttranslate('Thanks for playing!'),
    				array(
    				)
    		);
    		*/

            // Notify all players
            $this->notifyAllPlayers( "finalScore", "" , array(
                   'scores' => $this->getPlayerScores() 
            ));

            // Fill piramid
            self::fillPiramid();
            $transition = "gameEnded";
        }

        $this->gamestate->nextState( $transition );
    }

    function stNextPlayer()
    {
    	self::trace( "stNextPlayer" );

    	// Go to next player
    	$active_player = self::activeNextPlayer();
    	self::giveExtraTime( $active_player );

    	$this->gamestate->nextState();
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Zombie
////////////

    /*
        zombieTurn:

        This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
        You can do whatever you want in order to make sure the turn of this player ends appropriately
        (ex: pass).
    */

    function zombieTurn( $state, $active_player )
    {
        if( $state['name'] == 'playerTurn' )
        {
             self::zombiePlayBall();
             $this->gamestate->nextState( "zombiePlayed" );
        }
        else
            throw new feException( "Zombie mode not supported at this game state:".$state['name'] );
    }

 }

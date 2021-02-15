<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Pylos implementation : © Stanislav Stepanenko <stst75@inbox.ru>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * pylos.action.php
 *
 * Pylos main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/pylos/pylos/myAction.html", ...)
 *
 */


  class action_pylosd extends APP_GameAction
  {
    // Constructor: please do not modify
   	public function __default()
  	{
  	    if( self::isArg( 'notifwindow') )
  	    {
            $this->view = "common_notifwindow";
  	        $this->viewArgs['table'] = self::getArg( "table", AT_posint, true );
  	    }
  	    else
  	    {
            $this->view = "pylosd_pylosd";
            self::trace( "Complete reinitialization of board game" );
      }
  	}

  	// TODO: defines your action entry points there


    /*

    Example:

    public function myAction()
    {
        self::setAjaxMode();

        // Retrieve arguments
        // Note: these arguments correspond to what has been sent through the javascript "ajaxcall" method
        $arg1 = self::getArg( "myArgument1", AT_posint, true );
        $arg2 = self::getArg( "myArgument2", AT_posint, true );

        // Then, call the appropriate method in your game logic, like "playCard" or "myAction"
        $this->game->myAction( $arg1, $arg2 );

        self::ajaxResponse( );
    }

    */

    public function playBall()
    {
        self::setAjaxMode();
        // Retrieve arguments
        // Note: these arguments correspond to what has been sent through the javascript "ajaxcall" method
        $ball_coord_x = self::getArg( "ball_coord_x", AT_posint, true );
        $ball_coord_y = self::getArg( "ball_coord_y", AT_posint, true );
        $ball_coord_z = self::getArg( "ball_coord_z", AT_posint, true );
        $pos_coord_x = self::getArg( "pos_coord_x", AT_posint, true );
        $pos_coord_y = self::getArg( "pos_coord_y", AT_posint, true );
        $pos_coord_z = self::getArg( "pos_coord_z", AT_posint, true );

        // Then, call the appropriate method in your game logic, like "playCard" or "myAction"
        $this->game->PlayBall( $ball_coord_x, $ball_coord_y, $ball_coord_z, $pos_coord_x, $pos_coord_y, $pos_coord_z );

        self::ajaxResponse( );
    }

    public function returnFirstBall()
    {
        self::setAjaxMode();

        // Retrieve arguments
        // Note: these arguments correspond to what has been sent through the javascript "ajaxcall" method
        $ball_coord_x = self::getArg( "ball_coord_x", AT_posint, true );
        $ball_coord_y = self::getArg( "ball_coord_y", AT_posint, true );
        $ball_coord_z = self::getArg( "ball_coord_z", AT_posint, true );

        // Then, call the appropriate method in your game logic, like "playCard" or "myAction"
        $this->game->ReturnFirstBall( $ball_coord_x, $ball_coord_y, $ball_coord_z );

        self::ajaxResponse( );
    }

    public function returnSecondBall()
    {
        self::setAjaxMode();

        // Retrieve arguments
        // Note: these arguments correspond to what has been sent through the javascript "ajaxcall" method
        $ball_coord_x = self::getArg( "ball_coord_x", AT_posint, true );
        $ball_coord_y = self::getArg( "ball_coord_y", AT_posint, true );
        $ball_coord_z = self::getArg( "ball_coord_z", AT_posint, true );

        // Then, call the appropriate method in your game logic, like "playCard" or "myAction"
        $this->game->ReturnSecondBall( $ball_coord_x, $ball_coord_y, $ball_coord_z );

        self::ajaxResponse( );
    }

  }

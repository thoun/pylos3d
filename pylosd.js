/**
 *------
 * BGA framework: �c Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Pylos implementation : �c Stanislav Stepanenko <stst75@inbox.ru>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * pylos.js
 *
 * Pylos user interface script
 *
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

var THREE;

define([
    "dojo","dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter"
],
function (dojo, declare) {
    return declare("bgagame.pylosd", ebg.core.gamegui, {
        constructor: function(){
            // Here, you can init the global variables of your user interface
            // Example:
            // this.myGlobalValue = 0;
            // Game constants
        	this.gameConstants = null;

            // Array of current dojo connections (needed for method addEventToClass)
            this.connections = [];

            this.moveUpBallsPresent = false;
            this.availablePositions = null;
            this.availableMoveUpBalls = null;
            this.availablePlayerBalls = null;
            this.selectedBall = null;
            this.returnBallNumber = 0;
            this.selectedBallForMoveUp = false;
            this.selectedBallForReturn = false;
            this.ballColor = null;
            this.isShowLevel0 = true;

            this.active3d = false;
            this.mode3d = false;
            this.radius = 25;
            this.config3d = {
                lightColor: 0xe08f38,
                lightSelectableColor: 0xeb5e25,
                lightSelectedColor: 0xf43214,
                darkColor: 0x3a2319,
                darkSelectableColor: 0x7b1711,
                darkSelectedColor: 0xba0c09,
                whiteColor: 0xffffff,
                whiteSelectableColor: 0xffffff,
                whiteSelectedColor: 0xff0000,
                hoverColor: 0x0000ff
            };
        },

        /*
            setup:

            This method must set up the game user interface according to current game situation specified
            in parameters.

            The method is called each time the game interface is displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)

            "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
        */

        setup: function( gamedatas )
        {
            console.log( "Starting game setup" );

            this.gameConstants = gamedatas.constants;
            this.positions3d = []; // x y z, 0 indexed
            for (let row = 0; row < 4; row++) {
                const ballsByRow = 4 - row;
                for (let i = 0; i < Math.pow(ballsByRow, 2); i++) {
                    const x = i % ballsByRow;
                    const y = Math.floor(i / ballsByRow);
                    if (!this.positions3d[x]) {
                        this.positions3d[x] = [];
                    }
                    if (!this.positions3d[x][y]) {
                        this.positions3d[x][y] = [];
                    }
                    this.positions3d[x][y][row] = {
                        oldId: 'pos_selection_'+x+'_'+y+'_'+row,
                        color: null,
                        object: null,
                        coordinates: this.gamePositionToPosition(x+1, ballsByRow, y+1),
                        selectable: false,
                        selected: false
                    };
                }
            }

            // Setting up player boards
            for( var player_id in gamedatas.players )
            {
                var player = gamedatas.players[player_id];

                // Setting up players boards if needed
                var player_board_div = $('player_board_'+player_id);

                dojo.place( this.format_block( 'jstpl_player_board', {
                            id: player_id,
                            color: (player['color'] == gamedatas.constants['LIGHT_COLOR'] ? 'light' : 'dark')
                      } ) , player_board_div );
            }

            // Set up your game interface here, according to "gamedatas"

            // Setup positions
            for( var id in gamedatas.positions )
            {
                var position = gamedatas.positions[id];

                var x_pix = this.getBallXPixelCoordinate(position.coord_x, position.coord_z);
                var y_pix = this.getBallYPixelCoordinate(position.coord_y, position.coord_z);

                if (position.ball_color != null)
                {
                    dojo.place( this.format_block('jstpl_ball', {
                        x: position.coord_x,
                        y: position.coord_y,
                        z: position.coord_z,
                        ball_color: 'ball_' + position.ball_color
                    } ), $ ( 'board' ) );
                    dojo.style( 'ball_'+position.coord_x+'_'+position.coord_y+'_'+position.coord_z,
                                'zIndex',  parseInt(position.coord_z)+1 );

                    this.positions3d[Number(position.coord_x)][Number(position.coord_y)][Number(position.coord_z)].color = position.ball_color;

                    this.slideToObjectPos( $('ball_'+position.coord_x+'_'+position.coord_y+'_'+position.coord_z),
                                           $('board'), x_pix, y_pix, 10).play();

                    if (parseInt(position.coord_z) == 2)
                        dojo.addClass( 'ball_'+position.coord_x+'_'+position.coord_y+'_'+position.coord_z, 'level_2' );
                }
            }

            // TODO: Set up your game interface here, according to "gamedatas"
            this.addEventToClass( "pos_selection", "onclick", "onPlaceOrMoveUpBall");
            this.addEventToClass( "ball_selection", "onclick", "onSelectOrReturnBall");

            // Init counters
            this.updateCounters(gamedatas.counters);

            // Tooltips
            var tooltip = _('Number of balls in reserve');
            this.addTooltipToClass( 'ballicon_dark', tooltip, '' );
            this.addTooltipToClass( 'ballicon_light', tooltip, '' );
            this.addTooltipToClass( 'ballcounter', tooltip, '' );

            this.addLevel2();

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            // TODO move on 3D click
            this.loadAndCreate3d();
            if (localStorage.getItem('pylosMode') === '3D') {
                this.switchMode({ target: document.getElementById('modeSelector') });
            }

            this.addEventToClass( "ball_selection", "onclick", "onSelectOrReturnBall");
            dojo.query("#modeSelector").connect( 'onclick', this, 'switchMode' );

            console.log( "Ending game setup" );
        },

        switchMode: function(e) {
            const button = e.target;

            if (button.innerHTML === '3D') {
                dojo.style( 'container', 'display', 'block' );
                dojo.style( 'game_background', 'display', 'none' );
                button.innerHTML = '2D';
                localStorage.setItem('pylosMode', '3D');
                if (this.renderer) {
                    this.renderer.setSize(container.clientWidth, container.clientHeight);
                    this.onWindowResize();
                    this.render();
                }
            } else {
                dojo.style( 'container', 'display', 'none' );
                dojo.style( 'game_background', 'display', 'inline-block' );
                button.innerHTML = '3D';
                localStorage.setItem('pylosMode', '2D');
            }
            button.blur();
        },

        getBallXPixelCoordinate: function( x, z )
        {
            return this.gameConstants['POSITION_X'+x+'_Z'+z] - this.gameConstants['BALL_WIDTH']/2;
        },

        getBallYPixelCoordinate: function( y, z )
        {
            return this.gameConstants['POSITION_Y'+y+'_Z'+z] - this.gameConstants['BALL_HEIGHT']/2;
        },

        ///////////////////////////////////////////////////
        //// Game & client states

        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args )
        {
            console.log( 'Entering state: '+stateName );

            switch( stateName )
            {

            /* Example:

            case 'myGameState':

                // Show some HTML block at this game state
                dojo.style( 'my_html_block_id', 'display', 'block' );

                break;
           */
            case 'playerTurn':
                if ( this.isCurrentPlayerActive() )
                {
                   this.ballColor = args.args.ballColor;
                   this.selectedBall = null;
                   this.availablePositions = args.args.availablePositions;
                   this.availableMoveUpBalls = args.args.availableMoveUpBalls;

                   this.moveUpBallsPresent = false;
                   for (var i in args.args.availableMoveUpBalls)
                   {
                       this.moveUpBallsPresent = true;
                       break;
                   }

                   this.selectedBallForMoveUp = false;
                   this.selectedBallForReturn = false;

                   if (args.args.ballsInReserve <= 0)
                   {
                        this.selectedBallForMoveUp = true;
                        this.updateAvailableMoveUpBalls( args.args.availableMoveUpBalls, args.args.ballColor );
                   }
                   else
                   {
                       this.updateAvailablePositions( args.args.availablePositions, null );
                       if (this.moveUpBallsPresent)
                       {
                           this.showMessage( _('You can move up a ball'),  "info" );
                           this.addActionButton( 'buttonMoveUpBall', _('Move up a ball'), 'onMoveUpBallButtonClicked' );
                       }
                   }
                }
                break;

            case 'returnFirstBall':
            case 'returnSecondBall':
                if ( this.isCurrentPlayerActive() )
                {
                    this.ballColor = args.args.ballColor;
                    this.selectedBall = null;
                    this.availablePlayerBalls = args.args.availablePlayerBalls;

                    this.selectedBallForMoveUp = false;
                    this.selectedBallForReturn = true;
                    this.updateAvailablePlayerBalls( args.args.availablePlayerBalls, args.args.ballColor );

                    if ( stateName == 'returnSecondBall' )
                    {
                        this.addActionButton( 'buttonCancelReturn', _("Don't return"), 'onCancelReturnButtonClicked' );
                        this.returnBallNumber = 2;
                    }
                    else
                        this.returnBallNumber = 1;
                }
                break;


            case 'dummmy':
                break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
            console.log( 'Leaving state: '+stateName );

            switch( stateName )
            {

            /* Example:

            case 'myGameState':

                // Hide the HTML block we are displaying only during this game state
                dojo.style( 'my_html_block_id', 'display', 'none' );

                break;
           */
            case 'dummmy':
                break;
            }
        },

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //
        onUpdateActionButtons: function( stateName, args )
        {
            console.log( 'onUpdateActionButtons: '+stateName );

            if( this.isCurrentPlayerActive() )
            {
                switch( stateName )
                {
/*
                 Example:

                 case 'myGameState':

                    // Add 3 action buttons in the action status bar:

                    this.addActionButton( 'button_1_id', _('Button 1 label'), 'onMyMethodToCall1' );
                    this.addActionButton( 'button_2_id', _('Button 2 label'), 'onMyMethodToCall2' );
                    this.addActionButton( 'button_3_id', _('Button 3 label'), 'onMyMethodToCall3' );
                    break;
*/
                }
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods

        /*

            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.

        */

        updateAvailablePositions: function( availablePositions, moveUpBall )
        {
            // Remove current available positions
            this.removeTooltipFromClass( 'availablePosition' );
            //this.addTooltipToClass( 'availablePosition', '', '' );
            dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
            this.remove3dAvailablePositions();

            for ( var id in availablePositions )
            {
                if (moveUpBall)
                {
                    if (availablePositions[id]['Z'] <= moveUpBall['Z'] || (availablePositions[id]['Z'] == moveUpBall['Z']+1 &&
                        ( (availablePositions[id]['X'] == moveUpBall['X'] && availablePositions[id]['Y'] == moveUpBall['Y']) ||
                          (availablePositions[id]['X'] == moveUpBall['X']-1 && availablePositions[id]['Y'] == moveUpBall['Y']) ||
                          (availablePositions[id]['X'] == moveUpBall['X'] && availablePositions[id]['Y'] == moveUpBall['Y']-1) ||
                          (availablePositions[id]['X'] == moveUpBall['X']-1 && availablePositions[id]['Y'] == moveUpBall['Y']-1)
                        )))
                        continue;
                }

                var pos_selection = 'pos_selection_'+availablePositions[id]['X']+'_'+
                                                     availablePositions[id]['Y']+'_'+
                                                     availablePositions[id]['Z'];

                $(pos_selection).style.display = 'block';
                dojo.addClass( pos_selection, 'availablePosition' );

                const position = this.positions3d[Number(availablePositions[id]['X'])][Number(availablePositions[id]['Y'])][Number(availablePositions[id]['Z'])];
                position.color = 'white';
                position.selectable = true;
                if (this.active3d) {
                    this.add3dAvailablePosition(position);
                }

                // bounded position
                boudedPos = this.gameConstants['POS_BOUNDED_X'+availablePositions[id]['X']+
                                                          '_Y'+availablePositions[id]['Y']+
                                                          '_Z'+availablePositions[id]['Z']];
                if (boudedPos != null)
                {
                    $(boudedPos).style.display = 'none';
                    dojo.addClass( boudedPos, 'availablePosition' );
                }
            }

            if (moveUpBall)
                this.addTooltipToClass( 'availablePosition', '', _('Move the ball here') );
            else
                this.addTooltipToClass( 'availablePosition', '', _('Place a ball here') );
        },

        updateAvailableMoveUpBalls: function( availableBalls, ballColor )
        {
            // Remove current available ball selections
            this.removeTooltipFromClass( 'availableBall_'+ballColor );
            //this.addTooltipToClass( 'availableBall_'+ballColor, '', '' );
            dojo.query( '.availableBall_'+ballColor ).removeClass( 'availableBall_'+ballColor );
            this.get3dPositionsForEach(position => this.makeSelectable(position, false));

            for ( var id in availableBalls )
            {
                // x,y,z is a available ball
                var ball_selection = 'ball_selection_'+ballColor+'_'+availableBalls[id]['X']+'_'+
                                                                     availableBalls[id]['Y']+'_'+
                                                                     availableBalls[id]['Z'];
                //dojo.style( $(ball_selection), 'zIndex', 5 );
                dojo.addClass( ball_selection, 'availableBall_'+ballColor );
                
                this.makeSelectable(this.positions3d[Number(availableBalls[id]['X'])][Number(availableBalls[id]['Y'])][Number(availableBalls[id]['Z'])], true);

            }
            this.addTooltipToClass( 'availableBall_'+ballColor, '', _('Move up this ball') );
        },

        updateAvailablePlayerBalls: function( availableBalls, ballColor )
        {
            // Remove current available ball selections
            this.removeTooltipFromClass( 'availableBall_'+ballColor );
            //this.addTooltipToClass( 'availableBall_'+ballColor, '', '' );
            dojo.query( '.availableBall_'+ballColor ).removeClass( 'availableBall_'+ballColor );
            this.get3dPositionsForEach(position => this.makeSelectable(position, false));

            for ( var id in availableBalls )
            {
                console.log( 'ball_selection_'+ballColor+'_'+availableBalls[id]['X']+'_'+
                                               availableBalls[id]['Y']+'_'+
                                               availableBalls[id]['Z'] );
                // x,y,z is a available ball
                var ball_selection = 'ball_selection_'+ballColor+'_'+availableBalls[id]['X']+'_'+
                                                                     availableBalls[id]['Y']+'_'+
                                                                     availableBalls[id]['Z'];

                dojo.addClass( ball_selection, 'availableBall_'+ballColor );
                this.makeSelectable(this.positions3d[Number(availableBalls[id]['X'])][Number(availableBalls[id]['Y'])][Number(availableBalls[id]['Z'])], true);
                //dojo.style( $(ball_selection), 'zIndex', 5 );

            }
            this.addTooltipToClass( 'availableBall_'+ballColor, '', _('Return this ball') );
        },

        removeTooltipFromClass: function(classtoremove)
        {
            var queueEntries = dojo.query( "."+classtoremove );

            for (var i = 0;  i < queueEntries.length; i++) 
            {  
                var child = queueEntries[i];
                this.removeTooltip(child.id);
            }
        },

        updateScores: function( scores )
        {    
            for ( var id in scores )
            {
                var score = scores[id];

                // Update score
                this.scoreCtrl[id].setValue( score['score'] );
            }
        },

        addLevel2: function()
        {
            this.isShowLevel0 = true;
            this.addEventToClass( "level_2", "onclick", "onShowLevel0Ball");
            this.addTooltipToClass( 'level_2', _('Click on the ball to show a ball of first level under it'), '' );
        },

        removeLevel2: function()
        {
            this.isShowLevel0 = false;
            this.removeTooltipFromClass( 'level_2' );
            dojo.query( '.level_2' ).removeClass( 'level_2' );
            dojo.query( '.blink' ).removeClass( 'blink' );
        },

        removeBlink: function()
        {
            dojo.query( '.blink' ).removeClass( 'blink' );
        },

        ///////////////////////////////////////////////////
        //// Player's action

        /*

            Here, you are defining methods to handle player's action (ex: results of mouse click on
            game objects).

            Most of the time, these methods:
            _ check the action is possible at this game state.
            _ make a call to the game server

        */

        /* Example:

        onMyMethodToCall1: function( evt )
        {
            console.log( 'onMyMethodToCall1' );

            // Preventing default browser reaction
            dojo.stopEvent( evt );

            // Check that this action is possible (see "possibleactions" in states.inc.php)
            if( ! this.checkAction( 'myAction' ) )
            {   return; }

            this.ajaxcall( "/pylosd/pylosd/myAction.html", {
                                                                    lock: true,
                                                                    myArgument1: arg1,
                                                                    myArgument2: arg2,
                                                                    ...
                                                                 },
                         this, function( result ) {

                            // What to do after the server call if it succeeded
                            // (most of the time: nothing)

                         }, function( is_error) {

                            // What to do after the server call in anyway (success or failure)
                            // (most of the time: nothing)

                         } );
        },

        */

        onPlaceOrMoveUpBall: function( evt )
        {
            // Stop this event propagation
            evt.preventDefault();
            dojo.stopEvent( evt );

            // Note: position selection id format is "pos_selection_X_Y_Z"
            var coords = evt.currentTarget.id.split('_');
            var pos_x = coords[2];
            var pos_y = coords[3];
            var pos_z = coords[4];

            var ball_x = this.gameConstants['BALL_FROM_RESERVE'];
            var ball_y = this.gameConstants['BALL_FROM_RESERVE'];
            var ball_z = this.gameConstants['BALL_FROM_RESERVE'];

            if (this.selectedBall)
            { // move up the ball
                ball_x = this.selectedBall['X'];
                ball_y = this.selectedBall['Y'];
                ball_z = this.selectedBall['Z'];
            }

            if ( ! dojo.hasClass( 'pos_selection_'+pos_x+'_'+pos_y+'_'+pos_z, 'availablePosition' ) )
            {
                // This is a unavailable position => the click does nothing
                return;
            }

            if ( this.checkAction( 'playBall' ) )    // Check that this action is possible at this moment
            {
                this.ajaxcall( "/pylosd/pylosd/playBall.html", {
                    lock: true,
                    ball_coord_x: ball_x,
                    ball_coord_y: ball_y,
                    ball_coord_z: ball_z,
                    pos_coord_x: pos_x,
                    pos_coord_y: pos_y,
                    pos_coord_z: pos_z
                }, this, function( result ) {}, function( is_error ) {} );
            }
        },

        onSelectOrReturnBall: function( evt )
        {
            // Stop this event propagation
            evt.preventDefault();
            dojo.stopEvent( evt );

            // Note: ball selection id format is "ball_selection_light_X_Y_Z" or "ball_selection_dark_X_Y_Z"
            var params = evt.currentTarget.id.split('_');
            var color = params[2];
            var x = params[3];
            var y = params[4];
            var z = params[5];

            if( ! dojo.hasClass( 'ball_selection_'+color+'_'+x+'_'+y+'_'+z, 'availableBall_'+color ) )
            {
                // This is a unavailable ball => the click does nothing
                return;
            }

            if ( !this.selectedBallForMoveUp && !this.selectedBallForReturn )
                return;

            // Remove current available ball selection
            this.removeTooltipFromClass( 'availableBall_'+color );
            //this.addTooltipToClass( 'availableBall_'+color, '', '' );
            dojo.query( '.availableBall_'+this.ballColor ).removeClass( 'availableBall_'+color );
            this.get3dPositionsForEach(position => this.makeSelectable(position, false));

            if ( this.selectedBallForMoveUp )
            {
                // Create a ball selection
                dojo.place( this.format_block('jstpl_ball_selected', { x:x, y:y, z:z, color:color } ), $( board ) );

                dojo.style( $( 'ball_selected_'+color+'_'+x+'_'+y+'_'+z ), 'zIndex', 10 );
                dojo.connect( $( 'ball_selected_'+color+'_'+x+'_'+y+'_'+z ), 'onclick', this, 'onDeselectBall');

                // Place it on the board
                this.placeOnObject( $( 'ball_selected_'+color+'_'+x+'_'+y+'_'+z ), $( 'ball_'+x+'_'+y+'_'+z ) );

                this.selectedBall = { 'X':parseInt(x), 'Y':parseInt(y), 'Z':parseInt(z) };
                this.updateAvailablePositions( this.availablePositions, this.selectedBall );
            }
            else if ( this.selectedBallForReturn )
            {
                var url, action;
                if (this.returnBallNumber == 1)
                {
                    action = "returnFirstBall";
                    url = "/pylosd/pylosd/returnFirstBall.html";
                }
                else
                {
                    action = "returnSecondBall";
                    url = "/pylosd/pylosd/returnSecondBall.html";
                }

                if ( this.checkAction( action ) )    // Check that this action is possible at this moment
                {
                    this.ajaxcall( url, { lock: true, ball_coord_x: x, ball_coord_y: y, ball_coord_z: z },
                                   this, function( result ) {}, function( is_error ) {} );
                }
            }
        },

        onDeselectBall: function( evt )
        {
            // Stop this event propagation
            evt.preventDefault();
            dojo.stopEvent( evt );

            // Note: ball selected id format is "ball_selected_light_X_Y_Z" or "ball_selected_dark_X_Y_Z"
            var params = evt.currentTarget.id.split('_');
            var color = params[2];
            var x = params[3];
            var y = params[4];
            var z = params[5];

            dojo.destroy('ball_selected_'+color+'_'+x+'_'+y+'_'+z);

            if ( !this.selectedBallForMoveUp )
                return;

            if ( this.selectedBallForMoveUp )
            {
                // Remove current available positions
                this.removeTooltipFromClass( 'availablePosition' );
                //this.addTooltipToClass( 'availablePosition', '', '' );
                dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
                this.remove3dAvailablePositions();

                this.updateAvailableMoveUpBalls( this.availableMoveUpBalls, color );
                this.selectedBall = null;
            }
        },

        onShowLevel0Ball: function( evt )
        {
            // Stop this event propagation
            evt.preventDefault();
            dojo.stopEvent( evt );

            if (!this.isShowLevel0)
                return;

            var params = evt.currentTarget.id.split('_');
            var x = params[1];
            var y = params[2];
            var z = params[3];

            dojo.query( '.blink' ).removeClass( 'blink' );
            setTimeout(this.addBlinkByTimeout, 500, 'ball_'+x+'_'+y+'_'+z);
        },

        addBlinkByTimeout: function(ball)
        {
            dojo.addClass( ball, 'blink' );
        },

        onPlaceBallButtonClicked: function()
        {
            // Remove current available positions
            this.removeTooltipFromClass( 'availablePosition' );
            //this.addTooltipToClass( 'availablePosition', '', '' );
            dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
            this.remove3dAvailablePositions();

            // Remove current available ball selections
            this.removeTooltipFromClass( 'availableBall_'+this.ballColor );
            //this.addTooltipToClass( 'availableBall_'+this.ballColor, '', '' );
            dojo.query( '.availableBall_'+this.ballColor ).removeClass( 'availableBall_'+this.ballColor );
            this.get3dPositionsForEach(position => this.makeSelectable(position, false));
            if (this.selectedBall)
            {
                dojo.destroy('ball_selected_'+this.ballColor+'_'+this.selectedBall.X+'_'+this.selectedBall.Y+'_'+this.selectedBall.Z);
                this.selectedBall = null;
            }

            dojo.destroy('buttonPlaceBall');
            this.updateAvailablePositions( this.availablePositions, null );
            this.addActionButton( 'buttonMoveUpBall', _('Move up a ball'), 'onMoveUpBallButtonClicked' );

        },

        onMoveUpBallButtonClicked: function()
        {
            // Remove current available positions
            this.removeTooltipFromClass( 'availablePosition' );
            //this.addTooltipToClass( 'availablePosition', '', '' );
            dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
            this.remove3dAvailablePositions();

            dojo.destroy('buttonMoveUpBall');
            this.selectedBallForMoveUp = true;
            this.updateAvailableMoveUpBalls( this.availableMoveUpBalls, this.ballColor );
            this.addActionButton( 'buttonPlaceBall', _('Place a ball'), 'onPlaceBallButtonClicked' );
        },

        onCancelReturnButtonClicked: function()
        {
            if ( this.checkAction( 'returnSecondBall' ) )    // Check that this action is possible at this moment
            {
                var reserve = this.gameConstants['BALL_FROM_RESERVE'];
                this.ajaxcall( "/pylosd/pylosd/returnSecondBall.html",
                               { lock: true, ball_coord_x: reserve, ball_coord_y: reserve, ball_coord_z: reserve },
                               this, function( result ) {}, function( is_error ) {} );
            }
        },

        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:

            In this method, you associate each of your game notifications with your local method to handle it.

            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your pylos.game.php file.

        */
        setupNotifications: function()
        {
            console.log( 'notifications subscriptions setup' );

            // TODO: here, associate your game notifications with local methods

            // Example 1: standard notification handling
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );

            // Example 2: standard notification handling + tell the user interface to wait
            //            during 3 seconds after calling the method in order to let the players
            //            see what is happening in the game.
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            // this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            //
            dojo.subscribe( 'ballPlaced', this, "notif_ballPlaced" );
            this.notifqueue.setSynchronous( 'ballPlaced', 1000 );

            dojo.subscribe( 'ballMovedUp', this, "notif_ballMovedUp" );
            this.notifqueue.setSynchronous( 'ballMovedUp', 1000 );

            dojo.subscribe( 'ballReturned', this, "notif_ballReturned" );
            this.notifqueue.setSynchronous( 'ballReturned', 1100 );

            dojo.subscribe( 'returnCanceled', this, "notif_returnCanceled" );

            dojo.subscribe( 'piramidCompleted', this, "notif_piramidCompleted" );
	        this.notifqueue.setSynchronous( 'piramidCompleted', 3500 );

            dojo.subscribe( 'finalScore', this, "notif_finalScore" );
	        //this.notifqueue.setSynchronous( 'finalScore', 1500 );
        },

        // TODO: from this point and below, you can write your game notifications handling methods

        /*
        Example:

        notif_cardPlayed: function( notif )
        {
            console.log( 'notif_cardPlayed' );
            console.log( notif );

            // Note: notif.args contains the arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call

            // TODO: play the card in the user interface.
        },

        */

        notif_ballPlaced: function( notif )
        {
	        console.log( '**** Notification : ballPlaced' );
            console.log( notif );

            this.removeBlink(); 

            if ( this.isCurrentPlayerActive() )
            {
                this.removeTooltipFromClass( 'availablePosition' );
                //this.addTooltipToClass( 'availablePosition', '', '' );
                dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
                this.remove3dAvailablePositions();
            }

            var ball = 'ball_' + notif.args.coord_x + '_' + notif.args.coord_y + '_' + notif.args.coord_z;

            // Create a ball
            dojo.place( this.format_block('jstpl_ball', {
                    ball_color:'ball_' + notif.args.color,
                    x:notif.args.coord_x,
                    y:notif.args.coord_y,
                    z:notif.args.coord_z
                } ), $( board ) );

            // Place it on the player panel
            this.placeOnObject( $( ball ), $( 'ballicon_p' + notif.args.player_id ) );// $( 'player_board_' + notif.args.player_id ) );

            // Animate a slide from the player panel to the position
            dojo.style( ball, 'zIndex', 10 );

            var x_pix = this.getBallXPixelCoordinate(notif.args.coord_x, notif.args.coord_z);
            var y_pix = this.getBallYPixelCoordinate(notif.args.coord_y, notif.args.coord_z);

            var slide = this.slideToObjectPos( $( ball ), $( board ), x_pix, y_pix, 1000 );
            dojo.connect( slide, 'onEnd', this, dojo.hitch( this, function() {
                    dojo.style( $(ball), 'zIndex', (parseInt(notif.args.coord_z)+1) );
                    if (parseInt(notif.args.coord_z) == 2)
                    {
                        dojo.addClass( 'ball_'+notif.args.coord_x+'_'+notif.args.coord_y+'_'+notif.args.coord_z, 'level_2' );
                        this.addLevel2();
                    }
       		            }));
            slide.play();

            const position = this.positions3d[Number(notif.args.coord_x)][Number(notif.args.coord_y)][Number(notif.args.coord_z)];
            position.color = notif.args.color;
            position.selectable = false;
            position.selected = false;
            position.object = this.reserveBalls[notif.args.color].pop();
            position.object.gameInfos = position;

            if (this.active3d) {
                this.moving.object = position.object;
                this.moving.from = position.object.position;
                this.moving.to = position.coordinates;
                this.moving.progress = 0;
            }

            if (parseInt(notif.args.coord_z) == 3)
                this.removeLevel2();

            // Counters
	        this.updateCounters(notif.args.counters);
        },

        notif_ballMovedUp: function( notif )
        {
	        console.log( '**** Notification : ballMovedUp' );
            console.log( notif );

            this.removeBlink(); 

            if ( this.isCurrentPlayerActive() )
            {
                this.removeTooltipFromClass( 'availablePosition' );
                //this.addTooltipToClass( 'availablePosition', '', '' );
                dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
                this.remove3dAvailablePositions();
                dojo.destroy('ball_selected_'+notif.args.color+'_'+notif.args.from_coord_x+'_'+notif.args.from_coord_y+'_'+notif.args.from_coord_z);
            }

            var fromBall = 'ball_' + notif.args.from_coord_x + '_' + notif.args.from_coord_y + '_' + notif.args.from_coord_z;
            var toBall = 'ball_' + notif.args.to_coord_x + '_' + notif.args.to_coord_y + '_' + notif.args.to_coord_z;

            // Create a moved ball
            dojo.place( this.format_block('jstpl_ball', {
                    ball_color:'ball_' + notif.args.color,
                    x:notif.args.to_coord_x,
                    y:notif.args.to_coord_y,
                    z:notif.args.to_coord_z
                } ), $( board ) );


            this.placeOnObject( $( toBall ), $( fromBall ) );
            dojo.destroy(fromBall);

            dojo.style( toBall, 'zIndex', 10 );

            var x_pix = this.getBallXPixelCoordinate(notif.args.to_coord_x, notif.args.to_coord_z);
            var y_pix = this.getBallYPixelCoordinate(notif.args.to_coord_y, notif.args.to_coord_z);

            var slide = this.slideToObjectPos( $( toBall ), $( board ), x_pix, y_pix, 1000 );
            dojo.connect( slide, 'onEnd', this, dojo.hitch( this, function() {
                    dojo.style( $(toBall), 'zIndex', (parseInt(notif.args.to_coord_z)+1) );
                    if (parseInt(notif.args.to_coord_z) == 2)
                    {
                        dojo.addClass( 'ball_'+notif.args.to_coord_x+'_'+notif.args.to_coord_y+'_'+notif.args.to_coord_z, 'level_2' );
                        this.addLevel2();
                    }
       		            }));
            slide.play();

            const fromPosition = this.positions3d[Number(notif.args.from_coord_x)][Number(notif.args.from_coord_y)][Number(notif.args.from_coord_z)];
            const toPosition = this.positions3d[Number(notif.args.to_coord_x)][Number(notif.args.to_coord_y)][Number(notif.args.to_coord_z)];
            toPosition.object = fromPosition.object;
            toPosition.color = fromPosition.color;
            toPosition.object.gameInfos = toPosition;
            fromPosition.object = null;
            fromPosition.color = null;
            fromPosition.selectable = false;
            fromPosition.selected = false;
            toPosition.selectable = false;
            toPosition.selected = false;
            if (this.active3d) {
				this.moving.object = toPosition.object;
				this.moving.from = fromPosition.coordinates;
				this.moving.to = toPosition.coordinates;
				this.moving.progress = 0;
            }

            // Counters
	        this.updateCounters(notif.args.counters);

        },

        notif_ballReturned: function( notif )
        {
	        console.log( '**** Notification : ballReturned' );
            console.log( notif );

            this.removeBlink(); 

            if ( this.isCurrentPlayerActive() )
            {
                // Remove current available ball selections
                this.removeTooltipFromClass( 'availableBall_'+this.ballColor );
                //this.addTooltipToClass( 'availableBall_'+this.ballColor, '', '' );
                dojo.query( '.availableBall_'+this.ballColor ).removeClass( 'availableBall_'+this.ballColor );
                this.get3dPositionsForEach(position => this.makeSelectable(position, false));

                dojo.destroy('ball_selected_'+notif.args.color+'_'+notif.args.coord_x+'_'+notif.args.coord_y+'_'+notif.args.coord_z);
            }

            var returnBall = 'ball_' + notif.args.coord_x + '_' + notif.args.coord_y + '_' + notif.args.coord_z;
            dojo.style( returnBall, 'zIndex', 10 );

            var slide = this.slideToObject( $( returnBall ), $( 'ballicon_p' + notif.args.player_id ), 1000 );
            dojo.connect( slide, 'onEnd', this, dojo.hitch( this, function() {
                    dojo.destroy(returnBall);
                    this.updateCounters(notif.args.counters);
       		            }));
            slide.play();

            const position = this.positions3d[Number(notif.args.coord_x)][Number(notif.args.coord_y)][Number(notif.args.coord_z)];
            position.selected = false;
            position.selectable = false;
            position.color = null;
            const color = notif.args.color;
            if (this.active3d) {
				this.moving.object = position.object;
				this.moving.from = position.coordinates;
				this.moving.to = this.getReservePosition(this.reserveBalls[color].length, color === 'light' ? -1 : 1);
				this.moving.progress = 0;
            }
            this.reserveBalls[color].push(position.object);
            position.object.gameInfos = null;
            position.object = null;
        },

        notif_returnCanceled: function( notif )
        {
        	console.log( '**** Notification : returnCanceled' );
            console.log( notif );

            if ( this.isCurrentPlayerActive() )
            {
                // Remove current available ball selections
                this.removeTooltipFromClass( 'availableBall_'+this.ballColor );
                //this.addTooltipToClass( 'availableBall_'+this.ballColor, '', '' );
                dojo.query( '.availableBall_'+this.ballColor ).removeClass( 'availableBall_'+this.ballColor );
                this.get3dPositionsForEach(position => this.makeSelectable(position, false));
            }
        },

        notif_piramidCompleted: function( notif )
        {
	        console.log( '**** Notification : piramidCompleted' );
            console.log( notif );

            var num = 0;
            var balls = [];
            var zIndexes = [];

            this.removeLevel2();

            for ( var id in notif.args.balls_piramid )
            {
               var ball_piramid = notif.args.balls_piramid[id];

               balls[num] = 'ball_' + ball_piramid.coord_x + '_' + ball_piramid.coord_y + '_' + ball_piramid.coord_z;
               zIndexes[num] = (parseInt(ball_piramid.coord_z)+1);

               // Create a ball
               dojo.place( this.format_block('jstpl_ball', {
                        ball_color:'ball_' + notif.args.color,
                        x:ball_piramid.coord_x,
                        y:ball_piramid.coord_y,
                        z:ball_piramid.coord_z
                    } ), $( board ) );

               // Place it on the player panel
               this.placeOnObject( $( balls[num] ), $( 'ballicon_p' + notif.args.player_id ) );

               // Animate a slide from the player panel to the position
               dojo.style( balls[num], 'zIndex', 10); //(parseInt(ball_piramid.coord_z)+1) );

               var x_pix = this.getBallXPixelCoordinate(ball_piramid.coord_x, ball_piramid.coord_z);
               var y_pix = this.getBallYPixelCoordinate(ball_piramid.coord_y, ball_piramid.coord_z);

               var slide = this.slideToObjectPos( $( balls[num] ), $( board ), x_pix, y_pix, 1000, 250*num );
               dojo.connect( slide, 'onEnd', this, dojo.hitch( this, function(num) {
                        dojo.style( balls[num], 'zIndex', zIndexes[num] );
       		                }));
               slide.play();
               num++;
            }

            // Counters
	        this.updateCounters(notif.args.counters);
        },

        notif_finalScore: function( notif )
	    {
	        console.log( '**** Notification : finalScore' );
	        console.log( notif );

            // Update score
            this.updateScores( notif.args.scores );
	    },

        loadJsFileAsync: function(fileName) {
            if (document.getElementById(fileName)) {
                /*return this.loading[fileName] ||*/ Promise.resolve();
            }

            const headTag = document.getElementsByTagName('head')[0];         
            const newScriptTag = document.createElement('script');
            newScriptTag.type = 'text/javascript';
            newScriptTag.src = fileName;
            newScriptTag.id = fileName;
            newScriptTag.async = true;
            

            const promise = new Promise((resolve) => {
                newScriptTag.onload = (() => {
                    resolve();
                    //this.loading[fileName] = null;
                });
            });
            
            headTag.appendChild(newScriptTag);

            //this.loading[fileName] = promise;
            return promise;
        },

        loadAndCreate3d: function() {
            if (!this.loaded3d) {
                this.loadJsFileAsync(g_gamethemeurl + "modules/three.module.js").then(
                    () => this.loadJsFileAsync(g_gamethemeurl + "modules/OrbitControls.js").then(
                        () => this.loadJsFileAsync(g_gamethemeurl + "modules/GLTFLoader.js").then(() => {
                            this.create3d();
                            this.loaded3d = true;
                        })
                    )
                );
            }
        },

        create3d: function() {
            THREE = window.THREE;
            this.mouse = new THREE.Vector2();
            //const frustumSize = 1000;
            this.moving = {
                object: null,
                from: null,
                to: null,
                progress: 0
            };

            this.init();
            //initCamera();
            this.animate();
        },

		gamePositionToPosition: function(left, top, row) {
			return {
				x: this.radius * (left * 2 - top - 1) * 1.03,
				y: this.radius * (-top * (3 / 2) + 4) + top*5 - 70,
				z: this.radius * (-row * 2 + top + 1) * 1.03,
			};
		},

		initCamera: function() {
			const aspect = container.clientWidth / container.clientHeight;
			//camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 1000);

			this.camera = new THREE.PerspectiveCamera(40, aspect, 10, 5000);
			this.camera.position.set(0, 1500, 700);
		},

		initLights: function() {
			// LIGHTS
			/*const light = new THREE.DirectionalLight( 0xffffff, 1 );
			light.position.set( 1, 1, 1 ).normalize();
			scene.add( light );*/

			this.scene.add(new THREE.AmbientLight(0x707070));

			// light
			const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
			directionalLight.position.set(10, 50, 10);
			this.scene.add(directionalLight);
		},

		createBall: function(color) {


			//const texture = new THREE.TextureLoader().load('./wood.jpeg');
			const material = new THREE.MeshStandardMaterial({
				color: this.config3d[color + 'Color'],
				roughness: 0.2,
			});

			//const textureMaterial = new THREE.MeshBasicMaterial({ map: texture });

			const object = new THREE.Mesh(this.ballGeometry, material/*textureMaterial*/);

			return object;
		},

        map2dPositionTo3dPosition: function(position) {
            return {
                x: Number(position.coord_x),
                y: Number(position.coord_y), 
                z: Number(position.coord_z),
                color: position.ball_color || position.color
            };
        },

        play3dBall: function(position) {
            const object = this.createBall(position.color);
            object.position.set(position.coordinates.x, position.coordinates.y, position.coordinates.z);

            this.scene.add(object);
            position.object = object;
            object.gameInfos = position;
        },

        add3dAvailablePosition: function(position) {
            const material = new THREE.MeshStandardMaterial({ color: this.config3d.whiteColor, opacity: 0.5, transparent: true });
            const object = new THREE.Mesh(this.ballGeometry, material);
            object.position.set(position.coordinates.x, position.coordinates.y, position.coordinates.z);
            this.scene.add(object);
            position.object = object;
            object.gameInfos = position;
        },

        remove3dAvailablePositions: function() {
            this.get3dPositionsForEach(position => {
                if (position.color === 'white') {
                    position.color = null;

                    if (this.active3d && position.object) {
                        this.scene.remove(position.object);
                        position.object = null;
                    }
                }
            });
        },

        get3dPositionsForEach: function(positionCallBack) {            
            for (let row = 0; row < 4; row++) {
                const ballsByRow = 4 - row;
                for (let i = 0; i < Math.pow(ballsByRow, 2); i++) {
                    const x = i % ballsByRow;
                    const y = Math.floor(i / ballsByRow);
                    positionCallBack(this.positions3d[x][y][row]);
                }
            }
        },

        makeSelectable: function(position, selectable) {
            position.selectable = selectable;
            if (!selectable) {
                position.selected = false;
            }
            if (position.object) {
                this.setBallColor(position.object);
            }
        },

        makeSelected: function(position, selected) {
            position.selected = selected;
            if (position.object) {
                this.setBallColor(position.object);
            }
        },

        getReservePosition: function(index, side) {
            return {
                x: side * this.radius * (11.5+Math.floor(index / 5)*2),
                y: -100, 
                z: (1 - 5 + ((index % 5) * 2)) * this.radius
            };
        },

        initPlate: function() {
			new GLTFLoader().setPath( '' ).load( g_gamethemeurl + 'modules/pylosplate.glb', gltf => {
				const mesh = gltf.scene.children[0];
				const meshGeometry = mesh.geometry;
				
				const material = new THREE.MeshStandardMaterial({ color: 0x50130A, side: THREE.DoubleSide });
				const plate = new THREE.Mesh(meshGeometry, material);
                const boxSize = 215;
				plate.scale.set(boxSize, 5, boxSize);
				plate.position.set(-5, -115, -10);
				plate.rotateY(-Math.PI / 2);
				this.scene.add( plate );
			});
        },

		init: function() {
			this.container = document.getElementById('container');
			//container = document.createElement('div');
			//document.body.appendChild(container);

			this.scene = new THREE.Scene();
			//scene.background = new THREE.Color(0xf0f0f0);

			this.initCamera();
			this.initLights();
            this.initPlate();

			this.ballGeometry = new THREE.SphereGeometry(this.radius, 32, 32);

            this.get3dPositionsForEach(position => {
                        
                const color = position.color;
                if (color === 'light' || color === 'dark') {
                    this.play3dBall(position);
                } else if (color === 'white') {
                    position.selectable = true;
                    this.add3dAvailablePosition(position);
                }
            });


            this.reserveBalls = [];
            this.reserveBalls['light'] = [];
            this.reserveBalls['dark'] = [];
			['light', 'dark'].forEach((color, index) => {
                const side = index === 0 ? -1 : 1;
                let nbrStock = 15;
                
                this.get3dPositionsForEach(position => {
                    if (position.color === color) {
                        nbrStock--;
                    }
                });

				for (let i = 0; i < nbrStock; i++) {
					const object = this.createBall(color);

					//object.position.set(side * this.radius * (9+Math.floor(i / size)*2), -100, (1 - size + ((i % 8) * 2) + Math.floor(i / size)) * this.radius);
                    const position = this.getReservePosition(i, side);
                    object.position.set(position.x, position.y, position.z);

					this.scene.add(object);

					this.reserveBalls[color].push(object);
				}
			});

			const geometry = new THREE.PlaneGeometry(500000, 500000);			

			const texture = new THREE.TextureLoader().load(g_gamethemeurl + 'img/back-main.jpg');
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.repeat.set( 500, 500 );
			const backgroundMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide});
			const plane = new THREE.Mesh( geometry, backgroundMaterial );
			plane.rotateX(Math.PI/2);
			plane.position.y = -(100+this.radius);
			this.scene.add( plane );

			this.raycaster = new THREE.Raycaster();

			this.renderer = new THREE.WebGLRenderer({ antialias: true } /*{ alpha: true }*/ );
			/*this.renderer.setClearColor( 0x000000, 0 );*/
			this.renderer.setPixelRatio(window.devicePixelRatio);
			this.renderer.setSize(container.clientWidth, container.clientHeight);
			this.container.appendChild(this.renderer.domElement);

			this.controls = new OrbitControls(this.camera, this.renderer.domElement);

			this.controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
			this.controls.dampingFactor = 0.05;

			this.controls.screenSpacePanning = false;

			this.controls.minDistance = 100;
			this.controls.maxDistance = 500;

			this.controls.maxPolarAngle = Math.PI / 2;


			this.controls.update();

			document.addEventListener('mousemove', e => this.onDocumentMouseMove(e));
			document.addEventListener('click', e => this.onDocumentClick(e));

			//

			window.addEventListener('resize', e => this.onWindowResize(e));

            this.active3d = true;
		},

		onWindowResize: function() {

			const aspect = this.container.clientWidth / this.container.clientHeight;

			/*camera.left = - frustumSize * aspect / 2;
			camera.right = frustumSize * aspect / 2;
			camera.top = frustumSize / 2;
			camera.bottom = - frustumSize / 2;*/
			this.camera.aspect = aspect;

			this.camera.updateProjectionMatrix();

			//const ratio = 1400 / container.clientWidth;
			//controls.maxDistance = 400 * ratio;
			//controls.update();
			this.camera.zoom = this.container.clientWidth / 1335;

			this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

		},

		onDocumentMouseMove: function(event) {

			event.preventDefault();

			this.mouse.x = (event.offsetX / this.container.clientWidth) * 2 - 1;
			this.mouse.y = - (event.offsetY / this.container.clientHeight) * 2 + 1;

		},

		onDocumentClick: function(event) {

			event.preventDefault();

			this.mouse.x = (event.offsetX / this.container.clientWidth) * 2 - 1;
			this.mouse.y = - (event.offsetY / this.container.clientHeight) * 2 + 1;

			if (this.INTERSECTED && this.INTERSECTED.gameInfos) {

                const whiteBall = this.INTERSECTED.gameInfos.color === 'white';
                const method = whiteBall ? 'onPlaceOrMoveUpBall' : 'onSelectOrReturnBall';
                const divId = whiteBall ? this.INTERSECTED.gameInfos.oldId : 
                  this.INTERSECTED.gameInfos.oldId.replace('pos_selection', 'ball_selection_'+  this.INTERSECTED.gameInfos.color);

                this[method]({
                    preventDefault: () => {},
                    stopPropagation: () => {},
                    currentTarget: {
                        id: divId
                    }
                });

			}
		},

		animate: function() {

			requestAnimationFrame(() => this.animate());

			this.render();
		},

		progressPosition: function(from, to, progress) {
			return from + (to - from) * progress;
		},

		squareCurve: function(progress, multiplier) {
			return (1-Math.pow((progress-0.5), 2)*4)*multiplier;
		},

		updateMovingPosition: function() {
			this.moving.progress += 0.015;
			if (this.moving.progress > 1) {
				this.moving.progress = 1;
			}
			this.moving.object.position.set(
				this.progressPosition(this.moving.from.x, this.moving.to.x, this.moving.progress),
				this.progressPosition(this.moving.from.y, this.moving.to.y, this.moving.progress) + this.squareCurve(this.moving.progress, this.radius*2),
				this.progressPosition(this.moving.from.z, this.moving.to.z, this.moving.progress)
			);

			if (this.moving.progress >= 1) {
                this.moving.object.position.set(this.moving.to.x, this.moving.to.y, this.moving.to.z);
				this.moving.object = null;
			}
		},

        setBallColor: function(object) {
            const position = object.gameInfos;
            if (position && object) {
                object.material.color.setHex(
                    this.config3d[position.color + (position.selected ? 'SelectedColor' : (position.selectable ? 'SelectableColor' : 'Color'))]
                );
            }
        },

        resetOldIntersected: function() {
            if (this.INTERSECTED && this.INTERSECTED.gameInfos && this.INTERSECTED.gameInfos.color) {
                this.setBallColor(this.INTERSECTED);
            }
            this.INTERSECTED = null;
        },

		render: function() {
			if (this.moving.object) {
				this.updateMovingPosition();
			}

			// find intersections
			this.raycaster.setFromCamera(this.mouse, this.camera);

			const intersects = this.raycaster.intersectObjects(this.scene.children);

			if (intersects.length > 0) {

				if (this.INTERSECTED !== intersects[0].object) {
                    this.resetOldIntersected();

                    if (intersects[0].object.gameInfos && intersects[0].object.gameInfos.selectable) {
                        this.INTERSECTED = intersects[0].object;
                        this.INTERSECTED.material.color.setHex(this.config3d.hoverColor);
                    }
				}

			} else {
				this.resetOldIntersected();
			}

			this.renderer.render(this.scene, this.camera);

		}
   });
});

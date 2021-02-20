declare const define;
declare const ebg;
declare const $;
declare const dojo: Dojo;
declare const _;
declare const g_gamethemeurl;

declare const board: HTMLDivElement;

class Pylos implements Game {

    // Game constants
    gameConstants: GameConstants = null;

    // Array of current dojo connections (needed for method addEventToClass)
    connections = [];

    moveUpBallsPresent = false;
    availablePositions = null;
    availableMoveUpBalls = null;
    availablePlayerBalls = null;
    selectedBall = null;
    returnBallNumber = 0;
    selectedBallForMoveUp = false;
    selectedBallForReturn = false;
    ballColor = null;
    isShowLevel0 = true;

    loaded3d = false;
    active3d = false;
    mode3d = false;
    radius = 25;
    config3d = {
        lightColor: 0xe08f38,
        darkColor: 0x3a2319,
        whiteColor: 0xffffff,
        hoverColor: 0x0000ff
    };
    positions3d: Position3D[][][] = []; // x y z, 0 indexed
    renderer: any;
    container: HTMLDivElement;
    reserveBalls;
    moving: Moving[] = [];
    THREE;
    mouse;
    camera;
    scene;
    ballTextures;
    ballGeometry;
    raycaster;
    controls;
    INTERSECTED;

    constructor() {
        // Here, you can init the global variables of your user interface
        // Example:
        // this.myGlobalValue = 0;            
        
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
    }
    
    /*
        setup:

        This method must set up the game user interface according to current game situation specified
        in parameters.

        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)

        "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
    */

    public setup(gamedatas: PylosGamedatas) {
        
        console.log( "Starting game setup" );

        this.gameConstants = gamedatas.constants;

        // Setting up player boards
        for( var player_id in gamedatas.players )
        {
            var player = gamedatas.players[player_id];

            // Setting up players boards if needed
            var player_board_div = $('player_board_'+player_id);

            dojo.place( (this as any).format_block( 'jstpl_player_board', {
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
                dojo.place( (this as any).format_block('jstpl_ball', {
                    x: position.coord_x,
                    y: position.coord_y,
                    z: position.coord_z,
                    ball_color: 'ball_' + position.ball_color
                } ), $ ( 'board' ) );
                dojo.style( 'ball_'+position.coord_x+'_'+position.coord_y+'_'+position.coord_z,
                            'zIndex',  parseInt(position.coord_z)+1 );

                this.positions3d[Number(position.coord_x)][Number(position.coord_y)][Number(position.coord_z)].color = position.ball_color;

                (this as any).slideToObjectPos( $('ball_'+position.coord_x+'_'+position.coord_y+'_'+position.coord_z),
                                       $('board'), x_pix, y_pix, 10).play();

                if (parseInt(position.coord_z) == 2) {
                    dojo.addClass( 'ball_'+position.coord_x+'_'+position.coord_y+'_'+position.coord_z, 'level_2' );
                }
            }
        }

        // TODO: Set up your game interface here, according to "gamedatas"
        (this as any).addEventToClass( "pos_selection", "onclick", "onPlaceOrMoveUpBall");
        (this as any).addEventToClass( "ball_selection", "onclick", "onSelectOrReturnBall");

        // Init counters
        (this as any).updateCounters(gamedatas.counters);

        // Tooltips
        var tooltip = _('Number of balls in reserve');
        (this as any).addTooltipToClass( 'ballicon_dark', tooltip, '' );
        (this as any).addTooltipToClass( 'ballicon_light', tooltip, '' );
        (this as any).addTooltipToClass( 'ballcounter', tooltip, '' );

        this.addLevel2();

        // Setup game notifications to handle (see "setupNotifications" method below)
        this.setupNotifications();

        // TODO move on 3D click
        this.loadAndCreate3d();
        if (localStorage.getItem('pylosMode') === '3D') {
            this.switchMode({ target: document.getElementById('modeSelector') });
        }

        (this as any).addEventToClass( "ball_selection", "onclick", "onSelectOrReturnBall");
        dojo.query("#modeSelector").connect( 'onclick', this, 'switchMode' );

        console.log( "Ending game setup" );
    } 

    switchMode(e) {
        const button = e.target;

        if (button.innerHTML === '3D') {
            dojo.style( 'container', 'display', 'block' );
            dojo.style( 'game_background', 'display', 'none' );
            button.innerHTML = '2D';
            localStorage.setItem('pylosMode', '3D');
            if (this.renderer) {
                this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
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
    }

    getBallXPixelCoordinate( x: string, z: string ) {
        return (this.gameConstants['POSITION_X'+x+'_Z'+z] as number) - (this.gameConstants['BALL_WIDTH'] as number)/2;
    }

    getBallYPixelCoordinate( y: string, z: string ) {
        return (this.gameConstants['POSITION_Y'+y+'_Z'+z] as number) - (this.gameConstants['BALL_HEIGHT'] as number)/2;
    }

    ///////////////////////////////////////////////////
    //// Game & client states

    // onEnteringState: this method is called each time we are entering into a new game state.
    //                  You can use this method to perform some user interface changes at this moment.
    //
    public onEnteringState(stateName: string, args: any) {
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
            if ( (this as any).isCurrentPlayerActive() )
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
                        if ((this as any).archive_uuid === 999999) { // we hide message if in replay mode, else it hides replay controls
                            (this as any).showMessage( _('You can move up a ball'),  "info" );
                        }
                        (this as any).addActionButton( 'buttonMoveUpBall', _('Move up a ball'), 'onMoveUpBallButtonClicked' );
                    }
                }
            }
            break;

        case 'returnFirstBall':
        case 'returnSecondBall':
            if ( (this as any).isCurrentPlayerActive() )
            {
                this.ballColor = args.args.ballColor;
                this.selectedBall = null;
                this.availablePlayerBalls = args.args.availablePlayerBalls;

                this.selectedBallForMoveUp = false;
                this.selectedBallForReturn = true;
                this.updateAvailablePlayerBalls( args.args.availablePlayerBalls, args.args.ballColor );

                if ( stateName == 'returnSecondBall' )
                {
                    (this as any).addActionButton( 'buttonCancelReturn', _("Don't return"), 'onCancelReturnButtonClicked' );
                    this.returnBallNumber = 2;
                }
                else
                    this.returnBallNumber = 1;
            }
            break;
        }
    }
    

    // onLeavingState: this method is called each time we are leaving a game state.
    //                 You can use this method to perform some user interface changes at this moment.
    //
    public onLeavingState(stateName: string) {

    }

    // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
    //                        action status bar (ie: the HTML links in the status bar).
    //
    public onUpdateActionButtons(stateName: string, args: any) {

    } 
    

        ///////////////////////////////////////////////////
        //// Utility methods

        /*

            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.

        */

       updateAvailablePositions( availablePositions, moveUpBall )
       {
           // Remove current available positions
           this.removeTooltipFromClass( 'availablePosition' );
           //(this as any).addTooltipToClass( 'availablePosition', '', '' );
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
               const boudedPos = this.gameConstants['POS_BOUNDED_X'+availablePositions[id]['X']+
                                                         '_Y'+availablePositions[id]['Y']+
                                                         '_Z'+availablePositions[id]['Z']] as string;
               if (boudedPos != null)
               {
                   $(boudedPos).style.display = 'none';
                   dojo.addClass( boudedPos, 'availablePosition' );
               }
           }

           (this as any).addTooltipToClass( 'availablePosition', '', moveUpBall ? _('Move the ball here') : _('Place a ball here') );
       }

       updateAvailableMoveUpBalls( availableBalls, ballColor )
       {
           // Remove current available ball selections
           this.removeTooltipFromClass( 'availableBall_'+ballColor );
           //(this as any).addTooltipToClass( 'availableBall_'+ballColor, '', '' );
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
           (this as any).addTooltipToClass( 'availableBall_'+ballColor, '', _('Move up this ball') );
       }

       updateAvailablePlayerBalls( availableBalls, ballColor )
       {
           // Remove current available ball selections
           this.removeTooltipFromClass( 'availableBall_'+ballColor );
           //(this as any).addTooltipToClass( 'availableBall_'+ballColor, '', '' );
           dojo.query( '.availableBall_'+ballColor ).removeClass( 'availableBall_'+ballColor );
           this.get3dPositionsForEach(position => this.makeSelectable(position, false));

           for ( var id in availableBalls )
           {
               // x,y,z is a available ball
               var ball_selection = 'ball_selection_'+ballColor+'_'+availableBalls[id]['X']+'_'+
                                                                    availableBalls[id]['Y']+'_'+
                                                                    availableBalls[id]['Z'];

               dojo.addClass( ball_selection, 'availableBall_'+ballColor );
               this.makeSelectable(this.positions3d[Number(availableBalls[id]['X'])][Number(availableBalls[id]['Y'])][Number(availableBalls[id]['Z'])], true);
               //dojo.style( $(ball_selection), 'zIndex', 5 );

           }
           (this as any).addTooltipToClass( 'availableBall_'+ballColor, '', _('Return this ball') );
       }

       removeTooltipFromClass(classtoremove)
       {
           var queueEntries = dojo.query( "."+classtoremove );

           for (var i = 0;  i < queueEntries.length; i++) 
           {  
               var child = queueEntries[i];
               (this as any).removeTooltip(child.id);
           }
       }

       updateScores( scores )
       {    
           for ( var id in scores )
           {
               var score = scores[id];

               // Update score
               (this as any).scoreCtrl[id].setValue( score['score'] );
           }
       }

       addLevel2()
       {
           this.isShowLevel0 = true;
           (this as any).addEventToClass( "level_2", "onclick", "onShowLevel0Ball");
           (this as any).addTooltipToClass( 'level_2', _('Click on the ball to show a ball of first level under it'), '' );
       }

       removeLevel2()
       {
           this.isShowLevel0 = false;
           this.removeTooltipFromClass( 'level_2' );
           dojo.query( '.level_2' ).removeClass( 'level_2' );
           dojo.query( '.blink' ).removeClass( 'blink' );
       }

       removeBlink()
       {
           dojo.query( '.blink' ).removeClass( 'blink' );
       }

       ///////////////////////////////////////////////////
       //// Player's action

       /*

           Here, you are defining methods to handle player's action (ex: results of mouse click on
           game objects).

           Most of the time, these methods:
           _ check the action is possible at this game state.
           _ make a call to the game server

       */

       onPlaceOrMoveUpBall( evt )
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

           if ( (this as any).checkAction( 'playBall' ) )    // Check that this action is possible at this moment
           {
               (this as any).ajaxcall( "/pylosd/pylosd/playBall.html", {
                   lock: true,
                   ball_coord_x: ball_x,
                   ball_coord_y: ball_y,
                   ball_coord_z: ball_z,
                   pos_coord_x: pos_x,
                   pos_coord_y: pos_y,
                   pos_coord_z: pos_z
               }, this, () => {}, () => {});
           }
       }

       onSelectOrReturnBall( evt )
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
           //(this as any).addTooltipToClass( 'availableBall_'+color, '', '' );
           dojo.query( '.availableBall_'+this.ballColor ).removeClass( 'availableBall_'+color );
           this.get3dPositionsForEach(position => this.makeSelectable(position, false));

           if ( this.selectedBallForMoveUp ) {
               // Create a ball selection
               dojo.place( (this as any).format_block('jstpl_ball_selected', { x:x, y:y, z:z, color:color } ), $( board ) );

               dojo.style( $( 'ball_selected_'+color+'_'+x+'_'+y+'_'+z ), 'zIndex', 10 );
               dojo.connect( $( 'ball_selected_'+color+'_'+x+'_'+y+'_'+z ), 'onclick', this, 'onDeselectBall');

               // Place it on the board
               (this as any).placeOnObject( $( 'ball_selected_'+color+'_'+x+'_'+y+'_'+z ), $( 'ball_'+x+'_'+y+'_'+z ) );

               this.selectedBall = { 'X':parseInt(x), 'Y':parseInt(y), 'Z':parseInt(z) };
               this.updateAvailablePositions( this.availablePositions, this.selectedBall );
           } else if ( this.selectedBallForReturn ) {
               let url: string;
               let action: string;;
               if (this.returnBallNumber == 1) {
                   action = "returnFirstBall";
                   url = "/pylosd/pylosd/returnFirstBall.html";
               } else {
                   action = "returnSecondBall";
                   url = "/pylosd/pylosd/returnSecondBall.html";
               }

               if ( (this as any).checkAction( action ) )  {  // Check that this action is possible at this moment
                   (this as any).ajaxcall( url, { lock: true, ball_coord_x: x, ball_coord_y: y, ball_coord_z: z },
                                  this, () => {}, () => {} );
               }
           }
       }

       onDeselectBall( evt )
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

           if ( !this.selectedBallForMoveUp ) {
               return;
           }
           if ( this.selectedBallForMoveUp ) {
               // Remove current available positions
               this.removeTooltipFromClass( 'availablePosition' );
               //(this as any).addTooltipToClass( 'availablePosition', '', '' );
               dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
               this.remove3dAvailablePositions();

               this.updateAvailableMoveUpBalls( this.availableMoveUpBalls, color );
               this.selectedBall = null;
           }
       }

       onShowLevel0Ball( evt )
       {
           // Stop this event propagation
           evt.preventDefault();
           dojo.stopEvent( evt );

           if (!this.isShowLevel0) {
               return;
           }

           var params = evt.currentTarget.id.split('_');
           var x = params[1];
           var y = params[2];
           var z = params[3];

           dojo.query( '.blink' ).removeClass( 'blink' );
           setTimeout(this.addBlinkByTimeout, 500, 'ball_'+x+'_'+y+'_'+z);
       }

       addBlinkByTimeout(ball) {
           dojo.addClass( ball, 'blink' );
       }

       onPlaceBallButtonClicked() {
           // Remove current available positions
           this.removeTooltipFromClass( 'availablePosition' );
           //(this as any).addTooltipToClass( 'availablePosition', '', '' );
           dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
           this.remove3dAvailablePositions();

           // Remove current available ball selections
           this.removeTooltipFromClass( 'availableBall_'+this.ballColor );
           //(this as any).addTooltipToClass( 'availableBall_'+this.ballColor, '', '' );
           dojo.query( '.availableBall_'+this.ballColor ).removeClass( 'availableBall_'+this.ballColor );
           this.get3dPositionsForEach(position => this.makeSelectable(position, false));
           if (this.selectedBall)
           {
               dojo.destroy('ball_selected_'+this.ballColor+'_'+this.selectedBall.X+'_'+this.selectedBall.Y+'_'+this.selectedBall.Z);
               this.selectedBall = null;
           }

           dojo.destroy('buttonPlaceBall');
           this.updateAvailablePositions( this.availablePositions, null );
           (this as any).addActionButton( 'buttonMoveUpBall', _('Move up a ball'), 'onMoveUpBallButtonClicked' );

       }

       onMoveUpBallButtonClicked()
       {
           // Remove current available positions
           this.removeTooltipFromClass( 'availablePosition' );
           //(this as any).addTooltipToClass( 'availablePosition', '', '' );
           dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
           this.remove3dAvailablePositions();

           dojo.destroy('buttonMoveUpBall');
           this.selectedBallForMoveUp = true;
           this.updateAvailableMoveUpBalls( this.availableMoveUpBalls, this.ballColor );
           (this as any).addActionButton( 'buttonPlaceBall', _('Place a ball'), 'onPlaceBallButtonClicked' );
       }

       onCancelReturnButtonClicked()
       {
           if ( (this as any).checkAction( 'returnSecondBall' ) )    // Check that this action is possible at this moment
           {
               var reserve = this.gameConstants['BALL_FROM_RESERVE'];
               (this as any).ajaxcall( "/pylosd/pylosd/returnSecondBall.html",
                              { lock: true, ball_coord_x: reserve, ball_coord_y: reserve, ball_coord_z: reserve },
                              this, () => {}, () => {} );
           }
       }

       ///////////////////////////////////////////////////
       //// Reaction to cometD notifications

       /*
           setupNotifications:

           In this method, you associate each of your game notifications with your local method to handle it.

           Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                 your pylos.game.php file.

       */
       setupNotifications()
       {
           console.log( 'notifications subscriptions setup' );

           // TODO: here, associate your game notifications with local methods

           // Example 1: standard notification handling
           // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );

           // Example 2: standard notification handling + tell the user interface to wait
           //            during 3 seconds after calling the method in order to let the players
           //            see what is happening in the game.
           // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
           // (this as any).notifqueue.setSynchronous( 'cardPlayed', 3000 );
           //
           dojo.subscribe( 'ballPlaced', this, "notif_ballPlaced" );
           (this as any).notifqueue.setSynchronous( 'ballPlaced', 1000 );

           dojo.subscribe( 'ballMovedUp', this, "notif_ballMovedUp" );
           (this as any).notifqueue.setSynchronous( 'ballMovedUp', 1000 );

           dojo.subscribe( 'ballReturned', this, "notif_ballReturned" );
           (this as any).notifqueue.setSynchronous( 'ballReturned', 1100 );

           dojo.subscribe( 'returnCanceled', this, "notif_returnCanceled" );

           dojo.subscribe( 'piramidCompleted', this, "notif_piramidCompleted" );
           (this as any).notifqueue.setSynchronous( 'piramidCompleted', 3500 );

           dojo.subscribe( 'finalScore', this, "notif_finalScore" );
           //(this as any).notifqueue.setSynchronous( 'finalScore', 1500 );
       }

       // TODO: from this point and below, you can write your game notifications handling methods

       notif_ballPlaced( notif ) {
           console.log( '**** Notification : ballPlaced' );
           console.log( notif );

           this.removeBlink(); 

           if ( (this as any).isCurrentPlayerActive() )
           {
               this.removeTooltipFromClass( 'availablePosition' );
               //(this as any).addTooltipToClass( 'availablePosition', '', '' );
               dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
               this.remove3dAvailablePositions();
           }

           var ball = 'ball_' + notif.args.coord_x + '_' + notif.args.coord_y + '_' + notif.args.coord_z;

           // Create a ball
           dojo.place( (this as any).format_block('jstpl_ball', {
                   ball_color:'ball_' + notif.args.color,
                   x:notif.args.coord_x,
                   y:notif.args.coord_y,
                   z:notif.args.coord_z
               } ), $( board ) );

           // Place it on the player panel
           (this as any).placeOnObject( $( ball ), $( 'ballicon_p' + notif.args.player_id ) );// $( 'player_board_' + notif.args.player_id ) );

           // Animate a slide from the player panel to the position
           dojo.style( ball, 'zIndex', 10 );

           var x_pix = this.getBallXPixelCoordinate(notif.args.coord_x, notif.args.coord_z);
           var y_pix = this.getBallYPixelCoordinate(notif.args.coord_y, notif.args.coord_z);

           var slide = (this as any).slideToObjectPos( $( ball ), $( board ), x_pix, y_pix, 1000 );
           dojo.connect( slide, 'onEnd', this, dojo.hitch( this, () => {
                   dojo.style( $(ball), 'zIndex', (parseInt(notif.args.coord_z)+1) );
                   if (parseInt(notif.args.coord_z) == 2) {
                       dojo.addClass( 'ball_'+notif.args.coord_x+'_'+notif.args.coord_y+'_'+notif.args.coord_z, 'level_2' );
                       this.addLevel2();
                   }
           }));
           slide.play();

           const position = this.positions3d[Number(notif.args.coord_x)][Number(notif.args.coord_y)][Number(notif.args.coord_z)];
           position.color = notif.args.color;
           position.selectable = false;
           position.selected = false;

           if (this.active3d) {
               position.object = this.reserveBalls[notif.args.color].pop();
               position.object.gameInfos = position;
               this.add3dAnimation(position.object, position.coordinates);
           }

           if (parseInt(notif.args.coord_z) == 3) {
               this.removeLevel2();
           }

           // Counters
           (this as any).updateCounters(notif.args.counters);
       }

       notif_ballMovedUp( notif ) {
           console.log( '**** Notification : ballMovedUp' );
           console.log( notif );

           this.removeBlink(); 

           if ( (this as any).isCurrentPlayerActive() ) {
               this.removeTooltipFromClass( 'availablePosition' );
               //(this as any).addTooltipToClass( 'availablePosition', '', '' );
               dojo.query( '.availablePosition' ).removeClass( 'availablePosition' );
               this.remove3dAvailablePositions();
               dojo.destroy('ball_selected_'+notif.args.color+'_'+notif.args.from_coord_x+'_'+notif.args.from_coord_y+'_'+notif.args.from_coord_z);
           }

           var fromBall = 'ball_' + notif.args.from_coord_x + '_' + notif.args.from_coord_y + '_' + notif.args.from_coord_z;
           var toBall = 'ball_' + notif.args.to_coord_x + '_' + notif.args.to_coord_y + '_' + notif.args.to_coord_z;

           // Create a moved ball
           dojo.place( (this as any).format_block('jstpl_ball', {
                   ball_color:'ball_' + notif.args.color,
                   x:notif.args.to_coord_x,
                   y:notif.args.to_coord_y,
                   z:notif.args.to_coord_z
               } ), $( board ) );


           (this as any).placeOnObject( $( toBall ), $( fromBall ) );
           dojo.destroy(fromBall);

           dojo.style( toBall, 'zIndex', 10 );

           var x_pix = this.getBallXPixelCoordinate(notif.args.to_coord_x, notif.args.to_coord_z);
           var y_pix = this.getBallYPixelCoordinate(notif.args.to_coord_y, notif.args.to_coord_z);

           var slide = (this as any).slideToObjectPos( $( toBall ), $( board ), x_pix, y_pix, 1000 );
           dojo.connect( slide, 'onEnd', this, dojo.hitch( this, () => {
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
               this.add3dAnimation(toPosition.object, toPosition.coordinates);
           }

           // Counters
           (this as any).updateCounters(notif.args.counters);

       }

       notif_ballReturned( notif )
       {
           console.log( '**** Notification : ballReturned' );
           console.log( notif );

           this.removeBlink(); 

           if ( (this as any).isCurrentPlayerActive() )
           {
               // Remove current available ball selections
               this.removeTooltipFromClass( 'availableBall_'+this.ballColor );
               //(this as any).addTooltipToClass( 'availableBall_'+this.ballColor, '', '' );
               dojo.query( '.availableBall_'+this.ballColor ).removeClass( 'availableBall_'+this.ballColor );
               this.get3dPositionsForEach(position => this.makeSelectable(position, false));

               dojo.destroy('ball_selected_'+notif.args.color+'_'+notif.args.coord_x+'_'+notif.args.coord_y+'_'+notif.args.coord_z);
           }

           var returnBall = 'ball_' + notif.args.coord_x + '_' + notif.args.coord_y + '_' + notif.args.coord_z;
           dojo.style( returnBall, 'zIndex', 10 );

           var slide = (this as any).slideToObject( $( returnBall ), $( 'ballicon_p' + notif.args.player_id ), 1000 );
           dojo.connect( slide, 'onEnd', this, dojo.hitch( this, () => {
                   dojo.destroy(returnBall);
                   (this as any).updateCounters(notif.args.counters);
           }));
           slide.play();

           const position = this.positions3d[Number(notif.args.coord_x)][Number(notif.args.coord_y)][Number(notif.args.coord_z)];
           position.selected = false;
           position.selectable = false;
           position.color = null;
           const color = notif.args.color;
           if (this.active3d) {
               this.add3dAnimation(
                   position.object,
                   this.getReservePosition(this.reserveBalls[color].length, color === 'light' ? -1 : 1)
               );
               this.reserveBalls[color].push(position.object);
           }
           position.object.gameInfos = null;
           position.object = null;
       }

       notif_returnCanceled( notif )
       {
           console.log( '**** Notification : returnCanceled' );
           console.log( notif );

           if ( (this as any).isCurrentPlayerActive() )
           {
               // Remove current available ball selections
               this.removeTooltipFromClass( 'availableBall_'+this.ballColor );
               //(this as any).addTooltipToClass( 'availableBall_'+this.ballColor, '', '' );
               dojo.query( '.availableBall_'+this.ballColor ).removeClass( 'availableBall_'+this.ballColor );
               this.get3dPositionsForEach(position => this.makeSelectable(position, false));
           }
       }

       notif_piramidCompleted( notif )
       {
           console.log( '**** Notification : piramidCompleted' );
           console.log( notif );

           var num: number = 0;
           var balls = [];
           var zIndexes = [];

           this.removeLevel2();

           for ( var id in notif.args.balls_piramid )
           {
              var ball_piramid = notif.args.balls_piramid[id];

              balls[num] = 'ball_' + ball_piramid.coord_x + '_' + ball_piramid.coord_y + '_' + ball_piramid.coord_z;
              zIndexes[num] = (parseInt(ball_piramid.coord_z)+1);

              // Create a ball
              dojo.place( (this as any).format_block('jstpl_ball', {
                       ball_color:'ball_' + notif.args.color,
                       x:ball_piramid.coord_x,
                       y:ball_piramid.coord_y,
                       z:ball_piramid.coord_z
                   } ), $( board ) );

              // Place it on the player panel
              (this as any).placeOnObject( $( balls[num] ), $( 'ballicon_p' + notif.args.player_id ) );

              // Animate a slide from the player panel to the position
              dojo.style( balls[num], 'zIndex', 10); //(parseInt(ball_piramid.coord_z)+1) );

              var x_pix = this.getBallXPixelCoordinate(ball_piramid.coord_x, ball_piramid.coord_z);
              var y_pix = this.getBallYPixelCoordinate(ball_piramid.coord_y, ball_piramid.coord_z);

              var slide = (this as any).slideToObjectPos( $( balls[num] ), $( board ), x_pix, y_pix, 1000, 250*num );
              const numToConnect = num;
              dojo.connect( slide, 'onEnd', this, dojo.hitch( this, () => {
                  dojo.style( balls[numToConnect], 'zIndex', zIndexes[numToConnect] );
              }));
              slide.play();
              
              if (this.active3d) {
                this.add3dAnimation(
                    this.reserveBalls[notif.args.color][num],
                    this.positions3d[Number(ball_piramid.coord_x)][Number(ball_piramid.coord_y)][Number(ball_piramid.coord_z)].coordinates
                );
              } else {
                  this.positions3d[Number(ball_piramid.coord_x)][Number(ball_piramid.coord_y)][Number(ball_piramid.coord_z)].color = notif.args.color;
              }
              num++;
           }

           // Counters
           (this as any).updateCounters(notif.args.counters);
       }

       notif_finalScore( notif ) {
           console.log( '**** Notification : finalScore' );
           console.log( notif );

           // Update score
           this.updateScores( notif.args.scores );
       }

       loadJsFileAsync(fileName) {
           if (document.getElementById(fileName)) {
               /*return this.loading[fileName] ||*/ Promise.resolve();
           }

           const headTag = document.getElementsByTagName('head')[0];         
           const newScriptTag = document.createElement('script');
           newScriptTag.type = 'text/javascript';
           newScriptTag.src = fileName;
           newScriptTag.id = fileName;
           newScriptTag.async = true;           

           const promise = new Promise<void>((resolve) => {
               newScriptTag.onload = () => resolve();
           });
           
           headTag.appendChild(newScriptTag);

           //this.loading[fileName] = promise;
           return promise;
       }

       loadAndCreate3d() {
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
       }

       create3d() {
           this.THREE = window['THREE'];
           this.mouse = new this.THREE.Vector2();
           //const frustumSize = 1000;

           this.init();
           //initCamera();
           this.animate();
       }

       gamePositionToPosition(left: number, top: number, row: number): Coordinates {
           return {
               x: this.radius * (left * 2 - top - 1) * 1.03,
               y: this.radius * (-top * (3 / 2) + 4) + top*5 - 70,
               z: this.radius * (-row * 2 + top + 1) * 1.03,
           };
       }

       initCamera() {
           const aspect = this.container.clientWidth / this.container.clientHeight;
           //camera = new this.THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 1000);

           this.camera = new this.THREE.PerspectiveCamera(40, aspect, 10, 5000);
           this.camera.position.set(0, 1500, 700);
       }

       initLights() {
           this.scene.add(new this.THREE.AmbientLight(0x707070));

           // light
           const directionalLight = new this.THREE.DirectionalLight(0xffffff, 0.8);
           directionalLight.position.set(10, 20, 10);
           this.scene.add(directionalLight);
       }

       createBall(color) {
           const textureMaterial = new this.THREE.MeshStandardMaterial({ 
               map: this.ballTextures[color], 
               roughness: 0.2, 
               metalness: 0.1 
           });

           const object = new this.THREE.Mesh(this.ballGeometry, textureMaterial);

           return object;
       }

       map2dPositionTo3dPosition(position) {
           return {
               x: Number(position.coord_x),
               y: Number(position.coord_y), 
               z: Number(position.coord_z),
               color: position.ball_color || position.color
           };
       }

       play3dBall(position: Position3D) {
           const object = this.createBall(position.color);
           object.position.set(position.coordinates.x, position.coordinates.y, position.coordinates.z);

           this.scene.add(object);
           position.object = object;
           object.gameInfos = position;
       }

       add3dAvailablePosition(position) {
           const material = new this.THREE.MeshStandardMaterial({ color: this.config3d.whiteColor, opacity: 0.5, transparent: true });
           const object = new this.THREE.Mesh(this.ballGeometry, material);
           object.position.set(position.coordinates.x, position.coordinates.y, position.coordinates.z);
           this.scene.add(object);
           position.object = object;
           object.gameInfos = position;
       }

       remove3dAvailablePositions() {
           this.get3dPositionsForEach(position => {
               if (position.color === 'white') {
                   position.color = null;

                   if (this.active3d && position.object) {
                       this.scene.remove(position.object);
                       position.object = null;
                   }
               }
           });
       }

       get3dPositionsForEach(positionCallBack: Function) {            
           for (let row = 0; row < 4; row++) {
               const ballsByRow = 4 - row;
               for (let i = 0; i < Math.pow(ballsByRow, 2); i++) {
                   const x = i % ballsByRow;
                   const y = Math.floor(i / ballsByRow);
                   positionCallBack(this.positions3d[x][y][row]);
               }
           }
       }

       makeSelectable(position, selectable: boolean) {
           position.selectable = selectable;
           if (!selectable) {
               position.selected = false;
           }
           if (position.object) {
               this.setBallColor(position.object);
           }
       }

       makeSelected(position, selected: boolean) {
           position.selected = selected;
           if (position.object) {
               this.setBallColor(position.object);
           }
       }

       getReservePosition(index: number, side: 1 | -1) {
           return {
               x: side * this.radius * (11.5+Math.floor(index / 5)*2),
               y: -100, 
               z: (1 - 5 + ((index % 5) * 2)) * this.radius
           };
       }

       initPlate() {
           new window['GLTFLoader']().setPath( '' ).load( g_gamethemeurl + '3d/pylosplate.glb', gltf => {
               const mesh = gltf.scene.children[0];
               const meshGeometry = mesh.geometry;
               
               const texture = new this.THREE.TextureLoader().load(g_gamethemeurl + 'img/plate-texture.jpg');
               const textureMaterial = new this.THREE.MeshStandardMaterial({ map: texture, side: this.THREE.DoubleSide, roughness: 0.6, metalness: 0.5 });
               const plate = new this.THREE.Mesh(meshGeometry, textureMaterial);
               const boxSize = 215;
               plate.scale.set(boxSize, 5, boxSize);
               plate.position.set(-5, -115, -10);
               plate.rotateY(-Math.PI / 2);
               this.scene.add( plate );
           });
       }

       init() {
           this.container = document.getElementById('container') as HTMLDivElement;

           this.scene = new this.THREE.Scene();

           this.initCamera();
           this.initLights();
           this.initPlate();

           this.ballGeometry = new this.THREE.SphereGeometry(this.radius, 32, 32);
           this.ballTextures = [];
           ['light', 'dark'].forEach(color => this.ballTextures[color] = new this.THREE.TextureLoader().load(g_gamethemeurl + 'img/'+color+'-texture.jpg'));

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

           const geometry = new this.THREE.PlaneGeometry(500000, 500000);			

           const texture = new this.THREE.TextureLoader().load(g_gamethemeurl + 'img/back-main.jpg');
           texture.wrapS = this.THREE.RepeatWrapping;
           texture.wrapT = this.THREE.RepeatWrapping;
           texture.repeat.set( 500, 500 );
           const backgroundMaterial = new this.THREE.MeshBasicMaterial({ map: texture, side: this.THREE.DoubleSide});
           const plane = new this.THREE.Mesh( geometry, backgroundMaterial );
           plane.rotateX(Math.PI/2);
           plane.position.y = -(100+this.radius);
           this.scene.add( plane );

           this.raycaster = new this.THREE.Raycaster();

           this.renderer = new this.THREE.WebGLRenderer({ antialias: true } /*{ alpha: true }*/ );
           /*this.renderer.setClearColor( 0x000000, 0 );*/
           this.renderer.setPixelRatio(window.devicePixelRatio);
           this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
           this.container.appendChild(this.renderer.domElement);

           this.controls = new window['OrbitControls'](this.camera, this.renderer.domElement);

           this.controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
           this.controls.dampingFactor = 0.05;

           this.controls.screenSpacePanning = false;

           this.controls.minDistance = 100;
           this.controls.maxDistance = 500;

           this.controls.maxPolarAngle = Math.PI / 3;

           this.controls.enableZoom = false;

           this.controls.update();

           document.addEventListener('mousemove', e => this.onDocumentMouseMove(e));
           document.addEventListener('click', e => this.onDocumentClick(e));

           //

           window.addEventListener('resize', () => this.onWindowResize());

           this.active3d = true;
       }

       onWindowResize() {

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

       }

       onDocumentMouseMove(event: MouseEvent) {

           event.preventDefault();

           this.mouse.x = (event.offsetX / this.container.clientWidth) * 2 - 1;
           this.mouse.y = - (event.offsetY / this.container.clientHeight) * 2 + 1;

       }

       onDocumentClick(event: MouseEvent) {

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
       }

       animate() {

           requestAnimationFrame(() => this.animate());

           this.render();
       }

       progressPosition(from: number, to: number, progress: number) {
           return from + (to - from) * progress;
       }

       squareCurve(progress: number, multiplier: number) {
           return (1-Math.pow((progress-0.5), 2)*4)*multiplier;
       }

       updateMovingPosition() {
           if (!this.moving.length) {
               return;
           }
           const moving = this.moving[0];
           moving.progress += 0.015;
           if (moving.progress > 1) {
               moving.progress = 1;
           }
           moving.object.position.set(
               this.progressPosition(moving.from.x, moving.to.x, moving.progress),
               this.progressPosition(moving.from.y, moving.to.y, moving.progress) + this.squareCurve(moving.progress, this.radius*2),
               this.progressPosition(moving.from.z, moving.to.z, moving.progress)
           );

           if (moving.progress >= 1) {
               moving.object.position.set(moving.to.x, moving.to.y, moving.to.z);
               this.moving.shift();
           }
       }

       setBallColor(object) {
           const position = object.gameInfos;
           if (position && object) {
               if (position.color === 'white') {
                   this.INTERSECTED.material.color.setHex(this.config3d.whiteColor);
               } else {
                   object.material.emissive.setHex(position.selected ? 0x2800000 : (position.selectable ? 0x00028 : 0));
               }
               /*object.material.color.setHex(
                   this.config3d[position.color + (position.selected ? 'SelectedColor' : (position.selectable ? 'SelectableColor' : 'Color'))]
               );*/
           }
       }

       resetOldIntersected() {
           if (this.INTERSECTED && this.INTERSECTED.gameInfos && this.INTERSECTED.gameInfos.color) {
               this.setBallColor(this.INTERSECTED);
           }
           this.INTERSECTED = null;
       }

       render() {
           this.updateMovingPosition();

           // find intersections
           this.raycaster.setFromCamera(this.mouse, this.camera);

           const intersects = this.raycaster.intersectObjects(this.scene.children);

           if (intersects.length > 0) {

               if (this.INTERSECTED !== intersects[0].object) {
                   this.resetOldIntersected();

                   if (intersects[0].object.gameInfos && intersects[0].object.gameInfos.selectable) {
                       this.INTERSECTED = intersects[0].object;
                       if (this.INTERSECTED.gameInfos.color === 'white') {
                           this.INTERSECTED.material.color.setHex(this.config3d.hoverColor);
                       } else {
                           this.INTERSECTED.material.emissive.setHex(0x00060);
                       }
                   }
               }

           } else {
               this.resetOldIntersected();
           }

           this.renderer.render(this.scene, this.camera);

       }

       add3dAnimation(object, destinationCoordinates: Coordinates) {
            this.moving.push({
                object: object,
                from: object.position,
                to: destinationCoordinates,
                progress: 0,
            });
       }
 }
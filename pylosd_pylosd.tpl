{OVERALL_GAME_HEADER}

<!--
--------
-- BGA framework: �c Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- Pylos implementation : �c Stanislav Stepanenko <stst75@inbox.ru>
--
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------

    pylos_pylos.tpl

    This is the HTML template of your game.

    Everything you are writing in this file will be displayed in the HTML page of your game user interface,
    in the "main game zone" of the screen.

    You can use in this template:
    _ variables, with the format {MY_VARIABLE_ELEMENT}.
    _ HTML block, with the BEGIN/END format

    See your "view" PHP file to check how to set variables and control blocks
-->

<div id="game_area">
    <button id="modeSelector" class="action-button bgabutton bgabutton_blue">3D</button>
    <div id="container" style="display: none;"></div>
	<div id="game_background">
		<div id="board">

            <!-- BEGIN pos_selection -->
                <div id="pos_selection_{X}_{Y}_{Z}" class="pos_selection" style="left: {LEFT}px; top: {TOP}px;"></div>
            <!-- END pos_selection -->

            <!-- BEGIN ball_selection_light -->
                <div id="ball_selection_light_{X}_{Y}_{Z}" class="ball_selection" style="left: {LEFT}px; top: {TOP}px;"></div>
            <!-- END ball_selection_light -->

            <!-- BEGIN ball_selection_dark -->
                <div id="ball_selection_dark_{X}_{Y}_{Z}" class="ball_selection" style="left: {LEFT}px; top: {TOP}px;"></div>
            <!-- END ball_selection_dark -->

		</div>
	</div>
</div>

<script type="text/javascript">

// Javascript HTML templates

/*
// Example:
var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${id}"></div>';

*/
var jstpl_ball='<div class="ball ${ball_color}" id="ball_${x}_${y}_${z}"></div>';

var jstpl_ball_selected='<div class="ball ball_selected_${color}" id="ball_selected_${color}_${x}_${y}_${z}"></div>';

var jstpl_player_board = '\<div class="cp_board">\
    <div id="ballicon_p${id}" class="ballicon ballicon_${color}"></div><span class="ballcounter" id="ballcount_p${id}">0</span>\
</div>';

</script>

{OVERALL_GAME_FOOTER}

/**
 * Your game interfaces
 */

type GameConstants = { [CONSTANT_NAME: string]: string | number };

interface Position {
    ball_color: string | null;
    coord_x: string;
    coord_y: string;
    coord_z: string;
    id: string;
}

interface BallCount {
    counter_name: string;
    counter_value: string;
}

interface PylosGamedatas {
    current_player_id: string;
    decision: {decision_type: string};
    game_result_neutralized: string;
    gamestate: Gamestate;
    gamestates: { [gamestateId: number]: Gamestate };
    neutralized_player_id: string;
    notifications: {last_packet_id: string, move_nbr: string}
    playerorder: (string | number)[];
    players: { [playerId: number]: Player };
    tablespeed: string;

    // Add here variables you set up in getAllDatas
    constants: GameConstants;
    positions: { [id: number]: Position };
    counters: { [ballcount_pPlayerId: string]: BallCount };
}
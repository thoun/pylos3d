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

interface Coordinates {
    x: number;
    y: number;
    z: number;
}

interface Position3D {
    oldId: string;
    color: string | null;
    object: any | null;
    coordinates: Coordinates;
    selectable: boolean;
    selected: boolean;
}

interface Moving {
    object: any;
    from: Coordinates;
    to: Coordinates;
    progress: number; // 0 to 1
}
const http = require('http');
const WebSocketServer = require('websocket').server;

var server;
var wsServer;
    
// validation functions to be implemented by custom server
var PLAYER_CONNECTED_VALIDATION = function(playerId) { return true;};
var AFTER_PLAYER_CONNECTED = function(playerId) {};
var AFTER_PLAYER_DISCONNECTED = function(playerId) {};
var GAME_COMMAND_RECEIVED_LOGIC = function(playerId, instruction, value) {};

//#region ==== MAIN ====
    
//#region utils

const INFO = 0;
const ERROR = 1;

/**
 * Log
 * @param {*} type 
 * @param {*} message 
 */
var log = function(type, message) {
    switch(type) {
        case INFO:
            console.log("[INFO]: " + message);
            break;
        case ERROR:
            console.log("[ERROR]: " + message);
            break; 
    }
}

/**
 * Send data
 * @param {*} connection 
 * @param {*} event 
 * @param {*} data 
 */
var send = function(connection, event, data) {
    connection.send(JSON.stringify({
        event: event,
        data: data
    }));
}

/**
 * Close connection
 * @param {*} connection 
 * @param {*} code 
 * @param {*} reason 
 */
var close = function(connection, code, reason) {
    connection.close(code, reason);
    log(ERROR, reason);
}

//#endregion

module.exports = {
    PLAYERS: {},
    GAME_DATA: {},

    /**
     * Init server
     * @param {*} port 
     */
    init: function(port, onInitialize, onPlayerConnectedValidaton, onGameCommandReceivedLogic, onAfterPlayerConnectedLogic, onAfterPlayerDisconnectedLogic) {
    
        // create http server
        server = http.createServer();
        server.listen(port);
    
        // create Web Socket Server
        wsServer = new WebSocketServer({
            httpServer: server
        });

        if (onPlayerConnectedValidaton) {
            PLAYER_CONNECTED_VALIDATION = onPlayerConnectedValidaton.bind(this);
        }
    
        if (onGameCommandReceivedLogic) {
            GAME_COMMAND_RECEIVED_LOGIC = onGameCommandReceivedLogic.bind(this);
        }

        if (onAfterPlayerConnectedLogic) {
            AFTER_PLAYER_CONNECTED = onAfterPlayerConnectedLogic.bind(this);
        }

        if (onAfterPlayerDisconnectedLogic) {
            AFTER_PLAYER_DISCONNECTED = onAfterPlayerDisconnectedLogic.bind(this);
        }

        if (onInitialize) {
            onInitialize.call(this);
        }
    
        /**
         * On server request
         */
        wsServer.on('request', (request) => {
            const connection = request.accept(null, request.origin);
    
            // add player
            this._addPlayer(connection);
        });
    
        console.log("[STARTED]: Port " + port);
    },

    /**
     * Broadcast a game event to all clients informing of a specific event and sending the updated game data
     * @param event the game update event name
     * @param value the event value (optional)
     */
   broadcastGameEvent: function(event, value){
        // broadcast event
        this._broadcast(GAME_UPDATE_EVENT, {event: event, value: value, data: this.GAME_DATA}, `Game -> update`);
    },

    /**
     * Broadcast
     * @param {*} event 
     * @param {*} data 
     */
    _broadcast: function(event, data, info) {
        for (const player in this.PLAYERS) {
            send(this.PLAYERS[player], event, data);
        }
    },

    /**
     * Add Player
     */
    _addPlayer: function(connection){
        log(INFO, "New connection");

        // listen to messages
        connection.on('message', (message) => {
            const data = JSON.parse(message.utf8Data);
            // connect player
            if (data.event === PLAYER_LOGIN_COMMAND) {
                var username = data.data;

                // already connected
                if (connection.id != null) {
                    send(connection, PLAYER_LOGIN_COMMAND, false);
                    return;
                }

                // username is already in use
                if (this.PLAYERS[username] != null) {
                    send(connection, PLAYER_LOGIN_COMMAND, false);
                    close(connection, 1002, `Player '${username}' -> connection failed: A player with that username already exists`);
                    return;
                }

                // connection validation failed
                var connectionValidationReason = PLAYER_CONNECTED_VALIDATION(username);
                if (connectionValidationReason != null && connectionValidationReason.length > 0) {
                    send(connection, PLAYER_LOGIN_COMMAND, false);
                    close(connection, 1003, `Player '${username}' -> connection failed: ${connectionValidationReason}`);
                    return;
                }

                // assign username to the connection
                connection.id = username;
                this.PLAYERS[username] = connection;

                // on disconnect
                connection.on('close', (reasonCode, description) => {
                    this._removePlayer(connection.id);

                    AFTER_PLAYER_DISCONNECTED(username);
                });

                // send login success event
                send(connection, PLAYER_LOGIN_COMMAND, true);

                // logic on after player is connected
                AFTER_PLAYER_CONNECTED(username);

                // broadcast event
                this._broadcast(PLAYER_CONNECTED_EVENT, {player: username}, `Player '${username}' -> connected`);

                // inform existance pf other players
                for (var playerId in this.PLAYERS) {
                    if (playerId != username) {
                        send(connection, PLAYER_CONNECTED_EVENT, {player: playerId});
                    }
                }

                // send game data to players after a new connection
                this.broadcastGameEvent(GAME_UPDATE_EVENT_NEW_PLAYER, "");
            } else {
                try {
                    // game command
                    if (data.event === GAME_UPDATE_COMMAND) {
                        GAME_COMMAND_RECEIVED_LOGIC(connection.id, data.data.instruction, data.data.value);
                    }
                } catch (err) {
                    send(connection, ERROR_EVENT, err.message);
                    log(ERROR, err.message);
                }
            }
        });
    },

    /**
     * Remove Player
     */
    _removePlayer: function(id) {
        delete this.PLAYERS[id];

        this._broadcast(PLAYER_DISCONNECTED_EVENT, {player: id}, 'Player disconnected: ' + id);
    },
}
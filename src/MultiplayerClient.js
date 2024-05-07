/**
 * MultiplayerClient
 */
GF.MultiplayerClient = class MultiplayerClient {
    constructor(params) {
        this.address = params.address;
        this.port = params.port;
        this.socket = null;
        this.connection = null;

        this.errorEvent = new GF.EventEmitter("error");
        this.playerConnectedEvent = new GF.EventEmitter("player-connected");
        this.playerDisconnectedEvent = new GF.EventEmitter("player-disconnected");
        this.gameUpdateEvent = new GF.EventEmitter("game-update");
        this.disconnectedEvent = new GF.EventEmitter("disconnected");
    }

    //#region private

    /**
     * Send message to server 
     * @param {*} event 
     * @param {*} data 
     */
    _send(event, data) {
        if (this.socket == null) {
            return;
        }

        this.socket.send(JSON.stringify({
            event: event,
            data: data
        }));
    }

    //#endregion

    /**
     * Check if is connected
     * @returns 
     */
    isConnected() {
        return this.connection != null && this.connection.username != null;
    }

    /**
     * Get connection name
     * @returns 
     */
    getUsername() {
        if (!this.connection) {
            return null;
        }

        return this.connection.username;
    }

    /**
     * Get connected players list
     * @returns 
     */
    getConnectedPlayers() {
        if (!this.connection) {
            return null;
        }
        
        return this.connection.players;
    }
    
    /**
     * Get game data
     * @returns 
     */
    getGameData() {
        if (!this.connection) {
            return null;
        }
        
        return this.connection.data;
    }

    /**
     * Send command
     */
    sendCommand(instruction, value) {
        if (this.connection) {
            this._send(GAME_UPDATE_COMMAND, {instruction: instruction, value: value});
        }
    }

    /**
     * Login on multiplayer server
     * @param username username for the connection
     * @param onConnectCallback callback function called after login success or insuccess
     */
    connect(username, onConnectCallback) {
        if (this.connection != null) {
            return;
        }

        // Create WebSocket connection.
        this.socket = new WebSocket(`ws://${this.address}:${this.port}`);

        // on connection opened
        this.socket.addEventListener('open', () => {
            this._send(PLAYER_LOGIN_COMMAND, username);
            
            this.connection = {
                username: username,
                players: [],
                data: {}
            }

            // listen for server messages
            this.socket.addEventListener('message', (msg) => {
                var message;
                if (typeof(msg.data) == "string") {
                    try {
                        message = JSON.parse(msg.data);
                    } catch (ex) {
                    }
                }
                else
                {
                    message = msg.data;
                }

                // login success
                if (message.event === PLAYER_LOGIN_COMMAND) {
                    onConnectCallback(message.data);
                // error
                } else if (message.event === ERROR_EVENT) {
                    this.errorEvent.emit(message.data);
                // player connected
                } else if (message.event === PLAYER_CONNECTED_EVENT) {
                    if (!this.connection.players.includes(message.data.player)) {
                        this.connection.players.push(message.data.player);
                    }
                    this.playerConnectedEvent.emit(message.data.player);
                // player disconnected
                } else if (message.event === PLAYER_DISCONNECTED_EVENT) {
                    const index = this.connection.players.indexOf(message.data.player);
                    if (index >= 0) {
                        this.connection.players.splice(index, 1);
                    }

                    this.playerDisconnectedEvent.emit(message.data.player);
                // game update
                } else if (message.event === GAME_UPDATE_EVENT) {
                    this.connection.gameData = message.data.data;
                    this.gameUpdateEvent.emit(message.data.event, message.data.value, this.connection.gameData);
                }
            });
        });

        // on connection closed
        this.socket.addEventListener('close', (event) => {
            if (this.connection != null) {
                this.playerDisconnectedEvent.emit(this.connection.username);
                this.connection = null;
                this.socket = null;
                this.disconnectedEvent.emit(this.connection.players, this.connection.gameData);
            }
            console.log(`[Connection closed] [${event.code}]: ${event.reason}`)
        });
    }

    /**
     * Disconnect
     */
    disconnect() {
        if (this.socket && this.connection != null) {
            this.socket.close();
            this.socket = null;
            this.connection = null;
        }
    }
}
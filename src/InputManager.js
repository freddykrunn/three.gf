// input global events
const INPUT_GAMEPAD_CONNECTED = "event-input-gamepad-connected";
const INPUT_GAMEPAD_DISCONNECTED = "event-input-gamepad-disconnected";

GF.GAME_CONTROL_TYPE = {
    KEYBOARD: "keyboard",
    GAMEPAD_AXIS: "gamepad-axis",
    GAMEPAD_BUTTON: "gamepad-button"
};

const PS4_GAMEPAD = {
    AXIS: {
        LEFT_ANALOG: {
            VERTICAL: 1,
            HORIZONTAL: 0,
        },
        RIGHT_ANALOG: {
            VERTICAL: 5,
            HORIZONTAL: 2,
        },
        L2: 3,
        R2: 4
    },
    BUTTON: {
        CROSS: 1,
        SQUARE: 0,
        CIRCLE: 2,
        TRIANGLE: 3,
        SELECT: 8,
        START: 9,
        SPECIAL: 13,
        L1: 4,
        L2: 6,
        L3: 10,
        R1: 5,
        R2: 7,
        R3: 11,
    }
}

const NES_GAMEPAD = {
    AXIS: {
        ANALOG: {
            VERTICAL: 1,
            HORIZONTAL: 0,
        }
    },
    BUTTON: {
        A: 1,
        B: 0,
        SELECT: 8,
    }
}

const LOGITECH_WINGMAN_GAMEPAD = {
    AXIS: {
        ANALOG: {
            VERTICAL: 1,
            HORIZONTAL: 0,
        }
    },
    BUTTON: {
        A: 0,
        B: 1,
        X: 2,
        Y: 3,
        L1: 4,
        L2: 5
    }
}

/**
 * KeyPressState
 */
GF.KeyPressState = {
    NONE: 0,
    PRESSED: 1,
    PRESSING: 2,
    RELEASED: 3
}

/**
 * Input Manager
 */
GF.GameInputManager = class GameInputManager {
    constructor(game){
        this.game = game;
        this.mouseClickCallback = null;
        this.mouseDownCallback = null;
        this.mouseUpCallback = null;
        this.mouseMoveCallback = null;
    }

    //#region API

    /**
     * If gamepad button is pressed
     * @param {number} gamepad the gamepad index
     * @param {number} button the button index
     */
    isGamepadButtonPressed(gamepad, button) {
        return this.gamepads[gamepad] != null ? this.gamepads[gamepad].buttons[button].pressed : false;
    }

    /**
     * Get gamepad axis state
     * @param {number} gamepad the gamepad index
     * @param {number} axis the axis index
     */
    getGamepadAxisState(gamepad, axis) {
        return this.gamepads[gamepad] != null ? Math.round(this.gamepads[gamepad].axes[axis] * 100) / 100 : 0;
    }

    /**
     * If key is pressed
     * @param {string} key 
     */
    isPressed(key) {
        return this.keyboard.pressed(key);
    }

    /**
     * Bind to key press
     * @param {string} key the key
     * @param {KeyPressState} type if key press is PRESSED, PRESSING or RELEASED
     * @param {function} callback the callback
     * @return subscription
     */
    bind(key, type, callback) {
        if (this.keyBinds[key] == null) {
            this.keyBinds[key] = {
                type: "keyboard",
                state: GF.KeyPressState.NONE,
                [GF.KeyPressState.PRESSED]: [],
                [GF.KeyPressState.PRESSING]: [],
                [GF.KeyPressState.RELEASED]: []
            }
        }

        this.keyBinds[key][type].push(callback);

        return {key: key, type: type, callback: callback};
    }

    /**
     * Bind to gamepad button press
     * @param {number} gamepad the gamepad index
     * @param {Object} gamepadKey the gamepad key combination Ex: [0, 3] -> GamePad 0, Button 3
     * @param {KeyPressState} type if button press is PRESSED, PRESSING or RELEASED
     * @param {function} callback the callback
     * @return subscription
     */
    bindGamePad(gamepadKey, type, callback) {
        if (this.keyBinds[gamepadKey] == null) {
            this.keyBinds[gamepadKey] = {
                type: "gamepad",
                gamepad: gamepadKey[0],
                button: gamepadKey[1],
                state: GF.KeyPressState.NONE,
                [GF.KeyPressState.PRESSED]: [],
                [GF.KeyPressState.PRESSING]: [],
                [GF.KeyPressState.RELEASED]: []
            }
        }

        this.keyBinds[gamepadKey][type].push(callback);

        return {key: gamepadKey, type: type, callback: callback};
    }

    /**
     * Unbind to key event by subscription
     * @param {any} subscription 
     */
    unbind(subscription) {
        if (subscription != null) {
            var keyBind = this.keyBinds[subscription.key];
            if (keyBind != null) {
                var keyBindType = this.keyBinds[subscription.key][subscription.type];
                if (keyBindType != null) {
                    var index = keyBindType.indexOf(subscription.callback);
                    if (index >= 0) {
                        keyBindType.splice(index, 1);
                    }
                }
            }
        }
    }

    /**
     * Bind mouse event
     */
    bindMouseEvent(event, callback) {
        if (this.mouseEventBinds == null) {
            this.mouseEventBinds = {};
        }

        if (this.mouseEventBinds[event] == null) {
            this.mouseEventBinds[event] = []
        }

        this.mouseEventBinds[event].push(callback);

        if (event === "click" && this.mouseClickCallback == null) {
            this.mouseClickCallback = this.mouseClick.bind(this);
            document.addEventListener("click", this.mouseClickCallback, false);
        }
        else if (event === "down" && this.mouseDownCallback == null) {
            this.mouseDownCallback = this.mouseDown.bind(this);
            document.addEventListener("mousedown", this.mouseDownCallback, false);
        }
        else if (event === "up" && this.mouseUpCallback == null) {
            this.mouseUpCallback = this.mouseUp.bind(this);
            document.addEventListener("mouseup", this.mouseUpCallback, false);
        }
        else if (event === "move" && this.mouseMoveCallback == null) {
            this.mouseMoveCallback = this.mouseMove.bind(this);
            document.addEventListener("mousemove", this.mouseMoveCallback, false);
        }

        return {event: event, callback: callback};
    }

    /**
     * Unbind to key event by subscription
     * @param {any} subscription 
     */
    unbindMouseEvent(subscription) {
        if (subscription != null) {
            var callbacks = this.mouseEventBinds[subscription.event];
            if (callbacks != null) {
                var index = callbacks.indexOf(subscription.callback);
                if (index >= 0) {
                    callbacks.splice(index, 1);
                }
            }
        }
    }

    /**
     * Unbind all events of a key
     * @param {string} key the key
     */
    unbindAll(key) {
        if (key != null) {
            this.keyBinds[key] = {
                state: GF.KeyPressState.NONE,
                [GF.KeyPressState.PRESSED]: [],
                [GF.KeyPressState.PRESSING]: [],
                [GF.KeyPressState.RELEASED]: []
            };
        }
    }

    /**
     * Listen for any kind of input
     * @param {function} callback 
     */
    listenForInput(callback) {
        if (this.listenForInputCallbacks == null) {
            this.listenForInputCallbacks = [];
        }
        this.listenForInputCallbacks.push(callback);
    }

    /**
     * Stop Listen for any kind of input
     * @param {function} callback 
     */
    stopListenForInput(callback) {
        if (this.listenForInputCallbacks != null) {
            const index = this.listenForInputCallbacks.indexOf(callback);
            if (index >= 0) {
                this.listenForInputCallbacks.splice(index, 1);
            }
        }
    }

    //#endregion

    // #region Internal

    /**
     * Mouse move
     * @param {MouseEvent} event 
     */
    mouseMove(event) {
        if (this.mouseEventBinds != null) {
            if (this.mouseEventBinds['move'] instanceof Array) {
                for (const callback of this.mouseEventBinds['move']) {
                    callback(event);
                }
            }
        }
    }

    /**
     * Mouse up
     * @param {MouseEvent} event 
     */
    mouseUp(event) {
        if (this.mouseEventBinds != null) {
            if (this.mouseEventBinds['up'] instanceof Array) {
                for (const callback of this.mouseEventBinds['up']) {
                    callback(event);
                }
            }
        }
    }

    /**
     * Mouse down
     * @param {MouseEvent} event 
     */
    mouseDown(event) {
        if (this.mouseEventBinds != null) {
            if (this.mouseEventBinds['down'] instanceof Array) {
                for (const callback of this.mouseEventBinds['down']) {
                    callback(event);
                }
            }
        }
    }

    /**
     * Mouse click
     * @param {MouseEvent} event 
     */
    mouseClick(event) {
        if (this.mouseEventBinds != null) {
            if (this.mouseEventBinds['click'] instanceof Array) {
                for (const callback of this.mouseEventBinds['click']) {
                    callback(event);
                }
            }
        }
    }

    /**
     * Copy gamepads initial values
     */
    copyGamePadInitialValues() {
        setTimeout(() => {
            this.gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);

            this.gamepadsInitialValues = [];
            for (var g = 0; g < this.gamepads.length; g++) {
                if (this.gamepads[g] != null) {
                    // copy gamepad buttons
                    this.gamepadsInitialValues.push({
                        buttons: this.gamepads[g].buttons.map((b) => {return {pressed: b.pressed}}),
                        axes: JSON.parse(JSON.stringify(this.gamepads[g].axes))
                    });
                } else {
                    this.gamepadsInitialValues.push(null);
                }
            }
        }, 500)
    }

    //#endregion

    //#region system

    /**
     * init
     */
    _init() {
        this.keyBinds = {};
        this.keyboard = new THREEx.KeyboardState();

        this.keyboard.onKeyChangeCallback = (key) => {
            if (this.listenForInputCallbacks != null) {
                for (const callback of this.listenForInputCallbacks) {
                    callback(GF.GAME_CONTROL_TYPE.KEYBOARD, key);
                }
            }
        };

        // gamepad
        this.gamepads = {};

        // connected handler
        this.gamepadHandlerConnected = (event) => {
            console.log("[INFO] (Gamepad connected): " + event.gamepad.id);
            this.game.fireEvent(INPUT_GAMEPAD_CONNECTED, {gamepad: event.gamepad.index});

            this.copyGamePadInitialValues();
        }

        // disconnected handler
        this.gamepadHandlerDisconnected = (event) => {
            console.log("[INFO] (Gamepad disconnected): " + event.gamepad.id);
            this.game.fireEvent(INPUT_GAMEPAD_DISCONNECTED, {gamepad: event.gamepad.index});

            this.copyGamePadInitialValues();
        }

        window.addEventListener("gamepadconnected", this.gamepadHandlerConnected, false);
        window.addEventListener("gamepaddisconnected", this.gamepadHandlerDisconnected, false);
    }

    /**
     * update
     * @param {number} delta 
     */
    _update(delta) {
        this.gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
        if (this.gamepads != null && this.gamepadsInitialValues == null) {
            this.copyGamePadInitialValues();
        }

        if (this.listenForInputCallbacks != null && this.listenForInputCallbacks.length > 0
            && this.gamepads != null && this.gamepads[0] != null && this.gamepadsInitialValues != null) {
            // check gamepad buttons
            for (var i = 0; i < this.gamepads[0].buttons.length; i++) {
                if (this.gamepads[0].buttons[i].pressed) {
                    for (const callback of this.listenForInputCallbacks) {
                        callback(GF.GAME_CONTROL_TYPE.GAMEPAD_BUTTON, i);
                    }
                    break; 
                }
            }
            // check gamepad axis
            for (var i = 0; i < this.gamepads[0].axes.length; i++) {
                if (Math.round(this.gamepads[0].axes[i]) !== Math.round(this.gamepadsInitialValues[0].axes[i])) {
                    for (const callback of this.listenForInputCallbacks) {
                        callback(GF.GAME_CONTROL_TYPE.GAMEPAD_AXIS, i);
                    }
                    break; 
                }
            }
        }

        for (const keyBind in this.keyBinds) {
            this._currentKeyBind = this.keyBinds[keyBind];
            if (this._currentKeyBind == null || this._currentKeyBind == {}) {
                continue;
            }
            
            // key pressed
            if ((this._currentKeyBind.type === "keyboard" && this.isPressed(keyBind) === true) ||
                (this._currentKeyBind.type === "gamepad" && this.isGamepadButtonPressed(this._currentKeyBind.gamepad, this._currentKeyBind.button) === true)) {
                if (this._currentKeyBind.state === GF.KeyPressState.NONE) {
                    this._currentKeyBind.state = GF.KeyPressState.PRESSED;
                } else if (this._currentKeyBind.state === GF.KeyPressState.PRESSED) {
                    this._currentKeyBind.state = GF.KeyPressState.PRESSING;
                }
            } 
            // key not pressed
            else {
                if (this._currentKeyBind.state === GF.KeyPressState.PRESSING) {
                    this._currentKeyBind.state = GF.KeyPressState.RELEASED;
                } else if (this._currentKeyBind.state === GF.KeyPressState.RELEASED) {
                    this._currentKeyBind.state = GF.KeyPressState.NONE;
                } else if (this._currentKeyBind.state === GF.KeyPressState.PRESSED) {
                    this._currentKeyBind.state = GF.KeyPressState.RELEASED;
                }
            }

            // callbacks
            if (this._currentKeyBind.state != GF.KeyPressState.NONE && this._currentKeyBind[this._currentKeyBind.state] != null) {
                for (let i = 0 ; i < this._currentKeyBind[this._currentKeyBind.state].length; i++) {
                    this._currentKeyBind[this._currentKeyBind.state][i](delta, keyBind);
                }
            }
        }
    }

    /**
     * destroy
     */
    _destroy() {
        if (this.keyBinds) {
            for (var keyBindKey in this.keyBinds) {
                this.keyBinds[keyBindKey] = {
                    state: GF.KeyPressState.NONE,
                    [GF.KeyPressState.PRESSED]: [],
                    [GF.KeyPressState.PRESSING]: [],
                    [GF.KeyPressState.RELEASED]: []
                };
            }
        }
        this.keyboard.destroy();

        if (this.mouseClickCallback != null) {
            document.removeEventListener("click", this.mouseClickCallback, false);
            this.mouseClickCallback = null;
        }
        if (this.mouseDownCallback != null) {
            document.removeEventListener("mousedown", this.mouseDownCallback, false);
            this.mouseDownCallback = null;
        }
        if (this.mouseUpCallback != null) {
            document.removeEventListener("mouseup", this.mouseUpCallback, false);
            this.mouseUpCallback = null;
        }
        if (this.mouseMoveCallback != null) {
            document.removeEventListener("mousemove", this.mouseMoveCallback, false);
            this.mouseMoveCallback = null;
        }

        window.removeEventListener("gamepadconnected", this.gamepadHandlerConnected, false);
        window.removeEventListener("gamepaddisconnected", this.gamepadHandlerDisconnected, false);
    }

    //#endregion
}
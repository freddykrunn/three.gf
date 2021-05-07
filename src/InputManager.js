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
        this._game = game;
        this._gamepads = null;
        this._keyboard = null;
        this._keyBinds = null;

        this._mouseClickCallback = null;
        this._mouseDownCallback = null;
        this._mouseDownCallback = null;
        this._mouseMoveCallback = null;
    }

    //#region API

    /**
     * If gamepad button is pressed
     * @param {number} gamepad the gamepad index
     * @param {number} button the button index
     */
    isGamepadButtonPressed(gamepad, button) {
        return this._gamepads[gamepad] != null ? this._gamepads[gamepad].buttons[button].pressed : false;
    }

    /**
     * Get gamepad axis state
     * @param {number} gamepad the gamepad index
     * @param {number} axis the axis index
     */
    getGamepadAxisState(gamepad, axis) {
        return this._gamepads[gamepad] != null ? Math.round(this._gamepads[gamepad].axes[axis] * 100) / 100 : 0;
    }

    /**
     * If key is pressed
     * @param {string} key 
     */
    isPressed(key) {
        return this._keyboard.pressed(key);
    }

    /**
     * Bind to key press
     * @param {string} key the key
     * @param {KeyPressState} type if key press is PRESSED, PRESSING or RELEASED
     * @param {function} callback the callback
     * @return subscription
     */
    bind(key, type, callback) {
        if (this._keyBinds[key] == null) {
            this._keyBinds[key] = {
                type: "keyboard",
                state: GF.KeyPressState.NONE,
                [GF.KeyPressState.PRESSED]: [],
                [GF.KeyPressState.PRESSING]: [],
                [GF.KeyPressState.RELEASED]: []
            }
        }

        this._keyBinds[key][type].push(callback);

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
        if (this._keyBinds[gamepadKey] == null) {
            this._keyBinds[gamepadKey] = {
                type: "gamepad",
                gamepad: gamepadKey[0],
                button: gamepadKey[1],
                state: GF.KeyPressState.NONE,
                [GF.KeyPressState.PRESSED]: [],
                [GF.KeyPressState.PRESSING]: [],
                [GF.KeyPressState.RELEASED]: []
            }
        }

        this._keyBinds[gamepadKey][type].push(callback);

        return {key: gamepadKey, type: type, callback: callback};
    }

    /**
     * Unbind to key event by subscription
     * @param {any} subscription 
     */
    unbind(subscription) {
        if (subscription != null) {
            var keyBind = this._keyBinds[subscription.key];
            if (keyBind != null) {
                var keyBindType = this._keyBinds[subscription.key][subscription.type];
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
     * @param {MouseEvent} event the mouse event
     * @param {function} callback the callback
     */
    bindMouseEvent(event, callback) {
        if (this.mouseEventBinds == null) {
            this.mouseEventBinds = {};
        }

        if (this.mouseEventBinds[event] == null) {
            this.mouseEventBinds[event] = []
        }

        this.mouseEventBinds[event].push(callback);

        if (event === "click" && this._mouseClickCallback == null) {
            this._mouseClickCallback = this.mouseClick.bind(this);
            document.addEventListener("click", this._mouseClickCallback, false);
        }
        else if (event === "down" && this._mouseDownCallback == null) {
            this._mouseDownCallback = this.mouseDown.bind(this);
            document.addEventListener("mousedown", this._mouseDownCallback, false);
        }
        else if (event === "up" && this._mouseDownCallback == null) {
            this._mouseDownCallback = this.mouseUp.bind(this);
            document.addEventListener("mouseup", this._mouseDownCallback, false);
        }
        else if (event === "move" && this._mouseMoveCallback == null) {
            this._mouseMoveCallback = this.mouseMove.bind(this);
            document.addEventListener("mousemove", this._mouseMoveCallback, false);
        } else if (event === "wheel" && this._mouseMoveCallback == null) {
            this.mouseWheelCallback = this.mouseWheel.bind(this);
            document.addEventListener("mousewheel", this.mouseWheelCallback, false);
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
            this._keyBinds[key] = {
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
     * Mouse wheel
     * @param {MouseEvent} event 
     */
     mouseWheel(event) {
        if (this.mouseEventBinds != null) {
            if (this.mouseEventBinds['wheel'] instanceof Array) {
                for (const callback of this.mouseEventBinds['wheel']) {
                    callback(event);
                }
            }
        }
    }


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
    _copyGamePadInitialValues() {
        setTimeout(() => {
            this._gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);

            this._gamepadsInitialValues = [];
            for (var g = 0; g < this._gamepads.length; g++) {
                if (this._gamepads[g] != null) {
                    // copy gamepad buttons
                    this._gamepadsInitialValues.push({
                        buttons: this._gamepads[g].buttons.map((b) => {return {pressed: b.pressed}}),
                        axes: JSON.parse(JSON.stringify(this._gamepads[g].axes))
                    });
                } else {
                    this._gamepadsInitialValues.push(null);
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
        this._keyBinds = {};
        this._keyboard = new THREEx.KeyboardState();

        this._keyboard.onKeyChangeCallback = (key) => {
            if (this.listenForInputCallbacks != null) {
                for (const callback of this.listenForInputCallbacks) {
                    callback(GF.GAME_CONTROL_TYPE.KEYBOARD, key);
                }
            }
        };

        // gamepad
        this._gamepads = {};

        // connected handler
        this._gamepadHandlerConnected = (event) => {
            console.log("[INFO] (Gamepad connected): " + event.gamepad.id);
            this._game.publish(INPUT_GAMEPAD_CONNECTED, {gamepad: event.gamepad.index});

            this._copyGamePadInitialValues();
        }

        // disconnected handler
        this._gamepadHandlerDisconnected = (event) => {
            console.log("[INFO] (Gamepad disconnected): " + event.gamepad.id);
            this._game.publish(INPUT_GAMEPAD_DISCONNECTED, {gamepad: event.gamepad.index});

            this._copyGamePadInitialValues();
        }

        window.addEventListener("gamepadconnected", this._gamepadHandlerConnected, false);
        window.addEventListener("gamepaddisconnected", this._gamepadHandlerDisconnected, false);
    }

    /**
     * update
     * @param {number} delta 
     */
    _update(delta) {
        this._gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
        if (this._gamepads != null && this._gamepadsInitialValues == null) {
            this._copyGamePadInitialValues();
        }

        if (this.listenForInputCallbacks != null && this.listenForInputCallbacks.length > 0
            && this._gamepads != null && this._gamepads[0] != null && this._gamepadsInitialValues != null) {
            // check gamepad buttons
            for (var i = 0; i < this._gamepads[0].buttons.length; i++) {
                if (this._gamepads[0].buttons[i].pressed) {
                    for (const callback of this.listenForInputCallbacks) {
                        callback(GF.GAME_CONTROL_TYPE.GAMEPAD_BUTTON, i);
                    }
                    break; 
                }
            }
            // check gamepad axis
            for (var i = 0; i < this._gamepads[0].axes.length; i++) {
                if (Math.round(this._gamepads[0].axes[i]) !== Math.round(this._gamepadsInitialValues[0].axes[i])) {
                    for (const callback of this.listenForInputCallbacks) {
                        callback(GF.GAME_CONTROL_TYPE.GAMEPAD_AXIS, i);
                    }
                    break; 
                }
            }
        }

        for (const keyBind in this._keyBinds) {
            this._currentKeyBind = this._keyBinds[keyBind];
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
        if (this._keyBinds) {
            for (var keyBindKey in this._keyBinds) {
                this._keyBinds[keyBindKey] = {
                    state: GF.KeyPressState.NONE,
                    [GF.KeyPressState.PRESSED]: [],
                    [GF.KeyPressState.PRESSING]: [],
                    [GF.KeyPressState.RELEASED]: []
                };
            }
        }
        this._keyboard.destroy();

        if (this._mouseClickCallback != null) {
            document.removeEventListener("click", this._mouseClickCallback, false);
            this._mouseClickCallback = null;
        }
        if (this._mouseDownCallback != null) {
            document.removeEventListener("mousedown", this._mouseDownCallback, false);
            this._mouseDownCallback = null;
        }
        if (this._mouseDownCallback != null) {
            document.removeEventListener("mouseup", this._mouseDownCallback, false);
            this._mouseDownCallback = null;
        }
        if (this._mouseMoveCallback != null) {
            document.removeEventListener("mousemove", this._mouseMoveCallback, false);
            this._mouseMoveCallback = null;
        }

        window.removeEventListener("gamepadconnected", this._gamepadHandlerConnected, false);
        window.removeEventListener("gamepaddisconnected", this._gamepadHandlerDisconnected, false);
    }

    //#endregion
}
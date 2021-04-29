
/**
 * StateMachine
 */
GF.StateMachine = class StateMachine {

    /**
     * Constructor
     */
    constructor() {
        this._stateCallbacks = {};
        this._stateTransitionCallbacks = {};
        this._stateTransitionProhibitions = {};
        this._executeLaterCallbacks = [];
        this.currentStateTimer = 0;

        this._tickDeltaCount = 0;

        this._lastDelta = 0;
    }

    /**
     * Execute a callback after some time passed (will 'debounce' if called multiple times for the same callback)
     * @param {number} time time in milliseconds
     * @param {function} callback the callback
     */
    executeAfter(time, callback) {
        var existingCallback = this._executeLaterCallbacks.find(c => c.callback === callback);
        if (existingCallback != null) {
            existingCallback.currentTime = 0;
        } else {
            this._executeLaterCallbacks.push({callback: callback, time: time, currentTime: 0});
        }
    }

    /**
     * Set action for state
     * @param {string} state 
     * @param {function} callback 
     */
    setStateAction(state, callback) {
        if (this._stateCallbacks == null) {
            this._stateCallbacks = {};
        }
        this._stateCallbacks[state] = callback;
    }

    /**
     * Set state transition action
     * @param {string} fromState
     * @param {string} toState
     * @param {function} callback 
     */
    setStateTransitionAction(fromState, toState, callback) {
        if (this._stateTransitionCallbacks == null) {
            this._stateTransitionCallbacks = {};
        }

        if (fromState === toState) {
            return;
        }

        if (toState != null) {
            if (fromState != null) {
                this._stateTransitionCallbacks[fromState + "-" + toState] = callback;
            } else {
                this._stateTransitionCallbacks[toState] = callback;
            }
        }
    }

    /**
     * Prohibit transition between two states
     * @param {string} fromState
     * @param {string} toState
     */
    setStateTransitionProhibition(fromState, toState) {
        if (this._stateTransitionProhibitions == null) {
            this._stateTransitionProhibitions = {};
        }
        this._stateTransitionProhibitions[fromState + "-" + toState] = true;
    }

    /**
     * Set current state
     * @param {string} state 
     */
    setState(newState) {
        var oldState = this.state;

        if (!this._stateTransitionProhibitions[oldState + "-" + newState]) {
            this.state = newState;
            this.currentStateTimer = 0;

            var transitionCallback = this._stateTransitionCallbacks[this.state];
            if (typeof(transitionCallback) === "function" && oldState !== this.state) {
                transitionCallback();
            } else {
                transitionCallback = this._stateTransitionCallbacks[oldState + "-" + this.state];
                if (typeof(transitionCallback) === "function") {
                    transitionCallback();
                }
            }
        }

        return this.state
    }

    /**
     * On Update
     * @param {number} delta 
     */
    onUpdate(delta) {
        this._lastDelta = delta;

        if (this._stateCallbacks != null && typeof(this._stateCallbacks[this.state]) === "function") {
            this._stateCallbacks[this.state](delta);
        }

        if (this._executeLaterCallbacks.length > 0) {
            for (var i = 0; i < this._executeLaterCallbacks.length; i++) {
                this._executeLaterCallbacks[i].currentTime += delta;

                if (this._executeLaterCallbacks[i].currentTime >= this._executeLaterCallbacks[i].time) {
                    this._executeLaterCallbacks[i].callback();
                    this._executeLaterCallbacks.splice(i, 1);
                }
            }
        }

        this.currentStateTimer += delta;

        if (this.onTick) {
            this._tickDeltaCount += delta;
            if (this._tickDeltaCount >= 1) {
                this._tickDeltaCount = 0;
                this.onTick();
            }
        }
    }

    /**
     * On Tick (each second of the game run) needs to be implemented
     */
    onTick() {}
}

/**
 * StateMachine
 */
GF.StateMachine = class StateMachine {

    /**
     * Constructor
     */
    constructor() {
        this.stateCallbacks = {};
        this.stateTransitionCallbacks = {};
        this.stateTransitionProhibitions = {};
        this.executeLaterCallbacks = [];
        this.currentStateTimer = 0;

        this._tickDeltaCount = 0;
    }

    /**
     * Execute a callback after some time passed
     * @param {number} time time in milliseconds
     * @param {function} callback the callback
     */
    executeAfter(time, callback) {
        this.executeLaterCallbacks.push({callback: callback, time: time, currentTime: 0});
    }

    /**
     * Set action for state
     * @param {string} state 
     * @param {function} callback 
     */
    setStateAction(state, callback) {
        if (this.stateCallbacks == null) {
            this.stateCallbacks = {};
        }
        this.stateCallbacks[state] = callback;
    }

    /**
     * Set state transition action
     * @param {string} fromState
     * @param {string} toState
     * @param {function} callback 
     */
    setStateTransitionAction(fromState, toState, callback) {
        if (this.stateTransitionCallbacks == null) {
            this.stateTransitionCallbacks = {};
        }

        if (fromState === toState) {
            return;
        }

        if (toState != null) {
            if (fromState != null) {
                this.stateTransitionCallbacks[fromState + "-" + toState] = callback;
            } else {
                this.stateTransitionCallbacks[toState] = callback;
            }
        }
    }

    /**
     * Prohibit transition between two states
     * @param {string} fromState
     * @param {string} toState
     */
    setStateTransitionProhibition(fromState, toState) {
        if (this.stateTransitionProhibitions == null) {
            this.stateTransitionProhibitions = {};
        }
        this.stateTransitionProhibitions[fromState + "-" + toState] = true;
    }

    /**
     * Set current state
     * @param {string} state 
     */
    setState(newState) {
        var oldState = this.state;

        if (!this.stateTransitionProhibitions[oldState + "-" + newState]) {
            this.state = newState;
            this.currentStateTimer = 0;

            var transitionCallback = this.stateTransitionCallbacks[this.state];
            if (typeof(transitionCallback) === "function" && oldState !== this.state) {
                transitionCallback();
            } else {
                transitionCallback = this.stateTransitionCallbacks[oldState + "-" + this.state];
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
        if (this.stateCallbacks != null && typeof(this.stateCallbacks[this.state]) === "function") {
            this.stateCallbacks[this.state](delta);
        }

        if (this.executeLaterCallbacks.length > 0) {
            for (var i = 0; i < this.executeLaterCallbacks.length; i++) {
                this.executeLaterCallbacks[i].currentTime += delta;

                if (this.executeLaterCallbacks[i].currentTime >= this.executeLaterCallbacks[i].time) {
                    this.executeLaterCallbacks[i].callback();
                    this.executeLaterCallbacks.splice(i, 1);
                }
            }
        }

        this.currentStateTimer += delta;

        if (this.onTick) {
            this._tickDeltaCount += delta;
            if (this._tickDeltaCount >= 1000) {
                this._tickDeltaCount = 0;
                this.onTick();
            }
        }
    }

    /**
     * On Tick (each second of the game run) needs to be implemented
     */
    // onTick() {}
}
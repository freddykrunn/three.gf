
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

        this.deltaCount += delta;
        this.tickDeltaCount += delta;
        if (this.tickDeltaCount >= 1000) {
            this.tickDeltaCount = 0;
            this.onTick();
        }
    }

    /**
     * On Tick (each second of the game run)
     */
    onTick() {}
}
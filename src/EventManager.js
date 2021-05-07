
/**
 * Loop
 */
GF.LOOP_INFINITE = -1,

/**
 * Event Manager
 */
GF.GameEventManager = class GameEventManager {
    constructor() {
        this._events = [];
    }

    //#region internal

    /**
     * init
     */
     _init() {
        this._events = [];
    }

    /**
     * update
     * @param {number} delta 
     */
    _update(delta) {
        for(var i = 0, len = this._events.length; i < len; i++) {
            this._events[i]._update(delta);
        }

    }

    /**
     * destroy
     */
    _destroy() {
        for(var i = 0, len = this._events.length; i < len; i++) {
            this._events[i]._destroy();
        }
        this._events.length = 0;
    }

    //#endregion

    //#region API

    /**
     * New Event
     *
     * GameEventStep = {
     *  delay: number, (milliseconds)
     *  duration: number, (milliseconds)
     *  onUpdate: function,
     *  onFire: function,
     * }
     * 
     * @param {GameEventStep} params new event params
     * @param {boolean} destroyOnFinish if event will be destroyed when finished (defaults to 'false')
     * @return the new event instance
     */
    newEvent(params, destroyOnFinish = false) {
        var event = new GF.GameEvent(this, [params], destroyOnFinish);
        this._events.push(event);
        return event;
    }

    /**
     * New Event of type Sequence.
     * An array of events executed sequentially
     * 
     * GameEventStep = {
     *  delay: number, (milliseconds)
     *  duration: number, (milliseconds)
     *  onUpdate: function,
     *  onFire: function,
     * }
     * 
     * @param {GameEventStep[]} eventsParams new event params
     * @param {boolean} destroyOnFinish if event will be destroyed when finished (defaults to 'false')
     * @return the new event instance
     */
    newEventSequence(eventsParams, destroyOnFinish) {
        var event = new GF.GameEvent(this, eventsParams, destroyOnFinish);
        this._events.push(event);
        return event;
    }

    /**
     * New event of type track.
     * A track of events executed and repeated orchestrated by event tracks
     * 
     * EventTrack = {
     *  events: [
     *      "evt01": function() {},
     *      "evt02": function() {},
     *  ],
     *  track: [
     *      {evt: "evt01", on: 2000},
     *      {evt: "evt02", on: 4000},
     *      {evt: "evt01", on: 8000}
     *  ]
     * }
     * 
     * @param {EventTrack} eventTrackParams new event params
     * @param {boolean} destroyOnFinish if event will be destroyed when finished (defaults to 'false')
     * @return the new event instance
     */
    newEventTrack(eventTrackParams, destroyOnFinish) {
        var stepsParams = [];
        var event = null;

        if (eventTrackParams.track != null && eventTrackParams.events != null) {
            var track = eventTrackParams.track;
            var lastTime = 0;
            for (var i=0; i<track.length; i++) {
                stepsParams.push({
                    delay: track[i].on - lastTime,
                    onFire: eventTrackParams.events[track[i].evt]
                })
            }

            event = new GF.GameEvent(this, stepsParams, destroyOnFinish);
            this._events.push(event);
        }

        return event;
    }

    /**
     * Remove an Event instance
     * @param {GameEvent} event 
     */
    removeEvent(event) {
        var index = this._events.indexOf(event);
        if (index >= 0) {
            var event = this._events.splice(index, 1);
        }
    }

    //#endregion
},

/**
 * Game Event
 */
GF.GameEvent = class GameEvent {
    constructor(eventManager, stepParameters, destroyOnFinish) {
        this._steps = [];
        for (const stepParameter of stepParameters) {
            const eventStep = new GF.GameEventStep(stepParameter.delay, stepParameter.onFire, stepParameter.duration, stepParameter.onUpdate)
            this._steps.push(eventStep);
        }
        this._eventManager = eventManager;

        this._destroyOnFinish = destroyOnFinish;
        this._alive = true;
        this._fired = true;
        this._step = 0;
    }

    //#region API

    /**
     * Checks if event was fired
     */
    isFired() {
        return this._fired;
    }

    /**
     * Checks if event is alive
     */
     isAlive() {
        return this._alive;
    }

    /**
     * Fire the event
     * 
     * Ex: fire() -> fire event once (default)
     * Ex: fire(5) -> fire event repeating 5 times in a row
     * Ex: fire(LOOP_INFINITE) -> fire event repeating forever
     * 
     * @param {number} loop the number of executions in loop
     */
    fire(loop) {
        if (this._fired === true && this._alive === true) {
            this.loop = loop == null ? 0 : loop;
            this._step = 0;
            this._fired = false;
            for(const step of this._steps) {
                step.init();
            }
        }
    }

    /**
     * Stop event loop (if the event is in loop)
     */
    stopLoop() {
        this.loop = 0;
    }

    //#endregion

    //#region system

    /**
     * destroy
     */
    _destroy() {
        this._alive = false;
        this._eventManager.removeEvent(this);
    }

    /**
     * update
     * @param {number} delta 
     */
    _update(delta) {
        if (!this._fired && this._alive === true) {
            if (this._steps[this._step].update(delta) === true) {
                this._step++;
                if (this._step >= this._steps.length) {
                    // reset
                    this._step = 0;
                    for(const step of this._steps) {
                        step.init();
                    }
                    // loop
                    if (this.loop > 0) {
                        this.loop--;
                    } else if (this.loop === 0) {
                        this._fired = true;

                        if (this._destroyOnFinish) {
                            this.destroy();
                        }
                    }
                }
            }
        }
    }

    //#endregion
},

/**
 * Event Step
 */
GF.GameEventStep = class GameEventStep {
    constructor(delay, onFire, duration, onUpdate) {
        this.delay = delay != null ? delay : 0;
        this.onFire = onFire != null ? onFire : () => {};
        this.duration = duration != null ? duration : 0;
        this.onUpdate = onUpdate != null ? onUpdate : () => {};

        this.init();
    }

    //#region system

    /**
     * init
     */
    init() {
        this.elapsedDelay = 0;
        this.elapsedDuration = 0;
        this._fired = false;
    }

    /**
     * update
     * @param {number} delta 
     */
    update(delta) {
        if (!this._fired) {
            if (this.elapsedDelay === this.delay) {
                if (this.elapsedDuration < this.duration) {
                    this.elapsedDuration += delta;
                    if (this.elapsedDuration >= this.duration) {
                        this.elapsedDuration = this.duration;
                    } else {
                        this.onUpdate(delta, this.elapsedDuration, this.duration);
                    }              
                }else{
                    this.onFire();
                    this._fired = true;
                }
            } else {
                this.elapsedDelay += delta;
                if (this.elapsedDelay >= this.delay) {
                    this.elapsedDelay = this.delay;
                }
            }
        }
        return this._fired;
    }

    //#endregion
}
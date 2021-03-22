
/**
 * Loop
 */
GF.LOOP_INFINITE = -1,

/**
 * Event Manager
 */
GF.GameEventManager = class GameEventManager {
    constructor() {
        this.events = [];
    }

    /**
     * New Event
     *
     * GameEventStep = {
     *  delay: [miliseconds],
     *  duration: [miliseconds],
     *  onUpdate: [function],
     *  onFire: [function],
     * }
     * 
     * @param {GameEventStep} params 
     * @param {boolean} destroyOnFinish
     * @return event instance
     */
    newEvent(params, destroyOnFinish) {
        var event = new GF.GameEvent(this, [params], destroyOnFinish);
        this.events.push(event);
        return event;
    }

    /**
     * New Event of type Sequence.
     * An array of events executed sequentially
     * 
     * GameEventStep = {
     *  delay: [miliseconds],
     *  duration: [miliseconds],
     *  onUpdate: [function],
     *  onFire: [function],
     * }
     * 
     * @param {GameEventStep[]} eventsParams 
     * @param {boolean} destroyOnFinish
     * @return event instance
     */
    newEventSequence(eventsParams, destroyOnFinish) {
        var event = new GF.GameEvent(this, eventsParams, destroyOnFinish);
        this.events.push(event);
        return event;
    }

    /**
     * New event of type track.
     * A track of events executed and repeated acordingly to a track
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
     * @param {EventTrack} eventTrackParams 
     * @param {boolean} destroyOnFinish
     * @return event instance
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
            this.events.push(event);
        }

        return event;
    }

    /**
     * Remove an Event instance
     * @param {GameEvent} event 
     */
    removeEvent(event) {
        var index = this.events.indexOf(event);
        if (index >= 0) {
            var event = this.events.splice(index, 1);
        }
    }

    //#region system

    /**
     * init
     */
    _init() {
        this.events = [];
    }

    /**
     * update
     * @param {number} delta 
     */
    _update(delta) {
        for(var i = 0; i < this.events.length; i++) {
            this.events[i].update(delta);
        }

    }

    /**
     * destroy
     */
    _destroy() {
        for(var i = 0; i < this.events.length; i++) {
            this.events[i].destroy();
        }
        this.events = [];
    }

    //#endregion
},

/**
 * Event
 */
GF.GameEvent = class GameEvent {
    constructor(eventManager, stepParameters, destroyOnFinish) {
        this.steps = [];
        for (const stepParameter of stepParameters) {
            const eventStep = new GF.GameEventStep(stepParameter.delay, stepParameter.onFire, stepParameter.duration, stepParameter.onUpdate)
            this.steps.push(eventStep);
        }
        this.eventManager = eventManager;

        this.destroyOnFinish = destroyOnFinish;
        this.alive = true;
        this.fired = true;
        this.step = 0;
    }

    /**
     * Fire the event
     * 
     * Ex: fire() -> fire event once (default)
     * Ex: fire(5) -> fire event repeating 5 times in a row
     * Ex: fire(LOOP_INFINITE) -> fire event repeating forever
     * 
     * @param {number} loop 
     */
    fire(loop) {
        if (this.fired === true && this.alive === true) {
            this.loop = loop == null ? 0 : loop;
            this.step = 0;
            this.fired = false;
            for(const step of this.steps) {
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

    //#region system

    /**
     * destroy
     */
    destroy() {
        this.alive = false;
        this.eventManager.removeEvent(this);
    }

    /**
     * update
     * @param {number} delta 
     */
    update(delta) {
        if (!this.fired && this.alive === true) {
            if (this.steps[this.step].update(delta) === true) {
                this.step++;
                if (this.step >= this.steps.length) {
                    // reset
                    this.step = 0;
                    for(const step of this.steps) {
                        step.init();
                    }
                    // loop
                    if (this.loop > 0) {
                        this.loop--;
                    } else if (this.loop === 0) {
                        this.fired = true;

                        if (this.destroyOnFinish) {
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
        this.fired = false;
    }

    /**
     * update
     * @param {number} delta 
     */
    update(delta) {
        if (!this.fired) {
            if (this.elapsedDelay === this.delay) {
                if (this.elapsedDuration < this.duration) {
                    this.elapsedDuration+= delta;
                    if (this.elapsedDuration >= this.duration) {
                        this.elapsedDuration = this.duration;
                    } else {
                        this.onUpdate(delta, this.elapsedDuration, this.duration);
                    }              
                }else{
                    this.onFire();
                    this.fired = true;
                }
            } else {
                this.elapsedDelay+= delta;
                if (this.elapsedDelay >= this.delay) {
                    this.elapsedDelay = this.delay;
                }
            }
        }
        return this.fired;
    }

    //#endregion
}
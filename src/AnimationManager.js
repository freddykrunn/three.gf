GF.AnimationType = {
    CONSTANT: 1,
    SPEED_UP: 2,
    SLOW_DOWN: 3
}
/**
 * GameAnimationManager
 */
GF.GameAnimationManager = class GameAnimationManager {
    constructor(eventManager, camera) {
        this.eventManager = eventManager;
        this.camera = camera;
        this.oneShotAnimations = [];
    }

    /**
     * Play a single-shot animation to animate a transition of a numeric property of an object
     * @param {any} object the object to change the property
     * @param {string} property the property name
     * @param {number} target the target value for the property
     * @param {GF.AnimationType} type the type of animation
     * @param {number} duration the duration in milliseconds
     */
    play(object, property, target, type, duration, onFinish) {
        var newAnimation = {
            object: object,
            property: property,
            target: target,
            type: type.type != null ? type.type : type,
            time: duration,
            currentTime: 0,
            speed: 1,
            power: type.power != null ? type.power * 2 : 2,
            onFinish: onFinish
        }

        if (property instanceof Array) {
            newAnimation.initialValue = [];
            newAnimation.diff = [];
            for (var i = 0; i < property.length; i++) {
                newAnimation.initialValue.push(object[property[i]]);
                newAnimation.diff.push(target[i] - object[property[i]]);
            }
        } else {
            newAnimation.initialValue = object[property];
            newAnimation.diff = target - object[property];
        }

        if (newAnimation.diff != 0) {
            if (this.oneShotAnimations.length > 0) {
                this.oneShotAnimations[this.oneShotAnimations.length - 1].next = newAnimation;
            }
            this.oneShotAnimations.push(newAnimation);
        }
    }

    /**
     * Creates a new value animator that makes smooth transitions
     * to numeric properties of objects
     * 
     * EX:
     * Params = [
     *  duration: 3000,
     *  delay: 1000,
     *  onUpdate: function() {}
     *  onFinish: function() {}
     * ]
     *
     * @param {number} duration duration of the animation played by this animator
     * @param {number} delay delay of the start of the animation played by this animator
     * @param {function} onUpdate every time the value is updated
     * @param {function} onFinish when animation finishes
     * @param {function} onCalculate every time the value is ot be calculated (overrides default calculation)
     */
    newValueAnimator(duration, delay, onUpdate, onFinish, onCalculate) {
        return new GF.GameAnimation(this.eventManager, duration, delay, onUpdate, onFinish, onCalculate);
    }

    /**
     * Creates a new animation for the camera position and direction
     * @param {number} delay the delay to start the animation when played
     * @param {Keyframe[]} keyframes the keyframes of every event (every position and target of camera in each time point)
     * @param {function} onKeyFrame when a keyframe changes
     * @param {function} onUpdate on animation update callback
     * @param {function} onFinish on animation finish callback
     * 
     * struct Keyframe {
     *      time: number,
     *      position: THREE.Vector3,
     *      target: THREE.Vector3
     * }
     * 
     * EX (Camera up and down animation of 3s (3000ms) duration):
     * keyframes = [
     *      {
     *          time: 1000,
     *          position: new THREE.Vector3(0, 500, 0),
     *          target: new THREE.Vector3(0, 0, 0),
     *      },
     *      {
     *          time: 1000,
     *          position: new THREE.Vector3(0, 1000, 0)
     *      },
     *      {
     *          time: 1000,
     *          position: new THREE.Vector3(0, 500, 0)
     *      }
     * ]
     * 
     * NOTE: The first keyframe makes a transition from the current position of the camera so if (time=0) the transition will
     * be abrupt
     */
    newCameraAnimation(delay, track, onKeyFrame, onUpdate, onFinish, destroyOnFinish) {
        return new GF.CameraAnimation(this.eventManager, this.camera, delay, track, onKeyFrame, onUpdate, onFinish, destroyOnFinish);
    }

    //#region Internal

    /**
     * Update logic
     * @param {number} delta 
     */
    _update(delta) {
        var a = this.oneShotAnimations[0], progress;
        var i = 0, k = 0;
        while(a != null) {
            if (!a.finished) {
                progress = a.currentTime / a.time;

                switch(a.type) {
                    case GF.AnimationType.SPEED_UP:
                        progress = Math.pow(progress, a.power);
                        break;
                    case GF.AnimationType.SLOW_DOWN:
                        progress = 1 - Math.pow((progress - 1), a.power); 
                        break;
                }

                if (a.property instanceof Array) {
                    for (k = 0; k < a.property.length; k++) {
                        a.object[a.property[k]] = a.initialValue[k] + (progress * a.diff[k]);
                    }
                } else {
                    a.object[a.property] = a.initialValue + (progress * a.diff);
                }

                a.currentTime += delta;

                if (a.currentTime >= a.time) {
                    if (a.property instanceof Array) {
                        for (k = 0; k < a.property.length; k++) {
                            a.object[a.property[k]] = a.target[k];
                        }
                    } else {
                        a.object[a.property] = a.target;
                    }
                    a.object[a.property] = a.target;
                    a.currentTime = a.time;
                    a.finished = true;

                    if (a.onFinish != null) {
                        a.onFinish();
                    }

                    // delete animation
                    this.oneShotAnimations.splice(i, 1);
                    if (i > 0) {
                        this.oneShotAnimations[i - 1].next = this.oneShotAnimations[i];
                    }
                    
                }
            }
            i++;
            a = a.next;
        }
    }

    //#endregion
}

/**
 * Camera Animation
 */
GF.CameraAnimation = class CameraAnimation {

    /**
     * Constructor
     * @param {GF.EventManager} eventManager the Event Manager
     * @param {number} delay the delay to start the animation when played
     * @param {Keyframe[]} keyframes the keyframes of every event (every position and target of camera in each time point)
     * @param {function} onKeyFrame when a keyframe changes
     * @param {function} onUpdate on animation update callback
     * @param {function} onFinish on animation finish callback
     */
    constructor(eventManager, camera, delay, track, onKeyFrame, onUpdate, onFinish, destroyOnFinish) {
        this.track = new Array(...track);
        this.camera = camera;
        this.onKeyFrame = onKeyFrame != null ? onKeyFrame : () => {};
        this.onUpdate = onUpdate != null ? onUpdate : () => {};
        this.onFinish = onFinish != null ? onFinish : () => {};

        const events = [];

        // create event sequence
        var self = this;
        for (var i = 0; i < track.length; i++) {
            const index = Number(i);
            const event = {
                delay: i === 0 ? delay : 0,
                duration: track[i].time,
                onUpdate: function(deltaTime, elapsedTime) {
                    self._onUpdateCameraPosition(index, deltaTime, elapsedTime)
                },
                onFire: function() {
                    self._onKeyframeExecuted(index)
                }
            }
            events.push(event);
        }

        this.event = eventManager.newEventSequence(events, destroyOnFinish);

        this.playing = false;
    }

    /**
     * Save initial camera position
     */
    _saveInitialCameraPosition() {
        this.initialCameraPosition = new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z);
        var lookAtVector = new THREE.Vector3(0,0,-1);
        lookAtVector.applyQuaternion(this.camera.quaternion);
        this.initialCameraTarget = lookAtVector.add(this.initialCameraPosition);
    }

    /**
     * On update camera position callback
     */
    _onUpdateCameraPosition(index, deltaTime, elapsedTime) {
        const track = this.track[index];

        let percentageToUpdate;
        if (track.time - elapsedTime <= 20) {
            percentageToUpdate = 1;
        } else {
            percentageToUpdate = elapsedTime / track.time;
        }

        if (track.position) {
            this.camera.position.x = this.initialCameraPosition.x + (percentageToUpdate * (track.position.x - this.initialCameraPosition.x));
            this.camera.position.y = this.initialCameraPosition.y + (percentageToUpdate * (track.position.y - this.initialCameraPosition.y)); 
            this.camera.position.z = this.initialCameraPosition.z + (percentageToUpdate * (track.position.z - this.initialCameraPosition.z)); 
        }

        if (track.target) {
            const target = new THREE.Vector3(0,0,0);
            target.x = this.initialCameraTarget.x + (percentageToUpdate * (track.target.x - this.initialCameraTarget.x));
            target.y = this.initialCameraTarget.y + (percentageToUpdate * (track.target.y - this.initialCameraTarget.y)); 
            target.z = this.initialCameraTarget.z + (percentageToUpdate * (track.target.z - this.initialCameraTarget.z)); 
            this.camera.lookAt(target);
        }

        this.onUpdate(index, deltaTime, elapsedTime);
    }

    /**
     * On keyframe executed callback
     */
    _onKeyframeExecuted(index) {
        this.onKeyFrame(index);

        this._saveInitialCameraPosition();

        if (index >= this.track.length - 1) {
            this.onFinish();
        }
    }

    /**
     * Play the animation
     */
    play() {
        if (this.playing === false) {
            this._saveInitialCameraPosition();
            this.event.fire();
            this.playing = true;
        }
    }

    /**
     * Destroy this animator
     */
    destroy() {
        this.event.destroy();
    }
}

/**
 * GameAnimation
 */
GF.GameAnimation = class GameAnimation {
    /**
     * Constructor
     * @param {GF.EventManager} eventManager the Event Manager
     * @param {number} duration duration of the animation played by this animator
     * @param {number} delay delay of the start of the animation played by this animator
     * @param {function} updateCallback every time the value is updated
     * @param {function} finishCallback when animation finishes
     */
    constructor(eventManager, duration, delay, updateCallback, finishCallback, calculationCallback) {
        this.eventManager = eventManager;

        duration = duration != null ? duration : 1000;
        delay = delay != null ? delay : 0;

        this.event = this.eventManager.newEvent({
            delay: delay,
            duration: duration,
            onUpdate: (delta) => {
                this.elapsed += delta; 
                if (duration - this.elapsed <= 20) {
                    this.percentage = 1;
                } else {
                    this.percentage = this.elapsed / duration;
                }

                if (typeof(calculationCallback) === "function") {
                    this.object[this.property] = calculationCallback(this.initialValue, this.percentage, this.difference)
                } else {
                    this.object[this.property] = this.initialValue + (this.percentage * this.difference);
                }

                if (typeof(updateCallback) === "function") {
                    updateCallback(Math.round(this.percentage * 100));
                }
            },
            onFire: () => {
                if (typeof(finishCallback) === "function") {
                    finishCallback();
                }
                this.playing = false;
            }
        });

        this.playing = false;
    }

    /**
     * Play the animation to smoothly make a value transition of a single property of an object
     * @param {Object} object the object
     * @param {string} property the property
     * @param {number} targetValue the target value for the property to animate to
     */
    play(object, property, targetValue) {
        if (this.playing === false && object != null && property != null) {
            this.object = object;
            this.property = property;
            this.elapsed = 0;
            this.percentage = 0;
            this.initialValue = this.object[this.property];

            if (targetValue != null) {
                this.targetValue = targetValue;
                this.difference = this.targetValue - this.initialValue;
            }

            this.event.fire();

            this.playing = true;
        }
    }

    /**
     * Destroy this animator
     */
    destroy() {
        this.playing = false;
        this.event.destroy();
    }
}
GF.AnimationType = {
    CONSTANT: 1,
    SPEED_UP: 2,
    SLOW_DOWN: 3,
    PING_PONG: 4
}

/**
 * GameAnimationManager
 */
GF.GameAnimationManager = class GameAnimationManager {
    constructor(eventManager, camera) {
        this._eventManager = eventManager;
        this._camera = camera;
        this._oneShotAnimations = [];
    }

    /**
     * Play a single-shot animation to animate a transition of a numeric property of an object
     * @param {any} object the object to change the property
     * @param {string | array | function} property the property name | the properties names array | custom function to update value based on the progress
     * @param {number} target the target value for the property
     * @param {GF.AnimationType} type the type of animation
     * @param {number} duration the duration in milliseconds
     * @param {function} onFinish on finish callback
     */
    play(object, property, target, type, duration, onFinish) {
        var newAnimation = {
            animationType: "numeric",
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
            if (this._oneShotAnimations.length > 0) {
                this._oneShotAnimations[this._oneShotAnimations.length - 1].next = newAnimation;
            }
            this._oneShotAnimations.push(newAnimation);
        }
    }

    /**
     * Play a single-shot animation with a custom update function
     * @param {GF.AnimationType} type the type of animation
     * @param {number} duration the duration in milliseconds
     * @param {function} onUpdate custom callback to update value based on the progress
     * @param {function} onFinish on finish callback
     */
    playCustom(type, duration, onUpdate, onFinish) {
        var newAnimation = {
            animationType: "custom",
            object: null,
            property: null,
            target: null,
            type: type.type != null ? type.type : type,
            time: duration,
            currentTime: 0,
            speed: 1,
            power: type.power != null ? type.power * 2 : 2,
            onUpdate: onUpdate != null ? onUpdate : () => {},
            onFinish: onFinish
        }

        if (this._oneShotAnimations.length > 0) {
            this._oneShotAnimations[this._oneShotAnimations.length - 1].next = newAnimation;
        }
        this._oneShotAnimations.push(newAnimation);
    }

    /**
     * Creates a new animation for the camera position and direction that can be played any time
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
        return new GF.CameraAnimation(this._eventManager, this._camera, delay, track, onKeyFrame, onUpdate, onFinish, destroyOnFinish);
    }

    //#region Internal

    /**
     * Update property
     */
    _updateProperty(a, progress) {
        if (a.property instanceof Array) {
            for (var k = 0; k < a.property.length; k++) {
                a.object[a.property[k]] = a.initialValue[k] + (progress * a.diff[k]);
            }
        } else {
            a.object[a.property] = a.initialValue + (progress * a.diff);
        }
    }

    /**
     * Update logic
     * @param {number} delta 
     */
    _update(delta) {
        var a = this._oneShotAnimations[0], progress;
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
                    case GF.AnimationType.PING_PONG:
                        progress = Math.sin(Math.PI * progress); 
                        break;
                }

                if (a.animationType === "custom") {
                    a.onUpdate(progress);
                } else {
                    this._updateProperty(a, progress);
                }

                a.currentTime += delta;

                if (a.currentTime >= a.time) {
                    switch(a.type) {
                        case GF.AnimationType.SPEED_UP:
                            progress = 1;
                            break;
                        case GF.AnimationType.SLOW_DOWN:
                            progress = 1; 
                            break;
                        case GF.AnimationType.PING_PONG:
                            progress = 0; 
                            break;
                    }
                    
                    if (a.animationType === "custom") {
                        a.onUpdate(progress);
                    } else {
                        this._updateProperty(a, progress);
                    }
    
                    a.currentTime = a.time;
                    a.finished = true;

                    if (a.onFinish != null) {
                        a.onFinish();
                    }

                    // delete animation
                    this._oneShotAnimations.splice(i, 1);
                    if (i > 0) {
                        this._oneShotAnimations[i - 1].next = this._oneShotAnimations[i];
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
        this._camera = camera;
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
        this.initialCameraPosition = new THREE.Vector3(this._camera.position.x, this._camera.position.y, this._camera.position.z);
        var lookAtVector = new THREE.Vector3(0,0,-1);
        lookAtVector.applyQuaternion(this._camera.quaternion);
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
            this._camera.position.x = this.initialCameraPosition.x + (percentageToUpdate * (track.position.x - this.initialCameraPosition.x));
            this._camera.position.y = this.initialCameraPosition.y + (percentageToUpdate * (track.position.y - this.initialCameraPosition.y)); 
            this._camera.position.z = this.initialCameraPosition.z + (percentageToUpdate * (track.position.z - this.initialCameraPosition.z)); 
        }

        if (track.target) {
            const target = new THREE.Vector3(0,0,0);
            target.x = this.initialCameraTarget.x + (percentageToUpdate * (track.target.x - this.initialCameraTarget.x));
            target.y = this.initialCameraTarget.y + (percentageToUpdate * (track.target.y - this.initialCameraTarget.y)); 
            target.z = this.initialCameraTarget.z + (percentageToUpdate * (track.target.z - this.initialCameraTarget.z)); 
            this._camera.lookAt(target);
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
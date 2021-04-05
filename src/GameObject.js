/**
 * GameObject (Base Class for every object in the game)
 * Can be extended
 */
GF.GameObject = class GameObject extends GF.StateMachine {

    /**
     * Constructor
     * @param {any} object3DParams params for pre-build the 3D representation of this object
     * @param {boolean} affectsRayCollision if this objects affects ray collision
     * @param {boolean} affectsRayCollision if this object will not be updated every frame (static objects)
     */
    constructor(object3DParams, affectsRayCollision = false, noUpdate = false) {
        super();

        this.alive = false;
        this.type = this.constructor.name;
        this.position = new THREE.Vector3(0,0,0);
        this.rotation = new THREE.Vector3(0,0,0);
        this.scale = new THREE.Vector3(0,0,0);

        this._affectsRayCollision = affectsRayCollision;
        this._noUpdate = noUpdate;

        this._keySubscriptions = [];
        this._mouseSubscriptions = [];
        this._onInitSubscriptions = [];

        this.intersectedByMouse = false;
        this._object3DParams = object3DParams;
    }

    //#region internal

    /**
     * Init this object
     */
    _init(scene, camera, game) {
        if (this.alive === false) {
            this.scene = scene;
            this.camera = camera;
            this.events = game.eventManager;
            this.animation = game.animationManager;
            this.input = game.inputManager;
            this.collision = game.collisionManager;
            this.loader = game.loader;
            this.game = game;
            this.alive = true;
            this._tickDeltaCount = 0;

            if (this._object3DParams) {
                this.object3D = GF.Utils.build3DObject(this.loader, this._object3DParams);

                // setup animated model
                if (this._object3DParams.skeletalAnimations != null && this.object3D != null) {
                    const skinnedMesh = this.object3D.type === "SkinnedMesh" ? this.object3D : this.object3D.children.find(c => c.type === "SkinnedMesh");
                    if (skinnedMesh != null) {
                        this.skinnedMesh = skinnedMesh;
                        this.setupAnimated3DModelFromMesh(this.object3D);
                    } else {
                        this.setupAnimated3DModel(this.object3D.geometry, this.object3D.material);
                        this.skinnedMesh = this.object3D;
                    }

                    this.armature = this.object3D.children.find(c => c.type === "Group" && c.name === "Armature");

                    // animations properties
                    for (const action of this._object3DParams.skeletalAnimations) {
                        this.updateAnimationActionProperties(action.name, action.speed, action.clamp, action.loop ? null : {type: THREE.LoopOnce, repetitions: 0});
                    }
                }
            }

            if (this.object3D != null) {
                this.setObject3D(this.object3D);
            }

            this.onInit();

            if (this._onInitSubscriptions != null) {
                for (let subscription of this._onInitSubscriptions) {
                    if (typeof(subscription) === "function") {
                        subscription();
                    }
                }
            }
        }
    }

    /**
     * Update this object
     */
    _update(delta) {
        if (this.alive === true) {
            this.onUpdate(delta);
        }
    }

    /**
     * Destroy this object
     */
    _destroy() {
        if (this.alive === true) {
            if (this.object3D) {
                this.scene.remove(this.object3D);
            }
            this.alive = false;

            // unsubscribe input
            this.offKeySubscriptions();
            this.offMouseSubscriptions();

            this.onDestroy();

            if (this.sceneAddedObjects) {
                for (const object3D of this.sceneAddedObjects) {
                    this.game.removeFromScene(object3D);
                }
            }

            this.game.removeObject(this.getId(), false)
        }
    }

    /**
     * Mouse intersect
     * @param {boolean} intersect 
     */
    _mouseIntersect(intersect) {
        this.intersectedByMouse = intersect;
        this.onIntersectedByMouse();
    }

    //#endregion

    //#region API

    /**
     * Subscribe onInit
     * @param {function} callback 
     */
    subscribeOnInit(callback) {
        this._onInitSubscriptions.push(callback);
    }

    /**
     * Clear 'init' subscriptions
     */
    clearOnInitSubscriptions() {
        this._onInitSubscriptions = [];
    }

    /**
     * Unsubscribe input
     */
    offKeySubscriptions() {
        for (const subscription of this._keySubscriptions) {
            this.input.unbind(subscription);
        }
    }

    /**
     * Unsubscribe mouse input
     */
    offMouseSubscriptions() {
        for (const subscription of this._mouseSubscriptions) {
            this.input.unbindMouseEvent(subscription);
        }
    }

    /**
     * Bind to a key press/released/pressing action
     * @param {string} key the key
     * @param {KeyPressState} type if key press is PRESSED, PRESSING or RELEASED
     * @param {function} callback the callback
     */
    onKey(key, type, callback) {
        if (this._keySubscriptions == null) {
            this._keySubscriptions = [];
        }
        this._keySubscriptions.push(this.input.bind(key, type, callback.bind(this)));
    }

    /**
     * Bind to a gamepad button press/released/pressing action
     * @param {string} button the button
     * @param {KeyPressState} type if button press is PRESSED, PRESSING or RELEASED
     * @param {function} callback the callback
     */
    onGamePadButton(button, type, callback) {
        if (this._keySubscriptions == null) {
            this._keySubscriptions = [];
        }
        this._keySubscriptions.push(this.input.bindGamePad(button, type, callback.bind(this)));
    }

    /**
     * Bind to a mouse click/down/up/move action
     * @param {string} event the mouse event
     * @param {function} callback the callback
     */
    onMouse(event, callback) {
        if (this._mouseSubscriptions == null) {
            this._mouseSubscriptions = [];
        }
        this._mouseSubscriptions.push(this.input.bindMouseEvent(event, callback.bind(this)));
    }

    /**
     * Set Object3D
     * @param {Object3D} object3D 
     */
    setObject3D(object3D) {
        if (this.object3D != null) {
            this.game.removeFromScene(this.object3D);
        }
        this.object3D = object3D;
        if (this.object3D) {
            this.game.addToScene(this.object3D, this._affectsRayCollision);
            this.position = this.object3D.position;
            this.rotation = this.object3D.rotation;
            this.scale = this.object3D.scale;
            this.material = this.object3D.material;
        } else {
            this.position = new THREE.Vector3(0,0,0);
            this.rotation = new THREE.Vector3(0,0,0);
            this.scale = new THREE.Vector3(0,0,0);
            this.material = null;
        }
    }

    /**
     * Get an armature bone
     * @param {string} name 
     * @returns the bone object
     */
    getArmatureBone(name) {
        if (this.armature != null) {
            let result;
            this.armature.traverse((object) => {
                if (object.name === name) {
                    result = object;
                }
            });
            return result;
        }
        return null;
    }

    /**
     * Create an object as SkinnedMesh and setup the animations actions/clips (geometry must contain information about bones and keyframes)
     * @param {THREE.Geometry} geometry the geometry
     * @param {THREE.Material} material the material
     */
    setupAnimated3DModel(geometry, material) {
        this.setupAnimated3DModelFromMesh(new THREE.SkinnedMesh(geometry, material));
    }

    /**
     * Create an object as SkinnedMesh and setup the animations actions/clips (geometry must contain information about bones and keyframes)
     * @param {THREE.SkinnedMesh} mesh the mesh
     */
    setupAnimated3DModelFromMesh(mesh) {
        this.object3D = mesh;

        // create animation mixer
        this._animationMixer = new THREE.AnimationMixer(this.object3D);

        const animations = this.object3D.animations != null ? this.object3D.animations
        : (this.object3D.geometry != null ? this.object3D.geometry.animations : null)

        // create animation actions
        this._animationActions = {};

        if (animations != null) {
            for (const animation of animations) {
                if (animation.name.startsWith("Armature|")) {
                    animation.name = animation.name.replace("Armature|", "");
                }

                this._animationActions[animation.name] = this._animationMixer.clipAction(animation);
                this._animationActions[animation.name].setEffectiveWeight(1);
                this._animationActions[animation.name].enabled = true;
            }
        }
    }

    /**
     * 
     * @param {string} action the action name
     * @param {number} timeScale the action time scale
     * @param {boolean} clampWhenFinished if the animation will automatically be paused on its last frame
     * @param {Object} loop the loop properties: 
     *  {
     *      type: Enum (THREE.LoopOnce, THREE.LoopRepeat)
     *      repetitions: number
     *  }
     */
    updateAnimationActionProperties(action, timeScale, clampWhenFinished, loop) {
        if (this._animationActions[action]) {
            this._animationActions[action].setEffectiveTimeScale(timeScale);
            this._animationActions[action].clampWhenFinished = clampWhenFinished;
            if (loop != null && loop.type != null && loop.repetitions != null) {
                this._animationActions[action].setLoop(loop.type, loop.repetitions)
            }
        }
    }

    /**
     * Is any animation running
     */
    isAnyAnimationRunning() {
        for (const action in this._animationActions) {
            if (this._animationActions[action].isRunning()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Play another animation action with a fade-in transition
     * @param name the animation name to play
     * @param returnAnimationName the animation name to play after this ends (the return animation)
     */
    playAnimationAction(name, onFinish) {
        if (this.animationActiveAction != null && name == this.animationActiveAction && this._animationActions[this.animationActiveAction].isRunning()) {
            return;
        }

        this.currentAnimationFinishCallback = null;

        let from;
        if (this.animationActiveAction) {
            from = this._animationActions[this.animationActiveAction ].play();
            from.enabled = true;
        }

        const to = this._animationActions[ name ].play();
        to.enabled = true;

        if (to.loop === THREE.LoopOnce) {
            to.reset();
        }

        if (from != null && from != to) {
            from.crossFadeTo(to, 0.3);
        } else {
            to.play();
        }

        this.animationActiveAction = name;
        
        setTimeout(() => {
            this.currentAnimationFinishCallback = onFinish;
        })
    }

    /**
     * Get own id
     */
    getId() {
        return this._id;
    }

    /**
     * Get type name of this object with Inheritance types
     */
    getTypeName() {
        return this.constructor.name + (super.getType != null ? "." + super.getType() : "");
    }

    /**
     * Sets this object visibility
     * @param {boolean} visible 
     */
    setVisible(visible) {
        this.object3D.__old_visible = visible;
        return this.object3D.visible = visible;
    }

    /**
     * Returns this object's radius
     */
    getRadius() {
        if (this.object3D.geometry.boundingBox == null) {
            this.object3D.geometry.computeBoundingBox();
        }
        return Math.max(Math.abs(this.object3D.geometry.boundingBox.max.x - this.object3D.geometry.boundingBox.min.x),
        Math.abs(this.object3D.geometry.boundingBox.max.z - this.object3D.geometry.boundingBox.min.z));
    }

     /**
     * Returns this object's height
     */
    getHeight() {
        if (this.object3D.geometry.boundingBox == null) {
            this.object3D.geometry.computeBoundingBox();
        }
        return Math.abs(this.object3D.geometry.boundingBox.max.y - this.object3D.geometry.boundingBox.min.y);
    }

    /**
     * Get Material
     */
    getMaterial() {
        return this.object3D != null ? this.object3D.material : null;
    }

    /**
     * Add a ThreeJs object to the scene (it will be removed from scene when this object is destroyed)
     * @param {THREE.Object} object3D the object
     * @param {boolean} affectsRayCollision if the object affects ray collision (if affects PhysicsObject's that use ray collision)
     */
    addToScene(object3D, affectsRayCollision) {
        this.game.addToScene(object3D, affectsRayCollision);
        if (this.sceneAddedObjects == null) {
            this.sceneAddedObjects = [];
        }
        this.sceneAddedObjects.push(object3D);
    }

    /**
     * Destroy this object
     */
    destroy() {
        this._destroy();
    }

    //#endregion

    //#region lifecycle

    /**
     * On object init
     */
    onInit(){
        this.setObject3D(this.object3D);
    }

    /**
     * On object update
     * @param {number} delta the delta time between frames
     */
    onUpdate(delta){
        super.onUpdate(delta);

        // update animation mixer
        if (this._animationMixer) {
            this._animationMixer.update(delta * DELTA_MULTIPLIER);

            if (!this._animationActions[this.animationActiveAction].isRunning() && this.currentAnimationFinishCallback) {
                this.currentAnimationFinishCallback();
            }
        }
    }

    /**
     * On destroy
     */
    onDestroy(){}

    /**
     * On intersect by mouse
     */
    onIntersectedByMouse(){}

    //#endregion
}

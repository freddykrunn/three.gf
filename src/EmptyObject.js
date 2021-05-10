/**
 * GameObjectBehaviour to extend a GameObject (abstract class)
 */
GF.GameObjectBehaviour = class GameObjectBehaviour {
    /**
     * On start game object
     */
    start() {
    }

    /**
     * On update game object
     */
    update(delta) {
    }

    /**
     * On destroy game object
     */
    destroy() {
    }
}

/**
 * EmptyObject (Base Class for every object that has no visual representation in the game)
 * Can be extended
 */
GF.EmptyObject = class EmptyObject extends GF.StateMachine {

    /**
     * Constructor
     */
    constructor() {
        super();
        this._behaviours = [];
    }

    /**
     * Add behaviour to this game object (call in constructor only)
     * @param {GF.GameObjectBehaviour} behaviour 
     */
    addBehaviour(behaviour) {
        const instance = new behaviour();
        this._behaviours.push(instance);

        const methods = Object.getOwnPropertyNames(behaviour.prototype);
        for (const method of methods) {
            if (method != "constructor" && method != "start" && method != "update" && method != "stop" && typeof(instance[method]) === "function") {
                this[method] = instance[method].bind(this);
            }
        }
    }

    //#region internal

    /**
     * Init sub routine
     */
    _initSubRoutine() {
        if (this._onInitSubscriptions != null) {
            for (let subscription of this._onInitSubscriptions) {
                if (typeof(subscription) === "function") {
                    subscription();
                }
            }
        }

        for (const behaviour of this._behaviours) {
            behaviour.start.call(this);
        }
    }

    /**
     * Update sub routine
     */
    _updateSubRoutine(delta) {
        for (const behaviour of this._behaviours) {
            behaviour.update.call(this, delta);
        }
    }

    /**
     * Destroy sub routine
     */
    _destroySubRoutine() {
        // unsubscribe input
        this.offKeySubscriptions();
        this.offMouseSubscriptions();

        if (this.sceneAddedObjects) {
            for (const object3D of this.sceneAddedObjects) {
                this.game.removeFromScene(object3D);
            }
        }

        for (const behaviour of this._behaviours) {
            behaviour.destroy.call(this);
        }

        this.game.removeObject(this.getId(), false)
    }

    //#endregion

    //#region API

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
            this.game.input.unbind(subscription);
        }
    }

    /**
     * Unsubscribe mouse input
     */
    offMouseSubscriptions() {
        for (const subscription of this._mouseSubscriptions) {
            this.game.input.unbindMouseEvent(subscription);
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
        this._keySubscriptions.push(this.game.input.bind(key, type, callback.bind(this)));
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
        this._keySubscriptions.push(this.game.input.bindGamePad(button, type, callback.bind(this)));
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
        this._mouseSubscriptions.push(this.game.input.bindMouseEvent(event, callback.bind(this)));
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
        if (this.object3D) {
            this.object3D.__old_visible = visible;
            this.object3D.visible = visible;
        }
    }

    /**
     * Returns this object's radius
     */
    getRadius() {
        if (this.object3D && this.object3D.geometry) {
            if (this.object3D.geometry.boundingBox == null) {
                this.object3D.geometry.computeBoundingBox();
            }
            return Math.max(Math.abs(this.object3D.geometry.boundingBox.max.x - this.object3D.geometry.boundingBox.min.x),
            Math.abs(this.object3D.geometry.boundingBox.max.z - this.object3D.geometry.boundingBox.min.z));
        } else {
            return 0;
        }
    }

     /**
     * Returns this object's height
     */
    getHeight() {
        if (this.object3D && this.object3D.geometry) {
            if (this.object3D.geometry.boundingBox == null) {
                this.object3D.geometry.computeBoundingBox();
            }
            return Math.abs(this.object3D.geometry.boundingBox.max.y - this.object3D.geometry.boundingBox.min.y);
        } else {
            return 0;
        }
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
     * @param {boolean} affectsRayCollision if the object affects ray collision (if affects objects that use ray collision)
     */
    addToScene(object3D, affectsRayCollision) {
        this.game.addToScene(object3D, affectsRayCollision);
        if (this.sceneAddedObjects == null) {
            this.sceneAddedObjects = [];
        }
        this.sceneAddedObjects.push(object3D);
    }

    /**
     * Create new sound player
     * @param {string} asset audio buffer asset
     * @param {any} params params
     * {
     *  positional: boolean (if the sound is positional or global)
     *  loop: boolean,
     *  volume: number (0 - 1)
     *  distance: number (in case of positional=false)
     * }
     */
    newSoundPlayer(asset, params) {
        return GF.Utils.newSound(this.game._audioListener, this.game.loader.get(asset), params);
    }

    /**
     * Destroy this object
     */
    destroy() {
        this._destroy();
    }

    //#endregion

    //#region LifeCycle

    /**
     * Init this object
     */
    _init(game) {
        if (!this.alive) {
            this.game = game;
            this.alive = true;
            this._tickDeltaCount = 0;

            this.onInit();

            this._initSubRoutine();
        }
    }

    /**
     * Update this object
     */
    _update(delta) {
        if (this.alive === true) {
            this._updateStateMachine(delta);
            this._updateSubRoutine(delta);
            this.onUpdate(delta);
        }
    }

    /**
     * Destroy this object
     */
    _destroy() {
        if (this.alive === true) {
            this.alive = false;

            this.onDestroy();

            this._destroySubRoutine();
        }
    }

    /**
     * On object init
     */
    onInit(){
    }

    /**
     * On object update
     * @param {number} delta the delta time between frames
     */
    onUpdate(delta){
    }

    /**
     * On destroy
     */
    onDestroy(){
    }

    //#endregion
}

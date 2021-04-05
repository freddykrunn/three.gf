/**
 * Camera type
 */
GF.CAMERA_TYPE = {
    PERSPECTIVE: 0,
    ORTHO: 1
}

/**
 * Predefined post processing type
 */
GF.POST_PROCESSING_FILTER = {
    Blur: 0,
    Darken: 1,
    GrayScale: 2
}

/**
 * Constants
 */
GF.DEFAULT_CAMERA_FOV = 45;
GF.DEFAULT_CAMERA_NEAR = 1;
GF.DEFAULT_CAMERA_FAR = 1000;
GF.COLLISION_BOX = "collision_box";
GF.COLLISION_SPHERE = "collision_sphere";
GF.COLLISION_CYLINDER = "collision_cylinder";

/**
 * Delta time multiplier (convert 'ms' to 's')
 */
const DELTA_MULTIPLIER = 0.001;

/**
 * Ideal FPS 
 */
const FPS = 60;

/**
 * Ideal delta-time per game loop update
 */
const MS_PER_UPDATE = 1000 / FPS;

/**
 * Minimum acceptable FPS 
 */
const MIN_FPS = 25;

/**
 * Max delta-time per game loop update
 */
const MAX_MS_PER_UPDATE = 1000 / MIN_FPS;

/**
 * Game
 */
GF.Game = class Game extends GF.StateMachine {
    /**
     * Game
     * @param {HTMLCanvasElement} canvas the game canvas
     * @param {GF.AssetsLoader} loader the assets loader
     * @param {any} params the game params
     * @param {function} initCallback on game init callback
     * @param {function} updateCallback on game init callback
     * @param {function} destroyCallback on game init callback
     * @param {function} tickUpdateCallback on game tick callback 
     * @param {function} pointerLockChangeCallback on pointer lock callback
     */
    constructor(canvas, loader, params, initCallback, updateCallback, destroyCallback, tickUpdateCallback, pointerLockChangeCallback) {
        super();
        // private properties
        this._canvas = canvas;
        var width = this._canvas.width * 0.5;
        var height = this._canvas.height * 0.5;

        this._initCallback = initCallback;
        this._updateCallback = updateCallback;
        this._destroyCallback = destroyCallback;
        this._tickUpdateCallback = tickUpdateCallback;
        this._pointerLockChangeCallback = pointerLockChangeCallback;

        this._usePointerLock = params != null && params.usePointerLock != null ? params.usePointerLock : false;
        this._useMouseRaycasting = params != null && params.useMouseRaycasting != null ? params.useMouseRaycasting : false;
        this._useRenderLayers = params != null && params.useRenderLayers != null ? params.useRenderLayers : false;
        this._useOutlineEffect = params != null && params.useOutlineEffect != null ? params.useOutlineEffect : false;

        this._aspectRatio = params.aspectRatio;
        this._graphicsPreset = params.graphicsPreset;
        if (this._graphicsPreset === GF.GRAPHICS_PRESET.PS1_Style) {
            params.antialias = false;
            params.precision = "lowp";
            params.shadows = false;
        }

        // game speed
        this._speed = 1;

        // containers
        this._objects = {};
        this._objectsArray = [];
        this._objectsToUpdateArray = [];
        this._intersectableObjects = [];
        this._rayCollisionObjects = [];
        this._variables = {};
        this._variablesChangeEvents = {};
        this._gameEvents = {};

        // raycaster variables
        this._mouseCoords = new THREE.Vector2();

        // animate function
        this._animateFunction = this._animate.bind(this);

        // renderer
        this._renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: params.antialias != null ? params.antialias : false,
            powerReference: params.powerReference != null ? params.powerReference : "default",
            precision: params.precision != null ? params.precision : "highp",
        });
        this._renderer.setPixelRatio( window.devicePixelRatio );
        this._renderer.shadowMap.enabled = params != null && params.shadows != null ? params.shadows : false ;
        this._renderer.shadowMap.type = params.shadowMapType != null ? params.shadowMapType : THREE.BasicShadowMap;
        this._renderer.autoClear = true;
        this._renderer.setClearColor(0xffffff, 0);

        if (this._useOutlineEffect) {
            this._outlineEffect = new THREE.OutlineEffect(this._renderer);
        }

        this._resolutionRatio = params != null && params.resolutionRatio != null ? params.resolutionRatio : 1;
        this._updateRenderSize(width, height);

        // external access properties
        
        // scene
        this.scene = new THREE.Scene();

        // camera
        if (params != null && params.camera != null) {
            this._cameraType = params.camera.type != null ? params.camera.type : GF.CAMERA_TYPE.PERSPECTIVE;
            var fov = params.camera.fov != null ? params.camera.fov : GF.DEFAULT_CAMERA_FOV;
            var near = params.camera.near != null ? params.camera.near : GF.DEFAULT_CAMERA_NEAR;
            var far = params.camera.far != null ? params.camera.far : GF.DEFAULT_CAMERA_FAR;

            if (this._cameraType === GF.CAMERA_TYPE.PERSPECTIVE) {
                this.camera = new THREE.PerspectiveCamera( fov, width / height, near, far );
            } else {
                this.camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, near, far );
            }

            this.viewFarPlane = far;
        } else {
            this.camera = new THREE.PerspectiveCamera( GF.DEFAULT_CAMERA_FOV, width / height, GF.DEFAULT_CAMERA_NEAR, GF.DEFAULT_CAMERA_FAR);
            this._cameraType = GF.CAMERA_TYPE.PERSPECTIVE;
        }
        this.camera.position.set(0, 0, 0);
        this.camera.lookAt(new THREE.Vector3(0, 0, 1));

        // camera shaker
        this._cameraShaker = new GF.CameraShaker(this.camera);

        // managers
        this.loader = loader;
        this.eventManager = new GF.GameEventManager();
        this.inputManager = new GF.GameInputManager(this);
        this.collisionManager = new GF.CollisionManager(this);
        this.animationManager = new GF.GameAnimationManager(this.eventManager, this.camera);

        // pointer lock 
        this.pointerLockEnabled = this._usePointerLock;
    }

    //#region Abstract

    /**
     * On init
     */
    onInit(){
        this._tickDeltaCount = 0;
    }

    /**
     * On update
     */
    onUpdate(delta){
        super.onUpdate(delta);
    }

    /**
     * On destroy
     */
    onDestroy(){
    }

    /**
     * On pointer lock change
     */
    onPointerLockChange(locked) {}

    /**
     * On tick
     */
    onTick() {
        if (this._tickUpdateCallback) {
            this._tickUpdateCallback();
        }
    }

    //#endregion

    //#region API

    /**
     * Set resolution ratio
     * @param {*} ratio 
     */
    setResolutionRatio(ratio) {
        this._resolutionRatio = ratio != null ? ratio : 1;
        if (this._rendererSize != null) {
            this._updateRenderSize(this._renderer.domElement.offsetWidth, this._renderer.domElement.offsetHeight);
        }
    }

    /**
     * Enable/Disable shadows auto update (set to false for static shadows)
     * @param {boolean} enable 
     */
    enableShadowsAutoUpdate(enable) {
        this._renderer.shadowMap.autoUpdate = enable;
        this._renderer.shadowMap.needsUpdate = true;
    }

    /**
     * Update shadow maps
     */
     updateShadowMaps() {
        this._renderer.shadowMap.needsUpdate = true;
    }

    /**
     * When game canvas container is resized
     * @param {number} width the new width
     * @param {number} height the new height
     */
    onContainerResize(width, height) {
        // update the camera
        if (this._cameraType === GF.CAMERA_TYPE.PERSPECTIVE) {
            this.camera.aspect = width / height;
        } else {
            this.camera.left = -width / 2;
            this.camera.right = width / 2;
            this.camera.top = height / 2;
            this.camera.bottom = -height / 2;
        }
        this.camera.updateProjectionMatrix();
        // notify the renderer of the size change
        this._updateRenderSize(width, height);
    }

    /**
     * Get size
     */
    getCanvasDimensions() {
        return this._renderer.domElement.getBoundingClientRect();
    }

    /**
     * Document click
     */
    requestPointerLock() {
        if (this._usePointerLock && this.pointerLockEnabled) {
            document.body.requestPointerLock();
        }
    }
    
    /**
     * Cancel pointer lock
     */
    cancelPointerLock() {
        if (this.pointerLockEnabled) {
            document.exitPointerLock();
        }
    }

    //#region Effects

    /**
     * Set game speed (null to reset)
     * @param {number} speed 
     */
    setSpeed(speed) {
        this._speed = speed == null ? 1 : speed;
    }

    /**
     * Apply post processing (using CSS filter)
     * @param {string | GF.POST_PROCESSING_FILTER} filterValue the CSS filter value (null to clear) or predefined filter enum value
     */
    applyPostProcessing(filterValue) {
        // predefined
        if (filterValue === GF.POST_PROCESSING_FILTER.Blur) {
            this._canvas.style.filter = "blur(10px) brightness(0.8)"
        } else if (filterValue === GF.POST_PROCESSING_FILTER.Darken) {
            this._canvas.style.filter = "brightness(0.5)"
        } else if (filterValue === GF.POST_PROCESSING_FILTER.GrayScale) {
            this._canvas.style.filter = "grayscale(1)"
        } else {
            this._canvas.style.filter = filterValue;
        }
    }

    /**
     * Shake camera
     * @param {number} type animation type (Eg: THREEx.CameraShaker.WAVE)
     * @param {THREE.Vector3} vector animation direction vector 
     * @param {number} amount amount of shake
     * @param {number} duration animation duration in ms
     */
    shakeCamera(type, vector, amount, duration) {
        this._cameraShaker.shake(type, vector, amount, duration);
    }

    //#endregion

    /**
     * Fire game event
     * @param {string} name event name
     * @param {any} args arguments
     */
    fireEvent(name, args) {
        if (this._gameEvents[name] != null && this._gameEvents[name].subscriptions != null) {
            for (const subscription in this._gameEvents[name].subscriptions) {
                this._gameEvents[name].subscriptions[subscription](args);
            }
        }
    }

    /**
     * Listen to game event
     * @param {string} name event name
     * @param {function} callback callback
     * @return subscription
     */
    onEvent(name, callback) {
        if (this._gameEvents[name] == null) {
            this._gameEvents[name] = {
                subscriptions: {}
            };
        }

        const newSubscription = GF.Utils.uniqueId("GameEventSubscription_");
        this._gameEvents[name].subscriptions[newSubscription] = callback;
    }

    /**
     * Stop listening to game event 
     * @param {string} name event name
     * @param {string} subscription the subscription
     */
    offEvent(name, subscription) {
        if (this._gameEvents[name] != null && this._gameEvents[name].subscriptions != null) {
            delete this._gameEvents[name].subscriptions[subscription];
        }
    }

    /**
     * Set game variable
     * @param {string} name variable name
     * @param {any} value the new value
     */
    setVariable(name, value) {
        this._variables[name] = value;
        this.variableChanged(name);
    }

    /**
     * Get game variable value
     * @param {string} name variable name
     * @return value
     */
    getVariable(name) {
        return this._variables[name];
    }

    /**
     * Define a new game variable
     * @param {string} name variable name
     * @param {any} value the new value (optional)
     */
    defineVariable(name, value) {
        this.setVariable(name, value == null ? null : value);
    }

    /**
     * Increment game variable (only numeric variables)
     * @param {string} name variable name
     * @param {any} amount the amount to increment (default 1)
     */
    incrementVariable(name, amount = 1) {
        const value = this.getVariable(name);
        this.setVariable(name, (isNaN(value) ? 0 : value) + amount)
    }

    /**
     * Fire variable change event
     * @param {string} name event name
     */
    variableChanged(name) {
        if (this._variablesChangeEvents[name] != null && this._variablesChangeEvents[name].subscriptions != null) {
            for (const subscription in this._variablesChangeEvents[name].subscriptions) {
                this._variablesChangeEvents[name].subscriptions[subscription](this._variables[name]);
            }
        }
    }

    /**
     * Listen to game variable change event
     * @param {string} name variable name
     * @param {function} callback callback
     * @return subscription
     */
    onVariableChange(name, callback) {
        if (this._variablesChangeEvents[name] == null) {
            this._variablesChangeEvents[name] = {
                subscriptions: {}
            };
        }

        const newSubscription = GF.Utils.uniqueId("GameVariableChangeSubscription_");
        this._variablesChangeEvents[name].subscriptions[newSubscription] = callback;
        return newSubscription;
    }

    /**
     * Setup listening to game variable change event 
     * @param {string} name variable name
     * @param {string} subscription the subscription
     */
    offVariableChange(name, subscription) {
        if (this._variablesChangeEvents[name] != null) {
            this._variablesChangeEvents[name].subscriptions[subscription] = undefined;
        }
    }

    /**
     * Add intersectable object
     * @param {GameObject} object 
     */
    addIntersectableObject(object) {
        if (object.object3D != null) {
            if (object.object3D.children != null && object.object3D.children.length > 0) {
                for (const child of object.object3D.children) {
                    child.gameObject = object;
                    this._intersectableObjects.push(child);
                }
            } else {
                object.object3D.gameObject = object;
                this._intersectableObjects.push(object.object3D);
            }
        } else {
            this._intersectableObjects.push(object);
        }
    }

    /**
     * Remove intersectable object
     * @param {GameObject} object 
     */
    removeIntersectableObject(object) {
        if (object.object3D != null) {
            let index;    
            if (object.object3D.children != null && object.object3D.children.length > 0) {
                for (const child of object.object3D.children) {
                    index = this._intersectableObjects.indexOf(child);
                    if (index >= 0) {
                        this._intersectableObjects.splice(index, 1);
                    }
                }
            } else {
                index = this._intersectableObjects.indexOf(object.object3D);
                if (index >= 0) {
                    this._intersectableObjects.splice(index, 1);
                }
            }
        } else  {
            index = this._intersectableObjects.indexOf(object);
                if (index >= 0) {
                    this._intersectableObjects.splice(index, 1);
                }
        }
    }

    /**
     * Return current mouse intersection
     */
    getCurrentMouseIntersection() {
        return this.currentMouseIntersection;
    }

    /**
     * Add new GameObject to the game
     * 'addObject(id, object)' or 'addObject(object)' -> [auto id]
     * @returns the id of the new added object
     */
    addObject(param1, param2) {
        var object, id;
        if (param1 === null || typeof(param1) === "string") {
            id = param1;
            object = param2;
        } else {
            id = null;
            object = param1;
        }

        object._init(this.scene, this.camera, this);
        object._id = id;
        if (id == null) {
            id = GF.Utils.uniqueId("GameObject_");
        }
        this._objects[id] = object;

        if (this._objectsArray == null) {
            this._objectsArray = [];
        }
        this._objectsArray.push(object);

        if (!object._noUpdate) {
            if (this._objectsToUpdateArray == null) {
                this._objectsToUpdateArray = [];
            }
            this._objectsToUpdateArray.push(object);
        }

        return id;
    }

    /**
     * Add new object to scene
     * @param {any} object
     * @param 
     */
    addToScene(object, affectRayCollision) {
        if (affectRayCollision) {
            if (this._rayCollisionObjects == null) {
                this._rayCollisionObjects = [];
            }
            this._rayCollisionObjects.push(object);
        }
        this.scene.add(object);
    }

    /**
     * Remove object from scene
     * @param {any} object
     */
    removeFromScene(object) {
        this.scene.remove(object);
        if (this._rayCollisionObjects != null) {
            var index = this._rayCollisionObjects.indexOf(object);
            if (index >= 0) {
                this._rayCollisionObjects.splice(index, 1);
            }
        }
    }

    /**
     * Remove GameObject from the game
     * @param {string} id 
     */
    removeObject(id, destroyObject = true) {
        const object = this._objects[id];
        if (object != null) {
            if (destroyObject) {
                object._destroy();
            }
            delete this._objects[id];

            if (this._objectsArray != null) {
                var i = this._objectsArray.findIndex(o => o === object);
                if (i >= 0) {
                    this._objectsArray.splice(i, 1);
                }
            }
    
            if (!object._noUpdate) {
                if (this._objectsToUpdateArray != null) {
                    var i = this._objectsToUpdateArray.findIndex(o => o === object);
                    if (i >= 0) {
                        this._objectsToUpdateArray.splice(i, 1);
                    }
                }
            }
        }
    }

    /**
     * Remove all GameObjects from the game
     */
    removeAllObjects() {
        for (const object in this._objects) {
            this._objects[object]._destroy();
            delete this._objects[object];
        }
        this._objects = {};
        this._objectsArray = [];
        this._objectsToUpdateArray = [];
    }

    /**
     * Get object
     */
    getObject(objectId) {
        return this._objects[objectId];
    }

    /**
     * Get all objects
     */
    getObjects() {
        return this._objectsArray;
    }

    /**
     * Set environment light
     * @param {any} params 
     */
    setEnvironmentLight(params) {
        if (params == null) {
            if (this.ambientLight) {
                this.removeFromScene(this.ambientLight);
                this.ambientLight = null;
            }
            if (this.sunLight) {
                this.removeFromScene(this.sunLight);
                this.removeFromScene(this.sunLight.target);
                this.sunLight = null;
            }
        } else {
            if (params.sun) {
                const sunLight = new THREE.DirectionalLight( params.sun.color, params.sun.intensity );
                sunLight.position.set(params.sun.direction.x, params.sun.direction.y, params.sun.direction.z);
                sunLight.position.multiplyScalar(params.sun.distance);
                sunLight.castShadow = params.sun.shadow;
                sunLight.shadow.mapSize.width = 1024;
                sunLight.shadow.mapSize.height = 1024;
                sunLight.shadow.camera.near = 0.1;
                sunLight.shadow.camera.far = params.sun.distance * 5;
                
                const d = params.sun.distance * 2;
                sunLight.shadow.camera.left = - d;
                sunLight.shadow.camera.right = d;
                sunLight.shadow.camera.top = d;
                sunLight.shadow.camera.bottom = - d;

                this.sunLight = sunLight
                this.addToScene(this.sunLight);
                this.addToScene(this.sunLight.target);
            } else if (params.sun === null) {
                if (this.sunLight) {
                    this.removeFromScene(this.sunLight);
                    this.sunLight = null;
                }
            }

            if (params.ambient) {
                this.ambientLight = new THREE.HemisphereLight( params.ambient.skyColor, params.ambient.groundColor, params.ambient.intensity );
                this.addToScene( this.ambientLight );
            } else if (params.ambient === null) {
                if (this.ambientLight) {
                    this.removeFromScene(this.ambientLight);
                    this.ambientLight = null;
                }
            }
        }
    }

    /**
     * Set camera position and target
     * @param {vector} position 
     * @param {vector} target 
     */
    setCamera(position, target) {
        this.camera.position.set(position.x, position.y, position.z);
        if (target != null) {
	        this.camera.lookAt(new THREE.Vector3(target.x, target.y, target.z));
        }
    }

    /**
     * Start the game engine
     */
    start(gamePage) {
        if (!this.initialized) {
            this.gamePage = gamePage;
            this._init();
            this.resume();
            this.initialized = true;
        }
    }

    /**
     * Stop the game engine
     */
    stop() {
        if (this.initialized) {
        this.pause();
        this._renderer.clear(true, true, true);
        this._renderer.dispose();
        this._destroy();
        this.initialized = false;
        }
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.running) {
            this.currentTime = new Date().valueOf();
            this.lag = 0;
            this.running = true;
            this._animateFunction();
        }
    }

    /**
     * Pause the game
     */
    pause() {
        if (this.running) {
            this.running = false;
        }
    }

    //#endregion

    //#region Internal

    /**
     * Update render size
     */
    _updateRenderSize(width, height) {
        var w, h;
        if (this._graphicsPreset === GF.GRAPHICS_PRESET.PS1_Style) {
            w = GF.GRAPHICS_PRESET_PARAMS[GF.GRAPHICS_PRESET.PS1_Style].resolution.w;
            h = GF.GRAPHICS_PRESET_PARAMS[GF.GRAPHICS_PRESET.PS1_Style].resolution.h;
        } else {
            w = width * this._resolutionRatio;
            h = height * this._resolutionRatio;
        }
        this._renderer.setSize( w, h  );
        this._renderer.domElement.style.width = width + 'px';
        this._renderer.domElement.style.height = height  + 'px';

        this._rendererSize = new THREE.Vector2();
        this._renderer.getSize(this._rendererSize);
    }

    /**
     * init
     */
    _init() {
        this.eventManager._init();
        this.inputManager._init();

        this.onInit();
        if (this._initCallback) {
            this._initCallback();
        }

        for (var i = 0; i < this._objectsArray.length; i++) {
            this._objectsArray[i]._init(this.scene, this.camera, this);
        }

        if (this._usePointerLock) {
            this.documentClickCallback = this.requestPointerLock.bind(this);
            this._pointerLockChangeCallback = this._pointerlockChange.bind(this);
            document.body.addEventListener("click", this.documentClickCallback);
            document.addEventListener('pointerlockchange', this._pointerLockChangeCallback, false);

            setTimeout(() => {
                this.requestPointerLock();
            })
        }

        // raycaster
        if (this._useMouseRaycasting) {
            this.mouseMoveCallback = this._onMouseMove.bind(this);
            document.addEventListener('mousemove', this.mouseMoveCallback, false);
        }
    }

    /**
     * animate
     */
    _animate() {
        if (this.running === true) {
            // update
            this.newTime = new Date().valueOf();
            this._update(Math.min(this.newTime - this.currentTime, MAX_MS_PER_UPDATE) * this._speed);
            this.currentTime = this.newTime;

            // update camera shaker
            this._cameraShaker.update();

            // raycasting
            if (this._useMouseRaycasting) {
                if (this.currentMouseIntersection != null && this.currentMouseIntersection.object != null) {
                    this.currentMouseIntersection.object._mouseIntersect(false);
                }

                this.currentMouseIntersection = this.collisionManager.intersectObjects(this._mouseCoords, this.camera);

                if (this.currentMouseIntersection != null && this.currentMouseIntersection.object != null) {
                    this.currentMouseIntersection.object._mouseIntersect(true);
                }
            }

            this._renderer.clear();

            // render
            if (this._useRenderLayers === true) {
                this._renderer.autoClear = true;
                this.camera.layers.set(0);
                this._renderer.render(this.scene, this.camera);

                this._renderer.autoClear = false;

                this.camera.layers.set(1);
                this._renderer.render(this.scene, this.camera);
            } else {
                if (this._useOutlineEffect) {
                    this._outlineEffect.render(this.scene, this.camera);
                } else {
                    this._renderer.render(this.scene, this.camera);
                }
            }

            // animation frame
            this.animationFrameRequest = requestAnimationFrame(this._animateFunction);
        } else {
            if (this.animationFrameRequest) {
                cancelAnimationFrame(this.animationFrameRequest);
            }
        }
    }

    /**
     * update
     * @param {number} delta 
     */
    _update(delta) {
        this.eventManager._update(delta);
        this.inputManager._update(delta);
        this.animationManager._update(delta);

        this.onUpdate(delta);
        if (this._updateCallback) {
            this._updateCallback(delta);
        }

        for (var i = 0; i < this._objectsToUpdateArray.length; i++) {
            this._objectsToUpdateArray[i]._update(delta);
        }

        this.collisionManager._update();
    }

    /**
     * destroy
     */
    _destroy() {
        this._renderer.dispose();

        this.setEnvironmentLight(null);

        for (var i = 0; i < this._objectsArray.length; i++) {
            this._objectsArray[i]._destroy();
        }

        this.eventManager._destroy();
        this.inputManager._destroy();

        this.onDestroy();
        if (this._destroyCallback) {
            this._destroyCallback();
        }

        if (this._usePointerLock) {
            this.cancelPointerLock();
            document.body.removeEventListener("click", this.documentClickCallback);
            document.removeEventListener('pointerlockchange', this._pointerLockChangeCallback, false);
        }

        if (this._useMouseRaycasting) {
            document.removeEventListener('mousemove', this.mouseMoveCallback, false);
        }

    }

    /**
     * On mouse move 
     */
    _onMouseMove(event) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components

        const rect = this._renderer.domElement.getBoundingClientRect();
        this._mouseCoords.x = ( (event.clientX - rect.x) / rect.width ) * 2 - 1;
        this._mouseCoords.y = - ( (event.clientY - rect.y) / rect.height ) * 2 + 1;
    }

    /**
     * Pointer lock state change
     */
    _pointerlockChange() {
        if(document.pointerLockElement === document.body ||
            document.mozPointerLockElement === document.body) {
            this.onPointerLockChange(true);
            if (this._pointerLockChangeCallback) {
                this._pointerLockChangeCallback(true);
            }
        } else {
            this.onPointerLockChange(false);
            if (this._pointerLockChangeCallback) {
                this._pointerLockChangeCallback(false);
            }
        }
    }

    //#endregion
}
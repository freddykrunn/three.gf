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
 * FPS 
 */
const FPS = 60;
/**
 * Milliseconds per game loop update
 */
const MS_PER_UPDATE = 1000 / FPS;

/**
 * Game
 */
GF.Game = class Game extends GF.StateMachine {
    constructor(canvas, loader, params, initCallback, updateCallback, destroyCallback, tickUpdateCallback, pointerLockChangeCallback) {
        super();
        this.canvas = canvas;
        var width = this.canvas.width * 0.5;
        var height = this.canvas.height * 0.5;

        this.initCallback = initCallback;
        this.updateCallback = updateCallback;
        this.destroyCallback = destroyCallback;
        this.tickUpdateCallback = tickUpdateCallback;
        this.pointerLockChangeCallback = pointerLockChangeCallback;

        this.usePointerLock = params != null && params.usePointerLock != null ? params.usePointerLock : false;
        this.useMouseRaycasting = params != null && params.useMouseRaycasting != null ? params.useMouseRaycasting : false;
        this.useRenderLayers = false;
        this.useOutlineEffect = params != null && params.useOutlineEffect != null ? params.useOutlineEffect : false;

        // assets loader
        this.loader = loader;

        this.aspectRatio = params.aspectRatio;
        this.graphicsPreset = params.graphicsPreset;
        if (this.graphicsPreset === GF.GRAPHICS_PRESET.PS1_Style) {
            params.antialias = false;
            params.precision = "lowp";
            params.shadows = false;
        }

        // renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: params.antialias != null ? params.antialias : false,
            powerReference: params.powerReference != null ? params.powerReference : "default",
            precision: params.precision != null ? params.precision : "highp",
        });
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.shadowMap.enabled = params != null && params.shadows != null ? params.shadows : false ;
        this.renderer.shadowMap.type = params.shadowMapType != null ? params.shadowMapType : THREE.BasicShadowMap;
        this.renderer.autoClear = true;
        this.renderer.setClearColor(0xffffff, 0);

        if (this.useOutlineEffect) {
            this.outlineEffect = new THREE.OutlineEffect(this.renderer);
        }

        this.resolutionRatio = params != null && params.resolutionRatio != null ? params.resolutionRatio : 1;
        this.updateRenderSize(width, height);
        

        // scene
        this.scene = new THREE.Scene();
        this.altScene = new THREE.Scene();

        // camera
        if (params != null && params.camera != null) {
            this.cameraType = params.camera.type != null ? params.camera.type : GF.CAMERA_TYPE.PERSPECTIVE;
            var fov = params.camera.fov != null ? params.camera.fov : GF.DEFAULT_CAMERA_FOV;
            var near = params.camera.near != null ? params.camera.near : GF.DEFAULT_CAMERA_NEAR;
            var far = params.camera.far != null ? params.camera.far : GF.DEFAULT_CAMERA_FAR;

            if (this.cameraType === GF.CAMERA_TYPE.PERSPECTIVE) {
                this.camera = new THREE.PerspectiveCamera( fov, width / height, near, far );
            } else {
                this.camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, near, far );
            }

            this.viewFarPlane = far;
        } else {
            this.camera = new THREE.PerspectiveCamera( GF.DEFAULT_CAMERA_FOV, width / height, GF.DEFAULT_CAMERA_NEAR, GF.DEFAULT_CAMERA_FAR);
            this.cameraType = GF.CAMERA_TYPE.PERSPECTIVE;
        }

        // default camera position and target
        this.camera.position.set(0, 0, 0);
        this.camera.lookAt(new THREE.Vector3(0, 0, 1));

        if (params != null && params.limitRenderedObjects != null) {
            this.limitRenderedObjects = params.limitRenderedObjects;
        }

        // event manager
        this.eventManager = new GF.GameEventManager();
        this.inputManager = new GF.GameInputManager(this);
        this.collisionManager = new GF.CollisionManager(this);
        this.animationManager = new GF.GameAnimationManager(this.eventManager, this.camera);

        // containers
        this.objects = {};
        this.objectsArray = [];
        this.intersectableObjects = [];
        this.rayCollisionObjects = [];
        this.variables = {};
        this.variablesChangeEvents = {};
        this.gameEvents = {};

        // raycaster
        this.mouseCoords = new THREE.Vector2();

        this.deltaCount = 0;
        this.speed = 1;
        this.tickDeltaCount = 0;

        this.screenShaker = ScreenShake();

        // animate function
        this.animateFunction = this.animate.bind(this);
    }

    /**
     * Update render size
     */
    updateRenderSize(width, height) {
        var w, h;
        if (this.graphicsPreset === GF.GRAPHICS_PRESET.PS1_Style) {
            w = GF.GRAPHICS_PRESET_PARAMS[GF.GRAPHICS_PRESET.PS1_Style].resolution.w;
            h = GF.GRAPHICS_PRESET_PARAMS[GF.GRAPHICS_PRESET.PS1_Style].resolution.h;
        } else {
            w = width * this.resolutionRatio;
            h = height * this.resolutionRatio;
        }
        this.renderer.setSize( w, h  );
        this.renderer.domElement.style.width = width + 'px';
        this.renderer.domElement.style.height = height  + 'px';

        this.rendererSize = this.renderer.getSize();
    }

    //#region Abstract

    onInit(){
        this.deltaCount = 0;
        this.tickDeltaCount = 0;
    }
    onUpdate(delta){
        super.onUpdate(delta);
    }
    onDestroy(){
        this.deltaCount = 0;
        this.tickDeltaCount = 0;
    }
    onPointerLockChange(locked) {}

    onTick() {
        if (this.tickUpdateCallback) {
            this.tickUpdateCallback();
        }
    }

    //#endregion

    //#region API

    /**
     * On game canvas container is resized
     */
    onContainerResize(width, height) {
        // update the camera
        if (this.cameraType === GF.CAMERA_TYPE.PERSPECTIVE) {
            this.camera.aspect = width / height;
        } else {
            this.camera.left = -width / 2;
            this.camera.right = width / 2;
            this.camera.top = height / 2;
            this.camera.bottom = -height / 2;
        }
        this.camera.updateProjectionMatrix();
        // notify the renderer of the size change
        this.updateRenderSize(width, height);
    }

    /**
     * Get size
     */
    getCanvasDimensions() {
        return this.renderer.domElement.getBoundingClientRect();
    }

    //#region Effects

    /**
     * Set game speed (null to reset)
     * @param {number} speed 
     */
    setSpeed(speed) {
        this.speed = speed == null ? 1 : speed;
    }

    /**
     * Apply post processing (using CSS filter)
     * @param {string | GF.POST_PROCESSING_FILTER} filterValue the CSS filter value (null to clear) or predefined filter enum value
     */
    applyPostProcessing(filterValue) {
        // predefined
        if (filterValue === GF.POST_PROCESSING_FILTER.Blur) {
            this.canvas.style.filter = "blur(10px) brightness(0.8)"
        } else if (filterValue === GF.POST_PROCESSING_FILTER.Darken) {
            this.canvas.style.filter = "brightness(0.5)"
        } else if (filterValue === GF.POST_PROCESSING_FILTER.GrayScale) {
            this.canvas.style.filter = "grayscale(1)"
        } else {
            this.canvas.style.filter = filterValue;
        }
    }

    /**
     * Shake camera
     * @param {number} duration 
     */
    shakeCamera(vector, duration) {
        this.screenShaker.shake(this.camera, vector, duration);
    }

    //#endregion

    /**
     * Fire game event
     * @param {string} name event name
     * @param {any} args arguments
     */
    fireEvent(name, args) {
        if (this.gameEvents[name] != null && this.gameEvents[name].subscriptions != null) {
            for (const subscription in this.gameEvents[name].subscriptions) {
                this.gameEvents[name].subscriptions[subscription](args);
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
        if (this.gameEvents[name] == null) {
            this.gameEvents[name] = {
                subscriptions: {}
            };
        }

        const newSubscription = GF.Utils.uniqueId("GameEventSubscription_");
        this.gameEvents[name].subscriptions[newSubscription] = callback;
    }

    /**
     * Setop listening to game event 
     * @param {string} name event name
     * @param {string} subscription the subscription
     */
    offEvent(name, subscription) {
        if (this.gameEvents[name] != null && this.gameEvents[name].subscriptions != null) {
            delete this.gameEvents[name].subscriptions[subscription];
        }
    }

    /**
     * Set game variable
     * @param {string} name variable name
     * @param {any} value the new value
     */
    setVariable(name, value) {
        this.variables[name] = value;
        this.variableChanged(name);
    }

    /**
     * Get game variable value
     * @param {string} name variable name
     * @return value
     */
    getVariable(name) {
        return this.variables[name];
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
        if (this.variablesChangeEvents[name] != null && this.variablesChangeEvents[name].subscriptions != null) {
            for (const subscription in this.variablesChangeEvents[name].subscriptions) {
                this.variablesChangeEvents[name].subscriptions[subscription](this.variables[name]);
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
        if (this.variablesChangeEvents[name] == null) {
            this.variablesChangeEvents[name] = {
                subscriptions: {}
            };
        }

        const newSubscription = GF.Utils.uniqueId("GameVariableChangeSubscription_");
        this.variablesChangeEvents[name].subscriptions[newSubscription] = callback;
        return newSubscription;
    }

    /**
     * Setup listening to game variable change event 
     * @param {string} name variable name
     * @param {string} subscription the subscription
     */
    offVariableChange(name, subscription) {
        if (this.variablesChangeEvents[name] != null) {
            this.variablesChangeEvents[name].subscriptions[subscription] = undefined;
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
                    this.intersectableObjects.push(child);
                }
            } else {
                object.object3D.gameObject = object;
                this.intersectableObjects.push(object.object3D);
            }
        } else {
            this.intersectableObjects.push(object);
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
                    index = this.intersectableObjects.indexOf(child);
                    if (index >= 0) {
                        this.intersectableObjects.splice(index, 1);
                    }
                }
            } else {
                index = this.intersectableObjects.indexOf(object.object3D);
                if (index >= 0) {
                    this.intersectableObjects.splice(index, 1);
                }
            }
        } else  {
            index = this.intersectableObjects.indexOf(object);
                if (index >= 0) {
                    this.intersectableObjects.splice(index, 1);
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
        this.objects[id] = object;

        if (this.objectsArray == null) {
            this.objectsArray = [];
        }
        this.objectsArray.push(object);

        return id;
    }

    /**
     * Add new object to scene
     * @param {any} object
     * @param 
     */
    addToScene(object, affectRayCollision) {
        if (affectRayCollision) {
            if (this.rayCollisionObjects == null) {
                this.rayCollisionObjects = [];
            }
            this.rayCollisionObjects.push(object);
        }
        this.scene.add(object);
    }

    /**
     * Remove object from scene
     * @param {any} object
     */
    removeFromScene(object) {
        this.scene.remove(object);
        if (this.rayCollisionObjects != null) {
            var index = this.rayCollisionObjects.indexOf(object);
            if (index >= 0) {
                this.rayCollisionObjects.splice(index, 1);
            }
        }
    }

    /**
     * Remove GameObject from the game
     * @param {string} id 
     */
    removeObject(id, destroyObject = true) {
        const object = this.objects[id];
        if (object != null) {
            if (destroyObject) {
                object._destroy();
            }
            delete this.objects[id];
        }

        if (this.objectsArray != null) {
            var i = this.objectsArray.findIndex(o => o === object);
            if (i >= 0) {
                this.objectsArray.splice(i, 1);
            }
        }
    }

    /**
     * Remove all GameObjects from the game
     */
    removeAllObjects() {
        for (const object in this.objects) {
            this.objects[object]._destroy();
            delete this.objects[object];
        }
        this.objects = {};
        this.objectsArray = [];
    }

    /**
     * Get object
     */
    getObject(objectId) {
        return this.objects[objectId];
    }

    /**
     * Get all objects
     */
    getObjects() {
        return this.objectsArray;
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
            this.init();
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
        this.renderer.clear(true, true, true);
        this.renderer.dispose();
        this.destroy();
        this.initialized = false;
        }
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.running) {
            this.running = true;
            this.currentTime = new Date().valueOf();
            this.delta = 0;
            this.lag = 0;
            this.animate();
        }
    }

    /**
     * Pause the game
     */
    pause() {
        if (this.running) {
            if (this.animationFrameRequest) {
                cancelAnimationFrame(this.animationFrameRequest);
            }
            this.running = false;
        }
    }

    //#endregion

    //#region Internal

    /**
     * init
     */
    init() {
        this.eventManager._init();
        this.inputManager._init();

        this.onInit();
        if (this.initCallback) {
            this.initCallback();
        }

        for (var i = 0; i < this.objectsArray.length; i++) {
            this.objectsArray[i]._init(this.scene, this.camera, this);
        }

        if (this.usePointerLock) {
            this.documentClickCallback = this.documentClick.bind(this);
            this.pointerlockChangeCallback = this.pointerlockChange.bind(this);
            document.body.addEventListener("click", this.documentClickCallback);
            document.addEventListener('pointerlockchange', this.pointerlockChangeCallback, false);

            setTimeout(() => {
                this.documentClick();
            })
        }

        // raycaster
        if (this.useMouseRaycasting) {
            this.mouseMoveCallback = this.onMouseMove.bind(this);
            document.addEventListener('mousemove', this.mouseMoveCallback, false);
        }

        this.numUpdates = 0;
        this.upt = 0;
    }

    /**
     * animate
     */
    animate() {
        if (this.running === true) {

            // calculate delta
            this.newTime = new Date().valueOf();
            const elapsed = this.newTime - this.currentTime;
            this.currentTime = this.newTime;

            // limit updating of objects outside the view
            if (this.camera != null && this.limitRenderedObjects === true) {
                for (const object in this.objects) {
                    if (this.objects[object].object3D != null) {
                        if (this.objects[object].object3D.position.distanceTo(this.camera.position) < this.viewFarPlane * 1.2) {
                            this.objects[object]._setActive(true);
                        } else {
                            this.objects[object]._setActive(false);
                        }
                    }
                }
            }

            //Add the elapsed time to the lag counter
            this.lag += elapsed;
            // update the frame if the lag counter is greater than or equal to the frame duration
            while (this.lag >= MS_PER_UPDATE){  
                // update the logic
                this.update(MS_PER_UPDATE * this.speed);
                // reduce the lag counter by the frame duration
                this.lag -= MS_PER_UPDATE;

                if (!this.running) {
                    return;
                }
            }

            // update screen shaker
            this.screenShaker.update(this.camera);

            // raycasting
            if (this.useMouseRaycasting) {
                if (this.currentMouseIntersection != null && this.currentMouseIntersection.object != null) {
                    this.currentMouseIntersection.object._mouseIntersect(false);
                }

                this.currentMouseIntersection = this.collisionManager.intersectObjects(this.mouseCoords, this.camera);

                if (this.currentMouseIntersection != null && this.currentMouseIntersection.object != null) {
                    this.currentMouseIntersection.object._mouseIntersect(true);
                }
            }

            this.renderer.clear();

            // render
            if (this.useRenderLayers === true) {
                this.renderer.autoClear = true;
                this.camera.layers.set(0);
                this.renderer.render(this.scene, this.camera);

                this.renderer.autoClear = false;

                this.camera.layers.set(1);
                this.renderer.render(this.scene, this.camera);
            } else {
                if (this.useOutlineEffect) {
                    this.outlineEffect.render(this.scene, this.camera);
                } else {
                    this.renderer.render(this.scene, this.camera);
                }
            }


            // animation frame
            this.animationFrameRequest = requestAnimationFrame(this.animateFunction);
        }
    }

    /**
     * update
     * @param {number} delta 
     */
    update(delta) {
        this.eventManager._update(delta);
        this.inputManager._update(delta);
        this.animationManager._update(delta);

        this.onUpdate(delta);
        if (this.updateCallback) {
            this.updateCallback(delta);
        }

        for (var i = 0; i < this.objectsArray.length; i++) {
            this.objectsArray[i]._update(delta);
        }

        this.collisionManager._update();
    }

    /**
     * destroy
     */
    destroy() {
        this.renderer.dispose();

        this.setEnvironmentLight(null);

        for (var i = 0; i < this.objectsArray.length; i++) {
            this.objectsArray[i]._destroy();
        }

        this.eventManager._destroy();
        this.inputManager._destroy();

        this.onDestroy();
        if (this.destroyCallback) {
            this.destroyCallback();
        }

        if (this.usePointerLock) {
            document.exitPointerLock();
            document.body.removeEventListener("click", this.documentClickCallback);
            document.removeEventListener('pointerlockchange', this.pointerlockChangeCallback, false);
        }

        if (this.useMouseRaycasting) {
            document.removeEventListener('mousemove', this.mouseMoveCallback, false);
        }

    }

    //#endregion
    
    /**
     * On mouse move 
     */
    onMouseMove(event) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouseCoords.x = ( (event.clientX - rect.x) / rect.width ) * 2 - 1;
        this.mouseCoords.y = - ( (event.clientY - rect.y) / rect.height ) * 2 + 1;
    }

    /**
     * Document click
     */
    documentClick() {
        if (this.usePointerLock) {
            document.body.requestPointerLock();
        }
    }

    /**
     * Pointer lock state change
     */
    pointerlockChange() {
        if(document.pointerLockElement === document.body ||
            document.mozPointerLockElement === document.body) {
            this.onPointerLockChange(true);
            if (this.pointerLockChangeCallback) {
                this.pointerLockChangeCallback(true);
            }
        } else {
            this.onPointerLockChange(false);
            if (this.pointerLockChangeCallback) {
                this.pointerLockChangeCallback(false);
            }
        }
    }
}
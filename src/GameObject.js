
// Constants
const GRAVITY_ACCELERATION = -0.98;
const MAX_SPEED_HISTORY = 3;

/**
 * GameObject (Base Class for every object in the game)
 * Can be extended
 */
GF.GameObject = class GameObject extends GF.EmptyObject {

    /**
     * Constructor
     * @param {THREE.Object3D | BuildObjectParams} object3DParams the actual THREE.Object3D or the params to build one (@see GF.Utils.build3DObject)
     * @param {PhysicsParams} physicsParams the physics params (optional)
     * * #### PhysicsParams ####
     * * `GF.CollisionVolume: collisionVolume` - collision volume
     * * `dynamic: boolean` - If object is dynamic (if it will move and react to forces or be stationary)
     * * `gravity: boolean` - If object is affected by gravity (dynamic=true only)
     * * `solid: boolean` - If object will collide with solid objects
     * * `mass: number` - The object mass
     * * `restitution: number` - The object collision restitution coefficient (0 - 1)
     * * `collisionFriction: number` - The object collision friction coefficient
     * * `maxSpeed: {horizontal: number, vertical: number}` - Max speed horizontal (x & z) or vertical (y)
     * * `useRayCollision: boolean` - If object will use ray collision to collide with terrain objects (y ray collision only)
     * * `rayCollisionHeight: number` - Ray collision height
     * * `rayCollisionMinStepHeight: number` - Ray collision min step for the object to be able to climb
     * * `collisionGroups: string[]` - The collision groups
     * * `rotationMatchesDirection: boolean` - If the Object3D rotation will match the direction of movement
     * * `affectsRayCollision: boolean` - If this Object3D  affects ray collision
     * @param {boolean} noUpdate if this object will not be updated every frame (optional)
     */
    constructor(object3DParams, physicsParams, noUpdate = false) {
        super();

        this.alive = false;
        this.type = this.constructor.name;
        this.position = new THREE.Vector3(0,0,0);
        this.rotation = new THREE.Vector3(0,0,0);
        this.scale = new THREE.Vector3(0,0,0);

        this._static = noUpdate;

        this._keySubscriptions = [];
        this._mouseSubscriptions = [];
        this._onInitSubscriptions = [];

        this.intersectedByMouse = false;
        this._object3DParams = object3DParams;

        // physics
        if (physicsParams != null) {
            this.hasPhysics = physicsParams.hasPhysics != null ? physicsParams.hasPhysics : true;
            this.speed = new THREE.Vector3(0,0,0);
            this.movementDirection = new THREE.Vector3(0,0,0);

            this.dynamic = physicsParams.dynamic != null ? physicsParams.dynamic : false;
            this.affectedByGravity = physicsParams.gravity != null ? physicsParams.gravity : true;
            this.mass = physicsParams.mass != null ? physicsParams.mass : 1;
            this.restitution = physicsParams.restitution != null ? physicsParams.restitution : 0;
            this.kineticCollisionFriction = physicsParams.collisionFriction;
            this.maxHorizontalSpeed = physicsParams.maxSpeed != null ? physicsParams.maxSpeed.horizontal : null;
            this.maxVerticalSpeed = physicsParams.maxSpeed != null ? physicsParams.maxSpeed.vertical : null;
            this.rotationMatchesDirection = physicsParams.rotationMatchesDirection != null ? physicsParams.rotationMatchesDirection : false;
            this.useRayCollision = physicsParams.useRayCollision;
            this.rayCollisionHeight = physicsParams.rayCollisionHeight != null ? physicsParams.rayCollisionHeight : 1;
            this.rayCollisionMinStepHeight = physicsParams.rayCollisionMinStepHeight != null ? physicsParams.rayCollisionMinStepHeight : 0.1;

            // internal properties
            this._collisionVolume = physicsParams.collisionVolume;
            this._affectedCollisionGroups = physicsParams.collisionGroups != null ? physicsParams.collisionGroups : [];
            if (physicsParams.solid) {
                this._affectedCollisionGroups.splice(0, 0, "solid");
            }
            this._affectsRayCollision = physicsParams.affectsRayCollision;

            this._resultForce = new THREE.Vector3(0,0,0);

            this._acceleration = new THREE.Vector3(0,0,0);
            this._frictionVector = new THREE.Vector3(0,0,0);

            this._speedHistory = {
                "x": [],
                "y": [],
                "z": []
            };

            this._positionHistory = {
                "x": [],
                "y": [],
                "z": []
            };
        }
        else
        {
            this.hasPhysics = false;
        }
    }

    //#region Physics

    /**
     * Update physics on collision
     * @param {Vector3} normal 
     * @param {Vector3} collisionPoint 
     */
     _updatePhysicsOnCollision(normal, point) {
        if (normal != null) {
            if (normal.x != 0) {
                this.speed.x = 0;
                this.object3D.position.x = point.x;
            }
            if (normal.y != 0) {
                this.speed.y = 0;
                this.object3D.position.y = point.y;
            }
            if (normal.z != 0) {
                this.speed.z = 0;
                this.object3D.position.z = point.z;
            }
        }
    }

    /**
     * Add speed history on axis
     * @param {string} axis 
     */
    _addSpeedHistoryOnAxis(axis) {
        this._speedHistory[axis].push(this.speed[axis]);

        if (this._speedHistory[axis].length > MAX_SPEED_HISTORY) {
            this._speedHistory[axis].splice(0, 1);
        }
    }

    /**
     * Add position history on axis
     * @param {string} axis 
     */
    _addPositionHistoryOnAxis(axis) {
        this._positionHistory[axis].push(this.object3D.position[axis]);

        if (this._positionHistory[axis].length > MAX_SPEED_HISTORY) {
            this._positionHistory[axis].splice(0, 1);
        }
    }

    /**
     * Register speed history
     */
    _registerSpeedHistory() {
        this._addSpeedHistoryOnAxis("x");
        this._addSpeedHistoryOnAxis("y");
        this._addSpeedHistoryOnAxis("z");
    }

    /**
     * Register position history
     */
    _registerPositionHistory() {
        this._addPositionHistoryOnAxis("x");
        this._addPositionHistoryOnAxis("y");
        this._addPositionHistoryOnAxis("z");
    }

    /**
     * Internal update function
     * @param {number} delta 
     */
    _internalUpdatePhysics(delta) {
        // move object with speed
        this.object3D.position.x += this.speed.x * delta;
        this.object3D.position.y += this.speed.y * delta;
        this.object3D.position.z += this.speed.z * delta;

        if (this.rotationMatchesDirection) {
            this.syncRotationWithDirection(delta);
        }

        // check ray collision
        if (this.useRayCollision) {
            this.floorCollision = this.game.physics.checkRayCollision(this, new THREE.Vector3(0, -1, 0), this.rayCollisionHeight);
            if (this.floorCollision != null) {
                if (this.floorCollision.point.y > this.object3D.position.y) {
                    if (this.speed.y < 0) {
                        this.speed.y = 0;
                    }
                    this._isColliding = true;

                    if (this.floorCollision.point.y - this.object3D.position.y < this.rayCollisionMinStepHeight) {
                        this.object3D.position.y = this.floorCollision.point.y;
                    } else {
                        this.object3D.position.x = this.getLastPosition("x");
                        this.object3D.position.y = this.getLastPosition("y");
                        this.object3D.position.z = this.getLastPosition("z");
                    }
                }
            }
        }

        // register history
        this._registerPositionHistory();
        this._registerSpeedHistory();

        // super update logic
        this._updateSubRoutine(delta);
        this.onUpdate(delta);

        // calculate movement direction
        if (this.speed.x != 0 || this.speed.z != 0) {
            this.movementDirection.copy(this.speed);
            this.movementDirection.normalize();
        }

        // apply kinetic friction
        if (this.speed.length() > 0 && this._isColliding && this.kineticCollisionFriction > 0) {
            // Ff = u * Fn ; Fn = m * g;
            this._frictionVector.copy(this.speed);
            this._frictionVector.normalize();
            this._frictionVector.multiplyScalar(GRAVITY_ACCELERATION * this.game._speed * this.kineticCollisionFriction);

            // subtract friction
            this.speed.add(this._frictionVector);

            if (this._frictionVector.dot(this.speed) > 0) {
                this.speed.set(0,0,0);
            }
        }

        // calculate acceleration based on forces applied
        this._resultForce.divideScalar(this.mass);
        this._acceleration.set(0, this.affectedByGravity ? GRAVITY_ACCELERATION * this.game._speed : 0, 0); // set base gravity acceleration
        this._acceleration.add(this._resultForce);

        // acceleration
        this.speed.add(this._acceleration);

        // clamp horizontal speed
        if (this.maxHorizontalSpeed != null && this.maxHorizontalSpeed >= 0) {
            this.speedY = this.speed.y;
            this.speed.y = 0;
            this.speed.clampLength(0, this.maxHorizontalSpeed);
            this.speed.y = this.speedY;
        }

        // clamp vertical speed
        if (this.maxVerticalSpeed != null && this.maxVerticalSpeed >= 0) {
            this.speed.y = Math.min(this.speed.y, this.maxVerticalSpeed);
        }

        this._resultForce.set(0, 0, 0);

        this._isColliding = false;
        this._collisionNormal = new THREE.Vector3(0,0,0);
    }

    //#endregion

    //#region Physics API

    /**
     * Set physics collision enabled
     * @param {boolean} enabled 
     */
    setCollisionEnabled(enabled) {
        this.game.physics.setVolumeEnabled(this._collisionVolumeReference, enabled)
    }

    /**
     * Rotate towards angle
     * @param {number} delta time interval passed
     * @param {number} angle the target angle in radians
     */
    rotateTowardsAngle(delta, angle) {
        var quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), angle );
        this.object3D.quaternion.slerp( quaternion, delta * 10 );
    }

    /**
     * Rotate to angle
     * @param {number} angle the target angle in radians
     */
    rotateToAngle(angle) {
        this.object3D.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), angle );
    }

    /**
     * Sync rotation with direction
     */
    syncRotationWithDirection(delta) {
        this.rotateTowardsAngle(delta, this.getDirectionAngle());
    }

    /**
     * Check if object is stationary on axis
     * @param {string} axis the axis name ("x", "y" or "z")
     */
    isStationary(axis) {
        for (var i = 0; i < this._speedHistory[axis].length; i++) {
            if (this._speedHistory[axis][i] != 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get speed tendency on axis (positive or negative)
     * @param {string} axis the axis name ("x", "y" or "z")
     */
    getSpeedTendency(axis) {
        var tendency = 0;
        for (var i = 0; i < this._speedHistory[axis].length; i++) {
            tendency += this._speedHistory[axis][i];
        }
        return Math.abs(tendency / this._speedHistory[axis].length);
    }

    /**
     * Get last speed on axis
     * @param {string} axis the axis name ("x", "y" or "z")
     */
    getLastSpeed(axis) {
        return this._speedHistory[axis][this._speedHistory[axis].length - 1];
    }

    /**
     * Get last position on axis
     * @param {string} axis the axis name ("x", "y" or "z")
     */
    getLastPosition(axis) {
        return this._positionHistory[axis][this._positionHistory[axis].length - 1];
    }

    /**
     * Get position history on axis
     * @param {string} axis the axis name ("x", "y" or "z")
     */
    getPositionHistory(axis) {
        return this._positionHistory[axis];
    }

    /**
     * Get direction angle
     */
    getDirectionAngle() {
        const angle = Math.atan2(-this.movementDirection.z, this.movementDirection.x);
        return angle < 0 ? (Math.PI * 2) + angle : angle;
    }

    /**
     * Apply force
     * @param {THREE.vector3} force the force to apply
     */
    applyForce(force) {
        this._resultForce.x += force.x;
        this._resultForce.y += force.y;
        this._resultForce.z += force.z;
    }

    //#endregion

    //#region Generic API

    /**
     * Get Object Id
     * @returns 
     */
    getId() {
        return this._id;
    }

    /**
     * Add a child THREE.Object3D or a GameObject
     * @param {THREE.Object3D | GF.GameObject} object the object
     * @param {boolean} affectsRayCollision if the object affects ray collision (only for THREE.Object3D type)
     */
    addChild(object, affectsRayCollision) {
        if (this.object3D && object != null) {
            if (object.object3D) {
                this.game.addObject(object);
                this.object3D.add(object.object3D);
            } else {
                this.addToScene(object, affectsRayCollision, this.object3D);
            }

            if (this.children == null) {
                this.children = [];
            }

            if (this.children.indexOf(object) < 0) {
                this.children.push(object);
            }
        }
    }

    /**
     * Remove a child THREE.Object3D or a GameObject
     * @param {THREE.Object3D | GF.GameObject} object 
     */
    removeChild(object) {
        if (this.object3D && object != null) {
            const index = this.children.indexOf(object);
            if (index >= 0) {
                const child = this.children.splice(index, 1);

                if (child.object3D) {
                    this.object3D.remove(child.object3D);
                } else {
                    this.object3D.remove(child);
                }
            }
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

            if (this._object3DParams) {
                this.object3D = GF.Utils.build3DObject(this.game.loader, this._object3DParams);

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

            // init physics
            if (this.hasPhysics) {
                this.speed = new THREE.Vector3(0,0,0);
                this._acceleration = new THREE.Vector3(0,0,0);
                this._frictionVector = new THREE.Vector3(0,0,0);
    
                this.onInit();
    
                if (this.object3D) {
                    for (var i = 0; i < MAX_SPEED_HISTORY; i++) {
                        this._registerSpeedHistory();
                        this._registerPositionHistory();
                    }
    
                    if (this._collisionVolume == null) {
                        this._collisionVolume = GF.Utils.buildCollisionVolumeFrom3DObject(this.object3D);
                    }
                    
                    if (this._collisionVolume != null) {
                        this._collisionVolumeReference = this.game.physics.addVolume(this, this._collisionVolume, this.object3D.position, true, this._affectedCollisionGroups).id;
                    }
    
                    this.lag = 0;
    
                    this._isColliding = false;
                    this._collisionNormal = new THREE.Vector3(0,0,0);
                }
            } else {
                this.onInit();
            }

            this._initSubRoutine();
        }
    }

    /**
     * Update this object
     */
    _update(delta) {
        if (this.alive === true) {
            this._updateStateMachine(delta);

            // update animation mixer
            if (this._animationMixer) {
                this._animationMixer.update(delta);

                if (!this._animationActions[this.animationActiveAction].isRunning() && this.currentAnimationFinishCallback) {
                    this.currentAnimationFinishCallback();
                }
            }

            // update logic
            if (this.hasPhysics && this.dynamic && this.object3D) {
                if (delta <= MS_PER_UPDATE) {
                    this._internalUpdatePhysics(delta);
                } else {
                    this.lag += delta;
                    // update physics with a fixed time stamp
                    while (this.lag >= MS_PER_UPDATE) {  
                        this._internalUpdatePhysics(MS_PER_UPDATE);
                        // reduce the lag counter by the frame duration
                        this.lag -= MS_PER_UPDATE;
                    }
                }
            } else {
                this._updateSubRoutine(delta);
                this.onUpdate(delta);
            }
        }
    }

    /**
     * Destroy this object
     */
    _destroy() {
        if (this.alive === true) {
            if (this.object3D) {
                this.game.scene.remove(this.object3D);
            }
            this.alive = false;

            this.onDestroy();

            // destroy children
            if (this.children) {
                for (const child of this.children) {
                    if (child.destroy) {
                        child.destroy();
                    }
                }
            }

            if (this._collisionVolumeReference) {
                this.game.physics.removeVolume(this._collisionVolumeReference);
            }

            this._destroySubRoutine();
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

    /**
     * On collision enter
     * @param {Collision} other the collision data
     * @param {Vector3} normal the collision normal
     */
    onCollisionEnter(other, normal) {

    }

    /**
     * On collision exit
     * @param {Collision} other the collision data
     */
    onCollisionExit(other) {

    }

    /**
     * On intersect by mouse
     */
    onIntersectedByMouse(){
    }

    //#endregion
}

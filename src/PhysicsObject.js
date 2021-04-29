
// Constants
const GRAVITY_ACCELERATION = -0.98;
const MAX_SPEED_HISTORY = 3;

/**
 * PhysicsObject
 */
GF.PhysicsObject = class PhysicsObject extends GF.GameObject {
    /**
     * PhysicsObject
     * @param {THREE.Object3D | BuildObjectParams} object3DParams the actual THREE.Object3D or the params to build one (@see GF.Utils.build3DObject)
     * @param {GF.CollisionVolume} collisionVolume collision volume
     * @param {PhysicsParams} params physics params
     * #### PhysicsParams ####
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
     */
    constructor(object3DParams, collisionVolume, params) {
        super(object3DParams);

        if (params == null) {
            params = {};
        }

        // public access properties
        this.speed = new THREE.Vector3(0,0,0);
        this.movementDirection = new THREE.Vector3(0,0,0);

        this.dynamic = params.dynamic;
        this.affectedByGravity = params.gravity != null ? params.gravity : true;
        this.mass = params.mass != null ? params.mass : 1;
        this.restitution = params.restitution != null ? params.restitution : 0;
        this.kineticCollisionFriction = params.collisionFriction;
        this.maxHorizontalSpeed = params.maxSpeed != null ? params.maxSpeed.horizontal : null;
        this.maxVerticalSpeed = params.maxSpeed != null ? params.maxSpeed.vertical : null;
        this.rotationMatchesDirection = params.rotationMatchesDirection != null ? params.rotationMatchesDirection : false;
        this.useRayCollision = params.useRayCollision;
        this.rayCollisionHeight = params.rayCollisionHeight != null ? params.rayCollisionHeight : 1;
        this.rayCollisionMinStepHeight = params.rayCollisionMinStepHeight != null ? params.rayCollisionMinStepHeight : 0.1;

        // internal properties
        this._collisionVolume = collisionVolume;
        this._affectedCollisionGroups = params.collisionGroups != null ? params.collisionGroups : [];
        if (params.solid) {
            this._affectedCollisionGroups.splice(0, 0, "solid");
        }

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

    //#region Internal

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
    _internalUpdate(delta) {
        // move object with speed
        this.object3D.position.x += this.speed.x * delta;
        this.object3D.position.y += this.speed.y * delta;
        this.object3D.position.z += this.speed.z * delta;

        if (this.rotationMatchesDirection) {
            this.syncRotationWithDirection(delta);
        }

        // check ray collision
        if (this.useRayCollision) {
            this.floorCollision = this.collision.checkRayCollision(this, new THREE.Vector3(0, -1, 0), this.rayCollisionHeight);
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

    /**
     * Update this object
     */
    _update(delta) {
        if (this.alive === true) {
            super.onUpdate(delta);

            if (this.dynamic) {
                if (delta <= MS_PER_UPDATE) {
                    this._internalUpdate(delta);
                } else {
                    this.lag += delta;
                    // update physics with a fixed time stamp
                    while (this.lag >= MS_PER_UPDATE) {  
                        this._internalUpdate(MS_PER_UPDATE);
                        // reduce the lag counter by the frame duration
                        this.lag -= MS_PER_UPDATE;
                    }
                }
            } else {
                this.onUpdate(delta);
            }
        }
    }

    //#endregion

    //#region API

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

    //#region life cycle

    /**
     * Init
     */
    onInit(){
        this.speed = new THREE.Vector3(0,0,0);
        this._acceleration = new THREE.Vector3(0,0,0);
        this._frictionVector = new THREE.Vector3(0,0,0);
        super.onInit();
        for (var i = 0; i < MAX_SPEED_HISTORY; i++) {
            this._registerSpeedHistory();
            this._registerPositionHistory();
        }

        if (this._collisionVolume == null) {
            this._collisionVolume = GF.Utils.buildCollisionVolumeFrom3DObject(this.object3D);
        }
        
        if (this._collisionVolume != null) {
            this._collisionVolumeReference = this.collision.addVolume(this, this._collisionVolume, this.object3D.position, true, this._affectedCollisionGroups).id;
        }

        this.lag = 0;

        this._isColliding = false;
        this._collisionNormal = new THREE.Vector3(0,0,0);
    }

    /**
     * On update (to override if necessary)
     * @param {number} delta 
     */
    onUpdate(delta){
    }

    /**
     * Destroy
     */
    onDestroy() {
        if (this._collisionVolumeReference) {
            this.collision.removeVolume(this._collisionVolumeReference);
        }
    }
}
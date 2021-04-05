
// Constants
const GRAVITY_ACCELERATION = -0.98;
const MAX_SPEED_HISTORY = 3;

/**
 * PhysicsObject
 */
GF.PhysicsObject = class PhysicsObject extends GF.GameObject {
    /**
     * PhysicsObject
     * @param {any} object3D object 3D pre-build params
     * @param {GF.CollisionVolume} collisionVolume collision volume
     * @param {any} params physics params
     */
    constructor(object3D, collisionVolume, params) {
        super(object3D);

        if (params == null) {
            params = {};
        }

        // public access properties
        this.speed = new THREE.Vector3(0,0,0);
        this.movementDirection = new THREE.Vector3(0,0,0);

        this.useRayCollision = params.useRayCollision;
        this.rayCollisionHeight = params.rayCollisionHeight != null ? params.rayCollisionHeight : 1;
        this.rayCollisionMinStepHeight = params.rayCollisionMinStepHeight != null ? params.rayCollisionMinStepHeight : 0.1;

        this.collisionVolume = collisionVolume;
        this.dynamic = params.dynamic;
        this.mass = params.mass != null ? params.mass : 1;
        this.restitution = params.restitution != null ? params.restitution : 0.01;
        this.floorFriction = params.floorFriction;
        this.maxHorizontalSpeed = params.maxSpeed != null ? params.maxSpeed.horizontal : null;
        this.maxVerticalSpeed = params.maxSpeed != null ? params.maxSpeed.vertical : null;
        this.affectedByGravity = params.gravity != null ? params.gravity : true;
        this.rotationMatchesDirection = params.rotationMatchesDirection != null ? params.rotationMatchesDirection : false;

        // internal properties
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
        this.object3D.position.x += this.speed.x * delta * DELTA_MULTIPLIER;
        this.object3D.position.y += this.speed.y * delta * DELTA_MULTIPLIER;
        this.object3D.position.z += this.speed.z * delta * DELTA_MULTIPLIER;

        if (this.rotationMatchesDirection) {
            this.rotateTowardsAngle(delta, this.getDirectionAngle());
        }

        // check ray collision
        if (this.useRayCollision) {
            this.floorCollision = this.collision.checkRayCollision(this, new THREE.Vector3(0, -1, 0), this.rayCollisionHeight);
            if (this.floorCollision != null) {
                if (this.floorCollision.point.y > this.object3D.position.y) {
                    if (this.speed.y < 0) {
                        this.speed.y = 0;
                    }

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

        // calculate acceleration based on forces applied
        this._resultForce.divideScalar(this.mass);
        this._acceleration.set(0, this.affectedByGravity ? GRAVITY_ACCELERATION * this.game._speed : 0, 0); // set base gravity acceleration
        this._acceleration.add(this._resultForce);

        // acceleration
        this.speed.add(this._acceleration);

        // apply floor friction
        if ((this.speed.x != 0 || this.speed.z != 0)
        && this.getLastSpeed("y") === 0 && this._acceleration.x === 0 && this._acceleration.z === 0 && this.floorFriction > 0) {
            // Ff = u * Fn ; Fn = m * g;
            this._frictionVector.set(this.speed.x, 0, this.speed.z);
            this._frictionVector.normalize();
            this._frictionVector.multiplyScalar(GRAVITY_ACCELERATION * this.floorFriction);

            // subtract friction
            this.speed.x += this._frictionVector.x;
            this.speed.z += this._frictionVector.z;

            if (this._frictionVector.dot(this.speed) > 0) {
                this.speed.set(0,0,0);
            }
        }

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
        this.object3D.quaternion.slerp( quaternion, 0.01 * delta );
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
    syncRotationWithDirection() {
        this.rotateToAngle(this.getDirectionAngle());
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
        this._resultForce.x += force.x * DELTA_MULTIPLIER;
        this._resultForce.y += force.y * DELTA_MULTIPLIER;
        this._resultForce.z += force.z * DELTA_MULTIPLIER;
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
        this._registerSpeedHistory();
        this._registerPositionHistory();

        if (this.collisionVolume == null) {
            this.collisionVolume = GF.Utils.buildCollisionVolumeFrom3DObject(this.object3D);
        }
        
        if (this.collisionVolume != null) {
            this.collisionVolumeReference = this.collision.addVolume(this, this.collisionVolume, this.object3D.position, true, this._affectedCollisionGroups).id;
        }

        this.lag = 0;
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
        if (this.collisionVolumeReference) {
            this.collision.removeVolume(this.collisionVolumeReference);
        }
    }
}
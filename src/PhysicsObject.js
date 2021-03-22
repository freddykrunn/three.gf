
// Constants
const DELTA_MULTIPLIER = 0.01; // convert 'ms' to 's'
const GRAVITY_ACCELERATION = -9.8 * DELTA_MULTIPLIER; // 'm/s'
const MAX_SPEED_HISTORY = 3;

/**
 * PhysicsObject
 */
GF.PhysicsObject = class PhysicsObject extends GF.GameObject {
    constructor(object3D, collisionVolume, params) {
        super(object3D);

        if (params == null) {
            params = {};
        }

        this.useRayCollision = params.useRayCollision;
        this.rayCollisionHeight = params.rayCollisionHeight != null ? params.rayCollisionHeight : 1;
        this.rayCollisionMinStepHeight = params.rayCollisionMinStepHeight != null ? params.rayCollisionMinStepHeight : 0.1;

        this.collisionVolume = collisionVolume;
        this.dynamic = params.dynamic;
        this.solid = params.solid;
        this.mass = params.mass != null ? params.mass : 1;
        this.restitution = params.restitution != null ? params.restitution : 0.01;
        this.floorFriction = params.floorFriction;
        this.maxHorizontalSpeed = params.maxSpeed != null ? params.maxSpeed.horizontal : null;
        this.maxVerticalSpeed = params.maxSpeed != null ? params.maxSpeed.vertical : null;
        this.affectedByGravity = params.gravity != null ? params.gravity : true;

        this.resultForce = new THREE.Vector3(0,0,0);

        this.speed = new THREE.Vector3(0,0,0);
        this.acceleration = new THREE.Vector3(0,0,0);
        this.movementDirection = new THREE.Vector3(0,0,0);
        this.frictionVector = new THREE.Vector3(0,0,0);

        this.speedHistory = {
            "x": [],
            "y": [],
            "z": []
        };

        this.positionHistory = {
            "x": [],
            "y": [],
            "z": []
        };
    }

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
        this.speedHistory[axis].push(this.speed[axis]);

        if (this.speedHistory[axis].length > MAX_SPEED_HISTORY) {
            this.speedHistory[axis].splice(0, 1);
        }
    }

    /**
     * Add position history on axis
     * @param {string} axis 
     */
    _addPositionHistoryOnAxis(axis) {
        this.positionHistory[axis].push(this.object3D.position[axis]);

        if (this.positionHistory[axis].length > MAX_SPEED_HISTORY) {
            this.positionHistory[axis].splice(0, 1);
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
     * Check if object is stationary on axis
     */
    isStationary(axis) {
        for (var i = 0; i < this.speedHistory[axis].length; i++) {
            if (this.speedHistory[axis][i] != 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get speed tendency on axis (positive or negative)
     */
    getSpeedTendency(axis) {
        var tendency = 0;
        for (var i = 0; i < this.speedHistory[axis].length; i++) {
            tendency += this.speedHistory[axis][i];
        }
        return Math.abs(tendency / this.speedHistory[axis].length);
    }

    /**
     * Get last speed on axis
     */
    getLastSpeed(axis) {
        return this.speedHistory[axis][this.speedHistory[axis].length - 1];
    }

    /**
     * Get last position on axis
     */
    getLastPosition(axis) {
        return this.positionHistory[axis][this.positionHistory[axis].length - 1];
    }

    /**
     * Get position history on axis
     */
    getPositionHistory(axis) {
        return this.positionHistory[axis];
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
     */
    applyForce(force) {
        this.resultForce.x += force.x * DELTA_MULTIPLIER;
        this.resultForce.y += force.y * DELTA_MULTIPLIER;
        this.resultForce.z += force.z * DELTA_MULTIPLIER;
    }

    /**
     * Init
     */
    onInit(){
        this.speed = new THREE.Vector3(0,0,0);
        this.acceleration = new THREE.Vector3(0,0,0);
        this.frictionVector = new THREE.Vector3(0,0,0);
        super.onInit();
        this._registerSpeedHistory();
        this._registerPositionHistory();

        if (this.collisionVolume == null) {
            this.collisionVolume = GF.Utils.buildCollisionVolumeFrom3DObject(this.object3D);
        }
        
        if (this.collisionVolume != null) {
            this.collisionVolumeReference = this.collision.addVolume(this, this.collisionVolume).id;
        }
    }

    /**
     * Update this object
     */
     _update(delta) {
        if (this.alive === true) {
            super.onUpdate(delta);

            if (this.dynamic) {
                // move object with speed
                this.object3D.position.x += this.speed.x * delta * DELTA_MULTIPLIER;
                this.object3D.position.y += this.speed.y * delta * DELTA_MULTIPLIER;
                this.object3D.position.z += this.speed.z * delta * DELTA_MULTIPLIER;

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
                this.resultForce.divideScalar(this.mass);
                this.acceleration.set(0, this.affectedByGravity ? GRAVITY_ACCELERATION : 0, 0); // set base gravity acceleration
                this.acceleration.add(this.resultForce);

                // acceleration
                this.speed.add(this.acceleration);

                // apply floor friction
                if ((this.speed.x != 0 || this.speed.z != 0)
                && this.getLastSpeed("y") === 0 && this.acceleration.x === 0 && this.acceleration.z === 0 && this.floorFriction > 0) {
                    // Ff = u * Fn ; Fn = m * g;
                    this.frictionVector.set(this.speed.x, 0, this.speed.z);
                    this.frictionVector.normalize();
                    this.frictionVector.multiplyScalar(GRAVITY_ACCELERATION * this.floorFriction);

                    // subtract friction
                    this.speed.x += this.frictionVector.x;
                    this.speed.z += this.frictionVector.z;

                    if (this.frictionVector.dot(this.speed) > 0) {
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

                // clear forces
                this.resultForce.set(0, 0, 0);
            } else {
                this.onUpdate(delta);
            }
        }
    }

    /**
     * On update
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
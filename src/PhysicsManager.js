const MIN_COLLISION_FORCE_SPEED = 4;

/**
 * PhysicsManager
 */
GF.PhysicsManager = class PhysicsManager {
    constructor(game){
        this._game = game;
        this._collisionVolumes = {};
        this._collisionVolumesDictionaryKeys = [];
        this._collisionVolumesDebugHelpers = {};
        this._contacts = [];
        this._raycaster = new THREE.Raycaster();

        this._posDiff = null;
        this._diff = null;
        this._sign = null;
    }

    //#region Internal

    /**
     * Calculate intersection between volumes
     * @param {GF.CollisionVolume} volume1
     * @param {GF.CollisionVolume} volume2
     */
    _calculateIntersectionOfVolumes(volume1, volume2) {
        this._posDiff = [
            volume1.position[0] - volume2.position[0],
            volume1.position[1] - volume2.position[1],
            volume1.position[2] - volume2.position[2]
        ];

        this._diff = [
            (volume1.shape.sizeHalf[0] + volume2.shape.sizeHalf[0]) - Math.abs(this._posDiff[0]),
            (volume1.shape.sizeHalf[1] + volume2.shape.sizeHalf[1]) - Math.abs(this._posDiff[1]),
            (volume1.shape.sizeHalf[2] + volume2.shape.sizeHalf[2]) - Math.abs(this._posDiff[2])
        ]

        // TODO: use epsilon
        if (this._diff[0] >= 0 && this._diff[1] >= 0 && this._diff[2] >= 0){
            if (this._diff[0] <= this._diff[1] && this._diff[0] <= this._diff[2]){
                this._sign = Math.sign(this._posDiff[0]);
                return [
                    [this._sign, 0, 0], // normal 1
                    [-this._sign, 0, 0], // normal 2
                ];
            }
            else if (this._diff[1] <= this._diff[2]){
                this._sign = Math.sign(this._posDiff[1]);
                return [
                    [0, this._sign, 0], // normal 1
                    [0, -this._sign, 0], // normal 2
                ];
            }
            else{
                this._sign = Math.sign(this._posDiff[2]);
                return [
                    [0, 0, this._sign], // normal 1
                    [0, 0, -this._sign], // normal 2
                ];
            }
        }

        return null;
    }

    /**
     * Convert collision groups to hex number
     */
    _convertAffectedCollisionGroupsToHex(groups) {
        const hexArray = new Array(8).fill(0);
        for (const group of groups) {
            if (group === "solid") {
                hexArray[0] = 1;
            } else if (group === "a") {
                hexArray[1] = 1;
            } else if (group === "b") {
                hexArray[2] = 1;
            } else if (group === "c") {
                hexArray[3] = 1;
            } else if (group === "d") {
                hexArray[4] = 1;
            } else if (group === "e") {
                hexArray[5] = 1;
            } else if (group === "f") {
                hexArray[6] = 1;
            } else if (group === "g") {
                hexArray[7] = 1;
            }
        }
        return Number("0x" + hexArray.reverse().join(""))
    }

    /**
     * Update volume position
     * @param {CollisionVolume} volume 
     */
    _updateVolumePosition(volume) {
        if (volume.autoUpdate && volume.gameObject != null && volume.gameObject.object3D != null) {
            volume.position = [
                volume.gameObject.object3D.position.x + volume.shape.offset[0],
                volume.gameObject.object3D.position.y + volume.shape.offset[1],
                volume.gameObject.object3D.position.z + volume.shape.offset[2]
            ];

            if (this._debug) {
                this._updateVolumeDebugBoxPosition(volume.id);
            }
        }
    }

    /**
     * Apply collision impulse on object
     */
    _applyImpulseOnObject(normal, collisionSpeed, collisionDistance, volumeOffset, gameObject, otherVolumePosition) {
        // truncate object position and apply collision speed
        if (gameObject != null && gameObject.dynamic === true && gameObject.speed != null) {
            // truncate object position
            if (normal[0] != 0 && Math.sign(normal[0]) != Math.sign(gameObject.speed.x)) {
                gameObject.speed.x = collisionSpeed[0];
                gameObject.object3D.position.x = (normal[0] * collisionDistance[0]) + otherVolumePosition[0] - volumeOffset[0];
                gameObject._collisionNormal.x += normal[0];
            }
            if (normal[1] != 0 && Math.sign(normal[1]) != Math.sign(gameObject.speed.y)) {
                gameObject.speed.y = collisionSpeed[1];
                gameObject.object3D.position.y = (normal[1] * collisionDistance[1]) + otherVolumePosition[1] - volumeOffset[1];
                gameObject._collisionNormal.y += normal[1];
            }
            if (normal[2] != 0 && Math.sign(normal[2]) != Math.sign(gameObject.speed.z)) {
                gameObject.speed.z = collisionSpeed[2];
                gameObject.object3D.position.z = (normal[2] * collisionDistance[2]) + otherVolumePosition[2] - volumeOffset[2];
                gameObject._collisionNormal.z += normal[2];
            }
            gameObject._isColliding = true;
        }
    }

    /**
     * Update
     */
    _update() {
        var c, oldTouchState, relativeVelocity, collisionSpeedMagnitude, impulse, intersection, mass01, mass02, restitution;

        // calculate intersection
        c = this._contacts[0];
        while (c != null) {
            this._updateVolumePosition(c.volume1);
            this._updateVolumePosition(c.volume2);

            intersection = this._calculateIntersectionOfVolumes(c.volume1, c.volume2);

            // there was a collision
            if (intersection != null) {
                c.normal01 = intersection[0];
                c.normal02 = intersection[1];

                if (!c.touching) {
                    if (c.volume1.gameObject != null) {
                        c.volume1.gameObject.onCollisionEnter(c.volume2, c.normal01);
                    }

                    if (c.volume2.gameObject != null) {
                        c.volume2.gameObject.onCollisionEnter(c.volume1, c.normal02);
                    }
                }

                c.touching = true;

                // if any of the objects are Physics Objects and both collision volumes are solid, calculate collision speed
                if (c.volume1.enabled && c.volume2.enabled && c.volume1.solid && c.volume2.solid && ((c.volume1.gameObject != null && c.volume1.gameObject.speed != null) || (c.volume2.gameObject != null && c.volume2.gameObject.speed != null))) {
                    relativeVelocity = [
                        (c.volume1.gameObject != null ? c.volume1.gameObject.speed.x : 0) - (c.volume2.gameObject != null ? c.volume2.gameObject.speed.x : 0),
                        (c.volume1.gameObject != null ? c.volume1.gameObject.speed.y : 0) - (c.volume2.gameObject != null ? c.volume2.gameObject.speed.y : 0),
                        (c.volume1.gameObject != null ? c.volume1.gameObject.speed.z : 0) - (c.volume2.gameObject != null ? c.volume2.gameObject.speed.z : 0)
                    ];

                    collisionSpeedMagnitude = relativeVelocity[0] * c.normal01[0]
                                + relativeVelocity[1] * c.normal01[1]
                                + relativeVelocity[2] * c.normal01[2];

                    // restitution
                    restitution = Math.min(
                        c.volume1.gameObject != null && c.volume1.gameObject.restitution != null ? c.volume1.gameObject.restitution : 1,
                        c.volume2.gameObject != null && c.volume2.gameObject.restitution != null ? c.volume2.gameObject.restitution : 0
                    );
                    collisionSpeedMagnitude *= restitution;
    
                    if (collisionSpeedMagnitude <= 0) {
                        // collision impulse
                        mass01 = c.volume1.gameObject != null && c.volume1.gameObject.mass != null ? c.volume1.gameObject.mass : null;
                        mass02 = c.volume2.gameObject != null && c.volume2.gameObject.mass != null ? c.volume2.gameObject.mass : null;
                        if (mass01 == null) {
                            mass01 = mass02 != null ? mass02 : 1;
                        } else if (mass02 == null) {
                            mass02 = mass01 != null ? mass01 : 1;
                        }

                        collisionSpeedMagnitude = Math.abs(collisionSpeedMagnitude) < MIN_COLLISION_FORCE_SPEED ? 0 : collisionSpeedMagnitude;
                        impulse = 2 * collisionSpeedMagnitude / (mass01 + mass02);

                        // volume 1 collision speed
                        c.collisionSpeed01 = [
                            -(impulse * mass02 * c.normal01[0]),
                            -(impulse * mass02 * c.normal01[1]),
                            -(impulse * mass02 * c.normal01[2])
                        ]

                        // volume 2 collision speed
                        c.collisionSpeed02 = [
                            -(impulse * mass01 * c.normal02[0]),
                            -(impulse * mass01 * c.normal02[1]),
                            -(impulse * mass01 * c.normal02[2])
                        ]

                        // apply impulse on object 01
                        this._applyImpulseOnObject(c.normal01, c.collisionSpeed01, c.collisionDistance, c.volume1.shape.offset, c.volume1.gameObject, c.volume2.position);

                        // apply impulse on object 02
                        this._applyImpulseOnObject(c.normal02, c.collisionSpeed02, c.collisionDistance, c.volume2.shape.offset, c.volume2.gameObject, c.volume1.position);

                    } else {
                        c.collisionSpeed01 = null;
                        c.collisionSpeed02 = null;
                    }
                }
            } else {
                if (c.touching) {
                    if (c.volume1.gameObject != null) {
                        c.volume1.gameObject.onCollisionExit(c.volume2);
                    }

                    if (c.volume2.gameObject != null) {
                        c.volume2.gameObject.onCollisionExit(c.volume1);
                    }
                }

                c.touching = false;
                c.normal01 = null;
                c.normal02 = null;
                c.collisionSpeed01 = null;
                c.collisionSpeed02 = null;
            }

            c = c.next;
        }
    }

    /**
     * Activate debug mode
     */
    _activateDebugMode(activate) {
        if (activate) {
            // add box helpers
            for (const id of this._collisionVolumesDictionaryKeys) {
                if (!this._game.scene.children.find(c => c == this._collisionVolumesDebugHelpers[id])) {
                    this._game.scene.add(this._collisionVolumesDebugHelpers[id]);

                    this._updateVolumeDebugBoxPosition(id);
                }
            }
            this._debug = true;
        } else {
            // remove box helpers
            for (const id of this._collisionVolumesDictionaryKeys) {
                if (this._collisionVolumesDebugHelpers[id]) {
                    this._game.scene.remove(this._collisionVolumesDebugHelpers[id]);
                }
            }
            this._debug = false;
        }
    }

    /**
     * Update volume debug box position
     * @param {string} id 
     */
    _updateVolumeDebugBoxPosition(id) {
        if (this._collisionVolumesDebugHelpers[id] != null) {
            this._collisionVolumesDebugHelpers[id].object.position.set(
                this._collisionVolumes[id].position[0],
                this._collisionVolumes[id].position[1],
                this._collisionVolumes[id].position[2]
            );
            this._collisionVolumesDebugHelpers[id].update();
        }
    }

    //#endregion

    //#region API

    /**
     * Intersect objects via ray casting
     * Given a vector (ray) returns all objects that the ray intersects (useful for first person games)
     * @param {THREE.Vector3} origin the origin of the ray
     * @param {THREE.Vector3} direction the direction of the ray
     * @param {string} type only consider objects of a specific type (NULL -> consider all objects)
     * @param {number} maxDistance the maximum distance of intersection
     */
    intersectObjects(origin, direction, type, maxDistance) {
        // update the picking ray
        if (direction instanceof THREE.Camera) {
            this._raycaster.setFromCamera(origin, direction);
        } else {
            this._raycaster.set(origin, direction);
        }

        // calculate objects intersecting the picking ray
        var intersections = this._raycaster.intersectObjects(this._game.intersectableObjects);

        if (intersections.length > 0) {
            var intersectDistance = Infinity;
            if (!(direction instanceof THREE.Camera)) {
                intersectDistance = intersections[0].point.sub(origin).length();

                // use max distance
                if (maxDistance != null && intersectDistance > maxDistance) {
                    return null;
                }
            }

            if (type != null) {
                if (intersections[0].object.gameObject.type === type) {
                    return {object: intersections[0].object.gameObject, point: intersections[0].point, distance: intersectDistance};
                }
            } else {
                return {object: intersections[0].object.gameObject, point: intersections[0].point, distance: intersectDistance};
            }
        } else {
            return null;
        }
    } 

    /**
     * Get all objects in range of a source object
     * @param {GF.GameObject} objectSource source object
     * @param {number} radius proximity radius
     * @param {THREE.Vector3} direction direction [optional]
     * @param {number} angle angle or field of view [optional]
     */
    getObjectsInRange(objectSource, radius, direction, angle, objectType) {
        const objectsInRange = [];

        if (direction) {
            direction = new THREE.Vector3(direction.x, 0, direction.z);
            direction.negate();
        }

        for (var i = 0; i < this._game._objectsArray.length; i++) {
            if (objectType) {
                if (this._game._objectsArray[i] === objectType
                && this.checkProximity(objectSource, this._game._objectsArray[i], radius, direction, angle)) {
                    objectsInRange.push(this._game._objectsArray[i]);
                }
            } else {
                if (this.checkProximity(objectSource, this._game._objectsArray[i], radius, direction, angle)) {
                    objectsInRange.push(this._game._objectsArray[i]);
                }
            }
        }

        return objectsInRange;
    }

    /**
     * Check proximity
     * @param {GF.GameObject} source source object
     * @param {GF.GameObject} target target object
     * @param {number} radius proximity radius
     * @param {THREE.Vector3} direction direction [optional]
     * @param {number} angle angle or field of view [optional]
     */
    checkProximity(source, target, radius, direction, angle) {
        if (source != target) {
            const positionDifference = source.position.clone().sub(target.position);
            if (positionDifference.length() <= radius) {
                if (direction) {
                    const directionNormalized = direction.clone();
                    directionNormalized.normalize();
                    positionDifference.normalize();
    
                    return Math.acos(directionNormalized.dot(positionDifference)) * (180 / Math.PI) <= angle;
                }
    
                return true;
            }
        }
        return false
    }

    /**
     * Add a collision volume
     * @param {GF.GameObject} gameObject the volume associated GameObject (optional)
     * @param {GF.CollisionVolume} volume the volume definition
     * @param {THREE.Vector3} position the volume position
     * @param {boolean} autoUpdate if the volume position will be auto updated from the GameObject (if provided) position (default is true)
     * @param {string[]} affectedGroups the affected collision groups (default is ["solid"])
     * @returns new volume id
     */
    addVolume(gameObject, volume, position, autoUpdate = true, affectedGroups = ["solid"]) {
        if (position == null && gameObject != null && gameObject.object3D != null) {
            position = gameObject.object3D.position;
        }
        affectedGroups = affectedGroups == null ? ["solid"] : affectedGroups.map(g => g.trim().toLowerCase());

        // create volume
        var newVolume = {
            id: GF.Utils.uniqueId("Volume_"),
            gameObject: gameObject,
            autoUpdate: autoUpdate,
            solid: affectedGroups != null ? affectedGroups.includes("solid") : true,
            enabled: true,
            shape: volume,
            affectedGroups: this._convertAffectedCollisionGroupsToHex(affectedGroups),
            position: [
                position.x + volume.offset[0],
                position.y + volume.offset[1],
                position.z + volume.offset[2]
            ]
        };

        // add contacts
        for (const volumeId of this._collisionVolumesDictionaryKeys) {
            if ((this._collisionVolumes[volumeId].affectedGroups & newVolume.affectedGroups) !== 0) {
                var newContact = {
                    volume1: this._collisionVolumes[volumeId],
                    volume2: newVolume,
                    normal01: null,
                    normal02: null,
                    collisionSpeed01: null,
                    collisionSpeed02: null,
                    collisionDistance: null,
                    touching: false,
                    next: null
                }

                newContact.collisionDistance = [
                    newContact.volume1.shape.sizeHalf[0] + newContact.volume2.shape.sizeHalf[0],
                    newContact.volume1.shape.sizeHalf[1] + newContact.volume2.shape.sizeHalf[1],
                    newContact.volume1.shape.sizeHalf[2] + newContact.volume2.shape.sizeHalf[2]
                ]

                if (this._contacts.length > 0) {
                    this._contacts[this._contacts.length - 1].next = newContact;
                }
                this._contacts.push(newContact);
            }
        }

        // add volume
        this._collisionVolumes[newVolume.id] = newVolume;
        this._collisionVolumesDictionaryKeys = Object.keys(this._collisionVolumes);

        // add volume box helper (debug)
        const boxObject = new THREE.Mesh( new THREE.BoxGeometry(
            newVolume.shape.size[0],
            newVolume.shape.size[1],
            newVolume.shape.size[2])
        );
        this._collisionVolumesDebugHelpers[newVolume.id] = new THREE.BoxHelper( boxObject, newVolume.solid ? 0xff8800 : 0xffff00 );

        this._updateVolumeDebugBoxPosition(newVolume.id);
        
        if (this._debug) {
            this._game.scene.add(this._collisionVolumesDebugHelpers[newVolume.id]);
        }

        return newVolume;
    }

    /**
     * Set volume position
     * @param {string} id volume or volume id
     * @param {THREE.Vector3} position volume new position
     */
    setVolumePosition(id, position) {
        this._collisionVolumes[id].position = [
            position.x + this._collisionVolumes[id].shape.offset[0],
            position.y + this._collisionVolumes[id].shape.offset[1],
            position.z + this._collisionVolumes[id].shape.offset[2]
        ];

        if (this._debug) {
            this._updateVolumeDebugBoxPosition(id)
        }
    }

    /**
     * Set volume enabled
     * @param {string} id volume id
     * @param {boolean} enabled 
     */
    setVolumeEnabled(id, enabled) {
        this._collisionVolumes[id].enabled = enabled;
    }

    /**
     * Remove a collision volume
     * @param {GF.CollisionVolume} volume 
     */
    removeVolume(id) {
        // remove contacts
        this._contacts = this._contacts.filter(c => c.volume1 !== this._collisionVolumes[id] && c.volume2 !== this._collisionVolumes[id]);
        // reassign iterators
        for (var i = 0; i < this._contacts.length; i++) {
            this._contacts[i].next = i < this._contacts.length - 1 ? this._contacts[i + 1] : null;
        }

        // remove volume
        delete this._collisionVolumes[id];
        this._collisionVolumesDictionaryKeys = Object.keys(this._collisionVolumes);

        // remove box helper (debug)
        if (this._collisionVolumesDebugHelpers[id] != null) {
            if (this._debug) {
                this._game.scene.remove(this._collisionVolumesDebugHelpers[id]);
                
            }
            delete this._collisionVolumesDebugHelpers[id];
        }
    }

    //#region contact checks

    /**
     * Get contacts of GameObject or a CollisionVolume
     * @param {GF.GameObject | string} object a GameObject or a CollisionVolumeId
     */
    getContacts(object) {
        var c = this._contacts[0];
        var result = [];

        var property = typeof(object) === "string" ? "id" : "gameObject";

        while (c != null) {
            if ((c.volume1[property] === object || c.volume2[property] === object) && c.touching) {
                result.push({
                    contact: c,
                    other: c.volume1[property] === object ? c.volume2.gameObject : c.volume1.gameObject
                });
            }

            c = c.next;
        }

        return result;
    }

    /**
     * Get contacts with solid volumes of GameObject or a CollisionVolume
     * @param {GF.GameObject | string} object a GameObject or a CollisionVolumeId
     */
     getContactsWithSolid(object) {
        var c = this._contacts[0];
        var result = [];

        var property = typeof(object) === "string" ? "id" : "gameObject";

        while (c != null) {
            if (c.touching) {
                if ((c.volume1[property] === object && c.volume2.solid) || (c.volume2[property] === object && c.volume1.solid)) {
                    result.push({
                        contact: c,
                        other: c.volume1[property] === object ? c.volume2.gameObject : c.volume1.gameObject
                    });
                }
            }

            c = c.next;
        }

        return result;
    }

    /**
     * Get contacts of GameObject or a CollisionVolume with all objects of a type
     * @param {GF.GameObject | string} object a GameObject or a CollisionVolumeId
     * @param {string} type the other GameObject type
     */
    getContactsWithType(object, type) {
        var c = this._contacts[0];
        var result = [];

        var property = typeof(object) === "string" ? "id" : "gameObject";
        var types = type instanceof Array ? type : [type];

        while (c != null) {
            if (c.touching) {
                if ( (c.volume1[property] === object && c.volume2.gameObject != null && types.includes(c.volume2.gameObject.type)) ||
                    (c.volume2[property] === object && c.volume1.gameObject != null && types.includes(c.volume1.gameObject.type)) ) {
                    result.push({
                        contact: c,
                        other: c.volume1[property] === object ? c.volume2.gameObject : c.volume1.gameObject
                    });
                }
            }

            c = c.next;
        }

        return result;
    }

    /**
     * Check ray collision
     * @param {GF.GameObject} object the object of ray origin
     * @param {THREE.Vector3} direction the ray direction
     * @returns the intersection point
     */
    checkRayCollision(object, direction, height) {
        this._raycaster.set(
            new THREE.Vector3(object.object3D.position.x, object.object3D.position.y + height, object.object3D.position.z),
            direction
        );

        // calculate intersections
        var intersections = this._raycaster.intersectObjects(this._game._rayCollisionObjects);

        if (intersections.length > 0) {
            var i = 0;
            while(i < intersections.length && intersections[i].object != null && (intersections[i].object.gameObject == object || intersections[i].object.gameObject instanceof GF.GameObject)) {
                i++;
            }
            intersections[i].distance = Math.round(intersections[i].distance * 100) / 100;
            intersections[i].point.x = Math.round(intersections[i].point.x * 100) / 100;
            intersections[i].point.y = Math.round(intersections[i].point.y * 100) / 100;
            intersections[i].point.z = Math.round(intersections[i].point.z * 100) / 100;
            return intersections[i];
        } else {
            return null;
        }
    }

    //#endregion

    //#endregion
}

/**
 * Collision Volume
 */
GF.CollisionVolume = class CollisionVolume {
    /**
     * CollisionVolume constructor
     * @param {GF.COLLISION_SPHERE | GF.COLLISION_CYLINDER | GF.COLLISION_BOX} type the volume shape
     * @param {number[] | Vector3} size the size array [x, y, z]
     * @param {number[] | Vector3} offset the offset origin array [x, y, z]
     */
    constructor(type, size, offset) {
        this.type = type;

        if (size) {
            size = size.x != null || size.y != null || size.z != null ? [size.x, size.y, size.z] : size;
        }
        if (offset) {
            offset = offset.x != null || offset.y != null || offset.z != null ? [offset.x, offset.y, offset.z] : offset
        }

        if (offset != null) {
            this.offset = offset;
        } else {
            this.offset = [0, 0, 0]
        }

        if (this.type === GF.COLLISION_SPHERE) {
            var s = (size != null ? size[0] : 1) * 2;
            this.size = [s, s, s];
        } else if (this.type === GF.COLLISION_CYLINDER) {
            var s = size[0] * 2;
            this.size = [s, size[1], s];
        } else if (this.type === GF.COLLISION_BOX) {
            this.size = size;
        }

        this.sizeHalf = [this.size[0] * 0.5, this.size[1] * 0.5, this.size[2] * 0.5];
    }
}
/**
 * StaticObject
 */
 GF.StaticObject = class StaticObject extends GF.GameObject {
    /**
     * Constructor
     * @param {BuildObjectParams} params params to build this object (@see GF.Utils.build3DObject)
     */
    constructor(params) {
        super({
            model: params.model,
            material: params.material,
            shadows: params.shadows,
            position: params.position != null ? (params.position instanceof Array ? new THREE.Vector3(params.position[0], params.position[1], params.position[2]) : new THREE.Vector3(params.position.x, params.position.y, params.position.z)): new THREE.Vector3(0,0,0),
            rotation: params.rotation != null ? (params.rotation instanceof Array ? new THREE.Vector3(params.rotation[0], params.rotation[1], params.rotation[2]) : new THREE.Vector3(params.rotation.x, params.rotation.y, params.rotation.z)) : new THREE.Vector3(0,0,0),
            scale: params.scale != null ? (params.scale instanceof Array ? new THREE.Vector3(params.scale[0], params.scale[1], params.scale[2]) : new THREE.Vector3(params.scale.x, params.scale.y, params.scale.z)) : new THREE.Vector3(1,1,1)
        }, true, true);

        this._generateCollisionVolume = params.generateCollision != null ? params.generateCollision : true;
        this._affectedCollisionGroups = params.collisionWith;
    }

    //#region LifeCycle

    /**
     * On init
     */
    onInit() {
        super.onInit();

        if (this._collisionVolume == null && this._generateCollisionVolume) {
            this._collisionVolume = GF.Utils.buildCollisionVolumeFrom3DObject(this.object3D);
        }

        if (this._collisionVolume != null) {
            this._collisionVolumeReference = this.collision.addVolume(this, this._collisionVolume, this.object3D.position, true, this._affectedCollisionGroups).id;
        }
    }

    /**
     * Destroy
     */
    onDestroy() {
        if (this._collisionVolumeReference) {
            this.collision.removeVolume(this._collisionVolumeReference);
        }
    }

    //#endregion
}

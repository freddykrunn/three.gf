
/**
 * Scene
 */
GF.Scene = class Scene {
    /**
     * Create a template scene from an asset JSON file
     * @param {GF.Game} game the game instance pointer
     * @param {string} sceneAsset the asset of the scene file
     * @param {'three' | 'jgf'} sceneType the scene type (if is a file produced in Three.gf editor it should be 'jgf' instead if
     * it is produced by THREEjs json file it should be 'three')
     */
    constructor(game, sceneAsset, sceneType) {	     
        this._game = game;      
        this._sceneAsset = sceneAsset;
        this._sceneType = sceneType != null ? sceneType : "jgf";
    }

    /**
     * Instantiate object
     */
    _instantiateObject(id, type, args) {
        var newObject, constructorString, argumentNames;
        // arguments
        constructorString = `new ${type}(`;
        if (args instanceof Array) {
            for (var i = 0; i<args.length; i++) {
                constructorString += JSON.stringify(args[i]);
                if (i < args.length-1) {
                    constructorString += ",";
                }
            }
        } else {
            constructorString += JSON.stringify(args);
        }
        constructorString += `)`;

        try {
            newObject = eval(constructorString);
        } catch(ex) {
            console.error(ex);
            newObject = null;
        }

        if (newObject != null) {
            this._game.addObject(id, newObject);
        }

        return newObject;
    }

    /**
     * Init scene for a ThreeJs JSON file
     */
    _initForThreeJsScene() {
        if (this.sceneAssetData != null && this.sceneAssetData.object != null && this.sceneAssetData.object.children != null && this.sceneAssetData.object.type === "Scene") {
            var children = this.sceneAssetData.object.children;
            var newObject, light, matrix, newMesh, geometry, material, mat, cv, position, quaternion, scale;
            for (var i = 0; i < children.length; i++) {
                matrix = new THREE.Matrix4();
                matrix.fromArray(children[i].matrix);

                position = new THREE.Vector3();
                quaternion = new THREE.Quaternion();
                scale = new THREE.Vector3();
                matrix.decompose(position, quaternion, scale)

                // Collision volume
                if (children[i].name === "CollisionBox") {
                    cv = this._game.collisionManager.addVolume(null,
                        new GF.CollisionVolumeBox(scale.x, scale.y, scale.z, new THREE.Vector3(0,0,0)),
                        position
                    );

                    this.collisionVolumes.push(cv);
                }
                // Object
                else if (children[i].type === "Mesh") {
                    if (children[i].userData != null) {
                        // Mesh
                        if (children[i].name === "Mesh") {
                            // create geometry
                            geometry = this._game.loader.get(children[i].userData.model);

                            // create material
                            mat = this.sceneAssetData.materials != null ? this.sceneAssetData.materials.find(m => m.uuid === children[i].material) : null;
                            if (mat != null) {
                                material = GF.Utils.buildMaterial(
                                    this._game.loader,
                                    {
                                        texture: children[i].userData.map,
                                        bumpTexture: children[i].userData.bumpMap,
                                        specularTexture: children[i].userData.specularMap,
                                        alphaTexture: children[i].userData.alphaMap,
                                        emissiveTexture: children[i].userData.emissiveMap,
                                        color: mat.color,
                                        shininess: mat.shininess,
                                        emissiveColor: mat.emissive,
                                        specular: mat.specular,
                                        bumpScale: mat.bumpScale,
                                        opacity: mat.opacity
                                    }
                                );
                            }

                            newMesh = new THREE.Mesh(geometry, material);
                            newMesh.castShadow = children[i].castShadow;
                            newMesh.receiveShadow = children[i].receiveShadow;

                            newMesh.position.copy(position);
                            newMesh.rotation.setFromQuaternion(quaternion);
                            newMesh.scale.copy(scale);

                            this.sceneObjects.push(newMesh);
                            this._game.addToScene(newMesh);
                        }
                        // GameObject
                        else {
                            newObject = this._instantiateObject(children[i].uuid, children[i].name, children[i].userData);
                            newObject.subscribeOnInit(function() {
                                if (newObject.object3D != null) {
                                    newObject.object3D.position.copy(position);
                                    newObject.object3D.rotation.setFromQuaternion(quaternion);
                                    newObject.object3D.scale.copy(scale);
                                }
                            });
                            this.objects.push(newObject);
                        }
                    }
                }
                // PointLight
                else if (children[i].type === "PointLight") {
                    light = new THREE.PointLight(children[i].color, children[i].intensity, children[i].distance, children[i].decay);
                    light.castShadow = children[i].castShadow;
                    light.name = children[i].name;
                    if (children[i].shadow && children[i].shadow.camera) {
                        light.shadow.camera.type = children[i].shadow.camera.type;
                        light.shadow.camera.fov = children[i].shadow.camera.fov;
                        light.shadow.camera.zoom = children[i].shadow.camera.zoom;
                        light.shadow.camera.near = children[i].shadow.camera.near;
                        light.shadow.camera.far = children[i].shadow.camera.far;
                    }

                    light.position.copy(position);
                    light.rotation.setFromQuaternion(quaternion);
                    light.scale.copy(scale);

                    this.sceneObjects.push(light);
                    this._game.addToScene(light);
                }
                // HemisphereLight
                else if (children[i].type === "HemisphereLight") {
                    light = new THREE.HemisphereLight(children[i].color, children[i].groundColor, children[i].intensity);
                    this.sceneObjects.push(light);
                    this._game.addToScene(light);
                }
            } 
        }
    }

    /**
     * Init scene for a file of Three.gf editor
     */
    _initForJGFScene() {
        var newObject;
        if (this.sceneAssetData.objects instanceof Array) {
            for (const object of this.sceneAssetData.objects) {
                // game object
                if (object.gameObject) {

                    for (const index in object.params) {
                        if (object.params[index] === "{{position}}") {
                            object.params[index] = object.position;
                        } else if (object.params[index] === "{{rotation}}") {
                            object.params[index] = object.rotation;
                        } else if (object.params[index] === "{{scale}}") {
                            object.params[index] = object.scale;
                        }
                    }

                    newObject = this._instantiateObject(object.id, object.gameObject, object.params);
                    this.objects.push(newObject);
                // decoration mesh
                } else {
                    object.params = object.params == null ? {} : object.params;

                    newObject = GF.Utils.build3DObject(this._game.loader, {
                        model: object.model,
                        material: object.material ? object.material : Object.assign({
                            texture: object.texture
                        }, object.params.material != null ? object.params.material : {})
                    })
                    newObject.castShadow = object.params.castShadow != null ? object.params.castShadow : true;
                    newObject.receiveShadow = object.params.receiveShadow != null ? object.params.receiveShadow : true;

                    newObject.position.set(object.position.x, object.position.y, object.position.z);
                    newObject.rotation.set(object.rotation.x, object.rotation.y, object.rotation.z);
                    newObject.scale.set(object.scale.x, object.scale.y, object.scale.z);

                    // add collision volume
                    if (object.collision) {
                        const cv = this._game.collisionManager.addVolume(null, GF.Utils.buildCollisionVolumeFrom3DObject(newObject), newObject.position);
                        this.collisionVolumes.push(cv);
                    }

                    this.sceneObjects.push(newObject);
                    this._game.addToScene(newObject, object.rayCollision);
                }
            }
        }
    }

    /**
     * Init
     */
    init() {
        this.sceneObjects = [];
        this.objects = [];
        this.collisionVolumes = [];
        this.sceneAssetData = this._game.loader.get(this._sceneAsset);

        if (this.sceneAssetData) {
            if (this._sceneType === "jgf") {
                this._initForJGFScene();
            } else {
                this._initForThreeJsScene();
            }
        }
    }

    /**
     * Destroy
     */
    destroy() {
        for (var i = 0; i < this.sceneObjects.length; i++) {
            this._game.removeFromScene(this.sceneObjects[i]);
        }

        for (var i = 0; i < this.objects.length; i++) {
            this.objects[i].destroy();
        }

        for (var i = 0; i < this.collisionVolumes.length; i++) {
            this._game.collisionManager.removeVolume(this.collisionVolumes[i].id)
        }
    }
}
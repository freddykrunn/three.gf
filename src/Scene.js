
/**
 * Scene
 */
GF.Scene = class Scene {
    /**
     * Create a template scene from an asset
     * @param {GF.Game} game the game
     * @param {any} sceneAsset the asset
     */
    constructor(game, sceneAsset) {	     
        this._game = game;      
        this.sceneAsset = sceneAsset;
        this.lights = [];
    }

    /**
     * Instantiate object
     */
    _instantiateObject(id, type, args) {
        var newObject, constructorString, argumentNames;
        // arguments
        constructorString = `new ${type}(`;
        argumentNames = Object.keys(args);
        for (var i = 0; i<args.length; i++) {
            constructorString += JSON.stringify(args[argumentNames[i]]);
            if (i < args.length-1) {
                constructorString += ",";
            }
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
     * Init
     */
    init() {
        this.sceneObjects = [];
        this.objects = [];
        this.collisionVolumes = [];
        this.sceneAssetData = this._game.loader.get(this.sceneAsset);

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
                    cv = this._game.addStaticCollisionVolume(
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
                                material = GF.Utils.getDefaultMaterial(
                                    this._game.loader,
                                    children[i].userData.map,
                                    children[i].userData.bumpMap,
                                    children[i].userData.specularMap,
                                    children[i].userData.alphaMap,
                                    children[i].userData.emissiveMap,
                                    mat.color,
                                    mat.shininess,
                                    mat.emissive,
                                    mat.specular,
                                    mat.bumpScale,
                                    mat.flatShading,
                                    mat.depthFunc,
                                    mat.depthTest,
                                    mat.depthWrite,
                                    mat.transparent
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
            this._game.removeStaticCollisionVolume(this.collisionVolumes[i])
        }
    }
}
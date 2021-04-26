
/**
 * GameEditor
 */
 GF.GameEditor = class GameEditor {
    constructor(game) {
        this.game = game;
        this.gridResolution = 1;
        this.gridSize = 100;
        this.snapToGrid = false;
        this.selectedObject = null;
        this.objects = [];
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        this.DEFAULT_COLOR = 0xCCCCCC;
        this.HIGHLIGHTED_COLOR = 0xFFFFFF;
    }

    //#region Load/Save API

    /**
     * Load scene
     */
    loadScene(fromFile, file) {
        this.resetScene();

        var json;
        if (!fromFile) {
            json = localStorage["Jgf_editor_auto_save"];
            if (json) {
                json = JSON.parse(json);
            }
            this.parseSceneJSON(json);
        } else {
            var fr = new FileReader();

            fr.onload = () => {
                json = JSON.parse(fr.result);
                this.parseSceneJSON(json);
            }
              
            fr.readAsText(file);
        }
    }

    /**
     * Save scene
     */
    saveScene(toFile, file) {
        var json = this.prettifyJSON(this.generateSceneJSON());

        if (!toFile) {
            localStorage["Jgf_editor_auto_save"] = json;
        } else {
            GF.Utils.download(json, file, "json");
        }
    }

    /**
     * Reset scene
     */
    resetScene() {
        this.selectObject(null);
        for (const obj of this.objects) {
            this.game.removeFromScene(obj);
        }
        this.objects.length = 0;
    }

    //#endregion
    
    //#region Internal

    /**
     * Generate scene json
     * @returns 
     */
    generateSceneJSON() {
        var scene = {
            objects: [],
            lights: [
                // {
                //     color: 0xFFFF00,
                //     intensity: 0.5,
                //     position: {x: 0, y: 0, z: 0},
                //     distance: 20,
                //     shadows: true
                // }
            ],
            ambient: {
                sun: null,
                // {
                //     direction: {x: 0, y: 0, z: 0},
                //     color: 0xFFFFFF,
                //     intensity: 1,
                //     shadows: true
                // },
                sky: null
                // {
                //     top: 0xFFFFFF,
                //     bottom: 0xFFFFFF,
                //     intensity: 0.5
                // }
            }
        }

        for (const obj of this.objects) {
            if (obj._jgf_editor_object != null) {
                var newObject = Object.assign({}, obj._jgf_editor_object);

                if (newObject.gameObject != null) {
                    delete newObject.texture;
                    delete newObject.model;
                }

                if (newObject.params) {
                    newObject.params = JSON.parse(newObject.params);
                }

                newObject.position = {
                    x: obj.position.x,
                    y: obj.position.y,
                    z: obj.position.z
                };
                newObject.rotation = {
                    x: obj.rotation.x,
                    y: obj.rotation.y,
                    z: obj.rotation.z
                };
                newObject.scale = {
                    x: obj.scale.x,
                    y: obj.scale.y,
                    z: obj.scale.z
                }

                delete newObject._geometry;
                delete newObject._material;
                delete newObject._thumbnail;

                scene.objects.push(newObject);
            }
        }

        return scene;
    }

    /**
     * Parse scene json
     */
    parseSceneJSON(json) {
        if (json != null && json.objects) {
            for (const obj of json.objects) {
                this.addObject(obj.name, {
                    position: obj.position,
                    rotation: obj.rotation,
                    scale: obj.scale,
                    params: this.prettifyJSON(obj.params),
                    collision: obj.collision,
                    rayCollision: obj.rayCollision,
                    id: obj.id,
                }, false)
            }
        }
    }

    /**
     * Prettify JSON
     * @param {string} json 
     * @returns 
     */
    prettifyJSON(json) {
        return JSON.stringify(json, undefined, 2);
    }

    /**
     * Generates an object thumbnail image
     * @param object
     */
    generateObjectThumbnail(object) {
        object.geometry.computeBoundingSphere();

        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(64, 64);
        renderer.sortObjects = false;
        renderer.setClearColor(0x000000, 0);

        const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 10000);
        const dist = object.geometry.boundingSphere.radius * 1.25;
        camera.position.set(dist, dist, dist);
        camera.lookAt(new THREE.Vector3(0, object.geometry.boundingSphere.center.y, 0));

        const scene = new THREE.Scene();

        scene.add(object);

        renderer.render(scene, camera);

        renderer.dispose();

        return renderer.domElement.toDataURL();
    }

    /**
     * Get object geometry
     * @param {*} asset 
     * @returns 
     */
    getObjectGeometry(asset) {
        var geometry;
        if (asset.model) {
            geometry = this.game.loader.get(asset.model);
            if (geometry.type != "Geometry" && geometry.type != "BufferGeometry") {
                geometry.traverse((child) => {
                    if (child.geometry != null) {
                        geometry = child.geometry;
                        return -1;
                    }
                })
            }
        } else {
            geometry = new THREE.BoxGeometry(1, 1, 1 );
        }

        if (asset.rotation) {
            geometry.rotateX(GF.Utils.degToRad(asset.rotation.x));
            geometry.rotateY(GF.Utils.degToRad(asset.rotation.y));
            geometry.rotateZ(GF.Utils.degToRad(asset.rotation.z));
        }

        if (asset.scale) {
            geometry.scale(asset.scale.x, asset.scale.y, asset.scale.z)
        }

        return geometry;
    }

    /**
     * Get object material
     * @param {*} texture 
     * @returns 
     */
    getObjectMaterial(texture, color) {
        return new THREE.MeshBasicMaterial({map: texture != null ? this.game.loader.get(texture) : null, color: color != null ? Number(color) : this.DEFAULT_COLOR})
    }

    //#endregion

    //#region API

    /**
     * Set grid visible
     * @param {boolean} visible 
     */
    setGridVisible(visible) {
        this.gridHelper.visible = visible;
        this.axesHelper.visible = visible;
    }

    /**
     * Set grid
     * @param {number} size 
     * @param {number} resolution 
     */
    setGrid(size, resolution) {
        this.gridSize = size;
        this.gridResolution = resolution;

        if (this.gridHelper) {
            this.game.removeFromScene(this.gridHelper);
            this.gridHelper.material.dispose();
            this.gridHelper.geometry.dispose();
        }

        if (this.axesHelper) {
            this.game.removeFromScene(this.axesHelper);
            this.axesHelper.material.dispose();
            this.axesHelper.geometry.dispose();
        }

        if (size != null) {
            this.gridHelper = new THREE.GridHelper( size, size / resolution );
            this.game.addToScene(this.gridHelper);

            this.axesHelper = new THREE.AxesHelper( resolution * 10 );
            this.axesHelper.position.y = 0.01;
            this.game.addToScene(this.axesHelper);

            this.setTranslationSnap(this.translationSnap);
            this.setRotationSnap(this.rotationSnap);
            this.setScaleSnap(this.scaleSnap);
        }
    }

    /**
     * Add object
     * @param name name of object to add
     */
    addObject(name, params, select = true) {
        if (this.metadata && this.metadata.assets) {
            var object = this.metadata.assets.find(o => o.name === name);
            if (object) {
                var mesh = new THREE.Mesh(object._geometry, object._material.clone());

                mesh._jgf_editor_object = Object.assign({id: GF.Utils.uniqueId(object.name)}, object);
                mesh._jgf_editor_object.params = this.prettifyJSON(mesh._jgf_editor_object.params);
                mesh._jgf_editor_object.rayCollision = mesh._jgf_editor_object.rayCollision != null ? mesh._jgf_editor_object.rayCollision : true;
                mesh._jgf_editor_object.collision = mesh._jgf_editor_object.collision != null ? mesh._jgf_editor_object.collision : false;

                if (params) {
                    if (params.position) {
                        mesh.position.set(params.position.x, params.position.y, params.position.z);
                    }
                    if (params.rotation) {
                        mesh.rotation.set(params.rotation.x, params.rotation.y, params.rotation.z);
                    }
                    if (params.scale) {
                        mesh.scale.set(params.scale.x, params.scale.y, params.scale.z);
                    }

                    if (params.id) {
                        mesh._jgf_editor_object.id = params.id;
                    }

                    if (params.collision) {
                        mesh._jgf_editor_object.collision = params.collision;
                    }

                    if (params.rayCollision) {
                        mesh._jgf_editor_object.rayCollision = params.rayCollision;
                    }

                    if (params.params) {
                        mesh._jgf_editor_object.params = params.params;
                    }
                }

                this.game.addToScene(mesh);
                this.objects.push(mesh);

                if (!select) {
                    setTimeout(() => {
                        this.selectObject(mesh);
                    })
                }
            }
        }
    }

    /**
     * Remove selected object
     */
    removeSelectedObject() {
        if (this.selectedObject) {
            this.game.removeFromScene(this.selectedObject);
            
            var index = this.objects.indexOf(this.selectedObject);
            if (index >= 0) {
                this.objects.splice(index, 1);
            }

            this.selectObject(null);
        }
    }

    /**
     * Duplicate selected object
     */
    duplicateSelectedObject() {
        if (this.selectedObject) {
            const params = Object.assign({}, this.selectedObject._jgf_editor_object);
            delete params.id;
            params.position = this.selectedObject.position.clone();
            params.rotation = this.selectedObject.rotation.clone();
            params.scale = this.selectedObject.scale.clone();
            this.addObject(this.selectedObject._jgf_editor_object.name, params, true)
        }
    }

    /**
     * Select object
     * @param {Object3D} object 
     */
    selectObject(object) {
        this.selectedObject = object;

        if (this.selectedObject != null) {
            this.transformControls.attach(this.selectedObject);

            this.game.removeFromScene(this.selectedBoxHelper);
            this.selectedBoxHelper = new THREE.BoxHelper( this.selectedObject, this.selectedObject._jgf_editor_object.gameObject != null ? 0x00FFFF : 0xFFFFAA );
            this.game.addToScene(this.selectedBoxHelper);
        } else {
            this.game.removeFromScene(this.selectedBoxHelper);
            this.transformControls.detach();
        }

        this.game.gamePage.setSelectedObject(this.selectedObject);
    }

    /**
     * Set selected object id
     */
    setSelectedObjectId(newId) {
        if (this.selectedObject && !this.objects.find(o => o._jgf_editor_object.id === newId)) {
            this.selectedObject._jgf_editor_object.id = newId;
        }
    }

    /**
     * Set selected object params
     */
    setSelectedObjectParams(params) {
        if (this.selectedObject) {
            this.selectedObject._jgf_editor_object.params = params;
        }
    }

    /**
     * Set selected object collision
     */
    setSelectedObjectCollision(collision) {
        if (this.selectedObject) {
            this.selectedObject._jgf_editor_object.collision = collision;
        }
    }

    /**
     * Set selected object ray collision
     */
     setSelectedObjectRayCollision(collision) {
        if (this.selectedObject) {
            this.selectedObject._jgf_editor_object.rayCollision = collision;
        }
    }

    /**
     * Set selected object transform
     */
    setSelectedObjectTransform(type, axis, value) {
        if (this.selectedObject) {
            this.selectedObject[type][axis] = type === "rotation" ? GF.Utils.degToRad(Number(value)) : Number(value);
        }
    }

    /**
     * Set selected object property value
     * @param {string[]} propertyArray 
     * @param {any} value 
     */
    setSelectedObjectProperty(propertyArray, value) {
        if (this.selectedObject && propertyArray != null) {
            if (propertyArray instanceof Array) {
                var object = this.selectedObject;
                var property;
                while(propertyArray.length > 1) {
                    property = propertyArray.shift();
                    object = object[property];
                }
                object[propertyArray.shift()] = value;
            } else {
                this.selectedObject[propertyArray] = value;
            }
        }
    }

    /**
     * Get selected object params
     */
    getSelectedObjectParams() {
        if (this.selectedObject && this.selectedObject._jgf_editor_object) {
            return this.selectedObject._jgf_editor_object.params;
        }
    }

    /**
     * Get selected object property value
     * @param {string[]} propertyArray
     */
    getSelectedObjectPosition(propertyArray) {
        if (this.selectedObject && propertyArray != null) {
            if (propertyArray instanceof Array) {
                var object = this.selectedObject;
                var property;
                while(propertyArray.length > 1) {
                    property = propertyArray.shift();
                    object = object[property];
                }
                return object[propertyArray.shift()];
            } else {
                return this.selectedObject[propertyArray];
            }
        }
    }

    /**
     * Set transform mode
     * @param {*} mode 
     */
    setTransformMode(mode) {
        this.transformControls.setMode(mode);
    }

    /**
     * Set translation snap
     * @param {boolean} snap 
     */
    setTranslationSnap(snap) {
        this.translationSnap = snap;
        this.transformControls.setTranslationSnap(snap ? this.gridResolution : null);
    }

    /**
     * Set rotation snap
     * @param {boolean} snap 
     */
    setRotationSnap(snap) {
        this.rotationSnap = snap;
        this.transformControls.setRotationSnap(snap ? GF.Utils.degToRad(10) : null);
    }

    /**
     * Set scale snap
     * @param {boolean} snap 
     */
    setScaleSnap(snap) {
        this.scaleSnap = snap;
        this.transformControls.setScaleSnap(snap ? this.gridResolution * 0.5 : null);
    }

    //#endregion

    //#region life cycle

    /**
     * Set editor parameters
     * @param {any} params 
     */
    setParams(params) {
        this.params = params;

        if (this.params.metadata) {
            var loader = new GF.JSONFileLoader();
            loader.load(this.params.metadata, (data) => {
                this.metadata = data;

                for (const asset of this.metadata.assets) {
                    asset._geometry = this.getObjectGeometry(asset);
                    asset._material = this.getObjectMaterial(asset.texture, asset.color);

                    asset._thumbnail = this.generateObjectThumbnail(new THREE.Mesh(asset._geometry, asset._material));
                }

                this.game.gamePage.setObjectsList(this.metadata.assets);
            })
        }
    }

    /**
     * On mouse move
     */
    onMouseMove(event) {
        const rect = this.game._renderer.domElement.getBoundingClientRect();
        this.mouse.x = ( (event.clientX - rect.x) / rect.width ) * 2 - 1;
        this.mouse.y = - ( (event.clientY - rect.y) / rect.height ) * 2 + 1;

        if (this.highlightedObject) {
            this.highlightedObject.material.color.setHex(this.highlightedObject._jgf_editor_object.color != null ? this.highlightedObject._jgf_editor_object.color : this.DEFAULT_COLOR);
            this.highlightedObject = null;
        }

        // update the picking ray
        this.raycaster.setFromCamera(this.mouse, this.game.camera);

        // calculate objects intersecting the picking ray
        var intersections = this.raycaster.intersectObjects(this.objects);

        if (intersections.length > 0) {
            this.highlightedObject = intersections[0].object;
            if (this.highlightedObject) {
                this.highlightedObject.material.color.setHex(this.HIGHLIGHTED_COLOR);
            }
        }
    }

    /**
     * On mouse click
     */
    onMouseClick() {
        if (this.highlightedObject) {
            this.selectObject(this.highlightedObject);
        }
    }

    /**
     * Init
     */
    init() {
        // camera controls
        this.game.setCamera({x: 10, y: 10, z: 10}, {x: 0, y: 0, z: 0})
        this.cameraControls = new THREE.OrbitControls(this.game.camera, this.game.gamePage.controlsTarget[0]);

        // transform controls
        this.transformControls = new THREE.TransformControls(this.game.camera, this.game.gamePage.controlsTarget[0]);
        this.game.addToScene(this.transformControls);
        this.transformControls.setMode("translate");
        this.game.gamePage.setTransformMode('translate');
        this.setTranslationSnap(true);
        this.setRotationSnap(true);
        this.setScaleSnap(true);

        // set grid
        this.setGrid(this.gridSize, this.gridResolution);

        this.onTransformBegin = () => {
            this.cameraControls.enablePan = false;
            this.cameraControls.enableZoom = false;
            this.cameraControls.enableRotate = false;
        }
        this.transformControls.addEventListener("mouseDown",  this.onTransformBegin);

        this.onTransformEnd = () => {
            this.cameraControls.enablePan = true;
            this.cameraControls.enableZoom = true;
            this.cameraControls.enableRotate = true;
            this.game.gamePage.selectedObjectTransformChange();
        }
        this.transformControls.addEventListener("mouseUp", this.onTransformEnd);

        this.mouseMoveCallback = this.onMouseMove.bind(this);
        document.addEventListener('mousemove', this.mouseMoveCallback, false);
        this.mouseClickCallback = this.onMouseClick.bind(this);
        document.addEventListener('dblclick', this.mouseClickCallback, false);

        // load last auto-saved scene
        setTimeout(() => {
            this.loadScene();
        })

        // auto-save scene every 5 seconds
        setInterval(() => {
            this.saveScene();
        }, 4000)
    }

    /**
     * Update
     */
    update() {
        this.cameraControls.update();
        if (this.selectedBoxHelper) {
            this.selectedBoxHelper.update();
        }

        if (this.game._debugCanvasContext) {
            var width = this.game._debugCanvas.offsetWidth;
            var height = this.game._debugCanvas.offsetHeight;
            this.game._debugCanvasContext.clearRect(0, 0, width, height);

            if (this.highlightedObject) {
                var labelWidth = width * 0.1;
                var labelHeight = height * 0.05;
                var itemPadding = labelHeight * 0.3;
                this.game._debugCanvasContext.font = (labelHeight * 0.25) + "px Verdana";
                this.game._debugCanvasContext.textBaseline = "top";

                var point = this.game._projectPointToScreen(this.highlightedObject.position.clone().add(new THREE.Vector3(0, 1, 0)), width, height);
                var labelX = point.x - (labelWidth * 0.5);
                var labelY = point.y;
                
                this.game._debugCanvasContext.fillStyle = "rgba(0,0,0,0.5)";
                this.game._debugCanvasContext.fillRect(labelX, labelY, labelWidth, labelHeight);

                labelX += labelWidth * 0.05;
                if (this.highlightedObject._jgf_editor_object.gameObject) {
                    labelY += labelHeight * 0.1;
                } else {
                    labelY += labelHeight * 0.25;
                }
                this.game._debugCanvasContext.fillStyle = "White";
                this.game._debugCanvasContext.fillText(this.highlightedObject._jgf_editor_object.name, labelX, labelY, labelWidth);

                if (this.highlightedObject._jgf_editor_object.gameObject) {
                    labelY += itemPadding;
                    this.game._debugCanvasContext.fillStyle = "LightCyan";
                    this.game._debugCanvasContext.fillText("GameObject: " + this.highlightedObject._jgf_editor_object.gameObject, labelX, labelY, labelWidth);
                }

                labelY += itemPadding;
                this.game._debugCanvasContext.fillStyle = "Cornsilk";
                this.game._debugCanvasContext.fillText(
                    "X: " + Math.round(this.highlightedObject.position.x * 100) / 100
                    + " Y: " + Math.round(this.highlightedObject.position.y * 100) / 100
                    + " Z: " + Math.round(this.highlightedObject.position.z * 100) / 100
                , labelX, labelY, labelWidth);
            }
        }
    }

    /**
     * Destroy
     */
    destroy() {
        this.cameraControls.dispose();
        this.transformControls.dispose();
        this.game.removeFromScene(this.selectedBoxHelper);
        this.setGrid(null);
    }

    //#endregion
}

/**
 * Editor Page
 */
 class EditorPage extends GF.Page {
    constructor(controller) {
        super({
            name: "jgf-editor-page",
            background: "transparent",
            style: `
                ::-webkit-scrollbar {
                    display: none;
                    width: 0.2vw;
                }
                
                ::-webkit-scrollbar-track {
                    display: none;
                    background: rgba(0,0,0,0.5); 
                }
                
                ::-webkit-scrollbar-thumb {
                    display: none;
                    background: rgba(255, 255, 255, 0.2); 
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    display: none;
                    background: rgba(255, 255, 255, 0.3); 
                }

                .controls-target-element {
                    width: 100%;
                    height: 100%;
                    z-index: 0;
                }
                
                .objects-list-container {
                    position: absolute;
                    top: 5%;
                    left: 0.5%;
                    height: 90%;
                    background: rgba(0,0,0,0.75);
                    border: solid 0.5vh rgba(255,255,255,0.15);
                    border-radius: 0.5vh;
                    overflow-x: hidden;
                    overflow-y: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                .objects-list-container:hover {
                    overflow-y: scroll;
                }
                
                .object-entry {
                    width: 10vh;
                    min-height: 10vh;
                    margin: 1vh;
                    background: rgb(50, 50, 50);
                    border-radius: 0.5vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .object-image {
                    flex: 1;
                    background-size: auto 100%;
                    background-repeat: no-repeat;
                    background-position: center;
                }
                
                .object-name {
                    height: 2vh;
                    line-height: 2vh;
                    text-align: center;
                    color: white;
                    font-size: 1vh;
                    background: rgba(255,255,210,0.2);
                    font-family: monospace;
                }

                .object-name.is-game-object {
                    background: rgba(150,255,255,0.2);
                }
                
                .object-entry:hover {
                    cursor: pointer;
                    filter: brightness(120%);
                }

                .transform-modes {
                    position: absolute;
                    bottom: 5%;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                }

                .transform-mode {
                    margin: 0.5vh;
                    width: 5vh;
                    height: 5vh;
                    background-size: 80% 80%;
                    background-position: center;
                    background-repeat: no-repeat;
                    border-radius: 0.75vh;
                    background-color: rgba(220, 255, 255, 0.5);
                    border: solid 0.4vh rgba(255, 255, 255, 0.5);
                    cursor: pointer;
                    transition: 0.1s linear;
                }

                .transform-mode:not([active='true']):hover {
                    background-color: rgba(190, 255, 255, 0.5);
                    transform: scale(1.05);
                }

                .transform-mode[active='true'] {
                    filter: brightness(120%);
                    background-color: rgba(50, 255, 255, 0.5);
                    transform: scale(1.2);
                }

                .panel-settings {
                    position: absolute;
                    top: 5%;
                    right: 0.5%;
                    width: 20%;
                    background: rgba(0,0,0,0.75);
                    border: solid 0.5vh rgba(255,255,255,0.15);
                    border-radius: 0.5vh;
                    overflow-x: hidden;
                    overflow-y: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .panel-selected {
                    position: absolute;
                    bottom: 5%;
                    right: 0.5%;
                    width: 25%;
                    background: rgba(0,0,0,0.75);
                    border: solid 0.5vh rgba(255,255,255,0.15);
                    border-radius: 0.5vh;
                    overflow-x: hidden;
                    overflow-y: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .panel-title {
                    height: 3vh;
                    background: rgb(50, 50, 50);
                    line-height: 3vh;
                    padding-left: 1em;
                    font-size: 2vh;
                    font-weight: bold;
                    color: white;
                    font-family: monospace;
                }

                .panel-selected[type='decoration'] > .panel-title {
                    background: rgb(50, 50, 35);
                }

                .panel-selected[type='gameobject'] > .panel-title {
                    background: rgb(35, 50, 50);
                }

                .panel-field {
                    line-height: 4vh;
                    margin-left: 1em;
                    font-size: 1.5vh;
                    color: white;
                    display: flex;
                    justify-content: center;
                }

                .panel-field-button {
                    padding-right: 5%;
                    padding-left: 5%;
                    margin-top: 3%;
                    margin-bottom: 3%;
                    color: white;
                    border-radius: 0.5vh;
                    text-align: center;
                    font-size: 2vh;
                    font-family: monospace;
                    margin: 0.5vw;
                }

                .panel-field-button.delete {
                    background: rgb(100, 70, 70);
                }
                .panel-field-button.duplicate {
                    background: rgb(70, 100, 100);
                }

                .panel-field-button:hover {
                    cursor: pointer;
                    filter: brightness(120%);
                }

                .panel-field-label {
                    flex: 1;
                    text-align: right;
                    font-family: monospace;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .panel-field-value {
                    flex: 2;
                    margin-left: 0.5vw;
                    font-family: monospace;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .panel-field-value > input {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    font-family: monospace;
                }

                .panel-field-value > input[small] {
                    width: 20%;
                }

                .panel-field-value > textarea {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    font-family: monospace;
                    resize: none;
                }

                .x-label {
                    color: rgb(255, 200, 200);
                }

                .y-label {
                    color: rgb(200, 255, 200);
                }

                .z-label {
                    color: rgb(200, 200, 255);
                }

                .top-bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 4vh;
                    display: flex;
                    background: rgb(20, 50, 70);
                }

                .top-bar-icon {
                    width: 4vh;
                    height: 4vh;
                    background-size: 70% 70%;
                    background-position: center;
                    background-repeat: no-repeat;
                    filter: brightness(80%);
                }

                .top-bar-icon:hover {
                    cursor: pointer;
                    filter: brightness(120%);
                }

                .top-bar-logo {
                    width: 14vh;
                    height: 4vh;
                    background-size: 80% 45%;
                    background-position: center;
                    background-repeat: no-repeat;
                }
            `,
            html: `
            <div class="top-bar">
                <div class="top-bar-logo" style="background-image: url('data:image/png;base64,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')"></div>
                <div id="resetButton" class="top-bar-icon" style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsEAAA7BAbiRa+0AAAESSURBVFhHzZdrDoQgDITV/3r/y+kh3AO47domKqW0gLBfsoEVmBkeahxyOY5jhR+z0uU2gOF8+t6YqdnFSKULdKPqjRGgqpmJym6Iia8zlGblWYGUVrACT/Hnfw8WLdMWSANTWMeYz4AnhKdvEEDaJ8YirPWRtIvMPMQmFg2A1AoRM0fUAEhpCM0cSQZAckOkzJFfB9DH5/iO9YYskO8zgTm+yVqbIzt6j7nLW4vuLyMMsJ3VLmzdD+F/3IYapYc0FUJtLDVntBDRhlrmTCyEeBtq5upslLaYZhAg15zxhjA/iCzmjKevKYBHkLGOCQI8B1qFJCxaWeKxcyIZpDCfgbfIDbBQeUW69h6wCxU+z4fhC8WMuvUE/jeIAAAAAElFTkSuQmCC')"></div>
                <div id="loadButton" class="top-bar-icon" style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAHDSURBVFhH7Ze7SgNBFECzohhNIUYkKCIoKFpowHfjN+gfWPkB/oCdlYVtfkPBDxCFBAUVFB8oKSxi46PRQnys585MYh67i+BetPDAyb0zI9mbmck4Sfzz23i+73cRFzCNvnTGhIe3uOl53pPpCYICtlGTnHtUIDID8qkvcVXa0hkD79iKG/iAWWbhhdiIqdH3d1wzNnjPNrzGIqaxxQ3V0FQXfwQPSWEOL2geYz/2YR5P3FiKvEJ5CfaYonnbVQvDvYQOSU1HODLFspll2qNYwS2Uvy9FFsDQMmEdZT2/8w2RaW62aShvVa6V98CujFRDXxLPzKge91FrP+DU5C6qgHFM2lSNfFQBMy5qUogqYNJFLT7wMLAANkc3YcS21CjhVdgMDGPGpmqc89V/DCtgwkVNDuQlrIBZFzXZl5eGAlh/OfWytqWG3A9OJQmaAfkHMmhTNYp4I0lQAWPYblM1jtiAr5IEFTDtoiYFFwMLmHJRC3MA2bSuADZgJ2HUttQwB5BNvwqQqoQh7LGpGuYAcnmlgAyffpG4hEHLEifmAKrAg7Wv5dU845x7tKH+h0l5KeJGrvtypcsz/XJB/eevkEh8Avb1yRKc0VZ8AAAAAElFTkSuQmCC')"></div>
                <div id="saveButton" class="top-bar-icon" style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAJOSURBVFhH1Zc9axRBGMd3T4nF+RJyRJRYRCSkUAKpbKwC+Qqm8LCyS3MEtIoWaiF2AckHkARCsLGx9zOYFEmOnKBBCMEighdIzPn7z2yO7N3uzuwl6+EffszMs88z++zMs29hEKnVag3SjMFFDaEEe2EYbtLGhG+Z5h7I9ys+O9hu0r8Nx6B5v2P/RusWwQ+gDp36ELnEhH3aHjZajGw1O2xrH56agAyVcBqgXYA7xuInXfmJTvdP6wq8Zf7ndpgsLbOWTktflF5mJaEEtF/tWuhBPrGpSSiBLKkYk9SAVfgIn2VAab4nSk4C4yj8giR9itycwnfehjgVSyLEMEr7BS4bS1wHsAK7kLZaunIV8gzckMFDL7hFX5meEoC0FShSNZ3fVQNFao4khvqZwDBU+pmAUd8TcN0FG/Ae/phRfl2AxzBuRnHpDptw3QVPrG/v0hx2qi41Ycy1Bc2oPYsy53BtQZUHxrI6+OltOQuXNJQtQXovaGnfEafHteIe0Syp3yGvLVCwEf3X1uSl+SjMJGBNXTJbkGcF7tI8g6wV0Jb+hjfEqYDPbwV6leawU3XJqwjbwlmrdR1uwUgKOiYf7++LPA+iKtRh3YF8HoKX8iRQAX3nXYVrKeiYfIbAS3mKUO98fYr73IZrxB3KQNz/XYSTOA1AuUe0avftVMlybcER7IBeRnm/nLVN+mcYAb2UOmW2wJVAkTIJaAuUaVpRFSn9Qx4rgR+wJcs/1jbo3KZS035Oi1IDpnTudmFh6Pw9L0I6nwq6znPiZxAEwV8egIvUvZ4lsQAAAABJRU5ErkJggg==')"></div>
            </div>
            <div id="controlsTarget" class="controls-target-element"></div>
            <div id="objectsList" class="objects-list-container">
            </div>
            <div class="transform-modes">
                <div id="transform_mode_move" active='false' class="transform-mode" style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAIHSURBVFhHxZfLSsNAFIYTES94A3Hh09SFe29LFXHpA7gX8THcuGhdCroX9FncKSh4R8T6/eOZOsk01pom/vA1nTOT/5zMTNI0KaN2u70qrFmvSLwMz8ayheuRJX8AL32vpwglsoR5VV+EEliiIj1CNUVgvAZPytJDGrNmpw1GGDbgCu7g2sjvAR/XGI1t2OnlhdkszMOcMQG74KXvivl+jZ2106sRCXbAa8fCfWvIjpEwXYDSVyEPeVkzUtcCOEGb6AiGXaCc5HFknpGiAhio26gF0/ChWEnJQ14t884oU4ANaMIYDCK5l7zk2cwX0SkgSD7pAtVI3pmZSPVRkPwR9uEe8kv1Bouw7lpJcgznMOJa3/LTvweh9xNspGl6mpJ8hYYMxtVTo15gvetdUKf8Eixx0M7/6xIcwgWMutaXr9ASzMAB5L03tQRfTaQiIHy+38CcdUeiL3wSblk4En16NMvLK/Oz3bkyqjnjsAGqrl+5mfyFoivPTG1QxCv0sz96FSAveWanHUVJgiK6rX2RfipAHvJyt52LBOqagIEnHLbh3QV666cC5LFtnpEKr5ATLuHWmr1UWIA85GXNSL+aYnZt9EJCOLytphQL+gf7QoLZ/76SSRjqX9D/vJR6YZx/WOWVechUIhIUFVF9ci8S5YuoL7kXCVWE1lvUm9yLxCtQ4u95knwCRyqh8fs/c6gAAAAASUVORK5CYII=')"></div>
                <div id="transform_mode_rotate" active='false' class="transform-mode" style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAALCSURBVFhH7ZfPbwxhGMd3W62goUlR4dAIQsqhKYcmmkj8vGgl+Ask4iQhESe3BhcJQVwcXRxwwEUTEfEjEhEXRaTVhNSPUtFWW6nK+nzfeWa7szu7+25l6uKTfPaZed/nmXl33ndnZlP/mrTFishkMnWEhViLkziSTqd/EGMhv57QiEPkfXWNhtcAOMAcwibswM24Eheh2qdwGPvxMd7Cp5xI7Q7q7xG24G3aO12jDxSmsQMf4W/0QXnK70TV78aQz3bo8pDciFdd2cy5jh+CzSztdgpH7BSQtI5wDde7higT+Ab7cAw1FatxDdZgOc4xDUdtuxBO3oSvNdQ8BrEL12K1pTvYr8EWPI8jGMeUxUErK4TOWux2aVFuYpOllYS8ZnyoohJEpiELHYeD/ggXUKvdC+VinwpLcNbSp6GxAftd9zRXsMpSvCD/jKuMZ8xi4TTQeDDoy/IKG6zbC/LrcVjFRRi3KNw05H67fRZDTrFah2zbF92sdIcsxjyLokUf7mfIaJYSXuAS7UMvtjKA0WDXH451kaC74HfXUMh8fXDs425PUNSma5LDZetKnHAKVlgMeW4xccIB5M9b5ImVJOEAsk8uY67FxAkHkL/aV1lMnHAA7/BXsOnQM3/2YNUvwF63/gN0w9hg3YnirgC/ST1W72vb0A3jSLA5S/CNt7nvPo0en3usO3k4WRXe1Zlz+IQbLaUiqKvDyl56KWjHn5jLAG61FC/I34EvcZc1+UPRCcxHi/IkLra0WNRveRMovuF2646l4BJRoIV5CQ+5higf8QZ2o94Jx1ELVveNnbgXl2MuX7CNhf422PWAQVTjaSz1Kj6JesFQLIauxDEM7zeVQaHe6XtwJjzBv7+hcRCt5gP4AMO5LcYo3sH9qL9tZfH+mXBAXUbNdSs24zLUQ0v/EwawB5/he+Y7Q/yPB6nUH3Ui0kNxjbwRAAAAAElFTkSuQmCC')"></div>
                <div id="transform_mode_scale" active='false' class="transform-mode" style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGhSURBVFhH7Za7SsRAFIYTWS8rXlDsfAUbtVEULMTCzhdZSx9AH8HWV7ASFkWwsLHzKVZBsHERdFF3/E5yNuxtNCc7IEg++PcwlyR/TmbObFTy18Qaf8U5t0a4RS9JR3EqqBHH8XrazAkGNlEonvS2pgxsEO7QM9pDU8hCC0kWz9AjGViWztyIgcS7cw3tMsO1q+kt3IN2RWMaLeTO2hAmNWYUMRCU0kBpoDRgMdDWGJQeA1SoaTQ3ROMMz6SzoljaaFbb4eCmV8iCnGy5YX6nnHtL8ZfGPHxqHAnfGjjitJKaP6+aQLuoB6ZYTbxrzPAZeJMfHtBUfdB8lb4uKpJKg+QUvU4v9cCkOhJq2pVB31Y6lNDWWJTsZXqOVgbqhH10yFufJp0KY7ILVtASukCyXnaQfAbLES1zW9z/Pm12IQbEHgxkoANji+kUJ59lZCyFqEP2VwwTpm04jCIGgvLjLvDQ1BgE3yI8R5eoirqR82ABnSBZfFUWU5CClICBG1ldBkZeA/0ZOCZso4GK1YdcJ29+QAYs5dsPD7fs5f9CFH0DRfbNs0MRRLIAAAAASUVORK5CYII=')"></div>
            </div>
            <div class="panel-settings" id="panelSettings">
                <div class="panel-title">Grid</div>
                <div class="panel-field">
                    <div class="panel-field-label">Visible:</div>
                    <div class="panel-field-value">
                        <input type="checkbox" id="gridVisibleInput" checked>
                    </div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-label">Size:</div>
                    <div class="panel-field-value">
                        <input type="number" id="gridSizeInput" min="1" max="1000" value="100">
                    </div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-label">Resolution:</div>
                    <div class="panel-field-value">
                        <input type="number" id="gridResolutionInput" min="0.01" max="50" value="1">
                    </div>
                </div>

                <div class="panel-title">Transform Snap</div>
                <div class="panel-field">
                    <div class="panel-field-label">Translation:</div>
                    <div class="panel-field-value">
                        <input type="checkbox" id="translationSnapInput" checked>
                    </div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-label">Rotation:</div>
                    <div class="panel-field-value">
                        <input type="checkbox" id="rotationSnapInput" checked>
                    </div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-label">Scale:</div>
                    <div class="panel-field-value">
                        <input type="checkbox" id="scaleSnapInput" checked>
                    </div>
                </div>
            </div>

            <div class="panel-selected" id="panelSelectedObject">
                <div class="panel-title" id="selectedObjectNameDisplay"></div>
                <div class="panel-field">
                    <div class="panel-field-label">Id:</div>
                    <div class="panel-field-value">
                        <input type="text" id="selectedObjectIdInput">
                    </div>
                </div>
                <div class="panel-field" name="gameObjectFields">
                    <div class="panel-field-label">GameObject:</div>
                    <div class="panel-field-value" id="selectedObjectGameObjectDisplay"></div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-label">Params:</div>
                    <div class="panel-field-value">
                        <textarea id="selectedObjectGameObjectParamsInput" rows="6" style="width: 100%"></textarea>
                    </div>
                </div>
                <div class="panel-field" name="decorationFields">
                    <div class="panel-field-label">Collision:</div>
                    <div class="panel-field-value">
                        <input type="checkbox" id="selectedObjectCollisionInput">
                    </div>
                </div>
                <div class="panel-field" name="decorationFields">
                    <div class="panel-field-label">Terrain Collision:</div>
                    <div class="panel-field-value">
                        <input type="checkbox" id="selectedObjectRayCollisionInput">
                    </div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-label">Position:</div>
                    <div class="panel-field-value">
                        <label class="x-label">X:</label><input type="number" step="0.01" small id="selectedObjectPositionXInput">
                        <label class="y-label">Y:</label><input type="number" step="0.01" small id="selectedObjectPositionYInput">
                        <label class="z-label">Z:</label><input type="number" step="0.01" small id="selectedObjectPositionZInput">
                    </div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-label">Rotation:</div>
                    <div class="panel-field-value">
                        <label class="x-label">X:</label><input type="number" step="1" small id="selectedObjectRotationXInput">
                        <label class="y-label">Y:</label><input type="number" step="1" small id="selectedObjectRotationYInput">
                        <label class="z-label">Z:</label><input type="number" step="1" small id="selectedObjectRotationZInput">
                    </div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-label">Scale:</div>
                    <div class="panel-field-value">
                        <label class="x-label">X:</label><input type="number" step="0.01" small id="selectedObjectScaleXInput">
                        <label class="y-label">Y:</label><input type="number" step="0.01" small id="selectedObjectScaleYInput">
                        <label class="z-label">Z:</label><input type="number" step="0.01" small id="selectedObjectScaleZInput">
                    </div>
                </div>
                <div class="panel-field">
                    <div class="panel-field-button duplicate" id="buttonDuplicateObject">Duplicate</div>
                    <div class="panel-field-button delete" id="buttonRemoveObject">Remove</div>
                </div>
            </div>

            <input type="file" id="filePicker" multiple accept=".json" style="display:none">
            `
        }, controller);
    }

    //#region API

    /**
     * Selected object transform change
     */
    selectedObjectTransformChange() {
        if (this.selectedObject) {
            // position
            this.selectedObjectPositionXInput[0].value = this.selectedObject.position.x;
            this.selectedObjectPositionYInput[0].value = this.selectedObject.position.y;
            this.selectedObjectPositionZInput[0].value = this.selectedObject.position.z;

            // rotation
            this.selectedObjectRotationXInput[0].value = Math.round(GF.Utils.radToDeg(this.selectedObject.rotation.x));
            this.selectedObjectRotationYInput[0].value = Math.round(GF.Utils.radToDeg(this.selectedObject.rotation.y));
            this.selectedObjectRotationZInput[0].value = Math.round(GF.Utils.radToDeg(this.selectedObject.rotation.z));

            // scale
            this.selectedObjectScaleXInput[0].value = this.selectedObject.scale.x;
            this.selectedObjectScaleYInput[0].value = this.selectedObject.scale.y;
            this.selectedObjectScaleZInput[0].value = this.selectedObject.scale.z;
        }
    }

    /**
     * Set selected object
     */
    setSelectedObject(object) {
        this.selectedObject = object;
        if (this.selectedObject) {
            var jgfObject = this.selectedObject._jgf_editor_object;
            this.panelSelectedObject.show();
            this.selectedObjectNameDisplay.text(jgfObject.name);
            if (jgfObject.gameObject) {
                this.panelSelectedObject.attr("type", "gameobject")
                this.content.find("[name='gameObjectFields']").show();
                this.content.find("[name='decorationFields']").hide();
                this.selectedObjectGameObjectDisplay.text(jgfObject.gameObject);
                this.selectedObjectCollisionInput[0].checked = false;
                this.selectedObjectRayCollisionInput[0].checked = false;
            } else {
                this.panelSelectedObject.attr("type", "decoration")
                this.content.find("[name='gameObjectFields']").hide();
                this.content.find("[name='decorationFields']").show();
                this.selectedObjectGameObjectDisplay.text("");
                this.selectedObjectGameObjectParamsInput[0].value = "";
                this.selectedObjectCollisionInput[0].checked = jgfObject.collision;
                this.selectedObjectRayCollisionInput[0].checked = jgfObject.rayCollision;
            }
            this.selectedObjectGameObjectParamsInput[0].value = jgfObject.params != null ? jgfObject.params : "";
            this.selectedObjectIdInput[0].value = jgfObject.id;

            this.selectedObjectTransformChange();
        } else {
            this.panelSelectedObject.hide();
        }
    }

    /**
     * Set objects list
     */
    setObjectsList(objects) {
        var content = "";

        if (objects != null) {
            for (var i = 0; i < objects.length; i++) {
                content += `
                    <div class="object-entry" name="${objects[i].name}">
                        <div class="object-image" style="background-image: url('${objects[i]._thumbnail}')"></div>
                        <div class="object-name ${objects[i].gameObject != null ? 'is-game-object' : ''}">${objects[i].name}</div>
                    </div>
                `
            }
        }

        this.objectsList.html(content);

        setTimeout(() => {
            var self = this;
            this.content.find(".object-entry").dblclick(function() {
                var name = this.getAttribute("name");
                if (name) {
                    self.controller.game._editor.addObject(name);
                }
            });
        })
    }

    /**
     * Set transform mode
     * @param {*} mode 
     */
    setTransformMode(mode) {
        this.controller.game._editor.setTransformMode(mode);
        if (mode === "translate") {
            this.transform_mode_move.attr("active", "true");
            this.transform_mode_rotate.attr("active", "false");
            this.transform_mode_scale.attr("active", "false");
        } else if (mode === "rotate") {
            this.transform_mode_move.attr("active", "false");
            this.transform_mode_rotate.attr("active", "true");
            this.transform_mode_scale.attr("active", "false");
        } else if (mode === "scale") {
            this.transform_mode_move.attr("active", "false");
            this.transform_mode_rotate.attr("active", "false");
            this.transform_mode_scale.attr("active", "true");
        }
    }

    //#endregion

    //#region life-cycle
  
    /**
     * On page open
     */
    onOpen(params) {
        var self = this;

        // start game
        this.controller.game.startEditor(this, params);

        this.setTranslationMode = () => {
            this.setTransformMode('translate');
        };
        this.setRotationMode = () => {
            this.setTransformMode('rotate')
        };
        this.setScaleMode = () => {
            this.setTransformMode('scale')
        }

        this.resetButton.on("click", () => {
            if (window.confirm("Are you sure? All progress will be lost")) {
                this.controller.game._editor.resetScene();
            }
        });
        this.loadButton.on("click", () => {
            if (window.confirm("Are you sure? All unsaved progress will be lost")) {
                this.filePicker.click();
            }
        });
        this.saveButton.on("click", () => {
            self.controller.game._editor.saveScene(true, "scene.json");
        });

        this.filePicker.on("change", function() {
            self.controller.game._editor.loadScene(true, this.files[0]);
        });

        this.transform_mode_move.on("click", this.setTranslationMode);
        this.transform_mode_rotate.on("click", this.setRotationMode);
        this.transform_mode_scale.on("click", this.setScaleMode);

        this.gridVisibleInput.change(() => {
            this.controller.game._editor.setGridVisible(this.gridVisibleInput[0].checked)
        });
        this.gridSizeInput.change(() => {
            this.controller.game._editor.setGrid(Number(this.gridSizeInput[0].value), Number(this.gridResolutionInput[0].value))
        });
        this.gridResolutionInput.change(() => {
            this.controller.game._editor.setGrid(Number(this.gridSizeInput[0].value), Number(this.gridResolutionInput[0].value))
        });

        this.translationSnapInput.change(() => {
            this.controller.game._editor.setTranslationSnap(this.translationSnapInput[0].checked)
        });
        this.rotationSnapInput.change(() => {
            this.controller.game._editor.setRotationSnap(this.rotationSnapInput[0].checked)
        });
        this.scaleSnapInput.change(() => {
            this.controller.game._editor.setScaleSnap(this.scaleSnapInput[0].checked)
        });

        this.selectedObjectIdInput.change(() => {
            this.controller.game._editor.setSelectedObjectId(this.selectedObjectIdInput[0].value);
        })

        this.selectedObjectGameObjectParamsInput.change(() => {
            this.controller.game._editor.setSelectedObjectParams(this.selectedObjectGameObjectParamsInput[0].value);
        });

        this.selectedObjectCollisionInput.change(() => {
            this.controller.game._editor.setSelectedObjectCollision(this.selectedObjectCollisionInput[0].checked);
        });
        this.selectedObjectRayCollisionInput.change(() => {
            this.controller.game._editor.setSelectedObjectRayCollision(this.selectedObjectRayCollisionInput[0].checked);
        });

        this.selectedObjectPositionXInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("position", "x", this.selectedObjectPositionXInput[0].value);
        });
        this.selectedObjectPositionYInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("position", "y", this.selectedObjectPositionYInput[0].value);
        });
        this.selectedObjectPositionZInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("position", "z", this.selectedObjectPositionZInput[0].value);
        });

        this.selectedObjectRotationXInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("rotation", "x", this.selectedObjectRotationXInput[0].value);
        });
        this.selectedObjectRotationYInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("rotation", "y", this.selectedObjectRotationYInput[0].value);
        });
        this.selectedObjectRotationZInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("rotation", "z", this.selectedObjectRotationZInput[0].value);
        });

        this.selectedObjectScaleXInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("scale", "x", this.selectedObjectScaleXInput[0].value);
        });
        this.selectedObjectScaleYInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("scale", "y", this.selectedObjectScaleYInput[0].value);
        });
        this.selectedObjectScaleZInput.change(() => {
            this.controller.game._editor.setSelectedObjectTransform("scale", "z", this.selectedObjectScaleZInput[0].value);
        });

        this.buttonRemoveObject.on("click", () => {
            if (window.confirm("Remove object?")) {
                self.controller.game._editor.removeSelectedObject();
            }
        });

        this.buttonDuplicateObject.on("click", () => {
            self.controller.game._editor.duplicateSelectedObject();
        });

        this.setSelectedObject(null);
    }
  
    /**
     * On page close
     */
    onClose() {
        // game stop
        this.controller.game.stop();
    }

    //#endregion
}

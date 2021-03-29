
GF.AssetType = {
    Model3D_OBJ: 0,
    Texture: 1,
    CubeTexture: 2,
    JSON: 3,
    TEXT: 4,
    THREE_JSON: 5,
    Sound: 6,
    Material: 7,
    Image: 8,
    Model3D_FBX: 9,
    0: "Model 3D Collada OBJ",
    1: "Texture",
    2: "CubeTexture",
    3: "JSON",
    4: "TEXT",
    5: "THREE_JSON",
    6: "Sound",
    7: "Material",
    8: "Image",
    9: "Model3D_FBX"
}

/**
 * AssetsLoader
 */
GF.AssetsLoader = class AssetsLoader {
    constructor() {
        this.loading = false;
        this.assets = {};
        this.loaders = {
            [GF.AssetType.Model3D_OBJ]: new GF.OBJFileLoader(GF.AssetType.Model3D_OBJ),
            [GF.AssetType.Texture]: new GF.TextureFileLoader(GF.AssetType.Texture),
            [GF.AssetType.Image]: new GF.ImageFileLoader(GF.AssetType.Image),
            [GF.AssetType.CubeTexture]: new GF.CubeTextureFileLoader(GF.AssetType.CubeTexture),
            [GF.AssetType.Sound]: new GF.SoundFileLoader(GF.AssetType.Sound),
            [GF.AssetType.JSON]: new GF.JSONFileLoader(GF.AssetType.JSON),
            [GF.AssetType.TEXT]: new GF.TextFileLoader(GF.AssetType.TEXT),
            [GF.AssetType.THREE_JSON]: new GF.THREEJSONFileLoader(GF.AssetType.THREE_JSON),
            [GF.AssetType.Model3D_FBX]: new GF.FBXFileLoader(GF.AssetType.Model3D_FBX),
        }
    }

    /**
     * Set graphics preset
     * @param {string} gameGraphicsPreset 
     */
    setGraphicsPreset(gameGraphicsPreset) {
        this.gameGraphicsPreset = gameGraphicsPreset;
        for (const loader in this.loaders) {
            this.loaders[loader].gameGraphicsPreset = this.gameGraphicsPreset;
        }
    }

    /**
     * Add new custom asset loader 
     * @param {string} typeName the loader type name
     * @param {string} loaderClass name of a class that extends GF.FileLoader
     */
    addCustomAssetLoader(typeName, loaderClass) {
        this.loaders[typeName] = eval(`new ${loaderClass}(${typeName})`);
    }

    /**
     * Update progress
     * @param {number} objectsLoaded 
     * @param {number} objectsCount 
     * @param {function} onUpdate 
     * @param {function} onFinish 
     */
    updateProgress(objectsLoaded, objectsCount, onUpdate, onFinish) {
        if (onUpdate) {
            onUpdate(Math.round((objectsLoaded / objectsCount) * 100));
        }
        if (objectsLoaded === objectsCount) {
            this.loading = false;
            if (onFinish) {
                onFinish();
            }
        }
    }

    /**
     * Load asset
     * @param {number} index 
     * @param {string} assetNames 
     */
    loadAsset(index, assets, assetNames, onUpdate, onFinish, onError) {
        if (this.loading === true) {
            if (index === assetNames.length) {
                return;
            } else {
                const asset = assets[assetNames[index]];
                var assetPath = typeof(asset.params) === "string" ? asset.params : (asset.params != null ? asset.params.path : 'NULL');
                // choose loader
                const loader = this.loaders[asset.type];
                if (loader != null) {
                    // load and store asset content
                    loader.load(asset.params, 
                    (content) => {
                        asset.content = content;
                        asset.loaded = true;
                        this.updateProgress(index+1, assetNames.length, onUpdate, onFinish);
                        this.loadAsset(index+1, assets, assetNames, onUpdate, onFinish, onError);
                    }, (error) => {
                        if (error && onError) {
                            onError("ERROR :: Loading asset '"+assetPath+"' of type '"+GF.AssetType[asset.type]+"' :: " + error);
                        }
                        this.updateProgress(index+1, assetNames.length, onUpdate, onFinish);
                        this.loadAsset(index+1, assets, assetNames, onUpdate, onFinish, onError);
                    });
                } else {
                    // file not supported
                    if (onError != null) {
                        onError("ERROR :: Loading asset '"+assetPath+"' of type '"+GF.AssetType[asset.type]+"' :: Asset Type not supported!");
                    }
                    this.updateProgress(index+1, assetNames.length, onUpdate, onFinish);
                    this.loadAsset(index+1, assets, assetNames, onUpdate, onFinish, onError);
                }
            }
        }
    }

    //#region public methods

    /**
     * Is loading
     */
    isLoading() {
        return this.loading;
    }

    /**
     * Add assset to load
     * @param {string} name 
     * @param {AssetType} type 
     * @param {string | object} params the path for the file, or a group of params in certain cases
     */
    add(name, type, params) {
        this.assets[name] = {
            type: type,
            params: params,
            loaded: false,
            content: null
        }
    }

    /**
     * Add preloaded assset
     * @param {string} name 
     * @param {AssetType} type 
     * @param {object} content
     */
    addPreloaded(name, type, content) {
        this.assets[name] = {
            type: type,
            params: null,
            loaded: true,
            content: content
        }
    }

    /**
     * Remove asset
     * @param {string} name 
     */
    remove(name) {
        this.assets[name] = undefined;
    }

    /**
     * Get asset
     * @param {string} name 
     */
    get(name) {
        if (this.assets[name] != null && this.assets[name].loaded == true) {
            return this.assets[name].content;
        } else {
            return null;
        }
    }

    /**
     * Unload asset
     * @param {string} name 
     */
    unload(name) {
        this.assets[name].loaded = false;
        this.assets[name].content = undefined;
    }

    /**
     * Unload all assets
     */
    unloadAll() {
        for (const name in this.assets) {
            this.assets[name].loaded = false;
            this.assets[name].content = undefined;
        }
    }

    /**
     * Clear all assets
     */
    clear() {
        this.assets = {}
    }

    /**
     * Load a single asset
     */
    load(name, onFinish, onError) {
        this.loading = true;
        const asset = this.assets[name];
        if (asset.loaded === true) {
            this.updateProgress(1, 1, () => {}, onFinish);
        } else {
            this.loadAsset(0, this.assets, [name], null, onFinish, onError);
        }
    }

    /**
     * Load all assets unloaded
     * @param {function} onUpdate 
     * @param {function} onFinish 
     * @param {function} onError
     */
    loadAll(onUpdate, onFinish, onError) {
        this.loading = true;
        const assetNames = Object.keys(this.assets);

        // get assets to load
        const assetNamesToLoad = []
        for (const name in this.assets) {
            if (this.assets[name].loaded === false && this.assets[name].content == null) {
                assetNamesToLoad.push(name);
            }
        }

        // load assets
        if(assetNamesToLoad.length == 0) {
            setTimeout(() => {
                this.updateProgress(1,1,onUpdate,onFinish);
            });
        } else {
            this.loadAsset(0, this.assets, assetNamesToLoad, onUpdate, onFinish, onError);
        }
    }

    //#endregion
}

/**
 * File Loader
 */
GF.FileLoader = class FileLoader {
    constructor(type) {
        this.type = type;
    }

    load(params, onFinish, onError) {
    }
}

/**
 * Image Loader
 */
GF.ImageFileLoader = class ImageFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
    }

    /**
     * Load
     * @param {string} path
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(path, onFinish, onError) {
        var image = new Image();

        image.onload = () => {
            onFinish(image);
        };

        image.src = path;
    }
}

/**
 * OBJ File Loader
 */
GF.OBJFileLoader = class OBJFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
        this.loader = new THREE.OBJLoader();
    }

    /**
     * Load
     * @param {string} path
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(path, onFinish, onError) {
        // load an OBJ mesh
        this.loader.load(
            // resource URL
            path,
            // called when resource is loaded
            ( object ) => {
                try {
                    const obj = object.children[0].geometry;
                    onFinish(obj);
                } catch(ex) {
                    onError(ex);
                }
            },
            undefined,
            // called when loading has errors
            onError
        );
    }
}

/**
 * Texture file Loader
 */
GF.TextureFileLoader = class TextureFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
        this.loader = new THREE.TextureLoader();
    }

    /**
     * Load
     * 
     * params = {
     *   path: string,
     *   (...) (ThreeJs texture params)
     * }
     * 
     * @param {Object | string} params 
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(params, onFinish, onError) {
        // load a texture
        this.loader.load(
            // resource URL
            typeof(params) === "string" ? params : params.path,
            // called when resource is loaded
            ( object ) => {
                if (object != null) {
                    for (var param in params) {
                        object[param] = params[param];
                    }

                    if (this.gameGraphicsPreset === GF.GRAPHICS_PRESET.PS1_Style) {
                        object["minFilter"] = THREE.NearestFilter;
                        object["magFilter"] = THREE.NearestFilter;
                        object["generateMipmaps"] = false;
                    }
                }
                onFinish(object);
            },
            undefined,
            // called when loading has errors
            onError
        );
    }
}

/**
 * Cube Texture file Loader
 */
GF.CubeTextureFileLoader = class CubeTextureFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
        this.loader = new THREE.CubeTextureLoader();
    }

    /**
     * Load
     * 
     * params = {
     *   path: string,
     *   faceTexturePaths: {
     *      px: string,
     *      py: string,
     *      pz: string,
     *      nx: string,
     *      ny: string,
     *      nz: string,
     *   },
     *   mapping: enum
     * }
     * 
     * @param {object} params
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(params, onFinish, onError) {
        try {
            if (params && typeof(params.path) === "string" && params.faceTexturePaths != null) {
                // set path
                this.loader.setPath(params.path);

                // load
                var textureCube = this.loader.load( [
                    params.faceTexturePaths.px, params.faceTexturePaths.nx,
                    params.faceTexturePaths.py, params.faceTexturePaths.ny,
                    params.faceTexturePaths.pz, params.faceTexturePaths.nz
                ] );

                if (params.mapping) {
                    textureCube.mapping = params.mapping;
                }

                if (this.gameGraphicsPreset === GF.GRAPHICS_PRESET.PS1_Style) {
                    textureCube["minFilter"] = THREE.NearestFilter;
                    textureCube["magFilter"] = THREE.NearestFilter;
                }

                onFinish(textureCube);
            } else {
                onError("No paths provided!");
            }

            onFinish(textureCube)
        } catch(err) {
            onError(err);
        }
    }
}

/**
 * JSON file Loader
 */
GF.JSONFileLoader = class JSONFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
    }

    /**
     * Load
     * @param {string} path 
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(path, onFinish, onError) {
        var http = new XMLHttpRequest();
        http.overrideMimeType("application/json");
        http.open('GET', path, true);
        http.onreadystatechange = function () {
            if (http.readyState == 4 && http.status == "200") {
                try {
                    var json = JSON.parse(http.responseText);
                    onFinish(json);
                } catch(ex) {
                    onError("File is corrupted")
                }
            }
        };
        http.onerror = function(xres, err) {
            onError(err);
        };
        http.send(null); 
    }
}

/**
 * Text file Loader
 */
GF.TextFileLoader = class TextFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
    }

    /**
     * Load
     * @param {string} path 
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(path, onFinish, onError) {
        var http = new XMLHttpRequest();
        http.overrideMimeType("application/text");
        http.open('GET', path, true);
        http.onreadystatechange = function () {
            if (http.readyState == 4 && http.status == "200") {
                try {
                    onFinish(http.responseText);
                } catch(ex) {
                    onError("File is corrupted")
                }
            }
        };
        http.onerror = function(xres, err) {
            onError(err);
        };
        http.send(null); 
    }
}

/**
 * THREEjs JSON file Loader
 */
GF.THREEJSONFileLoader = class THREEJSONFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
        if (window.THREEOldJSONLoader != null) {
            this.loader = new THREEOldJSONLoader();
        } else {
            this.loader = null;
            // console.warn("[WARNING] Cannot instantiate loader 'THREEJSONFileLoader': The current three.js version doesn't support 'JSONLoader'");
        }
    }

    /**
     * Load
     * @param {string} path 
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(path, onFinish, onError) {
        if (this.loader == null) {
            // console.warn("[WARNING] Cannot load: The current three.js version doesn't support 'JSONLoader'");
        } else {
            // load a texture
            this.loader.load(
                // resource URL
                path,
                // called when resource is loaded
                (geometry, materials) => {
                    onFinish({geometry: geometry, materials: materials});
                },
                undefined,
                // called when loading has errors
                onError
            );
        }
    }
}

/**
 * FBX file Loader
 */
GF.FBXFileLoader = class FBXFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
        if (THREE.FBXLoader != null) {
            this.loader = new THREE.FBXLoader();
        } else {
            this.loader = null;
            // console.warn("[WARNING] Cannot instantiate loader 'THREE.FBXLoader': The current three.js version doesn't support 'THREE.FBXLoader'");
        }
    }

    /**
     * Load
     * @param {string} path 
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(path, onFinish, onError) {
        if (this.loader == null) {
            // console.warn("[WARNING] Cannot load: The current three.js version doesn't support 'THREE.FBXLoader'");
        } else {
            // load a texture
            this.loader.load(
                // resource URL
                path,
                // called when resource is loaded
                (object) => {
                    onFinish(object);
                },
                undefined,
                // called when loading has errors
                onError
            );
        }
    }
}

/**
 * Sound file Loader
 */
GF.SoundFileLoader = class SoundFileLoader extends GF.FileLoader {
    constructor(type) {
        super(type);
    }

    /**
     * Load
     * @param {string} params 
     * @param {function} onFinish 
     * @param {function} onError 
     */
    load(params, onFinish, onError) {
        var sound = new Howl({
            src: params.path,
            loop: params.loop,
            volume: params.volume,
            rate: params.rate,
            preload: true,
            onload: function() {
                onFinish(sound);
            },
            onloaderror: function(err) {
                onError(err);
            },
        });
    }
}
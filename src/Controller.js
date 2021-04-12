/**
 * Default Aspect-ratio values
 */
GF.ASPECT_RATIO = {
    _16_9: 16/9,
    _4_3: 4/3,
    _1_1: 1/1
}

/**
 * Graphics presets
 */
GF.GRAPHICS_PRESET = {
    PS1_Style: "PS1" // PlayStation 1 style
}

/**
 * Graphics presets params 
 */
GF.GRAPHICS_PRESET_PARAMS = {
    [GF.GRAPHICS_PRESET.PS1_Style]: {
        resolution: {
            w: 320,
            h: 240
        }
    }
}

// default pages ids
GF.GAME_PAGE = "game";
GF.LOADING_MODAL = "loading";

/**
 * Create a canvas element inside a container
 * @param {element} container 
 * @param {number} zIndex 
 */
function createCanvas(container, zIndex) {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.zIndex = zIndex+"";
    canvas.style.transition = "linear 0.2s filter";

    container.appendChild(canvas);
    return canvas;
}

/**
 * Create container
 * @param {element} container 
 * @param {number} zIndex 
 */
function createContentContainer(container, zIndex) {
    const contentContainer = document.createElement("div");
    contentContainer.style.position = "absolute";
    contentContainer.style.width = "100%";
    contentContainer.style.height = "100%";
    contentContainer.style.zIndex = zIndex+"";
    contentContainer.style.overflow = "hidden";
    container.appendChild(contentContainer);
    return contentContainer;
}

/**
 * Load scripts recursive
 * @param {string[]} list 
 * @param {function} onFinish 
 */
function loadScripsRecursive(list, prefix, onFinish) {
    if (list.length > 0) {
        var file = list.splice(0, 1);

        var s = document.createElement('script');
        s.src = prefix + file + ".js";
        s.type = "text/javascript";
        s.onload = function () {
            loadScripsRecursive(list, prefix, onFinish);
        }
        document.body.appendChild(s);
    } else {
        onFinish();
    }
}

/**
 * Controller (The main class of the framework)
 * It is required to have declared two default pages: LoadingPage and GamePage
 */
GF.GameController = class GameController {
    /**
     * Game Controller (The main class of the framework)
     * @param {string} container the selector of the div where the game will be displayed
     * @param {any | GF.Game} gameParams a class extending GF.Game or params to create a new Game class
     * @param {{name: string, className: string}[]} pages the game pages declaration
     * @param {{objects: string[], pages: string[]}} sourceFilesToLoad the game source .js files to load
     * @param {callback} afterLoad when the game source files are all loaded
     */
    constructor(container, gameParams, pages, sourceFilesToLoad, afterLoad) {
        if (sourceFilesToLoad == null) {
            this._init(container, gameParams, pages, afterLoad);
        } else if (sourceFilesToLoad instanceof Array) {
            loadScripsRecursive(sourceFilesToLoad, "", () => {
                setTimeout(() => {
                    this._init(container, gameParams, pages, afterLoad);
                })
            });            
        } else {
            var sourcePath = sourceFilesToLoad["src"] != null ? sourceFilesToLoad["src"] : "src";

            loadScripsRecursive(sourceFilesToLoad["objects"], sourcePath + "/objects/", () => {
                loadScripsRecursive(sourceFilesToLoad["pages"], sourcePath + "/pages/", () => {
                    setTimeout(() => {
                        this._init(container, gameParams, pages, afterLoad);
                    })
                }); 
            });
        }
    }

    //#region Internal

    /**
     * Init controller 
     */
    _init(container, gameParams, pages, afterLoad) {
        // assets loader
        this.assets = new GF.AssetsLoader();

        this._mainContainer = document.querySelector(container);
        this._mainContainer.style.padding = "0";
        this._mainContainer.style.margin = "0";
        this._mainContainer.style.background = "black";
        this._mainContainer.style.overflow = "hidden";
        this._mainContainer.name = "jgf-main-container";

        // create canvas and containers
        this._container = document.createElement("div");
        this._container.name = "jgf-game-container";
        this._container.style.overflow = "hidden";
        this._container.style.position = "relative";
        this._container.style.marginLeft = "auto";
        this._container.style.marginRight = "auto";
        this._container.style.top = "50%";
        this._container.style.transform = "translateY(-50%)";
        this._gameCanvas = createCanvas(this._container, 2);
        this._gameDebugCanvas = createCanvas(this._container, 3);
        this._pageContainer = createContentContainer(this._container, 4);
        this._modalContainer = createContentContainer(this._container, 6);
        this._modalContainer.style.display = "none";
        this._mainContainer.appendChild(this._container);

        // game
        if (typeof(gameParams) === "string") {
            this.game = window.eval.call(window, `(function (canvas, loader) { return new ${gameParams}(canvas, debugCanvas, loader) })`)(this._gameCanvas, this._gameDebugCanvas, this.assets);
        } else {
            this.game = new GF.Game(this._gameCanvas, this._gameDebugCanvas, this.assets, gameParams.params, gameParams.onStart, gameParams.onUpdate, gameParams.onStop, gameParams.onTickUpdate, gameParams.onPointerLockChange);
        }
        this.input = this.game.inputManager;
        this.animation = this.game.animationManager;

        // aspect ratio
        this._aspectRatio = this.game._aspectRatio != null ? this.game._aspectRatio : GF.ASPECT_RATIO._16_9;

        // preset
        if (this.game._graphicsPreset === GF.GRAPHICS_PRESET.PS1_Style) {
            this._gameCanvas.style.imageRendering = "pixelated";
        }

        // page manager
        this.pages = new GF.PageManager(this._pageContainer, this._modalContainer);

        // add pages
        if (pages) {
            for (const page of pages) {
                this.pages.addPage(page.name, window.eval.call(window, `(function (controller) { return new ${page.className}(controller) })`)(this));
            }
        }

        // add default required pages
        if (this.pages.getPage(GF.GAME_PAGE) == null) {
            this.pages.addPage(GF.GAME_PAGE, new DefaultGamePage(this));
        }
        if (this.pages.getPage(GF.LOADING_MODAL) == null) {
            this.pages.addPage(GF.LOADING_MODAL, new DefaultLoadingPage(this));
        }

        // bind to window resize
        this.onWindowResizeCallback = this.onWindowResize.bind(this);
        window.addEventListener('resize', this.onWindowResizeCallback);

        this.onWindowResize();

        // https://greensock.com/forums/topic/10051-animations-pause-when-browser-tab-is-not-visible/
        // window focus event listeners to pause animations
        var self = this;
        // check if browser window has focus		
        var notIE = (document.documentMode === undefined),
        isChromium = window.chrome;

        if (notIE && !isChromium) {
            // checks for Firefox and other  NON IE Chrome versions
            window.addEventListener("focusin", function () { 
                self.resume();
            }, false);

            window.addEventListener("focusout", function () { 
                self.pause();
            }, false);
        } else {
            // checks for IE and Chromium versions
            if (window.addEventListener) {

                // bind focus event
                window.addEventListener("focus", function (event) {
                    self.resume();
                }, false);

                // bind blur event
                window.addEventListener("blur", function (event) {
                    self.pause();
                }, false);

            } else {

                // bind focus event
                window.attachEvent("focus", function (event) {
                    self.resume();
                });

                // bind focus event
                window.attachEvent("blur", function (event) {
                    self.pause();
                });
            }
        }

        if (afterLoad) {
            afterLoad();
        }
    }

    //#endregion

    //#region API

    /**
     * Go to page
     */
    gotToPage(page) {
        this.pages.goTo(page);
    }

    /**
     * Boot Game
     * 
     * @param type the boot type
     * 
     * type = 'default':
     *   1 - load currently added assets
     *   2 - Go to game page
     */
    boot(type, afterBoot) {
        if (type === "default") {
            this.loadAllAssets(() => {
                if (afterBoot) {
                    afterBoot();
                }
                this.pages.goTo(GF.GAME_PAGE);
            })
        } else if (type === "default-no-assets") {
            if (afterBoot) {
                afterBoot();
            }
            this.pages.goTo(GF.GAME_PAGE);
        }
    }

    /**
     * Resume
     */
    resume() {
        this.game.resume();
        this.pages.resumeAnimation();
    }

    /**
     * Pause
     */
    pause() {
        this.game.pause();
        this.pages.pauseAnimation();
    }
    
    /**
     * On window resize (must be called whenever the container div changes its size)
     */
    onWindowResize() {
        var width, height;

        width = this._mainContainer.offsetHeight * this._aspectRatio;
        height = this._mainContainer.offsetHeight;

        if (width > this._mainContainer.offsetWidth) {
            width = this._mainContainer.offsetWidth;
            height = (1 / this._aspectRatio) * this._mainContainer.offsetWidth;
        }

        // update game canvas
        this._container.style.width = width + "px";
        this._container.style.height = height + "px";
        this.game.onContainerResize(width, height);

        // notify pages of  window resize
        this.pages.onContainerResize(width, height);
    }

    /**
     * Add asset to load
     * @param {string} name the asset name
     * @param {AssetType} type the asset type
     * @param {string | object} params the path for the file, or a group of params in certain cases
     */
    addAsset(name, type, params) {
        this.assets.add(name, type, params)
    }

    /**
     * Add preloaded asset
     * @param {string} name the asset name
     * @param {AssetType} type the asset type
     * @param {object} content the asset
     */
    addPreloadedAsset(name, type, content) {
        this.assets.addPreloaded(name, type, content)
    }

    /**
     * Load all assets (only the ones that are not loaded yet)
     * @param {function} callback callback when loading is finished
     * @param {boolean} showLoadingModal if the loading modal is to be shown while loading
     */
    loadAllAssets(callback, showLoadingModal = true) {
        if (showLoadingModal) {
            this.pages.openModal(GF.LOADING_MODAL);
        }
        this.assets.loadAll((progress) => {
            if (showLoadingModal) {
                // update
                this.pages.getPage(GF.LOADING_MODAL).updateProgress(progress);
            }
        },
        () => {
            if (typeof(callback) === "function") {
                const callbackResult = callback();
                if (showLoadingModal) {
                    if (callbackResult != null && typeof(callbackResult.then) === "function") {
                        callbackResult.then((result) => {
                            if (result == null || result === true) {
                                this.pages.closeModal();
                            }
                        });
                    } else {
                        if (callbackResult == null || callbackResult === true) {
                            this.pages.closeModal();
                        }
                    }
                }
            } else {
                if (showLoadingModal) {
                    this.pages.closeModal();
                }
            }
        },
        () => {
            // error
        });
    }

    /**
     * Add new custom asset loader 
     * @param {string} typeName the loader type name
     * @param {string} loaderClass name of a class that extends GF.FileLoader
     */
    addCustomAssetLoader(typeName, loaderClass) {
        this.assets.addCustomAssetLoader(typeName, loaderClass);
    }

    /**
     * Destroy
     */
    destroy() {
        window.removeEventListener('resize', this.onWindowResizeCallback);
    }

    //#endregion
}

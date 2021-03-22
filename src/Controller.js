// default aspect ratios
GF.ASPECT_RATIO = {
    _16_9: 16/9,
    _4_3: 4/3,
    _1_1: 1/1
}

// graphics presets
GF.GRAPHICS_PRESET = {
    PS1_Style: "PS1"
}

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
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.maxHeight = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.zIndex = zIndex+"";
    canvas.style.transition = "linear 0.2s filter";

    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
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
 * Controller
 * It is required to have declared two default pages: LoadingPage and GamePage
 */
GF.GameController = class GameController {
    constructor(container, gameClass, pages, sourceFilesToLoad, afterLoad) {
        if (sourceFilesToLoad instanceof Array) {
            var self = this;
            var i = sourceFilesToLoad.length;
            for (const sourceScriptPath of sourceFilesToLoad) {
                var script = document.createElement('script');
                script.onload = function () {
                    i--;
                    if (i === 0) {
                        self._init(container, gameClass, pages, afterLoad);
                    }
                };
                script.src = sourceScriptPath;
                
                document.body.appendChild(script); //or something of the likes
            }
        } else {
            this._init(container, gameClass, pages, afterLoad);
        }
        
    }

    /**
     * Init controller 
     */
    _init(container, gameClass, pages, afterLoad) {
        // assets loader
        this.assets = new GF.AssetsLoader();

        // global variables
        this.global = {};

        document.body.style.padding = "0";
        document.body.style.margin = "0";
        document.body.style.background = "black";
        document.body.style.width = "100vw";
        document.body.style.height = "100vh";
        document.body.style.overflow = "hidden";

        // create canvas and containers
        this.container = document.querySelector(container);
        this.container.style.overflow = "hidden";
        this.container.style.position = "relative";
        this.container.style.marginLeft = "auto";
        this.container.style.marginRight = "auto";
        this.container.style.top = "50%";
        this.container.style.transform = "translateY(-50%)";
        this.gameCanvas = createCanvas(this.container, 2);
        this.pageContainer = createContentContainer(this.container, 4);
        this.modalContainer = createContentContainer(this.container, 6);
        this.modalContainer.style.display = "none";

        // game
        if (typeof(gameClass) === "string") {
            this.game = window.eval.call(window, `(function (canvas, loader) { return new ${gameClass}(canvas, loader) })`)(this.gameCanvas, this.assets);
        } else {
            this.game = new GF.Game(this.gameCanvas, this.assets, gameClass.params, gameClass.onStart, gameClass.onUpdate, gameClass.onStop, gameClass.onTickUpdate, gameClass.onPointerLockChange);
        }
        this.input = this.game.inputManager;
        this.animation = this.game.animationManager;

        // aspect ratio
        this.aspectRatio = this.game.aspectRatio != null ? this.game.aspectRatio : GF.ASPECT_RATIO._16_9;

        // preset
        if (this.game.graphicsPreset === GF.GRAPHICS_PRESET.PS1_Style) {
            this.gameCanvas.style.imageRendering = "pixelated";
        }

        // page manager
        this.pages = new GF.PageManager(this.pageContainer, this.modalContainer);

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
     * On window resize
     */
    onWindowResize() {
        var width, height;

        width = window.innerHeight * this.aspectRatio;
        height = window.innerHeight;

        if (width > window.innerWidth) {
            width = window.innerWidth;
            height = (1 / this.aspectRatio) * window.innerWidth;
        }

        // update game canvas
        this.container.style.width = width + "px";
        this.container.style.height = height + "px";
        this.game.onContainerResize(width, height);

        // notify pages of  window resize
        this.pages.onContainerResize(width, height);
    }

    /**
     * Add asset to load
     * @param {string} name 
     * @param {AssetType} type 
     * @param {string | object} params the path for the file, or a group of params in certain cases
     */
    addAsset(name, type, params) {
        this.assets.add(name, type, params)
    }

    /**
     * Add preloaded asset
     * @param {string} name 
     * @param {AssetType} type 
     * @param {object} content
     */
    addPreloadedAsset(name, type, content) {
        this.assets.addPreloaded(name, type, content)
    }

    /**
     * Load all assets
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
}

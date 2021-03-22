

/**
 * Base Page
 */
GF.Page = class Page {

    /**
     * Constructor
     * @param properties {background: string, style: string, html: string}
     */
    constructor(properties, controller) {
        this.content = document.createElement("div");
        this.content.style.position = "relative";
        this.content.style.width = "100%";
        this.content.style.height = "100%";
        this.content.style.overflow = "hidden";
        this._decorateElement(this.content);
        this.controller = controller;

        this._PAGE_CANVAS_SHAPE_TYPE = {
            Image: 1,
            Text: 2,
            Square: 3,
            Line: 4,
        }

        this.canvasShapes = {};
        this.canvasShapeDrawArray = [];

        if (properties) {
            this.useCanvas = properties.useCanvas;

            this.content.style.background = properties.background;

            var name = properties.name != null ? properties.name : "test";

            if (name != null && properties.style != null) {
                this.addStyle(name, properties.style)
            }

            if (this.useCanvas) {
                this.canvasHTMLElement = document.createElement("canvas");
                this.canvasHTMLElement.style.position = "absolute";
                this.canvasHTMLElement.style.zIndex = "100";
                this.canvasHTMLElement.width = this.content.offsetWidth;
                this.canvasHTMLElement.height = this.content.offsetHeight;
                this.context2D = this.canvasHTMLElement.getContext("2d");
                this.content.appendChild(this.canvasHTMLElement);

                this.canvas = {
                    "createShapeImage": this._addImageShape.bind(this),
                    "createShapeText": this._addTextShape.bind(this),
                    "createShapeSquare": this._addSquareShape.bind(this),
                    "createShapeLine": this._addLineShape.bind(this)
                }
            } else if (properties.html) {
                this.content.innerHTML = properties.html;

                var children = this.content.querySelectorAll("[id]");
                    for (var child of children) {
                        this[child.id] = child;

                        this._decorateElement(this[child.id]);
                    }
            }
        }
    }

    //#region system

    /**
     * Decorate element
     * @param {HTMLElement} element 
     */
    _decorateElement(element) {
        var self = this;
        element.setStyle = function(prop, val) {
            w3.styleElement(element, prop, val);
        }
        element.addClass = function(className) {
            w3.addClass(element, className);
        }
        element.removeClass = function(className) {
            w3.removeClass(element, className);
        }
        element.setText = function(text) {
            element.innerHTML = text;
        }
        element.addUIElement = function(id, t, cn, is) {
            return self.addUIElement(id, t, cn, is, element);
        }
    }

    /**
     * Open page
     */
    _open(container, args) {
        this.container = container;
        this.container.innerHTML = "";
        this.container.appendChild(this.content);
        if (this.useCanvas) {
            this.redrawCanvas();
        }
        return this.onOpen(args);
    }

    /**
     * Close page
     */
    _close() {
        this.container.innerHTML = "";
        this.container = null;
        this._removeAllShapes();
        return this.onClose();
    }

    /**
     * Update page
     */
    _update(delta) {
        this.onUpdate(delta);
    }

    /**
     * When main container is resized
     * @param {number} width 
     * @param {number} height 
     */
    _resize(width, height) {
        this.redrawCanvas();
    }

    //#endregion

    //#region protected

    //#region HTML

    /**
     * Add style to html
     * @param {string} styleContentText 
     */
    addStyle(id, styleContentText) {
        var formattedId = "page-style-" + id;
        if (!document.getElementById(formattedId)) {
            var style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = styleContentText;
            style.id = formattedId;
            document.getElementsByTagName('head')[0].appendChild(style);
        }
    }

    /**
     * Get UI element
     * @param {string} id 
     */
    getUIElement(id) {
        return this.content.querySelector("#" + id)
    }

    /**
     * Add ui element to page content
     * @param {string} type 
     * @param {object} initialStyle 
     */
    addUIElement(id, type, className, initialStyle, parent) {
        const element = document.createElement(type);
        if (parent != null) {
            parent.appendChild(element);
        } else {
            this.content.appendChild(element);
        }

        this._decorateElement(element);

        if (className) {
            element.className = className;
        }

        if (initialStyle) {
            element.setStyle(initialStyle);
        }

        if (id != null) {
            element.id = id;
        }
        
        return element;
    }

    /**
     * Remove ui element from page content
     * @param {Element} element 
     */
    removeUIElement(element) {
        this.content.removeChild(element);
    }

    //#endregion

    //#region Canvas

    /**
     * Sanitize coordinate
     * @param {*} coordinate 
     */
    _sanitizeCoordinate(coordinate) {
        coordinate = Number(coordinate);
        if (!isNaN(coordinate)) {
            return coordinate < 0 ? 0 : (coordinate > 100 ? 100 : coordinate)
        } else {
            return 0;
        }
    }

    /**
     * Sanitize size
     * @param {*} size 
     */
    _sanitizeSize(size) {
        size = Number(size)
        if (!isNaN(size)) {
            return size < 0.01 ? 0.01 : (size > 100 ? 100 : size);
        } else {
            return 0.01;
        }
    }

    /**
     * Sanitize algin
     * @param {*} algin 
     */
    _sanitizeAlign(align) {
        var result;
        if (typeof(align) !== "string") {
            result = "left-top-corner"
        } else {
            result = align.toLowerCase();

            if (result !== "left-top-corner"
            && result !== "left-bottom-corner"
            && result !== "right-top-corner"
            && result !== "right-bottom-corner"
            && result !== "center") {
                result = "left-top-corner";
            }
        }
        return result;
    }

    /**
     * Update draw array
     */
    _updateDrawArray() {
        this.canvasShapeDrawArray = this.canvasShapeDrawArray.sort((a, b) => {
            return a.zIndex > b.zIndex ? 1 : (a.zIndex < b.zIndex ? -1 : 0)
        })
    }

    /**
     * Add a new shape
     * @param {string} id 
     * @param {any} shape 
     */
    _addShape(id, shape, zIndex = 0) {
        if (this.canvasShapes[id] == null) {
            this.canvasShapes[id] = shape;
            this.canvasShapes[id].zIndex = zIndex;

            this.canvasShapeDrawArray.push(this.canvasShapes[id]);
            this._updateDrawArray();

            this.redrawCanvas();

            return {
                "remove": () => {
                    this._removeShape(id);
                },
                "setProperty": (property, value) => {
                    this._editShapeProperty(id, property, value);
                },
                "setVisible": (visible) => {
                    this._setShapeVisible(id, visible);
                },
            }
        } else {
            console.error("trying to add two shapes with Id: " + id)
        }
    }

    /**
     * Add Image to Canvas UI
     * @param {string} id shape id
     * @param {string} image image asset
     * @param {number} x image x
     * @param {number} y image y
     * @param {number} width image width
     * @param {number} height image height
     * @param {string} align image align: 'left-top-corner' (default) or 'center'
     */
    _addImageShape(id, image, x, y, width, height, align, zIndex = 0) {
        const img = this.controller.assets.get(image);

        if (img != null) {
            var shape = this._addShape(id, {
                type: this._PAGE_CANVAS_SHAPE_TYPE.Image,
                visible: true,
                loaded: true,
                opacity: 1,
                img: img,
                aspectRatio: img.height / img.width,
                x: this._sanitizeCoordinate(x),
                y: this._sanitizeCoordinate(y),
                width: width,
                height: height,
                align: this._sanitizeAlign(align),
            }, zIndex);

            return shape;
        } else {
            return null;
        }
    }

    /**
     * Add Text to Canvas UI
     * @param {string} id shape id
     * @param {string} text the text
     * @param {number} x text x (% of the screen)
     * @param {number} y text y (% of the screen)
     * @param {string} color text color
     * @param {string} font text font
     * @param {number} size text size (% of screen height)
     * @param {string} style text style
     * @param {string} baseline text baseline
     * @param {string} align text align
     */
    _addTextShape(id, text, x, y, color, font, size, style, baseline, align, zIndex = 0) {
        return this._addShape(id, {
            type: this._PAGE_CANVAS_SHAPE_TYPE.Text,
            visible: true,
            text: text != null ? text : "no text",
            x: this._sanitizeCoordinate(x),
            y: this._sanitizeCoordinate(y),
            color: color != null ? color : "white",
            font: font != null ? font : "Arial",
            size: size != null ? size : 1,
            style: style != null ? style : "normal",
            baseline: baseline != null ? baseline : "middle",
            align: align != null ? align : "left",
        }, zIndex);
    }

    /**
     * Add Square shape to Canvas UI
     * @param {string} id shape id
     * @param {number} x square x (% of the screen)
     * @param {number} y square y (% of the screen)
     * @param {number} width square width (% of the screen)
     * @param {number} height square height (% of the screen)
     * @param {string} color square background color
     * @param {string} borderColor square border color
     * @param {number} borderWidth square border width (% of the screen)
     * @param {string} align square align: 'left-top-corner' (default) or 'center'
     */
    _addSquareShape(id, x, y, width, height, color, borderColor, borderWidth, align, zIndex = 0) {
        return this._addShape(id, {
            type: this._PAGE_CANVAS_SHAPE_TYPE.Square,
            visible: true,
            x: this._sanitizeCoordinate(x),
            y: this._sanitizeCoordinate(y),
            width: this._sanitizeSize(width),
            height: this._sanitizeSize(height),
            color: color != null ? color : null,
            borderColor: borderColor != null ? borderColor : "transparent",
            borderWidth: borderWidth != null ? borderWidth : 0,
            align: this._sanitizeAlign(align),
        }, zIndex);
    }

    /**
     * Add Line shape to Canvas UI
     * @param {string} id shape id
     * @param {number} x1 line start x (% of the screen)
     * @param {number} y1 line start y (% of the screen)
     * @param {number} x2 line end x (% of the screen)
     * @param {number} y2 line end y (% of the screen)
     * @param {string} color line color
     * @param {number} width line width (% of the screen)
     */
    _addLineShape(id, x1, y1, x2, y2, color, width, zIndex = 0) {
        return this._addShape(id, {
            type: this._PAGE_CANVAS_SHAPE_TYPE.Line,
            visible: true,
            x1: this._sanitizeCoordinate(x1),
            y1: this._sanitizeCoordinate(y1),
            x2: this._sanitizeCoordinate(x2),
            y2: this._sanitizeCoordinate(y2),
            color: color != null ? color : "transparent",
            width: width != null ? width : 1
        }, zIndex);
    }

    /**
     * Remove canvas shape
     * @param {string} id 
     */
    _removeShape(id) {
        const index = this.canvasShapeDrawArray.findIndex(this.canvasShapes[id]);
        if (index >= 0) {
            this.canvasShapeDrawArray.splice(index, 1);
            this._updateDrawArray();
        }
        this.canvasShapes[id] = undefined;
    }

    /**
     * Remove all shapes
     */
    _removeAllShapes() {
        this.canvasShapeDrawArray = [];
        this._updateDrawArray();
        this.canvasShapes = {};
    }

    /**
     * Edit canvas shape property
     * @param {string} id 
     * @param {string} property 
     * @param {any} value
     */
    _editShapeProperty(id, property, value) {
        if (this.canvasShapes[id]) {
            this.canvasShapes[id][property] = value;
            this.redrawCanvas();
        }
    }

    /**
     * Set canvas shape visible
     * @param {boolean} visible 
     */
    _setShapeVisible(id, visible) {
        if (this.canvasShapes[id]) {
            this.canvasShapes[id].visible = visible;
            this.redrawCanvas();
        }
    }

    /**
     * Process alignment
     * @param {string} align alignment
     * @param {number} x x
     * @param {number} y y
     * @param {number} width width
     * @param {number} height height
     */
    _processAlignment(align, x, y, width, height) {
        if (align === "center") {
            this.currentDrawShapeX = x - (width * 0.5);
            this.currentDrawShapeY = y - (height * 0.5);
        } else if (align === "left-top-corner") {
            this.currentDrawShapeX = x;
            this.currentDrawShapeY = y;
        } else if (align === "right-top-corner") {
            this.currentDrawShapeX = x - width;
            this.currentDrawShapeY = y;
        } else if (align === "left-bottom-corner") {
            this.currentDrawShapeX = x;
            this.currentDrawShapeY = y - height;
        } else if (align === "right-bottom-corner") {
            this.currentDrawShapeX = x - width;
            this.currentDrawShapeY = y - height;
        }
    }

    /**
     * On canvas draw custom code
     * (To override if needed)
     */
    onCanvasDraw() {
    }

    /**
     * Function to redraw canvas
     * (automatically called on resize)
     */
    redrawCanvas() {
        this.canvasHTMLElement.width = this.content.offsetWidth;
        this.canvasHTMLElement.height = this.content.offsetHeight;
        this.canvasWidth = this.content.offsetWidth;
        this.canvasHeight = this.content.offsetHeight;
        
        this.context2D.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        for (var i = 0; i < this.canvasShapeDrawArray.length; i++ ) {
            if (this.canvasShapeDrawArray[i].visible) {

                this.context2D.globalAlpha = this.canvasShapeDrawArray[i].opacity;

                if (this.canvasShapeDrawArray[i].shadow != null) {
                    this.context2D.shadowColor = 'rgba(0, 0, 0, 0.75)';
                    this.context2D.shadowBlur = this.canvasShapeDrawArray[i].shadow;
                }

                this.context2D.filter = this.canvasShapeDrawArray[i].filter != null ? this.canvasShapeDrawArray[i].filter : "none";

                switch(this.canvasShapeDrawArray[i].type) {
                    case this._PAGE_CANVAS_SHAPE_TYPE.Image: // image
                    case this._PAGE_CANVAS_SHAPE_TYPE.Square: // square
                        // square
                        if (this.canvasShapeDrawArray[i].type === this._PAGE_CANVAS_SHAPE_TYPE.Square) {
                            // process alignment
                            this._processAlignment(
                                this.canvasShapeDrawArray[i].align,
                                this.canvasShapeDrawArray[i].x,
                                this.canvasShapeDrawArray[i].y,
                                this.canvasShapeDrawArray[i].width,
                                this.canvasShapeDrawArray[i].height)

                            // fill
                            if (this.canvasShapeDrawArray[i].color != null) {
                                this.context2D.fillStyle = this.canvasShapeDrawArray[i].color;
                                this.context2D.fillRect(
                                    (this.currentDrawShapeX / 100) * this.canvasWidth,
                                    (this.currentDrawShapeY / 100) * this.canvasHeight,
                                    (this.canvasShapeDrawArray[i].width / 100) * this.canvasWidth,
                                    (this.canvasShapeDrawArray[i].height / 100) * this.canvasHeight
                                );
                            }

                            // stroke
                            if (this.canvasShapeDrawArray[i].borderColor != null) {
                                this.context2D.strokeStyle = this.canvasShapeDrawArray[i].borderColor;
                                this.context2D.lineWidth = (this.canvasShapeDrawArray[i].borderWidth / 100) * this.canvasHeight;
                                this.context2D.strokeRect(
                                    (this.currentDrawShapeX / 100) * this.canvasWidth,
                                    (this.currentDrawShapeY / 100) * this.canvasHeight,
                                    (this.canvasShapeDrawArray[i].width / 100) * this.canvasWidth,
                                    (this.canvasShapeDrawArray[i].height / 100) * this.canvasHeight
                                );
                            }
                        
                        // image
                        } else {
                            // width & height specified
                            if (this.canvasShapeDrawArray[i].width != null && this.canvasShapeDrawArray[i].height != null) {
                                this.imgWidth = this.canvasShapeDrawArray[i].width;
                                this.imgHeight = this.canvasShapeDrawArray[i].height;
                            // only width specified
                            } else if (this.canvasShapeDrawArray[i].height == null) {
                                this.imgWidth = this.canvasShapeDrawArray[i].width;
                                this.imgHeight = this.imgWidth * this.canvasShapeDrawArray[i].aspectRatio;
                                this.canvasDimension = this.canvasWidth;
                            // only height specified
                            } else if (this.canvasShapeDrawArray[i].width == null) {
                                this.imgHeight = this.canvasShapeDrawArray[i].height;
                                this.imgWidth = this.imgHeight / this.canvasShapeDrawArray[i].aspectRatio;
                                this.canvasDimension = this.canvasHeight;
                            }

                            this.imgWidth = (this.imgWidth / 100) *  (this.canvasDimension != null ? this.canvasDimension : this.canvasWidth);
                            this.imgHeight = (this.imgHeight / 100) * (this.canvasDimension != null ? this.canvasDimension : this.canvasHeight);

                            // process alignment
                            this._processAlignment(
                                this.canvasShapeDrawArray[i].align,
                                (this.canvasShapeDrawArray[i].x / 100) * this.canvasWidth,
                                (this.canvasShapeDrawArray[i].y / 100) * this.canvasHeight,
                                this.imgWidth,
                                this.imgHeight);

                            

                            // draw
                            this.context2D.drawImage(
                                this.canvasShapeDrawArray[i].img,
                                this.currentDrawShapeX,
                                this.currentDrawShapeY,
                                this.imgWidth,
                                this.imgHeight
                            );
                        }
                        break;
                    case this._PAGE_CANVAS_SHAPE_TYPE.Text: // text
                        this.context2D.fillStyle = this.canvasShapeDrawArray[i].color;
                        this.context2D.textBaseline = this.canvasShapeDrawArray[i].baseline;
                        this.context2D.textAlign = this.canvasShapeDrawArray[i].align;
                        this.context2D.font = this.canvasShapeDrawArray[i].style + " " + ((this.canvasShapeDrawArray[i].size / 100) * this.canvasHeight) + "px " + this.canvasShapeDrawArray[i].font;
                        this.context2D.fillText(
                            this.canvasShapeDrawArray[i].text,
                            (this.canvasShapeDrawArray[i].x / 100) * this.canvasWidth,
                            (this.canvasShapeDrawArray[i].y / 100) * this.canvasHeight
                        );
                        break;
                    case this._PAGE_CANVAS_SHAPE_TYPE.Line: // line
                        this.context2D.strokeStyle = this.canvasShapeDrawArray[i].color;
                        this.context2D.lineWidth = (this.canvasShapeDrawArray[i].width / 100) * this.canvasHeight;
                        this.context2D.strokeLine(
                            (this.canvasShapeDrawArray[i].x1 / 100) * this.canvasWidth,
                            (this.canvasShapeDrawArray[i].y1 / 100) * this.canvasHeight,
                            (this.canvasShapeDrawArray[i].x2 / 100) * this.canvasWidth,
                            (this.canvasShapeDrawArray[i].y2 / 100) * this.canvasHeight
                        );
                        break;
                }

                // reset
                this.context2D.shadowColor = null;
                this.context2D.shadowBlur = null;
                this.context2D.filter = "none";
                this.context2D.globalAlpha = 1;
            }
        }

        // custom draw
        this.onCanvasDraw();
    }

    //#region 
    
    //#endregion

    //#region abstract

    onOpen(args) {return Promise.resolve()}
    onClose() {return Promise.resolve()}
    onUpdate(delta) {}

    //#endregion
}


/**
 * Default Loading Page
 */
 class DefaultLoadingPage extends GF.Page {
    constructor(controller) {
        super({
            background: "black",
            useCanvas: true
        }, controller);
        this.progress = 0;

        // loading text (example -> remove)
        this.loadingText = this.canvas.createShapeText("loading-text", "", 50, 50, "white", "Arial", 5, null, "middle", "center")
    }

    /**
     * Update progress
     * @param {number} progress 
     */
    updateProgress(progress) {
        this.progress = progress;
        // update loading text
        this.loadingText.setProperty("text", "Loading (" + this.progress + "%)"); // (example -> remove)
    }

    /**
     * On page open
     */
    onOpen() {
        this.updateProgress(0);
        // update loading text
        this.loadingText.setProperty("text", "Loading (0%)"); // (example -> remove)
    }

    /**
     * On page close
     */
    onClose() {

    }

    /**
     * On page update
     */
    onUpdate(delta) {

    }
}


/**
 * Default Game Page
 */
class DefaultGamePage extends GF.Page {
    constructor(controller) {
        super({
            useCanvas: true
        }, controller);
    }
  
    /**
     * On page open
     */
    onOpen() {
        // start game
        this.controller.game.start();
    }
  
    /**
     * On page close
     */
    onClose() {
        // game stop
        this.controller.game.stop();
    }
}
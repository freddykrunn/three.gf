/**
 * Base UI Page
 */
GF.Page = class Page {
    /**
     * Constructor
     * @param {{useCanvas: boolean, background: string, style: string, html: string}} properties 
     * @param {GF.GameController} controller
     */
    constructor(properties, controller) {
        this.contentDiv = document.createElement("div");
        this.contentDiv.style.position = "relative";
        this.contentDiv.style.width = "100%";
        this.contentDiv.style.height = "100%";
        this.contentDiv.style.overflow = "hidden";
        this.controller = controller;

        this.content = $(this.contentDiv);

        this._PAGE_CANVAS_SHAPE_TYPE = {
            Image: 1,
            Text: 2,
            Square: 3,
            Line: 4,
        }

        this._canvasShapes = {};
        this._canvasShapeDrawArray = [];

        if (properties) {
            this._useCanvas = properties.useCanvas;

            this.contentDiv.style.background = properties.background;

            var name = properties.name != null ? properties.name : "test";

            if (name != null && properties.style != null) {
                this.addStyle(name, properties.style)
            }

            if (this._useCanvas) {
                this._canvasHTMLElement = document.createElement("canvas");
                this._canvasHTMLElement.style.position = "absolute";
                this._canvasHTMLElement.style.zIndex = "100";
                this._canvasHTMLElement.width = this.contentDiv.offsetWidth;
                this._canvasHTMLElement.height = this.contentDiv.offsetHeight;
                this.context2D = this._canvasHTMLElement.getContext("2d");
                this.contentDiv.appendChild(this._canvasHTMLElement);

                this.canvas = {
                    "createShapeImage": this._addImageShape.bind(this),
                    "createShapeText": this._addTextShape.bind(this),
                    "createShapeSquare": this._addSquareShape.bind(this),
                    "createShapeLine": this._addLineShape.bind(this)
                }
            } else if (properties.html) {
                this.contentDiv.innerHTML = properties.html;

                var children = this.contentDiv.querySelectorAll("[id]");
                for (var child of children) {
                    this[child.id] = this.content.find(child);
                }
            }
        }
    }

    //#region internal

    /**
     * Open page
     */
    _open(container, args) {
        this.container = container;
        this.container.innerHTML = "";
        this.container.appendChild(this.contentDiv);
        if (this._useCanvas) {
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
        if (this._canvasHTMLElement) {
            this.redrawCanvas();
        }
    }

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
        this._canvasShapeDrawArray = this._canvasShapeDrawArray.sort((a, b) => {
            return a.zIndex > b.zIndex ? 1 : (a.zIndex < b.zIndex ? -1 : 0)
        })
    }

    /**
     * Add a new shape
     * @param {string} id 
     * @param {any} shape 
     */
    _addShape(id, shape, zIndex = 0) {
        if (this._canvasShapes[id] == null) {
            this._canvasShapes[id] = shape;
            this._canvasShapes[id].zIndex = zIndex;

            this._canvasShapeDrawArray.push(this._canvasShapes[id]);
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
        const index = this._canvasShapeDrawArray.indexOf(this._canvasShapes[id]);
        if (index >= 0) {
            this._canvasShapeDrawArray.splice(index, 1);
            this._updateDrawArray();
        }
        this._canvasShapes[id] = undefined;
    }

    /**
     * Remove all shapes
     */
    _removeAllShapes() {
        this._canvasShapeDrawArray = [];
        this._updateDrawArray();
        this._canvasShapes = {};
    }

    /**
     * Edit canvas shape property
     * @param {string} id 
     * @param {string} property 
     * @param {any} value
     */
    _editShapeProperty(id, property, value) {
        if (this._canvasShapes[id]) {
            this._canvasShapes[id][property] = value;
            this.redrawCanvas();
        }
    }

    /**
     * Set canvas shape visible
     * @param {boolean} visible 
     */
    _setShapeVisible(id, visible) {
        if (this._canvasShapes[id]) {
            this._canvasShapes[id].visible = visible;
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

    //#endregion

    //#region API

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
     * Function to redraw canvas
     * (automatically called on resize)
     */
    redrawCanvas() {
        this._canvasHTMLElement.width = this.contentDiv.offsetWidth;
        this._canvasHTMLElement.height = this.contentDiv.offsetHeight;
        this._canvasWidth = this.contentDiv.offsetWidth;
        this._canvasHeight = this.contentDiv.offsetHeight;
        
        this.context2D.clearRect(0, 0, this._canvasWidth, this._canvasHeight);

        for (var i = 0; i < this._canvasShapeDrawArray.length; i++ ) {
            if (this._canvasShapeDrawArray[i].visible) {

                this.context2D.globalAlpha = this._canvasShapeDrawArray[i].opacity;

                if (this._canvasShapeDrawArray[i].shadow != null) {
                    this.context2D.shadowColor = 'rgba(0, 0, 0, 0.75)';
                    this.context2D.shadowBlur = this._canvasShapeDrawArray[i].shadow;
                }

                this.context2D.filter = this._canvasShapeDrawArray[i].filter != null ? this._canvasShapeDrawArray[i].filter : "none";

                switch(this._canvasShapeDrawArray[i].type) {
                    case this._PAGE_CANVAS_SHAPE_TYPE.Image: // image
                    case this._PAGE_CANVAS_SHAPE_TYPE.Square: // square
                        // square
                        if (this._canvasShapeDrawArray[i].type === this._PAGE_CANVAS_SHAPE_TYPE.Square) {
                            // process alignment
                            this._processAlignment(
                                this._canvasShapeDrawArray[i].align,
                                this._canvasShapeDrawArray[i].x,
                                this._canvasShapeDrawArray[i].y,
                                this._canvasShapeDrawArray[i].width,
                                this._canvasShapeDrawArray[i].height)

                            // fill
                            if (this._canvasShapeDrawArray[i].color != null) {
                                this.context2D.fillStyle = this._canvasShapeDrawArray[i].color;
                                this.context2D.fillRect(
                                    (this.currentDrawShapeX / 100) * this._canvasWidth,
                                    (this.currentDrawShapeY / 100) * this._canvasHeight,
                                    (this._canvasShapeDrawArray[i].width / 100) * this._canvasWidth,
                                    (this._canvasShapeDrawArray[i].height / 100) * this._canvasHeight
                                );
                            }

                            // stroke
                            if (this._canvasShapeDrawArray[i].borderColor != null) {
                                this.context2D.strokeStyle = this._canvasShapeDrawArray[i].borderColor;
                                this.context2D.lineWidth = (this._canvasShapeDrawArray[i].borderWidth / 100) * this._canvasHeight;
                                this.context2D.strokeRect(
                                    (this.currentDrawShapeX / 100) * this._canvasWidth,
                                    (this.currentDrawShapeY / 100) * this._canvasHeight,
                                    (this._canvasShapeDrawArray[i].width / 100) * this._canvasWidth,
                                    (this._canvasShapeDrawArray[i].height / 100) * this._canvasHeight
                                );
                            }
                        
                        // image
                        } else {
                            // width & height specified
                            if (this._canvasShapeDrawArray[i].width != null && this._canvasShapeDrawArray[i].height != null) {
                                this.imgWidth = this._canvasShapeDrawArray[i].width;
                                this.imgHeight = this._canvasShapeDrawArray[i].height;
                            // only width specified
                            } else if (this._canvasShapeDrawArray[i].height == null) {
                                this.imgWidth = this._canvasShapeDrawArray[i].width;
                                this.imgHeight = this.imgWidth * this._canvasShapeDrawArray[i].aspectRatio;
                                this.canvasDimension = this._canvasWidth;
                            // only height specified
                            } else if (this._canvasShapeDrawArray[i].width == null) {
                                this.imgHeight = this._canvasShapeDrawArray[i].height;
                                this.imgWidth = this.imgHeight / this._canvasShapeDrawArray[i].aspectRatio;
                                this.canvasDimension = this._canvasHeight;
                            }

                            this.imgWidth = (this.imgWidth / 100) *  (this.canvasDimension != null ? this.canvasDimension : this._canvasWidth);
                            this.imgHeight = (this.imgHeight / 100) * (this.canvasDimension != null ? this.canvasDimension : this._canvasHeight);

                            // process alignment
                            this._processAlignment(
                                this._canvasShapeDrawArray[i].align,
                                (this._canvasShapeDrawArray[i].x / 100) * this._canvasWidth,
                                (this._canvasShapeDrawArray[i].y / 100) * this._canvasHeight,
                                this.imgWidth,
                                this.imgHeight);

                            

                            // draw
                            this.context2D.drawImage(
                                this._canvasShapeDrawArray[i].img,
                                this.currentDrawShapeX,
                                this.currentDrawShapeY,
                                this.imgWidth,
                                this.imgHeight
                            );
                        }
                        break;
                    case this._PAGE_CANVAS_SHAPE_TYPE.Text: // text
                        this.context2D.fillStyle = this._canvasShapeDrawArray[i].color;
                        this.context2D.textBaseline = this._canvasShapeDrawArray[i].baseline;
                        this.context2D.textAlign = this._canvasShapeDrawArray[i].align;
                        this.context2D.font = this._canvasShapeDrawArray[i].style + " " + ((this._canvasShapeDrawArray[i].size / 100) * this._canvasHeight) + "px " + this._canvasShapeDrawArray[i].font;
                        this.context2D.fillText(
                            this._canvasShapeDrawArray[i].text,
                            (this._canvasShapeDrawArray[i].x / 100) * this._canvasWidth,
                            (this._canvasShapeDrawArray[i].y / 100) * this._canvasHeight
                        );
                        break;
                    case this._PAGE_CANVAS_SHAPE_TYPE.Line: // line
                        this.context2D.strokeStyle = this._canvasShapeDrawArray[i].color;
                        this.context2D.lineWidth = (this._canvasShapeDrawArray[i].width / 100) * this._canvasHeight;
                        this.context2D.strokeLine(
                            (this._canvasShapeDrawArray[i].x1 / 100) * this._canvasWidth,
                            (this._canvasShapeDrawArray[i].y1 / 100) * this._canvasHeight,
                            (this._canvasShapeDrawArray[i].x2 / 100) * this._canvasWidth,
                            (this._canvasShapeDrawArray[i].y2 / 100) * this._canvasHeight
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
    
    //#endregion

    //#region abstract

    /**
     * On canvas draw custom code
     * (To override if needed)
     */
    onCanvasDraw() {
    }

    /**
     * On page open
     * @param {any} args 
     * @returns 
     */
    onOpen(args) {return Promise.resolve()}

    /**
     * On page close
     * @returns 
     */
    onClose() {return Promise.resolve()}

    /**
     * On page update
     * @param {number} delta 
     */
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
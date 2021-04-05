
/**
 * TextureAnimator
 */
GF.TextureAnimator = class TextureAnimator {
    /**
     * TextureAnimator
     * @param {THREE.Texture} texture
     * @param {number} tilesHorizontal number of horizontal tiles
     * @param {number} tilesVertical number of vertical tiles
     * @param {number} numTiles number of tiles
     * @param {number} tileDisplayDuration tiles display duration
     */
    constructor(texture, tilesHorizontal, tilesVertical, numTiles, tileDisplayDuration) {	           
        this._tilesHorizontal = tilesHorizontal;
        this._tilesVertical = tilesVertical;
        this._numberOfTiles = numTiles;
        this._texture = texture;
        this._texture.wrapS = texture.wrapT = THREE.RepeatWrapping; 
        this._texture.repeat.set( 1 / this._tilesHorizontal, 1 / this._tilesVertical );
    
        // how much time each image is displayed
        this._tileDisplayDuration = tileDisplayDuration;
    
        // current display time of the current image
        this._currentDisplayTime = 0;
    
        // current image being displayed
        this._currentTile = 0;

        this._running = false;
    }

    /**
     * Play
     */
    play() {
        this._running = true;
        this._currentDisplayTime = 0;
    }

    /**
     * Stop
     */
    stop() {
        this._running = false;
    }

    /**
     * Update
     * @param {number} delta
     */
    update(delta) {
        if (this._running) {
            this._currentDisplayTime += delta;
            while (this._currentDisplayTime > this._tileDisplayDuration)
            {
                this._currentDisplayTime -= this._tileDisplayDuration;
                this._currentTile++;

                if (this._currentTile === this._numberOfTiles)
                    this._currentTile = 0;
        
                this._texture.offset.x = (this._currentTile % this._tilesHorizontal) / this._tilesHorizontal;
                this._texture.offset.y = Math.floor( this._currentTile / this._tilesHorizontal ) / this._tilesVertical;
            }
        }
    }
}
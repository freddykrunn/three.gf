
/**
 * TextureAnimator
 */
GF.TextureAnimator = class TextureAnimator {
    constructor(texture, tilesHoriz, tilesVert, numTiles, tileDispDuration) {	           
        this.tilesHorizontal = tilesHoriz;
        this.tilesVertical = tilesVert;
        this.numberOfTiles = numTiles;
        this.texture = texture;
        this.texture.wrapS = texture.wrapT = THREE.RepeatWrapping; 
        this.texture.repeat.set( 1 / this.tilesHorizontal, 1 / this.tilesVertical );
    
        // how much time each image is displayed
        this.tileDisplayDuration = tileDispDuration;
    
        // current display time of the current image
        this.currentDisplayTime = 0;
    
        // current image being displayed
        this.currentTile = 0;
    }

    /**
     * Update
     */
    update(delta) {
        this.currentDisplayTime += delta;
        while (this.currentDisplayTime > this.tileDisplayDuration)
        {
            this.currentDisplayTime -= this.tileDisplayDuration;
            this.currentTile++;
            if (this.currentTile == this.numberOfTiles)
                this.currentTile = 0;
            var currentColumn = this.currentTile % this.tilesHorizontal;
            this.texture.offset.x = currentColumn / this.tilesHorizontal;
            var currentRow = Math.floor( this.currentTile / this.tilesHorizontal );
            this.texture.offset.y = currentRow / this.tilesVertical;
        }
    }
}

/**
 * PageManager
 */
GF.PageManager = class PageManager {
    /**
     * PageManager
     * @param {HTMLElement} pageContainer page container element
     * @param {HTMLElement} modalContainer modal container element
     */
    constructor(pageContainer, modalContainer) {
        this._pages = {};
        this._pageContainer = pageContainer;
        this._modalContainer = modalContainer;
        this._currentPage = null;
        this._currentModal = null;
        this._navigating = false;

        this._animateCallback = this._animate.bind(this);
        this.resumeAnimation();
    }

    //#region API

    /**
     * Add a page
     * @param {string} id page id
     * @param {Page} page the oage
     */
    addPage(id, page) {
        page.pageId = id;
        this._pages[id] = page;
    }

    /**
     * Remove a page
     * @param {srtring} id page id
     */
    removePage(id) {
        this._pages[id] = undefined;
    }

    /**
     * Get page
     * @param {string} id page id
     */
    getPage(id) {
        return this._pages[id];
    }

    /**
     * Go to page
     * @param {string} id page id
     * @param {any} args arguments (optional)
     */
    goTo(id, args) {
        if (!this._navigating) {
            let closePromise = Promise.resolve();
            if (this._currentPage != null) {
                closePromise = this._currentPage._close();
                if (closePromise == null) {
                    closePromise = Promise.resolve();
                }
            }
            this._navigating = true;
            closePromise.then(() => {
                this._currentPage = this._pages[id];
                const openPromise = this._currentPage._open(this._pageContainer, args);
                if (openPromise != null) {
                    openPromise.then(() => {
                        this._navigating = false;
                    });
                } else {
                    this._navigating = false;
                }
            });
        }
    }

    /**
     * Open modal
     * @param {string} id page id 
     */
    openModal(id) {
        let closePromise = Promise.resolve();
        if (this._currentModal != null) {
            closePromise = this._currentModal._close();
        }
        closePromise.then(() => {
            this._currentModal = this._pages[id];
            if (this._currentModal != null) {
                this._modalContainer.style.display = "initial";
                this._currentModal._open(this._modalContainer);
            }
        });
    }

    /**
     * Close modal
     */
    closeModal() {
        if (this._currentModal != null) {
            let promise = this._currentModal._close();
            this._modalContainer.style.display = "none";
            
            if (promise != null) {
                promise.then(() => {
                    this._currentModal = null;
                });
            } else {
                this._currentModal = null;
            }
        }
    }

    /**
     * Resume the animation
     */
    resumeAnimation() {
        this._running = true;
        this._lastTime = new Date().valueOf();
        this._animateCallback();
    }

    /**
     * Pause the animation
     */
    pauseAnimation() {
        if (this._animationFrameRequest) {
            cancelAnimationFrame(this._animationFrameRequest);
        }
        this._running = false;
    }

    /**
     * When main container is resized
     * @param {number} width 
     * @param {number} height 
     */
    onContainerResize(width, height) {
        if (this._currentPage != null) {
            this._currentPage._resize(width, height);
        }
        if (this._currentModal != null) {
            this._currentModal._resize(width, height);
        }
    }

    //#endregion

    //#region Internal

    /**
     * Animate
     */
    _animate() {
        if (this._running === true) {
            // calculate delta
            var now = new Date().valueOf();
            var delta = now - this._lastTime;
            this._lastTime = now;

            if (this._currentModal != null) {
                this._currentModal._update(delta);
            } else if (this._currentPage != null) {
                this._currentPage._update(delta);
            }

            this._animationFrameRequest = requestAnimationFrame(this._animateCallback);
        }
    }

    _destroy() {
        this.pauseAnimation();
    }

    //#endregion
}
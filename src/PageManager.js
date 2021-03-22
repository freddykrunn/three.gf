
/**
 * PageManager
 */
GF.PageManager = class PageManager {
    constructor(pageContainer, modalContainer) {
        this.pages = {};
        this.pageContainer = pageContainer;
        this.modalContainer = modalContainer;
        this.currentPage = null;
        this.currentModal = null;
        this.navigating = false;

        this.animateCallback = this._animate.bind(this);
        this.resumeAnimation();
    }

    //#region public

    /**
     * Add page
     * @param {string} id 
     * @param {Page} page 
     */
    addPage(id, page) {
        page.pageId = id;
        this.pages[id] = page;
    }

    /**
     * Remove page
     * @param {srtring} id 
     */
    removePage(id) {
        this.pages[id] = undefined;
    }

    /**
     * Get page
     * @param {srtring} id 
     */
    getPage(id) {
        return this.pages[id];
    }

    /**
     * Go to page
     * @param {string} id 
     */
    goTo(id, args) {
        if (!this.navigating) {
            let closePromise = Promise.resolve();
            if (this.currentPage != null) {
                closePromise = this.currentPage._close();
                if (closePromise == null) {
                    closePromise = Promise.resolve();
                }
            }
            this.navigating = true;
            closePromise.then(() => {
                this.currentPage = this.pages[id];
                const openPromise = this.currentPage._open(this.pageContainer, args);
                if (openPromise != null) {
                    openPromise.then(() => {
                        this.navigating = false;
                    });
                } else {
                    this.navigating = false;
                }
            });
        }
    }

    /**
     * Open modal
     * @param {string} id 
     */
    openModal(id) {
        let closePromise = Promise.resolve();
        if (this.currentModal != null) {
            closePromise = this.currentModal._close();
        }
        closePromise.then(() => {
            this.currentModal = this.pages[id];
            if (this.currentModal != null) {
                this.modalContainer.style.display = "initial";
                this.currentModal._open(this.modalContainer);
            }
        });
    }

    /**
     * Close modal
     */
    closeModal() {
        if (this.currentModal != null) {
            let promise = this.currentModal._close();
            this.modalContainer.style.display = "none";
            
            if (promise != null) {
                promise.then(() => {
                    this.currentModal = null;
                });
            } else {
                this.currentModal = null;
            }
        }
    }

    /**
     * Resume the animation
     */
    resumeAnimation() {
        this.running = true;
        this.currentTime = new Date().valueOf();
        this.delta = 0;
        this.animateCallback();
    }

    /**
     * Pause the animation
     */
    pauseAnimation() {
        if (this.animationFrameRequest) {
            cancelAnimationFrame(this.animationFrameRequest);
        }
        this.running = false;
    }

    /**
     * When main container is resized
     * @param {number} width 
     * @param {number} height 
     */
    onContainerResize(width, height) {
        if (this.currentPage != null) {
            this.currentPage._resize(width, height);
        }
        if (this.currentModal != null) {
            this.currentModal._resize(width, height);
        }
    }

    //#endregion

    //#region private

    /**
     * Animate
     */
    _animate() {
        if (this.running === true) {
            // calculate delta
            this.newTime = new Date().valueOf();
            this.delta = this.newTime - this.currentTime;
            this.currentTime = this.newTime;

            if (this.currentModal != null) {
                this.currentModal._update(this.delta);
            } else if (this.currentPage != null) {
                this.currentPage._update(this.delta);
            }

            requestAnimationFrame(this.animateCallback);
        }
    }

    //#endregion

    //#region system

    _destroy() {
        this.pauseAnimation();
    }

    //#endregion
}
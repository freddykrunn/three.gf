/**
 * Event Emitter
 */
 GF.EventEmitter = class EventEmitter {
     /**
      * Constructor
      * @param {string} name the name (optional)
      */
    constructor(name) {
        this.name = name;
        this._listeners = [];
    }
  
    /**
     * Register a listener
     * @param {Object} owner 
     * @param {string} callbackname 
     */
    bind(owner, callbackname) {
        this._listeners.push({
            owner: owner,
            callbackname: callbackname,
            callback: owner[callbackname].bind(owner)
        })
    }
  
    /**
     * Remove a listener
      * @param {Object} owner 
     * @param {string} callbackname 
     */
    unbind(owner, callbackname) {
        const filterListeners = (listener) => listener.owner !== owner || listener.callbackname !== callbackname;
        this._listeners = this._listeners.filter(filterListeners);
    }

    /**
     * Remove a listener
    * @param {Object} owner
     */
    unbind(owner) {
        const filterListeners = (listener) => listener.owner !== owner;
        this._listeners = this._listeners.filter(filterListeners);
    }
  
    /**
     * Emit event
     * @param {any} data 
     */
    emit(...data) {
        const fireCallbacks = (listener) => {
            listener.callback(...data);
        };

        this._listeners.forEach(fireCallbacks);
    }
}
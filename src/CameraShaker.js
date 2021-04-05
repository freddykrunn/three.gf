/**
 * CameraShaker
 */
 GF.CameraShaker = class CameraShaker {

	/**
	 * Constructor
	 * @param {THREE.Camera} camera the scene camera
	 */
	constructor(camera) {
		this.camera = camera;
		this._running = false;
	}

	/**
	 * Update
	 */
	update() {
		if (this._running == true) {
			const now = Date.now();
			if (this._endTime > now) {
				let delta = (Date.now() - this._startTime) / this._duration;
				
				switch(this._type) {
					case GF.CameraShaker.WAVE:
						this._position = Math.sin(delta * Math.PI * 2);
						this.camera.position.add(this._direction.clone().multiplyScalar(this._position * this._amount));
						break;
				}
			} else {
				this._running = false;
			};
		};
	};

	/**
	 * Shake the camera
	 * @param {AnimationType} type the animation type
	 * @param {THREE.Vector3} direction vector
	 * @param {number} milliseconds duration
	 */
	shake(type, direction, amount, milliseconds) {
		if (!this._running) {
			this._type = type;
			this._direction = direction;
			this._amount = amount;
			this._running = true ;
			this._startTime = Date.now();
			this._endTime = this._startTime + milliseconds;
			this._duration = milliseconds;
		}
	};
}

/**
 * Camera Shaker types
 */
GF.CameraShaker.WAVE = 0; // sinusoidal wave animation
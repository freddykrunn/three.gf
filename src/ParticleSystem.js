GF.ParticleSystemMaterials = {};

/**
 * Get particle material
 * @returns 
 */
function getParticleMaterial(game, texture, color, opacity, isParticlePositionLocal) {
	if (GF.ParticleSystemMaterials != null) {
		const id = texture + (color.r + color.g + color.b) + opacity + isParticlePositionLocal;
		if (GF.ParticleSystemMaterials[id] == null) {
			GF.ParticleSystemMaterials[id] = new THREE.ShaderMaterial( {
				uniforms: {
					color: { value: new THREE.Vector3(color.r, color.g, color.b) },
					map: { value: game.loader.get(texture) },
					isParticlePositionLocal:  { value: isParticlePositionLocal },
					globalOpacity: { value: opacity },
				},
				vertexShader: `
					attribute float size;
					attribute float opacity;
					uniform bool isParticlePositionLocal;
					varying float vOpacity;
	
					void main() {
	
						vec4 mvPosition;
						if (isParticlePositionLocal) {
							mvPosition = modelViewMatrix * vec4( position, 1.0 );
						} else {
							mvPosition = viewMatrix * vec4( position, 1.0 );
						}
	
						vOpacity = opacity;
						gl_PointSize *= ( size / - mvPosition.z );
	
						gl_Position = projectionMatrix * mvPosition;
	
					}
				`,
				fragmentShader: `
					varying float vOpacity;
					uniform vec3 color;
					uniform sampler2D map;
					uniform float globalOpacity;
	
					void main() {
	
						gl_FragColor = vec4( color, vOpacity * globalOpacity );
						gl_FragColor = gl_FragColor * texture2D( map, gl_PointCoord );
	
					}
				`,
				blending: THREE.AdditiveBlending,
				depthTest: true,
				depthWrite: false,
				transparent: true
			} );
		}
		return GF.ParticleSystemMaterials[id];
	}
}

/**
 * ParticleSystem
 */
GF.ParticleSystem = class ParticleSystem extends GF.GameObject {

    /**
     * Constructor
	 * @param {number} color the color of the particles
	 * @param {number} texture the texture of the particles
	 * @param {number} maxParticleCount the max number of particles at a time
	 * @param {number} size the size of the particles
	 * @param {THREE.Vector3} velocity the velocity applied to each particle
	 * @param {number} lifetime the lifetime of each particle
	 * @param {number} spawnDelay the delay between each particle spawn 'tick'
	 * @param {number} spawnCount the count of particles spawn at each spawn 'tick'
	 * @param {THREE.Vector3} spawnBox spawn box (sizeX, sizeY, sizeZ)
     */
	constructor(color, opacity, texture, maxParticleCount, size, velocity, lifetime, spawnDelay, spawnCount, spawnBox, isParticlePositionLocal, hasSizeAttenuation, offset) {
		super(new THREE.Object3D(), null, false);
		this.color = color != null ? color : 0xFFFFFF;
		this.opacity = opacity;
		this.texture = texture;
		this.maxParticleCount = maxParticleCount != null ? maxParticleCount : 100;
		this.size = size != null ? size : 1;
		this.velocity = velocity != null ? velocity : new THREE.Vector3(0,0,0);
		this.lifetime = lifetime != null ? lifetime : 1000;
		this.spawnDelay = spawnDelay != null ? spawnDelay : 500;
		this.spawnCount = spawnCount != null ? spawnCount : 1;
		this.spawnBox = spawnBox != null ? spawnBox : new THREE.Vector3(0,0,0);
		this.isParticlePositionLocal = isParticlePositionLocal != null ? isParticlePositionLocal : false;
		this.hasSizeAttenuation = hasSizeAttenuation != null ? hasSizeAttenuation : false;
		this.offset = offset != null ? offset : new THREE.Vector3(0,0,0);
	}

	/**
	 * Set visibility of particle system
	 * @param {boolean} visible 
	 */
	setVisible(visible) {
		if (visible) {
			if (!this.object3D.visible) {
				this.resetParticles();
				this.object3D.visible = true;
			}
		} else {
			this.object3D.visible = false;
		}
	}

	/**
	 * Reset particles
	 */
	resetParticles() {
		this.positionIndex = 0;
		for (this.i = 0; this.i < this.maxParticleCount; this.i++ ) {
			this.positionIndex = this.i * 3;

			// set life
			this.attributes.life.array[this.i] = 0;

			// set size
			this.attributes.size.array[this.i] = 0;

			// set position
			this.attributes.position.array[this.positionIndex] = 0;
			this.attributes.position.array[this.positionIndex + 1] = 0;
			this.attributes.position.array[this.positionIndex + 2] = 0;

			// opacity
			this.attributes.opacity.array[this.i] = 0;
		}
	  
		// flag to update
		this.attributes.position.needsUpdate = true;
		this.attributes.life.needsUpdate = true;
		this.attributes.size.needsUpdate = true;
		this.attributes.opacity.needsUpdate = true;
	}
	
    /**
     * Init
     */
	onInit() {
		const color = new THREE.Color(this.color);

		var material = getParticleMaterial(this.game, this.texture, color, this.opacity, this.isParticlePositionLocal);

		// create the attributes arrays
		var vertices = new Float32Array(this.maxParticleCount * 3),
		size = new Float32Array(this.maxParticleCount),
		opacity = new Float32Array(this.maxParticleCount),
		life = new Float32Array(this.maxParticleCount);
		for ( var i = 0; i < this.maxParticleCount; i ++ ) {
			size[this.i] = this.size;
		}
		var geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'size', new THREE.Float32BufferAttribute( size, 1 ) );
		geometry.setAttribute( 'life', new THREE.Float32BufferAttribute( life, 1 ) );
		geometry.setAttribute( 'opacity', new THREE.Float32BufferAttribute( opacity, 1 ) );
		
		// create the particle system
		this.object3D = new THREE.Points(geometry, material);

		// update the particle system to sort the particles
		this.object3D.sortParticles = true;

		this.timeToSpawn = 0;

		super.onInit();
	}

    /**
     * Update
     */
	onUpdate(delta) {
		super.onUpdate(delta);

		if (this.object3D.position.distanceTo(this.game.camera.position) >= this.game.viewFarPlane) {
			return;
		}

		this.dimensions = this.game.getCanvasDimensions();
		this.minDimension = Math.min(this.dimensions.width, this.dimensions.height)

		this.attributes = this.object3D.geometry.attributes;

		this.timeToSpawn += delta;

		// spawn particles
		if (this.timeToSpawn >= this.spawnDelay) {
			this.timeToSpawn = 0;

			this.count = this.spawnCount;
			if (this.spawnCount > 0) {
				for (this.i = 0; this.i < this.maxParticleCount; this.i++) {
					this.positionIndex = this.i * 3;

					if (this.attributes.life.array[this.i] === 0) {
						// set life
						this.attributes.life.array[this.i] = this.lifetime;

						// set size
						this.attributes.size.array[this.i] = this.size;

						// set position
						this.attributes.position.array[this.positionIndex] = (Math.random() * this.spawnBox.x - (this.spawnBox.x * 0.5)) + (this.isParticlePositionLocal ? 0 : this.object3D.position.x + this.offset.x);
						this.attributes.position.array[this.positionIndex + 1] = (Math.random() * this.spawnBox.y - (this.spawnBox.y * 0.5)) + (this.isParticlePositionLocal ? 0 : this.object3D.position.y + this.offset.y);
						this.attributes.position.array[this.positionIndex + 2] = (Math.random() * this.spawnBox.z - (this.spawnBox.z * 0.5)) + (this.isParticlePositionLocal ? 0 : this.object3D.position.z + this.offset.z);

						// opacity
						this.attributes.opacity.array[this.i] = 1;

						this.count--;
					}

					if (this.count <= 0) {
						break;
					}
				}
			}
		}

		// update particles
		this.positionIndex = 0;
		for (this.i = 0; this.i < this.maxParticleCount; this.i++ ) {
			if (this.attributes.life.array[this.i] > 0) {
				this.positionIndex = this.i * 3;
				// position
				this.attributes.position.array[this.positionIndex] += this.velocity.x * delta;
				this.attributes.position.array[this.positionIndex + 1] += this.velocity.y * delta;
				this.attributes.position.array[this.positionIndex + 2] += this.velocity.z * delta;

				// set opacity
				this.attributes.opacity.array[this.i] = this.attributes.life.array[this.i] / this.lifetime;

				// set size
				if (this.hasSizeAttenuation) {
					this.attributes.size.array[this.i] = (this.size * 0.001 * this.minDimension) * this.attributes.opacity.array[this.i];
				}

				// set life
				this.attributes.life.array[this.i] -= delta;
				if (this.attributes.life.array[this.i] < 0) {
					this.attributes.life.array[this.i] = 0;
					this.attributes.opacity.array[this.i] = 0;
					this.attributes.position.array[this.positionIndex] = 0;
					this.attributes.position.array[this.positionIndex + 1] = 0;
					this.attributes.position.array[this.positionIndex + 2] = 0;
				}
			}
		}
	  
		// flag to update
		this.attributes.position.needsUpdate = true;
		this.attributes.life.needsUpdate = true;
		this.attributes.size.needsUpdate = true;
		this.attributes.opacity.needsUpdate = true;
	}

    /**
     * Destroy
     */
	onDestroy() {

	}
}

/**
 * Explosion particles effect
 * @param {Game} game game pointer
 * @param {any} haloParticles
 * {
		* texture: string,
		* color: number,
		* opacity: number,
		* minSpeed: number,
		* maxSpeed: number,
		* life: number,
		* size: number,
		* particleCount: number
		* maxSpeedAngle: number
 * }
 * @param {any} fireParticles 
 * {
		* texture: string,
		* color: number,
		* opacity: number,
		* minSpeed: number,
		* maxSpeed: number,
		* life: number,
		* size: number,
		* particleCount: number
		* spawnBoxSize: number
 * }
 */
GF.ExplosionEffect = function(game, position, haloParticles, fireParticles) {
	var canvasDimensions, sizeAttenuator, positionIndex;

	this.finished = true;
	this.game = game; 
	this.haloParticles = haloParticles;
	this.fireParticles = fireParticles;

	// create object for halo particles
	if (this.haloParticles) {
		var vertices = new Float32Array(this.haloParticles.particleCount * 3);
		var speed = new Float32Array(this.haloParticles.particleCount * 3);
		var opacity = new Float32Array(this.haloParticles.particleCount);
		var life = new Float32Array(this.haloParticles.particleCount);
		var size = new Float32Array(this.haloParticles.particleCount);

		var geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute('speed', new THREE.Float32BufferAttribute( speed, 3 ) );
		geometry.setAttribute('size', new THREE.Float32BufferAttribute( size, 1 ) );
		geometry.setAttribute('life', new THREE.Float32BufferAttribute( life, 1 ) );
		geometry.setAttribute('opacity', new THREE.Float32BufferAttribute( opacity, 1 ) );

		// dynamic flag
		geometry.attributes.position.dynamic = true;
		geometry.attributes.speed.dynamic = true;
		geometry.attributes.life.dynamic = true;
		geometry.attributes.size.dynamic = true;
		geometry.attributes.opacity.dynamic = true;

		var material = getParticleMaterial(game, this.haloParticles.texture, new THREE.Color(this.haloParticles.color), this.haloParticles.opacity, true)
		
		this.halo = new THREE.Points(geometry, material);
		this.halo.sortParticles = true;
		this.halo.position.set(position.x, position.y, position.z);
		this.game.scene.add(this.halo)

		this.haloParticlesAttributes = this.halo.geometry.attributes;
	}

	// create object for smoke particles
	if (this.fireParticles) {
		var vertices = new Float32Array(this.fireParticles.particleCount * 3);
		var speed = new Float32Array(this.haloParticles.particleCount * 3);
		var opacity = new Float32Array(this.fireParticles.particleCount);
		var life = new Float32Array(this.fireParticles.particleCount);
		var size = new Float32Array(this.haloParticles.particleCount);

		var geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute('speed', new THREE.Float32BufferAttribute( speed, 3 ) );
		geometry.setAttribute('size', new THREE.Float32BufferAttribute( size, 1 ) );
		geometry.setAttribute('life', new THREE.Float32BufferAttribute( life, 1 ) );
		geometry.setAttribute('opacity', new THREE.Float32BufferAttribute( opacity, 1 ) );

		// dynamic flag
		geometry.attributes.position.dynamic = true;
		geometry.attributes.speed.dynamic = true;
		geometry.attributes.life.dynamic = true;
		geometry.attributes.size.dynamic = true;
		geometry.attributes.opacity.dynamic = true;

		var material = getParticleMaterial(game, this.fireParticles.texture, new THREE.Color(this.fireParticles.color), this.fireParticles.opacity, true)
		
		this.fire = new THREE.Points(geometry, material);
		this.fire.sortParticles = true;
		this.fire.position.set(position.x, position.y, position.z);
		this.game.scene.add(this.fire)

		this.fireParticlesAttributes = this.fire.geometry.attributes;
	}

	/**
	 * Reset effect simulation
	 */
	this.play = function () {
		this.finished = false;

		// update halo particles
		if (this.haloParticles && this.haloParticlesAttributes) {
			var angleIncrement = (Math.PI * 2) / this.haloParticles.particleCount
			for (var i = 0; i < this.haloParticles.particleCount; i++) {
				positionIndex = i * 3;

				if (this.haloParticlesAttributes.life.array[i] === 0) {
					// set life
					this.haloParticlesAttributes.life.array[i] = this.haloParticles.life;

					// set size
					this.haloParticlesAttributes.size.array[i] = 1;

					// opacity
					this.haloParticlesAttributes.opacity.array[i] = 1;

					// set position
					this.haloParticlesAttributes.position.array[positionIndex] = 0;
					this.haloParticlesAttributes.position.array[positionIndex + 1] = 0;
					this.haloParticlesAttributes.position.array[positionIndex + 2] = 0;

					// set speed
					speed = new THREE.Vector3(
						Math.cos(angleIncrement * i),
						Math.sin((Math.random() * this.haloParticles.maxSpeedAngle * 2) - this.haloParticles.maxSpeedAngle),
						Math.sin(angleIncrement * i)
					);
					speed.multiplyScalar(this.haloParticles.minSpeed + (Math.random() * (this.haloParticles.maxSpeed - this.haloParticles.minSpeed)));

					this.haloParticlesAttributes.speed.array[positionIndex] = speed.x;
					this.haloParticlesAttributes.speed.array[positionIndex + 1] = speed.y;
					this.haloParticlesAttributes.speed.array[positionIndex + 2] = speed.z;
				}
			}

			this.haloParticlesAttributes.speed.needsUpdate = true;
		}

		// update fire particles
		if (this.fireParticles && this.fireParticlesAttributes) {
			for (var i = 0; i < this.fireParticles.particleCount; i++) {
				positionIndex = i * 3;

				if (this.fireParticlesAttributes.life.array[i] === 0) {
					// set life
					this.fireParticlesAttributes.life.array[i] = this.fireParticles.life;

					// set size
					this.fireParticlesAttributes.size.array[i] = 1;

					// opacity
					this.fireParticlesAttributes.opacity.array[i] = 1;

					// set position
					this.fireParticlesAttributes.position.array[positionIndex] = (Math.random() * this.fireParticles.spawnBoxSize) - (this.fireParticles.spawnBoxSize * 0.5);
					this.fireParticlesAttributes.position.array[positionIndex + 1] = (Math.random() * this.fireParticles.spawnBoxSize) - (this.fireParticles.spawnBoxSize * 0.5);
					this.fireParticlesAttributes.position.array[positionIndex + 2] = (Math.random() * this.fireParticles.spawnBoxSize) - (this.fireParticles.spawnBoxSize * 0.5);

					// set speed
					this.fireParticlesAttributes.speed.array[positionIndex] = 0;
					this.fireParticlesAttributes.speed.array[positionIndex + 1] = this.fireParticles.minSpeed + (Math.random() * (this.fireParticles.maxSpeed - this.fireParticles.minSpeed));
					this.fireParticlesAttributes.speed.array[positionIndex + 2] = 0;
				}
			}

			this.fireParticlesAttributes.speed.needsUpdate = true;
		}
	};

	/**
	 * Advance particles
	 */
	this.advanceParticles = function(particles, particlesAttributes, delta, sizeAttenuator) {
		if (particles && particlesAttributes) {
			for (var i = 0; i < particles.particleCount; i++) {
				if (particlesAttributes.life.array[i] > 0) {
					positionIndex = i * 3;
					// position
					particlesAttributes.position.array[positionIndex] += particlesAttributes.speed.array[positionIndex] * delta * 0.01;
					particlesAttributes.position.array[positionIndex + 1] += particlesAttributes.speed.array[positionIndex + 1] * delta * 0.01;
					particlesAttributes.position.array[positionIndex + 2] += particlesAttributes.speed.array[positionIndex + 2] * delta * 0.01;
	
					// set opacity
					particlesAttributes.opacity.array[i] = particlesAttributes.life.array[i] / particles.life;
	
					// set size
					particlesAttributes.size.array[i] = particles.size * sizeAttenuator;
	
					// set life
					particlesAttributes.life.array[i] -= delta;
					if (particlesAttributes.life.array[i] < 0) {
						particlesAttributes.life.array[i] = 0;
						particlesAttributes.opacity.array[i] = 0;
					}
				}
			}

			particlesAttributes.position.needsUpdate = true;
			particlesAttributes.life.needsUpdate = true;
			particlesAttributes.size.needsUpdate = true;
			particlesAttributes.opacity.needsUpdate = true;
		}
	}

	/**
	 * Advance effect simulation
	 */
	this.advance = function(delta) {
		if (!this.finished) {
			canvasDimensions = this.game.getCanvasDimensions();
			sizeAttenuator = Math.min(canvasDimensions.width, canvasDimensions.height) * 0.1;

			this.advanceParticles(this.haloParticles, this.haloParticlesAttributes, delta, sizeAttenuator);

			this.advanceParticles(this.fireParticles, this.fireParticlesAttributes, delta, sizeAttenuator)

			if ((this.haloParticlesAttributes == null || this.haloParticlesAttributes.life.array.every(i => i === 0))
			&& (this.fireParticlesAttributes == null || this.fireParticlesAttributes.life.array.every(i => i === 0))) {
				this.finished = true;
			}
		}
	}

	/**
	 * Destroy
	 */
	this.dispose = function() {
		if (this.halo) {
			this.game.scene.remove(this.halo);
		}
		if (this.fire) {
			this.game.scene.remove(this.fire);
		}
	}
  }

/**
 * Utils
 */
GF.Utils = {

    /**
     * Unique id increment
     */
    uniqueIdIncrement: 0,

    /**
     * Generate an unique Id
     */
    uniqueId: function(prefix) {
        this.uniqueIdIncrement++;
        return prefix + (Date.now() + "00" + this.uniqueIdIncrement) + "";  
    },

    /**
     * Converts degrees to radians
     * @param {number} deg degrees
     * @returns radians
     */
    degToRad: function(deg) {
        return deg * (Math.PI / 180);
    },

    /**
     * Build 3D object
     * @param {any} params 
     * @returns a new THREE.Mesh
     */
    build3DObject(loader, params) {
        var object3D;

        if (params != null && !(params.isObject3D && params.clone != null) && params.model != null && params.material != null) {
            // process model
            var geometry = params.model.isBufferGeometry ? params.model : this.buildGeometry(loader, params.model);
            
            // process material
            var material = params.material.isMaterial ? params.material : this.buildMaterial(loader, params.material);

            if (geometry != null && material != null) {
                object3D = new THREE.Mesh(geometry, material);
                object3D.castShadow =  params.shadows != null ? params.shadows.cast : true;
                object3D.receiveShadow = params.shadows != null ? params.shadows.receive : true;

                if (params.position) {
                    object3D.position.set(params.position.x, params.position.y, params.position.z)
                }

                if (params.rotation) {
                    object3D.rotation.set(params.rotation.x, params.rotation.y, params.rotation.z)
                }

                if (params.scale) {
                    object3D.scale.set(params.scale.x, params.scale.y, params.scale.z)
                }
            }
        } else {
            object3D = params;
        }

        return object3D;
    },

    /**
     * Build Geometry
     * @param {any} params 
     */
    buildGeometry(loader, params) {
        // process model
        var geometry = null;
        if (typeof(params) === "string") {
            geometry = loader.loader.get(params);
        } else {
            if (params.type === "box") {
                geometry = new THREE.BoxGeometry(params.size.x, params.size.y, params.size.z);
            } else if (params.type === "sphere") {
                var segments = params.segments != null ? params.segments : 32;
                geometry = new THREE.SphereGeometry(params.radius, segments, segments);
            } else if (params.type === "cylinder") {
                var segments = params.segments != null ? params.segments : 32;
                geometry = new THREE.CylinderGeometry(params.radius, params.radius, params.height, segments);
            }
        }
        
        return geometry;
    },

    /**
     * Build Material
     * @param {any} params 
     */
    buildMaterial(loader, params) {
        var material = null;

        if (typeof(params) === "string") {
            material = loader.get(params);
        } else {
            if (params.type === "phong") {
                material = new THREE.MeshPhongMaterial()
            } else if (params.type === "lambert") {
                material = new THREE.MeshLambertMaterial();
            } else if (params.type === "basic") {
                material = new THREE.MeshBasicMaterial();
            }

            material.color.copy(new THREE.Color(params.color != null ? params.color : 0xFFFFFF));
            if (params.emissiveColor) {
                material.emissiveColor.copy(new THREE.Color(params.emissiveColor));
                material.emissiveIntensity = params.emissiveIntensity != null ? params.emissiveIntensity : 1;
            }

            if (params.texture) {
                material.map = loader.get(params.texture);
            }

            material.opacity = params.opacity != null ? params.opacity : 1;
            if (material.opacity != 1) {
                material.transparent = true;
            }

            if (params.type === "phong") {
                material.shininess = params.shininess;
                material.specular.copy(new THREE.Color(params.specular != null ? params.specular : 0xFFFFFF)); 

                if (params.reflectionTexture) {
                    material.envMap = loader.get(params.reflectionTexture);
                    material.reflectivity = params.reflectivity;
                }

                if (params.bumpTexture) {
                    material.bumpMap = loader.get(params.bumpTexture);
                    material.bumpScale = params.bumpScale;
                }

                if (params.specularTexture) {
                    material.specularMap = loader.get(params.specularTexture);
                }

                if (params.emissiveTexture) {
                    material.emissiveMap = loader.get(params.emissiveTexture);
                    material.emissive = new THREE.Color(0xFFFFFF);
                    material.emissiveIntensity = params.emissiveIntensity;
                }
            }
        }

        return material;
    },

    /**
     * Build CollisionVolume from 3D Object
     * @param {THREE.Mesh} object3D 
     * @param {number} sizeMultiplier 
     * @returns 
     */
    buildCollisionVolumeFrom3DObject(object3D, sizeMultiplier) {
        if (object3D != null && object3D.geometry != null) {
            object3D.geometry.computeBoundingBox();
            object3D.geometry.computeBoundingSphere();

            var size = new THREE.Vector3(0,0,0);
            var offset = new THREE.Vector3(0,0,0);

            object3D.geometry.boundingBox.getSize(size);
            object3D.geometry.boundingBox.getCenter(offset);

            if (sizeMultiplier > 0) {
                size.multiplyScalar(sizeMultiplier)
            }

            return new GF.CollisionVolume(GF.COLLISION_BOX, [size.x, size.y, size.z], [offset.x, offset.y, offset.z]);
        }
        return null;
    },

    /**
     * Get default material
     * @param {sting} map 
     */
    getDefaultMaterial: function(loader, map, bumpMap, specularMap, alphaMap, emissiveMap, color, shininess, emissive, specular, bumpScale, flatShading, depthFunc, depthTest, depthWrite, transparent) {
        return new THREE.MeshPhongMaterial({
            map: map != null ? loader.get(map) : null,
            bumpMap: bumpMap != null ? loader.get(bumpMap) : null,
            specularMap: specularMap != null ? loader.get(specularMap) : null,
            alphaMap: alphaMap != null ? loader.get(alphaMap) : null,
            emissiveMap: emissiveMap != null ? loader.get(emissiveMap) : null,
            color: color,
            shininess: shininess != null ? shininess : 0,
            emissive: emissive,
            specular: specular,
            bumpScale: bumpScale,
            flatShading: flatShading,
            depthFunc: depthFunc,
            depthTest: depthTest,
            depthWrite: depthWrite,
            transparent: transparent
        });
    },

    /**
     * Compute global bounding box of an object
     */
    computeGlobalBoundingBox(object) {
        let bbox;
        const resultBbox = new THREE.Box3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0));
        for (const child of object.children) {
            if (child.geometry.computeBoundingBox != null) {
                child.geometry.computeBoundingBox();
                bbox = child.geometry.boundingBox;

                resultBbox.min.min(bbox.min);
                resultBbox.max.max(bbox.max);
            }
        }
        return resultBbox;
    },
}
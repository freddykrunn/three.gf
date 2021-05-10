const gulp = require("gulp");
const babel = require("gulp-babel");
const concat = require("gulp-concat");
const uglify = require("gulp-uglify");
const header = require('gulp-header');
const plumber = require("gulp-plumber");
const fs = require("fs");


gulp.task('build-dist', function() {
    const filesArray = [];

    filesArray.push(...[
        "./vendor/three.min.js",
        "./vendor/fflate.min.js",
        "./vendor/FBXLoader.js"
    ])

    // files
    filesArray.push(...[
        "./vendor/*.js",
        "./src/StateMachine.js",
        "./src/EmptyObject.js",
        "./src/GameObject.js",
        "./src/AnimationManager.js",
        "./src/AssetsLoader.js",
        "./src/EventManager.js",
        "./src/PhysicsManager.js",
        "./src/Game.js",
        "./src/InputManager.js",
        "./src/Utils.js",
        "./src/Controller.js",
        "./src/PageManager.js",
        "./src/Page.js",
        "./src/TextureAnimator.js",
        "./src/Scene.js",
        "./src/ParticleSystem.js",
        "./src/CameraShaker.js",
        "./src/Editor.js"
    ]);


    return gulp.src(filesArray)
      .pipe(plumber())
      .pipe(concat("three.gf.min.js"))
      .pipe(
        babel({
          plugins: [
            "@babel/plugin-transform-classes",
            "@babel/plugin-transform-for-of",
            "@babel/plugin-transform-instanceof",
            "@babel/plugin-transform-object-super",
            "@babel/plugin-transform-template-literals"
          ]
        })
      )
      .pipe(uglify())
      .pipe(header(`
      /**
       * Copyright notice
       * 
       * @credits Three.gf framework - Copyright (c) 2021 Frederico Gonçalves (MIT License) github.com/freddykrunn
       * 
       * Some third party libraries are bundled with the framework.
       * The credits and copyright notice are listed below:
       * 
       * @credits for three.js - Copyright (c) 2010-2021 Three.js authors (MIT License)
       * @credits for THREEx.KeyboardState.js - Copyright (c) 2013 Jerome Etienne (MIT License)
       * @credits for jQuery v3.6.0 - Copyright (c) OpenJS Foundation and other contributors (MIT License) (jquery.org/license)
       */
      var GF={};var THREEx={};
       `))
      .pipe(gulp.dest("./dist"))
});

gulp.task('init-blank', function() {  
    var dir = "template/";
    fs.mkdirSync(dir);
  
    fs.mkdirSync(dir + "assets");
    fs.mkdirSync(dir + "src");
    fs.mkdirSync(dir + "src/objects");

    fs.copyFile("dist/three.gf.min.js", dir + "/three.gf.min.js", (err) => { 
        if (err) { 
            console.log("Error:", err); 
        }
    }); 
  
// write main file
fs.writeFileSync(dir + 'main.js', `
/**
 * On page load
 */
function onPageLoad() {
    var controller = new GF.GameController("#main-container", {
        params: {
                antialias: true,
                aspectRatio: GF.ASPECT_RATIO._16_9,
                camera: {
                    type: GF.CAMERA_TYPE.PERSPECTIVE,
                    fov: 45,
                    near: 0.1,
                    far: 10000
                }
        },
        onStart: onStart,
        onUpdate: onUpdate,
        onStop: onStop
    });

    // === ASSETS
    // textures
    // controller.addAsset("example-texture", GF.AssetType.Texture, "assets/textures/example_surface.png");

    // models
    // controller.addAsset("example-model", GF.AssetType.Model3D_OBJ,"assets/objects/example_3d_model.obj");
    
    // sounds
    // controller.addAsset("example-music", GF.AssetType.Sound, {path: "assets/sounds/example-music.mp3", loop: true});

    // load all assets and go to main page
    controller.boot('default');
}

var cube;

/**
 * Game init
 */
function onStart() {
    // set environment lighting
    this.setEnvironmentLight({
        sun: {
            color: 0xffffff,
            intensity: 0.5,
            direction: {x: 5, y: 5, z: 2},
            distance: 10,
            shadow: true
        },
        ambient: {
            skyColor: 0xAAAAAA,
            groundColor: 0xFFFFBB,
            intensity: 0.3
        }
    })

    // set initial camera position and target
    this.setCamera({x: 0, y: 0, z: 5}, {x: 0, y: 0, z: 0});

    // add a cube
    cube = new GF.GameObject(this.loader, {
        model: {
            type: "box",
            size: {x: 1, y: 1, z: 1}
        },
        material: {
            type: "phong",
            color: "rgb(150, 150, 255)",
            shininess: 5
        },
        position: {x: 0, y: 0, z: 0}
    });
    this.addObject(cube);
}

/**
 * Game update
 */
function onUpdate(delta) {
    cube.rotation.x += 0.5 * delta;
    cube.rotation.y += 1 * delta;
    cube.rotation.z -= 1.5 * delta;
}

/**
 * Game destroy
 */
function onStop() {
}  
`);
  
    // write index file
    fs.writeFileSync(dir + 'index.html', `
  <!DOCTYPE html>
  <html>
      <head>
          <style>
              body {
                  padding: 0;
                  margin: 0;
                  background: black;
                  user-select: none;
              }
  
              #main-container {
                  width: 100vw;
                  height: 100vh;
                  max-width: 100vw;
                  max-height: 100vh;
                  overflow: hidden;
              }
          </style>
      </head>
      <body onload="onPageLoad()">
          <!-- Main container -->
          <div id="main-container"></div>
          <!-- Framework-->
          <script src="three.gf.min.js" type="text/javascript"></script>
          <!-- Main -->
          <script src="main.js" type="text/javascript"></script>
      </body>
  </html>
    `);
  
      return Promise.resolve(true);
});

gulp.task('init-pong', function() {  
    var dir = "template/";
    fs.mkdirSync(dir);
  
    fs.mkdirSync(dir + "assets");
    fs.mkdirSync(dir + "src");
    fs.mkdirSync(dir + "src/objects");
    fs.mkdirSync(dir + "src/pages");

    fs.copyFile("dist/three.gf.min.js", dir + "/three.gf.min.js", (err) => { 
        if (err) { 
            console.log("Error:", err); 
        }
    }); 

// write main file
fs.writeFileSync(dir + 'main.js', `  
/**
 * On page load
 */
function onPageLoad() {
    var controller = new GF.GameController("#main-container",
        {
            params: {
                    antialias: true,
                    aspectRatio: GF.ASPECT_RATIO._16_9,
                    shadows: true,
                    shadowMapType: THREE.PCFSoftShadowMap,
                    camera: {
                        type: GF.CAMERA_TYPE.PERSPECTIVE,
                        fov: 45,
                        near: 0.1,
                        far: 100
                    }
            },
            onStart: onStart,
            onUpdate: onUpdate,
            onStop: onStop
        },
        [
            {
                name: GF.GAME_PAGE,
                className: "PongMainPage"
            }
        ],
		{
            objects: [
                "ball",
                "paddle"
            ],
            pages: [
                "gamePage"
            ]
        },
		// after load source files callback
		() => {
			// boot (as there are no assets to load we can do a direct game boot 'default-no-assets')
            controller.boot('default-no-assets');
        }
    );
}

const EVENT_BALL_LAUNCH_COUNTDOWN = "event-ball-launch-countdown";
const VAR_PLAYER_1_SCORE = "var-player-1-score";
const VAR_PLAYER_2_SCORE = "var-player-2-score";

/**
 * Game init
 */
function onStart() {
    this.defineVariable(VAR_PLAYER_1_SCORE, 0);
    this.defineVariable(VAR_PLAYER_2_SCORE, 0);

    // game floor
    var gameFloor = GF.Utils.build3DObject(this.loader, {
        model: {
            type: "box",
            size: {x: 40, y: 1, z: 26}
        },
        material: {
            type: "phong",
            color: "rgb(30, 30, 30)",
            shininess: 5
        },
        shadows: {
            cast: false,
            receive: true
        },
        position: {x: 0, y: -2, z: 0}
    });

    this.addToScene(gameFloor);

    // walls
    var wallGeometry = GF.Utils.buildGeometry(this.loader, {
        type: "box",
        size: {x: 40, y: 3, z: 1}
    });
    var wallMaterial = GF.Utils.buildMaterial(this.loader, {
        type: "phong",
        color: "rgb(80, 80, 80)",
        shininess: 5
    });
    var wall01 = GF.Utils.build3DObject(this.loader, {
        model: wallGeometry,
        material: wallMaterial,
        shadows: {
            cast: true,
            receive: true
        },
        position: {x: 0, y: 0, z: -12.5}
    });
    this.addToScene(wall01);
    this.physics.addVolume(null, GF.Utils.buildCollisionVolumeFrom3DObject(wall01), wall01.position, false);

    var wall02 = GF.Utils.build3DObject(this.loader, {
        model: wallGeometry,
        material: wallMaterial,
        shadows: {
            cast: true,
            receive: true
        },
        position: {x: 0, y: 0, z: 12.5}
    });
    this.addToScene(wall02);
    this.physics.addVolume(null, GF.Utils.buildCollisionVolumeFrom3DObject(wall02), wall02.position, false);

    // set environment lighting
    this.setEnvironmentLight({
        sun: {
            color: 0xffffff,
            intensity: 0.5,
            direction: {x: 1, y: 1, z: -1},
            distance: 20,
            shadow: true
        },
        ambient: {
            skyColor: 0xffffff,
            groundColor: 0xFFFFBB,
            intensity: 0.45
        }
    })

    // player 1
    var player1 = new Paddle("rgb(100,100,255)", {x: -19, y: 0, z: 0}, "w", "s");
    this.addObject("Player1", player1);

    // player 2
    var player2 = new Paddle("rgb(255,100,100)", {x: 19, y: 0, z: 0}, "up", "down");
    this.addObject("Player2", player2);

    // ball
    var ball = new Ball();
    this.addObject("Ball", ball);

    // set initial camera position and target
    this.setCamera({x: 50, y: 10, z: 50}, {x: 0, y: 0, z: 0});

    // animate camera position and after start the game after
    this.animation.play(this.camera.position, ["x", "y", "z"], [0, 30, 30], GF.AnimationType.SLOW_DOWN, 1500, () => {
        player1.reset();
        player2.reset();
        ball.reset();
    });
}

/**
 * Game update
 */
function onUpdate(delta) {
    // make camera always look at the origin
    this.camera.lookAt(0,0,0);
}

/**
 * Game destroy
 */
function onStop() {
}

`);
  
// write index file
fs.writeFileSync(dir + 'index.html', `
<!DOCTYPE html>
<html>
    <head>
        <style>
            body {
                padding: 0;
                margin: 0;
                background: black;
                user-select: none;
            }

            #main-container {
                width: 100vw;
                height: 100vh;
                max-width: 100vw;
                max-height: 100vh;
                overflow: hidden;
            }
        </style>
    </head>
    <body onload="onPageLoad()">
        <!-- Main container -->
        <div id="main-container"></div>
        <!-- Framework-->
        <script src="three.gf.min.js" type="text/javascript"></script>
        <!-- Main -->
        <script src="main.js" type="text/javascript"></script>
    </body>
</html>
`);
  
// write game page file
fs.writeFileSync(dir + '/src/pages/gamePage.js', `
/**
 * Pong Main Page
 */
class PongMainPage extends GF.Page {
    constructor(controller) {
        super({
            useCanvas: true
        }, controller);

        // score
        this.player01Score = this.canvas.createShapeText("player-01-score", "Blue: 0", 1, 4, "rgb(200, 200, 255)", "Arial", 4, null, "middle", "left");
        this.player02Score = this.canvas.createShapeText("player-02-score", " Red: 0", 1, 9, "rgb(255, 200, 200)", "Arial", 4, null, "middle", "left");

        // countdown
        this.ballLaunchCountdown = this.canvas.createShapeText("ball-launch-countdown", "", 50, 12, "rgb(255, 255, 255)", "Arial", 6, null, "middle", "center");
    }

    /**
     * On page open
     */
    onOpen() {
        // start game
        this.controller.game.start();

        this.player01ScoreChangeSubscription = this.controller.game.onVariableChange(VAR_PLAYER_1_SCORE, (value) => {
            this.player01Score.setProperty("text", "Blue: " + value)
        });

        this.player02ScoreChangeSubscription = this.controller.game.onVariableChange(VAR_PLAYER_2_SCORE, (value) => {
            this.player02Score.setProperty("text", " Red: " + value)
        });

        this.player02ScoreChangeSubscription = this.controller.game.listen(EVENT_BALL_LAUNCH_COUNTDOWN, (countdown) => {
            this.ballLaunchCountdown.setProperty("text", countdown > 0 ? countdown : "");
        })
    }

    /**
     * On page close
     */
    onClose() {
        this.controller.game.offVariableChange(VAR_PLAYER_1_SCORE, this.player01ScoreChangeSubscription);
        this.controller.game.offVariableChange(VAR_PLAYER_2_SCORE, this.player02ScoreChangeSubscription);
        
        // game stop
        this.controller.game.stop();
    }
}
  
`);
  
// write game loading file
fs.writeFileSync(dir + '/src/objects/ball.js', `
const BALL_SPEED = 25;

/**
 * Ball
 */
class Ball extends GF.GameObject {
    constructor() {
        super({
            model: {
                type: "sphere",
                radius: 0.25
            },
            material: {
                type: "phong",
                color: "rgb(255, 255, 100)",
                shininess: 50
            },
            shadows: {
                cast: true,
                receive: true
            }
        },
        {
            solid: true,
            dynamic: true,
            gravity: false,
            mass: 1,
            restitution: 1
        });

        this.launchDirection = 1;
    }

    /**
     * Reset ball
     */
    reset() {
        this.position.set(0,-5,0);
        this.speed.set(0,0,0);
        this.startLaunchCountdown = true;

        var player1Paddle = this.game.getObject("Player1");
        var player2Paddle = this.game.getObject("Player2");

        if (player1Paddle != null) {
            player1Paddle.reset();
        }
        if (player2Paddle != null) {
            player2Paddle.reset();
        }
    }

    /**
     * Launch ball
     */
    launch() {
        var angle = (Math.PI * 0.5) + (Math.random() * (Math.PI * 0.3));
        angle = angle * this.launchDirection;
        this.launchDirection = -this.launchDirection;

        this.speed.set(Math.sin(angle), 0, Math.cos(angle));
        this.speed.normalize();
        this.speed.multiplyScalar(BALL_SPEED);
    }

    /**
     * On init
     */
    onInit() {
        this.position.set(0,-5,0);
    }

    /**
     * On update 
     * (Called every frame)
     * @param delta the time interval of the frame in milliseconds
     */
    onUpdate(delta) {
        if (this.position.x < -22) {
            this.game.incrementVariable(VAR_PLAYER_2_SCORE, 1);
            this.reset();
        } else if (this.position.x > 22) {
            this.game.incrementVariable(VAR_PLAYER_1_SCORE, 1);
            this.reset();
        }
    }

    /**
     * On tick
     * (Called every second while game is running)
     */
    onTick() {
        if (this.startLaunchCountdown === true) {
            this.launchCountdown = 3;
            this.position.set(0,0,0);
            this.game.broadcastMessage(EVENT_BALL_LAUNCH_COUNTDOWN, this.launchCountdown);
            this.startLaunchCountdown = false;
        } else {
            if (this.launchCountdown > 0) {
                this.launchCountdown--;
                this.game.broadcastMessage(EVENT_BALL_LAUNCH_COUNTDOWN, this.launchCountdown);
    
                if (this.launchCountdown == 0) {
                    this.launch();
                    this.launchCountdown = 0;
                }
            }
        }
    }
}

`);

// write game loading file
fs.writeFileSync(dir + '/src/objects/paddle.js', `
const PADDLE_SPEED = 30 // 30 m/s

/**
 * Paddle
 */
 class Paddle extends GF.GameObject {
    constructor(color, position, upKey, downKey) {
        super({
            model: {
                type: "box",
                size: {x: 1, y: 2, z: 4}
            },
            material: {
                type: "phong",
                color: color,
                shininess: 20
            },
            shadows: {
                cast: true,
                receive: true
            },
            position: position
        },
        {
            solid: true,
            dynamic: false,
            gravity: false,
            mass: 1,
            restitution: 1
        });

        this.initialPosition = position;

        this.upKey = upKey;
        this.downKey = downKey;
    }

    /**
     * Reset paddle
     */
    reset() {
        this.position.set(this.initialPosition.x, this.initialPosition.y, this.initialPosition.z);
    }

    /**
     * On update logic
     * @param {number} delta delta-time in seconds
     */
    onUpdate(delta) {
        if (this.game.input.isPressed(this.upKey)) {
            this.position.z += -PADDLE_SPEED * delta;
        } else if (this.game.input.isPressed(this.downKey)) {
            this.position.z += PADDLE_SPEED * delta;
        }

        if (this.position.z > 10) {
            this.position.z = 10;
        } else if (this.position.z < -10) {
            this.position.z = -10;
        }
    }
}

`);
    
return Promise.resolve(true);
});

gulp.task('init-physics-example', function() {  
    var dir = "template/";
    fs.mkdirSync(dir);
  
    fs.mkdirSync(dir + "src");
    fs.mkdirSync(dir + "src/objects");

    fs.copyFile("dist/three.gf.min.js", dir + "/three.gf.min.js", (err) => { 
        if (err) { 
            console.log("Error:", err); 
        }
    }); 

// write main file
fs.writeFileSync(dir + 'main.js', `  
/**
 * On page load
 */
function onPageLoad() {
    var controller = new GF.GameController("#main-container",
        {
            params: {
                antialias: true,
                aspectRatio: GF.ASPECT_RATIO._16_9,
                shadows: true,
                shadowMapType: THREE.PCFSoftShadowMap,
                camera: {
                    type: GF.CAMERA_TYPE.PERSPECTIVE,
                    fov: 45,
                    near: 0.1,
                    far: 100
                }
            },
            onStart: onStart,
            onUpdate: onUpdate,
            onStop: onStop
        },
        [],
		{
            objects: [
                "ball"
            ],
            pages: [
            ]
        },
		// after load source files callback
		() => {
			// boot (as there are no assets to load we can do a direct game boot 'default-no-assets')
            controller.boot('default-no-assets');
        }
    );
}

/**
 * Game init
 */
function onStart() {
    // game floor
    var gameFloor = GF.Utils.build3DObject(this.loader, {
        model: {
            type: "box",
            size: {x: 40, y: 1, z: 26}
        },
        material: {
            type: "phong",
            color: "rgb(130, 130, 130)",
            shininess: 5
        },
        shadows: {
            cast: false,
            receive: true
        },
        position: {x: 0, y: 0, z: 0}
    });

    this.addToScene(gameFloor);
    this.physics.addVolume(null, GF.Utils.buildCollisionVolumeFrom3DObject(gameFloor), {x: 0, y: 0, z: 0}, false);

    // collision walls
    this.physics.addVolume(null, new GF.CollisionVolume(GF.COLLISION_BOX, [1, 8, 26]), {x: 20, y: 4, z: 0}, false);
    this.physics.addVolume(null, new GF.CollisionVolume(GF.COLLISION_BOX, [1, 8, 26]), {x: -20, y: 4, z: 0}, false);
    this.physics.addVolume(null, new GF.CollisionVolume(GF.COLLISION_BOX, [40, 8, 1]), {x: 0, y: 4, z: -12.5}, false);
    this.physics.addVolume(null, new GF.CollisionVolume(GF.COLLISION_BOX, [40, 8, 1]), {x: 0, y: 4, z: 12.5}, false);

    // set environment lighting
    this.setEnvironmentLight({
        sun: {
            color: 0xffffff,
            intensity: 0.5,
            direction: {x: 1, y: 1, z: -1},
            distance: 20,
            shadow: true
        },
        ambient: {
            skyColor: 0xffffff,
            groundColor: 0xFFFFBB,
            intensity: 0.45
        }
    })

    // ball
    this.addObject(new Ball({x: 0, y: 2, z: 0}, true));
    for (var i = 0; i < 10; i++) {
        this.addObject(new Ball({x: (Math.random() * 35) - 17.5, y: 2 + (Math.random() * 2), z: (Math.random() * 20) - 10}));
    }

    // set initial camera position and target
    this.setCamera({x: 0, y: 30, z: 30}, {x: 0, y: 0, z: 0});
}

/**
 * Game update
 */
function onUpdate(delta) {
}

/**
 * Game destroy
 */
function onStop() {
}

`);
  
// write index file
fs.writeFileSync(dir + 'index.html', `
<!DOCTYPE html>
<html>
    <head>
        <style>
            body {
                padding: 0;
                margin: 0;
                background: black;
                user-select: none;
            }

            #main-container {
                width: 100vw;
                height: 100vh;
                max-width: 100vw;
                max-height: 100vh;
                overflow: hidden;
            }
        </style>
    </head>
    <body onload="onPageLoad()">
        <!-- Main container -->
        <div id="main-container"></div>
        <!-- Framework-->
        <script src="three.gf.min.js" type="text/javascript"></script>
        <!-- Main -->
        <script src="main.js" type="text/javascript"></script>
    </body>
</html>
`);
  
// write game ball object file
fs.writeFileSync(dir + '/src/objects/ball.js', `
const BALL_SPEED = 25;

/**
 * Ball
 */
class Ball extends GF.GameObject {
    constructor(position, controls) {
        super({
            model: {
                type: "sphere",
                radius: 0.5
            },
            material: {
                type: "phong",
                color: controls ? "rgb(255, 100, 100)" : "rgb(255, 255, 100)",
                shininess: 50
            },
            position: position,
            shadows: {
                cast: true,
                receive: true
            }
        },
        {
            solid: true,
            dynamic: true,
            gravity: true,
            collisionFriction: 0.2,
            mass: 1,
            restitution: 0.7
        });
        this.controls = controls;
    }

    /**
     * On init
     */
    onInit() {
        this.speed.set(Math.random() * 15, 25, Math.random() * 15);

        if (this.controls) {
            this.onKey("d", GF.KeyPressState.RELEASED, () => {
                if (this.game.isInDebug()) {
                    this.game.activateDebugMode(false)
                } else {
                    this.game.activateDebugMode(true, {showCollisionBoxes: true, showLabels: false})
                }
            });

            this.onKey("space", GF.KeyPressState.PRESSED, () => {
                this.applyForce({x: 0, y: 20, z: 0})
            });
        }
    }

    /**
     * On update 
     * (Called every frame)
     * @param delta the time interval of the frame in seconds
     */
    onUpdate(delta) {
        if (this.controls) {
            if (this.game.input.isPressed("up")) {
                this.applyForce({x: 0, y: 0, z: -0.35})
            }
            else if (this.game.input.isPressed("down")) {
                this.applyForce({x: 0, y: 0, z: 0.35})
            }

            if (this.game.input.isPressed("left")) {
                this.applyForce({x: -0.35, y: 0, z: 0})
            }
            else if(this.game.input.isPressed("right")) {
                this.applyForce({x: 0.35, y: 0, z: 0})
            }
        }
    }
}

`);
    
return Promise.resolve(true);
});

gulp.task('init-scene-example', function() {  
    var dir = "template/";
    fs.mkdirSync(dir);
  
    fs.mkdirSync(dir + "src");
    fs.mkdirSync(dir + "src/objects");
    fs.mkdirSync(dir + "assets");
    fs.mkdirSync(dir + "assets/textures");
    fs.mkdirSync(dir + "assets/scenes");
    fs.mkdirSync(dir + "assets/models");

    fs.copyFile("dist/three.gf.min.js", dir + "/three.gf.min.js", () => {}); 
    fs.copyFile("template-assets/dungeon/barrel.obj", dir + "/assets/models/barrel.obj", () => {}); 
    fs.copyFile("template-assets/dungeon/diamond.obj", dir + "/assets/models/diamond.obj", () => {}); 
    fs.copyFile("template-assets/dungeon/floor.obj", dir + "/assets/models/floor.obj", () => {}); 
    fs.copyFile("template-assets/dungeon/wall.obj", dir + "/assets/models/wall.obj", () => {}); 
    fs.copyFile("template-assets/dungeon/torch.obj", dir + "/assets/models/torch.obj", () => {}); 
    fs.copyFile("template-assets/dungeon/dungeon-texture.png", dir + "/assets/textures/dungeon-texture.png", () => {});  
    fs.copyFile("template-assets/dungeon/smoke-puff.png", dir + "/assets/textures/smoke-puff.png", () => {});  
    fs.copyFile("template-assets/dungeon/level-01.json", dir + "/assets/scenes/level-01.json", () => {});  

// write main file
fs.writeFileSync(dir + 'main.js', `  

/**
 * On page load
 */
function onPageLoad() {
    var controller = new GF.GameController(
        "#main-container",
        {
            params: {
                antialias: true,
                aspectRatio: GF.ASPECT_RATIO._16_9,
                camera: {
                    type: GF.CAMERA_TYPE.PERSPECTIVE,
                    fov: 30,
                    near: 0.1,
                    far: 10000
                },
                shadows: true
            },
            onStart: onStart,
            onUpdate: onUpdate,
            onStop: onStop,
        },
        [],
        {
            objects: [
                "diamond",
                "torch"
            ],
            pages: [
            ]
        },
        () => {
            // === ASSETS

            // textures
            var baseTextureProperties = {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                wrapS: THREE.RepeatWrapping,
                wrapT: THREE.RepeatWrapping
            }
            controller.addAsset("dungeon-texture", GF.AssetType.Texture, Object.assign({path: "assets/textures/dungeon-texture.png"}, baseTextureProperties));
            controller.addAsset("smoke-puff-texture", GF.AssetType.Texture, Object.assign({path: "assets/textures/dungeon-texture.png"}, {}));
        
            // models
            controller.addAsset("barrel-model", GF.AssetType.Model3D_OBJ, "assets/models/barrel.obj", );
            controller.addAsset("diamond-model", GF.AssetType.Model3D_OBJ, "assets/models/diamond.obj");
            controller.addAsset("torch-model", GF.AssetType.Model3D_OBJ, "assets/models/torch.obj");
            controller.addAsset("floor-model", GF.AssetType.Model3D_OBJ, "assets/models/floor.obj");
            controller.addAsset("wall-model", GF.AssetType.Model3D_OBJ, "assets/models/wall.obj");

            // scenes
            controller.addAsset("level-01", GF.AssetType.JSON, "assets/scenes/level-01.json");

            // load all assets and go to main page
            controller.boot("default");

            // (boot editor) uncomment line below and comment line above to boot the game scene editor
            // controller.boot("editor", {metadata: "editor.metadata.json"});

            // after open editor, open file "scenes/level-01.json" to edit
        }
    );
}

var cube;

/**
 * Game init
 */
function onStart() {
    // set environment lighting
    this.setEnvironmentLight({
        sun: null,
        ambient: {
            skyColor: 0xFFCCAA,
            groundColor: 0xFFCCAA,
            intensity: 0.25
        }
    })

    // set initial camera position and target
    this.setCamera({x: 6, y: 5, z: 6}, {x: 1, y: 0, z: 1});

    // load a scene
    this.levelScene = new GF.Scene(this, "level-01", "jgf");
    this.levelScene.init();
}

/**
 * Game update
 */
function onUpdate(delta) {
}

/**
 * Game destroy
 */
function onStop() {
    this.levelScene.destroy();
}  

`);
  
// write index file
fs.writeFileSync(dir + 'index.html', `
<!DOCTYPE html>
<html>
    <head>
        <style>
            body {
                padding: 0;
                margin: 0;
                background: black;
                user-select: none;
            }

            #main-container {
                width: 100vw;
                height: 100vh;
                max-width: 100vw;
                max-height: 100vh;
                overflow: hidden;
            }
        </style>
    </head>
    <body onload="onPageLoad()">
        <!-- Main container -->
        <div id="main-container"></div>
        <!-- Framework-->
        <script src="three.gf.min.js" type="text/javascript"></script>
        <!-- Main -->
        <script src="main.js" type="text/javascript"></script>
    </body>
</html>
`);

fs.writeFileSync(dir + '/editor.metadata.json', `
{
    "assets": [
        {
            "name": "Diamond",
            "gameObject": "Diamond",
            "model": "diamond-model",
            "texture": "dungeon-texture",
            "params": [
                "{{position}}"
            ]
        },
        {
            "name": "Torch",
            "gameObject": "Torch",
            "model": "torch-model",
            "texture": "dungeon-texture",
            "params": [
                "{{position}}",
                "{{rotation}}"
            ]
        },
        {
            "name": "Barrel",
            "model": "barrel-model",
            "texture": "dungeon-texture",
            "collision": true,
            "terrainCollision": false
        },
        {
            "name": "Floor",
            "model": "floor-model",
            "texture": "dungeon-texture",
            "collision": true,
            "terrainCollision": false
        },
        {
            "name": "Wall",
            "model": "wall-model",
            "texture": "dungeon-texture",
            "collision": true,
            "terrainCollision": false
        }
    ]
}
`)
  
// write game objects files
fs.writeFileSync(dir + '/src/objects/diamond.js', `
class Diamond extends GF.GameObject {
    constructor(position) {
        super({
            model: "diamond-model",
            material: {
                type: "basic",
                color: 0x33FFFF,
                texture: "dungeon-texture",
                opacity: 0.75
            },
            position: new THREE.Vector3(position.x, position.y, position.z),
            shadows: {
                cast: false,
                receive: false
            }
        });
    }

    onInit() {
        this.light = new THREE.PointLight(0x55ffff, 1, 1);
        this.addToScene(this.light);
    }

    onUpdate(delta) {
        this.light.position.copy(this.position);
        this.rotation.y += 0.2 * delta;
    }

    onDestroy() {
        this.removeFromScene(this.light);
    }
}
`);

fs.writeFileSync(dir + '/src/objects/torch.js', `
class Torch extends GF.GameObject {
    constructor(position, rotation) {
        super({
            model: "torch-model",
            material: {
                type: "basic",
                color: 0xFFFFFF,
                texture: "dungeon-texture"
            },
            position: new THREE.Vector3(position.x, position.y, position.z),
            rotation: new THREE.Vector3(rotation.x, rotation.y, rotation.z),
            shadows: {
                cast: false,
                receive: false
            }
        });
    }

    onInit() {
        // light
        this.light = new THREE.PointLight(0xffaa55, 1, 4);
        this.light.castShadow = true; 
        this.light.shadow.camera.near = 0.01;
        this.light.position.set(0.25, 0, 0);
        this.object3D.add(this.light);

        // particles
        
        this.fireParticles = new GF.ParticleSystem({
            texture: "smoke-puff-texture",
            color: 0xffba75,
            opacity: 1,
            particleCount: 50,
            size: 300,
            velocity: new THREE.Vector3(0,0.4,0),
            lifetime: 0.5,
            spawnDelay: 0.1,
            spawnBox: new THREE.Vector3(0.1, 0, 0.1),
            isParticlePositionLocal: true,
            hasSizeAttenuation: true
        });
        this.game.addObject(this.fireParticles);
        this.fireParticles.position.set(this.position.x + 0, this.position.y + 0.2, this.position.z + 0);
    }

    onUpdate(delta) {
    }
}
`);
    
return Promise.resolve(true);
});
const gulp = require("gulp");
const babel = require("gulp-babel");
const concat = require("gulp-concat");
const uglify = require("gulp-uglify");
const header = require('gulp-header');
const plumber = require("gulp-plumber");
const fs = require("fs");


gulp.task('minify', function() {
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
        "./src/GameObject.js",
        "./src/AnimationManager.js",
        "./src/AssetsLoader.js",
        "./src/EventManager.js",
        "./src/CollisionManager.js",
        "./src/Game.js",
        "./src/InputManager.js",
        "./src/Utils.js",
        "./src/Controller.js",
        "./src/PageManager.js",
        "./src/Page.js",
        "./src/TextureAnimator.js",
        "./src/Scene.js",
        "./src/GameObject.js",
        "./src/ParticleSystem.js",
        "./src/PhysicsObject.js"
    ]);


    return gulp.src(filesArray)
      .pipe(plumber())
      .pipe(concat("jgf.min.js"))
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
         * Some third party libraries are bundled with this framework.
         * The credits and copyright notice are listed below:
         * 
         * @credits for three.js - Copyright © 2010-2021 Three.js authors (MIT License)
         * @credits for ScreenShake.js - Copyright (c) 2019 felix mariotto (MIT License)
         * @credits for THREEx.KeyboardState.js - Copyright (c) 2013 Jerome Etienne (MIT License)
         * @credits for howler.js - Copyright (c) 2013-2018, James Simpson of GoldFire Studios (MIT License)
         * @credits for w3.js - W3.JS 1.01 Jan 2017 by w3schools.com (No License)
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
    fs.mkdirSync(dir + "src/pages");

    fs.copyFile("dist/jgf.min.js", dir + "/jgf.min.js", (err) => { 
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
    cube = new GF.GameObject({
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
    cube.rotation.x += 0.0005 * delta;
    cube.rotation.y += 0.0010 * delta;
    cube.rotation.z -= 0.0015 * delta;
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
          <script src="jgf.min.js" type="text/javascript"></script>
          <!-- Objects -->
          <!-- insert object scripts to import here -->
          <!-- Pages -->
          <script src="src/pages/game-page.js" type="text/javascript"></script>
          <script src="src/pages/loading-page.js" type="text/javascript"></script>
          <!-- Main -->
          <script src="main.js" type="text/javascript"></script>
      </body>
  </html>
    `);
  
    // write game page file
    fs.writeFileSync(dir + '/src/pages/game-page.js', `
  /**
   * Game Page
   */
  class GamePage extends GF.Page {
      constructor(controller) {
          super({
              name: "game",
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
  
      /**
       * On page update
       */
      onUpdate(delta) {
      }
  }
    `);
  
    // write game loading file
    fs.writeFileSync(dir + '/src/pages/loading-page.js', `
  /**
   * Loading Page
   */
  class LoadingPage extends GF.Page {
      constructor(controller) {
          super({
              name: "loading",
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

    fs.copyFile("dist/jgf.min.js", dir + "/jgf.min.js", (err) => { 
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
    this.collisionManager.addVolume(null, GF.Utils.buildCollisionVolumeFrom3DObject(wall01), wall01.position, false);

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
    this.collisionManager.addVolume(null, GF.Utils.buildCollisionVolumeFrom3DObject(wall02), wall02.position, false);

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
    this.animationManager.play(this.camera.position, ["x", "y", "z"], [0, 30, 30], GF.AnimationType.SLOW_DOWN, 1500, () => {
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
        <script src="jgf.min.js" type="text/javascript"></script>
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

        this.player02ScoreChangeSubscription = this.controller.game.onEvent(EVENT_BALL_LAUNCH_COUNTDOWN, (countdown) => {
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
const BALL_SPEED = 2.5;

/**
 * Ball
 */
class Ball extends GF.PhysicsObject {
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
        null,
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
        // very important: always call super onInit
        super.onInit();
        this.position.set(0,-5,0);
    }

    /**
     * On update 
     * (Called every frame)
     * @param delta the time interval of the frame in milliseconds
     */
    onUpdate(delta) {
        // very important: always call super onInit
        super.onUpdate();
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
            this.game.fireEvent(EVENT_BALL_LAUNCH_COUNTDOWN, this.launchCountdown);
            this.startLaunchCountdown = false;
        } else {
            if (this.launchCountdown > 0) {
                this.launchCountdown--;
                this.game.fireEvent(EVENT_BALL_LAUNCH_COUNTDOWN, this.launchCountdown);
    
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
const PADDLE_SPEED = 3 // 3 m/s

/**
 * Paddle
 */
 class Paddle extends GF.PhysicsObject {
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
        null,
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
     * @param {number} delta delta-time in milliseconds
     */
    onUpdate(delta) {
        if (this.input.isPressed(this.upKey)) {
            this.position.z += -PADDLE_SPEED * delta * 0.01; // We multiply by 0.01, because the delta came in 'ms' and we want to have the speed defined as 'm/s' so we convert to seconds the deltaTime
        } else if (this.input.isPressed(this.downKey)) {
            this.position.z += PADDLE_SPEED * delta * 0.01;
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
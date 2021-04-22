## JGF - Javascript Game Framework

This is a project targeting the web developers that want to make browser games with ease.
You don't need to install large pieces of software, just include the minified script and you are good to go.


This framework uses Three.Js as base for rendering and provides the scaffolding to create a game where you just have to write code for the logic of the game objects and their interactions. It has an internal engine that controls the game loop, the objects' lifecycle and all collision/physics interactions. It also offers a complete toolset of utils for game development.

Main Features:

* Game loop and object lifecycle management
* Assets management (load on demand, store and reuse)
* Simple physics and collision engine
* An animation manager (animate value transitions, animate transitions of camera, apply effects on screen, etc..)
* An event system (create simple timed events or complex event chains)
* Input management (easily get input from keyboard and connected gamepads)
* State machines and Event publish/subscription, to control how objects behave and communicate during the game
* UI management system (Create different pages for the game HUD, menus, loading screens, etc..)
* Audio effects and music
* Particle systems and particle effects
* Default Material and Mesh generation
* Support for rigged and animated models
* Other generic utils

### Get started

Currently there is no documentation available (future work). But here is a simple tutorial:

1. This can be used in any javascript/HTML5 web app (existant or from scratch). You can, for example, assemble a simple http server in a folder and do the following:
2. In your `index.html` include the framework script
```html
    <script src="jgf.min.js" type="text/javascript"></script>
```
3. In your source code just instantiate a new `GF.GameController` like this:

```javascript
 (...)
 // #main-container is the div that will hold the game canvas.
 // notice that whenever the container div changes its size inside your app you must inform GameController of the new size. However GameController already listens for a resize in the window
 var controller = new GF.GameController("#main-container", {
          params: { // more params can be provided here (consult file Controller.js)
                antialias: true,
                aspectRatio: GF.ASPECT_RATIO._16_9, // the game runs at a specific aspect ratio. Provide here one as a number, or use the default constants
                camera: {
                    type: GF.CAMERA_TYPE.PERSPECTIVE,
                    fov: 45,
                    near: 0.1,
                    far: 100
                }
          },
          // game lifecycle
          onStart: () => {
              // when game stars logic goes here (add initial objects, setup lighting, etc..)
          },
          onUpdate: () => {
              // game logic to run every frame
          }
          onStop: () => {
              // when game stops logic goes here (save game progress, etc..)
              // this is called whenever the game.stop() is invoked (returning to menu, closing the app, etc...)
          },
      },
		[ // here goes the list of pages of the game. There are two system pages: GF.GAME_PAGE and GF.LOADING_PAGE. If not provided here, the controller will create default pages. GamePage will be a simple page with no UI just to start and stop the game and LoadingPage will be a simple black page with the loading progress percentage in the middle.
			{
				name: GF.GAME_PAGE,
				className: "MainPage"
			},
            {
				name: GF.LOADING_PAGE,
				className: "LoadingPage"
			},
            {
				name: "menu",
				className: "MenuPage"
			}
		],
        // (optional) you can declare paths for source files to load them on demand when controller initializes
        [
            "src/objects/player.js",
            "src/objects/enemy.js",
            "src/pages/game-page.js",
            "src/pages/menu-page.js",
        ],
        // but if you declare source files to load on demand above, the logic for the initial boot (load assets, start game, etc..)
        // must be done in this callback: (afterLoad)
        () => {
            // initial logic here (code from steps 4 and 5)
        }
	);
    (...)
```
4. Define all assets needed for the game (You can also define and load assets later)

```javascript
    // textures
    controller.addAsset("stone-wall-texture", GF.AssetType.Texture, "assets/textures/stone-wall.png");
    controller.addAsset("barrel-texture", GF.AssetType.Texture, "assets/textures/barrel.png");
    controller.addAsset("character-texture", GF.AssetType.Texture, "assets/textures/character.png");

    // models
    controller.addAsset("character-model", GF.AssetType.Model3D_FBX,"assets/objects/character.fbx");
    controller.addAsset("wall-model", GF.AssetType.Model3D_OBJ,"assets/objects/wall.obj");
    controller.addAsset("barrel-model", GF.AssetType.Model3D_OBJ,"assets/objects/barrel.obj");

    // images
    controller.addAsset("logo-image", GF.AssetType.Image, "assets/images/logo.png");
    controller.addAsset("coin-pickup-image", GF.AssetType.Image, "assets/images/coin-pickup.png");

    (...)
```

5. Its time to boot the game! You define the pipeline of your game, that is, you have to explicitly say what and when assets will be loaded, when the game loop starts running or stops. Consider the following examples:

    * **Simple case**: load all assets at beginning-> start game

    * **Complex case**:
      load some assets -> go to menu page -> go to select level page -> load level specific assets -> start the game loop

    GameController provides default boot pipelines, eg:

    ```javascript
    controller.boot('default'); // loads all assets -> go to game page
    ```

    which is equivalent to this:

    ```javascript
    controller.loadAllAssets(() => {
        controller.pages.goTo(GF.GAME_PAGE);
    })
    ```

### Too confusing at first glance? Start from a template

There are a lot of features and different ways for making your game. For now, without documentation, you have to look through source files and see what is available, so its better to start from a template.

Ensure you run `npm install` first, to get all the needed dependencies.
Then, to start a new project from a template, you can run the following gulp commands:
* Blank template (Empty project)
    * `gulp init-blank`
* Pong game template (Simple 2 player pong game)
    * `gulp init-pong`

Use the templates as an initial guidance to start your first game development using JGF.
In the future, some example games will be provided in this repository too.

## Important Notice

This is a WIP (Work in progress), there is no official released version yet.
If you want to use this framework "as is" right now, bare in mind that some breaking changes can and will occur until a stable version is released

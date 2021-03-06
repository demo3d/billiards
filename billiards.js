//------------------------------------------------------------
// Global variables
//------------------------------------------------------------
var gl;

// Enable drawing debugging lines (not optimized; will probably impact
// performance)
var ENABLE_DEBUG = false;

// Enable signed distance field textures
// See:
// <http://www.valvesoftware.com/publications/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf>
var ENABLE_SDF = true;

// American-style ball
var BALL_DIAMETER = 57.15E-3;  // 57.15mm
var BALL_RADIUS = BALL_DIAMETER / 2;

// Various billiards physics constants
// See: <http://billiards.colostate.edu/threads/physics.html>
var BALL_CLOTH_COEFFICIENT_OF_ROLLING_RESISTANCE = 0.010;  // 0.005 - 0.015
var BALL_CLOTH_COEFFICIENT_OF_RESTITUTION = 0.75; // 0.6-0.9
var BALL_BALL_COEFFICIENT_OF_RESTITUTION = 0.95;  // 0.92-0.98
var BALL_VELOCITY_EPSILON = 0.001;  // Arbitrary m/s
var GRAVITY_ACCELERATION = 9.80665;  // m/s^2
var BALL_CLOTH_ROLLING_RESISTANCE_ACCELERATION =
    BALL_CLOTH_COEFFICIENT_OF_ROLLING_RESISTANCE * GRAVITY_ACCELERATION;
var CUE_BALL_MASS = 0.17;  // kg
var NUMBERED_BALL_MASS = 0.16;  // kg
var CUE_STICK_TIME_TO_FADE_IN = 0.1;
// Determines how fast the cue stick must travel
var CUE_STICK_TIME_TO_COLLISION = 0.1 / 2.66666666;
var CUE_STICK_TIME_AFTER_COLLISION = 0.1;
// Vectors within this radius are the weakest shot; this allows us to make
// shots at a greater radius and therefore with more accuracy.
var CURSOR_RADIUS_EPSILON = 0.4;
// The weakest shot that you're allowed to make. This is a little higher than
// zero to avoid confusing the shot machines.
var SHOT_VELOCITY_EPSILON = 0.03;
var MAX_SHOT_VELOCITY = 8.0;  // m/s
var MAX_SHOT_DISTANCE = CURSOR_RADIUS_EPSILON +
  (BALL_RADIUS + MAX_SHOT_VELOCITY * CUE_STICK_TIME_TO_COLLISION);

// Pocket physics fudge constants
var POCKET_EDGE_MIN_FUDGE_VELOCITY = 3.0E-2;
var POCKET_EDGE_FUDGE_ACCELERATION = GRAVITY_ACCELERATION / 2;
var POCKET_DAMPER = 0.75;
var BALL_TIME_TO_FADE_IN = 0.1;
var BALL_TIME_TO_FADE_OUT = 2.0;

// Various billiards dimensions in meters
/*
// Nine-foot table
var TABLE_LENGTH = 254.0E-2;  // 254cm
var TABLE_WIDTH = 127.0E-2;  // 127cm
*/
// Eight-foot table
// NOTE: These are the dimensions of the play area.
var TABLE_LENGTH = 234.0E-2;  // 234cm
var TABLE_WIDTH = 117.0E-2;  // 117cm
// TODO: The width can be computed from the model
var TABLE_MODEL_LENGTH = 2.664032;
var TABLE_MODEL_WIDTH = 1.492389;
// FIXME: The ortho margin should be computed by the worst possible power shot
// scenario.
var TABLE_EDGE_WIDTH = Math.max(
    (TABLE_MODEL_LENGTH - TABLE_LENGTH) / 2,
    (TABLE_MODEL_WIDTH - TABLE_WIDTH) / 2);
var BALL_EDGE_EPSILON = TABLE_EDGE_WIDTH + BALL_RADIUS;
// The margin in meters when in orthographic view
var ORTHO_MARGIN = MAX_SHOT_DISTANCE - BALL_EDGE_EPSILON;

// Ball rack positions
// Balls in racks are arranged in a triangular pattern. See:
// <https://en.wikipedia.org/wiki/Circle_packing>
var TRIANGLE_RACK = [];
for (var i = 0; i < 5; ++i) {
  for (var j = 0; j <= i; ++j) {
    TRIANGLE_RACK.push(
        vec2((TABLE_LENGTH / 4) + i * Math.sqrt(3 * BALL_RADIUS * BALL_RADIUS),
                            j * (BALL_DIAMETER) - i * (BALL_RADIUS)));
  }
}
var DIAMOND_RACK = [
  TRIANGLE_RACK[0],
  TRIANGLE_RACK[1],
  TRIANGLE_RACK[2],
  TRIANGLE_RACK[3],
  TRIANGLE_RACK[4],
  TRIANGLE_RACK[5],
  TRIANGLE_RACK[7],
  TRIANGLE_RACK[8],
  TRIANGLE_RACK[12]

];

// Gameplay modes
var EIGHT_BALL_MODE = 1;
var NINE_BALL_MODE = 2;
var STRAIGHT_POOL_MODE = 3;
// Gameplay constants
var EIGHT_BALL_NUM_BALLS = 16;
var NINE_BALL_NUM_BALLS = 10;
var STRAIGHT_POOL_NUM_BALLS = 16;

// Animation constants
// FIXME: un-marry the animation dt and the simulation dt
var MAX_DT = 0.007;  // Arbitrary
var LARGE_DT = MAX_DT * 10;  // Arbitrary limit for frame drop warning
var DETERMINISTIC_DT = true;

// Camera data (copied from Blender)
MAIN_CAMERA_POSITION = vec3(-4.18173, -1.67159, 2.30525);
MAIN_CAMERA_ORIENTATION = vec4(0.463, 0.275, 0.437, 0.720);
MAIN_CAMERA_FOV = 49.134 / 2;  // Degrees
MAIN_CAMERA_NEAR = .1;
MAIN_CAMERA_FAR = 100;
MAIN_CAMERA_ANGULAR_ACCELERATION = 10.0;
MAIN_CAMERA_MAX_ANGULAR_VELOCITY = Math.PI;
// Point the camera further underneath the table
MAIN_CAMERA_FUDGE_VECTOR = vec3(0.0, 0.0, -0.4);

MAIN_ORTHO_CAMERA_POSITION = vec3(0.0, 0.0, 1.0);
MAIN_ORTHO_CAMERA_ORIENTATION = vec4(0.0, 0.0, 0.0, 1.0);
MAIN_ORTHO_CAMERA_LEFT = -(TABLE_MODEL_LENGTH / 2 + ORTHO_MARGIN);
MAIN_ORTHO_CAMERA_RIGHT = TABLE_MODEL_LENGTH / 2 + ORTHO_MARGIN;
MAIN_ORTHO_CAMERA_BOTTOM = -(TABLE_MODEL_WIDTH / 2 + ORTHO_MARGIN);
MAIN_ORTHO_CAMERA_TOP = TABLE_MODEL_WIDTH / 2 + ORTHO_MARGIN;
MAIN_ORTHO_CAMERA_NEAR = MAIN_CAMERA_NEAR;
MAIN_ORTHO_CAMERA_FAR = MAIN_CAMERA_FAR;

LOADING_SCREEN_CAMERA_POSITION = MAIN_ORTHO_CAMERA_POSITION;
LOADING_SCREEN_CAMERA_ORIENTATION = MAIN_ORTHO_CAMERA_ORIENTATION;

HEADS_UP_DISPLAY_CAMERA_POSITION = vec3(0.0, 0.0, 1.0);
HEADS_UP_DISPLAY_CAMERA_ORIENTATION = MAIN_ORTHO_CAMERA_ORIENTATION;
HEADS_UP_DISPLAY_CAMERA_LEFT = MAIN_ORTHO_CAMERA_LEFT;
HEADS_UP_DISPLAY_CAMERA_RIGHT = MAIN_ORTHO_CAMERA_RIGHT;
HEADS_UP_DISPLAY_CAMERA_BOTTOM = MAIN_ORTHO_CAMERA_BOTTOM;
HEADS_UP_DISPLAY_CAMERA_TOP = MAIN_ORTHO_CAMERA_TOP;
HEADS_UP_DISPLAY_CAMERA_NEAR = 0.01;
HEADS_UP_DISPLAY_CAMERA_FAR = MAIN_ORTHO_CAMERA_FAR;

HUD_MARGIN = ORTHO_MARGIN / 3;
HUD_NEXT_BALL_ANGULAR_VELOCITY = Math.PI / 2;

NORTH_POCKET_CAMERA_POSITION = vec3(0.0, 0.75324, 0.192582);
NORTH_POCKET_CAMERA_ORIENTATION = quat(-0.001, -0.510, -0.860, -0.002);
NORTH_POCKET_CAMERA_FOV = 100 / 2;  // Degrees
NORTH_POCKET_CAMERA_NEAR = .01;
NORTH_POCKET_CAMERA_FAR = 100;

SOUTHEAST_POCKET_CAMERA_POSITION = vec3(1.33923, -74.43254E-2, 20.11665E-2);
SOUTHEAST_POCKET_CAMERA_ORIENTATION = quat(0.473, 0.208, 0.352, 0.780);
SOUTHEAST_POCKET_CAMERA_FOV = NORTH_POCKET_CAMERA_FOV;
SOUTHEAST_POCKET_CAMERA_NEAR = NORTH_POCKET_CAMERA_NEAR;
SOUTHEAST_POCKET_CAMERA_FAR = NORTH_POCKET_CAMERA_FAR;

// The other cameras are mirror transforms of the above cameras
SOUTH_POCKET_CAMERA_POSITION =
    vec3(mult(vec4(NORTH_POCKET_CAMERA_POSITION), scalem(1.0, -1.0, 1.0)));
SOUTH_POCKET_CAMERA_ORIENTATION =
    qmult(quat(vec3(0.0, 0.0, 1.0), Math.PI), NORTH_POCKET_CAMERA_ORIENTATION);
SOUTH_POCKET_CAMERA_FOV = NORTH_POCKET_CAMERA_FOV;
SOUTH_POCKET_CAMERA_NEAR = NORTH_POCKET_CAMERA_NEAR;
SOUTH_POCKET_CAMERA_FAR = NORTH_POCKET_CAMERA_FAR;

SOUTHWEST_POCKET_CAMERA_POSITION =
    vec3(mult(vec4(SOUTHEAST_POCKET_CAMERA_POSITION), scalem(-1.0, 1.0, 1.0)));
SOUTHWEST_POCKET_CAMERA_ORIENTATION =
    qmult(quat(vec3(0.0, 0.0, 1.0), -Math.PI / 2),
        SOUTHEAST_POCKET_CAMERA_ORIENTATION);
SOUTHWEST_POCKET_CAMERA_FOV = NORTH_POCKET_CAMERA_FOV;
SOUTHWEST_POCKET_CAMERA_NEAR = NORTH_POCKET_CAMERA_NEAR;
SOUTHWEST_POCKET_CAMERA_FAR = NORTH_POCKET_CAMERA_FAR;

NORTHEAST_POCKET_CAMERA_POSITION =
    vec3(mult(vec4(SOUTHEAST_POCKET_CAMERA_POSITION), scalem(1.0, -1.0, 1.0)));
NORTHEAST_POCKET_CAMERA_ORIENTATION =
    qmult(quat(vec3(0.0, 0.0, 1.0), Math.PI / 2),
        SOUTHEAST_POCKET_CAMERA_ORIENTATION);
NORTHEAST_POCKET_CAMERA_FOV = NORTH_POCKET_CAMERA_FOV;
NORTHEAST_POCKET_CAMERA_NEAR = NORTH_POCKET_CAMERA_NEAR;
NORTHEAST_POCKET_CAMERA_FAR = NORTH_POCKET_CAMERA_FAR;

NORTHWEST_POCKET_CAMERA_POSITION =
    vec3(mult(vec4(SOUTHEAST_POCKET_CAMERA_POSITION), scalem(-1.0, -1.0, 1.0)));
NORTHWEST_POCKET_CAMERA_ORIENTATION =
    qmult(quat(vec3(0.0, 0.0, 1.0), Math.PI),
        SOUTHEAST_POCKET_CAMERA_ORIENTATION);
NORTHWEST_POCKET_CAMERA_FOV = NORTH_POCKET_CAMERA_FOV;
NORTHWEST_POCKET_CAMERA_NEAR = NORTH_POCKET_CAMERA_NEAR;
NORTHWEST_POCKET_CAMERA_FAR = NORTH_POCKET_CAMERA_FAR;

CHASE_CAMERA_FOV = SOUTH_POCKET_CAMERA_FOV;
CHASE_CAMERA_NEAR = SOUTH_POCKET_CAMERA_NEAR;
CHASE_CAMERA_FAR = SOUTH_POCKET_CAMERA_FAR;
// Displacement in the XY plane, and then along the Z axis
CHASE_CAMERA_DISPLACEMENT = vec2(0.4, 0.2);


// Ball colors (passed to the shader)
// Based on the color of bakelite billiard balls
BALL_WHITE = scale(1.0 / 255.0, vec3(253, 242, 169));
BALL_YELLOW = scale(1.0 / 255.0, vec3(254, 178, 99));
BALL_BLUE = scale(1.0 / 255.0, vec3(4, 37, 37));
BALL_RED = scale(1.0 / 255.0, vec3(254, 26, 15));
BALL_PURPLE = scale(1.0 / 255.0, vec3(77, 25, 52));
// NOTE: This orange looked too red
//BALL_ORANGE = scale(1.0/255.0, vec3(254, 97, 49));
BALL_ORANGE = scale(1.0 / 255.0, vec3(214, 118, 0));
// NOTE: This green looked blue
//BALL_GREEN = scale(1.0 / 255.0, vec3(32, 99, 58));
BALL_GREEN = scale(1.0 / 255.0, vec3(15, 58, 3));
// NOTE: This Maroon looked gray/purple
//BALL_MAROON = scale(1.0 / 255.0, vec3(84, 62, 44));
BALL_MAROON = scale(1.0 / 255.0, vec3(106, 11, 10));
BALL_BLACK = scale(1.0 / 255.0, vec3(26, 16, 13));
/*
BALL_WHITE = scale(1.0 / 255.0, vec3(237, 224, 179));
BALL_YELLOW = scale(1.0 / 255.0, vec3(235, 193, 0));
BALL_BLUE = scale(1.0 / 255.0, vec3(50, 31, 99));
BALL_RED = scale(1.0 / 255.0, vec3(189, 17, 3));
BALL_PURPLE = scale(1.0 / 255.0, vec3(102, 31, 73));
BALL_ORANGE = scale(1.0 / 255.0, vec3(214, 118, 0));
BALL_GREEN = scale(1.0 / 255.0, vec3(15, 58, 3));
BALL_MAROON = scale(1.0 / 255.0, vec3(106, 11, 10));
BALL_BLACK = scale(1.0 / 255.0, vec3(14, 14, 6));
*/

// Replay constants
REPLAY_TIME_BEFORE_HIT = 0.5;
REPLAY_TIME_AFTER_LAST_POCKET = 1.5;

// Audio constants
AUDIO_OBJECTS_PER_SOUND = 4;  // Arbitrary
BALL_BALL_COLLISION_LOUD_SOUND_MIN_VELOCITY = .8;

// Globals
var hud;
var billiardTable;
var audioPool;
var debug;

function animate(dt) {
  // Simulate physics, game state, and cameras in BilliardTable
  billiardTable.tick(dt);
  // Don't forget the animations in the HUD
  hud.tick(dt);
}

var lastTime;
var tooSlow = false;
var totalElapsed = 0.0;
var dt = 0.0;
var initialState;  // XXX
function tick() {
  // Determine the time elapsed
  if (typeof lastTime == 'undefined')
    lastTime = Date.now();
  dt += (Date.now() - lastTime) / 1000.0;
  lastTime = Date.now();
  totalElapsed += dt;
  if (dt > LARGE_DT && !tooSlow && (totalElapsed > 3.0)) {
    // TODO: Avoid displaying this warning when the user changes tabs.
    // TODO: Make a less intrusive warning.
//    window.alert('Your computer might be too slow for this game! Sorry!');
    tooSlow = true;
  }
  // "Pause" the simulation if dt gets too large by capping dt. Without doing
  // this, huge dt can mess up the simulation if, for instance, the user has a
  // slow computer or looks at a different tab and we can't draw a frame for a
  // long time. A lower MAX_DT avoids many physics anomalies, but it can slow
  // down the simulation.
  dt = Math.min(dt, MAX_DT);
  // Detect when dt = MAX_DT and inform the user that their computer might be
  // too slow.

  requestAnimFrame(tick);
  render();

  if (DETERMINISTIC_DT) {
    // FIXME: This should be a while loop? It doesn't matter since we pause the
    // game anyway.
    if (dt >= MAX_DT) {
      animate(MAX_DT);
      dt -= MAX_DT;
    }
  } else {
    animate(dt);
    dt = 0.0;
  }
}

//------------------------------------------------------------
// render()
//------------------------------------------------------------
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var modelWorld = new TransformationStack();

  var worldView = billiardTable.currentCamera.worldViewTransformation();
  var projection =
    billiardTable.currentCamera.projectionTransformation(
        canvas.clientWidth / canvas.clientHeight);

  billiardTable.draw(gl, modelWorld, worldView, projection);

  // Draw the HUD on top of the game objects
  hud.draw(gl);

  // Draw debug last
  debug.draw(gl, worldView, projection);
}

//------------------------------------------------------------
// Initialization
//------------------------------------------------------------
var canvas;
window.onload = function init() {
  canvas = document.getElementById('gl-canvas');
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  //----------------------------------------
  // Configure WebGL
  //----------------------------------------
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
//  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearColor(0.0, 0.0, 0.12, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  //----------------------------------------
  // TODO: load shaders and initialize attribute
  // buffers
  //----------------------------------------
  gl.lineWidth(0.5);

  // Make the GL canvas fullscreen
  window.onresize = function(event) {
    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  };

  //----------------------------------------
  // Load assets
  // (runs in an asynchronous loop before
  // starting the game loop)
  //----------------------------------------
  audioPool = new AudioPool();
  loadAssets();
};

function startGame() {
  debug = new GraphicsDebug(assets['debug']);

  hud = new HeadsUpDisplay();

  // TODO: Allow user to select different game modes
  billiardTable = new BilliardTable(NINE_BALL_MODE);

  // Start the asynchronous game loop
  tick();
}

var loadingScreen;
function drawLoadingScreen() {
  if (typeof loadingScreen == 'undefined') {
    // NOTE: The loading screen does not use our loadAssets() routine to load
    // its assets, since it needs to be drawing the loading screen before
    // loadAssets() starts working
    loadingScreen = {};

    // Compile our shader program
    loadingScreen.shader = initShaders(gl, 'loading-vert', 'loading-frag');
    // Get the uniform and attribute locations
    loadingScreen.shader.attributes = {};
    loadingScreen.shader.attributes.vertexPosition =
      gl.getAttribLocation(loadingScreen.shader, 'vertexPosition');
    loadingScreen.shader.attributes.vertexUV =
      gl.getAttribLocation(loadingScreen.shader, 'vertexUV');
    loadingScreen.shader.uniforms = {};
    loadingScreen.shader.uniforms.projectionMatrix =
      gl.getUniformLocation(loadingScreen.shader, 'projectionMatrix');

    // Make an orthographic camera that clips our image onto the screen
    loadingScreen.camera = new Camera(
        {
          type: 'orthographicClip',
          left: -1.0,
          right: 1.0,
          bottom: -1.0,
          top: 1.0,
          near: 0.01,
          far: 100.0
        },
        LOADING_SCREEN_CAMERA_POSITION,
        LOADING_SCREEN_CAMERA_ORIENTATION);

    // Get the loading image from the DOM, which avoids all the asynchronous
    // hassle of loading it ourselves
    var loadingImage = document.getElementById('loading-screen');
    // Load the texture into WebGL
    loadingScreen.texture = loadTexture(loadingImage);

    // Load our verticies (the four corners of the texture, with UV values)
    // into WebGL
    //
    // The format for each vertex is
    //
    //    _____ _____ _____ _____ _____
    //   | p_x | p_y | p_z | t_u | t_v |
    //   '-----'-----'-----'-----'-----'
    //         position       texture
    //
    var verticies = [
      -1.0, -1.0, -1.0, 0.0, 0.0,  // Bottom left
      1.0, -1.0, -1.0, 1.0, 0.0,  // Bottom right
      1.0, 1.0, -1.0, 1.0, 1.0,  // Top right
      -1.0, 1.0, -1.0, 0.0, 1.0  // Top left
    ];
    var elements = [
      0, 1, 2,  // Bottom right triangle
      2, 3, 0  // Top left triangle
    ];
    var elementsUint = new Int16Array(elements.length);
    for (var i = 0; i < elements.length; ++i) {
      elementsUint[i] = elements[i];
    }
    loadingScreen.vertexAttributesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, loadingScreen.vertexAttributesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(verticies), gl.STATIC_DRAW);
    loadingScreen.vertexElementsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, loadingScreen.vertexElementsBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementsUint, gl.STATIC_DRAW);
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Use our shader program
  gl.useProgram(loadingScreen.shader);
  // Use the texture we loaded
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, loadingScreen.texture);
  gl.uniform1i(loadingScreen.shader.uniforms.textureSampler, 0);
  // Use our verticies
  gl.bindBuffer(gl.ARRAY_BUFFER, loadingScreen.vertexAttributesBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, loadingScreen.vertexElementsBuffer);
  // Use our projection matrix
  gl.uniformMatrix4fv(loadingScreen.shader.uniforms.projectionMatrix, false,
      flatten(loadingScreen.camera.projectionTransformation(
          canvas.clientWidth / canvas.clientHeight).peek()));
  // Configure the vertex attributes for position and uv
  gl.enableVertexAttribArray(loadingScreen.shader.attributes.vertexPosition);
  gl.enableVertexAttribArray(loadingScreen.shader.attributes.vertexUV);
  gl.vertexAttribPointer(loadingScreen.shader.attributes.vertexPosition,
      3,         // vec3
      gl.FLOAT,  // 32bit floating point
      false,     // Don't normalize values
      4 * 5,     // Stride for five 32-bit values per-vertex
      4 * 0);    // Position starts at the first value stored
  gl.vertexAttribPointer(loadingScreen.shader.attributes.vertexUV,
      2,         // vec2
      gl.FLOAT,  // 32bit floating point
      false,     // Don't normalize values
      4 * 5,     // Stride for five 32-bit values per-vertex
      4 * 3);    // Texture coordinate starts at the forth value stored
  // Draw the triangles
  gl.drawElements(gl.TRIANGLES, 6 /* two triangles */, gl.UNSIGNED_SHORT, 0);
}
var rulesScreen;
function drawRulesScreen() {
  if (typeof rulesScreen == 'undefined') {
    rulesScreen = {
      userInput: false,
      currentScreen: 'rules-screen'
    };

    // This is jerry-rigged onto the loading screen. We simply show the rules
    // and wait for the user to click.

    // Free the old loading screen texture
    gl.deleteTexture(loadingScreen.texture);
    // Load our rules into a texture
    var rulesImage = document.getElementById('rules-screen');
    // Load the texture into WebGL
    loadingScreen.texture = loadTexture(rulesImage);
  }

  canvas.onmousedown = function(event) {
    // The user clicked; move on
    rulesScreen.userInput = true;
  };
  window.onkeydown = function(event) {
    // The user pressed a key; move on
    rulesScreen.userInput = true;
  };

  if (rulesScreen.userInput) {
    switch (rulesScreen.currentScreen) {
      case 'rules-screen':
        rulesScreen.currentScreen = 'controls-screen';
        // Consume the input
        rulesScreen.userInput = false;
        // Free the old rules screen texture
        gl.deleteTexture(loadingScreen.texture);
        // Load our controls into a texture
        var controlsImage = document.getElementById('controls-screen');
        // Load the texture into WebGL
        loadingScreen.texture = loadTexture(controlsImage);
        // Keep drawing the "loading screen" with our controls texture
        drawLoadingScreen();
        requestAnimFrame(drawRulesScreen);
        break;
      case 'controls-screen':
        rulesScreen.currentScreen = 'notes-screen';
        // Consume the input
        rulesScreen.userInput = false;
        // Free the old rules screen texture
        gl.deleteTexture(loadingScreen.texture);
        // Load our notes into a texture
        var notesImage = document.getElementById('notes-screen');
        // Load the texture into WebGL
        loadingScreen.texture = loadTexture(notesImage);
        // Keep drawing the "loading screen" with our notes texture
        drawLoadingScreen();
        requestAnimFrame(drawRulesScreen);
        break;
      default:
        // Free the rules screen texture
        gl.deleteTexture(loadingScreen.texture);
        // All assets have been loaded and the player is ready; proceed to the
        // game loop
        startGame();
    }
  } else {
    // Keep drawing the "loading screen" with our rules texture
    drawLoadingScreen();
    requestAnimFrame(drawRulesScreen);
  }
}

var geometryAssets = [
  'common/unit_billiard_ball.obj',
  'common/billiard_table.obj',
  'common/cue_stick.obj'
];
var nonSdfTextures = [
  'common/billiard_ball_0.png',
  'common/billiard_ball_1.png',
  'common/billiard_ball_2.png',
  'common/billiard_ball_3.png',
  'common/billiard_ball_4.png',
  'common/billiard_ball_5.png',
  'common/billiard_ball_6.png',
  'common/billiard_ball_7.png',
  'common/billiard_ball_8.png',
  'common/billiard_ball_9.png',
  'common/billiard_ball_10.png',
  'common/billiard_ball_11.png',
  'common/billiard_ball_12.png',
  'common/billiard_ball_13.png',
  'common/billiard_ball_14.png',
  'common/billiard_ball_15.png'
];
var sdfTextures = [
  'common/number_mask.png',
  'common/billiard_ball_1_sdf_near.png',
  'common/billiard_ball_1_sdf_far.png',
  'common/billiard_ball_2_sdf_near.png',
  'common/billiard_ball_2_sdf_far.png',
  'common/billiard_ball_3_sdf_near.png',
  'common/billiard_ball_3_sdf_far.png',
  'common/billiard_ball_4_sdf_near.png',
  'common/billiard_ball_4_sdf_far.png',
  'common/billiard_ball_5_sdf_near.png',
  'common/billiard_ball_5_sdf_far.png',
  'common/billiard_ball_6_sdf_near.png',
  'common/billiard_ball_6_sdf_far.png',
  'common/billiard_ball_7_sdf_near.png',
  'common/billiard_ball_7_sdf_far.png',
  'common/billiard_ball_8_sdf_near.png',
  'common/billiard_ball_8_sdf_far.png',
  'common/billiard_ball_9_sdf_near.png',
  'common/billiard_ball_9_sdf_far.png',
  'common/billiard_ball_10_sdf_near.png',
  'common/billiard_ball_10_sdf_far.png',
  'common/billiard_ball_11_sdf_near.png',
  'common/billiard_ball_11_sdf_far.png',
  'common/billiard_ball_12_sdf_near.png',
  'common/billiard_ball_12_sdf_far.png',
  'common/billiard_ball_13_sdf_near.png',
  'common/billiard_ball_13_sdf_far.png',
  'common/billiard_ball_14_sdf_near.png',
  'common/billiard_ball_14_sdf_far.png',
  'common/billiard_ball_15_sdf_near.png',
  'common/billiard_ball_15_sdf_far.png',
  'common/next_ball_text_sdf.png',
  'common/player_one_text_sdf.png',
  'common/player_two_text_sdf.png',
  'common/replay_text_sdf.png',
  'common/foul_text_sdf.png',
  'common/player_one_wins_text_sdf.png',
  'common/player_two_wins_text_sdf.png',
  'common/press_spacebar_text_sdf.png'
];
var textureAssets = [
  'common/billiard_table_simple_colors.png',
  'common/billiard_table.png',
  'common/cue_stick.png',
  'common/test.png'
];
var soundAssets = [
  'common/108615__juskiddink__billiard-balls-single-hit-dry.wav'
];
if (ENABLE_SDF) {
  textureAssets = textureAssets.concat(sdfTextures);
} else {
  textureAssets = textureAssets.concat(nonSdfTextures);
}
var shaderAssets = [
{ name: 'billiardtable',
  vert: 'billiardtable-vert',
  frag: 'billiardtable-frag',
  attributes: ['vertexPosition', 'vertexUV', 'vertexNormal'],
  uniforms: ['modelViewMatrix', 'projectionMatrix'] },
{ name: 'billiardball',
  vert: 'billiardball-vert',
  frag: 'billiardball-frag',
  attributes: ['vertexPosition', 'vertexUV', 'vertexNormal'],
  uniforms: ['modelViewMatrix', 'projectionMatrix'] },
{ name: 'billiardball-sdf',
  vert: 'billiardball-sdf-vert',
  frag: 'billiardball-sdf-frag',
  attributes: ['vertexPosition', 'vertexUV', 'vertexNormal'],
  uniforms:
  ['modelViewMatrix', 'projectionMatrix', 'nearTexture', 'farTexture',
    'numberMask', 'insideColor', 'outsideColor'] },
{ name: 'billiardball-sdf-smooth',
  vert: 'billiardball-sdf-smooth-vert',
  frag: 'billiardball-sdf-smooth-frag',
  attributes: ['vertexPosition', 'vertexUV', 'vertexNormal'],
  uniforms:
  ['modelViewMatrix', 'projectionMatrix', 'nearTexture', 'farTexture',
    'numberMask', 'insideColor', 'outsideColor'] },
{ name: 'cuestick',
  vert: 'cuestick-vert',
  frag: 'cuestick-frag',
  attributes: ['vertexPosition', 'vertexUV', 'vertexNormal'],
  uniforms: ['modelViewMatrix', 'projectionMatrix', 'fadeAlpha'] },
{ name: 'debug',
  vert: 'debug-vert',
  frag: 'debug-frag',
  attributes: ['vertexPosition'],
  uniforms: ['modelViewMatrix', 'projectionMatrix'] },
{ name: 'text',
  vert: 'text-vert',
  frag: 'text-frag',
  attributes: ['vertexPosition', 'vertexUV'],
  uniforms:
  ['modelViewMatrix', 'projectionMatrix', 'textureSampler', 'color'] }
];
var assetIndex = 0;
var assetHandle = null;
var textureImage = null;
var assets = {};
function loadAssets() {
  // TODO: Display loading screen while assets are loading
  this.drawLoadingScreen();
  var i = assetIndex;
  var message = 'Loading...';
  var assetArray;
  // Determine which asset we are loading
  if (i < geometryAssets.length) {
    message = 'Loading geometry...';
    assetArray = geometryAssets;
  } else {
    i -= geometryAssets.length;
    if (i < textureAssets.length) {
      message = 'Loading textures...';
      assetArray = textureAssets;
    } else {
      i -= textureAssets.length;
      if (i < shaderAssets.length) {
        message = 'Loading shaders...';
        assetArray = shaderAssets;
      } else {
        i -= shaderAssets.length;
        if (i < soundAssets.length) {
          message = 'Loading sounds...';
          assetArray = soundAssets;
        } else {
          i -= soundAssets.length;
          // All assets have been loaded; show the rules before starting the
          // game
          drawRulesScreen();
          return;
        }
      }
    }
  }
  if (assetArray === shaderAssets) {
    // Load both the vertex and fragment shaders from the DOM (no need
    // for Ajax)
    // TODO: There's really no reason to load shaders from the DOM. It might be
    // more kosher to use Ajax here as well.
    var shaderProgram =
      initShaders(gl, shaderAssets[i].vert, shaderAssets[i].frag);
    // Get shader attribute locations
    shaderProgram.attributes = {};
    for (var j = 0; j < shaderAssets[i].attributes.length; ++j) {
      shaderProgram.attributes[shaderAssets[i].attributes[j]] =
        gl.getAttribLocation(shaderProgram, shaderAssets[i].attributes[j]);
    }
    // Get shader uniform locations
    shaderProgram.uniforms = {};
    for (var j = 0; j < shaderAssets[i].uniforms.length; ++j) {
      shaderProgram.uniforms[shaderAssets[i].uniforms[j]] =
        gl.getUniformLocation(shaderProgram, shaderAssets[i].uniforms[j]);
    }
    assets[shaderAssets[i].name] = shaderProgram;
    assetIndex += 1;
  } else if (assetArray === textureAssets) {
    // Load textures using Image() objects
    // FIXME: Need an error dialog when images can't be loaded
    var imageFile = assetArray[i];
    if (textureImage == null) {
      textureImage = new Image();
      textureImage.onload = function() {
        assets[imageFile] = loadTexture(textureImage);
        assetIndex += 1;
        textureImage = null;
      };
      textureImage.src = imageFile;
    }
  } else if (assetArray === soundAssets) {
    // Load sound files into our global audio pool
    var soundFile = assetArray[i];
    audioPool.loadSoundFile(soundFile);
    assetIndex += 1;
  } else {
    // Load all other assets via asynchronous Ajax
    var assetFile = assetArray[i];
    if (assetHandle == null) {
      assetHandle = loadFileAjax(assetFile);
    }
    if (assetHandle.done) {
      if (assetHandle.success) {
        if (assetArray === geometryAssets) {
          // Load the mesh geometry into WebGL
          var lines = assetHandle.text.split(/\n/);
          assets[assetFile] = loadObjMesh(assetHandle.text);
        } else if (assetArray === textureAssets) {
          // TODO: Load the texture into WebGL
          // TODO: Load the texture with Image().onload instead, instead of
          // ajax (ugh). See:
          // https://developer.mozilla.org/en/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
          assets[assetFile] = loadTexture(assetHandle.text);
        }
      } else {
        // TODO: Make a better error message
        window.alert('Error loading asset file: ' + assetFile);
      }
      assetHandle = null;
      assetIndex += 1;
    }
  }

  // Loop with a timeout while everything is being loaded
  window.setTimeout(loadAssets, 50);
}

function loadFileAjax(path) {
  var client = new XMLHttpRequest();
  var handle = {};
  handle.done = false;
  handle.client = client;
  client.open('GET', path);
  client.onreadystatechange = function() {
    if (client.readyState === 4) {
      handle.done = true;
      if (client.status === 200 ||
          // Chrome indicates zero status for "downloads" from "file:///" urls
          client.status === 0) {
        handle.success = true;
        handle.text = client.responseText;
      } else {
        handle.success = false;
      }
    }
  };
  client.send();
  return handle;
}

//------------------------------------------------------------
// Routine to read mesh verticies from a Wavefront .obj file
//------------------------------------------------------------
function loadObjMesh(text) {
  var mesh = {
    positions: [],
    uv: [],
    normals: [],
    faces: [],
    verticies: [],
    indices: [],
  };
  var lines = text.split(/\n/);
  var reIndexedVerticies = [];

  // Iterate through each line, collecting all data
  for (var i = 0; i < lines.length; ++i) {
    var line = lines[i];
    // TODO: Chomp leading whitespace
    if ((line.length <= 0) || (line[0] == '#'))
      continue;  // Skip blanks and comments
    var fields = line.split(/ /);
    if (fields.length <= 0)
      continue;  // Skip blanks
    // Determine the line type by its first entry
    switch (fields[0]) {
      case 'o':
        // Geometric object declaration
        // TODO: Support multiple objects (for now, we assume one object)
        break;
      case 'v':
        // Vertex point position
        if (fields.length != 4)
          window.alert('Error: Unknown vertex position format!');
        // TODO: Check for invalid floating point strings
        mesh.positions.push(vec3(
              parseFloat(fields[1]),
              parseFloat(fields[2]),
              parseFloat(fields[3])));
        break;
      case 'vt':
        // Vertex texture (UV) position
        if (fields.length != 3)
          window.alert('Error: Unknown UV map format!');
        // TODO: Check for invalid floating point strings
        mesh.uv.push(vec2(
              parseFloat(fields[1]),
              parseFloat(fields[2])));
        break;
      case 'vn':
        // Vertex normal
        if (fields.length != 4)
          window.alert('Error: Unknown surface normal format!');
        // TODO: Check for invalid floating point strings
        mesh.normals.push(vec3(
              parseFloat(fields[1]),
              parseFloat(fields[2]),
              parseFloat(fields[3])));
        break;
      case 's':
        // Geometric surface declaration
        // TODO: Support multiple surfaces (for now, we assume one surface)
        break;
      case 'f':
        // Surface face (vertex/uv/normal indices)
        if (fields.length != 4)
          window.alert('Error: Only surfaces made of triangles are supported!');
        mesh.faces.push(fields.slice(1, 4));
        for (var j = 1; j < fields.length; ++j) {
          vertexFields = fields[j].split(/\//);
          if (vertexFields.length != 3)
            window.alert('Error: Unknown vertex format!');
          // Compute indices (OBJ files are indexed from 1)
          // TODO: Check for invalid integer strings
          var positionIndex = parseInt(vertexFields[0]) - 1;
          var uvIndex = parseInt(vertexFields[1]) - 1;
          var normalIndex = parseInt(vertexFields[2]) - 1;
          if (mesh.positions.length <= positionIndex)
            window.alert('Error: Missing vertex position in mesh!');
          if (mesh.uv.length <= uvIndex)
            window.alert('Error: Missing vertex UV coordinate in mesh!');
          if (mesh.normals.length <= normalIndex)
            window.alert('Error: Missing vertex normal in mesh!');
          /*
          if (mesh.verticies[positionIndex] === undefined)
            mesh.verticies[positionIndex] = {};
            */
          // Build the vertex
          var vertex = {
            position: mesh.positions[positionIndex],
            uv: mesh.uv[uvIndex],
            normal: mesh.normals[normalIndex] };
          // Assume the position index for the first vertex we encounter
          var vertexIndex = positionIndex;
          // Check for conflicting indices that Blender might have exported
          // (e.g. texture coordinate seams or cusps in the surface normals)
          // FIXME: We could check for texture coordinates AND normals here in
          // one go, but Javascript object comparison kind of sucks.
          if ((typeof mesh.verticies[vertexIndex] != 'undefined') &&
              (mesh.verticies[vertexIndex].uv != vertex.uv)) {
              // NOTE: Some verticies have different texture coordinates for
              // each face, especially along seams. We simply duplicate these
              // verticies in the representation we send to WebGL. The
              // difficulty with these verticies is that we must re-index some
              // of the faces.

              // Look for identical verticies that we may have already
              // re-indexed
              // FIXME: Indexing a map by arbitrary objects in Javascript is
              // not trivial, so I'm using a linear search here for now.
              var k;
              for (k = 0; k < reIndexedVerticies.length; ++k) {
                if (reIndexedVerticies[k].uv == vertex.uv) {
                  // We found the vertex; use its existing index
                  vertexIndex = mesh.positions.length + k;
                  // TODO: Investigate why re-indexing is not working.
//                  break;  // FIXME: Uncomment this line to reveal huge bug.
                }
              }
              if (k == reIndexedVerticies.length) {
                // We haven't encountered this vertex yet; re-index the vertex
                reIndexedVerticies.push(vertex);
                vertexIndex = mesh.positions.length +
                  (reIndexedVerticies.length - 1);
              }
          }
          // Copy values into the verticies array (for easy access when we
          // build an array for OpenGL later)
          mesh.verticies[vertexIndex] = vertex;
          // Copy the indices so that we will know the order in which to draw
          // the triangles in this surface
          mesh.indices.push(vertexIndex);
        }
        break;
    }
  }

  // Iterate through all verticies, packing them into a format suitable for
  // representation as WebGL vertex attributes.
  //
  // The format for each vertex is
  //
  //    _____ _____ _____ _____ _____ _____ _____ _____
  //   | p_x | p_y | p_z | t_u | t_v | n_x | n_y | n_z |  ...
  //   '-----'-----'-----'-----'-----'-----'-----'-----'
  //         position       texture         normal
  //
  // where p is the position, t is the UV texture coordinate, and n is the
  // surface normal. Verticies are assumed to have the same surface texture
  // position and surface normal among different triangles, which reduces some
  // duplication.
  var vertexAttributes = new Float32Array(mesh.verticies.length * 8);
  for (var i = 0; i < mesh.verticies.length; ++i) {
    var vertex = mesh.verticies[i];
    // FIXME: Clearly this isn't optimal. I have been using Javascript
    // attributes for clarity, but this could be moved into the loop that reads
    // the OBJ file. The lack of memcpy() does not help. Not a huge problem;
    // just increases loading time.
    vertexAttributes[i * 8] = vertex.position[0];
    vertexAttributes[i * 8 + 1] = vertex.position[1];
    vertexAttributes[i * 8 + 2] = vertex.position[2];
    vertexAttributes[i * 8 + 3] = vertex.uv[0];
    vertexAttributes[i * 8 + 4] = vertex.uv[1];
    vertexAttributes[i * 8 + 5] = vertex.normal[0];
    vertexAttributes[i * 8 + 6] = vertex.normal[1];
    vertexAttributes[i * 8 + 7] = vertex.normal[2];
  }

  // TODO: Iterate over every face and put their verticies into an array of
  // indices (an array that can be drawn later with GL_TRIANGLES)
  var vertexIndices = new Int16Array(mesh.indices.length);
  for (var i = 0; i < mesh.indices.length; ++i) {
    // For the time being, we're using a triangle mesh. These are much simpler
    // to export from Blender.
    // TODO: Use triangle strips and triangle fans
    vertexIndices[i] = mesh.indices[i];
  }

  // Uncomment to debug vertex data
  /*
  for (var i = 0; i < vertexAttributes.length; i += 8) {
    var msg = 'i=' + i + ': ';
    for (var j = 0; j < 8; j++) {
      msg += j + ':' + vertexAttributes[i + j] + '  ';
    }
    console.log(msg);
  }
  for (var i = 0; i < vertexIndices.length; i += 3) {
    var msg = 'i=' + i + ': ';
    for (var j = 0; j < 3; j++) {
      msg += j + ':' + vertexIndices[i + j] + '  ';
    }
    console.log(msg);
  }
  */

  // Create a WebGL buffer and upload our vertex attributes to the GPU
  var vertexAttributesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexAttributesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexAttributes, gl.STATIC_DRAW);

  // Create a WebGL buffer and upload our vertex indices to the GPU
  var vertexIndicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vertexIndices, gl.STATIC_DRAW);

  var result = {
    attributesBuffer: vertexAttributesBuffer,
    indicesBuffer: vertexIndicesBuffer,
    numIndices: vertexIndices.length
  };

  return result;
}

function loadTexture(image) {
  var texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  /*
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  */
  // FIXME: Get mipmap working (i.e. make texture dimensions a power of 2)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}


//------------------------------------------------------------
// Prototype for scene objects
// (objects with position and orientation in the scene)
//------------------------------------------------------------
var SceneObject = function(position, orientation) {
  if (typeof position == 'undefined') {
    this.position = vec3(0.0, 0.0, 0.0);
  } else if (!Array.isArray(position) || position.length != 3) {
    throw 'SceneObject(): position must be vec3';
  } else {
    this.position = position;
  }
  if (typeof orientation == 'undefined') {
    this.orientation = quat(0.0, 0.0, 0.0, 1.0);
  }
  else if (!Array.isArray(orientation) || orientation.length != 4) {
    throw 'SceneObject(): orientation must be vec4';
  } else {
    this.orientation = orientation;
  }
}
SceneObject.prototype.setParent = function(object) {
  this.parentObject = object;
};
SceneObject.prototype.getWorldPosition = function(object) {
  if (typeof this.parentObject != 'undefined') {
    return vec3(mult(vec4(this.position),
          translate(this.parentObject.getWorldPosition())));
  }
  return this.position;
};
SceneObject.prototype.getWorldOrientation = function(object) {
  /*
  // FIXME: This is totally untested (and confusing!)
  if (typeof this.parentObject != 'undefined')
    return qmult(this.orientation, this.parentObject.orientation);
    */
  return this.orientation;
};

//------------------------------------------------------------
// Prototype for mesh objects
//------------------------------------------------------------
var MeshObject = function(
    meshAsset, textureAsset, shaderAsset,
    position, orientation, scale) {
  // Iherit from SceneObject
  SceneObject.call(this, position, orientation);

  if (typeof scale == 'undefined') {
    this.scale = 1.0;
  } else {
    this.scale = scale;
  }

  this.mesh = assets[meshAsset];
  this.texture = assets[textureAsset];
  this.shaderProgram = assets[shaderAsset];
};
MeshObject.prototype = Object.create(SceneObject.prototype);
MeshObject.prototype.useShaderProgram = function(gl) {
  gl.useProgram(this.shaderProgram);
}
MeshObject.prototype.prepareVertexBuffers = function(gl) {
  // NOTE: WebGL does not support VBO's, so we must prepare the vertex buffers
  // ourselves every frame
  for (var attribute in this.shaderProgram.attributes) {
    var attributeLocation = this.shaderProgram.attributes[attribute];
    if (attributeLocation >= 0) {  // Ignore unused attributes
      // Enable all of the vertex attributes we are using
      // NOTE: We should disable these vertex attributes later, but WebGL does
      // not actually require us to do this
      gl.enableVertexAttribArray(attributeLocation);
    }
  }
  // Bind our buffers to the WebGL state
  gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.attributesBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indicesBuffer);
  // Configure the vertex attributes for position/uv/normal verticies
  gl.vertexAttribPointer(this.shaderProgram.attributes.vertexPosition,
    3,         // vec3
    gl.FLOAT,  // 32bit floating point
    false,     // Don't normalize values
    4 * 8,     // Stride for eight 32-bit values per-vertex
    4 * 0);    // Position starts at the first value stored
  if (this.shaderProgram.attributes.vertexUV >= 0)
    gl.vertexAttribPointer(this.shaderProgram.attributes.vertexUV,
      2,         // vec2
      gl.FLOAT,  // 32bit floating point
      false,     // Don't normalize values
      4 * 8,     // Stride for eight 32-bit values per-vertex
      4 * 3);    // UV starts at the fourth value stored
  if (this.shaderProgram.attributes.vertexNormal >= 0)
    gl.vertexAttribPointer(this.shaderProgram.attributes.vertexNormal,
      3,         // vec3
      gl.FLOAT,  // 32bit floating point
      false,     // Don't normalize values
      4 * 8,     // Stride for eight 32-bit values per-vertex
      4 * 5);    // Normal starts at the sixth value stored
}
MeshObject.prototype.setMatrixUniforms =
function(gl, modelWorld, worldView, projection) {
  gl.uniformMatrix4fv(this.shaderProgram.uniforms.modelViewMatrix,
      false, flatten(mult(worldView.peek(), modelWorld.peek())));
  gl.uniformMatrix4fv(this.shaderProgram.uniforms.projectionMatrix,
      false, flatten(projection.peek()));
}
MeshObject.prototype.drawElements = function(gl) {
  gl.drawElements(gl.TRIANGLES, this.mesh.numIndices, gl.UNSIGNED_SHORT, 0);
}
MeshObject.prototype.bindTextures = function(gl) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.uniform1i(this.shaderProgram.uniforms.textureSampler, 0);
}
MeshObject.prototype.draw = function(gl, modelWorld, worldView, projection) {
  var initialSize = modelWorld.size();
  // Translate the object into its position
  modelWorld.push(translate(this.position));
  // Rotate the object with respect to the model's origin
  modelWorld.push(quatToMatrix(this.orientation));
  // Scale the object proportionally
  modelWorld.push(scalem(this.scale, this.scale, this.scale));

  // Breaking the draw method up into subroutines facilitates some flexibility
  // in the implementation of objects derived from MeshObject
  this.useShaderProgram(gl);
  this.prepareVertexBuffers(gl);
  this.setMatrixUniforms(gl, modelWorld, worldView, projection);
  this.bindTextures(gl);
  this.drawElements(gl);

  // Draw our children (if we have them) relative to ourselves
  if (typeof this.drawChildren != 'undefined')
    this.drawChildren(gl, modelWorld, worldView, projection);

  // Return the model-world transformation stack to its original state
  modelWorld.unwind(initialSize);
}

//------------------------------------------------------------
// Prototype for billiard ball objects
//------------------------------------------------------------
var BilliardBall = function(number, initialPosition) {
  this.number = number;
  this.initialPosition = initialPosition;

  // All balls have white on the outside
  this.outsideColor = BALL_WHITE;

  // Determine the ball texture, color, and shader to use
  var shaderProgram;
  if (ENABLE_SDF) {
    this.nearTexture = 'common/billiard_ball_' + number + '_sdf_near.png';
    this.farTexture = 'common/billiard_ball_' + number + '_sdf_far.png';
    shaderProgram = 'billiardball-sdf-smooth';
    switch (number) {
      case 0:
        // White
        this.insideColor = BALL_WHITE;
        break;
      case 1:
        // Yellow solid
        this.insideColor = BALL_YELLOW;
        break;
      case 2:
        // Blue solid
        this.insideColor = BALL_BLUE;
        break;
      case 3:
        // Red solid
        this.insideColor = BALL_RED;
        break;
      case 4:
        // Purple solid
        this.insideColor = BALL_PURPLE;
        break;
      case 5:
        // Orange solid
        this.insideColor = BALL_ORANGE;
        break;
      case 6:
        // Green solid
        this.insideColor = BALL_GREEN;
        break;
      case 7:
        // Brown or maroon solid
        this.insideColor = BALL_MAROON;
        break;
      case 8:
        // Black solid
        this.insideColor = BALL_BLACK;
        break;
      case 9:
        // Yellow stripe
        this.insideColor = BALL_YELLOW;
        break;
      case 10:
        // Blue stripe
        this.insideColor = BALL_BLUE;
        break;
      case 11:
        // Red stripe
        this.insideColor = BALL_RED;
        break;
      case 12:
        // Purple stripe
        this.insideColor = BALL_PURPLE;
        break;
      case 13:
        // Orange stripe
        this.insideColor = BALL_ORANGE;
        break;
      case 14:
        // Green stripe
        this.insideColor = BALL_GREEN;
        break;
      case 15:
        // Brown or maroon stripe
        this.insideColor = BALL_MAROON;
        break;
    }

    // Iherit from mesh object
    MeshObject.call(this,
        'common/unit_billiard_ball.obj', null, shaderProgram);
  } else {  // Non-sdf mode
    textureFile = 'common/billiard_ball_' + number + '.png';
    shaderProgram = 'billiardball';

    // Iherit from mesh object
    MeshObject.call(this,
        'common/unit_billiard_ball.obj', textureFile, shaderProgram);
  }


  // Initial physical properties
  this.velocity = vec3(0.0, 0.0, 0.0);
  this.scale = BALL_RADIUS;  // The mesh has unit 1m radius

  this.state = 'idle';
};
BilliardBall.prototype = Object.create(MeshObject.prototype);
BilliardBall.prototype.constructor = BilliardBall;
BilliardBall.prototype.startDrop = function(position) {
  if (typeof position == 'undefined') {
    // Place the ball in its rack position on the table
    this.position = vec3(this.initialPosition[0],
        this.initialPosition[1], BALL_RADIUS);
  } else {
    this.position = vec3(position[0], position[1], BALL_RADIUS);
  }
  // Notify our state machine
  this.state = 'startDrop';
}
BilliardBall.prototype.putInPlay = function(position) {
  if (typeof position == 'undefined') {
    // Place the ball in its rack position on the table
    this.position = vec3(this.initialPosition[0],
        this.initialPosition[1], BALL_RADIUS);
  } else {
    this.position = vec3(position[0], position[1], BALL_RADIUS);
  }
  this.velocity = vec3(0.0, 0.0, 0.0);
  // Remove all of the properties related to pocketed status
  this.pocket = undefined;
  this.pocketName = undefined;
  this.pocketTime = undefined;
  this.firstHitTime = undefined;
  // Notify our state machine
  this.state = 'startInPlay';
}
BilliardBall.prototype.isInPlay = function() {
  if (this.state == 'inPlay' ||
      this.state == 'startInPlay') {
    return true;
  }
}
BilliardBall.prototype.setPocket = function(pocketName) {
  this.pocketName = pocketName;
  this.pocket = pocketFromName(pocketName);
  this.state = 'startPocketed';
}
BilliardBall.prototype.setIdleDrawing = function() {
  // The HUD in particular needs to draw the ball, but it does not need the
  // ball's state machine to do anything
  this.state = 'idleDrawing';
}
BilliardBall.prototype.saveState = function() {
  var state = {};
  state.state = this.state;
  state.timeElapsedInPlay = this.timeElapsedInPlay;
  state.pocketName = this.pocketName;
  state.pocket = this.pocket;
  state.pocketTime = this.pocketTime;
  state.firstHitTime = this.firstHitTime;
  state.position = this.position.slice();
  state.orientation = this.orientation.slice();
  state.velocity = this.velocity.slice();
  return state;
}
BilliardBall.prototype.restoreState = function(state) {
  this.state = state.state;
  this.timeElapsedInPlay = state.timeElapsedInPlay;
  this.pocketName = state.pocketName;
  this.pocket = state.pocket;
  this.pocketTime = state.pocketTime;
  this.firstHitTime = state.firstHitTime;
  this.position = state.position.slice();
  this.orientation = state.orientation.slice();
  this.velocity = state.velocity.slice();
}
BilliardBall.prototype.tick = function(dt) {
  switch (this.state) {
    case 'idle':
      break;
    case 'idleDrawing':
      break;
    case 'startDrop':
    case 'drop':
      // This state allows us to be rendered without actually doing any physics
      // or be considered in play
      this.state = 'drop';
      break;
    case 'startInPlay':
      this.timeElapsedInPlay = -dt;  // -dt + dt = 0.0
      this.state = 'inPlay';
    case 'inPlay':
      this.timeElapsedInPlay += dt;
      this.tickPhysics(dt);
      break;
    case 'startPocketed':
      this.timeElapsedSincePocketed = -dt;  // -dt + dt = 0.0
      this.state = 'fallingInPocket';
    case 'fallingInPocket':
      this.timeElapsedSincePocketed += dt;
      this.tickPhysics(dt);  // Still falling
      // Interpolate the fade alpha from the time pocketed to the fade out time
      while (this.timeElapsedSincePocketed < BALL_TIME_TO_FADE_OUT) {
        break;
      }
      this.velocity = vec3(0.0, 0.0, 0.0);
      this.state = 'pocketed';
    case 'pocketed':
      break;
    default:
      throw "Unknown billiard ball state '" + this.state + "'!";
  }
}
BilliardBall.prototype.tickPhysics = function(dt) {
  switch (this.state) {
    case 'inPlay':
      // Physics for balls on the table
      // Make sure the ball does not leave the billiard table surface
      this.velocity[2] = 0.0;
      if (length(this.velocity) < BALL_VELOCITY_EPSILON) {
        this.velocity = vec3(0.0, 0.0, 0.0);
      } else {
        // Account for rolling resistance, i.e. friction
        this.velocity = add(this.velocity,
            scale(-dt * BALL_CLOTH_ROLLING_RESISTANCE_ACCELERATION,
            normalize(this.velocity)));
        // Compute the displacement due to velocity
        var displacement = scale(dt, this.velocity);
        // NOTE: This check is needed for the rotation code to work
        if (length(displacement) > 0.0) {
          // Rotate the ball
          // NOTE: The rotation axis for the ball is perpendicular to the
          // velocity vector and the table normal (+Z axis). The angular
          // displacement Theta is related to the linear displacement of the
          // ball r and the radius of the ball R by the equation Theta=r/R.
          // Quaternions can be easily calculated from a rotational axis and an
          // angle. In short: find the rotation axis and angular displacement
          // to make a quaternion.
          // TODO: I can probably avoid computing the length twice here
          var rotationAxis =
            normalize(cross(vec3(0.0, 0.0, 1.0), displacement));
          var angularDisplacement = length(displacement) / BALL_RADIUS;
          this.orientation =
            qmult(quat(rotationAxis, angularDisplacement), this.orientation);
          // Displace the ball
          this.position = add(this.position, displacement);
        }
      }
      break;
    case 'fallingInPocket':
      // Nudge ourselves towards the pocket center (if low velocity)
      var speed = length(this.velocity);
      if ((speed > 0) && (speed < POCKET_EDGE_MIN_FUDGE_VELOCITY)) {
        this.velocity =
          add(this.velocity, vec3(scale(POCKET_EDGE_FUDGE_ACCELERATION * dt,
                  normalize(subtract(this.pocket, vec2(this.position))))));
      }
      // Apply acceleration due to gravity
      this.velocity =
        add(this.velocity, vec3(0.0, 0.0, -GRAVITY_ACCELERATION * dt));
      if (length(
            subtract(vec2(this.position[0], this.position[1]), this.pocket)) >
            POCKET_RADIUS-BALL_RADIUS) {
        // Prevent the ball from leaving the pocket
        this.velocity =
          scale(POCKET_DAMPER, reflection(this.velocity,
                normalize(subtract(vec3(this.pocket), this.position))))
      }
      // Stop the ball eventually
      if (length(vec2(this.velocity)) < BALL_VELOCITY_EPSILON) {
        this.velocity[0] = 0.0;
        this.velocity[1] = 0.0;
      }
      // NOTE: The rotation code appears above as well
      // Compute the displacement due to velocity
      var displacement = scale(dt, this.velocity);
      // NOTE: This check is needed for the rotation code to work
      if (length(displacement) > 0.0) {
        // Rotate the ball
        // NOTE: The rotation axis for the ball is perpendicular to the
        // velocity vector and the table normal (+Z axis). The angular
        // displacement Theta is related to the linear displacement of the ball
        // r and the radius of the ball R by the equation Theta=r/R.
        // Quaternions can be easily calculated from a rotational axis and an
        // angle. In short: find the rotation axis and angular displacement to
        // make a quaternion.
        // TODO: I can probably avoid computing the length twice here
        var rotationAxis = normalize(cross(vec3(0.0, 0.0, 1.0), displacement));
        var angularDisplacement = length(displacement) / BALL_RADIUS;
        this.orientation =
          qmult(quat(rotationAxis, angularDisplacement), this.orientation);
        // Displace the ball
        this.position = add(this.position, displacement);
        // Stop the ball at the bottom of the pocket
        this.position[2] =
          Math.max(this.position[2], POCKET_BOTTOM + BALL_RADIUS);
        if (this.position[2] <= POCKET_BOTTOM + BALL_RADIUS) {
          this.velocity[2] = 0.0;
        }
      }
      break;
    default:
      throw 'Unknown billiard ball physics state: ' + this.state;
  }
}
BilliardBall.prototype.project = function(normal) {
  // This routine is used in the Separating Axis Theorem algorithm to detect
  // collisions between ball and cushion

  // Rotate our center point such that it is in the space where the given
  // normal is parallel to the X-axis
  var angle = Math.atan2(normal[1], normal[0]);
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  var rotated = mult(vec2(this.position), mat2( c, s,      // Rotate
                                               -s, c));

  // NOTE: We don't actually need to project here. We do so anyway for clarity.
  var projected = mult(vec2(this.position), mult(mat2(1.0, 0.0,   // Project
                                                      0.0, 0.0),
                                                 mat2( c, s,      // Rotate
                                                      -s, c)));

  // Return the projection our circle, leveraging the fact that the edge of our
  // circle is at most one ball radius away from the center point.
  return vec2(projected[0] - BALL_RADIUS, projected[0] + BALL_RADIUS);
}
BilliardBall.prototype.bindTextures = function(gl) {
  if (ENABLE_SDF) {
    // We need two textures for SDF; one for shots close to the balls, and one
    // for shots far away. For far away shots, the frequency of details in the
    // ball numbers is very high. For these shots we need to set the spread of
    // distance values very high, lest our sharp number edges be interpolated
    // into nothing. On the flip side, setting the spread very high increases
    // banding in the alpha channel (just look at the far sdf textures) which
    // severely reduces the accuracy of edges on close shots. This is due to
    // the limited precision of the 8-bit alpha channel.
    //
    // So the pratical solution to have the best of both worlds is to include
    // both textures, one with a high spread (the far texture), and one with a
    // low spread (the near texture). We need to bind these textures ourselves,
    // since the generic MeshObject prototype won't do that for us.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, assets[this.nearTexture]);
    gl.uniform1i(this.shaderProgram.uniforms.nearTexture, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, assets[this.farTexture]);
    gl.uniform1i(this.shaderProgram.uniforms.farTexture, 1);

    // Pass a mask for the ball numbers so that we can draw them black
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, assets['common/number_mask.png']);
    gl.uniform1i(this.shaderProgram.uniforms.numberMask, 2);
  } else {
    // Use the default behavior when we're not using SDF
    MeshObject.prototype.bindTextures.call(this, gl);
  }
}
BilliardBall.prototype.draw = function(gl, modelWorld, worldView, projection) {
  // Don't bother drawing the ball while it's not being used
  if (this.state == 'idle' ||
      this.state == 'pocketed') {
    return;
  }

  if (ENABLE_SDF) {
    // We need to use our shader program in order to set its state
    this.useShaderProgram(gl);

    // Pass inside and outside colors to the shader
    gl.uniform3f(this.shaderProgram.uniforms.insideColor,
        this.insideColor[0], this.insideColor[1], this.insideColor[2]);
    gl.uniform3f(this.shaderProgram.uniforms.outsideColor,
        this.outsideColor[0], this.outsideColor[1], this.outsideColor[2]);

  }

  MeshObject.prototype.draw.call(this, gl, modelWorld, worldView, projection);
}
BilliardBall.prototype.forceNearTexture = function() {
  if (ENABLE_SDF) {
    // This is a small hack to get nice balls rendering even with an
    // orthographic projection.
    this.farTexture = this.nearTexture;
  }
}

//------------------------------------------------------------
// Prototype for billiard tables
//------------------------------------------------------------
var BilliardTable = function(gameMode, position, orientation) {
  // Iherit from SceneObject
  MeshObject.call(this,
      'common/billiard_table.obj', 'common/billiard_table.png',
      'billiardtable', position, orientation);

  this.gameMode = gameMode;
  this.gameState = 'start';
  // Set game parameters based on the selected game mode
  switch (gameMode) {
    case EIGHT_BALL_MODE:
      // Make objects for each ball
      this.balls = [];
      // Place the cue ball somewhere in "the kitchen"
      this.balls[0] = new BilliardBall(0, vec3((-3 / 8) * TABLE_LENGTH, 0.0));
      // Make a set of unracked balls
      var unrackedBalls = new Set();
      for (var i = 1; i < EIGHT_BALL_NUM_BALLS; ++i) {
        unrackedBalls.add(i);
      }
      // Place the One ball at the front
      this.balls[1] =
        new BilliardBall(1, vec3(TRIANGLE_RACK[0][0], TRIANGLE_RACK[0][1]));
      unrackedBalls.delete(1);
      // Place the Eight ball in the middle
      this.balls[8] =
        new BilliardBall(8, vec3(TRIANGLE_RACK[4][0], TRIANGLE_RACK[4][1]));
      unrackedBalls.delete(8);
      // Place the rest of the balls at random, being careful to place the
      // first solid and the first stripe we encounter in each of the corners
      var nextPosition = 1;
      var nextCornerPosition = 10;
      var placedSolid = false;
      var placedStripe = false;
      while (unrackedBalls.size > 0) {
        var ballNumber = takeRandomFromSet(unrackedBalls);
        if ((isStriped(ballNumber) && !placedStripe) ||
            (!isStriped(ballNumber) && !placedSolid)) {
          // Place one of the corner balls
          if (nextCornerPosition == 10) {
            this.balls[ballNumber] =
              new BilliardBall(ballNumber, vec3(TRIANGLE_RACK[10][0],
                    TRIANGLE_RACK[10][1]));
            nextCornerPosition = 14;
          } else if (nextCornerPosition == 14) {
            this.balls[ballNumber] =
              new BilliardBall(ballNumber, vec3(TRIANGLE_RACK[14][0],
                    TRIANGLE_RACK[14][1]));
            nextCornerPosition = undefined;
          }
          if (isStriped(ballNumber)) {
            placedStripe = true;
          } else {
            placedSolid = true;
          }
          continue;
        }
        // Place one of the balls not in the corner
        this.balls[ballNumber] =
          new BilliardBall(ballNumber, vec3(TRIANGLE_RACK[nextPosition][0],
                TRIANGLE_RACK[nextPosition][1]));
        // Carefully avoid the Eight ball position and the corner positions
        // when incrementing the placement position
        if (nextPosition == 3) {
          nextPosition = 5;  // Avoid the eight ball
        } else if (nextPosition == 9) {
          nextPosition = 11;  // Avoid the left corner
        } else if (nextPosition == 13) {
          nextPosition = 15;  // Avoid the right corner (should never happen)
        } else {
          nextPosition += 1;
        }
      }
      break;
    case NINE_BALL_MODE:
      // Make objects for each ball
      this.balls = [];
      // Place the cue ball somewhere in "the kitchen"
      this.balls[0] = new BilliardBall(0, vec3((-3 / 8) * TABLE_LENGTH, 0.0));
      // Make a set of unracked balls
      var unrackedBalls = new Set();
      for (var i = 1; i < NINE_BALL_NUM_BALLS; ++i) {
        unrackedBalls.add(i);
      }
      // Place the One ball at the front
      this.balls[1] =
        new BilliardBall(1, vec3(DIAMOND_RACK[0][0], DIAMOND_RACK[0][1]));
      unrackedBalls.delete(1);
      // Place the Nine ball in the middle
      this.balls[9] =
        new BilliardBall(9, vec3(DIAMOND_RACK[4][0], DIAMOND_RACK[4][1]));
      unrackedBalls.delete(9);
      // Place the rest of the balls at random, being careful to avoid placing
      // balls where the Nine ball is
      var nextPosition = 1;
      while (unrackedBalls.size > 0) {
        var ballNumber = takeRandomFromSet(unrackedBalls);
        this.balls[ballNumber] =
          new BilliardBall(ballNumber, vec3(DIAMOND_RACK[nextPosition][0],
                DIAMOND_RACK[nextPosition][1]));
        // Carefully avoid the Nine ball position and the corner positions
        if (nextPosition == 3) {
          nextPosition = 5;  // Avoid the nine ball
        } else {
          nextPosition += 1;
        }
      }
      break;
    case STRAIGHT_POOL_MODE:
      // TODO
      break;
    default:
      window.alert('Unknown game mode!');
  }
  // All balls positions are relative to the surface of the table
  for (var i = 0; i < this.balls.length; ++i) {
    this.balls[i].setParent(this);
  }

  // We need a cue stick to play
  this.cueStick = new CueStick();
  this.cueStick.setParent(this);

  // Structures for broad-phase collision detection
  this.xBalls = this.balls.slice();
  this.yBalls = this.balls.slice();

  // Collection of camera views for quick access to different camera angles
  this.cameras = {
    mainPerspective: new Camera(
            { type: 'perspective',
              fov: MAIN_CAMERA_FOV,
              near: MAIN_CAMERA_NEAR,
              far: MAIN_CAMERA_FAR },
            MAIN_CAMERA_POSITION,
            MAIN_CAMERA_ORIENTATION),
    mainOrthographic: new Camera(
            { type: 'orthographic',
              left: MAIN_ORTHO_CAMERA_LEFT,
              right: MAIN_ORTHO_CAMERA_RIGHT,
              bottom: MAIN_ORTHO_CAMERA_BOTTOM,
              top: MAIN_ORTHO_CAMERA_TOP,
              near: MAIN_ORTHO_CAMERA_NEAR,
              far: MAIN_ORTHO_CAMERA_FAR },
            MAIN_ORTHO_CAMERA_POSITION,
            MAIN_ORTHO_CAMERA_ORIENTATION),
    northPocket: new Camera(
            { type: 'perspective',
              fov: NORTH_POCKET_CAMERA_FOV,
              near: NORTH_POCKET_CAMERA_NEAR,
              far: NORTH_POCKET_CAMERA_FAR },
            NORTH_POCKET_CAMERA_POSITION,
            NORTH_POCKET_CAMERA_ORIENTATION),
    southPocket: new Camera(
            { type: 'perspective',
              fov: SOUTH_POCKET_CAMERA_FOV,
              near: SOUTH_POCKET_CAMERA_NEAR,
              far: SOUTH_POCKET_CAMERA_FAR },
            SOUTH_POCKET_CAMERA_POSITION,
            SOUTH_POCKET_CAMERA_ORIENTATION),
    southeastPocket: new Camera(
            { type: 'perspective',
              fov: SOUTHEAST_POCKET_CAMERA_FOV,
              near: SOUTHEAST_POCKET_CAMERA_NEAR,
              far: SOUTHEAST_POCKET_CAMERA_FAR },
            SOUTHEAST_POCKET_CAMERA_POSITION,
            SOUTHEAST_POCKET_CAMERA_ORIENTATION),
    southwestPocket: new Camera(
            { type: 'perspective',
              fov: SOUTHWEST_POCKET_CAMERA_FOV,
              near: SOUTHWEST_POCKET_CAMERA_NEAR,
              far: SOUTHWEST_POCKET_CAMERA_FAR },
            SOUTHWEST_POCKET_CAMERA_POSITION,
            SOUTHWEST_POCKET_CAMERA_ORIENTATION),
    northeastPocket: new Camera(
            { type: 'perspective',
              fov: NORTHEAST_POCKET_CAMERA_FOV,
              near: NORTHEAST_POCKET_CAMERA_NEAR,
              far: NORTHEAST_POCKET_CAMERA_FAR },
            NORTHEAST_POCKET_CAMERA_POSITION,
            NORTHEAST_POCKET_CAMERA_ORIENTATION),
    northwestPocket: new Camera(
            { type: 'perspective',
              fov: NORTHWEST_POCKET_CAMERA_FOV,
              near: NORTHWEST_POCKET_CAMERA_NEAR,
              far: NORTHWEST_POCKET_CAMERA_FAR },
            NORTHWEST_POCKET_CAMERA_POSITION,
            NORTHWEST_POCKET_CAMERA_ORIENTATION),
    chase: new Camera(
            { type: 'perspective',
              fov: CHASE_CAMERA_FOV,
              near: CHASE_CAMERA_NEAR,
              far: CHASE_CAMERA_FAR },
            vec3(0.0, 0.0, 0.0, 0.0),
            vec4(0.0, 0.0, 0.0, 1.0))
  }
  this.cameras.mainPerspective.interactiveRotate(
      this, vec3(0.0, 0.0, 1.0),
      MAIN_CAMERA_ANGULAR_ACCELERATION,
      MAIN_CAMERA_ANGULAR_ACCELERATION * 2,  // friction
      MAIN_CAMERA_MAX_ANGULAR_VELOCITY,
      MAIN_CAMERA_FUDGE_VECTOR);
  this.currentCamera = this.cameras.mainOrthographic;
  this.currentCameraAngle = 'orthographic';
  this.cameraState = 'interaction';  // XXX: Change this to "pre-game" or "idle"

  // Register events
  var billiardTable = this;
  canvas.onmousedown = function(event) {
    billiardTable.mouseDownEvent(event);
  }
  canvas.onmousemove = function(event) {
    billiardTable.mouseMoveEvent(event);
  }
  canvas.onmouseleave = function(event) {
    billiardTable.mouseLeaveEvent(event);
  }
  canvas.onmouseup = function(event) {
    billiardTable.mouseUpEvent(event);
  }
  // NOTE: The HTML5 canvas doesn't get keyboard focus very easily
  this.keysDepressed = {};
  window.onkeydown = function(event) {
    billiardTable.keyDownEvent(event);
  }
  window.onkeyup = function(event) {
    billiardTable.keyUpEvent(event);
  }

  // Initialize the billiard table state machines
  this.state = 'start';
  this.simulationState = 'stopped';

  // Draw some lines for debugging cushion collision
  for (var i = 0; i < CUSHIONS.length; ++i) {
    CUSHIONS[i].drawDebug();
  }
}
BilliardTable.prototype = Object.create(MeshObject.prototype);
BilliardTable.prototype.setCurrentCamera = function(camera) {
  this.currentCamera = camera;
}
BilliardTable.prototype.saveState = function() {
  // This method essentially performs a deep-ish copy of the BilliardTable
  // object, especially the simulation state. Javascript doesn't really provide
  // a deep copy idiom for objects, so we do it manually. Combined with
  // DETERMINISTIC_DT, this method implements replay functionality.
  var state = {};

  // Save the state (initial positions, velocity, state machine status, etc.)
  // of all of the balls)
  state.balls = [];
  for (var i = 0; i < this.balls.length; ++i) {
    state.balls.push(this.balls[i].saveState());
  }

  // Save the list of pocketed balls
  state.pocketedBalls = this.pocketedBalls.slice();
  state.recentlyPocketedBalls = this.recentlyPocketedBalls.slice();

  // Save the elapsed simulation time
  state.simulationElapsedTime = this.simulationElapsedTime;

  return state;
}
BilliardTable.prototype.restoreState = function(state) {
  // This method perfoms the reverse operation of saveState

  if (typeof state == 'undefined') {
    return;  // FIXME: This happens sometimes.
  }

  // Restore the state of each of our balls
  this.xBalls = [];
  this.yBalls = [];
  for (var i = 0; i < state.balls.length; ++i) {
    this.balls[i].restoreState(state.balls[i]);
    if (this.balls[i].isInPlay()) {
      // Restore the state of the broad-phase collision structures
      this.xBalls.push(this.balls[i]);
      this.yBalls.push(this.balls[i]);
    }
  }

  // restore the list of pocketed balls
  this.pocketedBalls = state.pocketedBalls.slice();
  this.recentlyPocketedBalls = state.recentlyPocketedBalls.slice();

  // Save the elapsed simulation time
  this.simulationElapsedTime = state.simulationElapsedTime;
}
BilliardTable.prototype.drawChildren =
function(gl, modelWorld, worldView, projection) {
  var initialSize = modelWorld.size();

  // NOTE: Pocketed balls stop drawing themselves once they've faded out
  for (var i = 1; i < this.balls.length; ++i) {
    // Draw each ball
    this.balls[i].draw(gl, modelWorld, worldView, projection);
  }

  this.cueStick.draw(gl, modelWorld, worldView, projection);

  // The cue ball is the only ball that obeys the cue stick's depth; draw it
  // last
  this.balls[0].draw(gl, modelWorld, worldView, projection);

  // Return the model-world transformation stack to its original state
  modelWorld.unwind(initialSize);
}
BilliardTable.prototype.tick = function(dt) {
  // Advance the state of all of the balls
  for (var i = 0; i < this.balls.length; ++i) {
    this.balls[i].tick(dt);
  }

  switch (this.state) {
    case 'start':
      this.replays = [];
      // Start with player one
      this.gameLogicCurrentPlayer(1);
    case 'placeBalls':
      this.setCameraInteractive();
      this.xBalls = [];
      this.yBalls = [];
      for (var i = 1; i < this.balls.length; ++i) {
        this.balls[i].putInPlay();
        this.xBalls.push(this.balls[i]);
        this.yBalls.push(this.balls[i]);
      }
      this.pocketedBalls = [];
      this.recentlyPocketedBalls = [];
      // Inform the game logic state machine that we are starting a rack
      this.gameLogicStartRack();
    case 'startInitialDropCueBall':
      // Place the cue ball in the middle of the 'kitchen'
      this.balls[0].putInPlay(vec3((-3 / 8) * TABLE_LENGTH, BALL_RADIUS));
    case 'initialDropCueBall':
      this.state = 'initialDropCueBall';
      // Check for cursor position and, if it is inside the 'kitchen'
      // move the cue ball to that position
      if (typeof this.cursorPos != 'undefined') {
        var tablePos =
          this.tableCoordinatesFromCursor(
              this.cursorPos[0], this.cursorPos[1]);
        this.dropCueBall(this.balls[0], tablePos,
            TABLE_WIDTH / 2 - BALL_RADIUS, -TABLE_WIDTH / 2 + BALL_RADIUS,
            -TABLE_LENGTH / 4 - BALL_RADIUS, -TABLE_LENGTH / 2 + BALL_RADIUS);
      }
      if (typeof this.mouseStart == 'undefined') {
        break;  // No clicks yet
      } else if (!this.checkDropCueBall(this.balls[0], this.mouseStart,
            TABLE_WIDTH / 2 - BALL_RADIUS, -TABLE_WIDTH / 2 + BALL_RADIUS,
            -TABLE_LENGTH / 4 - BALL_RADIUS, -TABLE_LENGTH / 2 + BALL_RADIUS)) {
        // The user tried to place the cue ball in a pocket or on top of
        // another ball. That's no good.
        break;
      }
      this.balls[0].putInPlay(this.mouseStart);
      // Put the cue ball in our broad-phase collision list
      this.xBalls.push(this.balls[0]);
      this.yBalls.push(this.balls[0]);
      this.mouseStart = undefined;  // Consume the click input
    case 'postInitialDropCueBall':
    case 'startDropCueBall':
      this.mouseStart = undefined;  // Consume the click input
    case 'dropCueBall':
      if (this.state == 'dropCueBall' ||
          this.state == 'startDropCueBall') {
        this.state = 'dropCueBall';
        // Have the user drop the cue ball anywhere
        if (typeof this.cursorPos != 'undefined') {
          var tablePos =
            this.tableCoordinatesFromCursor(
                this.cursorPos[0], this.cursorPos[1]);
          this.dropCueBall(this.balls[0], tablePos,
              TABLE_WIDTH / 2 - BALL_RADIUS, -TABLE_WIDTH / 2 + BALL_RADIUS,
              TABLE_LENGTH / 2 - BALL_RADIUS, -TABLE_LENGTH / 2 + BALL_RADIUS);
        }
        if (typeof this.mouseStart == 'undefined') {
          break;  // No clicks yet
        } else if (!this.checkDropCueBall(this.balls[0], this.mouseStart,
              TABLE_WIDTH / 2 - BALL_RADIUS, -TABLE_WIDTH / 2 + BALL_RADIUS,
              TABLE_LENGTH / 2 - BALL_RADIUS, -TABLE_LENGTH / 2 + BALL_RADIUS)) {
          // The user tried to place the cue ball in a pocket or on top of
          // another ball. That's no good.
          break;
        } else {
          // Put the cue ball in play where the user wanted it
          this.balls[0].putInPlay(this.mouseStart);
          this.mouseStart = undefined;  // Consume the click input
          // Put the cue ball in our broad-phase collision list
          this.xBalls.push(this.balls[0]);
          this.yBalls.push(this.balls[0]);
        }
      }
    case 'startSetupShot':
      this.cueStick.setCueBallPosition(this.balls[0].position);
      this.cueStick.startSetupShot();
    case 'setupShot':
      this.state = 'setupShot';
      if (typeof this.cursorPos != 'undefined') {
        var tablePos =
          this.tableCoordinatesFromCursor(
              this.cursorPos[0], this.cursorPos[1]);
        this.cueStick.setCursorPosition(tablePos);
      }
      if (typeof this.mouseStart == 'undefined') {
        break;  // No clicks yet
      }
      // The user clicked; release the cue stick
      this.cueStick.release();
      // No need to show the HUD here
      hud.idle();
    case 'cueStickRelease':
      this.state = 'cueStickRelease';
      // The user has released the cue stick and now the cue stick will animate
      // to the point where it strikes the cue ball.
      // Wait until the cue stick strikes the cue ball.
      if (this.cueStick.releasedTimeElapsed < CUE_STICK_TIME_TO_COLLISION) {
        break;
      }
    case 'cueStickCollision':
      this.balls[0].velocity = this.cueStick.collisionVelocity;
    case 'preSimulation':
      // Reset all of the ball first hit times
      for (var i = 0; i < this.balls.length; ++i) {
        this.balls[i].firstHitTime = undefined;
      }
      // Start simulating the physics and animating the balls
      this.startSimulation();
      // Save the initial simulation state for our replays
      this.initialSimulationState = this.saveState();
    case 'simulation':
      this.state = 'simulation';
      // Wait for all of the balls to settle down
      var done = true;
      for (var i = 0; i < this.balls.length; ++i) {
        if (length(this.balls[i].velocity) > 0.0) {
          done = false;
          break;
        }
      }
      if (!this.cueStick.isIdle()) {
        // Synchronize the billiard table state machine and the cue stick state
        // machine
        done = false;
      }
      if (!done) {
        break;  // Keep waiting
      }
    case 'postSimulation':
      this.state = 'postSimulation';
      // Remember the present state while playing replays
      this.nextTurn = this.saveState();
      // Construct a replay queue by observing which balls were pocketed and
      // where
      this.replaySet = new Map();
      for (var i = 0; i < this.recentlyPocketedBalls.length; ++i) {
        var ball = this.balls[this.recentlyPocketedBalls[i]];
        var pocketName = ball.pocketName;
        if (this.replaySet.has(pocketName)) {
          // At least one other ball has been pocketed in the same pocket; we
          // must reconcile their pocket times to determine which ball we
          // should follow on camera
          this.replaySet.get(pocketName).balls.push({ number: ball.number,
              pocketTime: ball.pocketTime });
          if (ball.pocketTime < this.replaySet.get(pocketName).pocketTime) {
            // This ball was pocketed sooner; it's a safe bet that we can at
            // least catch all of the balls on camera by following this ball
            // to the pocket first
            this.replaySet.get(pocketName).pocketTime = ball.pocketTime;
            this.replaySet.get(pocketName).timeOfInterest =
              ball.firstHitTime - REPLAY_TIME_BEFORE_HIT;
            this.replaySet.get(pocketName).ballOfInterest = ball.number;
          }
        } else {
          // Add pockets that have balls in them to the replay queue, along
          // with the pocketed balls, their pocket times, and their first hit
          // time
          this.replaySet.set(pocketName, {
              pocket: ball.pocketName,
              pocketTime: ball.pocketTime,
              timeOfInterest: ball.firstHitTime - REPLAY_TIME_BEFORE_HIT,
              ballOfInterest: ball.number,
              balls: [ { number: ball.number, pocketTime: ball.pocketTime } ]
          });
        }
      }
      // Gather the times of interest and pocket times and sort them
      this.replayQueue = [];
      billiardTable = this;
      this.replaySet.forEach(function(item) {
        billiardTable.replayQueue.push(item);
        // Sort the balls in each replay by pocket time so that the camera can
        // follow each of the balls into the pocket in turn
        item.balls.sort(function(a, b) {
            return a.pocketTime - b.pocketTime;
        });
        console.log('Following ball ' + item.ballOfInterest + ' to pocket ' +
            item.pocket + ' starting at time ' + item.timeOfInterest + '.');
      });
      // Sort the replays by time of interest, so that the action is at least
      // somewhat chronological
      this.replayQueue.sort(function(a, b) {
        return a.timeOfInterest - b.timeOfInterest;
      });
      this.simulationEndTime = this.simulationElapsedTime;
    case 'startReplay':
      // Show the replay status on the HUD
      hud.replay();
      // Tell the cameras to watch the replay action
      this.setCameraInitialReplay();
      // Play replays (if we have any pocketed balls)
      // We start with the replay from the beginning; now that we know the
      // times of interest (pocket times, hit times, etc.), we can save more
      // replay states by running through the entire simulation
      this.restoreState(this.initialSimulationState);
      // Begin the simulation in replay mode
      this.startReplay();
      // Remember which replay state we need to save next
      this.replayQueueIndex = 0;
    case 'initialReplay':
      this.state = 'initialReplay';
      // TODO: We need to animate the cue stick before starting the simulation
      // Check for replay times of interest and save the state at those times
      var done;
      do {
        done = true;
        if ((this.replayQueueIndex < this.replayQueue.length) &&
            (this.simulationElapsedTime >=
             this.replayQueue[this.replayQueueIndex].timeOfInterest)) {
          this.replayQueue[this.replayQueueIndex++].state = this.saveState();
          done = false;
        }
      } while (!done);
      if (this.keysDepressed.spacebar) {
        // Consume the input
        this.keysDepressed.spacebar = false;
        if (this.replayQueueIndex < this.replayQueue.length) {
          // The player is impatient; skip all of the replays
          this.state = 'postReplay';
          return;
        } else {
          // Skip the boring initial replay and go to the pocket replays
        }
      } else if (this.simulationElapsedTime > this.simulationEndTime) {
        // Stop the initial replay some time after the last ball has been
        // pocketed
        // TODO: Stop the initial replay after all balls have been pocketed AND
        // the balls have all slowed below a certain speed
      } else {
        break;
      }
      this.replayQueueIndex = 0;
    case 'setupReplay':
      if (this.replayQueueIndex < this.replayQueue.length) {
        // Load the replay state
        this.restoreState(this.replayQueue[this.replayQueueIndex].state);
        // Set the camera to follow the ball(s) of interest for this pocket
        this.setCameraPocketReplay(
            this.replayQueue[this.replayQueueIndex].pocket,
            this.replayQueue[this.replayQueueIndex].balls);
      }
      this.state = 'replay';
    case 'replay':
      if (this.keysDepressed.spacebar) {
        // Spacebar skips the replays
        this.state = 'postReplay';
        // Consume the input
        this.keysDepressed.spacebar = false;
        return;
      }
      if (this.replayQueueIndex < this.replayQueue.length) {
        // Replay each pocket from the pocket cams
        // Wait until all the balls we are interested in have been pocketed
        var done = true;
        for (var i = 0;
            i < this.replayQueue[this.replayQueueIndex].balls.length; ++i) {
          if (this.recentlyPocketedBalls.indexOf(
                this.replayQueue[this.replayQueueIndex].balls[i].number) ==
                  -1) {
            done = false;
            break;
          }
        }
        if (!done) {
          // Keep waiting for our balls to be pocketed
          break;
        } else {
          // TODO: Wait a short time after the last ball is pocketed
          // TODO: Check if we have more replays in the queue
          if (++this.replayQueueIndex < this.replayQueue.length) {
            // Load the next replay
            this.state = 'setupReplay';
            break;
          }
        }
      }
    case 'postReplay':
      // Restore the state from before playing the replays (and pray it works)
      this.restoreState(this.nextTurn);
      // Adavnce the game logic by informing its state machine of the recently
      // pocketed balls
      this.gameLogicPostShot(this.recentlyPocketedBalls.slice());
      this.recentlyPocketedBalls = [];
    case 'nextTurnSetup':
      // Get out of the replay camera
      this.setCameraInteractive();
      // Determine what turn is next (i.e. cue shot, cue ball drop, or break
      // shot)
      if (this.pocketedBalls.indexOf(0) != -1) {
        // Remove the cue ball from the list of pocketed balls
        this.pocketedBalls.splice(this.pocketedBalls.indexOf(0), 1);
        // The cue ball was pocketed; we need to drop it somewhere
        this.balls[0].startDrop(vec2(0.0, 0.0));
        this.state = 'startDropCueBall';
        break;
      } else {  // TODO: Check that the game hasn't ended
        this.state = 'startSetupShot';
        break;
      }
    case 'postRack':
      // Wait for the user to click or press spacebar so we can start a new
      // rack
      if (this.keysDepressed.spacebar) {
        // Consume the input
        this.keysDepressed.spacebar = false;
        // Start a new rack with the losing player doing the break
        this.state = 'placeBalls';
        this.gameLogicCurrentPlayer(
            (this.gameStateWinningPlayer == 1) ? 2 : 1);
      }
      break;
    default:
      throw "Unknown billiard table state '" + this.state + "'!";
  }

  this.cueStick.tick(dt);
  this.tickCameras(dt);
  this.tickSimulation(dt);
  this.tickGameLogic(dt);
}
BilliardTable.prototype.gameLogicStartRack = function() {
  this.gameState = 'startRack';
}
BilliardTable.prototype.gameLogicFirstCueBallHit = function(ballNumber) {
  this.gameStateFirstCueBallHit = ballNumber;
}
BilliardTable.prototype.gameLogicPostShot = function(balls) {
  this.gameStatePocketedBalls = balls.slice();
  this.gameState = 'startPostShot';
}
BilliardTable.prototype.gameLogicCurrentPlayer = function(playerNumber) {
  // Inform our state machine
  this.gameStatePlayer = playerNumber;
  // Display the player on the HUD
  hud.player(playerNumber);
}
BilliardTable.prototype.gameLogicNextPlayer = function() {
  this.gameLogicCurrentPlayer((this.gameStatePlayer == 1) ? 2 : 1);
}

BilliardTable.prototype.gameLogicAwardRack = function(playerNumber) {
  this.gameStateWinningPlayer = playerNumber;
  hud.playerWins(playerNumber);
  this.state = 'postRack';
  this.gameState = 'postRack';
}
BilliardTable.prototype.tickGameLogic = function(dt) {
/*
 * Monkey Billiards Nine Ball rules, from:
 * <http://www.ign.com/faqs/2003/super-monkey-ball-monkey-billiards-faq-382480>
 *
 * a) Whoever pockets the 9 ball first is the winner of the rack.
 *
 * b) You must always hit the lowest ball first.
 *
 * c) After hitting the lowest ball, if it or another ball goes in, then you
 * can shoot again.  Another way to foul is to not hit the low ball first.
 *
 * d) Putting the cue ball in a hole is a foul, and the next shot
 * automatically is your opponents.
 *
 * e) The game is usually a best of 1, 3, 5, 7, or 9.
 */
  switch (this.gameMode) {
    case NINE_BALL_MODE:
      switch (this.gameState) {
        case 'start':
          this.gameLogicCurrentPlayer(1);  // Always start with player one
        case 'startMatch':
          // TODO: Determine which player goes first for this match
        case 'playingMatch':
          break;
        case 'startRack':
          hud.nextBall(1);
          this.gameStateBallsInPlay = [];
          for (var i = 1; i <= 9; ++i) {
            this.gameStateBallsInPlay.push(i);
          }
          this.gameStateNextBall = 1;
        case 'playingRack':
          this.gameState = 'playingRack';
          break;
        case 'startPostShot':
          this.gameState = 'postShot';
        case 'postShot':
          // If some of our balls were pocketed, we must remove them from the
          // list of balls in play.
          for (var i = 0; i < this.gameStatePocketedBalls.length; ++i) {
            if (this.gameStatePocketedBalls[i] == 0) {
              continue;  // Don't bother with the cue ball for now
            }
            if (this.gameStateBallsInPlay.indexOf(
                  this.gameStatePocketedBalls[i]) == -1) {
              // FIXME: This happens somehow
              throw "Error accounting for balls the game logic state.";
            } else {
              this.gameStateBallsInPlay.splice(
                  this.gameStateBallsInPlay.indexOf(
                    this.gameStatePocketedBalls[i]), 1);
            }
          }
          // We figure out what to do with all these pocketed balls with a
          // barrage of if else statements, yay!
          if (this.gameStatePocketedBalls.indexOf(9) != -1) {
            // The Nine ball was pocketed. Someone has won the rack.
            if (this.gameStateFirstCueBallHit != this.gameStateNextBall) {
              // The Nine ball was pocketed on a foul. We simply award the
              // rack to the other player.
              this.gameLogicAwardRack((this.gameStatePlayer == 1) ? 2 : 1);
              this.gameState = 'postRack';
              break;
            } else {
              // The Nine ball was pocketed with legitimate means (We don't
              // care if the cue ball was pocketed or not). The rack is
              // awarded to the current player.
              this.gameLogicAwardRack(this.gameStatePlayer);
              this.gameState = 'postRack';
              break;
            }
          } else if (this.gameStatePocketedBalls.indexOf(0) != -1) {
            // TODO: The cue ball was pocketed (without pocketing the nine
            // ball). We issue a foul to the current player and switch
            // players.
            this.gameLogicNextPlayer();
          } else if (this.gameStateFirstCueBallHit != this.gameStateNextBall) {
            // The current player fouled by not hitting the next ball
            // first. We issue a foul to the current player and switch
            // players.
            this.gameLogicNextPlayer();
          } else if (this.gameStatePocketedBalls.length <= 0) {
            // No balls were pocketed; the turn goes to the next player
            this.gameLogicNextPlayer();
          }
          // Check if the next ball was pocketed
          if (this.gameStatePocketedBalls.indexOf(
                this.gameStateNextBall) != -1) {
            // The next ball was pocketed. We must determine what the next
            // next ball should be.
            // NOTE: The gameStateBallsInPlay array is always sorted, because
            // we created the array ourselves and we only ever remove balls
            // with Array.prototype.slice()
            this.gameStateNextBall = this.gameStateBallsInPlay[0];
          }
          // "Consume" the pocketed balls for this shot
          this.gameStatePocketedBalls = undefined;
          // Return the HUD to displaying the player next ball
          hud.player(this.gameStatePlayer);
          hud.nextBall(this.gameStateNextBall);
          this.gameState = 'playingRack';
          break;
        case 'postRack':
          // Determine if we are done with this match or not
          break;
        case 'postMatch':
        default:
          throw "Encountered unknown game state '" + this.gameState + "'!";
      }
    break;
    default:
      throw "Encountered unknown game mode!";
  }
}
BilliardTable.prototype.dropCueBall =
function(ball, position, north, south, east, west) {
  // This function assists the user in droping the ball without having it
  // collide with any walls. The checkDropCueBall function also checks ball and
  // pocket collisions, but it is much slower.

  // Check for wall collisions
  if (position[1] >= north ||
      position[1] <= south ||
      position[0] >= east ||
      position[0] <= west) {
    return; // Wall collision; can't drop here
  }

  // Nothing bad found. We can drop the ball now. Don't forget to also use
  // checkDropCueBall()!
  ball.position = vec3(position[0], position[1], BALL_RADIUS);
}
BilliardTable.prototype.checkDropCueBall =
function(ball, position, north, south, east, west) {
  // This function assists the user in droping the cue ball without having it
  // collide with any balls or pockets, and without leaving the given
  // boundries.

  // This routine is pretty slow. The correct thing to do is to only
  // check ball and pocket collisions after the user has clicked.

  // Check for wall collisions
  if (position[1] >= north ||
      position[1] <= south ||
      position[0] >= east ||
      position[0] <= west) {
    return false; // Wall collision; can't drop here
  }

  // Check for ball collisions
  for (var i = 0; i < this.balls.length; ++i) {
    if (!this.balls[i].isInPlay() || this.balls[i].number == ball.number) {
      continue;
    }
    if (length(subtract(vec2(this.balls[i].position), vec2(position))) <
        2 * BALL_RADIUS) {
      return false;  // Ball collision; can't drop here
    }
  }

  // Check for pocket collisions
  for (var i = 0; i < POCKETS.length; ++i) {
    if (length(subtract(POCKETS[i], vec2(position))) <
        POCKET_RADIUS - BALL_RADIUS) {
      return false;  // Pocket collision; can't drop here
    }
  }

  // Nothing bad found. We can drop the ball now.
  return true;
}
BilliardTable.prototype.startSimulation = function() {
  this.simulationState = 'startSimulation';
  this.simulationElapsedTime = -dt;  // -dt + dt = 0.0
}
BilliardTable.prototype.startReplay = function() {
  this.simulationState = 'startReplay';
}
BilliardTable.prototype.stopSimulation = function() {
  this.simulationState = 'stopSimulation';
}
BilliardTable.prototype.tickSimulation = function(dt) {
  switch (this.simulationState) {
    case 'stopSimulation':
    case 'stopped':
      break;
    case 'startSimulation':
      this.isReplay = false;
    case 'startReplay':
      if (this.simulationState == 'startReplay') {
        // NOTE: No need to set the elapsed time; it would have been saved with
        // the simulation state
        this.isReplay = true;
      }
    case 'running':
      this.simulationState = 'running';
      this.simulationElapsedTime += dt;

      // Simulate the collision physics of the billiard balls in 2D

      // Detect ball-ball collisions
      // First, broad-phase collision detection with sweep and prune algorithm
      // NOTE: Insertion sort could be used here because (1) we need to iterate
      // to find all potential collisions anyway and (2) insertion sort has an
      // amortized running time of O(n) for nearly-sorted lists such as these.
      // I'm guessing Javascript's quicksort implementation is faster (because
      // it would be implemented in C), but I don't have any benchmarks yet.
      var xCollisions = [];
      // Sort xBalls by x position
      this.xBalls.sort(function(a, b) {
        return a.position[0] - b.position[0];
      });
      // Iterate forwards (positive-x direction) through all balls
      for (var i = 1; i < this.xBalls.length; ++i) {
        // Search backwards (negative-x direction) for collisions
        for (var j = i - 1; j >= 0; --j) {
          if (this.xBalls[i].position[0] - this.xBalls[j].position[0] >=
              BALL_DIAMETER)
            break;
          // Potential collision between xBalls[i] and xBalls[j]
          var lesserNumber = this.xBalls[j].number;
          var greaterNumber;
          if (this.xBalls[i].number < lesserNumber) {
            greaterNumber = lesserNumber;
            lesserNumber = this.xBalls[i].number;
          } else {
            greaterNumber = this.xBalls[i].number;
          }
          xCollisions[lesserNumber + greaterNumber * this.balls.length] = true;
        }
      }
      // Sort yBalls by y position
      this.yBalls.sort(function(a, b) {
        return a.position[1] - b.position[1];
      });
      // Iterate forwards (positive-y direction) through all balls
      for (var i = 1; i < this.yBalls.length; ++i) {
        // Search backwards (negative-y direction) for collisions
        for (var j = i - 1; j >= 0; --j) {
          if (this.yBalls[i].position[1] - this.yBalls[j].position[1]
              >= BALL_DIAMETER)
            break;
          // Potential collision between yBalls[i] and yBalls[j]
          var lesserNumber = this.yBalls[j].number;
          var greaterNumber;
          if (this.yBalls[i].number < lesserNumber) {
            greaterNumber = lesserNumber;
            lesserNumber = this.yBalls[i].number;
          } else {
            greaterNumber = this.yBalls[i].number;
          }
          if (typeof
              xCollisions[lesserNumber + greaterNumber * this.balls.length] !=
              'undefined') {
            // Exact collision detection
            if (length(
                  subtract(this.yBalls[i].position, this.yBalls[j].position)) <
                  BALL_DIAMETER) {
              // Record the ball-ball collision (for game logic and replay
              // purposes)
              this.noteBallBallCollision(this.yBalls[i], this.yBalls[j]);
              this.noteBallBallCollision(this.yBalls[j], this.yBalls[i]);
              // Compute the reflection (perfectly elastic collision)
              var iVelocity = elasticCollisionReflection(
                  this.yBalls[i].velocity, this.yBalls[j].velocity,
                  this.yBalls[i].position, this.yBalls[j].position);
              var jVelocity = elasticCollisionReflection(
                  this.yBalls[j].velocity, this.yBalls[i].velocity,
                  this.yBalls[j].position, this.yBalls[i].position);
              this.yBalls[i].velocity = iVelocity;
              this.yBalls[j].velocity = jVelocity;
              // Displace the balls so that they are no longer colliding
              var iDisplacement =
                collisionDisplacement(
                    this.yBalls[i].position,
                    this.yBalls[j].position, BALL_RADIUS);
              var jDisplacement =
                collisionDisplacement(
                    this.yBalls[j].position,
                    this.yBalls[i].position, BALL_RADIUS);
              this.yBalls[i].position =
                add(this.yBalls[i].position,
                    scale(1.01, iDisplacement));
              this.yBalls[j].position =
                add(this.yBalls[j].position,
                    scale(1.01, jDisplacement));
              if (length(subtract(jVelocity, iVelocity)) >
                  BALL_BALL_COLLISION_LOUD_SOUND_MIN_VELOCITY) {
                // Play the sound of two balls colliding for balls of
                // sufficient velocity
              audioPool.playSound(
              "common/108615__juskiddink__billiard-balls-single-hit-dry.wav");
              }
            }
          }
        }
      }

      // Determine ball-wall collisions by first considering the outlier balls
      // in a "broad-phase" before testing for collisions with the actual
      // cushions
      // Consider westmost balls
      for (var i = 0; i < this.xBalls.length; ++i) {
        if (this.xBalls[i].position[0] < -(TABLE_LENGTH / 2 - BALL_RADIUS)) {
          // This ball is beyond the western wall; look for cushion collisions
          this.handleCushionCollisions(this.xBalls[i], WESTERN_CUSHIONS);
        } else break;
      }
      // Consider eastmost balls
      for (var i = this.xBalls.length - 1; i >= 0; --i) {
        if (this.xBalls[i].position[0] > TABLE_LENGTH / 2 - BALL_RADIUS) {
          // This ball is beyond the eastern wall; look for cushion collisions
          this.handleCushionCollisions(this.xBalls[i], EASTERN_CUSHIONS);
        } else break;
      }
      // Consider southmost balls
      for (var i = 0; i < this.yBalls.length; ++i) {
        if (this.yBalls[i].position[1] < -(TABLE_WIDTH / 2 - BALL_RADIUS)) {
          // This ball is beyond the southern wall; look for cushion collisions
          this.handleCushionCollisions(this.yBalls[i], SOUTHERN_CUSHIONS);
        } else break;
      }
      // Consider northmost balls
      for (var i = this.xBalls.length - 1; i >= 0; --i) {
        if (this.yBalls[i].position[1] > TABLE_WIDTH / 2 - BALL_RADIUS) {
          // This ball is beyond the northern wall; look for cushion collisions
          this.handleCushionCollisions(this.yBalls[i], NORTHERN_CUSHIONS);
        } else break;
      }

      // Determine ball-pocket collisions by first examining each pocket
      // neighborhood in broad-phase collision detection
      // Scan from east to west to determine the east pocket neighborhood
      var eastPocketNeighborhood = new Set();
      for (var i = this.xBalls.length - 1; i >= 0; --i) {
        if (this.xBalls[i].position[0] > SOUTHEAST_POCKET[0] - POCKET_RADIUS) {
          eastPocketNeighborhood.add(this.xBalls[i].number);
          continue;
        }
        break;
      }
      // Scan from west to east to determine the west pocket neighborhood
      var westPocketNeighborhood = new Set();
      for (var i = 0; i < this.xBalls.length; ++i) {
        if (this.xBalls[i].position[0] < SOUTHWEST_POCKET[0] + POCKET_RADIUS) {
          westPocketNeighborhood.add(this.xBalls[i].number);
          continue;
        }
        break;
      }
      // Scan from south to north to determine the south pocket neighborhood
      var southPocketNeighborhood = new Set();
      for (var i = 0; i < this.yBalls.length; ++i) {
        if (this.yBalls[i].position[1] < Math.max(SOUTH_POCKET[1],
              SOUTHEAST_POCKET[1]) + POCKET_RADIUS) {
          southPocketNeighborhood.add(this.yBalls[i].number);
          continue;
        }
        break;
      }
      // Scan from north to south to determine the north pocket neighborhood
      var northPocketNeighborhood = new Set();
      for (var i = this.yBalls.length - 1; i >= 0; --i) {
        if (this.yBalls[i].position[1] >
            Math.min(NORTH_POCKET[1], NORTHEAST_POCKET[1]) - POCKET_RADIUS) {
          northPocketNeighborhood.add(this.yBalls[i].number);
          continue;
        }
        break;
      }

      var setUnion = function(a, b) {
        var result = new Set();
        a.forEach(function(item) {
          if (b.has(item)) {
            result.add(item);
          }
        });
        return result;
      }
      // Cross-reference each pocket neighborhood (set union) to see if we have
      // a potential collision
      var southeastPocketNeighborhood =
        setUnion(southPocketNeighborhood, eastPocketNeighborhood);
      var southwestPocketNeighborhood =
        setUnion(southPocketNeighborhood, westPocketNeighborhood);
      var northeastPocketNeighborhood =
        setUnion(northPocketNeighborhood, eastPocketNeighborhood);
      var northwestPocketNeighborhood =
        setUnion(northPocketNeighborhood, westPocketNeighborhood);
      var billiardTable = this;
      // Check for collisions in each pocket
      southeastPocketNeighborhood.forEach(function(ball) {
        if (length(subtract(SOUTHEAST_POCKET,
                vec2(billiardTable.balls[ball].position))) < POCKET_RADIUS) {
          billiardTable.pocketBall(ball, "SOUTHEAST_POCKET");
        }
      });
      southwestPocketNeighborhood.forEach(function(ball) {
        if (length(subtract(SOUTHWEST_POCKET,
                vec2(billiardTable.balls[ball].position))) < POCKET_RADIUS) {
          billiardTable.pocketBall(ball, "SOUTHWEST_POCKET");
        }
      });
      northeastPocketNeighborhood.forEach(function(ball) {
        if (length(subtract(NORTHEAST_POCKET,
                vec2(billiardTable.balls[ball].position))) < POCKET_RADIUS) {
          billiardTable.pocketBall(ball, "NORTHEAST_POCKET");
        }
      });
      northwestPocketNeighborhood.forEach(function(ball) {
        if (length(subtract(NORTHWEST_POCKET,
                vec2(billiardTable.balls[ball].position))) < POCKET_RADIUS) {
          billiardTable.pocketBall(ball, "NORTHWEST_POCKET");
        }
      });
      southPocketNeighborhood.forEach(function(ball) {
        if (length(subtract(SOUTH_POCKET,
                vec2(billiardTable.balls[ball].position))) < POCKET_RADIUS) {
          billiardTable.pocketBall(ball, "SOUTH_POCKET");
        }
      });
      northPocketNeighborhood.forEach(function(ball) {
        if (length(subtract(NORTH_POCKET,
                vec2(billiardTable.balls[ball].position))) < POCKET_RADIUS) {
          billiardTable.pocketBall(ball, "NORTH_POCKET");
        }
      });


      // This has been useful for debugging the pockets
      /*
      msg = "";
      var foundSome = false;

      msg += "Balls in north pocket neighborhood: ";
      northPocketNeighborhood.forEach(function(ball) {
        msg += "  " + ball;
        foundSome = true;
      });
      msg += "\n";
      msg += "Balls in south pocket neighborhood: ";
      southPocketNeighborhood.forEach(function(ball) {
        msg += "  " + ball;
        foundSome = true;
      });
      msg += "\n";
      msg += "Balls in east pocket neighborhood: ";
      eastPocketNeighborhood.forEach(function(ball) {
        msg += "  " + ball;
        foundSome = true;
      });
      msg += "\n";
      msg += "Balls in west pocket neighborhood: ";
      westPocketNeighborhood.forEach(function(ball) {
        msg += "  " + ball;
        foundSome = true;
      });
      msg += "\n";
      msg += "Balls in southeast pocket neighborhood: ";
      southeastPocketNeighborhood.forEach(function(ball) {
        msg += "  " + ball;
        foundSome = true;
      });
      msg += "\n";
      msg += "Balls in southwest pocket neighborhood: ";
      southwestPocketNeighborhood.forEach(function(ball) {
        msg += "  " + ball;
        foundSome = true;
      });
      msg += "\n";
      msg += "Balls in northeast pocket neighborhood: ";
      northeastPocketNeighborhood.forEach(function(ball) {
        msg += "  " + ball;
        foundSome = true;
      });
      msg += "\n";
      msg += "Balls in northwest pocket neighborhood: ";
      northwestPocketNeighborhood.forEach(function(ball) {
        msg += "  " + ball;
        foundSome = true;
      });
      msg += "\n";
      if (foundSome) {
        window.alert(msg);
      }
      */

      break;
    default:
      throw "Unknown simulation state '" + this.simulationState + "'!";
  }
}
BilliardTable.prototype.handleCushionCollisions = function(ball, cushions) {
  var collidedEdges = false;
  for (var i = 0; i < cushions.length; ++i) {
    collidedEdges = cushions[i].checkCollision(ball);
    if (collidedEdges) {
      break;  // NOTE: We do not consider collisions on multiple cushions
    }
  }
  if (!collidedEdges) {
    return;
  }
  if (collidedEdges.length == 1) {
    this.handleEdgeCollision(ball, collidedEdges[0]);
    return;
  } else if (collidedEdges.length == 2) {
    // Find the corner that we might be colliding with
    var corner;
    for (var i = 0; i < collidedEdges[0].length; ++i) {
      for (var j = 0; j < collidedEdges[1].length; ++j) {
        if ((collidedEdges[0][i][0] == collidedEdges[1][j][0]) &&
            (collidedEdges[0][i][1] == collidedEdges[1][j][1])) {
          corner = collidedEdges[0][i];
        }
      }
    }
    if (typeof corner == 'undefined') {
      msg = "Fishy edges: \n";
      for (var i = 0; i < collidedEdges.length; ++i) {
        msg += "(" + collidedEdges[i][0] + "), (" + collidedEdges[i][1] +
          ")\n";
      }
      console.log(msg);
      throw "Could not find a corner; " +
        "there must be something fishy with the cushion polygons";
    }

    // The ball might have collided with a corner, but the Separating Axis
    // Theorem algorithm might have missed an axis. This is because it does not
    // consider the normals of the "faces" on our circle. This is clear when
    // you draw a near-corner collision on paper.
    // Thus, we must first check if the ball is within BALL_RADIUS of the
    // corner.

    // The ball (might have) collided with a corner; we need to interpolate the
    // normals of the two edges, weighted by how much of each edge is
    // intersecting the ball's circle
    var collidedEdgeWeights = [];
    var collidedEdgeLengthsSum = 0.0;
    for (var i = 0; i < collidedEdges.length; ++i) {
      // Find the intersection of the edge line with the ball circle to
      // determine the collided length (which will determine the weight)
      var intersectedEdgeSegment =
        lineCircleIntersection(collidedEdges[i],
            vec2(ball.position), BALL_RADIUS);
      if (!Array.isArray(intersectedEdgeSegment)) {
        // The Separating Axis Theorem algorithm can pick up two edges when
        // only one of them is actually collided. We just weight the
        // non-colliding edge to zero
        collidedEdgeWeights.push(0.0);
        continue;
      }
      var intersectionLength = length(subtract(intersectedEdgeSegment[1],
            intersectedEdgeSegment[0]));
      collidedEdgeWeights.push(intersectionLength);
      collidedEdgeLengthsSum += intersectionLength;
    }
    if (collidedEdgeLengthsSum == 0.0) {
      // None of the edges intersected; we don't have a collision
      return;
    }
    // Adjust the weights so that they sum to one
    collidedEdgeWeights = scale(1 / collidedEdgeLengthsSum, collidedEdgeWeights);
    // Combine the edge normals by their weights
    var collisionNormal = vec2(0.0, 0.0);
    for (var i = 0; i < collidedEdges.length; ++i) {
      var edgeNormal =
        normalize(vec2(cross(vec3(subtract(collidedEdges[i][1],
                    collidedEdges[i][0])), vec3(0.0, 0.0, 1.0))));
      collisionNormal =
        add(collisionNormal, scale(collidedEdgeWeights[i], edgeNormal));
    }
    collisionNormal = normalize(collisionNormal);
    this.handleCornerCollision(ball, corner, collisionNormal);
    return;
  } else {
    msg = "Fishy edges: \n";
    for (var i = 0; i < collidedEdges.length; ++i) {
      msg += "(" + collidedEdges[i][0] + "), (" + collidedEdges[i][1] + ")\n";
    }
    console.log(msg);
    throw "We can't handle more than two edge collisions at a time";
  }
}
BilliardTable.prototype.handleEdgeCollision = function(ball, edge) {
  // The ball collided with an edge. We just need to reflect the velocity and
  // get it out of the wall.
  // Only one edge to consider; the normal is perpendicular to the wall
  var collisionNormal =
    normalize(cross(vec3(subtract(edge[1], edge[0])),
          vec3(0.0, 0.0, 1.0)).slice(0,2));
  // Compute the reflection for the velocity
  var originalVelocity = ball.velocity.slice();
  ball.velocity = reflection(ball.velocity, vec3(collisionNormal, 0.0));
  // Get the ball out of the wall
  // NOTE: We could probably try harder at this approximation and account for
  // how far the ball has moved in the last dt, but this is good enough
  // good enough
  ball.position = add(ball.position, scale(MAX_DT, ball.velocity));
  var same = true;
  for (var i = 0; i < ball.velocity.length; ++i) {
    if (ball.velocity[i] != originalVelocity[i]) {
      same = false;
      break;
    }
  }
  if (!same) {  // XXX
    // Apply coefficient of restitution (bounciness) only if the reflection
    // actually changed the velocity
    ball.velocity = scale(BALL_CLOTH_COEFFICIENT_OF_RESTITUTION,
        ball.velocity);
  }
  // TODO: Play an appropriate sound
}
BilliardTable.prototype.handleCornerCollision =
function(ball, corner, collisionNormal) {
  // Compute the reflection for the velocity
  var originalVelocity = ball.velocity.slice();
  ball.velocity = reflection(ball.velocity, vec3(collisionNormal, 0.0));
  // Get the ball out of the corner
  var cornerToBallCenter = subtract(vec2(ball.position), corner);
  var same = true;
  for (var i = 0; i < ball.velocity.length; ++i) {
    if (ball.velocity[i] != originalVelocity[i]) {
      same = false;
      break;
    }
  }
  if (!same) {
    // Apply coefficient of restitution (bounciness) only if the reflection
    // actually changed the velocity
    ball.velocity = scale(BALL_CLOTH_COEFFICIENT_OF_RESTITUTION,
        ball.velocity);
  }
}
BilliardTable.prototype.pocketBall = function(ballNumber, pocketName) {
  // Remove the ball from the broad-phase collision detection lists
  for (var i = 0; i < this.xBalls.length; ++i) {
    if (this.xBalls[i].number == ballNumber) {
      this.xBalls.splice(i, 1);  // Remove the ball from the array
      break;
    }
  }
  for (var i = 0; i < this.yBalls.length; ++i) {
    if (this.yBalls[i].number == ballNumber) {
      this.yBalls.splice(i, 1);  // Remove the ball from the array
      break;
    }
  }
  // Set the pocket for the ball (and notify its state machine)
  this.balls[ballNumber].setPocket(pocketName);
  // Note the time we pocketed the ball
  this.balls.pocketTime = this.simulationElapsedTime;
  // Note the simulation time that the ball was pocketed, so we can make a nice
  // replay
  this.pocketedBalls.push(ballNumber);
  this.recentlyPocketedBalls.push(ballNumber);
  // Pocketing the cue ball is a foul
  if (ballNumber == 0) {
    if (this.state == 'simulation') {
      hud.foul();
    }
  }
}

BilliardTable.prototype.setCameraInteractive = function() {
  this.cameraState = 'interaction';
}
BilliardTable.prototype.setCameraInitialReplay = function() {
  this.cameraState = 'startInitialReplay';
}
BilliardTable.prototype.setCameraPocketReplay = function(pocketName, balls) {
  // This routine instructs the camera's state machine to follow the given
  // balls as they enter the given pocket, in the order that the balls are
  // given
  this.cameraState = 'startPocketReplay';
  this.cameraPocketName = pocketName;
  this.cameraPocketBalls = balls.slice();
}
BilliardTable.prototype.tickCameras = function(dt) {
  // Determine the camera to draw (e.g. are we idling (rotate around the table
  // with perspective view)? Is the user dragging the cue stick(top ortho
  // view)?  Was the que ball just struck? Is the target ball close to a pocket
  // (pocket view)?

  // Determine which camera we should be using
  switch (this.cameraState) {
    case 'interaction':
      if (this.keysDepressed.spacebar) {
        // Spacebar toggles between perspective and orthographic view
        if (this.currentCameraAngle != 'orthographic') {
          this.currentCameraAngle = 'orthographic';
        } else {
          this.currentCameraAngle = 'perspective';
        }
        this.keysDepressed.spacebar = false;  // Consume the input
      }
      switch (this.currentCameraAngle) {
        case 'perspective':
          this.currentCamera = this.cameras.mainPerspective;
          // The arrow keys control the perpective camera
          if (this.keysDepressed.leftArrow &&
              !this.keysDepressed.rightArrow) {
            this.currentCamera.rotateClockwise();
          } else if (this.keysDepressed.rightArrow &&
              !this.keysDepressed.leftArrow) {
            this.currentCamera.rotateCounterClockwise();
          }
          // TODO: Up/down camera controls?
        break;
        case 'orthographic':
          this.currentCamera = this.cameras.mainOrthographic;
        break;
        default:
          throw "Unknown camera angle '" + this.currentCameraAngle + "'!";
      }
      break;
    case 'simulation':
      break;
    case 'startInitialReplay':
      // Position the chase camera behind the cue ball, pointing in the
      // direction of its velocity
      this.currentCamera = this.cameras.chase;
      this.currentCamera.chase(this.balls[0],
          add(vec3(0.0, 0.0, CHASE_CAMERA_DISPLACEMENT[1]),
            scale(-CHASE_CAMERA_DISPLACEMENT[0],
              normalize(this.balls[0].velocity))));
      this.cameraState = 'initialReplay';
      this.initialReplayCurrentBall = 0;
    case 'initialReplay':
      // TODO: Follow the ball with the current highest velocity, while also
      // obeying a cooldown timeout
      break;
    case 'startPocketReplay':
      this.cameraState = 'pocketReplay';
      // Follow the first ball to enter the pocket
      this.currentCamera = this.getCameraFromPocketName(this.cameraPocketName);
      this.currentCamera.follow(this.balls[this.cameraPocketBalls[0].number]);
    case 'pocketReplay':
      if (this.cameraPocketBalls.length > 0) {
        if (this.recentlyPocketedBalls.indexOf(
              this.cameraPocketBalls[0].number) != -1) {
          // If the ball we are watching has already been pocketed, move to the
          // next ball
          this.cameraPocketBalls.shift();
          if (this.cameraPocketBalls.length > 0) {
            // We still have balls to follow
            this.currentCamera.follow(
                this.balls[this.cameraPocketBalls[0].number]);
          }
        }
        break;  // Continue watching balls enter the pocket
      } else {
        // No more balls to follow; are we done? No. The main state machine
        // will eventually change our state. We just have to wait.
      }
      break;
    default:
      throw "Unknown billiard table camera state: " + this.cameraState;
  }

  // Let the camera animate
  this.currentCamera.tick(dt);
}
// Various user input event handlers for BilliardTable (most user interaction
// is processed here)
BilliardTable.prototype.tableCoordinatesFromCursor = function(x, y) {
  // Find the point that the ray from the click intersects the billiard table
  var ray = this.currentCamera.screenPointToWorldRay(
      vec2(x, y),
      canvas.clientWidth, canvas.clientHeight);
  // FIXME: This is in world coordinates; we probably want this is billiard
  // table coordinates
  var intersectionPoint = linePlaneIntersection(
      vec4(this.currentCamera.getWorldPosition()), ray,
      vec4(this.getWorldPosition()),
      mult(vec4(0.0, 0.0, 1.0, 0.0),
        quatToMatrix(qinverse(this.getWorldOrientation()))));
  return intersectionPoint;
}
BilliardTable.prototype.mouseDownEvent = function(event) {
  this.mouseStart =
    this.tableCoordinatesFromCursor(event.clientX, event.clientY);
}
BilliardTable.prototype.mouseMoveEvent = function(event) {
  this.cursorPos = vec2(event.clientX, event.clientY);
}
BilliardTable.prototype.mouseLeaveEvent = function(event) {
  this.mouseStart = undefined;
  this.cursorPos = undefined;
  this.mouseDown = undefined;
  this.keysDepressed = {};  // Deadman's switch for camera controls, etc.
}
BilliardTable.prototype.mouseUpEvent = function(event) {
  this.mouseEnd = this.tableCoordinatesFromCursor(event.clientX, event.clientY);
  if (typeof this.mouseStart != 'undefined') {
    this.mouseDragVector = subtract(this.mouseEnd, this.mouseStart);
    debug.drawLine(vec3(this.mouseStart[0], this.mouseStart[1], 0.01),
        vec3(this.mouseEnd[0], this.mouseEnd[1], 0.01));
    this.mouseStart = undefined;
  }
}
BilliardTable.prototype.keyDownEvent = function(event) {
  switch (event.keyCode) {
    case 0x20:  // Spacebar
      this.keysDepressed.spacebar = true;
      break;
    // Arrow keys are used for camera controls, with most of the logic inside
    // tickCameras()
    // FIXME: Combining the key codes like this is a hack. This should be done
    // more carefully.
    case 0x25:  // Left Arrow
    case 0x41:  // A  (Qwerty WASD)
    case 0x4F:  // O  (Dvorak .OEU)
      this.keysDepressed.leftArrow = true;
      break;
    case 0x27:  // Right Arrow
    case 0x44:  // D  (Qwerty WASD)
    case 0x55:  // U  (Dvorak .OEU)
      this.keysDepressed.rightArrow = true;
      break;

    // XXX: Debug controls
    case 33:  // Page Up
      billiardTable.cameras.southPocket.position[1] += 0.001
        console.log("billiardTable.cameras.southPocket Y: " +
            billiardTable.cameras.southPocket.position[1]);
      break;
    case 34:  // Page Down
      billiardTable.cameras.southPocket.position[1] -= 0.001
        console.log("billiardTable.cameras.southPocket Y: " +
            billiardTable.cameras.southPocket.position[1]);
      break;
    case 38:  // Up Arrow
      billiardTable.cameras.southPocket.position[2] += 0.001
        console.log("billiardTable.cameras.southPocket Z: " +
            billiardTable.cameras.southPocket.position[2]);
      break;
    case 40:  // Down Arrow
      billiardTable.cameras.southPocket.position[2] -= 0.001
        console.log("billiardTable.cameras.southPocket Z: " +
            billiardTable.cameras.southPocket.position[2]);
      break;
  }
}
BilliardTable.prototype.keyUpEvent = function(event) {
  switch (event.keyCode) {
    case 0x20:  // Spacebar
      this.keysDepressed.spacebar = false;
      break;
    case 0x25:  // Left Arrow
    case 0x41:  // A  (Qwerty WASD)
    case 0x4F:  // O  (Dvorak .OEU)
      this.keysDepressed.leftArrow = false;
      break;
    case 0x27:  // Right Arrow
    case 0x44:  // D  (Qwerty WASD)
    case 0x55:  // U  (Dvorak .OEU)
      this.keysDepressed.rightArrow = false;
      break;
  }
}
BilliardTable.prototype.getCameraFromPocketName = function(pocketName) {
  switch (pocketName) {
    case 'SOUTHEAST_POCKET':
      return this.cameras.southeastPocket;
    case 'SOUTHWEST_POCKET':
      return this.cameras.southwestPocket;
    case 'NORTHEAST_POCKET':
      return this.cameras.northeastPocket;
    case 'NORTHWEST_POCKET':
      return this.cameras.northwestPocket;
    case 'SOUTH_POCKET':
      return this.cameras.southPocket;
    case 'NORTH_POCKET':
      return this.cameras.northPocket;
    default:
      throw "Unknown pocket name '" + pocketName + "'!";
  }
}
BilliardTable.prototype.noteBallBallCollision = function(ball, otherBall) {
  // We have a ball-ball collision. We might need to record this fact.
  if (typeof ball.firstHitTime == 'undefined') {
    // We're the first hit; store the time
    ball.firstHitTime = this.simulationElapsedTime;
    if (ball.number == 0) {
      // We're the cue ball; inform the game logic state machine
      this.gameLogicFirstCueBallHit(otherBall.number);
      if (otherBall.number != this.gameStateNextBall) {
        // The player didn't hit the next ball; thats a foul!
        if (this.state == 'simulation') {
          hud.foul();
        }
      }
    }
  }
}

//------------------------------------------------------------
// Prototype for the cue stick
//------------------------------------------------------------
var CueStick = function(position, orientation) {
  // Iherit from mesh object
  MeshObject.call(this,
      "common/cue_stick.obj", "common/cue_stick.png", "cuestick",
      position, orientation);

  // Start our state machine idle
  this.state = 'idle';

  // The billiard table references this value, so we'd better keep it valid
  this.releasedTimeElapsed = 0.0;

  // Start out invisible
  this.fadeAlpha = 0.0;
}
CueStick.prototype = Object.create(MeshObject.prototype);
CueStick.prototype.startSetupShot = function() {
  if (this.state != 'idle') {
    throw 'The cue stick is in a bad state!';
  }
  this.state = 'startSetupShot';
}
CueStick.prototype.setCueBallPosition = function(pos) {
  this.cueBallPosition = pos;
}
CueStick.prototype.setCursorPosition = function(pos) {
  this.cursorPosition = pos;
}
CueStick.prototype.release = function() {
  this.state = 'startReleased';
}
CueStick.prototype.isIdle = function() {
  return this.state == 'idle';
}
CueStick.prototype.tick = function(dt) {
  // Consider the state of the cue stick and animate accordingly
  switch (this.state) {
    case 'idle':
      // Wait for the cue stick to be needed
      break;
    case 'startSetupShot':
      // Set the initial position of the cue stick to something reasonable
      this.position =
        add(vec3(-2 * BALL_DIAMETER, 0.0, 0.0), this.cueBallPosition);
      this.orientation = quat(vec3(0.0, 0.0, 1.0), Math.atan2(0.0, 1.0));
      // Set the initial alpha
      this.fadeAlpha = 0.0;
      this.setupTimeElapsed = -dt;  // -dt + dt = 0.0
    case 'setupShot':
      this.state = 'setupShot';
      this.setupTimeElapsed += dt;
      // Interpolate the alpha to fade in the cue stick
      this.fadeAlpha =
        Math.min(this.setupTimeElapsed / CUE_STICK_TIME_TO_FADE_IN, 1.0);
      if (typeof this.cursorPosition == 'undefined') {
        break;  // No cursor to work with
      }
      // Determine where the mouse cursor is relative to the cue ball and draw
      // the cue stick
      var stickTransformation = new TransformationStack();
      var cueBallVector =
        subtract(this.cueBallPosition,
            vec3(this.cursorPosition[0],
                 this.cursorPosition[1],
                 this.cueBallPosition[2]));
      var cueBallDistance = length(cueBallVector);
      var cueBallDirection = scale(1 / cueBallDistance, cueBallVector);

      // Rotate the cue stick so that it's pointing from the cursor position to
      // the cue ball
      // FIXME: We should rotate about our parent's Z axis...
      this.orientation = quat(vec3(0.0, 0.0, 1.0),
          Math.atan2(cueBallDirection[1], cueBallDirection[0]));

      if (cueBallDistance < CURSOR_RADIUS_EPSILON) {
        // FIXME: Ignore any shots from this distance?
        // Clamp the magnitude of any shots within CURSOR_RADIUS_EPSILON of the
        // ball to the weakest shot.
        this.position = add(scale(-(BALL_RADIUS +
                SHOT_VELOCITY_EPSILON * CUE_STICK_TIME_TO_COLLISION),
              cueBallDirection), this.cueBallPosition);
      } else if (cueBallDistance < CURSOR_RADIUS_EPSILON +
          (MAX_SHOT_VELOCITY * CUE_STICK_TIME_TO_COLLISION)) {
        // Subtract the CURSOR_RADIUS_EPSILON from our radius so we gain more
        // accuracy even for weak shots (i.e. the cursor can tranverse more
        // pixels for better angles with a large radius).
        this.position = add(scale(-(cueBallDistance + BALL_RADIUS -
                CURSOR_RADIUS_EPSILON), cueBallDirection),
            this.cueBallPosition);
      } else {
        // Clamp the cursor radius to the maximum shot velocity
        this.position = add(scale(-(BALL_RADIUS + MAX_SHOT_VELOCITY *
                CUE_STICK_TIME_TO_COLLISION), cueBallDirection),
            this.cueBallPosition);
      }

      // FIXME: This might look better if we translated the stick along its
      // local Z axis. It might also look much worse, since the tip of the cue
      // stick would be much further from the table. For now it looks fine.
      break;
    case 'startReleased':
      // Store the time elapsed since release
      this.releasedTimeElapsed = 0.0;  // -dt + dt = 0.0   // FIXME: use -dt
      // FIXME: If the tip of the cue stick is inside the ball, go back to shot
      // setup
      // Store our current position and the computed position of the collision
      // with the cue ball
      this.initialPosition = this.position;
      this.collisionPosition = add(this.position,
          add(subtract(this.cueBallPosition, this.position),
            scale(BALL_RADIUS, normalize(
                subtract(this.position, this.cueBallPosition)))));
      this.collisionVelocity =
        scale(1 / CUE_STICK_TIME_TO_COLLISION, subtract(this.collisionPosition,
              this.initialPosition));
    case 'released':
      this.state = 'released';
      // Update the time elapsed since release
      this.releasedTimeElapsed += dt;
      // Interpolate between the initial position and the collision position to
      // determine our position
      // TODO: Use a formula with some stick acceleration rather than just zero
      this.position = add(
          scale(1.0 - this.releasedTimeElapsed / CUE_STICK_TIME_TO_COLLISION,
            this.initialPosition),
          scale(this.releasedTimeElapsed / CUE_STICK_TIME_TO_COLLISION,
            this.collisionPosition));
      if (this.releasedTimeElapsed < CUE_STICK_TIME_TO_COLLISION) {
        break;
      }
    case 'postCollision':
      this.state = 'postCollision';
      // TODO: Some cleanup here? I don't know.
    case 'followThrough':
      this.state = 'followThrough';
      // Update the time elapsed since release
      this.releasedTimeElapsed += dt;
      // Continue moving for a bit while we fade out
      // TODO: Use a formula with some acceleration
      this.position = this.collisionPosition;
      // Interpolate the cue stick's alpha
      this.fadeAlpha =
        1.0 - ((this.releasedTimeElapsed -
              CUE_STICK_TIME_TO_COLLISION) / CUE_STICK_TIME_AFTER_COLLISION);
      // Wait until we are fully disappeared
      if (this.releasedTimeElapsed <
          CUE_STICK_TIME_TO_COLLISION + CUE_STICK_TIME_AFTER_COLLISION) {
        break;
      }
    case 'postFollowThrough':
      this.fadeAlpha = 0.0;
      // Reset the cue stick state for the next shot
      this.releasedTimeElapsed = 0.0;
      this.initialPosition = undefined;
      this.collisionPosition = undefined;
      this.collisionVelocity = undefined;
      // Wait for the next shot
      this.state = 'idle';
      break;
    default:
      throw "Unknown cue stick state '" + this.state + "'!";
  }
};
CueStick.prototype.draw = function(gl, modelWorld, worldView, projection) {
  // Don't bother drawing the cue stick while it's not being used
  if (this.state == 'idle') {
    return;
  }

  // We need to use our shader program in order to set its state
  this.useShaderProgram(gl);

  if (this.fadeAlpha < 1.0) {
    // Pass alpha to the shader
    gl.uniform1f(this.shaderProgram.uniforms.fadeAlpha, this.fadeAlpha);

    // Enable alpha blending for fade in/out
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.BLEND);
  }

  // The cue stick is always drawn on top
  gl.depthFunc(gl.ALWAYS);

  MeshObject.prototype.draw.call(this, gl, modelWorld, worldView, projection);

  // Clean up
  gl.depthFunc(gl.LESS);
  gl.disable(gl.BLEND);

  // TODO: Draw a line to the cue ball (especially for perspective shots)
  /*
  if (typeof this.cueBallPosition != 'undefined') {
    cueBallDirection = subtract(this.cueBallPosition, this.position);
    if (length(cueBallDirection > 0)) {
      var cueBallDirection = normalize(cueBallDirection);
      var verticies = [
        cueBallPosition[0], cueBallPosition[1], cueBallPosition[2],
        cueBallPosition[0] + cueBallDirection[0], cueBallPosition[1] +
        cueBallDirection[1], cueBallPosition[2] + cueBallDirection[2]
      ];
      debug.drawLine(vec3(cueBallPosition),
      vec3(add(cueBallPosition, cueBallDirection)));
    }
  }
  */
}

//------------------------------------------------------------
// Prototype for cameras
//------------------------------------------------------------
var Camera = function (properties, position, orientation) {
  // Iherit from SceneObject
  SceneObject.call(this, position, orientation);
  this.projection = properties;
}
Camera.prototype = Object.create(SceneObject.prototype);
Camera.prototype.worldViewTransformation = function() {
  var worldView = new TransformationStack();
  var cameraWorldCoordinates = this.position;
  // The camera can be positioned relative to the origin or relative to some
  // other object (e.g. the billiard table). In either case, we need to
  // transform the camera into world space before computing the modelView
  // matrix. The getWorldPosition() and getWorldOrientation() methods do the
  // work of finding the world coordinates, even if the parent-child hierarchy
  // gets complicated.
  // Rotate the world so that the camera is oriented facing down the -z axis
  // and has the correct roll. This amounts to rotating everything in the world
  // by inverse of our camera's orientation.
  worldView.push(quatToMatrix(qinverse(this.getWorldOrientation())));
  // Translate the world so that the camera is at the origin
  worldView.push(translate(scale(-1,cameraWorldCoordinates.slice(0,3))));

  return worldView;
}
// TODO: Write a Camera.isInView(object) function. This is done by first
// getting the world coordinates of the object, and then projecting those
// coordinates with the projection transformation (don't forget the perspective
// divide!). Finally, check if the resulting point is within the unit 2x2x2
// cube.
Camera.prototype.projectionTransformation = function(aspect) {
  var projection = new TransformationStack();

  switch (this.projection.type) {
    case 'orthographic':
      var width = this.projection.right - this.projection.left;
      var height = this.projection.top - this.projection.bottom;
      // Avoid changing aspect when projecting orthographic views. To do this,
      // we "fudge" the table model size with some "letterbox" margins.
      if (width / height > aspect) {
        // The area we're projecting is wider than the screen is wide
        var fudge = width / aspect - height;
        projection.push(ortho(this.projection.left, this.projection.right,
                              this.projection.bottom -
                                fudge / 2, this.projection.top + fudge / 2,
                              this.projection.near, this.projection.far));
      } else {
        // The area we're projecting is taller than the screen is tall
        var fudge = height * aspect - width;
        projection.push(ortho(this.projection.left - fudge / 2,
                              this.projection.right + fudge / 2,
                              this.projection.bottom, this.projection.top,
                              this.projection.near, this.projection.far));
      }
      break;
    case 'orthographicClip':
      // Same as orthographic above, but instead of trying to fit the given
      // area into the view, we clip it to the maximum area without changing
      // the aspect ratio
      var width = this.projection.right - this.projection.left;
      var height = this.projection.top - this.projection.bottom;
      if (width / height < aspect) {
        // The area we're projecting is taller than the screen is tall
        var fudge = height - width / aspect;
        projection.push(ortho(this.projection.left, this.projection.right,
            this.projection.bottom + fudge / 2, this.projection.top - fudge / 2,
            this.projection.near, this.projection.far));
      } else {
        // The area we're projecting is wider than the screen is wide
        var fudge = width - aspect * height;
        projection.push(ortho(
            this.projection.left + fudge / 2, this.projection.right - fudge / 2,
            this.projection.bottom, this.projection.top,
            this.projection.near, this.projection.far));
      }
      break;
    case 'perspective':
      projection.push(perspective(
            this.projection.fov, aspect,
            this.projection.near, this.projection.far));
      break;
    default:
      throw "projectionTransformation(): unknown projection type for camera";
  }

  return projection;
}
// TODO: Change lookAt into a utility function that returns a quaternion
// rotation
Camera.prototype.lookAtSmooth = function(object, fudge, iterate, preserveRoll) {
  if (typeof fudge == 'undefined')
    fudge = vec3(0.0, 0.0, 0.0);
  // NOTE: This naive implementation is close, but it doesn't work quite right.
  // It tends to follow an object slowly rather than looking at it instantly. I
  // have no idea why, but I'm not complaining because it looks really good for
  // replays and close-ups. The iterate argument is a complete hack. But hey,
  // it looks good.
  if (typeof iterate == 'undefined')
    iterate = 0;
  if (typeof preserveRoll == 'undefined')
    preserveRoll = false;

  var rollAngle;
  if (preserveRoll) {
    // TODO: Test this code
    // TODO: Store the "Roll" of the camera as an angle between the world's
    // Z-axis and the camera's Y-axis. The roll is lost in the next step.
    var zAxisCameraSpace = mult(vec4(0.0, 0.0, 1.0, 0.0),
        quatToMatrix(qinverse(this.getWorldOrientation())));
    zAxisCameraSpace[2] = 0.0;  // Project onto xy-plane in camera space
    zAxisCameraSpace = normalize(zAxisCameraSpace);
    // NOTE: We treat the camera's Y-axis as the X-axis argument to atan2(y,x)
    rollAngle = Math.atan2(zAxisCameraSpace[0], zAxisCameraSpace[1]);
  } else {
    rollAngle = 0.0;
  }

  // Rotate the camera to look at the object by calculating the angle between
  // the current camera direction and the desired direction and constructing a
  // quaternion rotation.
  var cameraDirection = vec4(0.0, 0.0, -1.0, 0.0);
  var objectDirection = vec4(subtract(add(fudge, object.getWorldPosition()),
        this.getWorldPosition()));
  objectDirection[3] = 0.0;
  objectDirection =
    mult(objectDirection, quatToMatrix(qinverse(this.getWorldOrientation())));
  objectDirection = normalize(objectDirection);
  var rotationAxis = cross(cameraDirection, objectDirection);
  var angle = Math.acos(dot(cameraDirection, objectDirection));
  this.orientation = qmult(this.orientation, quat(rotationAxis, angle));

  // TODO: Correct the roll of the camera orientation, as that information was
  // lost by converting the quaternion orientation to a vector. We rotate the
  // camera so that the camera's Y-axis aligns with the Z axis in world space.
  // To do this we first need to compute the camera roll after rotation. Then
  // we rotate the camera by the difference between the initial camera roll and
  // the roll after rotation.
  var zAxisCameraSpace =
    mult(vec4(0.0, 0.0, 1.0, 0.0),
        quatToMatrix(qinverse(this.getWorldOrientation())));
  zAxisCameraSpace[2] = 0.0;  // Project onto xy-plane in camera space
  // NOTE: atan2 doesn't require normalization
  zAxisCameraSpace = normalize(zAxisCameraSpace);
  // NOTE: We treat the camera's Y-axis as the X-axis argument to atan2(y,x)
  rollAnglePostRotation = -Math.atan2(-zAxisCameraSpace[0],
      zAxisCameraSpace[1]);
  var cameraYAxis = vec4(0.0, 1.0, 0.0, 0.0);
  this.orientation = qmult(this.orientation, quat(vec3(0.0, 0.0, 1.0),
                                        rollAngle - rollAnglePostRotation));
  this.orientation = normalize(this.orientation);  // Be nice to our quaternion

  // TODO: Add some assertions to make sure I didn't screw up the camera roll

  // We call this method recursively as a hack to make it more responsive
  if (iterate > 0) {
    this.lookAtSmooth(object, fudge, iterate - 1, preserveRoll);
  }
}
Camera.prototype.lookAt = function(object) {
  // NOTE: This is a simplistic version of the method above
  var q = quatFromVectors(vec3(0.0, 0.0, -1.0),
      subtract(object.position, this.position));
  var yAxisAfterRotation = mult(vec4(0.0, 1.0, 0.0, 0.0), quatToMatrix(q));
  q = qmult(quatFromVectors(vec3(yAxisAfterRotation), vec3(0.0, 0.0, 1.0)), q);
  this.orientation = q;

}
Camera.prototype.screenPointToWorldRay = function(point, width, height) {
  // NOTE: A ray has a direction and a reference point. As much as makes sense,
  // we use the origin of the given space as the implicit reference point.

  /*
   *  Sceen points are lines parallel to the Z-axis in normalized device
   *  space...
   */
  // Translate origin into the center of the screen
  var screenTransform = mult(mat4(), translate(-1.0, 1.0, 0.0));
  // Flip the y-axis coordinates
  screenTransform = mult(screenTransform, scalem(1.0, -1.0, 1.0));
  // Scale the pixel coordinates to be within 0.0 and 2.0
  var screenScale = mat4(2 / width,        0, 0, 0,
                               0, 2 / height, 0, 0,
                               0,        0, 1, 0,
                               0,        0, 0, 1);
  screenTransform = mult(screenTransform, screenScale);

  var deviceSpaceRay = mult(vec4(point), screenTransform);

  /* // FIXME: this probably isn't accurate
   * ...which, after crossing back over the perspective divide, are rays not
   * necessarily parallel to the Z-axis in homogeneous clip space...
   */
  // The perspective divide does not apply to our ray because it is pointing
  // through the focal point and straight out of the camera. We just need a 1.0
  // for w so that it's a point, and -1.0 for z so that it points down the -z
  // axis. Easy!
  var clipSpaceRay = deviceSpaceRay.slice();
  clipSpaceRay[2] = -1.0;
  clipSpaceRay[3] = 1.0;

  /*
   * ...which, after being transformed by the inverse projection matrix, are
   * rays relative to the camera's local origin in eye space...
   */
  var inverseProjectionMatrix = inverse(
      this.projectionTransformation(width / height).peek());
  var eyeSpaceRay = mult(deviceSpaceRay, inverseProjectionMatrix);
  eyeSpaceRay[2] = -1;
  eyeSpaceRay[3] = 0;

  /*
   * ...which, after being rotated by the inverse of the camera's orientation,
   * are rays relative to the global origin in world space.
   */
  // NOTE: I have no idea why this.getWorldOrientation() doesn't need to be
  // inverted. I should investigate.
  var worldSpaceRay = normalize(mult(eyeSpaceRay,
        quatToMatrix(this.getWorldOrientation())));

  // TODO: Take a breather.
  return worldSpaceRay;
}
Camera.prototype.follow = function(object, fudgeVector) {
  // Look at and follow the object (in tick())
  this.animation = {
    type: "follow",
    object: object,
    fudge: fudgeVector
  };
}
Camera.prototype.rotateAbout =
function(object, axis, angularVelocity, fudgeVector) {
  // Rotate about the object (in tick())
  this.animation = {
    type: "rotateAbout",
    object: object,
    axis: axis.slice(),
    angularVelocity: angularVelocity,
    fudge: fudgeVector
  };
}
Camera.prototype.interactiveRotate =
function(object, axis, angularAcceleration, angularFrictionAcceleration,
    maxAngularVelocity, fudgeVector) {
  this.animation = {
    type: "interactiveRotate",
    object: object,
    axis: axis.slice(),
    angularAcceleration: angularAcceleration,
    angularFrictionAcceleration: angularFrictionAcceleration,
    maxAngularVelocity: maxAngularVelocity,
    angularVelocity: 0.0,
    angularDisplacement: 0.0,
    initialPosition: this.position,
    fudge: fudgeVector
  };
}
Camera.prototype.chase = function(object, fudgeDisplacement) {
  // Simply chase the object by matching our position to its position
  this.animation = {
    type: "chase",
    object: object,
    fudgeDisplacement: fudgeDisplacement
  };
}
Camera.prototype.transitionTo = function(camera, stepFunction, callback) {
  // TODO
}
Camera.prototype.stopAnimation = function() {
  this.animation = undefined;
}
Camera.prototype.rotateCounterClockwise = function() {
  // Have the camera rotate left for the next tick
  this.animation.rotateCounterClockwise = true;
}
Camera.prototype.rotateClockwise = function() {
  // Have the camera rotate left for the next tick
  this.animation.rotateClockwise = true;
}
Camera.prototype.tick = function(dt) {
  if (typeof this.animation == 'undefined') {
    return;
  }
  // Animate the camera
  switch (this.animation.type) {
    case 'follow':
      this.lookAtSmooth(this.animation.object, this.animation.fudge);
      break;
    case 'rotateAbout':
      // FIXME: Don't forget the position; we don't want any rounding errors
      // here. Store an initial position and rotate that about the axis to
      // compute the current position.
      // Calculate the angle to rotate
      var angularDisplacement = this.animation.angularVelocity * dt;
      var transformationStack = new TransformationStack();
      // Rotate the camera's position around the given axis (in the object's
      // space)
      transformationStack.push(
          quatToMatrix(quat(this.animation.axis, angularDisplacement)));
      // Translate the origin to the object's space
      transformationStack.push(
          translate(scale(-1, add(this.animation.fudge,
                this.animation.object.getWorldPosition()))));

      // Apply the transformations to the camera position
      this.position =
        vec3(mult(vec4(this.position), transformationStack.peek()));

      // Look at the object
      this.lookAtSmooth(this.animation.object, this.animation.fudge);

      break;
    case 'interactiveRotate':
      if (this.animation.rotateCounterClockwise) {
        // Apply positive angular acceleration (from the user)
        this.animation.angularVelocity = Math.min(
            this.animation.angularVelocity +
            this.animation.angularAcceleration * dt,
            this.animation.maxAngularVelocity);
        this.animation.rotateCounterClockwise = false;
      } else if (this.animation.rotateClockwise) {
        // Apply negative angular acceleration (from the user)
        this.animation.angularVelocity = Math.max(
            this.animation.angularVelocity -
            this.animation.angularAcceleration * dt,
            -this.animation.maxAngularVelocity);
        this.animation.rotateClockwise = false;
      } else {
        // Apply angular acceleration due to "friction"
        if (this.animation.angularVelocity > 0.0) {
          this.animation.angularVelocity = Math.max(
              this.animation.angularVelocity -
              this.animation.angularFrictionAcceleration * dt,
              0.0);
        } else if (this.animation.angularVelocity < 0.0) {
          this.animation.angularVelocity = Math.min(
              this.animation.angularVelocity +
              this.animation.angularFrictionAcceleration * dt,
              0.0);
        }
      }
      // TODO: Update the angular displacement from the calculated angular
      // velocity
      this.animation.angularDisplacement += this.animation.angularVelocity * dt;
      // TODO: Wrap the angular displacement aronud 2 PI
      // FIXME: The math in here only works in world space; it probably breaks
      // for nested objects
      // FIXME: I'm not even bothering to translate into the object's space...
      // TODO: Compute the current position from the angular displacement
      this.position =
        vec3(mult(vec4(this.animation.initialPosition),
              quatToMatrix(quat(this.animation.axis,
                  this.animation.angularDisplacement))));

      this.lookAtSmooth(this.animation.object, this.animation.fudge, 2);
      break;
    case 'chase':
      // Simply follow the object's position by changing our position
      this.position =
        add(this.animation.fudgeDisplacement, this.animation.object.position);
      this.lookAtSmooth(this.animation.object);
      break;
  }
}

//------------------------------------------------------------
// Prototype for transformation stacks
//------------------------------------------------------------
/* NOTE: This object is used in lieu of using the call stack to remember
 * transformations. Instead of passing matricies, we pass a reference to this
 * stack. The advantages of this approach are probably just a matter of taste.
 *
 * Javascript doesn't have very good support for the RAII idiom, so pairing
 * matrix push with pop is a PITA. Oh well?
 */
var TransformationStack = function() {

  this.stack = [ scalem(1.0, 1.0, 1.0) ];  // There should be an ident()
}
TransformationStack.prototype.push = function(transform) {
  var newTransform = mult(this.peek(), transform);
  this.stack.push(newTransform);
}
TransformationStack.prototype.peek = function() {
  return this.stack[this.stack.length - 1];
}
TransformationStack.prototype.pop = function() {
  return this.stack.pop();
}
TransformationStack.prototype.size = function() {
  return this.stack.length;
}
TransformationStack.prototype.unwind = function(size) {
  while (this.stack.length > size)
    this.stack.pop();
}

//------------------------------------------------------------
// Prototype for quaternions
//------------------------------------------------------------
// TODO: Get a better geometry library
function quat(axis, angle) {
  if (Array.isArray(axis)) {
    if (axis.length == 3) {
      // Build the quaternion from axis and angle
      return vec4(
          axis[0] * Math.sin(angle / 2),
          axis[1] * Math.sin(angle / 2),
          axis[2] * Math.sin(angle / 2),
          Math.cos(angle / 2));
    } else {
      throw "quat(): quaternion axis must be a vec3";
    }
  } else {
    // NOTE: I stole this clever bit from Edward Angel's geometry library...
    var result = _argumentsToArray( arguments );
    switch (result.length) {
      case 0: result.push(0.0);
      case 1: result.push(0.0);
      case 2: result.push(0.0);
      case 3: result.push(1.0);
    }
    return result;
  }
}
function qmult(q, r) {
  return quat(
      q[3] * r[0] + q[0] * r[3] + q[1] * r[2] - q[2] * r[1],
      q[3] * r[1] - q[0] * r[2] + q[1] * r[3] + q[2] * r[0],
      q[3] * r[2] + q[0] * r[1] - q[1] * r[0] + q[2] * r[3],
      q[3] * r[3] - q[0] * r[0] - q[1] * r[1] - q[2] * r[2]
      );
}
function qconjugate(q) {
  if (!Array.isArray(q) || q.length != 4)
    throw "qconjugate(): the quaternion parameter must be a vec4";

  var result = q.slice();  // Deep copy

  for (var i = 0; i <= 2; ++i) {
    result[i] = -result[i];  // Conjugate simply negates the vector part
  }

  return result;
}
function qinverse(q) {
  if (!Array.isArray(q) || q.length != 4)
    throw "qinverse(): the quaternion parameter must be a vec4";

  return scale(1 / dot(q,q),qconjugate(q));
}
function quatToMatrix(q) {
  var result = mat4(
1-2 * q[1] * q[1]-2 * q[2] * q[2], 2 * q[0] * q[1]-2 * q[3] * q[2], 2 * q[0] * q[2]+2 * q[3] * q[1], 0,
2 * q[0] * q[1]+2 * q[3] * q[2], 1-2 * q[0] * q[0]-2 * q[2] * q[2], 2 * q[1] * q[2]-2 * q[3] * q[0], 0,
2 * q[0] * q[2]-2 * q[3] * q[1], 2 * q[1] * q[2]+2 * q[3] * q[0], 1-2 * q[0] * q[0]-2 * q[1] * q[1], 0,
0, 0, 0, 1
      );
  result.matrix = true;

  return result;
}
var quatFromVectors = function(u, v) {
  // From <http://lolengine.net/blog/2013/09/18/beautiful-maths-quaternion-from-vectors>
  var u_n = normalize(u);
  var v_n = normalize(v);
  var w = cross(u_n, v_n);
  var q = vec4(w[0], w[1], w[2], 1.0 + dot(u_n, v_n));
  return normalize(q);
}

function reflection(v, n) {
  if (dot(v,n) > 0) {
    // Don't reflect if the vector and normal are already in the same direction
    return v;
  }
  return subtract(v, scale(2 * dot(v,n),n));
}

function elasticCollisionReflection(u, v, p, q) {
  // TODO: Account for ball mass.
  var displacement = subtract(p, q);
  return subtract(u, scale(dot(subtract(u, v), displacement) /
        dot(displacement, displacement), displacement));
}
function collisionDisplacement(p, q, r) {
  var displacementVector = subtract(p, q);
  var displacement = length(displacementVector);
  return scale((2 * r - displacement) /
      (2 * displacement), displacementVector);
}

//------------------------------------------------------------
// Prototype for polygons (for use with the Separating Axis
// Theorem algorithm)
// See:
// <https://en.wikipedia.org/wiki/Hyperplane_separation_theorem#Use_in_collision_detection>
//------------------------------------------------------------

var Polygon = function(points) {
  this.points = points.slice();
}
Polygon.prototype.checkCollision = function(other) {
  // Iterate through all of our faces in order to try to find a separating axis
  // between these two objects
  var collision = true;
  var collidedEdges = [];
  for (var i = 0; i < this.points.length; ++i) {
    var a = this.points[i];
    var b = this.points[(i+1)%this.points.length];
    // Project all of the points (for both shapes) onto the normal for
    // this face to get the end points
    var abPerp = normalize(cross(vec3(subtract(b, a)),
          vec3(0.0, 0.0, 1.0)).slice(0,2));
    // Draw abPerp for debugging
    var midpoint = add(scale(0.5, a), scale(0.5, b));
    debug.drawLine(vec3(midpoint[0], midpoint[1], BALL_RADIUS+0.005),
              add(vec3(midpoint[0], midpoint[1], BALL_RADIUS+0.005),
                vec3(abPerp[0], abPerp[1], 0.0)));
    // TODO: I can cache this result for the cushions
    var selfProject = this.project(abPerp);
    var otherProject = other.project(abPerp);
    // TODO: Examine the projections to see if we found a separating axis
    if (selfProject[1] < otherProject[0]) {
      // We found a separating axis; the objects do not collide
      collision = false;
      break;
    } else if (otherProject[1] < selfProject[0]) {
      // We found a separating axis; the objects do not collide
      collision = false;
      break;
    }
    // Now we must determine which edges are actually collided with
    // NOTE: The edge we are considering is always selfProject[1], because the
    // normal is rotated to point in the positive X direction and our normals
    // should always point outwards (as long as our polygons are wound
    // properly).
    if ((otherProject[0] < selfProject[1]) &&
        (otherProject[1] > selfProject[1])) {
      // Assuming that we do not find a separating axis, this edge must collide
      // with the object
      collidedEdges.push([a, b]);
    }
  }
  if (!collision) {
    return false;
  }
  // We could not find any separating axis, so the objects must collide
  return collidedEdges;
}
Polygon.prototype.project = function(normal) {
  // roject all of our points onto the given normal and return the resulting
  // line (in one-dimensional space)

  // Rotate our points so that the line corresponds with the X-axis. We could
  // use dot products to project our points, but we want them to align with an
  // axis for easy output.
  var angle = Math.atan2(normal[1], normal[0]);
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  // NOTE: We don't actually need to project here. We do so anyway for clarity.
  var projected = this.mult(mult(mat2(1.0, 0.0,  // Project
                                      0.0, 0.0),
                                 mat2( c, s,     // Rotate
                                      -s, c)));

  var result = vec2();
  // Find the min and max points of the projection
  result[0] = projected.points[0][0];
  result[1] = projected.points[0][0];
  for (var i = 1; i < projected.points.length; ++i) {
    if (projected.points[i][0] < result[0]) {
      result[0] = projected.points[i][0];  // New minimum found
    } else if (projected.points[i][0] > result[1]) {
      result[1] = projected.points[i][0];  // New maximum found
    }
  }

  return result;
}
Polygon.prototype.mult = function(matrix) {
  // Apply a matrix transformation to our points and return the resulting
  // polygon
  var transformedPoints = [];
  for (var i = 0; i < this.points.length; ++i) {
    transformedPoints.push(mult(this.points[i], matrix));
  }
  if (det(matrix) < 0.0) {
    // The transformation changed the polygon edge winding; we must reverse the
    // array to correct it
    transformedPoints = transformedPoints.reverse();
  }
  return new Polygon(transformedPoints);
}
Polygon.prototype.drawDebug = function() {
  // Draw the polygon hovering over the billiard table (for debugging only)
    for (var i = 0; i < this.points.length; ++i) {
      debug.drawLine(
          vec3(this.points[i][0], this.points[i][1], BALL_RADIUS+0.005),
          vec3(this.points[(i+1)%this.points.length][0],
            this.points[(i+1)%this.points.length][1], BALL_RADIUS+0.005));
    }
}
var Circle = function(point, radius) {
}

// Table cushin positions for collision detection (values from the model)
var CUSHIONS = [];
var NORTHERN_CUSHIONS = [];
var SOUTHERN_CUSHIONS = [];
var EASTERN_CUSHIONS = [];
var WESTERN_CUSHIONS = [];
// The test cushion is very useful
/*
var TEST_CUSHION = new Polygon(
[ vec2(-2.5, 0.0), vec2(-2.0, -0.5), vec2(-1.5, 0.0), vec2(-2.0, 0.5) ] );
TEST_CUSHION = TEST_CUSHION.mult(mat2(1.0,  0.0,
                                      0.0, -1.0));
CUSHIONS.push(TEST_CUSHION);
WESTERN_CUSHIONS.push(TEST_CUSHION);
*/
var SOUTHEAST_CUSHION_RIGHT_BACK = vec2(1.3362, -83.0000E-2);
var SOUTHEAST_CUSHION_RIGHT_CORNER = vec2(1.08992, -58.50002E-2);
var SOUTHEAST_CUSHION_LEFT_CORNER = vec2(7.45926E-2, -58.50002E-2);
var SOUTHEAST_CUSHION_LEFT_BACK = vec2(0.0, -83.0000E-2);
var SOUTHEAST_CUSHION = new Polygon( [ SOUTHEAST_CUSHION_RIGHT_BACK,
                                       SOUTHEAST_CUSHION_RIGHT_CORNER,
                                       SOUTHEAST_CUSHION_LEFT_CORNER,
                                       SOUTHEAST_CUSHION_LEFT_BACK ] );
CUSHIONS.push(SOUTHEAST_CUSHION);
SOUTHERN_CUSHIONS.push(SOUTHEAST_CUSHION);

// The right cushion is mirrored about the Y-axis
var EAST_CUSHION_BOTTOM_BACK = vec2(1.4365, -76.8976E-2);
var EAST_CUSHION_BOTTOM_CORNER = vec2(1.17074, -50.41774E-2);
var EAST_CUSHION_TOP_CORNER = mult(EAST_CUSHION_BOTTOM_CORNER,
                                    mat2(1.0,  0.0,
                                         0.0, -1.0));
var EAST_CUSHION_TOP_BACK = mult(EAST_CUSHION_BOTTOM_BACK,
                                  mat2(1.0,  0.0,
                                       0.0, -1.0));
var EAST_CUSHION = new Polygon( [ EAST_CUSHION_TOP_BACK,
                                  EAST_CUSHION_TOP_CORNER,
                                  EAST_CUSHION_BOTTOM_CORNER,
                                  EAST_CUSHION_BOTTOM_BACK ] );
CUSHIONS.push(EAST_CUSHION);
EASTERN_CUSHIONS.push(EAST_CUSHION);

// All other cushins are mirrors of the preceding cushins
var SOUTHWEST_CUSHION = SOUTHEAST_CUSHION.mult(mat2(-1.0, 0.0,
                                                     0.0, 1.0));
CUSHIONS.push(SOUTHWEST_CUSHION);
SOUTHERN_CUSHIONS.push(SOUTHWEST_CUSHION);
var NORTHEAST_CUSHION = SOUTHEAST_CUSHION.mult(mat2(1.0,  0.0,
                                                    0.0, -1.0));
NORTHERN_CUSHIONS.push(NORTHEAST_CUSHION);
CUSHIONS.push(NORTHEAST_CUSHION);
var NORTHWEST_CUSHION = SOUTHEAST_CUSHION.mult(mat2(-1.0,  0.0,
                                                     0.0, -1.0));
NORTHERN_CUSHIONS.push(NORTHWEST_CUSHION);
CUSHIONS.push(NORTHWEST_CUSHION);
var WEST_CUSHION = EAST_CUSHION.mult(mat2(-1.0,  0.0,
                                           0.0,  1.0));
CUSHIONS.push(WEST_CUSHION);
WESTERN_CUSHIONS.push(WEST_CUSHION);

// Table pocket positions for collision detection (values from the model)
POCKET_DIAMETER = 19.377E-2;
POCKET_RADIUS = POCKET_DIAMETER / 2;
POCKET_BOTTOM = -10.1446E-2;
POCKETS = [];
SOUTHEAST_POCKET = vec2(1.20688 ,-62.29423E-2);
POCKETS.push(SOUTHEAST_POCKET);
SOUTH_POCKET = vec2(0.0, -67.94704E-2);
POCKETS.push(SOUTH_POCKET);
// The rest of the pockets are mirrored from these two pockets
var SOUTHWEST_POCKET = mult(SOUTHEAST_POCKET,
                            mat2(-1.0, 0.0,
                                  0.0, 1.0));
POCKETS.push(SOUTHWEST_POCKET);
var NORTHEAST_POCKET = mult(SOUTHEAST_POCKET,
                            mat2(1.0,  0.0,
                                 0.0, -1.0));
POCKETS.push(NORTHEAST_POCKET);
var NORTHWEST_POCKET = mult(SOUTHEAST_POCKET,
                            mat2(-1.0,  0.0,
                                  0.0, -1.0));
POCKETS.push(NORTHWEST_POCKET);
var NORTH_POCKET = mult(SOUTH_POCKET,
                        mat2(-1.0,  0.0,
                              0.0, -1.0));
POCKETS.push(NORTH_POCKET);

function pocketFromName(pocketName) {
  switch (pocketName) {
    case 'SOUTHEAST_POCKET':
      return SOUTHEAST_POCKET;
    case 'SOUTH_POCKET':
      return SOUTH_POCKET;
    case 'SOUTHWEST_POCKET':
      return SOUTHWEST_POCKET;
    case 'NORTHEAST_POCKET':
      return NORTHEAST_POCKET;
    case 'NORTHWEST_POCKET':
      return NORTHWEST_POCKET;
    case 'NORTH_POCKET':
      return NORTH_POCKET;
    default:
      throw "Unknown pocket name: " + pocketName;
  }
}

function linePlaneIntersection(linePoint, lineVector, planePoint, planeNormal) {
  var denominator = dot(lineVector, planeNormal);
  if (denominator == 0.0) {
    return undefined;  // The line is parallel to the plane
  }
  var intersectionPoint = add(scale(dot(subtract(planePoint, linePoint),
          planeNormal) / denominator, lineVector), linePoint);
  intersectionPoint[3] = 1.0;

  return intersectionPoint;
}
function lineCircleIntersection(line, center, radius)
{
  // First, determine which points on the line are already inside the circle,
  // and handle the case where they're both inside the circle.
  var insidePoint;
  var outsidePoint;
  if (length(subtract(center, line[0])) < radius) {
    insidePoint = line[0];
    outsidePoint = line[1];
  }
  if (length(subtract(center, line[1])) < radius) {
    if (typeof insidePoint != 'undefined') {
      // That was easy; the line is entirely within the circle
      return line.slice();
    }
    insidePoint = line[1];
    outsidePoint = line[0];
  }
  var bothOutside = typeof insidePoint == 'undefined';

  var v = normalize(subtract(line[1], line[0]));
  var v_x = v[0];
  var v_y = v[1];
  var s = line[0];
  var s_x = s[0];
  var s_y = s[1];
  var r = radius;
  var c_x = center[0];
  var c_y = center[1];

  // We first find the roots for the ray intersecting the circle by solving the
  // quadratic equation that arises from the circle-ray intersection problem.
  var a = v_x * v_x + v_y * v_y;
  var b = 2 * (s_x * v_x + s_y * v_y - c_x * v_x - c_y * v_y);
  var c = s_x * s_x + s_y * s_y - 2 * (c_x * s_x + c_y * s_y) + c_x * c_x + c_y * c_y - r * r;
  var discriminant = b * b - 4 * a*c;
  if (discriminant < 0.0) {
    return undefined;
  } else if (discriminant == 0.0) {
    // TODO: Grazing hits aren't very interesting for us either...
    return undefined;
  }
  // The discriminant is negative, so we have two intersecting points along
  // the array
  var t_0 = (-b + Math.sqrt(discriminant)) / (2 * a);
  var t_1 = (-b - Math.sqrt(discriminant)) / (2 * a);

  var p_0 = add(s, scale(t_0, v));
  var p_1 = add(s, scale(t_1, v));

  if (bothOutside) {
    return [p_0, p_1];  // The line goes in one side and out the other
  }
  // To determine which point on the circle is between our line points,
  // consider that such a point must be closest to the outside point on our
  // line
  if (length(subtract(p_0, outsidePoint)) <
      length(subtract(p_1, outsidePoint))) {
    return [p_0, insidePoint];
  } else {
    return [p_1, insidePoint];
  }
}

var AudioPool = function() {
  this.pool = new Map();
}
AudioPool.prototype.loadSoundFile = function(soundFile) {
  if (!this.pool.has(soundFile)) {
    var soundPool = [];
    // Fill the pool of Audio objects for this sound file
    for (var i = 0; i < AUDIO_OBJECTS_PER_SOUND; ++i) {
      soundPool.push(new Audio(soundFile));
    }
    this.pool.set(soundFile, soundPool);
  }
}
AudioPool.prototype.playSound = function(soundFile) {
  // TODO: Prevent the same sound playing on top of itself

  // Check for available Audio objects in the pool for this sound
  var soundPool = this.pool.get(soundFile);
  if (soundPool.length > 0) {
    // Play the sound and remove the Audio object from the sound pool
    var audioObject = soundPool.pop();
    audioObject.play();
    audioObject.onended = function() {
      // Add the Audio object back to the pool when we're done with it
      soundPool.push(this);
    };
  }
}


//------------------------------------------------------------
// Prototype for tool to draw shapes for debugging graphics
//------------------------------------------------------------
var GraphicsDebug = function(shader) {
  if (!ENABLE_DEBUG)
    return;
  this.lines = [];
  this.linesUpdated = false;

  this.shaderProgram = shader;
}
GraphicsDebug.prototype.drawLine = function(a, b) {
  if (!ENABLE_DEBUG)
    return;
  // FIXME: This should use a set to avoid slowing everything down when adding
  // too many lines.
  this.lines.push(a);
  this.lines.push(b);
  this.linesUpdated = true;
  if (typeof this.vertexBuffer == 'undefined') {
    this.vertexBuffer = gl.createBuffer();
  }
}
GraphicsDebug.prototype.draw = function(gl, worldView, projection) {
  if (!ENABLE_DEBUG)
    return;
  if (this.lines.length <= 0) {
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  if (this.linesUpdated) {
    // Upload the new line data to the vertex buffer
    var data = new Float32Array(this.lines.length * 3);
    for (var i = 0; i < this.lines.length; ++i) {
      data[i * 3 + 0] = this.lines[i][0];
      data[i * 3 + 1] = this.lines[i][1];
      data[i * 3 + 2] = this.lines[i][2];
    }
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  gl.useProgram(this.shaderProgram);
  gl.uniformMatrix4fv(this.shaderProgram.uniforms.modelViewMatrix, false,
      flatten(worldView.peek()));
  gl.uniformMatrix4fv(this.shaderProgram.uniforms.projectionMatrix, false,
      flatten(projection.peek()));
  gl.vertexAttribPointer(this.shaderProgram.attributes.vertexPosition,
                         3,         // vec3
                         gl.FLOAT,  // 32bit floating point
                         false,     // Don't normalize values
                         0,         // Tightly packed
                         0);        // Position starts at the first value stored
  gl.drawArrays(gl.LINES, 0, this.lines.length);
}

// From <https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math/random>
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

var takeRandomFromSet = function(s) {
  var i = getRandomInt(0, s.size);
  var result = (Array.from(s))[i];
  s.delete(result);
  return result;
}

var isStriped = function(ballNumber) {
  switch (ballNumber) {
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15:
      return true;
  }
  return false;
}

// Some constants for text
REPLAY_TEXTURE = "common/replay_text_sdf.png";
//REPLAY_TEXTURE = "common/billiard_ball_10_sdf_near.png";
//REPLAY_TEXTURE = "common/menu_text_sdf.png";
//REPLAY_TEXTURE = "common/test.png";  // XXX
REPLAY_TEXTURE_WIDTH = 4096.0;
REPLAY_TEXTURE_HEIGHT = 512.0;
REPLAY_COLOR = vec3(0.7, 0.0, 0.0);
REPLAY_BLINK_INTERVAL = 0.5;

FOUL_TEXTURE = "common/foul_text_sdf.png";
FOUL_TEXTURE_WIDTH = 2048.0;
FOUL_TEXTURE_HEIGHT = 512.0;
FOUL_COLOR = REPLAY_COLOR.slice();

NEXT_BALL_TEXTURE = "common/next_ball_text_sdf.png";
NEXT_BALL_TEXTURE_WIDTH = 4096.0;
NEXT_BALL_TEXTURE_HEIGHT = 512.0;
NEXT_BALL_COLOR = vec3(1.0, 1.0, 1.0);

PLAYER_ONE_TEXTURE = "common/player_one_text_sdf.png";
PLAYER_ONE_TEXTURE_WIDTH = 4096.0;
PLAYER_ONE_TEXTURE_HEIGHT = 512.0;
PLAYER_ONE_COLOR = vec3(1.0, 1.0, 1.0);

PLAYER_TWO_TEXTURE = "common/player_two_text_sdf.png";
PLAYER_TWO_TEXTURE_WIDTH = 4096.0;
PLAYER_TWO_TEXTURE_HEIGHT = 512.0;
PLAYER_TWO_COLOR = vec3(1.0, 1.0, 1.0);

PLAYER_ONE_WINS_TEXTURE = "common/player_one_wins_text_sdf.png";
PLAYER_ONE_WINS_TEXTURE_WIDTH = 4096.0;
PLAYER_ONE_WINS_TEXTURE_HEIGHT = 512.0;
PLAYER_ONE_WINS_COLOR = vec3(1.0, 1.0, 1.0);

PLAYER_TWO_WINS_TEXTURE = "common/player_two_wins_text_sdf.png";
PLAYER_TWO_WINS_TEXTURE_WIDTH = 4096.0;
PLAYER_TWO_WINS_TEXTURE_HEIGHT = 512.0;
PLAYER_TWO_WINS_COLOR = vec3(1.0, 1.0, 1.0);

PRESS_SPACEBAR_TEXTURE = "common/press_spacebar_text_sdf.png";
PRESS_SPACEBAR_TEXTURE_WIDTH = 4096.0;
PRESS_SPACEBAR_TEXTURE_HEIGHT = 512.0;
PRESS_SPACEBAR_COLOR = REPLAY_COLOR;
PRESS_SPACEBAR_BLINK_INTERVAL = REPLAY_BLINK_INTERVAL;

// The flat n' rectangular things we want to draw on the HUD and menu
var Text = function(texture, textureWidth, textureHeight, color) {
  this.texture = assets[texture];
  this.color = color;

  // TODO: Orientation? I don't need that yet.
  this.position = vec2(0.0, 0.0);  // Position of the center of the tile
  this.scale = 1.0;

  this.shader = assets["text"];

  // TODO: Send our verticies, along with UV coordinates, to the GPU. We have
  // to be careful to scale the Y-dimension of our verticies to a length of
  // 1.0, to ease the placement of text.
  //
  // The format for each vertex is
  //
  //    _____ _____ _____ _____ _____
  //   | p_x | p_y | p_z | t_u | t_v |
  //   '-----'-----'-----'-----'-----'
  //         position       texture
  //
  var tileAspect = textureWidth / textureHeight;
  var verticies = [
    -(tileAspect / 2), -0.5, -1.0, 0.0, 0.0,  // Bottom left
    tileAspect / 2, -0.5, -1.0, 1.0, 0.0,  // Bottom right
    tileAspect / 2, 0.5, -1.0, 1.0, 1.0,  // Top right
    -(tileAspect / 2), 0.5, -1.0, 0.0, 1.0  // Top left
  ];
  /*
  var verticies = [
    -1.0, -1.0, 0.0, 0.0, 0.0,  // Bottom left
    1.0, -1.0, 0.0, 1.0, 0.0,  // Bottom right
    1.0, 1.0, 0.0, 1.0, 1.0,  // Top right
    -1.0, 1.0, 0.0, 0.0, 1.0,  // Top left
  ];
  */
  var elements = [
    0, 1, 2,  // Bottom right triangle
    2, 3, 0  // Top left triangle
  ];
  var elementsUint = new Int16Array(elements.length);
  for (var i = 0; i < elements.length; ++i) {
    elementsUint[i] = elements[i];
  }
  this.vertexAttributesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexAttributesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(verticies), gl.STATIC_DRAW);
  this.vertexElementsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexElementsBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementsUint, gl.STATIC_DRAW);
}
Text.prototype.draw = function(gl, modelWorld, worldView, projection) {
  var initialSize = modelWorld.size();
  // Translate the tile into its position
  modelWorld.push(translate(vec3(this.position)));
  // Scale the tile proportionally
  modelWorld.push(scalem(this.scale, this.scale, this.scale));

  // Enable alpha blending for text cutout
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.enable(gl.BLEND);

  // Use our shader program
  gl.useProgram(this.shader);
  // Use our texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.uniform1i(this.shader.uniforms.textureSampler, 0);
  // Use our projection matrix and modelView matricies
  gl.uniformMatrix4fv(this.shader.uniforms.modelViewMatrix, false,
      flatten(mult(worldView.peek(), modelWorld.peek())));
  gl.uniformMatrix4fv(this.shader.uniforms.projectionMatrix, false,
      flatten(projection.peek()));
  // Pass the text color to the shader
  gl.uniform3f(this.shader.uniforms.color,
      this.color[0], this.color[1], this.color[2]);
  // Use our verticies
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexAttributesBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexElementsBuffer);
  gl.enableVertexAttribArray(this.shader.attributes.vertexPosition);
  gl.enableVertexAttribArray(this.shader.attributes.vertexUV);
  gl.vertexAttribPointer(loadingScreen.shader.attributes.vertexPosition,
    3,         // vec3
    gl.FLOAT,  // 32bit floating point
    false,     // Don't normalize values
    4 * 5,     // Stride for five 32-bit values per-vertex
    4 * 0);    // Position starts at the first value stored
  gl.vertexAttribPointer(loadingScreen.shader.attributes.vertexUV,
    2,         // vec2
    gl.FLOAT,  // 32bit floating point
    false,     // Don't normalize values
    4 * 5,     // Stride for five 32-bit values per-vertex
    4 * 3);    // Texture coordinate starts at the forth value stored
  // Draw our rectangle
  gl.drawElements(gl.TRIANGLES, 6 /* two triangles */, gl.UNSIGNED_SHORT, 0);

  // Clean up WebGL state
  gl.disable(gl.BLEND);

  // Return the model-world transformation stack to its original state
  modelWorld.unwind(initialSize);
}

var HeadsUpDisplay = function() {
  this.state = 'idle';

  this.text = {};
  this.text.nextBall = new Text(NEXT_BALL_TEXTURE, NEXT_BALL_TEXTURE_WIDTH,
      NEXT_BALL_TEXTURE_HEIGHT, NEXT_BALL_COLOR);
  this.text.playerOne = new Text(PLAYER_ONE_TEXTURE, PLAYER_ONE_TEXTURE_WIDTH,
      PLAYER_ONE_TEXTURE_HEIGHT, PLAYER_ONE_COLOR);
  this.text.playerTwo = new Text(PLAYER_TWO_TEXTURE, PLAYER_TWO_TEXTURE_WIDTH,
      PLAYER_TWO_TEXTURE_HEIGHT, PLAYER_TWO_COLOR);
  this.text.playerOneWins = new Text(PLAYER_ONE_WINS_TEXTURE,
      PLAYER_ONE_WINS_TEXTURE_WIDTH, PLAYER_ONE_WINS_TEXTURE_HEIGHT, PLAYER_ONE_WINS_COLOR);
  this.text.playerTwoWins = new Text(PLAYER_TWO_WINS_TEXTURE,
      PLAYER_TWO_WINS_TEXTURE_WIDTH, PLAYER_TWO_WINS_TEXTURE_HEIGHT,
      PLAYER_TWO_WINS_COLOR);
  this.text.replay = new Text(REPLAY_TEXTURE, REPLAY_TEXTURE_WIDTH,
      REPLAY_TEXTURE_HEIGHT, REPLAY_COLOR);
  this.text.foul = new Text(FOUL_TEXTURE, FOUL_TEXTURE_WIDTH,
      FOUL_TEXTURE_HEIGHT, FOUL_COLOR);
  this.text.pressSpacebar = new Text(PRESS_SPACEBAR_TEXTURE,
      PRESS_SPACEBAR_TEXTURE_WIDTH, PRESS_SPACEBAR_TEXTURE_HEIGHT,
      PRESS_SPACEBAR_COLOR);

  // Position the next ball text at the top of the screen in the margin
  this.text.nextBall.position =
    vec2(ORTHO_MARGIN * 0.89, TABLE_MODEL_WIDTH / 2 + ORTHO_MARGIN / 2);
  this.text.nextBall.scale = (ORTHO_MARGIN - HUD_MARGIN) / 2;

  // Position the player texts to the left of the next ball text, on the top of
  // the screen in the margin
  this.text.playerOne.position =
    vec2(-2 * ORTHO_MARGIN, TABLE_MODEL_WIDTH / 2 + ORTHO_MARGIN / 2);
  this.text.playerOne.scale = (ORTHO_MARGIN - HUD_MARGIN) / 2;
  this.text.playerTwo.position =
    vec2(-2 * ORTHO_MARGIN, TABLE_MODEL_WIDTH / 2 + ORTHO_MARGIN / 2);
  this.text.playerTwo.scale = (ORTHO_MARGIN - HUD_MARGIN) / 2;

  // Position the winning player texts in the middle
  this.text.playerOneWins.position = vec2(0.0, 0.0);
  this.text.playerOneWins.scale = TABLE_WIDTH / 2.7;
  this.text.playerTwoWins.position = vec2(0.0, 0.0);
  this.text.playerTwoWins.scale = TABLE_WIDTH / 2.7;
  // Position the press spacebar text just under the winning player text
  this.text.pressSpacebar.position = vec2(0.0, -TABLE_WIDTH / 3);
  this.text.pressSpacebar.scale = TABLE_WIDTH / 5.0;

  // Position our replay text in the top left of the screen in the margin
  this.text.replay.position =
    vec2(-ORTHO_MARGIN, TABLE_MODEL_WIDTH / 2 + ORTHO_MARGIN / 2);
  this.text.replay.scale = ORTHO_MARGIN - HUD_MARGIN;

  // Position the foul text smack-dab in the middle of the screen, so that we
  // can irritate the player
  this.text.foul.position = vec2(0.0, 0.0);
  this.text.foul.scale = TABLE_WIDTH / 2.0;

  this.camera = new Camera(
      { type: 'orthographic',
        left: HEADS_UP_DISPLAY_CAMERA_LEFT,
        right: HEADS_UP_DISPLAY_CAMERA_RIGHT,
        bottom: HEADS_UP_DISPLAY_CAMERA_BOTTOM,
        top: HEADS_UP_DISPLAY_CAMERA_TOP,
        near: HEADS_UP_DISPLAY_CAMERA_NEAR,
        far: HEADS_UP_DISPLAY_CAMERA_FAR },
      HEADS_UP_DISPLAY_CAMERA_POSITION,
      HEADS_UP_DISPLAY_CAMERA_ORIENTATION);

  this.timeElapsed = 0.0;
}
HeadsUpDisplay.prototype.idle = function() {
  this.state = 'idle';
}
HeadsUpDisplay.prototype.nextBall = function(ballNumber) {
  this.ball = new BilliardBall(ballNumber);
  // Draw the ball at the top of the screen, in the space we have set aside as
  // margin, and scale it to something around the size of a beach ball.
  this.ball.position =
    vec3(TABLE_MODEL_LENGTH / 2 - BALL_DIAMETER,
        TABLE_MODEL_WIDTH / 2 + ORTHO_MARGIN / 2, 0.0);
  this.ball.scale = ORTHO_MARGIN / 2 - HUD_MARGIN / 2;
  // NOTE: Because of the orthographic camera, the shader will interpret the
  // projection matrix and think that our ball is very far away. We want to use
  // near textures for clarity, so we tell the ball to force near textures.
  this.ball.forceNearTexture();
  // Keep our ball drawing while idle
  this.ball.setIdleDrawing();

  // Notify our state machine
  this.state = 'startNextBall';
}
HeadsUpDisplay.prototype.player = function(playerNumber) {
  this.playerNumber = playerNumber;
}
HeadsUpDisplay.prototype.replay = function() {
  this.state = 'startReplay';
}
HeadsUpDisplay.prototype.foul = function() {
  this.state = 'startFoul';
}
HeadsUpDisplay.prototype.playerWins = function(playerNumber) {
  this.state = 'startPlayerWins';
  this.winningPlayerNumber = playerNumber;
}
HeadsUpDisplay.prototype.tick = function(dt) {
//  this.ball.tick();  // NOTE: pointless; our ball doesn't have any smarts
  switch (this.state) {
    case 'idle':
      break;
    case 'startNextBall':
      this.state = 'nextBall';
    case 'nextBall':
      this.timeElapsed += dt;
      break;
    case 'startReplay':
    case 'replay':
      break;
  }
}
HeadsUpDisplay.prototype.draw = function(gl) {
  // The HUD is drawn on top of everything
  gl.depthFunc(gl.ALWAYS);

  // We need to construct our own matrix transformations, since the HUD is
  // not relative to any other object's frame
  // We're drawing in world space; use identity transformation
  var modelWorld = new TransformationStack();
  var worldView = this.camera.worldViewTransformation();
  var projection =
    this.camera.projectionTransformation(canvas.clientWidth /
        canvas.clientHeight);

  switch (this.state) {
    case 'idle':
      break;
    case 'nextBall':
      // Rotate the ball about the y-axis
      this.ball.orientation = quat(vec3(0.0, 1.0, 0.0), this.timeElapsed *
          HUD_NEXT_BALL_ANGULAR_VELOCITY);
      // Our ball should already be in position; we just need to draw it
      this.ball.draw(gl, modelWorld, worldView, projection);
      // TODO: Draw the "Next Ball: " text
      // FIXME: This is replay... bleh
      this.text.nextBall.draw(gl, modelWorld, worldView, projection);
      switch (this.playerNumber) {
        case 1:
          this.text.playerOne.draw(gl, modelWorld, worldView, projection);
          break;
        case 2:
          this.text.playerTwo.draw(gl, modelWorld, worldView, projection);
          break;
        default:
          throw "Unknown player number: " + this.playerNumber;
      }
      break;
    case 'startReplay':
      this.timeElapsed = -dt;  // -dt + dt = 0.0
      this.state = 'replay';
    case 'replay':
      this.timeElapsed += dt;
      // Make the replay text blink
      if (Math.floor(this.timeElapsed / REPLAY_BLINK_INTERVAL)%2 == 0) {
        this.text.replay.draw(gl, modelWorld, worldView, projection);
      }
      break;
    case 'startFoul':
      this.state = 'foul';
    case 'foul':
      this.text.foul.draw(gl, modelWorld, worldView, projection);
      break;
    case 'startPlayerWins':
      this.timeElapsed = -dt;  // -dt + dt = 0.0
      this.state = 'playerWins';
    case 'playerWins':
      this.timeElapsed += dt;
      switch (this.winningPlayerNumber) {
        case 1:
          this.text.playerOneWins.draw(gl, modelWorld, worldView, projection);
          break;
        case 2:
          this.text.playerTwoWins.draw(gl, modelWorld, worldView, projection);
          break;
        default:
          throw "Unknown player number: " + this.winningPlayerNumber;
      }
      // Make the press spacebar text blink
      if (Math.floor(this.timeElapsed / PRESS_SPACEBAR_BLINK_INTERVAL)%2 == 0) {
        this.text.pressSpacebar.draw(gl, modelWorld, worldView, projection);
      }
      break;
  }

  // Clean up the WebGL state
  gl.depthFunc(gl.LESS);
}

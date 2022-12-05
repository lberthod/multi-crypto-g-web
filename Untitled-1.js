// Changing this variable makes the calculation of the player's position go slightly off.
// Set it to 25 for the floor tiles (dots) to be perfectly lined up.
// Give it a go!
var tileScale = 9;

// Game object to supposedly reduce scope chains
function Game(){
	// Game reference for when the this keyword is out of scope
	var game = this;
	// Out of bounds function
	Array.prototype.outOfBounds = function(x, y){
		return x < 0 || y < 0 || x >= this[0].length || y >= this.length;
	}
	// Variable declarations
	this.map = [];
	this.mapSize = 25;
	this.tileScale = tileScale;
	// Player circle of vision.
	this.playerVision = 8;
	this.elements = [];
	// Function that executes when the browser resizes.
	window.onresize = this.resizeViewport = function(initial){
		game.viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
		game.viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		game.windowSize = Math.min(game.viewportWidth, game.viewportHeight);
		// Droid Sans Mono has a ratio of 3:4 (width:height), conveniently.
		game.tileWidth = game.windowSize*.6 / game.tileScale;
		game.tileHeight = game.windowSize*.8 / game.tileScale;
		// The first call to this function is at a point where these functions are not defined.
		if(initial !== true){
			game.updateList(game.tiles);
			game.updateList(game.elements);
			game.updateCamera();
		}
	}
	this.resizeViewport(true);
	// Function for attaching elements to the screen
	this.createElement = function(type, parent, properties){
		var element = document.createElement(type);
		for(var i in properties)element[i] = properties[i];
		parent.appendChild(element);
		return element;
	}
	// Find pythagorean distance, with distance x and y values found
	this.pythagorean = function(dx, dy){
		return Math.sqrt(dx*dx+dy*dy);
	}
	// Change hex value to RGB (in format of e.g. FFFFFF, without #)
	this.toRGB = function(triplet){
		var color = {};
		var sequence = ["red", "green", "blue"];
		var segment;
		var index = 0;
		for(var i = 0; i < triplet.length; i += 2){
			segment = triplet[i]+triplet[i+1];
			color[sequence[index]] = parseInt("0x"+segment);
			index ++;
		}
		return color;
	}
	// Element class for items not bound to the grid (such as the player, enemies, and items)
	this.Element = function(x, y, char, color, classes){
		if(classes === undefined)classes = "";
		this.x = x;
		this.y = y;
		this.char = char;
		this.color = color;
		this.classes = classes;
		this.type = "element";
		// Create onscreen representation
		this.element = game.createElement("div", game.elementContainer, {
			className: classes+" element",
		});
		// Create symbol identification (e.g. "@")
		this.text = game.createElement("div", this.element, {
			className: "inner-text",
			innerHTML: this.char,
		});
		// Add to list of game elements
		game.elements.push(this);
	}
	// Player class
	this.Player = function(x, y){
		var root = this.root = new game.Element(x, y, "@", "#ffffff", "player");
		root.vision = game.playerVision;
		root.visible = true;
		root.visibleTiles = [];
		// Move function
		root.move = function(dx, dy){
			// Get new coordinates
			var tx = root.x+dx;
			var ty = root.y+dy;
			// If tile at destination is walkable:
			if(!game.tileTypes[game.map[ty][tx].char].solid){
				// Set position to destination
				root.x = tx;
				root.y = ty;
				// Raycast at new position
				root.raycast();
			}
			// Align the player and the camera
			game.updateList(game.elements);
			game.updateCamera();
		}
		// Raycasting function
		root.raycast = function(){
			var i,
				angle,
				tile,
				radians,
				x,
				y,
				cos,
				sin;
			// Darken all previously lit tiles
			for(i = 0; i < root.visibleTiles.length; i ++){
				root.visibleTiles[i].visible = false;
				game.updateItem(root.visibleTiles[i]);
			}
			// Clear list of visible tiles
			root.visibleTiles = [];
			root.visibleTiles.length = 0;
			// Illuminate current tile (so we can see the player)
			root.illuminate(root.x, root.y);
			// Main loop; decrease angle increment for accuracy, increase for speed
			for(angle = 0; angle < 360; angle += 3){
				// Get radians from current angle
				radians = angle*Math.PI/180;
				// Save trigonometrical values beforehand
				cos = Math.cos(radians);
				sin = Math.sin(radians);
				// Extend ray outwards; i = 1 so player is not included
				for(i = 1; i < root.vision; i ++){
					// Get rounded coordinates of ray
					x = Math.round(root.x+cos*i);
					y = Math.round(root.y+sin*i);
					// If tile is out of bounds or tile type is opaque, break out of the loop
					if(game.map.outOfBounds(x, y) || game.tileTypes[root.illuminate(x, y).char].opaque)break;
				}
			}
		}
		// Function for illuminating a tile
		root.illuminate = function(x, y){
			var tile = game.map[y][x];
			// Set tile visibility to true
			tile.visible = true;
			// Add tile to visibleTiles list
			root.visibleTiles.push(tile);
			// Recolor the tile to indicate visibility
			game.updateItem(tile);
			// Return the illuminated tile
			return tile;
		}
	}
	// Game start function
	this.start = function(){
		var i;
		var j;
		// Create container (main square)
		this.container = this.createElement("div", document.body, {
			id: "container",
			className: "absolute-center",
		});
		// Create plane on which the visible map rests (is rotated 45 degrees, see CSS)
		this.plane = this.createElement("div", this.container, {
			id: "plane",
		});
		// Colors, class names, and other properties for each tile type
		this.tileTypes = {
			"#": {
				className: "tile wall", 
				color: "#2F4F4F", 
				solid: true, 
				opaque: true
			},
			"+": {
				className: "tile", 
				color: "#A52A2A", 
				solid: true, 
				opaque: true
			},
			"/": {
				className: "tile", 
				color: "#A52A2A", 
				solid: false, 
				opaque: false
			},
			"&middot;": {
				className: "tile floor", 
				color: "#808000", 
				solid: false, 
				opaque: false
			},
			"@": {
				className: "tile player", 
				color: "#ffffff", 
				solid: false, 
				opaque: false
			},
		};
		this.tiles = [];
		// Function for repositioning and recoloring a tile
		this.updateItem = function(item){
			// The item may be a tile or an element not bound to the grid
			var tile = item.tile || item.element;
			// Move the tile to position based on tile size values
			tile.style.left = game.tileWidth*item.x+"px";
			tile.style.top = game.tileHeight*item.y+"px";
			// Change font size based on window size
			tile.style.fontSize = (game.windowSize/game.tileScale)+"px";
			// Change depth to new value
			tile.style.zIndex = game.map.length*game.map[item.y].length-(item.y*game.map.length+item.x);
			// If a tile is under an element, set its opacity to 0% - if not, leave it at 100%
			if(game.player !== undefined && item.type !== "element" && game.player.x === item.x && game.player.y === item.y)tile.style.opacity = "0";
			else tile.style.opacity = "1";
			// If the item is invisible, set its color to black
			if(!item.visible)tile.style.color = "#000";
			else {
				// Color the tile based on distance from the player
				var dist = game.pythagorean(item.x-game.player.x, item.y-game.player.y),
					oldColor = item.color.slice(1, item.color.length),
					oldRgbColor = game.toRGB(oldColor),
					rgbColor = oldRgbColor,
					newColor = "#",
					sequence = ["red", "green", "blue"],
					percent = (1-dist/game.player.vision)*2;
				if(percent > 1)percent = 1;
				for(var i = 0; i < sequence.length; i ++){
					rgbColor[sequence[i]] *= percent;
					rgbColor[sequence[i]] = Math.round(rgbColor[sequence[i]]).toString(16);
					if(rgbColor[sequence[i]].length < 2){
						rgbColor[sequence[i]] = "0"+rgbColor[sequence[i]];
					}
					newColor += rgbColor[sequence[i]];
				}
				// Set the new color value
				tile.style.color = newColor;
			}
		}
		// Update a list of tiles/elements
		this.updateList = function(list){
			for(var i = 0; i < list.length; i ++)this.updateItem(list[i]);
		}
		// Update the camera position (needs help?)
		this.updateCamera = function(){
			var left = ((-game.player.x-.5)*game.tileWidth+game.windowSize/2)+"px";
			var top = ((-game.player.y-.5)*game.tileHeight+game.windowSize/2)+"px";
			game.planeContainer.style.left = left;
			game.planeContainer.style.top = top;
		}
		// Create the plane container for the camera
		this.planeContainer = this.createElement("div", this.plane, {
			className: "plane-container",
			id: "plane-container",
		});
		// Create a container for the tiles (for depth separation)
		this.tileContainer = this.createElement("div", this.planeContainer, {
			className: "plane-container",
			id: "tile-container",
		});
		// Create a container for the elements (for depth separation)
		this.elementContainer = this.createElement("div", this.planeContainer, {
			className: "plane-container",
			id: "element-container",
		});
		// Make some generation variables
		var char, text, tile, tileStyle, tileWidthString, tileHeightString, tileWidth, tileHeight, tileChar, center = Math.floor(this.mapSize/2);
		// Generate a basic map
		for(i = 0; i < this.mapSize; i ++){
			this.map[i] = [];
			for(j = 0; j < this.mapSize; j ++){
				char = "&middot;";
				// If the tile is on the border or is at a certain position but not in the center, make it a wall
				if(j === 0 || i === 0 || j === this.mapSize-1 || i === this.mapSize-1 || j%4 === 0 && i%4 === 0 && !(j === center && i === center))char = "#";
				// Create tile div in the tile container
				tile = this.createElement("div", this.tileContainer, {
					className: this.tileTypes[char].className,
				});
				// Create tile text (centered within containing div)
				text = this.createElement("div", tile, {
					className: "inner-text",
					innerHTML: char,
				});
				// Create tile properties based on tile type
				this.map[i][j] = {tile: tile, char: char, color: this.tileTypes[char].color, solid: this.tileTypes[char].solid, solid: this.tileTypes[char].opaque, x: j, y: i, visible: false};
				// Add to tile list
				this.tiles.push(this.map[i][j]);
			}
		}
		// Create player in center of map
		this.player = new this.Player(center, center).root;
		// Raycast
		this.player.raycast();
		// Update everything!
		this.updateList(this.tiles);
		this.updateItem(this.player);
		this.updateCamera();
	}
	// Key input
	this.keyDown = function(e) {
		switch(e.keyCode){
			case 37:
				game.player.move(-1, 0);
				break;
			case 39:
				game.player.move( 1, 0);
				break;
			case 38:
				game.player.move( 0,-1);
				break;
			case 40:
				game.player.move( 0, 1);
				break;
		}
	};
	this.keyUp = function(e) {};
	document.onkeydown = this.keyDown;
	document.onkeyup = this.keyUp;
}
var game = new Game();
game.start();

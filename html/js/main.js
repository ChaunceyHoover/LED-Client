// DOM element
const jControls = $('#controls');
const jCanvas = $('#leds');
const jColors = $('#colors');
const jEraser = $('#eraser');
const canvas = jCanvas[0];
const controls = jControls[0];
const colorRow = jColors[0];
const width = jCanvas.outerWidth();
const height = jCanvas.outerHeight();
const ctx = canvas.getContext('2d');

// Configure canvas
ctx.canvas.width = width;
ctx.canvas.height = height;

// no poop browsers
if (!canvas.getContext) {
    alert('lole your browser is lame');
    window.location.replace("https://firefox.com/download")
}

// Connect to LED server
var ledSocket = new WebSocket("ws://192.168.1.116:5678/"); // pls don't hack my ip

// mobile friendly time
document.body.addEventListener("touchstart", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);
document.body.addEventListener("touchend", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);
document.body.addEventListener("touchmove", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);

/**
 * Represents the orientation of an LED section. If the direction is `UP`/`1`, then the bottom
 * of the section will represent the start of the LEDs and the top of the shape will represent the end
 */
const Direction = {
    UP: 1,
    RIGHT: 2,
    DOWN: 3,
    LEFT: 4
}

/**
 * Color, as defined by SK6812W (Red, Green, Blue, White)
 */
class Color {
    /**
     * @param {int} r Red component, 0-255 based
     * @param {int} g Green compontent, 0-255 based
     * @param {int} b Blue compontent, 0-255 based
     * @param {int} w White compontent, 0-255 based
     */
    constructor(r=0, g=0, b=0, w=0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.w = w;
    }
    
    /** Default color = Black/Off */
    static default = { r: 0, g: 0, b: 0, w: 0 };

    /** Returns a more easily serialized RGB value
     * @returns An object with `r`, `g`, and `b`. 
     */
    get rgb() {
        return { r: this.r, g: this.g, b: this.b };
    }

    /** 
     * Returns a more easily serialized RGBW value
     * @returnsAn object with `r`, `g`, `b`, and `w`. 
     */
    get rgbw() {
        return { r: this.r, g: this.g, b: this.b, w: this.w };
    }

    /**
     * Sets the color. 
     * 
     * @param {int} r Red component, 0-255 based
     * @param {int} g Green compontent, 0-255 based
     * @param {int} b Blue compontent, 0-255 based
     * @param {int} w White compontent, 0-255 based
     */
    set(r=0, g=0, b=0, w=0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.w = w;
    }
}

/**
 * Represents a single LED of an entire LED strip
 */
class LED {
    /**
     * @param {int} indx The index of the LED relative to the entire LED strip
     * @param {Color} color The color of the LED, using SK6812W color format (RGBW)
     */
    constructor(indx=0, color=Color.default) {
        this.index = indx;
        this.color = color;
    }

    /**
     * Sets the index of the LED on the LED strip
     * @param {int} num The new index this LED represnets on the LED strip
     */
    setIndex(num=0) {
        this.num = num;
    }

    /**
     * Sets the color. Note: If you're trying to create a white color, either set RGB to 0 and use the W channel, or
     * set all RGB channels to the same value and it will set the W channel to those values.
     * 
     * @param {int} r Red component, 0-255 based
     * @param {int} g Green compontent, 0-255 based
     * @param {int} b Blue compontent, 0-255 based
     * @param {int} w White compontent, 0-255 based
     */
    setColor(color=Color.default, notify=false) {
        if (color.r == color.g && color.g == color.b) {
            color.r = 0;
            color.b = 0;
            color.g = 0;
            color.w = r; // uses less power to only power a single channel
        }

        this.color = color;
        if (notify) {
            // send new LED color over WebSocket
        }
    }
}

/**
 * Represents a section of an entire LED strip. Useful for breaking up the strip into multiple shapes.
 */
class LEDSection {
    /**
     * @param {int} size How many LEDs this section represents out of the entire LED strip
     * @param {int} offset The offset from the start of whole LED strip this section begins 
     * @param {Direction} direction The direction this section of LEDs is oriented
     */
    constructor(size=50, offset=0, direction=0) {
        this.size = size;
        this.dir = direction;
        this.leds = [];

        for (let i = 0; i < size; i++) {
            this.leds[i] = [new LED(i + offset), false];
        }
    }

    /**
     * Force syncs all the LEDs with the server
     */
    force_update() {
        // send all LEDs regardless of if LEDs have been updated or not
    }

    /**
     * Updates all LEDs that have been changed since the last sync
     * 
     * LEDs format = [ [LED led, bool hasBeenUpdated], ... ]
     */
    update() {
        // only send LEDs that have been updated
        // format: leds = [ [led, hasBeenUpdated], [led, hasBeenUpdated], ...]
    }

    /**
     * Gets a specific LED from this section.
     * NOTE: Does not check if LED exists or not
     * @param {int} index The index of the desired LED 
     */
    getLed(index=0) {
        return this.leds[index];
    }
}

/**
 * Represents a 2D vector
 */
class Vector2 {
    /**
     * @param {Number} x The x direction of the vector 
     * @param {Number} y The y direction of the vector
     */
    constructor(x=0, y=0) {
        this.x = x;
        this.y = y;
    }

    /** Returns the magnitude of the vector */
    get mag() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    /** Returns a normalized version of the vector */
    get normal() {
        let m = this.mag;
        return m > 0 ? new Vector2(this.x / m, this.y / m) : new Vector2(0, 1);
    }
}

// Should I put position in constructor? Default positions? Just set position after I create them?
const sections = [];
sections[0] = new LEDSection(100,   0, Direction.UP  );
sections[1] = new LEDSection(100, 100, Direction.LEFT);
sections[2] = new LEDSection(100, 200, Direction.DOWN);
/** Controls container */
const jControls = $('#controls');
/** Drawing area */
const jCanvas = $('#leds');
/** Background behind canvas */
const jBackground = $('#background');
/** Main menu container (inside controls container) */
const jMain = $('#main');
/** Draw menu container (draw controls inside container) */
const jDraw = $('#draw');
/** Colors menu container (color picker inside container) */
const jColor = $('#color');
/** Presets menu container (presets inside container) */
const jPresets = $('#presets');
/** Draw button in main menu */
const jDrawBtn = $('#draw-btn');
/** Preset button in main menu */
const jPresetBtn = $('#preset-btn');
/** Clear button in main menu */
const jClearBtn = $('#clear-btn');
/** canvas DOM element */
const canvas = jCanvas[0];
/** controls DOM element */
const controls = jControls[0];

const width = jBackground.outerWidth();
const height = jBackground.outerHeight();
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

// Relevant mouse info
const mouse = { x: 0, y: 0 };

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
 * Represents all the possible menus 
 */
const Menu = {
    MAIN: 0,
    DRAW: 1,
    PRESETS: 2,
    COLOR: 3
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

    /**
     * Returns a new Vector2 with the `x` and `y` values added by the given Vector2's `x` and `y`
     * @param {Vector2} n Adds another vector's `x` and `y` values to this vector's `x` and `y` values
     */
    add(n=new Vector2()) {
        return new Vector2(this.x + n.x, this.y + n.y);
    }

    /**
     * Returns a new Vector2 with the `x` and `y` values multiplied by `n`
     * @param {int} n The 
     */
    mult(n=1) {
        return new Vector2(this.x * n, this.y * n)
    }

    /**
     * Returns a new Vector2 with the `x` and `y` values divided by `n`
     * @param {Number} n The number to divide both the `x` and `y` values of the vector
     */
    div(n=1) {
        return new Vector2(this.x / n, this.y / n);
    }

    /** Returns the magnitude of the vector */
    get mag() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    /** Returns a normalized version of the vector */
    get normal() {
        let m = this.mag;
        return m > 0 ? this.div(m) : new Vector2(0, 1);
    }
}

/**
 * Represents a section of an entire LED strip. Useful for breaking up the strip into multiple shapes.
 */
class LEDSection {
    /**
     * @param {int} count How many LEDs this section represents out of the entire LED strip
     * @param {Vector2} size The size of the rectangle to be rendered on screen, in percentages
     * @param {Vector2} position The position of the rectangle to be rendered on screen, in percentages
     * @param {int} offset The offset from the start of whole LED strip this section begins 
     * @param {Direction} direction The direction this section of LEDs is oriented
     */
    constructor(count=50, offset=0, size=new Vector2(), position=new Vector2(), direction=Direction.UP) {
        this.count = count;
        this.size = size;
        this.pos = position;
        this.dir = direction;
        this.leds = [];

        // `UP`/`LEFT` sections are ordered backwards, so the individual `LED`s have reversed index order. However,
        // the `LED`s still get stored in the `leds` array in the same order, regardless of their index/offset/direction.
        // i.e. the `leds` array is just a container, and each `LED` has actual index of itself on the physical LED strip.
        for (let i = 0; i < count; i++) {
            let indx = direction == Direction.UP || direction == Direction.LEFT ? (count - i) + offset : i + offset;
            this.leds[i] = [new LED(indx), false];
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
        return this.leds[index][0];
    }
}

const sections = [];
sections[0] = new LEDSection(100,   0, new Vector2(0.03, 0.800), new Vector2(0.90, 0.150),   Direction.UP);
sections[1] = new LEDSection(100, 100, new Vector2(0.80, 0.075), new Vector2(0.10, 0.075), Direction.LEFT);
sections[2] = new LEDSection(100, 200, new Vector2(0.03, 0.800), new Vector2(0.07, 0.150), Direction.DOWN);

/**
 * Renders all the `LEDSection`s on the screen
 */
function render() {
    // Reset color settings & draw grey background
    ctx.fillStyle = 'rgb(48, 48, 48)';
    ctx.strokeStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';

    for (let i = 0; i < sections.length; i++) {
        let section = sections[i];
        let _ledSize = section.size.div(section.count);
        // note: `_ledSize` has both the `x` and `y` values divided, so it only represent the dynamic
        // size of each LED (i.e. the part that is made from equally dividing the section into `count` parts).
        // the static size comes from the `size` value of each `LEDSection`.

        switch(section.dir) {
            case Direction.UP:
            case Direction.DOWN:
                for (let y = 0; y < section.count; y++) {
                    // Static width (width of section), dynamic height (equally divided sections)
                    let _led = section.getLed(y);
                    ctx.fillStyle = `rgb(${_led.color.r}, ${_led.color.g}, ${_led.color.b})`;
                    ctx.fillRect(section.pos.x * width, (section.pos.y * height) + (_ledSize.mult(y).y * height),
                                section.size.x * width, _ledSize.y * height);
                }
                break;
            case Direction.LEFT:
            case Direction.RIGHT:
                for (let x = 0; x < section.count; x++) {
                    // Dynamic width, static height
                    let _led = section.getLed(x);
                    ctx.fillStyle = `rgb(${_led.color.r}, ${_led.color.g}, ${_led.color.b})`;
                    ctx.fillRect((section.pos.x * width) + (_ledSize.mult(x).x * width), section.pos.y * height,
                                _ledSize.x * width, section.size.y * height);
                }
                break;
            default: break;
        }
    }
}

/**
 * Calls when the mouse is moving while holding down M1 / touch. Handles logic for
 * drawing.
 */
function onDrag() {
    for (let i = 0; i < sections.length; i++) {
        let section = sections[i];
        let _start = section.pos;
        let _ledSize = section.size.div(section.count);
        // see function `render` for note on `_ledSize`

        for (let j = 0; j < section.count; j++) {
            let _ledPos = _start.add(_ledSize.mult(j));
            
            // check if mouse is within bounds of `LED`, based off orientation of `LEDSection`
            switch(section.dir) {
                case Direction.LEFT:
                case Direction.RIGHT:
                    if (mouse.x > _ledPos.x * width && mouse.x < (_ledPos.x + _ledSize.x) * width
                        && mouse.y > _start.y * height && mouse.y < (_start.y + section.size.y) * height) {
                            section.getLed(j).setColor(new Color(255, 0, 0));
                            render();
                    }
                    break;
                case Direction.UP:
                case Direction.DOWN:
                    if (mouse.x > _start.x * width && mouse.x < (_start.x + section.size.x) * width
                        && mouse.y > _ledPos.y * height && mouse.y < (_ledPos.y + _ledSize.y) * height) {
                            section.getLed(j).setColor(new Color(255, 0, 0));
                            render();
                        }
                    break;
                default: break;
            }
        }
    }
}

/**
 * Changes the current menu
 * @param {Menu} menu The menu to change to
 */
function setMenu(menu=Menu.MAIN) {
    switch(menu) {
        case Menu.MAIN:
            jMain.css('left', '0');
            jDraw.css('left', '-100%');
            jDraw.css('top', '0');
            jPresets.css('left', '100%');
            jColor.css('left', '-100%');
            jColor.css('top', '100%');
            break;
        case Menu.DRAW:
            jMain.css('left', '100%');
            jDraw.css('left', '0');
            jDraw.css('top', '0');
            jPresets.css('left', '200%');
            jColor.css('left', '0');
            jColor.css('top', '100%');
            break;
        case Menu.PRESETS:
            jMain.css('left', '-100%');
            jDraw.css('left', '-200%');
            jDraw.css('top', '0');
            jPresets.css('left', '0');
            jColor.css('left', '-200%');
            jColor.css('top', '100%');
            break;
        case Menu.COLOR:
            jMain.css('left', '100%');
            jDraw.css('left', '0');
            jDraw.css('top', '-100%');
            jPresets.css('left', '200%');
            jColor.css('left', '0');
            jColor.css('top', '0');
        default:
            console.error(`invalid menu given [${menu}]`); 
            break;
    }
}

render();

// Update mouse position
canvas.addEventListener('mousemove', function(e) {
    mouse.x = e.pageX - this.offsetLeft;
    mouse.y = e.pageY - this.offsetTop;
}, false);
canvas.addEventListener('touchmove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
}, false);

// mouse / touch start
canvas.addEventListener('mousedown', function() {
    canvas.addEventListener('mousemove', onDrag, false);
}, false);
canvas.addEventListener('touchstart', function() {
    canvas.addEventListener('touchmove', onDrag, false);
}, false);

// mouse / touch end
canvas.addEventListener('mouseup', function() {
    canvas.removeEventListener('mousemove', onDrag, false);
}, false);
canvas.addEventListener('touched', function() {
    canvas.removeEventListener('touchmove', onDrag, false);
}, false);

// menu buttons
jDrawBtn.click(function() { setMenu(Menu.DRAW); });
jPresetBtn.click(function() { setMenu(Menu.PRESETS); });
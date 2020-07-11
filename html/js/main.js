// Canvas element
const jCanvas = $('#leds');
const canvas = jCanvas[0];
const width = jCanvas.outerWidth();
const height = jCanvas.outerHeight();

// Configuration
const padding = 0.1; // percentage
const size = 32; // pixels

const adjusted = { x: width * padding, y: height * padding, w: width * (1 - padding * 2), h: height * (1 - padding * 2) };

var data = [];

// no poop browsers
if (!canvas.getContext)
    alert('lole your browser is lame');

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

const ctx = canvas.getContext('2d');
const mouse = {x: 0, y: 0};

function Color(r=0, g=0, b=0, w=0) {
    return { r, g, b, w };
}

var currentColor = Color(0, 0, 255, 255);

// Update mouse coordinates on canvas from mouse movements
canvas.addEventListener('mousemove', function(e) {
    mouse.x = e.pageX - this.offsetLeft;
    mouse.y = e.pageY - this.offsetTop;
}, false);
canvas.addEventListener('touchmove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
}, false);

// Configure canvas
ctx.canvas.width = width;
ctx.canvas.height = height;
ctx.lineWidth = size + 8;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.strokeStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;

// Start drawing events
canvas.addEventListener('mousedown', function(e) {
    ctx.moveTo(mouse.x, mouse.y);
    ctx.beginPath();

    canvas.addEventListener('mousemove', onPaint, false);
}, false);
canvas.addEventListener('touchstart', function(e) {
    ctx.moveTo(mouse.x, mouse.y);
    ctx.beginPath();

    canvas.addEventListener('touchmove', onPaint, false);
});

// Stop drawing events
canvas.addEventListener('mouseup', function() {
    canvas.removeEventListener('mousemove', onPaint, false);
    drawBorder();
    ctx.closePath();
}, false);
canvas.addEventListener('touchend', function() {
    canvas.removeEventListener('touchmove', onPaint, false);
    drawBorder();
    ctx.closePath();
}, false);

// Draw
function onPaint() {
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();
    drawBorder();
}

/**
 * Draws a border around the intended drawable area to be mapped to the LEDs
 */
function drawBorder() {
    const _lineWidth = ctx.lineWidth;
    const _style = ctx.strokeStyle;

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    for (var i = 0; i < 15; i++) {
        ctx.strokeRect(adjusted.x, adjusted.y, adjusted.w, adjusted.h);
        ctx.strokeRect(size + adjusted.x, size + adjusted.y, adjusted.w - size * 2, adjusted.h - size);
    }
    ctx.clearRect(0, 0, width, adjusted.y); // top
    ctx.clearRect(adjusted.x + adjusted.w, adjusted.y, adjusted.x, height); // right
    ctx.clearRect(0, 0, adjusted.x, height); // left
    ctx.clearRect(adjusted.x, adjusted.y + adjusted.h, width, adjusted.y); // bottom
    ctx.clearRect(adjusted.x + size, adjusted.y + size, adjusted.w - size * 2, 2 + adjusted.h - size); // inside

    ctx.lineWidth = _lineWidth;
    ctx.strokeStyle = _style;
}

function colCompare(col1, col2) {
    return col1.r == col2.r && col1.g == col2.g && col1.b == col2.b && col1.w == col2.w;
}

/**
 * Take an array of colors and returns the average of all colors
 * @param {Color[]} colors 
 * @returns {Color}
 */
function averageColors(colors) {
    let avg = Color();
    if (colors.length == 0) return avg;

    colors.forEach(function(c) {
        avg.r += c.r;
        avg.g += c.g;
        avg.b += c.b;
        avg.w += c.w;
    });

    avg.r /= colors.length;
    avg.g /= colors.length;
    avg.b /= colors.length;
    avg.w /= colors.length;

    return avg;
}

/**
 * Converts painted strip into an array of 300 colors
 * Direction: Bottom right -> Top right -> Top left -> Bottom left (because that is how they are setup in my room)
 * @returns {Color[]}
 */
function serialize() {
    const _lineWidth = ctx.lineWidth;
    const _style = ctx.strokeStyle;

    // right: 1-102
    // top right: 103
    // top: 104-202
    // top left: 203
    // left: 204-300
    var data = []

    // from bottom right to top right
    var ledSize = (adjusted.h - size) / 102;
    var start = adjusted.y + adjusted.h;
    
    for (var i = 0; i < 102; i++) {
        let pix = ctx.getImageData(2 + adjusted.x + adjusted.w - size, start - ledSize, size - 3, ledSize).data;
        let colors = [];

        for (var j = 0; j < pix.length; j += 4) {
            colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], w: 0 };
        }
        data[i] = averageColors(colors);
        start -= ledSize;
    }

    // corner is 1 big LED because I don't want to do a bunch of complex math
    var pix = ctx.getImageData(3 + adjusted.x + adjusted.w - size, adjusted.y + 2, size - 4, size - 4).data;
    var colors = [];
    for (var j = 0; j < pix.length; j += 4) {
        colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], w: 0 };
    }
    data[102] = averageColors(colors);
    
    // from top right to top left
    ledSize = (adjusted.w - size * 2) / (202 - 104);
    start = adjusted.x + adjusted.w - size;

    for (var i = 103; i < 202; i++) {
        let pix = ctx.getImageData(start - ledSize, adjusted.y + 2, ledSize, size - 3).data;
        let colors = [];

        for (var j = 0; j < pix.length; j += 4) {
            colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], w: 0 };
        }
        data[i] = averageColors(colors);
        start -= ledSize;
    }

    // top left corner LED (again, lazy)
    pix = ctx.getImageData(2 + adjusted.x, 2 + adjusted.y, size - 4, size - 4).data;
    var colors = [];
    for (var j = 0; j < pix.length; j += 4) {
        colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], w: 0 };
    }
    data[202] = averageColors(colors);

    // top left to bottom left
    ledSize = (adjusted.h - adjusted.y - size) / (300 - 204);
    start = adjusted.y - ledSize * 2;
    for (var i = 203; i < 300; i++) {
        let pix = ctx.getImageData(adjusted.x + 2, start + adjusted.y + size + 2, size - 4, ledSize).data;
        let colors = [];

        for (var j = 0; j < pix.length; j += 4) {
            colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], w: 0 };
        }
        data[i] = averageColors(colors);
        start += ledSize;
    }

    ctx.lineWidth = _lineWidth;
    ctx.strokeStyle = _style;

    return data;
}

// Initial outline
drawBorder();

data = serialize();
setInterval(function() {
    var _data = serialize();
    for (var i = 0; i < data.length; i++) {
        let col1 = data[i], col2 = _data[i];
        if (!colCompare(col1, col2)) {
            let led = [i, col2.r, col2.g, col2.b, col2.w];
            ledSocket.send(JSON.stringify(led));
            console.log('sent data');
        }
    }

    data = _data;
}, 500);
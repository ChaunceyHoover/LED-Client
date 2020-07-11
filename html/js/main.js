const jCanvas = $('#leds');
const canvas = jCanvas[0];

const padding = 0.1; // percentage
const size = 32; // pixels
const width = jCanvas.outerWidth();
const height = jCanvas.outerHeight();

const adjusted = { x: width * padding, y: height * padding, w: width * (1 - padding * 2), h: height * (1 - padding * 2) };

if (!canvas.getContext)
    alert('lole your browser is lame');

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

function Color(r=0, g=0, b=0, a=0) {
    return { r, g, b, a };
}

var currentColor = Color(255, 0, 255, 255);

canvas.addEventListener('mousemove', function(e) {
    mouse.x = e.pageX - this.offsetLeft;
    mouse.y = e.pageY - this.offsetTop;
}, false);
canvas.addEventListener('touchmove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
}, false);

ctx.canvas.width = width;
ctx.canvas.height = height;
ctx.lineWidth = 40;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.strokeStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a})`;

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

/**
 * Take an array of colors and returns the average of all colors
 * @param {Color[]} colors 
 * @returns {Color}
 */

function averageColors(colors, d) {
    let avg = Color();
    let unique = [];
    if (colors.length == 0) return avg;

    for (var i = 0; i < colors.length; i++) {
        let found = false;
        let testCol = colors[i];
        for (var j = 0; j < unique.length; j++) {
            let uniqueCol = unique[j];
            if (testCol.r == uniqueCol.r && testCol.g == uniqueCol.g && testCol.b == uniqueCol.b && testCol.a == uniqueCol.a) {
                found = true;
                break;
            }
        }
        if (!found)
            unique.push(testCol);
    }

    unique.forEach(function(c) {
        avg.r += c.r;
        avg.g += c.g;
        avg.b += c.b;
        avg.a += c.a;
    });

    avg.r /= unique.length;
    avg.g /= unique.length;
    avg.b /= unique.length;
    avg.a /= unique.length;

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

    // let imgd = ctx.getImageData(1 + adjusted.x + adjusted.w - size, adjusted.y + adjusted.h - size, size - 2, size - 1);
    // let pix = imgd.data;
    // let colors = [];
    // for (var i = 0; i < pix.length; i += 4) {
    //     colors[i / 4] = Color(pix[i], pix[i + 1], pix[i + 2], pix[i + 3]);
    // }
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
            colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], a: pix[j + 3] };
        }
        data[i] = averageColors(colors);
        start -= ledSize;
    }

    // corner is 1 big LED because I don't want to do a bunch of complex math
    var pix = ctx.getImageData(3 + adjusted.x + adjusted.w - size, adjusted.y + 2, size - 4, size - 4).data;
    var colors = [];
    for (var j = 0; j < pix.length; j += 4) {
        colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], a: pix[j + 3] };
    }
    data[103] = averageColors(colors);
    
    // from top right to top left
    ledSize = (adjusted.w - size * 2) / (202 - 104);
    start = adjusted.x + adjusted.w - size;

    for (var i = 104; i < 202; i++) {
        let pix = ctx.getImageData(start - ledSize, adjusted.y + 2, ledSize, size - 3).data;
        let colors = [];

        for (var j = 0; j < pix.length; j += 4) {
            colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], a: pix[j + 3] };
        }
        data[i] = averageColors(colors);
        start -= ledSize;
    }

    // top left corner LED (again, lazy)
    pix = ctx.getImageData(2 + adjusted.x, 2 + adjusted.y, size - 4, size - 4).data;
    var colors = [];
    for (var j = 0; j < pix.length; j += 4) {
        colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], a: pix[j + 3] };
    }
    data[203] = averageColors(colors);

    // top left to bottom left
    ledSize = (adjusted.h - size) / (300 - 204);
    start = adjusted.x
    for (var i = 204; i < 300; i++) {
        let pix = ctx.getImageData(adjusted.x + 2, adjusted.y + size + 2, size - 4, ledSize).data;
        let colors = [];

        for (var j = 0; j < pix.length; j += 4) {
            colors[j / 4] = { r: pix[j], g: pix[j + 1], b: pix[j + 2], a: pix[j + 3] };
        }
        data[i] = averageColors(colors);
        start += ledSize;
    }

    ctx.lineWidth = _lineWidth;
    ctx.strokeStyle = _style;

    return data;
}

drawBorder();
serialize();
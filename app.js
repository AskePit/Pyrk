const path = require("path");
const fs = require("fs");
const querystring = require('querystring');

videoExtensions = [
    "3g2",
    "3gp",
    "a52",
    "aac",
    "asf",
    "amv",
    "au",
    "avi",
    "drc",
    "dts",
    "dv",
    "dvr-ms",
    "f4a",
    "f4b",
    "f4p",
    "f4v",
    "flv",
    "gifv",
    "m2ts",
    "m2v",
    "m4p",
    "m4v",
    "mka",
    "mkv",
    "mng",
    "mov",
    "mp4",
    "mpe",
    "mpeg",
    "mpg",
    "mpv",
    "mts",
    "mxf",
    "nsc",
    "nsv",
    "nut",
    "ogg",
    "ogm",
    "ogv",
    "qt",
    "ra",
    "ram",
    "rm",
    "rmbv",
    "roq",
    "rv",
    "svi",
    "tac",
    "ts",
    "tta",
    "tsv",
    "ty",
    "vid",
    "viv",
    "vob",
    "webm",
    "wmv",
    "xa",
    "yuv",
]

let files  = [];
var i = 0;
let history = []; // [int]
let historyCursor = -1
var scale = 1;
var waitForLoad = false;
var drag = false;
var prevDragX = -1;
var prevDragY = -1;

var header = document.getElementsByTagName('p')[0]
var viewport = document.getElementById('view')
var img = viewport.getElementsByTagName('img')[0]
var vid = viewport.getElementsByTagName('video')[0]
var random = document.getElementsByTagName('input')[0]

img.onload = () => OnContentLoad(img)
vid.onloadedmetadata = () => OnContentLoad(vid)

document.addEventListener('keydown', function(event) {
    if (event.which == 32 || event.which == 13) {
        ScaleToOrig()
        return
    }

    const key = event.key; // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"

    const callback = {
        "ArrowLeft"  : PrevImage,
        "ArrowRight" : NextImage,
        "ArrowUp"    : PrevImage,
        "ArrowDown"  : NextImage,
    }[key]
    callback?.()
});

document.addEventListener('wheel', event => {
    ScaleTo(-Math.sign(event.deltaY), event.x, event.y)
});

document.addEventListener('mousedown', event => {
    drag = true;
    event.preventDefault()
});

document.addEventListener('mouseup', event => {
    drag = false;
    prevDragX = -1;
    prevDragY = -1;
});

document.addEventListener('mousemove', event => {
    if (!drag) {
        return
    }

    if (prevDragX >= 0 && prevDragY >= 0) {
        Drag(event.x - prevDragX, event.y - prevDragY);
    }

    prevDragX = event.x
    prevDragY = event.y
});

function RandomIntFromInterval(min, max) { // min and max included
	return Math.floor(Math.random() * (max - min + 1) + min)
}

function RandomizeCursorNoHistory() {
    i = RandomIntFromInterval(0, files.length-1)
}

function RandomizeCursorAppendHistory() {
    RandomizeCursorNoHistory()
    history.push(i)
    historyCursor = history.length - 1
}

function RandomizeCursorPrependHistory() {
    RandomizeCursorNoHistory()
    history.splice(0, 0, i)
    historyCursor = 0
}

function NextImage() {
    if (files.length <= 1) {
        return;
    }

    if(random.checked) {
        // has history
        if (history.length > 0) {
            // not entered history yet (not sure if it's possible here)
            if (historyCursor == -1) {
                historyCursor = 0;
                i = history[historyCursor];
            }
            // we are already somwhere in the history
            else if (historyCursor < history.length) {
                ++historyCursor;
                // history ended
                if (historyCursor == history.length) {
                    RandomizeCursorAppendHistory();
                // history not ended
                } else {
                    i = history[historyCursor];
                }
            // currently not in the history
            } else {
                RandomizeCursorAppendHistory();
            }
        // no history at all
        } else {
            RandomizeCursorAppendHistory();
        }
    } else {
        if(i < files.length - 1) {
            ++i;
        } else {
            i = 0;
        }
    }
    LoadFile();
}

function PrevImage() {
    if (files.length <= 1) {
        return;
    }

    if(random.checked) {
        // has history
        if (history.length > 0) {
            // not entered history yet
            if (historyCursor == -1) {
                historyCursor = history.length - 1;
                i = history[historyCursor];
            // we are already somwhere in the history
            } else {
                --historyCursor;
                // history ended
                if (historyCursor == -1) {
                    RandomizeCursorPrependHistory();
                // history not ended
                } else {
                    i = history[historyCursor];
                }
            }
        // no history at all
        } else {
            RandomizeCursorPrependHistory();
        }
    } else {
        if(i > 0) {
            --i;
        } else {
            i = files.length - 1;
        }
    }
    LoadFile();
}

function LoadFile() {
    if (files.length == 0) {
        return;
    }

    let f = files[i]

    header.innerText = f

    ext = f.split('.').pop().toLowerCase();

    // NOTE: this function only hides unneded <div>
    // desired <div> is shown only in `OnContentLoad` fucntion

    // video
    if (videoExtensions.includes(ext)) {
        vid.src = path.resolve(f)
        vid.volume = 0

        img.style.display = 'none';
    // picture
    } else {
        img.src = path.resolve(f)

        vid.style.display = 'none';
        vid.pause();
        vid.currentTime = 0;
    }
    waitForLoad = true;
    console.log(random.checked)
}

function OnContentLoad(el) {
    if(!waitForLoad) return
    waitForLoad = false

    const PAD = 75
    windowWidth = viewport.clientWidth - PAD
    windowHeight = viewport.clientHeight - PAD
    elWidth = (el.naturalWidth == undefined ? el.videoWidth : el.naturalWidth)
    elHeight = (el.naturalHeight == undefined ? el.videoHeight : el.naturalHeight)

    if (elWidth > windowWidth || elHeight > windowHeight) {
        let wScale = windowWidth / elWidth
        let hScale = windowHeight / elHeight

        scale = Math.min(wScale, hScale)
        Scale()
    } else {
        ScaleToOrig()
    }

    el.style.display = 'block'; // finally show element
}

function ScaleToOrig() {
    scale = 1
    Scale()
}

function ScaleTo(delta, x, y) {
    scale += 0.2*delta*scale
    Scale()
}

function Scale() {
    const MIN = 0.01
    const MAX = 7

    if (scale < MIN) {
        scale = MIN
    }
    if (scale > MAX) {
        scale = MAX
    }

    img.style.width = "".concat((img.naturalWidth * scale), "px")
    img.style.height = "".concat((img.naturalHeight * scale), "px")

    vid.style.width = "".concat((vid.videoWidth * scale), "px")
    vid.style.height = "".concat((vid.videoHeight * scale), "px")

    Drag(0, 0) // imitate drag for a smart image centration
}

function Drag(dragX, dragY) {
    const PAD = 5
    const windowWidth = viewport.clientWidth - PAD
    const windowHeight = viewport.clientHeight - PAD

    for (let el of [img, vid]) {
        // image
        if (el.style.top == "") {
            el.style.top = "0px"
        }
        if (el.style.left == "") {
            el.style.left = "0px"
        }

        let elementWidth = parseInt(el.style.width)
        let elementHeight = parseInt(el.style.height)

        let newLeft = parseInt(el.style.left) + dragX
        let newTop = parseInt(el.style.top) + dragY

        if (elementWidth > windowWidth) {
            if (newLeft > PAD) {
                newLeft = PAD
            }
            if (newLeft < windowWidth - elementWidth) {
                newLeft = windowWidth - elementWidth
            }
        } else {
            newLeft = windowWidth/2 - elementWidth/2
        }

        if (elementHeight > windowHeight) {
            if (newTop > PAD) {
                newTop = PAD
            }
            if (newTop < windowHeight - elementHeight) {
                newTop = windowHeight - elementHeight
            }
        } else {
            newTop = windowHeight/2 - elementHeight/2
        }

        el.style.top = "".concat(newTop, "px")
        el.style.left = "".concat(newLeft, "px")
    }
}

function LoadFolder(directory) {
    fs.readdirSync(directory).forEach(file => {
        const absolute = path.join(directory, file);
        if (fs.statSync(absolute).isDirectory()) return LoadFolder(absolute);
        else return files.push(absolute);
    });
}

function Main() {
    let query = querystring.parse(global.location.search);
    let args = JSON.parse(query['?argv'])

    if (args.length <= 1) {
        return;
    }

    let filename = args[1]
    let stats = fs.statSync(filename)
    if (stats.isFile()) {
        LoadFolder(path.dirname(filename))

        for(var idx = 0; idx<files.length; ++idx) {
            if(path.resolve(files[idx]) == path.resolve(filename)) {
                i = idx
                history.push(i)
                historyCursor = 0
                break
            }
        }
    } else if (stats.isDirectory) {
        LoadFolder(filename)
        if(random.checked) {
            RandomizeCursorAppendHistory();
        }
    }

    LoadFile()
}
Main();
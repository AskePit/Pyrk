const path = require("path");
const fs = require("fs");
const querystring = require('querystring');

let files  = [];
var i = 0;
var scale = 1;
var drag = false;
var prevDragX = -1;
var prevDragY = -1;

function LoadFolder(directory) {
    fs.readdirSync(directory).forEach(file => {
        const absolute = path.join(directory, file);
        if (fs.statSync(absolute).isDirectory()) return LoadFolder(absolute);
        else return files.push(absolute);
    });
}

var header = document.getElementsByTagName('p')[0]
var viewport = document.getElementById('view')
var img = viewport.getElementsByTagName('img')[0]
var vid = viewport.getElementsByTagName('video')[0]

document.addEventListener('keydown', function(event) {
    if (event.which == 32 || event.which == 13) {
        ScaleOrig()
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
    Scale(-Math.sign(event.deltaY), event.x, event.y)
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

function NextImage() {
    if (files.length <= 1) {
        return;
    }

    if(i < files.length - 1) {
        ++i;
    } else {
        i = 0;
    }
    LoadFile();
}

function PrevImage() {
    if (files.length <= 1) {
        return;
    }

    if(i > 0) {
        --i;
    } else {
        i = files.length - 1;
    }
    LoadFile();
}

function LoadFile() {
    if (files.length == 0) {
        return;
    }

    ScaleOrig()
    let f = files[i]

    header.innerText = f

    // video
    if (f.endsWith('.mp4') || f.endsWith('.webm')) {
        vid.src = path.resolve(f)
        vid.volume = 0

        vid.style.display = 'block';
        img.style.display = 'none';
    // picture
    } else {
        img.src = path.resolve(f)

        img.style.display = 'block';
        vid.style.display = 'none';
        vid.pause();
        vid.currentTime = 0;
    }
}

function ScaleOrig() {
    scale = 1

    img.style.transform = "scale(1.0)";
    vid.style.transform = "scale(1.0)";
}

function Scale(delta, x, y) {
    scale += 0.2*delta*scale
    if (scale < 0.01) {
        scale = 0.01
    }
    if (scale > 10) {
        scale = 10
    }

    img.style.transform = "scale(" + scale + ")";
    vid.style.transform = "scale(" + scale + ")";
}

function Drag(dragX, dragY) {
    viewport.scrollLeft -= dragX
    viewport.scrollTop -= dragY

    window.scroll(window.scrollX - dragX, window.scrollY - dragY)
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
                break
            }
        }
    } else if (stats.isDirectory) {
        LoadFolder(filename)
    }

    LoadFile()
}
Main();
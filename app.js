const path = require("path")
const fs = require("fs")
const querystring = require('querystring')

const videoExtensions = [
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

const ContentType = {
    Image: 'Image',
    Video: 'Video',
    NoContent: 'NoContent'
}

const ScaleMode = {
    Fit: 'Fit',
    Origin: 'Origin',
    Custom: 'Custom',
}

class RandomPool {
    size = 0
    pool = []

    #shuffle(array) {
        let currentIndex = array.length;
      
        // While there remain elements to shuffle...
        while (currentIndex != 0) {
      
          // Pick a remaining element...
          let randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;
      
          // And swap it with the current element.
          [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
        }
    }

    constructor(size) {
        this.size = size
        this.pool = []
        for(let i = 0; i<size; ++i) {
            this.pool.push(i)
        }

        shuffle(this.pool)
    }

    #refill() {
        this.pool = []
        for(let i = 0; i<this.size; ++i) {
            this.pool.push(i)
        }

        this.#shuffle(this.pool)
    }

    yield() {
        if (this.pool.length == 0) {
            this.#refill()
        }
        let y = this.pool[this.pool.length-1]
        this.pool.length -= 1
        return y
    }
}

let files  = []
let i = 0
let iPool = null // RandomPool
let history = [] // [indexes of `files`]
let historyCursor = -1
let scale = 1
let currScaleMode = ScaleMode.Custom
let contentType = ContentType.NoContent
let waitForLoad = false
let drag = false
let prevDragX = -1
let prevDragY = -1

const header = document.getElementsByTagName('p')[0]
const viewport = document.getElementById('view')
const img = viewport.getElementsByTagName('img')[0]
const vid = viewport.getElementsByTagName('video')[0]
const noContentDiv = document.getElementById('no-content')
const random = document.getElementsByTagName('input')[0]

img.onload = () => OnContentLoad(img)
vid.onloadedmetadata = () => OnContentLoad(vid)

img.onerror = () => OnContentLoadFail(img)
vid.onerror = () => OnContentLoadFail(vid)

document.addEventListener('keydown', function(event) {
    if (event.which == 32 || event.which == 13) {
        if (currScaleMode == ScaleMode.Fit) {
            ScaleToOrig()
        } else {
            ScaleToFit()
        }
        
        return
    }

    const key = event.key // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"

    const callback = {
        "ArrowLeft"  : PrevImage,
        "ArrowRight" : NextImage,
        "ArrowUp"    : PrevImage,
        "ArrowDown"  : NextImage,
    }[key]
    callback?.()
})

document.addEventListener('wheel', event => {
    ScaleTo(-Math.sign(event.deltaY), event.x, event.y)
})

document.addEventListener('mousedown', event => {
    drag = true
    event.preventDefault()
})

document.addEventListener('mouseup', event => {
    drag = false
    prevDragX = -1
    prevDragY = -1
})

document.addEventListener('mousemove', event => {
    if (!drag) {
        return
    }

    if (prevDragX >= 0 && prevDragY >= 0) {
        Drag(event.x - prevDragX, event.y - prevDragY)
    }

    prevDragX = event.x
    prevDragY = event.y
})

function GetActiveDiv() {
    return contentType == ContentType.Image
        ? img
        : contentType == ContentType.Video
            ? vid
            : noContentDiv
}

function GetContentWidth() {
    const el = GetActiveDiv()
    return el.naturalWidth == undefined ? el.videoWidth : el.naturalWidth
}

function GetContentHeight() {
    const el = GetActiveDiv()
    return el.naturalWidth == undefined ? el.videoHeight : el.naturalHeight
}

function RandomizeCursorNoHistory() {
    i = iPool.yield()
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
        return
    }

    if(random.checked) {
        // has history
        if (history.length > 0) {
            // not entered history yet (not sure if it's possible here)
            if (historyCursor == -1) {
                historyCursor = 0
                i = history[historyCursor]
            }
            // we are already somwhere in the history
            else if (historyCursor < history.length) {
                ++historyCursor
                // history ended
                if (historyCursor == history.length) {
                    RandomizeCursorAppendHistory()
                // history not ended
                } else {
                    i = history[historyCursor]
                }
            // currently not in the history
            } else {
                RandomizeCursorAppendHistory()
            }
        // no history at all
        } else {
            RandomizeCursorAppendHistory()
        }
    } else {
        if(i < files.length - 1) {
            ++i
        } else {
            i = 0
        }
    }
    LoadFile()
}

function PrevImage() {
    if (files.length <= 1) {
        return
    }

    if(random.checked) {
        // has history
        if (history.length > 0) {
            // not entered history yet
            if (historyCursor == -1) {
                historyCursor = history.length - 1
                i = history[historyCursor]
            // we are already somwhere in the history
            } else {
                --historyCursor
                // history ended
                if (historyCursor == -1) {
                    RandomizeCursorPrependHistory()
                // history not ended
                } else {
                    i = history[historyCursor]
                }
            }
        // no history at all
        } else {
            RandomizeCursorPrependHistory()
        }
    } else {
        if(i > 0) {
            --i
        } else {
            i = files.length - 1
        }
    }
    LoadFile()
}

function LoadFile() {
    if (files.length == 0) {
        return
    }

    let f = files[i]

    header.innerText = f

    const ext = f.split('.').pop().toLowerCase()

    // NOTE: this function only hides unneded <div>
    // desired <div> is shown only in `OnContentLoad` fucntion

    // video
    if (videoExtensions.includes(ext)) {
        vid.src = path.resolve(f)
        vid.volume = 0

        contentType = ContentType.Video
        noContentDiv.style.display = 'none'
        img.style.display = 'none'
        img.src = ""
    // picture
    } else {
        img.src = path.resolve(f)

        contentType = ContentType.Image
        noContentDiv.style.display = 'none'
        vid.style.display = 'none'
        vid.pause()
        vid.currentTime = 0
        vid.src = ""
    }
    waitForLoad = true
}

function OnContentLoad(el) {
    if(!waitForLoad) return
    waitForLoad = false

    ScaleToFit()

    el.style.display = 'block' // finally show element
}

function OnContentLoadFail(el) {
    if (contentType == ContentType.NoContent) {
        return
    }

    if (contentType == ContentType.Video && el === img) {
        return
    }

    if (contentType == ContentType.Image && el === vid) {
        return
    }

    contentType = ContentType.NoContent

    img.style.display = 'none'
    vid.style.display = 'none'
    noContentDiv.style.display = 'block'

    vid.pause()
    vid.currentTime = 0
    vid.src = ""
    img.src = ""
}

function ScaleToOrig() {
    if (contentType == ContentType.NoContent) {
        return
    }

    scale = 1
    currScaleMode = ScaleMode.Origin
    Scale()

    const PAD = 5
    const windowWidth = viewport.clientWidth - PAD
    const windowHeight = viewport.clientHeight - PAD
    const el = GetActiveDiv()
    const elementWidth = parseInt(el.style.width)
    const elementHeight = parseInt(el.style.height)

    const newLeft = windowWidth/2 - elementWidth/2
    const newTop = windowHeight/2 - elementHeight/2

    SetImageDragLeft(newLeft)
    SetImageDragTop(newTop)

    Drag(0, 0) // imitate drag for a smart image centration
}

function ScaleToFit() {
    if (contentType == ContentType.NoContent) {
        return
    }

    const PAD = 75
    const windowWidth = viewport.clientWidth - PAD
    const windowHeight = viewport.clientHeight - PAD
    const elWidth = GetContentWidth()
    const elHeight = GetContentHeight()

    if (elWidth > windowWidth || elHeight > windowHeight) {
        let wScale = windowWidth / elWidth
        let hScale = windowHeight / elHeight

        scale = Math.min(wScale, hScale)
        currScaleMode = ScaleMode.Fit
        Scale()
    } else {
        ScaleToOrig()
    }
}

function ScaleTo(delta, x, y) {
    if (contentType == ContentType.NoContent) {
        return
    }

    const el = GetActiveDiv()

    let elementWidth = parseInt(el.style.width)
    let elementHeight = parseInt(el.style.height)

    let imageX = x - GetImageDragLeft()
    let imageY = y - GetImageDragTop()
    const imageU = imageX/elementWidth
    const imageV = imageY/elementHeight

    scale += 0.2*delta*scale
    currScaleMode = ScaleMode.Custom
    Scale()

    // yep, recalc again
    elementWidth = parseInt(el.style.width)
    elementHeight = parseInt(el.style.height)

    imageX = imageU * elementWidth
    imageY = imageV * elementHeight

    SetImageDragLeft(x - imageX)
    SetImageDragTop(y - imageY)

    Drag(0, 0) // imitate drag for a smart image centration
}

function Scale() {
    if (contentType == ContentType.NoContent) {
        return
    }

    const MIN = 0.01
    const MAX = 7

    if (scale < MIN) {
        scale = MIN
    }
    if (scale > MAX) {
        scale = MAX
    }

    const el = GetActiveDiv()

    el.style.width = `${GetContentWidth() * scale}px`
    el.style.height = `${GetContentHeight() * scale}px`

    Drag(0, 0) // imitate drag for a smart image centration
}

function GetImageDragTop() {
    const el = GetActiveDiv()

    if (el.style.top == "") {
        el.style.top = "0px"
    }

    return parseInt(el.style.top)
}

function GetImageDragLeft() {
    const el = GetActiveDiv()

    if (el.style.left == "") {
        el.style.left = "0px"
    }

    return parseInt(el.style.left)
}

function SetImageDragTop(top) {
    const el = GetActiveDiv()
    el.style.top = `${top}px`
}

function SetImageDragLeft(left) {
    const el = GetActiveDiv()
    el.style.left = `${left}px`
}

function Drag(dragX, dragY) {
    if (contentType == ContentType.NoContent) {
        return
    }

    const PAD = 5
    const windowWidth = viewport.clientWidth - PAD
    const windowHeight = viewport.clientHeight - PAD

    const el = GetActiveDiv()

    let elementWidth = parseInt(el.style.width)
    let elementHeight = parseInt(el.style.height)

    let newLeft = GetImageDragLeft() + dragX
    let newTop = GetImageDragTop() + dragY

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

    SetImageDragTop(newTop)
    SetImageDragLeft(newLeft)
}

function LoadFolder(directory) {
    fs.readdirSync(directory).forEach(file => {
        const absolute = path.join(directory, file)
        if (fs.statSync(absolute).isDirectory()) return LoadFolder(absolute)
        else return files.push(absolute)
    })

    iPool = new RandomPool(files.length)
}

function Main() {
    let query = querystring.parse(global.location.search)
    let args = JSON.parse(query['?argv'])

    if (args.length <= 1) {
        return
    }

    let filename = args[1]
    let stats = fs.statSync(filename)
    if (stats.isFile()) {
        LoadFolder(path.dirname(filename))

        for(let idx = 0; idx<files.length; ++idx) {
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
            RandomizeCursorAppendHistory()
        }
    }

    LoadFile()
}
Main()
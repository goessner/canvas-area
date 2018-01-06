/**
 * canvas-area (c) 2018 Stefan Goessner
 * @license MIT License
 * @link https://github.com/goessner/canvas-area
 */

function canvasArea(elm) { return elm.constructor(); }
canvasArea.prototype = {
    constructor: function() {
        this._view = {x:0,y:0,scl:1};
        this.registerEvents();
        this.handleEventPtr = this.handleEvent.bind(this);
        this.resize(this);   // align sizes of potential canvas children ...
        return this;
    },
    get width() { return +this.getAttribute('width') || parseInt(getComputedStyle(this).getPropertyValue('width')) || 300; },
    set width(q) { this.style.width = (this.setAttribute('width',q),q)+'px'; },
    get height() { return +this.getAttribute('height') || parseInt(getComputedStyle(this).getPropertyValue('height')) || 150; },
    set height(q) { this.style.height = (this.setAttribute('height',q),q)+'px'; },
    get resizable() { 
        return this._resizable !== undefined && this._resizable
           || (this._resizable = ['horizontal', 'vertical', 'both'].indexOf(this.getAttribute('resizable')) + 1); 
    },
    set resizable(q) {
        this.resizeMode = ['horizontal', 'vertical', 'both'].indexOf(q) + 1; // => 0, 1, 2 or 3
        this.setAttribute('resizable',this.resizeMode ? q : 'none');
    },
    get resizeActive() { return this._resizable && this.cursor.includes('resize'); },
    get cursor() { return this.style.cursor; },
    set cursor(q) { return this.style.cursor = q; },
    get cartesian() { return !!eval(this.getAttribute('cartesian')); },
    set cartesian(q) { this.setAttribute('cartesian',q); },
    get view() { return this._view },
    set view(q) { 
        this._view.x = q.x || 0; this._view.y = q.y || 0; this._view.scl = q.scl || 1;
        this.notify('view', this._view);
    },
    // viewport handling ...
    pntToUsr: function({x,y}) { let vw = this._view; return {x:(x - vw.x)/vw.scl, y:(y - vw.y)/vw.scl} },
    vecToUsr: function({x,y}) { let vw = this._view; return {x:(x - vw.x)/vw.scl, y:(y - vw.y)/vw.scl} },
    pan: function({dx,dy}) { this._view.x+=dx; this._view.y+=this.cartesian?-dy:dy; this.notify('view', this._view); },
    zoom: function({x,y,scl}) {
        this._view.x = x + scl*(this._view.x - x)
        this._view.y = y + scl*(this._view.y - y)
        this._view.scl *= scl
        this.notify('view', this._view);
    },
    resize: function({width,height}) {
        this.width = width;
        this.height = height;
        this.style.backgroundSize = `initial`;
 //       this.bgimg()
        for (let canvases = this.getElementsByTagName('canvas'), i = 0; i < canvases.length; i++) {  // resize canvas child elements ..
            canvases[i].width = width;
            canvases[i].height = height;
        }
        this.notify('resize', {width,height}=this);
    },
    // efficiently handle *all* registered events ...
    registerEvents: function() {
        this.addEventListener("mousemove", this, false);
        this.addEventListener("mousedown", this, false);
        this.addEventListener("mouseup", this, false);
        this.addEventListener("mouseenter", this, false);
        this.addEventListener("mouseleave", this, false);
        this.addEventListener("wheel", this, false);
    },
    handleEventPtr: null,
    handleEvent: function(e) {
        if (e.type in this) 
            this[e.type](this.getEventData(e));
    },
    mousemove: function(e) {
        if (e.buttons === 1) {  // left mouse button down ...
            if (this.resizeActive) {  // resize mode active ..
                this.resize({width: this.width  + (this.cursor[1] === 'w' ? e.dx : 0), 
                             height: this.height + (this.cursor[0] === 'n' ? e.dy : 0)});
            }
            else if (this.notify('drag',e))  // something dragged .. ?
                ;
            else
                this.pan(e);
        }
        else {  // no button pressed
            let mode = this.resizeMode(e);
            if (mode)
                this.cursor = mode+'-resize';
            else {
                if (this.cursor !== 'auto') this.cursor = 'auto';
                this.notify('pointer',e);
            }
        }
    },
    mousedown: function(e) { 
        if (this.resizeActive) {
            this.removeEventListener("mousemove", this, false);
            window.addEventListener('mousemove', this.handleEventPtr, false);
        }
        else
            this.notify('buttondown',e);
    },
    mouseup: function(e) { 
        if (this.resizeActive) {
            window.removeEventListener('mousemove', this.handleEventPtr, false);
            this.addEventListener("mousemove", this, false);
        }
        else
            this.notify('buttonup',e);
    },
    mouseenter: function(e) { this.notify('pointerenter',e) },
    mouseleave: function(e) {  this.notify('pointerleave',e) },

    wheel: function(e) { this.zoom({x:e.x,y:e.y,scl:e.delta>0?9/10:10/9}) },

    resizeMode: function({x,y}) {
        let mode = this.resizable, w = mode && this.width, h = mode && this.height, cartesian = this.cartesian;
        return mode && ( mode > 2 && x > w - 3 && (cartesian && y < 3 || !cartesian && y > h - 3) ? 'nwse'
                       : mode % 2 && x > w - 3 ? 'ew'
                       : mode > 1 && (cartesian && y < 3 || !cartesian && y > h - 3) ? 'ns'
                       : false);
    },
    getEventData: function(e) {  // inconsistent middle button value with 'mouseup' !!
        let bbox = e.target.getBoundingClientRect && e.target.getBoundingClientRect() || {left:0, top:0},
            x = e.clientX - Math.floor(bbox.left),
            y = e.clientY - Math.floor(bbox.top);
        return {
            buttons: (e.buttons !== undefined && e.type !== 'mouseup' ? e.buttons : (e.button || e.which)),
            x: x,
            y: this.cartesian ? this.height - y : y,
            dx: e.movementX,
            dy: e.movementY,
            delta: Math.max(-1,Math.min(1,e.deltaY||e.wheelDelta)) || 0
        }
    },
    // observer management ...
    signals: {},
    notify: function(key,val) {
        let res = false;
        if (this.signals[key]) 
            for (let hdl of this.signals[key]) 
                res = res || hdl(val);
        return res;
    },
    observe: function(key,handler) {
        (this.signals[key] || (this.signals[key]=[])).push(handler);
        return handler;
    },
    remove: function(key,handler) {
        let idx = this.signals[key] ? this.signals[key].indexOf(handler) : -1;
        if (idx >= 0)
           this.signals[key].splice(idx,1);
    }
}

canvasArea.register = function() {
    const register = () => {
        Object.setPrototypeOf(canvasArea.prototype, HTMLElement.prototype);
        for (let elms = document.getElementsByTagName('canvas-area'), i = 0; i < elms.length; i++)
            canvasArea(Object.setPrototypeOf(elms[i],canvasArea['prototype']));
    };

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", register);
    else
        register();
};

canvasArea.register();

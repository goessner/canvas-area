/**
 * canvas-area (c) 2018 Stefan Goessner
 * @license MIT License
 * @link https://github.com/goessner/canvas-area
 */
"use strict";

function canvasArea(elm) { return elm.constructor(); }
canvasArea.prototype = {
    constructor() {
        this.style.display = 'block';
        this.style.overflow = 'hidden';
        this._view = {x:0,y:0,scl:1};
        this.ptrloc = {x:0,y:0};
        this.lastevt = {x:0,y:0,btn:0,dbtn:0};
        this.signals = {};
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
    set cursor(q) { this.style.cursor = q; },
    get cartesian() { return !!eval(this.getAttribute('cartesian')); },
    set cartesian(q) { this.setAttribute('cartesian',q); },
    get view() { return this._view },
    set view(q) { 
        this._view.x = q.x || 0; this._view.y = q.y || 0; this._view.scl = q.scl || 1;
        this.notify('view', Object.assign({type:'view'},this._view));
    },
    // viewport handling ...
    pan: function({dx,dy}) { this._view.x+=dx; this._view.y+=dy; this.notify('view', Object.assign({type:'view'},this._view)); },
    zoom: function({x,y,scl}) {
        this._view.x = x + scl*(this._view.x - x);
        this._view.y = y + scl*(this._view.y - y);
        this._view.scl *= scl;
        this.notify('view', Object.assign({type:'view'},this._view));  // MS Edge doesn't support 'spread operator' at current
    },
    pntToUsr: function(p) { let vw = this._view; p.x = (p.x - vw.x)/vw.scl; p.y = (p.y - vw.y)/vw.scl; return p; },
//    vecToUsr: function({x,y}) { let vw = this._view; return {x:(x - vw.x)/vw.scl, y:(y - vw.y)/vw.scl} },
    resize: function({width,height}) {
        this.width = width;
        this.height = height;
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
        this.addEventListener("touchmove", this, false);
        this.addEventListener("touchstart", this, false);
        this.addEventListener("touchend", this, false);
    },
    handleEventPtr: null,
    handleEvent: function(e) {
        if (canvasArea.defaultPreventers.includes(e.type))
            e.preventDefault();
        if (e.type in this) 
            this[e.type](this.getEventData(e));
    },
    mousemove: function(e) {
        if (e.btn === 1) {  // left mouse button down ...
            if (this.resizeActive) {  // resize mode active ..
                this.resize({width: this.width  + (this.cursor[1] === 'w' ? e.dx : 0), 
                             height: this.height + (this.cursor[0] === 'n' ? (this.cartesian ? -e.dy : e.dy) : 0)});
            }
//            else if (this.notify((e.type='drag'),e))  // something dragged .. ?
//                ;
            else
                this.pan(e);
        }
        else {  // no button pressed
            let mode = this.resizeMode(e);
            if (mode)
                this.cursor = mode+'-resize';
            else {
                if (this.cursor !== 'auto') this.cursor = 'auto';
                this.notify((e.type='pointer'),e);
            }
        }
    },
    mousedown: function(e) {
        if (this.resizeActive) {
            this.removeEventListener("mousemove", this, false);
            window.addEventListener('mousemove', this.handleEventPtr, false);
        }
        else
            this.notify((e.type='buttondown'),e);
    },
    mouseup: function(e) { 
        if (this.resizeActive) {
            window.removeEventListener('mousemove', this.handleEventPtr, false);
            this.addEventListener("mousemove", this, false);
        }
//        else if (e.dbtn !== 0 && e.dx === 0 && e.dy === 0)  // (same) button down and up over same location
//            this.notify((e.type='click'),e);
        else
            this.notify((e.type='buttonup'),e);
    },
    mouseenter: function(e) { 
        this.notify((e.type='pointerenter'),e) 
    },
    mouseleave: function(e) { 
        this.notify((e.type='pointerleave'),e) 
    },

    wheel: function(e) { this.zoom({x:e.x,y:e.y,scl:e.delta>0?9/10:10/9}) },
    touchstart: function(e) { this.mousedown(e); },
    touchend: function(e) { this.mouseup(e); },
    touchmove: function(e) {
        if (this.resizeActive) {  // resize mode active ..
            this.resize({width: this.width  + (this.cursor[1] === 'w' ? e.dx : 0), 
                         height: this.height + (this.cursor[0] === 'n' ? (this.cartesian ? -e.dy : e.dy) : 0)});
        }
        else
            this.pan(e);
    },
    resizeMode: function({x,y}) {
        let mode = this.resizable, w = mode && this.width, h = mode && this.height, cartesian = this.cartesian;
        return mode && ( mode > 2 && x > w - 3 && (cartesian && y < 3 || !cartesian && y > h - 3) ? 'nwse'
                       : mode % 2 && x > w - 3 ? 'ew'
                       : mode > 1 && (cartesian && y < 3 || !cartesian && y > h - 3) ? 'ns'
                       : false);
    },
    getEventData: function(e) {
        let bbox = e.target.getBoundingClientRect && e.target.getBoundingClientRect() || {left:0, top:0},
            touch = e.changedTouches && e.changedTouches[0],
            x = (touch && touch.clientX || e.clientX) - Math.floor(bbox.left),
            y = (touch && touch.clientY || e.clientY) - Math.floor(bbox.top),
            dx = e.type === 'mousemove' ? e.movementX : x - this.lastevt.x,   // see Bugzilla, Bug 764498
            dy = e.type === 'mousemove' ? e.movementY : y - this.lastevt.y,
            btn = e.buttons !== undefined ? e.buttons : e.button || e.which,
            dbtn = btn - this.lastevt.btn;  // simple button index difference ... !

        this.lastevt.x = x;   // memoize for touch events 
        this.lastevt.y = y;
        this.lastevt.btn = btn;

        return {
            type: e.type,
            btn: btn,
            dbtn: dbtn,
            x: x,
            y: this.cartesian ? this.height - y : y,
            dx: dx,
            dy: this.cartesian ? -dy : dy,
            scl: this._view.scl,
            delta: Math.max(-1,Math.min(1,e.deltaY||e.wheelDelta)) || 0
        }
    },
    notify(key,val) {
        let res = false;
        if (this.signals[key]) 
            for (let hdl of this.signals[key]) 
                res = res || hdl(val);
        return res;
    },
    on(key,handler) {
        (this.signals[key] || (this.signals[key]=[])).push(handler);
        return this;
    },
    remove: function(key,handler) {
        let idx = this.signals[key] ? this.signals[key].indexOf(handler) : -1;
        if (idx >= 0)
           this.signals[key].splice(idx,1);
    }
}

canvasArea.defaultPreventers = ['touchstart','touchend','touchmove'];
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

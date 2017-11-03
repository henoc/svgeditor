(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
function innerProd(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}
var Matrix3 = /** @class */ (function () {
    function Matrix3(r1, r2, r3) {
        this.m = [r1, r2, r3];
    }
    Matrix3.fromColumns = function (c1, c2, c3) {
        return new Matrix3([c1[0], c2[0], c3[0]], [c1[1], c2[1], c3[1]], [c1[2], c2[2], c3[2]]);
    };
    /**
     * Multiple to column vector.
     */
    Matrix3.prototype.mulVec = function (that) {
        return [
            innerProd(this.m[0], that),
            innerProd(this.m[1], that),
            innerProd(this.m[2], that)
        ];
    };
    /**
     * Get nth column vector.
     */
    Matrix3.prototype.col = function (n) {
        return [
            this.m[0][n],
            this.m[1][n],
            this.m[2][n]
        ];
    };
    Matrix3.prototype.mul = function (that) {
        var c1 = this.mulVec(that.col(0));
        var c2 = this.mulVec(that.col(1));
        var c3 = this.mulVec(that.col(2));
        return Matrix3.fromColumns(c1, c2, c3);
    };
    return Matrix3;
}());
var Affine = /** @class */ (function (_super) {
    __extends(Affine, _super);
    function Affine(r1, r2) {
        return _super.call(this, r1, r2, [0, 0, 1]) || this;
    }
    /**
     * Transform `p` using this affine transform.
     */
    Affine.prototype.transform = function (p) {
        return utils_1.Point.fromArray(this.mulVec([p.x, p.y, 1]));
    };
    Affine.translate = function (p) {
        return new Affine([1, 0, p.x], [0, 1, p.y]);
    };
    Affine.scale = function (p, center) {
        return new Affine([p.x, 0, center.x * (1 - p.x)], [0, p.y, center.y * (1 - p.y)]);
    };
    Affine.rotate = function (a) {
        return new Affine([Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0]);
    };
    return Affine;
}(Matrix3));
exports.Affine = Affine;

},{"./utils":5}],2:[function(require,module,exports){
"use strict";
// Common process through any modes.
Object.defineProperty(exports, "__esModule", { value: true });
exports.editorRoot = document.getElementById("svgeditor-root");
exports.svgroot = exports.editorRoot.firstElementChild;
// 前処理として circle をすべて ellipse にする
var circles = document.getElementsByTagName("circle");
for (var i = 0; i < circles.length; i++) {
    circles.item(i).outerHTML = circles.item(i).outerHTML.replace("circle", "ellipse");
}
var ellipses = document.getElementsByTagName("ellipse");
for (var i = 0; i < ellipses.length; i++) {
    var ellipse = ellipses.item(i);
    if (ellipse.hasAttribute("r")) {
        ellipse.setAttribute("rx", ellipse.getAttribute("r"));
        ellipse.setAttribute("ry", ellipse.getAttribute("r"));
        ellipse.removeAttribute("r");
    }
}
/**
 * Execute registered extension command.
 */
function command(name, args) {
    window.parent.postMessage({
        command: 'did-click-link',
        data: args ? "command:" + name + "?" + encodeURIComponent(JSON.stringify(args)) : "command:" + name
    }, 'file://');
}
exports.command = command;
function reflection() {
    command("extension.reflectToEditor", [exports.svgroot.outerHTML]);
}
exports.reflection = reflection;

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("./common");
var svgutils_1 = require("./svgutils");
var utils_1 = require("./utils");
// This file is readed only in hand mode
var expandVertexesGroupId = utils_1.uuid();
common_1.svgroot.insertAdjacentHTML("beforeend", "<g class=\"svgeditor-others\" id=\"" + expandVertexesGroupId + "\"></g>");
var expandVertexesGroup = document.getElementById(expandVertexesGroupId);
/**
 * 編集ノードの移動用
 */
var dragTargets = undefined;
document.onmouseup = function (ev) {
    // 変更されたHTML（のSVG部分）をエディタに反映させる
    if (dragTargets)
        common_1.reflection();
    dragTargets = undefined;
};
document.onmousemove = function (ev) {
    if (dragTargets !== undefined) {
        var x_1 = ev.clientX;
        var y_1 = ev.clientY;
        dragTargets.forEach(function (dragTarget) {
            var newPosition = utils_1.Point.of(x_1, y_1).add(dragTarget.targetFromCursor);
            if (dragTarget.dragMode === "vertical") {
                newPosition.x = dragTarget.targetInit.x;
            }
            else if (dragTarget.dragMode === "horizontal") {
                newPosition.y = dragTarget.targetInit.y;
            }
            // 拡大用頂点がdragTargetなら拡大適用先があるので、それの属性をいじる
            if (dragTarget.expandVertexes) {
                var dirs_1 = dragTarget.target.getAttribute("direction").split(" ");
                // 拡大の中心
                var center = svgutils_1.deform(dragTarget.expandVertexes.vertexes.find(function (vertex) { return utils_1.equals(svgutils_1.deform(vertex).geta("direction").split(" "), dirs_1.map(utils_1.reverse)); })).getPosition();
                // 拡大率ベクトル
                var scale = newPosition.sub(center).div(dragTarget.targetInit.sub(center));
                if (Number.isNaN(scale.x))
                    scale.x = 1;
                if (Number.isNaN(scale.y))
                    scale.y = 1;
                // 初期値に戻してから拡大を実行
                svgutils_1.deform(dragTarget.expandVertexes.target).insertScheme(dragTarget.expandVertexes.targetInitScheme);
                svgutils_1.deform(dragTarget.expandVertexes.target).expand(center, scale);
                // 拡大用頂点すべてを移動
                svgutils_1.deform(dragTarget.expandVertexes.target).setExpandVertexes(expandVertexesGroup, dragTarget.expandVertexes.vertexes);
            }
            svgutils_1.deform(dragTarget.target).setPosition(newPosition);
        });
    }
};
var moveElems = [];
traverse(common_1.svgroot, function (node) {
    // svgrootは除く
    if (node instanceof SVGElement && node.tagName !== "svg") {
        moveElems.push(node);
    }
});
moveElems.forEach(function (moveElem, i) {
    moveElem.onmousedown = function (ev) {
        // イベント伝搬の終了
        ev.stopPropagation();
        // 既存の拡大用頂点を消す
        var vertexes = document.getElementsByClassName("svgeditor-vertex");
        while (vertexes.length !== 0) {
            vertexes.item(0).remove();
        }
        var mainTarget = moveElem;
        // 拡大用頂点を出す
        var ids = svgutils_1.deform(mainTarget).setExpandVertexes(expandVertexesGroup);
        var targets = [mainTarget];
        var expandVertexes = ids.map(function (id) { return document.getElementById(id); });
        var _loop_1 = function (vertex) {
            targets.push(vertex);
            // 拡大用頂点のクリック時のdragTargets登録
            vertex.onmousedown = function (ev) {
                // イベント伝搬の終了
                ev.stopPropagation();
                var dirs = vertex.getAttribute("direction").split(" ");
                var mode = "free";
                if (dirs.length === 1) {
                    if (dirs.indexOf("left") !== -1 || dirs.indexOf("right") !== -1) {
                        mode = "horizontal";
                    }
                    else {
                        mode = "vertical";
                    }
                }
                dragTargets = [{
                        target: vertex,
                        targetFromCursor: svgutils_1.deform(vertex).getPosition().sub(utils_1.Point.of(ev.clientX, ev.clientY)),
                        targetInit: svgutils_1.deform(vertex).getPosition(),
                        dragMode: mode,
                        expandVertexes: {
                            target: mainTarget,
                            vertexes: expandVertexes,
                            targetInitScheme: svgutils_1.deform(mainTarget).extractScheme()
                        }
                    }];
            };
        };
        for (var _i = 0, expandVertexes_1 = expandVertexes; _i < expandVertexes_1.length; _i++) {
            var vertex = expandVertexes_1[_i];
            _loop_1(vertex);
        }
        dragTargets = targets.map(function (target) {
            return {
                target: target,
                targetFromCursor: svgutils_1.deform(target).getPosition().sub(utils_1.Point.of(ev.clientX, ev.clientY)),
                targetInit: svgutils_1.deform(target).getPosition(),
                dragMode: "free"
            };
        });
    };
});
function traverse(node, fn) {
    fn(node);
    for (var i = 0; i < node.children.length; i++) {
        fn(node.children.item(i));
    }
}

},{"./common":2,"./svgutils":4,"./utils":5}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var affine_1 = require("./affine");
var utils_1 = require("./utils");
// TODO: 単位への対応　svgのmoduleを使うべきかも
var SvgDeformer = /** @class */ (function () {
    function SvgDeformer(elem) {
        this.elem = elem;
    }
    SvgDeformer.prototype.geta = function (name) {
        return this.elem.getAttribute(name);
    };
    SvgDeformer.prototype.seta = function (name, value) {
        return this.elem.setAttribute(name, value);
    };
    SvgDeformer.prototype.setPosition = function (point) {
        switch (this.elem.tagName) {
            case "circle":
            case "ellipse":
                this.seta("cx", String(point.x));
                this.seta("cy", String(point.y));
                break;
            case "rect":
            case "text":
                this.seta("x", String(point.x));
                this.seta("y", String(point.y));
                break;
            case "line":
                var deltaX = +this.geta("x2") - +this.geta("x1");
                var deltaY = +this.geta("y2") - +this.geta("y1");
                this.seta("x1", String(point.x));
                this.seta("y1", String(point.y));
                this.seta("x2", String(point.x + deltaX));
                this.seta("y2", String(point.y + deltaY));
                break;
            case "polyline":
            case "polygon":
                var points = parsePoints(this.geta("points"));
                var delta_1 = point.sub(points[0]);
                var pointsProperty = points.map(function (p) { return p.add(delta_1); }).map(function (p) { return p.x + "," + p.y; }).join(" ");
                this.seta("points", pointsProperty);
                break;
            default:
                throw "not defined SVGElement: " + this.elem.tagName;
        }
    };
    SvgDeformer.prototype.getPosition = function () {
        switch (this.elem.tagName) {
            case "circle":
            case "ellipse":
                return utils_1.Point.of(+this.geta("cx"), +this.geta("cy"));
            case "rect":
            case "text":
                return utils_1.Point.of(+this.geta("x"), +this.geta("y"));
            case "line":
                return utils_1.Point.of(+this.geta("x1"), +this.geta("y1"));
            case "polyline":
            case "polygon":
                var points = parsePoints(this.geta("points"));
                return points[0];
            default:
                throw "not defined SVGElement: " + this.elem.tagName;
        }
    };
    /**
     * Set vertexes for expansion. 8 vertexes are arranged around all kinds of target element.
     * @param parentElement parent of vertexes in terms of xml (not expansion target)
     * @param vertexes Recycled vertex nodes
     */
    SvgDeformer.prototype.setExpandVertexes = function (parentElement, vertexes) {
        // n : [0, 3], m : [0, 3]
        var frameFn;
        var center;
        var leftUp;
        var rightDown;
        var width;
        var height;
        switch (this.elem.tagName) {
            case "circle":
                center = this.getPosition();
                var r_1 = +this.geta("r");
                frameFn = function (n, m) { return utils_1.Point.of(center.x + r_1 * (n - 1), center.y + r_1 * (m - 1)); };
                break;
            case "ellipse":
                center = this.getPosition();
                var rx_1 = +this.geta("rx");
                var ry_1 = +this.geta("ry");
                frameFn = function (n, m) { return utils_1.Point.of(center.x + rx_1 * (n - 1), center.y + ry_1 * (m - 1)); };
                break;
            case "rect":
                leftUp = this.getPosition();
                width = +this.geta("width");
                height = +this.geta("height");
                frameFn = function (n, m) { return utils_1.Point.of(leftUp.x + width * n / 2, leftUp.y + height * m / 2); };
                break;
            case "line":
                leftUp = utils_1.Point.of(Math.min(+this.geta("x1"), +this.geta("x2")), Math.min(+this.geta("y1"), +this.geta("y2")));
                width = Math.abs(+this.geta("x1") - +this.geta("x2"));
                height = Math.abs(+this.geta("y1") - +this.geta("y2"));
                frameFn = function (n, m) { return utils_1.Point.of(leftUp.x + width * n / 2, leftUp.y + height * m / 2); };
                break;
            case "polyline":
            case "polygon":
                var points = parsePoints(this.geta("points"));
                leftUp = utils_1.Point.of(Math.min.apply(Math, points.map(function (p) { return p.x; })), Math.min.apply(Math, points.map(function (p) { return p.y; })));
                rightDown = utils_1.Point.of(Math.max.apply(Math, points.map(function (p) { return p.x; })), Math.max.apply(Math, points.map(function (p) { return p.y; })));
                frameFn = function (n, m) { return utils_1.Point.of(leftUp.x + (rightDown.x - leftUp.x) * n / 2, leftUp.y + (rightDown.y - leftUp.y) * m / 2); };
                break;
            default:
                throw "not defined SVGElement: " + this.elem.tagName;
        }
        var ids = [];
        var c = 0;
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if (i === 1 && j === 1)
                    continue;
                var point = frameFn(j, i);
                if (vertexes) {
                    deform(vertexes[c]).setPosition(point);
                    ids.push(vertexes[c].id);
                    c++;
                }
                else {
                    var dirs = [];
                    if (i === 0)
                        dirs.push("up");
                    if (i === 2)
                        dirs.push("down");
                    if (j === 0)
                        dirs.push("left");
                    if (j === 2)
                        dirs.push("right");
                    ids.push(this.setExpandVertex(point, dirs, parentElement));
                }
            }
        }
        return ids;
    };
    SvgDeformer.prototype.setExpandVertex = function (verticalPoint, directions, parentElement) {
        var id = utils_1.uuid();
        var html = "<circle cx=\"" + verticalPoint.x + "\" cy=\"" + verticalPoint.y + "\" r=\"5\"" +
            ("class=\"svgeditor-vertex\" id=\"" + id + "\" direction=\"" + directions.join(" ") + "\"/>");
        parentElement.insertAdjacentHTML("afterbegin", html);
        return id;
    };
    SvgDeformer.prototype.expand = function (center, scale) {
        var affine = affine_1.Affine.scale(scale, center);
        var leftUp, affinedLeftUp, rightUp, affinedRightUp, leftDown, affinedLeftDown;
        var p, affinedP;
        switch (this.elem.tagName) {
            case "circle":
                // ellipse のみ存在する
                break;
            case "ellipse":
                var c = this.getPosition();
                var affinedC = affine.transform(c);
                var right = this.getPosition().addxy(+this.geta("rx"), 0);
                var affinedRight = affine.transform(right);
                var down = this.getPosition().addxy(0, +this.geta("ry"));
                var affinedDown = affine.transform(down);
                this.seta("rx", String(affinedRight.x - affinedC.x));
                this.seta("ry", String(affinedDown.y - affinedC.y));
                this.seta("cx", String(affinedC.x));
                this.seta("cy", String(affinedC.y));
                break;
            case "rect":
                leftUp = this.getPosition();
                affinedLeftUp = affine.transform(leftUp);
                rightUp = utils_1.Point.of(+this.geta("x") + +this.geta("width"), +this.geta("y"));
                affinedRightUp = affine.transform(rightUp);
                leftDown = utils_1.Point.of(+this.geta("x"), +this.geta("y") + +this.geta("height"));
                affinedLeftDown = affine.transform(leftDown);
                this.seta("x", String(affinedLeftUp.x));
                this.seta("y", String(affinedLeftUp.y));
                this.seta("width", String(Math.abs(affinedRightUp.x - affinedLeftUp.x)));
                this.seta("height", String(Math.abs(affinedLeftDown.y - affinedLeftUp.y)));
                break;
            case "line":
                p = [
                    utils_1.Point.of(+this.geta("x1"), +this.geta("y1")),
                    utils_1.Point.of(+this.geta("x2"), +this.geta("y2"))
                ];
                affinedP = p.map(function (q) { return affine.transform(q); });
                this.seta("x1", String(affinedP[0].x));
                this.seta("y1", String(affinedP[0].y));
                this.seta("x2", String(affinedP[1].x));
                this.seta("y2", String(affinedP[1].y));
                break;
            case "polyline":
            case "polygon":
                p = parsePoints(this.geta("points"));
                affinedP = p.map(function (q) { return affine.transform(q); });
                this.seta("points", affinedP.map(function (aq) { return aq.toStr(","); }).join(" "));
                break;
            default:
                throw "not defined SVGElement: " + this.elem.tagName;
        }
    };
    /**
     * Add `delta` at the attribute `attr` of this element.
     */
    SvgDeformer.prototype.add = function (attr, delta) {
        this.seta(attr, String(+this.geta(attr) + delta));
    };
    SvgDeformer.prototype.extractScheme = function () {
        var attrs = {};
        for (var i = 0; i < this.elem.attributes.length; i++) {
            attrs[this.elem.attributes.item(i).name] = this.elem.attributes.item(i).value;
        }
        return {
            tagName: this.elem.tagName,
            attributes: attrs
        };
    };
    SvgDeformer.prototype.insertScheme = function (scheme) {
        var _this = this;
        Object.keys(scheme.attributes).forEach(function (name) {
            _this.seta(name, scheme.attributes[name]);
        });
    };
    /**
     * Add one transform function in transform attribute.
     */
    SvgDeformer.prototype.addTransform = function (tfn) {
        if (this.elem.hasAttribute("transform")) {
            var attr = this.geta("transform");
            this.seta("transform", attr + " " + tfn.kind + "(" + tfn.args.join(" ") + ")");
        }
        else {
            this.seta("transform", tfn.kind + "(" + tfn.args.join(" ") + ")");
        }
    };
    /**
     * Add one transform function in transform attribute.
     * If the kind of last transform function is same with that of `tfn`, the last function is replaced.
     */
    SvgDeformer.prototype.addTransform2 = function (tfn) {
        if (this.elem.hasAttribute("transform")) {
            var attr = this.geta("transform");
            var transforms = this.getTransformAttrs();
            if (transforms[transforms.length - 1].kind === tfn.kind) {
                transforms[transforms.length - 1] = tfn;
                this.seta("transform", transforms.map(function (tfn) { return tfn.kind + "(" + tfn.args.join(" ") + ")"; }).join(" "));
            }
            else {
                this.seta("transform", attr + " " + tfn.kind + "(" + tfn.args.join(" ") + ")");
            }
        }
        else {
            this.seta("transform", tfn.kind + "(" + tfn.args.join(" ") + ")");
        }
    };
    SvgDeformer.prototype.getTransformAttrs = function () {
        if (this.elem.hasAttribute("transform")) {
            var attr = this.geta("transform");
            return parseTransform(attr);
        }
        else {
            return undefined;
        }
    };
    return SvgDeformer;
}());
function deform(elem) {
    return new SvgDeformer(elem);
}
exports.deform = deform;
/**
 * parse "x1,y1 x2,y2 ... xn,yn" to `Point[]`
 */
function parsePoints(pointsProperty) {
    var pair = /(-?[0-9.]+)\s*,\s*(-?[0-9.]+)/g;
    var points = [];
    var matched = null;
    while ((matched = pair.exec(pointsProperty)) !== null) {
        var x = parseFloat(matched[1]);
        var y = parseFloat(matched[2]);
        points.push(utils_1.Point.of(x, y));
    }
    return points;
}
exports.parsePoints = parsePoints;
function parseTransform(transformProperty) {
    var tfns = [];
    var tfn = {
        kind: undefined,
        args: []
    };
    var str = undefined;
    var identify = /[^\s(),]+/g;
    while (str = identify.exec(transformProperty)) {
        var matched = str[0];
        if (matched.match(/[a-zA-Z]+/)) {
            if (tfn.kind) {
                tfns.push(tfn);
                tfn = { kind: undefined, args: [] };
                tfn.kind = matched;
            }
            else {
                tfn.kind = matched;
            }
        }
        else {
            tfn.args.push(+matched);
        }
    }
    tfns.push(tfn);
    return tfns;
}

},{"./affine":1,"./utils":5}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Point = /** @class */ (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.of = function (x, y) {
        return new Point(x, y);
    };
    Point.fromArray = function (array) {
        return new Point(array[0], array[1]);
    };
    Point.prototype.toArray = function () {
        return [this.x, this.y];
    };
    Point.prototype.toStr = function (sep) {
        return "" + this.x + sep + this.y;
    };
    Point.prototype.abs = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };
    Point.prototype.abs2 = function () {
        return Point.of(Math.abs(this.x), Math.abs(this.y));
    };
    Point.prototype.add = function (that) {
        return Point.of(this.x + that.x, this.y + that.y);
    };
    Point.prototype.addxy = function (x, y) {
        return Point.of(this.x + x, this.y + y);
    };
    Point.prototype.sub = function (that) {
        return Point.of(this.x - that.x, this.y - that.y);
    };
    Point.prototype.subxy = function (x, y) {
        return Point.of(this.x - x, this.y - y);
    };
    Point.prototype.div = function (that) {
        return Point.of(this.x / that.x, this.y / that.y);
    };
    return Point;
}());
exports.Point = Point;
function uuid() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}
exports.uuid = uuid;
function dirSwitch(dir, left, right, up, down) {
    switch (dir) {
        case "left":
            return left();
        case "right":
            return right();
        case "up":
            return up();
        case "down":
            return down();
    }
}
exports.dirSwitch = dirSwitch;
function reverse(dir) {
    switch (dir) {
        case "left":
            return "right";
        case "right":
            return "left";
        case "up":
            return "down";
        case "down":
            return "up";
    }
}
exports.reverse = reverse;
function equals(strs1, strs2) {
    if (strs1.length !== strs2.length)
        return false;
    var sorted1 = strs1.sort();
    var sorted2 = strs2.sort();
    for (var i = 0; i < strs1.length; i++) {
        if (sorted1[i] !== sorted2[i])
            return false;
    }
    return true;
}
exports.equals = equals;

},{}]},{},[2,3]);

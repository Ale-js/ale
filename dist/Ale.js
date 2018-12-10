/*! Ale.js JavaScript Framework
 * Version: 0.3
 * (c) 2018 Dong Yingxuan (Bill Dong) - China
 * Released under the MIT License
 */

(function(window, document) {
    var definedList = {};
    window.Ale = {};
    Ale.version = "0.3";

    //trim兼容性支持
    if (String.prototype.trim === undefined) {
        String.prototype.trim = function() {
            return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        }
    }
    Ale.data = function(el, data) {
        if (typeof el === "string" && typeof data === "object") {
            var thisEl,
                temSplitArr,
                isNeedPush,
                childNode,
                item,
                items,
                originEl,
                newObj,
                createEl,
                thisNowEl,
                temHTML,
                newComObj,
                elements = document.querySelectorAll(el);
            for (var i = 0; i < elements.length; i++) {
                thisEl = elements[i];

                childNode = thisEl.children;
                for (var a = 0; a < childNode.length; a++) {
                    //check children a-for
                    if (childNode[a].getAttribute("a-for") !== null) {
                        item = childNode[a].getAttribute("a-for").split("in")[0].trim(),
                            items = childNode[a].getAttribute("a-for").split("in")[1].trim();
                        if (Array.isArray(data[items]) && data[items].length !== 0) {
                            originEl = childNode[a].innerHTML,
                                newObj = {},
                                createEl = document.createElement(childNode[a].tagName.toLowerCase());
                            for (var c = 0; c < data[items].length; c++) {
                                newObj[item] = data[items][c];
                                thisNowEl = document.createElement(childNode[a].tagName.toLowerCase());
                                thisNowEl.innerHTML = alen(originEl, newObj);
                                thisNowEl = deepForChildEl(thisNowEl, data[items][c]);
                                createEl.innerHTML += "<" + childNode[a].tagName.toLowerCase() + ">" + thisNowEl.innerHTML + "</" + childNode[a].tagName.toLowerCase() + ">";
                            }
                            elements[i].innerHTML = createEl.innerHTML;
                        }
                    }
                }

                //rendering template
                thisEl.innerHTML = alen(thisEl.innerHTML, data);
            }
        } else {
            //报错
            throw "Ale.js: Wrong data type! In function data.";
        }
    }

    Ale.define = function(config) {
        if (typeof config === "object" && !Array.isArray(config)) {
            if (typeof config.name === "string" && typeof config.template === "string" && definedList[config.name] === undefined) {
                definedList[config.name] = [config.template, config.parameters];
                if (Array.isArray(config.state)) {
                    definedList[config.name].push(config.state);
                } else {
                    definedList[config.name].push(undefined);
                }
                if (typeof config.life === "object" && !Array.isArray(config.life)) {
                    definedList[config.name].push({});
                    if (config.life.Using) {
                        //When component has been Using 使用时
                        definedList[config.name][3].Using = config.life.Using;
                    }
                    if (config.life.Mounting) {
                        //When component has been Mounting 插入真实DOM时
                        definedList[config.name][3].Mounting = config.life.Mounting;
                    }
                    if (config.life.Rendering) {
                        //When component has been Rendering 渲染时
                        definedList[config.name][3].Rendering = config.life.Rendering;
                    }
                    if (config.life.Unmounting) {
                        //When component has been Unmounting 移出真实DOM时
                        definedList[config.name][3].Unmounting = config.life.Unmounting;
                    }
                    if (config.life.Destroy) {
                        //When component has been Destroy 销毁时
                        definedList[config.name][3].Destroy = config.life.Destroy;
                    }
                } else {
                    definedList[config.name].push(undefined);
                }
                if (typeof config.permissions === "object" && !Array.isArray(config.permissions)) {
                    definedList[config.name].push(config.permissions);
                } else {
                    definedList[config.name].push(undefined);
                }
            } else {
                //报错
                throw "Ale.js: The data type is wrong or the necessary data is missing! In function define.";
            }
        } else {
            //报错
            throw "Ale.js: Wrong data type! In function define.";
        }
    }

    Ale.use = function(config) {
        if (typeof config === "object" && !Array.isArray(config)) {
            if (typeof config.name === "string" && typeof config.el === "string" && definedList[config.name] !== undefined) {
                var newPara = {},
                    tem,
                    elList,
                    el,
                    aleCom;
                /**
                 * 0 template
                 * 1 parameters
                 * 2 state
                 * 3 life
                 * 4 permission
                 */
                //执行life using
                if (definedList[config.name][3] !== undefined && typeof definedList[config.name][3].Using === "function") {
                    definedList[config.name][3].Using();
                }

                //执行life rendering
                if (definedList[config.name][3] !== undefined && typeof definedList[config.name][3].Rendering === "function") {
                    definedList[config.name][3].Rendering();
                }

                if (typeof definedList[config.name][1] === "object" && !Array.isArray(definedList[config.name][1])) {
                    newPara = cloneObj(definedList[config.name][1]);
                }
                if (typeof config.parameters === "object" && !Array.isArray(config.parameters)) {
                    for (var i in config.parameters) {
                        newPara[i] = config.parameters[i];
                    }
                }
                aleCom = new AleCom(definedList[config.name][0], newPara, definedList[config.name][2], definedList[config.name][3], definedList[config.name][4]);
                //替换模板
                tem = alen(definedList[config.name][0], newPara),
                    elList = document.querySelectorAll(config.el);
                if (typeof config.events === "object" && !Array.isArray(config.events)) {
                    //有自定义事件
                    for (var i = 0; i < elList.length; i++) {
                        aleCom.el.push(elList[i]);
                        elList[i].innerHTML = tem;
                        for (var a in config.events) {
                            elList[i]["on" + a] = config.events[a];
                        }
                    }
                } else {
                    //无自定义事件
                    for (var i = 0; i < elList.length; i++) {
                        aleCom.el.push(elList[i]);
                        elList[i].innerHTML = tem;
                    }
                }
                if (definedList[config.name][3] !== undefined && typeof definedList[config.name][3].Mounting === "function") {
                    definedList[config.name][3].Mounting();
                }
                return aleCom;
            } else {
                //报错
                throw "Ale.js: The data type is wrong or the necessary data is missing! In function use.";
            }
        } else {
            //报错
            throw "Ale.js: Wrong data type! In function use!";
        }
    }

    function deepForChildEl(el, data) {
        var children = el.children,
            newObj,
            splitForArr,
            newData,
            originEl,
            createEl;
        for (var i = 0; i < children.length; i++) {
            if (children[i].getAttribute("a-for") !== null) {
                splitForArr = children[i].getAttribute("a-for").split("in")[1].trim().split("."),
                    newData = data,
                    originEl = children[i].innerHTML,
                    createEl = document.createElement(children[i].tagName.toLowerCase());
                for (var a = 0; a < splitForArr.length; a++) {
                    newData = newData[splitForArr[a]];
                }
                for (var c = 0; c < newData.length; c++) {
                    newObj = {};
                    newObj[children[i].getAttribute("a-for").split("in")[0].trim()] = newData[c];
                    thisNowEl = document.createElement(children[i].tagName.toLowerCase());
                    thisNowEl.innerHTML = alen(originEl, newObj);
                    thisNowEl = deepForChildEl(thisNowEl, newData[c]);
                    createEl.innerHTML += "<" + children[i].tagName.toLowerCase() + ">" + thisNowEl.innerHTML + "</" + children[i].tagName.toLowerCase() + ">";
                }
                el.innerHTML = createEl.innerHTML;
            } else {
                if (children[i].children.length > 0) {
                    children[i] = deepForChildEl(children[i], data);
                }
            }
        }
        return el;
    }

    function polyfillBind(fn, ctx) {
        function boundFn(a) {
            ctx._super = this;
            var l = arguments.length;
            return l ?
                l > 1 ?
                fn.apply(ctx, arguments) :
                fn.call(ctx, a) :
                fn.call(ctx)
        }
        boundFn._length = fn.length;
        return boundFn;
    }

    function AleCom(tem, obj, state, life, permission) {
        this.el = [];
        this.tem = tem;
        this.obj = obj;
        this.state = state;
        this.nowState = 0;
        this.life = life;
        this.permission = permission;
        if (this.life !== undefined) {
            for (var i in this.life) {
                this.life[i] = polyfillBind(this.life[i], this);
            }
        }
        this.destroy = function() {
            for (var i = 0; i < this.el.length; i++) {
                this.el[i].innerHTML = "";
            }
            if (this.life !== undefined && typeof this.life.Unmounting === "function") {
                this.life.Unmounting();
            }
            var life = this.life;
            for (var i in this) {
                this[i] = undefined;
            }
            if (life !== undefined && typeof life.Destroy === "function") {
                life.Destroy();
            }
        }

        this.changeState = function(obj) {
            if (this.permission !== undefined && typeof this.permission.changeState === "boolean") {
                if (!this.permission.changeState) {
                    throw "Ale.js: Operations are not allow! (no permission)";
                }
            }
            if (this.life !== undefined && typeof this.life.Rendering === "function") {
                this.life.Rendering();
            }
            for (var i in obj) {
                this.obj[i] = obj[i];
            }
            var tem = alen(this.tem, this.obj);
            for (var i = 0; i < this.el.length; i++) {
                this.el[i].innerHTML = tem;
            }
        }

        this.nextState = function() {
            if (this.permission !== undefined && typeof this.permission.nextState === "boolean") {
                if (!this.permission.nextState) {
                    throw "Ale.js: Operations are not allow! (no permission)";
                }
            }
            if (this.state !== undefined && this.state[this.nowState] !== undefined) {
                if (this.life !== undefined && typeof this.life.Rendering === "function") {
                    this.life.Rendering();
                }
                var tem = alen(this.tem, this.state[this.nowState]);
                for (var i = 0; i < this.el.length; i++) {
                    this.el[i].innerHTML = tem;
                }
                this.nowState++;
                return true;
            } else {
                return false;
            }
        }

        this.addState = function(arr) {
            if (this.permission !== undefined && typeof this.permission.addState === "boolean") {
                if (!this.permission.addState) {
                    throw "Ale.js: Operations are not allow! (no permission)";
                }
            }
            if (Array.isArray(arr)) {
                if (this.state === undefined) {
                    this.state = [];
                }
                this.state = this.state.concat(arr);
            } else {
                //报错
                throw "Ale.js: Wrong data type! In function addState!";
            }
        }

        this.removeState = function() {
            if (this.permission !== undefined && typeof this.permission.removeState === "boolean") {
                if (!this.permission.removeState) {
                    throw "Ale.js: Operations are not allow! (no permission)";
                }
            }
            if (this.state !== undefined) {
                if (this.state.length > 0 && this.nowState < this.state.length) {
                    this.state.splice(this.state.length - 1, 1);
                    return true;
                } else {
                    return false;
                }
            } else {
                //报错
                throw "Ale.js: State is not created!";
            }
        }

        this.setState = function(arr) {
            if (this.permission !== undefined && typeof this.permission.setState === "boolean") {
                if (!this.permission.setState) {
                    throw "Ale.js: Operations are not allow! (no permission)";
                }
            }
            if (Array.isArray(arr)) {
                this.state = arr;
                this.nowState = 0;
            } else {
                //报错
                throw "Ale.js: Wrong data type! In function setState!";
            }
        }

        this.backState = function() {
            if (this.permission !== undefined && typeof this.permission.backState === "boolean") {
                if (!this.permission.backState) {
                    throw "Ale.js: Operations are not allow! (no permission)";
                }
            }
            if (this.state !== undefined && this.state[this.nowState - 2] !== undefined) {
                this.nowState--;
                if (this.life !== undefined && typeof this.life.Rendering === "function") {
                    this.life.Rendering();
                }
                var tem = alen(this.tem, this.state[this.nowState - 1]);
                for (var i = 0; i < this.el.length; i++) {
                    this.el[i].innerHTML = tem;
                }
                return true;
            } else {
                return false;
            }
        }

        this.allState = function() {
            if (this.state !== undefined) {
                return this.state.length
            }
        }
    }

    function cloneObj(obj) {
        if (obj === null) return null
        if (typeof obj !== 'object') return obj;
        if (obj.constructor === Date) return new Date(obj);
        if (obj.constructor === RegExp) return new RegExp(obj);
        var newObj = new obj.constructor(); //保持继承链
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) { //不遍历其原型链上的属性
                var val = obj[key];
                newObj[key] = typeof val === 'object' ? arguments.callee(val) : val; // 使用arguments.callee解除与函数名的耦合
            }
        }
        return newObj;
    };

    /** Alen Engine
     * Version: 1.2
     * Create by Dong Yingxuan (Bill)
     */
    function alen(html, data) {
        var matchTem,
            reg,
            thisTem,
            compileArrStr;
        html = html.replace(/\n/g, "").replace(/\r/g, ""),
            matchTem = html.match(/(?<=\{\{).*?(?=\}\})/g);
        if (matchTem === null) {
            return html;
        }
        for (var i = 0; i < matchTem.length; i++) {
            thisTem = matchTem[i];
            if (matchTem[i].substr(0, 2) === "=!") {
                //输出（转义html字符）
                matchTem[i] = matchTem[i].substr(2);
                matchTem[i] = matchTem[i].trim();
                for (var a in data) {
                    matchTem[i] = temTypeCom(a, data[a], matchTem[i]);
                }
                try {
                    matchTem[i] = new Function("return " + matchTem[i])();
                } catch (e) {
                    matchTem[i] = "{{=" + matchTem[i] + "}}";
                }
                if (typeof matchTem[i] === "object" && !Array.isArray(matchTem[i])) {
                    matchTem[i] = JSON.stringify(matchTem[i]);
                }
                matchTem[i] = matchTem[i].replace(/</g, "&lt;").replace(/>/g, "&gt;");
                thisTem = thisTem.replace(/\\/g, "\\\\").replace(/\?/, "\\?").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\*/g, "\\*").replace(/\+/g, "\\+").replace(/\-/g, "\\-").replace(/\//g, "\\/").replace(/\$/g, "\\$").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
                reg = new RegExp("\{\{" + thisTem + "\}\}", "g");
                html = html.replace(reg, matchTem[i]);
            } else if (matchTem[i].substr(0, 1) === "=") {
                //输出（不转义html字符）
                matchTem[i] = matchTem[i].substr(1);
                matchTem[i] = matchTem[i].trim();
                for (var a in data) {
                    matchTem[i] = temTypeCom(a, data[a], matchTem[i]);
                }
                try {
                    matchTem[i] = new Function("return " + matchTem[i])();
                } catch (e) {
                    matchTem[i] = "{{=" + matchTem[i] + "}}";
                }

                if (typeof matchTem[i] === "object" && !Array.isArray(matchTem[i])) {
                    matchTem[i] = JSON.stringify(matchTem[i]);
                }
                thisTem = thisTem.replace(/\\/g, "\\\\").replace(/\?/, "\\?").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\*/g, "\\*").replace(/\+/g, "\\+").replace(/\-/g, "\\-").replace(/\//g, "\\/").replace(/\$/g, "\\$").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
                reg = new RegExp("\{\{" + thisTem + "\}\}", "g");
                html = html.replace(reg, matchTem[i]);
            } else {
                //执行
                matchTem[i] = matchTem[i].trim();
                for (var a in data) {
                    matchTem[i] = temTypeCom(a, data[a], matchTem[i]);
                }
                new Function(matchTem[i])();
                thisTem = thisTem.replace(/\\/g, "\\\\").replace(/\?/, "\\?").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\*/g, "\\*").replace(/\+/g, "\\+").replace(/\-/g, "\\-").replace(/\//g, "\\/").replace(/\$/g, "\\$").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
                reg = new RegExp("\{\{" + thisTem + "\}\}", "g");
                html = html.replace(reg, "");
            }
        }
        return html;
    }

    function temTypeCom(a, data, matchTem) {
        var reg = new RegExp("\\$" + a + "\\$", "g");
        if (typeof data === "string") {
            data = data.replace(/\"/g, "\\\"");
            matchTem = matchTem.replace(reg, "\"" + data + "\"");
        } else if (typeof data === "object" && !Array.isArray(data)) {
            matchTem = matchTem.replace(reg, JSON.stringify(data));
        } else if (Array.isArray(data)) {
            compileArrStr = "\"[";
            for (var c = 0; c < data.length; c++) {
                compileArrStr += "\\\"" + data[c].replace(/\"/g, "\\\"") + "\\\",";
            }
            compileArrStr = compileArrStr.substr(0, compileArrStr.length - 1);
            compileArrStr += "]\"";
            matchTem = matchTem.replace(reg, compileArrStr);
        } else if (typeof data === "function") {
            data = data(),
                matchTem = temTypeCom(a, data, matchTem);
        } else {
            //不能识别的类型都按字符串处理
            data = String(data).replace(/\"/g, "\\\"");
            matchTem = matchTem.replace(reg, "\"" + data + "\"");
        }
        return matchTem;
    }
})(window, document);

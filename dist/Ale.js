/*! Ale.js JavaScript Framework
 * Version: 1.0-Alpha
 * (c) 2018 Dong Yingxuan (Bill Dong) - China
 * Released under the MIT License
 */

(function(window, document) {
    var definedList = {};
    window.Ale = {};
    Ale.version = "1.0-Alpha";

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

                //Rendering template
                thisEl.innerHTML = alen(thisEl.innerHTML, data);
            }
        } else {
            //报错
            throw "Ale.js: Wrong data type! In function data.";
        }
    }

    Ale.define = function(config) {
        if (typeof config === "object" && !Array.isArray(config)) {
            if (typeof config.name === "string" && (typeof config.template === "string" || typeof config.template === "function") && definedList[config.name] === undefined) {

                //检测组件是否已经被定义
                if (definedList[config.name] !== undefined) {
                    throw "Ale.js: This component has been defined!";
                }

                //只是简单的存储，之后全部的逻辑都在use函数检测
                definedList[config.name] = config;

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

                //判断组件是否没有定义
                if (definedList[config.name] === undefined) {
                    throw "Ale.js: This component is undefined!";
                }

                /*
                    el
                    template
                    states
                    events

                 */

                var newObj = definedList[config.name];
                newObj.el = config.el;

                if (typeof newObj.life === "object" && typeof newObj.life.Using === "function") {
                    newObj.life.Using();
                }

                //判断是否有data
                if (typeof config.data === "object") {
                    for (var i in config.data) {
                        newObj.data[i] = config.data[i];
                    }
                }

                //判断template
                if (typeof newObj.template === "function") {
                    newObj.templateFn = newObj.template;
                    newObj.template = polyfillBind(newObj.template, newObj.data)();
                }

                //判断是否有states
                if (typeof config.states === "function") {
                    newObj.statesFn = config.states;
                    config.states = polyfillBind(config.states, newObj.data)();
                }

                if (Array.isArray(config.states)) {
                    newObj.states = config.states;
                } else {
                    if (typeof newObj.states === "function") {
                        newObj.statesFn = newObj.states;
                        newObj.states = polyfillBind(newObj.states, newObj.data)();
                    }
                }

                newObj.events = typeof newObj.events === "object" ? newObj.events : {};

                //判断是否有events
                if (typeof newObj.events === "function") {
                    newObj.eventsFn = newObj.events;
                    newObj.events = polyfillBind(newObj.events, newObj.data)();
                }

                if (typeof config.events === "function") {
                    newObj.eventsFn = config.events;
                    config.events = polyfillBind(config.events, newObj.data)();
                }

                if (typeof config.events === "object") {
                    for (var i in config.events) {
                        newObj.events[i] = config.events[i];
                    }
                }

                //判断是否有defaultState
                if (typeof config.defaultState === "number") {
                    newObj.defaultState = config.defaultState;
                }

                return new AleCom(newObj);
            } else {
                //报错
                throw "Ale.js: The data type is wrong or the necessary data is missing! In function use.";
            }
        } else {
            //报错
            throw "Ale.js: Wrong data type! In function use!";
        }
    }

    function AleCom(config) {
        this.el = document.querySelectorAll(config.el);
        this.template = config.template;
        this.data = typeof config.data === "object" ? config.data : {};
        this.states = config.states;
        this.life = typeof config.life === "object" ? config.life : {};
        this.events = config.events;
        this.permissions = typeof config.permissions === "object" ? config.permissions : {};
        //默认为0
        this.defaultState = typeof config.defaultState === "number" ? config.defaultState : 0;
        this.nowState = this.defaultState;
        this.eventsFn = config.eventsFn;
        this.statesFn = config.statesFn;
        this.templateFn = config.templateFn;

        //初始化permissions
        for (var i = 0; i < this.permissionsList.length; i++) {
            if (typeof this.permissions[this.permissionsList[i]] !== "boolean") {
                this.permissions[this.permissionsList[i]] = true;
            }
        }


        //init functions
        this.nextStates = function(steps) {
            if (!this.permissions.nextStates) {
                throw "Ale.js: Operations are not allow! (no permission)";
            }

            if (!Array.isArray(this.states)) {
                return false;
            }

            if (typeof steps !== "number") {
                steps = 1;
            }

            //判断是否有下一个state
            if (this.states[this.nowState + steps] !== undefined) {
                this.nowState += steps;

                if (typeof this.life.Rendering === "function") {
                    polyfillBind(this.life.Rendering, this)();
                }

                var tem = alen(this.template, this.states[this.nowState]);

                //diff
                for (var i = 0; i < this.el.length; i++) {
                    this.el[i].innerHTML = tem;
                }
                return true;
            } else {
                return false;
            }
        }

        this.backStates = function(steps) {
            if (!this.permissions.backStates) {
                throw "Ale.js: Operations are not allow! (no permission)";
            }

            if (!Array.isArray(this.states)) {
                return false;
            }

            if (typeof steps !== "number") {
                steps = 1;
            }

            //判断是否有上一个state
            if (this.states[this.nowState - steps] !== undefined) {
                this.nowState -= steps;

                if (typeof this.life.Rendering === "function") {
                    polyfillBind(this.life.Rendering, this)();
                }

                var tem = alen(this.template, this.states[this.nowState]);
                for (var i = 0; i < this.el.length; i++) {
                    this.el[i].innerHTML = tem;
                }
                return true;
            } else {
                return false;
            }
        }

        this.changeState = function(obj) {
            if (!this.permissions.changeState) {
                throw "Ale.js: Operations are not allow! (no permission)";
            }

            if (typeof obj === "object") {
                var tem = alen(this.template, obj);
                for (var i = 0; i < this.el.length; i++) {
                    this.el[i].innerHTML = tem;
                }
            } else {
                throw "Ale.js: Wrong parameter type! In function changeState."
            }
        }

        this.setStates = function(arr) {
            if (!this.permissions.setStates) {
                throw "Ale.js: Operations are not allow! (no permission)";
            }

            if (!Array.isArray(arr)) {
                throw "Ale.js: Wrong parameter type! In function setStates."
            }
            this.states = arr;
        }

        this.addStates = function(arr) {
            if (!this.permissions.addStates) {
                throw "Ale.js: Operations are not allow! (no permission)";
            }

            if (!Array.isArray(arr)) {
                throw "Ale.js: Wrong parameter type! In function addStates."
            }

            if (!Array.isArray(this.states)) {
                this.states = arr;
            } else {
                this.states = this.states.concat(arr);
            }
        }

        this.removeStates = function(steps) {
            if (!this.permissions.removeStates) {
                throw "Ale.js: Operations are not allow! (no permission)";
            }

            if (typeof steps !== "number") {
                steps = 1;
            }

            if (!Array.isArray(this.states) || this.states[this.states.length - steps] === undefined || this.nowState >= this.states.length - steps) {
                return false;
            }

            this.states.splice(this.states.length - steps, steps);

            return true;

        }

        this.statesLength = function() {
            if (Array.isArray(this.states)) {
                return this.states.length;
            }
        }

        this.changeData = function(key, val) {
            if (!this.permissions.changeData) {
                throw "Ale.js: Operations are not allow! (no permission)";
            }

            if (typeof key === "object") {
                //多个字段替换
                for (var i in key) {
                    this.data[i] = key[i];
                }

                //替换全部已经生成的参数
                if (typeof this.templateFn === "function") {
                    this.template = polyfillBind(this.templateFn, this.data)();
                }

                if (typeof this.statesFn === "function") {
                    this.states = polyfillBind(this.statesFn, this.data)();
                    this.nowState = 0;
                }

                if (typeof this.eventsFn === "function") {
                    this.events = polyfillBind(this.eventsFn, this.data)();
                }

                if (Array.isArray(this.states) && this.states.length > 0) {

                    if (typeof this.life.Rendering === "function") {
                        polyfillBind(this.life.Rendering, this)();
                    }

                    var tem = alen(this.template, this.states[0]);
                    for (var i = 0; i < this.el.length; i++) {
                        this.el[i].innerHTML = tem;
                    }
                } else {
                    if (typeof this.life.Rendering === "function") {
                        polyfillBind(this.life.Rendering, this)();
                    }

                    for (var i = 0; i < this.el.length; i++) {
                        this.el[i].innerHTML = this.template;
                    }
                }
            } else {
                //单个字段替换
                this.data[key] = val;

                //替换全部已经生成的参数
                if (typeof this.templateFn === "function") {
                    this.template = polyfillBind(this.templateFn, this.data)();
                }

                if (typeof this.statesFn === "function") {
                    this.states = polyfillBind(this.statesFn, this.data)();
                    this.nowState = 0;
                }

                if (typeof this.eventsFn === "function") {
                    this.events = polyfillBind(this.eventsFn, this.data)();
                }

                if (Array.isArray(this.states) && this.states.length > 0) {
                    var tem = alen(this.template, this.states[0]);

                    if (typeof this.life.Rendering === "function") {
                        polyfillBind(this.life.Rendering, this)();
                    }

                    for (var i = 0; i < this.el.length; i++) {
                        this.el[i].innerHTML = tem;
                    }
                } else {

                    if (typeof this.life.Rendering === "function") {
                        polyfillBind(this.life.Rendering, this)();
                    }

                    for (var i = 0; i < this.el.length; i++) {
                        this.el[i].innerHTML = this.template;
                    }
                }
            }
        }

        this.destroy = function() {
            for (var i = 0; i < this.el.length; i++) {
                this.el[i].innerHTML = "";
            }
            var lifeDestroyFn = this.life.Destroy;
            if (typeof this.life.Unmounting === "function") {
                polyfillBind(this.life.Unmounting, this)();
            }
            for (var i in this) {
                this[i] = undefined;
            }
            if (typeof lifeDestroyFn === "function") {
                lifeDestroyFn();
            }
        }


        //init (must be last one to init)
        if (typeof this.life.Rendering === "function") {
            polyfillBind(this.life.Rendering, this)();
        }

        var nowEl,
            virEl;

        if (Array.isArray(this.states)) {
            //有state
            var tem = alen(this.template, this.states[this.defaultState]);

            if (typeof this.events === "object") {
                for (var i = 0; i < this.el.length; i++) {
                    nowEl = this.el[i];
                    nowEl.innerHTML = tem;

                    for (var a in this.events) {
                        this.el[i]["on" + a] = this.events[a];
                    }
                }
            } else {
                for (var i = 0; i < this.el.length; i++) {
                    nowEl = this.el[i];
                    nowEl.innerHTML = tem;
                }
            }
        } else {
            //无state
            if (typeof this.events === "object") {
                for (var i = 0; i < this.el.length; i++) {
                    nowEl = this.el[i];
                    nowEl.innerHTML = this.template;

                    for (var a in this.events) {
                        nowEl["on" + a] = this.events[a];
                    }
                }
            } else {
                for (var i = 0; i < this.el.length; i++) {
                    nowEl = this.el[i];
                    nowEl.innerHTML = this.template;
                }
            }
        }

        if (typeof this.life.Mounting === "function") {
            polyfillBind(this.life.Mounting, this)();
        }
    }
    AleCom.prototype.permissionsList = ["changeState", "nextStates", "addStates", "removeStates", "setStates", "backStates", "changeData"];

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

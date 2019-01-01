/*! Ale.js JavaScript Framework
 * Version: 1.0-Beta.1
 * (c) 2018 Dong Yingxuan (Bill Dong)
 * Released under the MIT License
 */

/* life:
    using
    mounting
    unmounting
    rendering
    updating
    destroy
*/

/* debug
    setter
    getter
 */

(function(window, document) {

    var version = "1.0-Beta.1",
        componentList = [],
        regPluginList = [],
        filterList = [],
        configList = {
            html: false,
            diff: true
        }

    window.Ale = function(name, config) {
        if (typeof name !== "string" || !isRealObj(config)) {
            throw "Ale.js: Wrong type was used when creating component objects!";
        }

        if (config.template === undefined) {
            throw "Ale.js: No template or imports is added when creating a component object!";
        }

        if (componentList[name] !== undefined) {
            throw "Ale.js: This component has been created!";
        }

        config.life = isRealObj(config.life) ? config.life : {};

        //判断组件类型
        if (!Array.isArray(config.imports)) {
            //单组件
            //type 1代表单组件  2代表复合组件
            config.type = 1;

            componentList[name] = config;
        } else {
            //复合组件
            //type 1代表单组件  2代表复合组件
            config.type = 2;

            //复合组件template第一个必定是父组件的模板
            config.template = [config.template];

            var thisCom,
                newData = {};

            for (var i = 0; i < config.imports.length; i++) {
                thisCom = componentList[config.imports[i]];
                if (thisCom === undefined) {
                    throw "Ale.js: The imported component is not created!";
                }

                if (thisCom.type === 1) {
                    //单组件
                    config.template.push(thisCom.template);
                } else {
                    //复合组件
                    config.template = config.template.concat(thisCom.template);
                    config.imports = config.imports.concat(thisCom.imports);
                }

                //每一个import都替换一次全部data
                if (isRealObj(thisCom.data)) {
                    for (var a in thisCom.data) {
                        newData[a] = thisCom.data[a];
                    }
                }
            }

            //data最后替换
            config.data = isRealObj(config.data) ? config.data : {};
            for (var i in config.data) {
                newData[i] = config.data[i];
            }

            config.data = newData;

            componentList[name] = config;
        }
    }

    Ale.render = function(name, config) {
        var thisComponent = cloneObj(componentList[name]);

        if (thisComponent === undefined) {
            throw "Ale.js: This component has not been created yet!";
        }

        if (typeof config.el !== "string") {
            throw "Ale.js: The type of the el should be a string!";
        }

        //do life
        if (typeof thisComponent.life.using === "function") {
            thisComponent.life.using();
        }

        if (isRealObj(config.debug)) {
            thisComponent.debug = config.debug;
        }

        //判断单组件或复合组件
        if (thisComponent.type === 1) {
            //单组件

            //start building
            if (!isRealObj(thisComponent.data)) {
                thisComponent.data = {};
            }

            if (isRealObj(config.data)) {
                for (var i in config.data) {
                    thisComponent.data[i] = config.data[i];
                }
            }

            //start rendering
            return new aleComponentObject(config.el, thisComponent);
        } else {
            //复合组件
            var template = thisComponent.template,
                newTem = "";

            //start rendering
            return new aleComponentObject(config.el, thisComponent);

        }
    }

    Ale.config = function(key, val) {
        if (isRealObj(key)) {
            for (var i in key) {
                configList[i] = key[i];
            }
        } else if (typeof key === "string" && val !== undefined) {
            configList[key] = val;
        } else {
            throw "Ale.js: The parameter type is wrong when calling the config function!";
        }
    }

    Ale.use = function(pluginObj) {
        //检查必要字段是否添加
        if (typeof pluginObj.name !== "string" || typeof pluginObj.install !== "function") {
            throw "Ale.js: Some fields were not added when the plugin was registered!";
        }

        if (regPluginList[pluginObj.name] !== undefined) {
            //插件已经被注册了
            throw "Ale.js: This plugin has been registered!";
        }

        //开始注册
        regPluginList[pluginObj.name] = pluginObj.name;

        pluginObj.install();
    }

    Ale.filter = function(fun) {
        //检查类型
        if (typeof fun !== "function" && !Array.isArray(fun)) {
            throw "Ale.js: You need to pass in a function or array when adding a filter!";
        }

        if (typeof fun === "function") {
            filterList.push(fun);
        } else if (Array.isArray(fun)) {
            filterList = filterList.concat(fun);
        }
    }

    Ale.version = version;

    function aleComponentObject(el, config) {
        this.el = el;
        this.nodeList = document.querySelectorAll(this.el);
        this.config = config;
        this.template = config.template;
        this.data = config.data;
        this.life = config.life;
        this.type = config.type;
        this.imports = config.imports;
        this.debug = config.debug;
        this.methods = isRealObj(config.methods) ? config.methods : {};

        //xss replace
        for (var i in this.data) {
            this.data[i] = xssTemReplace(this.data[i]);
        }

        //start building
        var template = this.template;

        if (this.type === 1) {
            //单组件
            if (typeof template === "function") {
                template = bindObj(template, this.data)();
            }
        } else {
            //复合组件
            var newTem = template[0], //第一个必定是父组件模板
                reg;

            if (typeof newTem === "function") {
                newTem = bindObj(newTem, this.data)();
            }

            for (var i = 1; i < template.length; i++) {
                reg = new RegExp("<" + this.imports[i - 1] + "/>", "g");
                if (typeof template[i] === "function") {
                    newTem = newTem.replace(reg, bindObj(template[i], this.data)());
                } else {
                    newTem = newTem.replace(reg, template[i]);
                }
            }
            template = newTem;
        }

        //生命周期添加data
        this.life = lifeBindThis(this.life, this);

        //为了防止栈溢出，克隆一个data
        var newData = cloneObj(this.data);

        (function(i, data, methods, template, nodeList, lifeRendering, lifeUpdating, type, imports, debug) {
            Object.defineProperty(i, "data", {
                set: function(val) {
                    //当属性改变时动态渲染

                    if (isRealObj(debug) && typeof debug.setter === "function") {
                        debug.setter(val);
                    }

                    for (var a in val) {
                        newData[a] = xssTemReplace(val[a]);
                    }

                    if (typeof lifeUpdating === "function") {
                        lifeUpdating();
                    }

                    //判断组件类型
                    if (type === 1) {
                        //单组件
                        //判断模板是否为函数
                        var newTem = typeof template === "function" ? bindObj(template, newData)() : template,
                            newEl = document.createElement("div");

                        //filter
                        for (var a = 0; a < filterList.length; a++) {
                            newTem = filterList[a](newTem);
                        }

                        newEl.innerHTML = newTem;

                        if (typeof lifeRendering === "function") {
                            lifeRendering();
                        }

                        for (var a = 0; a < nodeList.length; a++) {
                            deepForDiff(newEl.childNodes, nodeList[a].childNodes, nodeList[a], newTem);
                            elDeepAddDM(nodeList[a], data, methods);
                        }
                    } else {
                        //复合组件
                        var newTem = template[0], //第一个必定是父组件模板
                            reg,
                            newEl = document.createElement("div");

                        if (typeof newTem === "function") {
                            newTem = bindObj(newTem, data)();
                        }

                        for (var a = 1; a < template.length; a++) {
                            reg = new RegExp("<" + imports[a - 1] + "/>", "g");
                            if (typeof template[a] === "function") {
                                newTem = newTem.replace(reg, bindObj(template[a], newData)());
                            } else {
                                newTem = newTem.replace(reg, template[a]);
                            }
                        }

                        //filter
                        for (var a = 0; a < filterList.length; a++) {
                            newTem = filterList[a](newTem);
                        }

                        newEl.innerHTML = newTem;

                        if (typeof lifeRendering === "function") {
                            lifeRendering();
                        }

                        for (var a = 0; a < nodeList.length; a++) {
                            deepForDiff(newEl.childNodes, nodeList[a].childNodes, nodeList[a], newTem);
                            elDeepAddDM(nodeList[a], data);
                        }
                    }
                },
                get: function() {
                    if (isRealObj(debug) && typeof debug.getter === "function") {
                        debug.getter(data);
                    }

                    return data;
                }
            })
        })(this, this.data, this.methods, this.template, this.nodeList, this.life.rendering, this.life.updating, this.type, this.imports, this.debug);

        for (var i in this.data) {
            (function(i, data, methods, template, nodeList, lifeRendering, lifeUpdating, type, imports, debug) {
                Object.defineProperty(data, i, {
                    set: function(val) {
                        //当属性改变时动态渲染

                        if (isRealObj(debug) && typeof debug.setter === "function") {
                            debug.setter(val);
                        }

                        newData[i] = xssTemReplace(val);

                        if (typeof lifeUpdating === "function") {
                            lifeUpdating();
                        }

                        //判断组件类型
                        if (type === 1) {
                            //单组件
                            //判断模板是否为函数
                            var newTem = typeof template === "function" ? bindObj(template, newData)() : template,
                                newEl = document.createElement("div");

                            //filter
                            for (var a = 0; a < filterList.length; a++) {
                                newTem = filterList[a](newTem);
                            }

                            newEl.innerHTML = newTem;

                            if (typeof lifeRendering === "function") {
                                lifeRendering();
                            }

                            for (var a = 0; a < nodeList.length; a++) {
                                deepForDiff(newEl.childNodes, nodeList[a].childNodes, nodeList[a], newTem);
                                elDeepAddDM(nodeList[a], data, methods);
                            }
                        } else {
                            //复合组件
                            var newTem = template[0], //第一个必定是父组件模板
                                reg,
                                newEl = document.createElement("div");

                            if (typeof newTem === "function") {
                                newTem = bindObj(newTem, data)();
                            }

                            for (var a = 1; a < template.length; a++) {
                                reg = new RegExp("<" + imports[a - 1] + "/>", "g");
                                if (typeof template[a] === "function") {
                                    newTem = newTem.replace(reg, bindObj(template[a], newData)());
                                } else {
                                    newTem = newTem.replace(reg, template[a]);
                                }
                            }

                            //filter
                            for (var a = 0; a < filterList.length; a++) {
                                newTem = filterList[a](newTem);
                            }

                            newEl.innerHTML = newTem;

                            if (typeof lifeRendering === "function") {
                                lifeRendering();
                            }

                            for (var a = 0; a < nodeList.length; a++) {
                                deepForDiff(newEl.childNodes, nodeList[a].childNodes, nodeList[a], newTem);
                                elDeepAddDM(nodeList[a], data, methods);
                            }

                        }
                    },
                    get: function() {
                        if (isRealObj(debug) && typeof debug.getter === "function") {
                            debug.getter(newData[i]);
                        }

                        return newData[i];
                    }
                })
            })(i, this.data, this.methods, this.template, this.nodeList, this.life.rendering, this.life.updating, this.type, this.imports, this.debug);
        }

        //start rendering
        if (typeof this.life.rendering === "function") {
            this.life.rendering();
        }

        //filter
        for (var a = 0; a < filterList.length; a++) {
            template = filterList[a](template);
        }

        for (var i = 0; i < this.nodeList.length; i++) {
            this.nodeList[i].innerHTML = template;
            elDeepAddDM(this.nodeList[i], this.data, this.methods);
        }

        if (typeof this.life.mounting === "function") {
            this.life.mounting();
        }
    }

    aleComponentObject.prototype.destroy = function() {
        for (var i = 0; i < this.nodeList.length; i++) {
            this.nodeList[i].innerHTML = "";
        }

        if (typeof this.life.unmounting === "function") {
            this.life.unmounting();
        }

        var lifeDestroy = this.life.destroy;

        for (var i in this.data) {
            (function(i, data) {
                Object.defineProperty(data, i, {
                    set: function() {},
                    get: function() {
                        return undefined;
                    }
                })
            })(i, this.data);
        }

        for (var i in this) {
            this[i] = undefined;
        }

        if (typeof lifeDestroy === "function") {
            lifeDestroy();
        }
    }

    /*  Simple diff
        (c) 2018 Dong Yingxuan (Bill Dong)
     */

    function deepForDiff(vNewChildren, rChildren, rParent, template) {
        if (!configList.diff) {
            rParent.innerHTML = template;
        }

        //判断子节点是否为空
        if (vNewChildren.length === 0) {
            rParent.innerHTML = "";
            return;
        }

        var a = 0;
        for (var i = 0; i < vNewChildren.length; i++) {

            //比较同级
            a = i;
            while (vNewChildren[a + 1] === undefined && rChildren[a + 1] !== undefined) {
                rChildren[a + 1].remove();
            }

            //比较子级
            //判断真实节点是否拥有这个元素
            if (rChildren[i] === undefined) {
                //没有
                rParent.appendChild(vNewChildren[i].cloneNode(true));
            } else {
                //有
                if (vNewChildren[i].nodeName === "#text") {
                    //判断真实DOM是否也是文本节点
                    if (rChildren[i].nodeName !== "#text") {
                        //不是
                        rChildren[i].innerHTML = vNewChildren[i].nodeValue;
                    } else {
                        if (vNewChildren[i].nodeValue !== rChildren[i].nodeValue) {
                            rChildren[i].nodeValue = vNewChildren[i].nodeValue;
                        }
                    }
                } else {
                    //不是文本节点
                    if (rChildren[i].nodeName !== "#text") {
                        //判断其他差异
                        if (rChildren[i].tagName !== vNewChildren[i].tagName ||
                            rChildren[i].getAttribute("id") !== vNewChildren[i].getAttribute("id") ||
                            rChildren[i].getAttribute("class") !== vNewChildren[i].getAttribute("class") ||
                            rChildren[i].getAttribute("name") !== vNewChildren[i].getAttribute("name")) {
                            var newNode = vNewChildren[i].cloneNode(true);
                            rParent.replaceChild(newNode, rChildren[i])
                        }
                    }

                    //判断虚拟DOM是否有子孙
                    if (vNewChildren[i].childNodes.length > 0) {
                        deepForDiff(vNewChildren[i].childNodes, rChildren[i].childNodes, rParent.childNodes[i]);
                    } else {
                        //没有
                        //判断真实DOM是否有子孙
                        if (rChildren[i].childNodes.length > 0) {
                            rChildren[i].innerHTML = "";
                        }
                    }
                }
            }
        }
    }

    function xssTemReplace(template) {
        if (typeof template === "string" && !configList.html) {
            template = template.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }
        return template;
    }

    function lifeBindThis(life, aleCom) {
        for (var i in life) {
            life[i] = bindObj(life[i], aleCom);
        }
        return life;
    }

    function elDeepAddDM(el, data, methods) {
        el.data = data;
        el.methods = methods;

        if (el.children.length > 0) {
            for (var i = 0; i < el.children.length; i++) {
                elDeepAddDM(el.children[i], data, methods);
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
    }

    function isRealObj(obj) {
        var proto,
            Ctor,
            class2type = function() {
                return {};
            }
        if (!obj || class2type().toString.call(obj) !== "[object Object]") {
            return false;
        }

        proto = Object.getPrototypeOf(obj);

        if (!proto) {
            return true;
        }

        Ctor = class2type.hasOwnProperty.call(proto, "constructor") && proto.constructor;
        return typeof Ctor === "function" && class2type.hasOwnProperty.toString(Ctor) === class2type.hasOwnProperty.toString(Object);
    }

    function bindObj(fn, ctx) {
        function boundFn(a) {
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

})(window, document);

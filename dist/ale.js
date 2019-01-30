/*! Ale.js JavaScript Framework
 * Version: 1.2.0
 * (c) 2018 Dong Yingxuan (Bill Dong)
 * Released under the MIT License
 */

(function(window, document) {

    "use strict";

    var version = "1.2.0",
        allUsedComponents = 0,
        componentList = [],
        regPluginList = [],
        filterList = [],
        pluginInjectList = [],
        pluginMixinList = [],
        needUpdateDOMList = [],
        needUpdateDOMListLength = 0,
        isNextTickWaiting = false,
        tickCallbackFun = null,
        configList = {
            html: false,
            diff: true,
            async: true,
            configLock: false
        };

    window.Ale = function(name, config) {
        if (typeof name !== "string" || !isRealObj(config)) {
            if (!isRealObj(name)) {
                throw "Ale.js: Wrong type of parameters was used when creating component objects!";
            } else {
                var comCreate = handleComponentCreate(name);
                if (comCreate !== undefined) {
                    return new aleLocalComponentGenerateObject();
                }
            }
        }

        if (componentList[name] !== undefined) {
            throw "Ale.js: This component has been created!";
        }

        var comCreate = handleComponentCreate(config);
        if (comCreate !== undefined) {
            componentList[name] = comCreate;
        }
    }

    Ale.render = function(name, config) {
        var thisComponent = deepCopy(componentList[name]);

        return handleComponentRender(thisComponent, config);
    }

    Ale.config = function(key, val) {
        if (configList["configLock"]) {
            throw "Ale.js: The configuration function is locked, no changes are allowed!";
        }

        if (isRealObj(key)) {
            for (var i in key) {
                configList[i] = key[i];
            }
        } else if (typeof key === "string" && typeof val === "boolean") {
            configList[key] = val;
        } else {
            throw "Ale.js: The parameter type is wrong when calling the config function!";
        }
    }

    Ale.isHasThisComponent = function(name) {
        if (componentList[name] === undefined) {
            return false;
        }
        return true;
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

    Ale.nextTick = function(fun) {
        if (typeof fun === "function") {
            tickCallbackFun = fun;
        } else {
            throw "Ale.js: You need to pass in a function when adding a tick callback function!";
        }
    }

    Ale.plugin = {
        inject: function(fun) {
            if (typeof fun !== "function") {
                throw "Ale: The wrong data type for plug-in injection!";
            }
            pluginInjectList.push(fun);
        },
        mixin: function(fun) {
            if (typeof fun !== "function") {
                throw "Ale: The wrong data type for plug-in injection!";
            }
            pluginMixinList.push(fun);
        }
    }

    Ale.version = version;

    function aleLocalComponentGenerateObject(config) {
        this.config = config;

        this.render = function(newConfig) {
            return handleComponentRender(deepCopy(this.config), newConfig);
        }
    }

    function checkDataType(data, dataType) {

        if (typeof dataType !== "undefined") {

            if (typeof dataType === "function") {
                if (!(data instanceof dataType)) {
                    throw "Ale.js: Incorrect component data type!";
                }
            } else if (Array.isArray(dataType)) {
                var isTrueData = false;

                for (var a = 0; a < dataType.length; a++) {

                    if (typeof dataType[a] === "function") {
                        if (data instanceof dataType[a]) {
                            isTrueData = true;
                            break;
                        }
                    } else {
                        if (typeof data === dataType[a]) {
                            isTrueData = true;
                            break;
                        }
                    }

                }

                if (!isTrueData) {
                    throw "Ale.js: Incorrect component data type!";
                }
            } else {
                if (typeof data !== dataType) {
                    throw "Ale.js: Incorrect component data type!";
                }
            }
        }
    }

    function aleComponentObject(el, config) {
        this.id = "i" + allUsedComponents++;
        this.el = el;
        this.nodeList = document.querySelectorAll(this.el);
        this.config = config;
        this.template = config.template;
        this.data = config.data;
        this.staticData = config.staticData;
        this.dataType = config.dataType;
        this.methods = isRealObj(config.methods) ? config.methods : {};
        this.life = config.life;
        this.type = config.type;
        this.imports = config.imports;
        this.proxy = isRealObj(config.proxy) ? config.proxy : {};
        this.watch = isRealObj(config.watch) ? config.watch : {};
        this.name = typeof config.name === "string" ? config.name : "unknow";

        //初始化dataType
        if (!isRealObj(this.dataType.data)) {
            this.dataType.data = {};
        }
        if (!isRealObj(this.dataType.staticData)) {
            this.dataType.staticData = {};
        }

        //check data type
        //xss replace
        for (var i in this.data) {
            checkDataType(this.data[i], this.dataType.data[i]);
            this.data[i] = xssTemReplace(this.data[i]);
        }
        for (var i in this.staticData) {
            checkDataType(this.staticData[i], this.dataType.staticData[i]);
            this.staticData[i] = xssTemReplace(this.staticData[i]);
        }

        //生命周期、methods和代理绑定this
        this.life = lifeBindThis(this.life, this);
        this.methods = methodsBindThis(this.methods, this);
        this.proxy = proxyBindThis(this.proxy, this);

        //为了防止栈溢出，克隆一个data
        var newData = typeof this.data === "function" ? this.data() : deepCopy(this.data);
        this.data = typeof this.data === "function" ? this.data() : this.data;

        var newStaticData = typeof this.staticData === "function" ? this.staticData() : deepCopy(this.staticData);
        this.staticData = typeof this.staticData === "function" ? this.staticData() : this.staticData;

        //设置staticData的getter和setter
        (function(i, life, staticData, proxy, dataType) {
            Object.defineProperty(i, "staticData", {
                set: function(val) {
                    if (typeof life.staticDataUpdating === "function") {
                        life.staticDataUpdating();
                    }

                    var newValObj = executeProxy("static", proxy.setter, i, val);

                    val = newValObj.val;

                    //check data type
                    for (var a in val) {
                        checkDataType(val[a], dataType.staticData[a]);
                        newStaticData[a] = xssTemReplace(val[a]);
                    }
                },
                get: function() {
                    return executeProxy("static", proxy.getter, i, staticData).val;
                }
            })
        })(this, this.life, this.staticData, this.proxy, this.dataType);

        for (var i in this.staticData) {
            (function(i, life, staticData, proxy, dataType) {
                Object.defineProperty(staticData, i, {
                    set: function(val) {
                        //check data type
                        checkDataType(val, dataType.staticData[i]);

                        if (typeof life.staticDataUpdating === "function") {
                            life.staticDataUpdating();
                        }

                        var newValObj = executeProxy("static", proxy.setter, i, val);

                        val = newValObj.val;

                        newStaticData[i] = xssTemReplace(val);
                    },
                    get: function() {
                        return executeProxy("static", proxy.getter, i, newStaticData[i]).val;
                    }
                })
            })(i, this.life, this.staticData, this.proxy, this.dataType);
        }


        //设置data的getter和setter
        (function(i, id, data, methods, template, nodeList, life, type, imports, proxy, staticData, dataType, watch) {
            Object.defineProperty(i, "data", {
                set: function(val) {
                    //当属性改变时动态渲染

                    var newValObj = executeProxy("normal", proxy.setter, i, val);

                    val = newValObj.val;

                    //check data type
                    for (var a in val) {
                        checkDataType(val[a], dataType.data[a]);
                        newData[a] = xssTemReplace(val[a]);
                    }

                    if (newValObj.needBreak) {
                        return;
                    }

                    if (typeof life.updating === "function") {
                        life.updating();
                    }

                    updateDOM(i, data, methods, {
                        id: id,
                        type: type,
                        nodeList: nodeList,
                        newData: newData,
                        template: template,
                        imports: imports,
                        life: life,
                        staticData: staticData
                    });

                },
                get: function() {
                    return executeProxy("normal", proxy.getter, i, data).val;
                }
            })
        })(this, this.id, this.data, this.methods, this.template, this.nodeList, this.life, this.type, this.imports, this.proxy, this.staticData, this.dataType, this.watch);

        for (var i in this.data) {
            (function(i, th, id, data, methods, template, nodeList, life, type, imports, proxy, staticData, dataType) {
                Object.defineProperty(data, i, {
                    set: function(val) {
                        //check data type
                        checkDataType(val, dataType.data[i]);

                        //当属性改变时动态渲染
                        var newValObj = executeProxy("normal", proxy.setter, i, val);

                        val = newValObj.val;

                        newData[i] = xssTemReplace(val);

                        if (newValObj.needBreak) {
                            return;
                        }

                        if (typeof life.updating === "function") {
                            life.updating();
                        }

                        updateDOM(th, data, methods, {
                            id: id,
                            type: type,
                            nodeList: nodeList,
                            newData: newData,
                            template: template,
                            imports: imports,
                            life: life,
                            staticData: staticData
                        });
                    },
                    get: function() {
                        return executeProxy("normal", proxy.getter, i, newData[i]).val;
                    }
                })
            })(i, this, this.id, this.data, this.methods, this.template, this.nodeList, this.life, this.type, this.imports, this.proxy, this.staticData, this.dataType);
        }

        //start building（一定要放到最后，否则无法在mounting时更新数据）
        firstRenderingDOM(this, this.data, this.methods, {
            id: this.id,
            type: this.type,
            nodeList: this.nodeList,
            template: this.template,
            imports: this.imports,
            life: this.life,
            staticData: this.staticData
        });

        if (typeof this.life.mounting === "function") {
            this.life.mounting();
        }
    }

    aleComponentObject.prototype.destroy = function() {
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

        for (var i = 0; i < this.nodeList.length; i++) {
            this.nodeList[i].innerHTML = "";
        }

        if (typeof this.life.unmounting === "function") {
            this.life.unmounting();
        }

        var lifeDestroy = this.life.destroy;

        for (var i in this) {
            delete this[i];
        }

        if (typeof lifeDestroy === "function") {
            lifeDestroy();
        }
    }

    function handleComponentRender(thisComponent, config) {
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

        if (isRealObj(config.proxy)) {
            thisComponent.proxy = config.proxy;
        }

        //start building
        thisComponent.data = typeof thisComponent.data === "function" ? thisComponent.data() : thisComponent.data;
        if (!isRealObj(thisComponent.data)) {
            thisComponent.data = {};
        }
        for (var i in config.data) {
            thisComponent.data[i] = config.data[i];
        }

        thisComponent.staticData = typeof thisComponent.staticData === "function" ? thisComponent.staticData() : thisComponent.staticData;
        if (!isRealObj(thisComponent.staticData)) {
            thisComponent.staticData = {};
        }
        for (var i in config.staticData) {
            thisComponent.staticData[i] = config.staticData[i];
        }

        for (var i in config.methods) {
            thisComponent.methods[i] = config.methods[i];
        }

        return new aleComponentObject(config.el, thisComponent);
    }

    function handleComponentCreate(config) {

        //执行混入 mixin
        for (var i = 0; i < pluginMixinList.length; i++) {
            config = pluginMixinList[i](config);
        }

        if (config.template === undefined) {
            throw "Ale.js: No template is added when creating a component object!";
        }

        config.life = isRealObj(config.life) ? config.life : {};
        config.dataType = isRealObj(config.dataType) ? config.dataType : {};

        //判断组件类型
        if (!Array.isArray(config.imports)) {
            //单组件
            //type 1代表单组件  2代表复合组件
            config.type = 1;
        } else {
            //复合组件
            //type 1代表单组件  2代表复合组件
            config.type = 2;

            //复合组件template第一个必定是父组件的模板
            config.template = [config.template];

            var thisCom,
                thisComData,
                thisComStaticData,
                newData = {},
                newMethods = {},
                newLife = {},
                newProxy = {},
                newStaticData = {},
                newDataTypeData = {},
                newDataTypeStaticData = {},
                newImports = []; //这里为了防止递归

            for (var i = 0; i < config.imports.length; i++) {

                if (typeof config.imports[i] === "string") {
                    thisCom = componentList[config.imports[i]];
                } else if (typeof config.imports[i] === "object") {
                    thisCom = config.imports[i].config;
                }

                if (thisCom === undefined) {
                    throw "Ale.js: The imported component is not created!";
                }

                if (thisCom.type === 1) {
                    //单组件
                    config.template.push(thisCom.template);
                } else {
                    //复合组件
                    config.template = config.template.concat(thisCom.template);
                    newImports = newImports.concat(thisCom.imports);
                }

                //每一个import都替换一次全部data
                thisComData = typeof thisCom.data === "function" ? thisCom.data() : thisCom.data;
                thisComStaticData = typeof thisCom.staticData === "function" ? thisCom.staticData() : thisCom.staticData;

                if (isRealObj(thisComData)) {
                    for (var a in thisComData) {
                        newData[a] = thisComData[a];
                    }
                }

                if (isRealObj(thisCom.methods)) {
                    for (var a in thisCom.methods) {
                        newMethods[a] = thisCom.methods[a];
                    }
                }

                if (isRealObj(thisCom.life)) {
                    for (var a in thisCom.life) {
                        newLife[a] = thisCom.life[a];
                    }
                }

                if (isRealObj(thisCom.proxy)) {
                    for (var a in thisCom.proxy) {
                        newProxy[a] = thisCom.proxy[a];
                    }
                }

                if (isRealObj(thisCom.dataType.data)) {
                    for (var a in thisCom.dataType.data) {
                        newDataTypeData[a] = thisCom.dataType.data[a];
                    }
                }

                if (isRealObj(thisCom.dataType.staticData)) {
                    for (var a in thisCom.dataType.staticData) {
                        newDataTypeStaticData[a] = thisCom.dataType.staticData[a];
                    }
                }

                if (isRealObj(thisComStaticData)) {
                    for (var a in thisComStaticData) {
                        newStaticData[a] = thisComStaticData[a];
                    }
                }
            }

            config.imports = config.imports.concat(newImports);

            //最后替换
            config.data = typeof config.data === "function" ? config.data() : config.data;
            config.staticData = typeof config.staticData === "function" ? config.staticData() : config.staticData;
            if (isRealObj(config.data)) {
                for (var i in config.data) {
                    newData[i] = config.data[i];
                }
            }
            //methods
            if (isRealObj(config.methods)) {
                for (var i in config.methods) {
                    newMethods[i] = config.methods[i];
                }
            }
            //life
            if (isRealObj(config.life)) {
                for (var i in config.life) {
                    newLife[i] = config.life[i];
                }
            }
            //proxy
            if (isRealObj(config.proxy)) {
                for (var i in config.proxy) {
                    newProxy[i] = config.proxy[i];
                }
            }
            //dataType data
            if (isRealObj(config.dataType.data)) {
                for (var i in config.dataType.data) {
                    newDataTypeData[i] = config.dataType.data[i];
                }
            }
            //dataType staticData
            if (isRealObj(config.dataType.staticData)) {
                for (var i in config.dataType.staticData) {
                    newDataTypeStaticData[i] = config.dataType.staticData[i];
                }
            }
            //staticData
            if (isRealObj(config.staticData)) {
                for (var i in config.staticData) {
                    newStaticData[i] = config.staticData[i];
                }
            }
            config.data = newData;
            config.methods = newMethods;
            config.life = newLife;
            config.proxy = newProxy;
            config.dataType.data = newDataTypeData;
            config.dataType.staticData = newDataTypeStaticData;
            config.staticData = newStaticData;
        }

        return config;
    }

    /*
    type：
    normal普通数据
    static静态数据
     */
    function executeProxy(type, fun, i, val) {
        if (typeof fun === "function") {

            var needBreak = false;

            function preventUpdating() {
                needBreak = true;
            }

            var passInObj = {
                    type: type,
                    key: i,
                    val: val,
                    preventUpdating: preventUpdating
                },
                newVal = fun(passInObj);

            return {
                val: newVal,
                needBreak: needBreak
            }
        }
        return {
            val: val,
            needBreak: false
        }
    }

    function isNative(api) {
        return /native code/.test(api.toString()) && typeof api !== 'undefined'
    }

    function handleDOMUpdateWhenAsync(queue) {
        for (var i in queue) {
            for (var a = 0; a < queue[i].nodeList.length; a++) {
                //开始更新DOM
                if (queue[i].diff) {
                    deepForDiff(queue[i].renderingResultObj.newEl.childNodes, queue[i].nodeList[a].childNodes, queue[i].nodeList[a], queue[i].renderingResultObj.newTem);
                } else {
                    queue[i].nodeList[a].innerHTML = queue[i].renderingResultObj.newTem;
                }
                elDeepAddDM(queue[i].nodeList[a], queue[i].data, queue[i].methods);
            }
        }
    }

    function freshAsyncQueue() {
        if (typeof tickCallbackFun === "function") {
            //这里新建一个变量存储 tickCallbackFun，是为了预防用户在里面添加nextTick
            var tickCallbackFunCopy = tickCallbackFun;
            tickCallbackFun = null;
            tickCallbackFunCopy();
        }

        if (needUpdateDOMListLength === 0) {
            isNextTickWaiting = false;
        } else {
            nextTick(needUpdateDOMList);
            needUpdateDOMList = [];
            needUpdateDOMListLength = 0;
        }
    }

    function nextTick(queue) {
        isNextTickWaiting = true;

        (function(queue) {
            //api状态
            if (typeof Promise !== "undefined" && isNative(Promise)) {
                new Promise(function(res, rej) {
                    res();
                }).then(function() {
                    handleDOMUpdateWhenAsync(queue);
                    //刷新异步队列
                    freshAsyncQueue();
                })
            } else {
                //使用timeout
                setTimeout(function() {
                    handleDOMUpdateWhenAsync(queue);
                    //刷新异步队列
                    freshAsyncQueue();
                }, 0);
            }
        })(queue);
    }

    function DOMUpdateQueue(data, methods, obj) {
        //判断是否在全局设置里打开了async
        if (configList.async) {
            obj.data = data;
            obj.methods = methods;

            //判断是否wating
            needUpdateDOMList[obj.id.toString()] = obj;
            needUpdateDOMListLength++;
            if (!isNextTickWaiting) {
                //异步更新DOM
                nextTick(needUpdateDOMList);
                needUpdateDOMList = [];
                needUpdateDOMListLength = 0;
            }
        } else {
            for (var a = 0; a < obj.nodeList.length; a++) {
                if (obj.diff) {
                    deepForDiff(obj.renderingResultObj.newEl.childNodes, obj.nodeList[a].childNodes, obj.nodeList[a], obj.renderingResultObj.newTem);
                } else {
                    obj.nodeList[a].innerHTML = obj.renderingResultObj.newTem;
                }
                elDeepAddDM(obj.nodeList[a], data, methods);
            }
        }
    }

    function renderingDOM(obj) {

        /* obj内部属性
            type
            template
            data
            life
            nodeList
            imports
            staticData
            methods
         */

        var templateBindObj = {
            data: obj.data,
            methods: obj.methods,
            staticData: obj.staticData
        }

        //判断组件类型
        if (obj.type === 1) {
            //单组件
            //判断模板是否为函数
            var newTem = typeof obj.template === "function" ? bindObj(obj.template, templateBindObj)() : obj.template,
                newEl = document.createElement("div");

            //filter
            for (var a = 0; a < filterList.length; a++) {
                newTem = filterList[a](newTem);
            }

            newEl.innerHTML = newTem;

        } else {
            //复合组件
            var newTem = obj.template[0], //第一个必定是父组件模板
                reg,
                newEl = document.createElement("div");

            if (typeof newTem === "function") {
                newTem = bindObj(newTem, templateBindObj)();
            }

            for (var a = 1; a < obj.template.length; a++) {
                reg = new RegExp("<" + (typeof obj.imports[a - 1] === "string" ? obj.imports[a - 1] : obj.imports[a - 1].config.name) + "/>", "g");
                if (typeof obj.template[a] === "function") {
                    newTem = newTem.replace(reg, bindObj(obj.template[a], templateBindObj)());
                } else {
                    newTem = newTem.replace(reg, obj.template[a]);
                }
            }

            //filter
            for (var a = 0; a < filterList.length; a++) {
                newTem = filterList[a](newTem);
            }

            newEl.innerHTML = newTem;
        }

        if (typeof obj.life.rendering === "function") {
            obj.life.rendering();
        }

        return ({
            newEl: newEl,
            newTem: newTem
        });
    }

    function executePluginInject(th) {
        for (var i = 0; i < pluginInjectList.length; i++) {
            pluginInjectList[i](th);
        }
    }

    function firstRenderingDOM(i, data, methods, obj) {
        /* obj内部属性
            type
            template
            life
            nodeList
            imports
            id
            staticData
         */

        obj.data = data;
        obj.methods = methods;
        var renderingResultObj = renderingDOM(obj);

        DOMUpdateQueue(data, methods, {
            id: obj.id,
            nodeList: obj.nodeList,
            renderingResultObj: renderingResultObj,
            diff: false
        });

        executePluginInject(i);
    }

    function updateDOM(i, data, methods, obj) {
        /* obj内部属性
            type
            template
            life
            nodeList
            imports
            id
            staticData
            newData（这里添加newData是为了和data区分开，因为data需要继承this）
         */

        obj.data = obj.newData;
        obj.methods = methods;
        var renderingResultObj = renderingDOM(obj);

        DOMUpdateQueue(data, methods, {
            id: obj.id,
            nodeList: obj.nodeList,
            renderingResultObj: renderingResultObj,
            newData: obj.newData,
            diff: true
        });

        executePluginInject(i);
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
            while (vNewChildren[i + 1] === undefined && rChildren[i + 1] !== undefined) {
                rChildren[i + 1].remove();
            }

            //比较子级
            //判断真实节点是否拥有这个元素
            if (rChildren[i] === undefined) {
                //没有
                //判断是否是文本节点
                if (rParent.nodeName === "#text") {
                    //判断vNewChil是否是文本节点
                    if (vNewChildren[i].nodeName === "#text") {
                        rParent.nodeValue = vNewChildren[i].nodeValue;
                    } else {
                        rParent.parentNode.replaceChild(vNewChildren[i], rParent);
                    }
                } else {
                    rParent.appendChild(vNewChildren[i].cloneNode(true));
                }
            } else {
                //有
                if (vNewChildren[i].nodeName === "#text") {
                    //判断真实DOM是否也是文本节点
                    if (rChildren[i].nodeName === "#text") {
                        if (vNewChildren[i].nodeValue !== rChildren[i].nodeValue) {
                            rChildren[i].nodeValue = vNewChildren[i].nodeValue;
                        }
                    } else {
                        //不是
                        if (rChildren[i].innerHTML !== vNewChildren[i].nodeValue) {
                            rChildren[i].innerHTML = vNewChildren[i].nodeValue;
                        }
                    }
                } else {
                    //不是文本节点
                    if (rChildren[i].nodeName !== "#text") {
                        //判断其他差异
                        var isDifferentNodeOnTag = (rChildren[i].tagName !== vNewChildren[i].tagName);

                        if (isDifferentNodeOnTag) {
                            rParent.replaceChild(vNewChildren[i].cloneNode(true), rChildren[i]);
                            continue;
                        } else {

                            var vNewChildrenAttr = vNewChildren[i].attributes,
                                rChildrenAttr = deepCopy(rChildren[i].attributes),
                                creatAttrNode;

                            //判断哪个节点数量最多
                            if (vNewChildrenAttr.length > rChildrenAttr.length) {
                                //虚拟大于
                                for (var c = 0; c < vNewChildrenAttr.length; c++) {
                                    if (rChildrenAttr[c] === undefined || rChildrenAttr[c].name !== vNewChildrenAttr[c].name || rChildrenAttr[c].value !== vNewChildrenAttr[c].value) {
                                        rChildren[i].removeAttribute(rChildrenAttr[c].name);
                                        rChildren[i].setAttribute(vNewChildrenAttr[c].name, vNewChildrenAttr[c].value);
                                    }
                                }
                            } else {
                                //虚拟等于少于
                                for (var c = 0; c < rChildrenAttr.length; c++) {
                                    if (vNewChildrenAttr[c] === undefined) {
                                        rChildren[i].removeAttribute(rChildrenAttr[c].name);
                                    } else {
                                        if (vNewChildrenAttr[c].name !== rChildrenAttr[c].name || vNewChildrenAttr[c].value !== rChildrenAttr[c].value) {
                                            rChildren[i].removeAttribute(rChildrenAttr[c].name);
                                            rChildren[i].setAttribute(vNewChildrenAttr[c].name, vNewChildrenAttr[c].value);
                                        }
                                    }
                                }
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
                    } else {
                        //真实DOM是文本节点
                        rParent.replaceChild(vNewChildren[i], rChildren[i]);
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

    function proxyBindThis(proxy, aleCom) {
        for (var i in proxy) {
            proxy[i] = bindObj(proxy[i], aleCom);
        }
        return proxy;
    }

    function methodsBindThis(methods, aleCom) {
        for (var i in methods) {
            methods[i] = bindObj(methods[i], aleCom);
        }
        return methods;
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

    function deepCopy(obj) {
        var newObj = Array.isArray(obj) ? [] : {};
        if (Array.isArray(obj)) {
            for (var key = 0; key < obj.length; key++) {
                if (isRealObj(obj[key]) || Array.isArray(obj[key])) {
                    newObj.push(deepCopy(obj[key]));
                } else {
                    newObj.push(obj[key]);
                }
            }
        } else {
            for (var key in obj) {
                if (isRealObj(obj[key]) || Array.isArray(obj[key])) {
                    newObj[key] = deepCopy(obj[key]);
                } else {
                    newObj[key] = obj[key];
                }
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

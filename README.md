<p align='center'>
   <img height='200px' src='https://github.com/Ale-js/alejs/blob/master/images/logo.png' alt='alejs-logo'>
</p>
<p align='center'>
   <img src='https://img.shields.io/github/downloads/Ale-js/ale/total.svg'>
   <img src='https://img.shields.io/github/license/Ale-js/ale.svg'>
   <img src='https://img.shields.io/github/release/Ale-js/ale.svg'>
</p>
<h1 align='center'>About Ale.js</h1>

## Introduction

Ale (Chinese: 啤酒) is a set of progressive frameworks for building user interfaces in the form of components. It believes that everything is a component. Unlike other large frameworks, Ale only needs you to focus on the data and does not need to care about any content related to the view. When you update the data, any places in the view that use it will be updated.

<br>

We combine some of the features of `Vue` and `React` in `Ale` to make it more convenient and lightweight. At the same time, the `diff` algorithm is also used in Ale (thanks to Ale's self-developed diff algorithm, which is only about 50 lines, extremely lightweight).

<br>

At the same time, in Ale, you don't have to worry about anything about **performance**, because Ale is compressed (non-g-zip) only about 7kb in size, and the execution speed is also close to **3** times that of Vue and React!

<br>

If you are already an experienced front-end developer and want to know the specific differences between Ale and other libraries/frames, check out [Compare other frameworks](https://www.alejs.org/2018/12/01/Comparison).

#### Quick Start
```javascript
//一个简单的HelloWorld实例
Ale("helloworld", {
    template: "Hello World"
})

Ale.render("helloworld", {
    el: "#app"
})
```

### Browser Compatibility
Ale does not support IE8 and below because Ale uses ECMAScript 5 features that IE8 cannot simulate. But it supports all ECMAScript 5 compliant browsers.

### Ecosystem
QQ group: (如果你来自中国，那么你可以加入我们的官方qq群)

<img src='https://github.com/Ale-js/alejs/blob/master/images/qq.png' alt='ale.js 官方qq群' height='120px'>

### Documentation
To check out live examples and docs, visit [alejs.org](https://www.alejs.org).

### License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2018-present, Yingxuan (Bill) Dong

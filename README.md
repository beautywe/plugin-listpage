# 介绍

[![CircleCI](https://circleci.com/gh/beautywe/beautywe-plugin-listpage/tree/master.svg?style=svg)](https://circleci.com/gh/beautywe/beautywe-plugin-listpage/tree/master)

[![NPM Version](https://img.shields.io/npm/v/@beautywe/plugin-listpage.svg)](https://www.npmjs.com/package/@beautywe/plugin-listpage) [![NPM Downloads](https://img.shields.io/npm/dm/@beautywe/plugin-listpage.svg)](https://www.npmjs.com/package/@beautywe/plugin-listpage) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/@beautywe/plugin-listpage.svg)
[![Coverage Status](https://coveralls.io/repos/github/beautywe/beautywe-plugin-listpage/badge.svg)](https://coveralls.io/github/beautywe/beautywe-plugin-listpage)

## Feature
1. 满足常用「数据列表分页」的业务场景
2. 支持分页
3. 支持多个数据列表
4. 自动捕捉下拉重载：`onPullDownRefresh`
5. 自动捕捉上拉加载：`onReachBottom`
6. 自带请求锁，防止帕金斯手抖用户
6. 简单优雅的 API

## 适用性

只适用 `BeautyWe.BtPage`

# 安装

```
$ npm i @beautywe/plugin-listpage
```

```javascript
import BeautyWe from '@beautywe/core';
import listpage from '@beautywe/plugin-listpage';

const page = new BeautyWe.BtPage();

// 使用 listpage 插件
page.use(listpage({
    // options
}));
```

# 使用

## 单列表

```javascript
// 使用插件
page.use(listpage({
    lists: [{
        name: 'goods',  // 数据名
        pageSize: 20,   // 每页多少条数据，默认 10

        // 每一页的数据源，没次加载页面时，会调用函数，然后取返回的数据。
        fetchPageData({ pageNo, pageSize }) {
            return API
                .fetch(`xxx/goodsList?pageNo=${pageNo}&&pageSize=${pageSize}`)
                .then((rawData) => formaterData(rawData));
        },
    }],
    enabledPullDownRefresh: true,    // 开启下拉重载， 默认 false
    enabledReachBottom: true,    // 开启上拉加载， 默认 false
}));

// goods 数据会被加载到 
// this.data.listPage.goods = {
//     data: [...],     // 视图层，通过该字段来获取具体的数据
//     hasMore: true,   // 视图层，通过该字段来识别是否有下一页
//     currentPage: 1,  // 视图层，通过该字段来识别当前第几页
//     totalPage: undefined,
// }

Page(page);
```

这样就可以了，你只需要设置「数据源」+「手动初始化第一次数据」+ 「处理数据在视图层的展示」，    
后续只要用户滑动到底部，或者下拉重载，就能自动拉取数据和同步数据到视图层层。

listPage 会根据 `options.lists` 的参数，创建 [Class List](#class-list) 的实例，然后挂载到 listPage 插件中。    
可以通过插件的 API：`theHost.listPage.getList(name)` 获取这个实例。    
对于列表数据的，加载、重载，判断，同步数据等操作，都可以通过操作这个实例来实现，更多的详情看 [Class List](#class-list)

## 多列表

```javascript
// 使用插件
page.use(listpage({
    lists: [{
        // goods list
        name: 'goods',
        fetchPageData({ pageNo, pageSize }) {
            return API
                .fetch(`xxx/goodsList?pageNo=${pageNo}&&pageSize=${pageSize}`)
                .then((rawData) => formaterData(rawData));
        },
    }, {
        // cards list
        name: 'cards',
        fetchPageData({ pageNo, pageSize }) {
            return API
                .fetch(`xxx/cardsList?pageNo=${pageNo}&&pageSize=${pageSize}`)
                .then((rawData) => formaterData(rawData));
        },
    }],
    enabledPullDownRefresh: true,    // 开启下拉重载， 默认 false
    enabledReachBottom: true,    // 开启上拉加载， 默认 false
}));

Page(page);

// goods 数据会被加载到 
// this.data.listPage.goods = {
//     data: [...],     // 视图层，通过该字段来获取具体的数据
//     hasMore: true,   // 视图层，通过该字段来识别是否有下一页
//     currentPage: 1,  // 视图层，通过该字段来识别当前第几页
//     totalPage: undefined,
// }

// cards 数据会被加载到 
// this.data.listPage.cards = {
//     data: [...],     // 视图层，通过该字段来获取具体的数据
//     hasMore: true,   // 视图层，通过该字段来识别是否有下一页
//     currentPage: 1,  // 视图层，通过该字段来识别当前第几页
//     totalPage: undefined,
// }
```

### 手动加载第一页数据

默认情况下，第一页的数据会在页面 `onLoad` 的时候被加载，如果不需要这个逻辑，可以切换到手动加载：

```javascript
const page = new BtPage({
    onLoad() {
        
        // 获取 goods list 实例
        const goodsList = this.listPage.getList('goods');
       
        return Promise
            .resolve

            // 获取下一页数据，只获取数据，并不会同步到 this.data
            .then(() => goodsList.nextPage())

            // 同步数据到 data，里部执行 this.setData
            .then(() => goodsList.updateData())

            .then(() => {
                // 读取列表数据
                this.data.listPage.goods;

                // goods = {
                //     data: [...],     // 视图层，通过该字段来获取具体的数据
                //     hasMore: true,   // 视图层，通过该字段来识别是否有下一页
                //     currentPage: 1,  // 视图层，通过该字段来识别当前第几页
                //     totalPage: undefined,
                // }
            });
    },
});

// 使用插件
page.use(listpage({
    lists: [{
        name: 'goods',  // 数据名
        pageSize: 20,   // 每页多少条数据，默认 10

        // 每一页的数据源，没次加载页面时，会调用函数，然后取返回的数据。
        fetchPageData({ pageNo, pageSize }) {
            return API
                .fetch(`xxx/goodsList?pageNo=${pageNo}&&pageSize=${pageSize}`)
                .then((rawData) => formaterData(rawData));
        },
    }],
    enabledPullDownRefresh: true,    // 开启下拉重载， 默认 false
    enabledReachBottom: true,    // 开启上拉加载， 默认 false
    autoLoadFirstPage: false,   // 关闭自动加载第一页数据
}));

Page(page);
```

### Active List

在多列表下，当触发 `onPullDownRefresh` 和 `onReachBottom` ，就会面临到底加载哪一个列表的问题。    
这种场景多数见于一个页面，有多个 tab 切换，每个 tab 对应了可以分页的数据。

listPage 当然对种问题的有优雅的解决方案的。

于是「Active List」 的概念被引入了，它的默认值是 `options.lists` 中数组第一个列表。

我们可以通过 `theHost.listPage.setActiveList(name)` 来改变当前 Active List：

首先假设我们定义了以下这个页面：
```javascript
const page = new BtPage({
    onLoad() {
        // ...
    },
});

// 使用插件
page.use(listpage({
    lists: [{
        name: 'goods',
        // ... others options
    }, {
        name: 'cards',
        // ... others options
    }],
    enabledPullDownRefresh: true,
    enabledReachBottom: true,
}));

Page(page);
```

假设当前页面栈只有上面定义的一个页面：
```javascript
const curPage = getCurrentPages()[0];

// 会加载 goods 数据
curPage.onReachBottom();

// 会重载 goods 数据
curPage.onPullDownRefresh();

// 变更当前活跃的列表
curPage.listPage.setActiveList('cards');

// 会加载 cards 数据
curPage.onReachBottom();

// 会重载 cards 数据
curPage.onPullDownRefresh();
```

## 请求锁

在前端页面中，我们总是要面对「帕金斯手抖用户」，他们会一次性触发多个相同动作，例如一次性狂点按钮。    

假设现在有个按钮， 点击它，会请求和加载下一页数据，如果用户一瞬间点击了 n 次，没有特殊处理的情况下，就会发起 n 个同样的请求，这是一个灾难。

listPage 对此进行了优化，引入了「请求锁」的概念，只要有一页数据正在发起中，就会 locked ，有结果返回之前的`onPullDownRefresh` 和 `onReachBottom` 的函数调用，都会被丢弃:

```javascript
// 只会触发一次加载数据和更新数据
curPage.onReachBottom();
curPage.onReachBottom();
curPage.onReachBottom();
```

该功能是默认开启的，你只能通过关闭 `onPullDownRefresh` 和 `onReachBottom` 来关闭：

```javascript
page.use(listPage({
    onPullDownRefresh: false,
    onReachBottom: false,
}));
```

## 开启自动判断是否还有下一页

这是一个数学问题，在没有被告知一共有多少数据的情况下，listPage 是无法计算出一共有多少页，以及是否有下一页的。    
除非最后一页的数据有特殊的标识，但是不同的实际业务，是不同实现的，listPage 不会通过这个来计算。    

能让 listPage 自动计算是否有下一页的唯一方法：告诉它一共有多少页数据。

```javascript
curPage.listPage.getList('goods').setTotalPage(10);
```

那么加载到第10页是，goods list 内部就会计算出没有下一页，所有「加载下一页」的操作，都不会有任何效果。

# Plugin API

`theHost.listPage`    
* `getList(name)`: 获取指定 list 实例
* `setActiveList(name)`：设置指定 list 实例为当前 Active List
* `getActiveList()`：获取当前 Active List 实例
* `initList()`：重新初始化所有 list 实例
* `setEnabledReachBottom(true | false)`：动态开关「上滑加载」
* `setEnabledPullDownRefresh(true | false)`：动态开关「下拉重载」

# Class List

## new List(options)

| Param | Type | Description |
| --- | --- | --- |
| options.theHost | <code>object</code> | 宿主实例 |
| options.name | <code>string</code> | 列表名称，作为数据的命名空间：theHost.data[`${name}`] |
| options.fetchPageData | <code>function</code> | 更新数据时，获取数据的回调函数，该函数需要返回一个包含数据的 promise：fetchPageData({ theHost, pageSize, pageNo }); |
| [options.dataFiledPrefix] | <code>string</code> | 数据命名空间前缀：theHost.data[`${dataFiledPrefix}.${name}`] |
| [options.pageSize] | <code>number</code> | 每一页多少数据，用于拉取数据时，回传给 fetchPageData({ pageSize }); |
| [options.pageData] | <code>number</code> | 定义到当前列表数据命名空间内的数据 |

<a name="List+updateData"></a>

## list.updateData() ⇒ <code>Promise</code>
同步数据到视图层（theHost.data）

**Kind**: instance method of [<code>List</code>](#List)  
<a name="List+nextPage"></a>

## list.nextPage() ⇒ <code>Promise</code>
更新下一页数据

**Kind**: instance method of [<code>List</code>](#List)  
<a name="List+reloadPage"></a>

## list.reloadPage() ⇒ <code>undefinded</code>
重载数据

**Kind**: instance method of [<code>List</code>](#List)  
<a name="List+fetchPage"></a>

## list.fetchPage(pageNo, pageSize)
获取指定页的数据

**Kind**: instance method of [<code>List</code>](#List)  

| Param | Type |
| --- | --- |
| pageNo | <code>number</code> | 
| pageSize | <code>number</code> | 

<a name="List+hasMore"></a>

## list.hasMore() ⇒ <code>Boolean</code>
在未设置 totalPage 情况下，永远为 true

**Kind**: instance method of [<code>List</code>](#List)  
<a name="List+lockFetchPage"></a>

## list.lockFetchPage()
锁定「请求锁」

**Kind**: instance method of [<code>List</code>](#List)  
<a name="List+unlockFetchPage"></a>

## list.unlockFetchPage()
解开「请求锁」

**Kind**: instance method of [<code>List</code>](#List)  
<a name="List+isFetchPageLock"></a>

## list.isFetchPageLock() ⇒ <code>Boolean</code>
判断「请求锁」

**Kind**: instance method of [<code>List</code>](#List)  
<a name="List+setTotalPage"></a>

## list.setTotalPage(value)
设置 totalPage，用于计算是否还有下一页

**Kind**: instance method of [<code>List</code>](#List)  

| Param | Type |
| --- | --- |
| value | <code>Boolean</code> | 

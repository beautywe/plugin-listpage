const defaultPageData = {
    totalPage: undefined,
    data: [],
    hasMore: true,
    currentPage: 0,
};

class List {
    /**
     * Create a list
     * @param {object} options.theHost - 宿主实例
     * @param {string} options.name - 列表名称，作为数据的命名空间：theHost.data[`${name}`]
     * @param {function} options.fetchPageData - 更新数据时，获取数据的回调函数，该函数需要返回一个包含数据的 promise：fetchPageData({ theHost, pageSize, pageNo });
     * @param {string} [options.dataFiledPrefix] - 数据命名空间前缀：theHost.data[`${dataFiledPrefix}.${name}`]
     * @param {number} [options.pageSize] - 每一页多少数据，用于拉取数据时，回传给 fetchPageData({ pageSize });
     * @param {number} [options.pageData] - 定义到当前列表数据命名空间内的数据
     */
    constructor({
        theHost,
        name = 'default',
        dataFiledPrefix,
        pageSize = 10,
        pageData = {},
        fetchPageData,
    } = {}) {
        // checking params
        if (!theHost) throw new Error('params theHost invalid');
        if (!fetchPageData || typeof fetchPageData !== 'function') throw new Error('options fetchPageData should be a function');

        this.name = name;
        this.state = Object.assign({}, defaultPageData, pageData);
        this.theHost = theHost;
        this.fetchPageLock = false;
        this.options = {
            pageSize,
            fetchPageData,
            dataFiledPrefix,
        };
    }

    /**
     * 同步数据到视图层（theHost.data）
     * @async
     * @returns {Promise}
     */
    updateData() {
        return new Promise((resolve) => {
            this.theHost.setData({
                [`${this.options.dataFiledPrefix ? `${this.options.dataFiledPrefix}.` : ''}${this.name}`]: this.state,
            }, resolve());
        });
    }

    /**
     * 更新下一页数据
     * @async
     * @returns {Promise}
     */
    nextPage() {
        const nextPage = this.state.currentPage + 1;

        // if has no more , return
        if (!this.hasMore()) return Promise.resolve();

        return this
            .fetchPage(nextPage)
            .then((list) => {
                this.state.data = this.concatData(list);
                this.state.currentPage = nextPage;
                this.state.hasMore = this.hasMore();
            });
    }

    /**
     * 重载数据
     * @returns {undefinded}
     */
    reloadPage() {
        this.state = Object.assign({}, defaultPageData);
    }

    /**
     * 获取指定页的数据
     * @async
     * @param {number} pageNo 
     * @param {number} pageSize 
     */
    fetchPage(pageNo, pageSize = this.options.pageSize) {
        this.lockFetchPage();

        return Promise
            .resolve()
            .then(() => this.options.fetchPageData.call(this, {
                theHost: this.theHost,
                pageNo,
                pageSize,
            }))
            .then((list) => {
                if (!list) throw new Error('return value of fetchPageData() are invalid');
                this.unlockFetchPage();
                return Array.isArray(list) ? list : [list];
            })
            .catch((err) => {
                this.unlockFetchPage();
                throw err;
            });
    }

    concatData(list) {
        const _list = Array.isArray(list) ? list : [list];
        const oldList = this.state.data;
        const newList = oldList.concat(_list);
        return newList;
    }

    /**
     * 判断是否还有下一页
     * @description 在未设置 totalPage 情况下，永远为 true
     * @returns {Boolean}
     */
    hasMore() {
        const { totalPage, hasMore, currentPage } = this.state;
        let thisHasMore = hasMore;

        // 如果没有设置 totalPage, 则默认 hasMore: true
        if (totalPage === undefined) {
            thisHasMore = true;
        }

        // 如果当前页面 大于等于 总页面数，则 hasMore: false
        if (currentPage >= totalPage) {
            thisHasMore = false;
        } else {
            thisHasMore = true;
        }

        return thisHasMore;
    }

    /**
     * 锁定「请求锁」
     */
    lockFetchPage() {
        this.fetchPageLock = true;
    }

    /**
     * 解开「请求锁」
     */
    unlockFetchPage() {
        this.fetchPageLock = false;
    }

    /**
     * 判断「请求锁」
     * @returns {Boolean}
     */
    isFetchPageLock() {
        return this.fetchPageLock;
    }

    /**
     * 设置 totalPage，用于计算是否还有下一页
     * @param {Boolean} value
     */
    setTotalPage(value) {
        this.state.totalPage = value;
        this.state.hasMore = this.hasMore();
    }
}

export default List;

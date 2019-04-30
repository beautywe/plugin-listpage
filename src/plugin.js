import List from './list';

/**
 * @params {number} options.lists[n].name
 * @params {number} options.lists[n].pageSize
 * @params {function} options.lists[n].fetchPageData
 * @params {boolean} [options.enabledPullDownRefresh]
 * @params {boolean} [options.enabledReachBottom]
 */
export default function plugin(options = {}) {
    const globalOptions = Object.assign({
        enabledPullDownRefresh: false,
        enabledReachBottom: false,
        lists: [{}],
    }, options);

    // make sure globalOptions.lists be a array
    if (!Array.isArray(globalOptions.lists)) globalOptions.lists = [globalOptions.lists];

    // checking options for each list;
    for (let index = 0; index < globalOptions.lists.length; index++) {
        const opt = globalOptions.lists[index];
        if (!opt.name) throw new Error(`options.lists[${index}].name was invalid`);
        if (!opt.fetchPageData || typeof opt.fetchPageData !== 'function') throw new Error(`options.lists[${index}].fetchPageData should be a function`);
    }

    return {
        name: 'listPage',

        data: {
            list: {},
            activeListName: globalOptions.lists[0].name,
        },

        nativeHook: {
            onLoad() {
                return this.listPage.initList();
            },

            onLaunch() {
                return this.listPage.initList();
            },

            // 下拉刷新
            onPullDownRefresh() {
                const list = this.listPage.getActiveList();

                if (!globalOptions.enabledPullDownRefresh || list.isFetchPageLock()) {
                    wx.stopPullDownRefresh();
                    return Promise.resolve();
                }

                return Promise
                    .resolve()
                    .then(() => list.reloadPage())
                    .then(() => list.nextPage())
                    .then(() => list.updateData())
                    .then(() => wx.stopPullDownRefresh())
                    .catch(() => wx.stopPullDownRefresh());
            },

            // 触底翻页
            onReachBottom() {
                const list = this.listPage.getActiveList();

                // if disable reach bottom, return.
                if (!globalOptions.enabledReachBottom) return Promise.resolve();

                // if request flying, return
                if (list.isFetchPageLock()) return Promise.resolve();

                // load nex page and update data
                return list.nextPage().then(() => list.updateData());
            },
        },

        customMethod: {
            setActiveList(name) {
                return new Promise((resolve) => {
                    this.setData({ 'listPage.activeListName': name }, resolve);
                });
            },

            getActiveList() {
                const activeListName = this.data.listPage.activeListName;
                return this.listPage.list[activeListName];
            },

            getList(name) {
                return this.listPage.list[name];
            },

            initList() {
                const promises = [];
                this.listPage.list = {};
                globalOptions.lists.forEach((opt) => {
                    const list = new List(Object.assign({
                        theHost: this,
                        dataFiledPrefix: 'listPage.list',
                    }, opt));
                    this.listPage.list[opt.name] = list;
                    promises.push(list.updateData());
                });

                return Promise.all(promises);
            },

            setEnabledReachBottom(value) {
                globalOptions.enabledReachBottom = value;
            },

            setEnabledPullDownRefresh(value) {
                globalOptions.enabledPullDownRefresh = value;
            },
        },
    };
}
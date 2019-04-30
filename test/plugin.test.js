import { set, get } from 'lodash';
import { BtPage } from '@beautywe/core';
import test from 'ava';
import listPage from '../src/plugin';
import List from '../src/list';

function newAppUseingPlugin(options) {
    const page = new BtPage();
    page.setData = function setData(obj, done) {
        Object.keys(obj).forEach((key) => {
            set(this.data, key, obj[key]);
        });
        if (typeof done === 'function') done();
    };
    const plugin = listPage(options);
    page.use(plugin);
    page.onLoad();

    return Promise
        .resolve()
        .then(() => page.onLoad())
        .then(() => ({ page, plugin }));
}

// mock wx.stopPullDownRefresh
function onStopPullDownRefresh() {
    return new Promise((resolve) => {
        const origin = get(global, 'wx.stopPullDownRefresh');
        set(global, 'wx.stopPullDownRefresh', function stopPullDownRefresh() {
            if (origin) set(global, 'wx.stopPullDownRefresh', origin);
            resolve();
        });
    });
}

test('use plugin', (t) => {
    return Promise
        .resolve()
        .then(() => newAppUseingPlugin({
            lists: {
                name: 'test',
                fetchPageData: () => { },
            },
        }))
        .then(({ page, plugin }) => {
            t.is(page._btPlugin.plugins[0].name, plugin.name);
            t.truthy(page[`${plugin.name}`]);
            t.truthy(page[`${plugin.name}`].list.test instanceof List);
        });
});

test('array type for options', (t) => {
    return Promise
        .resolve()
        .then(() => newAppUseingPlugin({
            lists: [{
                name: 'test',
                fetchPageData: () => { },
            }, {
                name: 'test2',
                fetchPageData: () => { },
            }],
        }))
        .then(({ page, plugin }) => {
            t.is(page._btPlugin.plugins[0].name, plugin.name);
            t.truthy(page[`${plugin.name}`]);
            t.truthy(page[`${plugin.name}`].list.test instanceof List);
            t.truthy(page[`${plugin.name}`].list.test2 instanceof List);
        });
});

test('options checking', (t) => {
    return Promise
        .resolve()
        .then(() => newAppUseingPlugin())
        .catch((error) => t.is(error.message, 'options.lists[0].name was invalid'))

        .then(() => newAppUseingPlugin({
            lists: { name: 'test' },
        }))
        .catch((error) => t.is(error.message, 'options.lists[0].fetchPageData should be a function'))

        .then(() => newAppUseingPlugin({
            lists: {
                name: 'test',
                fetchPageData: 'abc',
            },
        }))
        .catch((error) => t.is(error.message, 'options.lists[0].fetchPageData should be a function'));
});

test('list.updateData', (t) => {
    return Promise
        .resolve()
        .then(() => newAppUseingPlugin({
            lists: {
                name: 'test',
                fetchPageData: () => { },
            },
        }))
        .then(({ page, plugin }) => {
            return page[`${plugin.name}`].list.test.updateData().then(() => {
                t.is(page.data[`${plugin.name}`].list.test, page[`${plugin.name}`].list.test.state);
                t.is(page.data[`${plugin.name}`].activeListName, page[`${plugin.name}`].list.test.name);
            });
        });
});

test('list.nextPage & list.reloadPage', (t) => {
    const testPageData = { name: 'jc' };
    const test2PageData = [{ name: 'jcc' }];
    let page, plugin, dataDomain, listDomain;

    return Promise
        .resolve()
        .then(() => newAppUseingPlugin({
            lists: [{
                name: 'test',
                fetchPageData: () => testPageData,
            }, {
                name: 'test2',
                fetchPageData: () => test2PageData,
            }],
        }))
        .then((result) => {
            page = result.page;
            plugin = result.plugin;
            dataDomain = `data.${plugin.name}.list`;
            listDomain = `${plugin.name}.list`;
        })

        // should be empty while has not load page yet
        .then(() => {
            // test list
            const testListData = get(page, `${dataDomain}.test`);
            t.deepEqual(testListData.data, []);
            t.is(testListData.totalPage, undefined);
            t.is(testListData.hasMore, true);
            t.is(testListData.currentPage, 0);

            // test2 list
            const test2ListData = get(page, `${dataDomain}.test2`);
            t.deepEqual(test2ListData.data, []);
            t.is(test2ListData.totalPage, undefined);
            t.is(test2ListData.hasMore, true);
            t.is(test2ListData.currentPage, 0);
        })

        // first page
        .then(() => Promise.all([
            // test list
            Promise
                .resolve()
                .then(() => {
                    const list = get(page, `${plugin.name}`).getList('test');
                    return Promise
                        .resolve()
                        .then(() => list.nextPage())
                        .then(() => list.updateData());
                })
                .then(() => {
                    const testListData = get(page, `${dataDomain}.test`);
                    t.deepEqual(testListData.data, [testPageData]);
                    t.is(testListData.totalPage, undefined);
                    t.is(testListData.hasMore, true);
                    t.is(testListData.currentPage, 1);
                }),

            // test2 list
            Promise
                .resolve()
                .then(() => {
                    const list = get(page, `${plugin.name}`).getList('test2');
                    return Promise
                        .resolve()
                        .then(() => list.nextPage())
                        .then(() => list.updateData());
                })
                .then(() => {
                    const testListData = get(page, `${dataDomain}.test2`);
                    t.deepEqual(testListData.data, [].concat(test2PageData));
                    t.is(testListData.totalPage, undefined);
                    t.is(testListData.hasMore, true);
                    t.is(testListData.currentPage, 1);
                }),
        ]))

        // second page
        .then(() => {
            t.truthy(get(page, `${dataDomain}.test`));
            t.truthy(get(page, `${dataDomain}.test2`));

            return Promise.all([

                // test list
                Promise
                    .resolve()
                    .then(() => {
                        const list = get(page, `${listDomain}.test`);
                        return Promise
                            .resolve()
                            .then(() => list.nextPage())
                            .then(() => list.updateData());
                    })
                    .then(() => {
                        const data = get(page, `${dataDomain}.test`);
                        t.deepEqual(data.data, [testPageData, testPageData]);
                        t.is(data.totalPage, undefined);
                        t.is(data.hasMore, true);
                        t.is(data.currentPage, 2);
                    }),

                // test2 list
                Promise
                    .resolve()
                    .then(() => {
                        const list = get(page, `${listDomain}.test2`);
                        return Promise
                            .resolve()
                            .then(() => list.nextPage())
                            .then(() => list.updateData());
                    })
                    .then(() => {
                        const data = get(page, `${dataDomain}.test2`);
                        t.deepEqual(data.data, [].concat(test2PageData, test2PageData));
                        t.is(data.totalPage, undefined);
                        t.is(data.hasMore, true);
                        t.is(data.currentPage, 2);
                    }),
            ]);
        })

        // reload page & next page
        .then(() => {
            t.truthy(get(page, `${dataDomain}.test`));
            t.truthy(get(page, `${dataDomain}.test2`));

            const test2List = get(page, `${listDomain}.test2`);

            return Promise
                .resolve()
                .then(() => test2List.reloadPage())
                .then(() => test2List.updateData())

                .then(() => {
                    const data = get(page, `${dataDomain}.test2`);
                    t.is(data.totalPage, undefined);
                    t.is(data.hasMore, true);
                    t.is(data.currentPage, 0);
                })

                .then(() => test2List.nextPage())
                .then(() => test2List.updateData())

                .then(() => {
                    const data = get(page, `${dataDomain}.test2`);
                    t.deepEqual(data.data, [].concat(test2PageData));
                    t.is(data.totalPage, undefined);
                    t.is(data.hasMore, true);
                    t.is(data.currentPage, 1);
                });
        });
});

test('setTotalPage', (t) => {
    const testPageData = { name: 'jc' };

    return Promise
        .resolve()

        .then(() => newAppUseingPlugin({
            lists: [{
                name: 'test',
                fetchPageData: () => testPageData,
                pageData: { totalPage: 2 },
            }],
        }))

        // setTotal page on options
        .then(({ page, plugin }) => {
            const dataDomain = `data.${plugin.name}.list.test`;
            const listDomain = `${plugin.name}.list.test`;
            const list = get(page, listDomain);

            return Promise
                .resolve()

                // update data
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, []);
                    t.is(data.totalPage, 2);
                    t.is(data.hasMore, true);
                    t.is(data.currentPage, 0);
                })

                // first page
                .then(() => list.nextPage())
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, [testPageData]);
                    t.is(data.totalPage, 2);
                    t.is(data.hasMore, true);
                    t.is(data.currentPage, 1);
                })

                // second page
                .then(() => list.nextPage())
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, [testPageData, testPageData]);
                    t.is(data.totalPage, 2);
                    t.is(data.hasMore, false);
                    t.is(data.currentPage, 2);
                });
        })

        // setTotal page after
        .then(() => {
            let page, plugin, dataDomain, listDomain, list;
    
            return Promise
                .resolve()

                .then(() => newAppUseingPlugin({
                    lists: [{
                        name: 'test',
                        fetchPageData: () => testPageData,
                    }],
                }))

                .then((result) => {
                    page = result.page;
                    plugin = result.plugin;
                    dataDomain = `data.${plugin.name}.list.test`;
                    listDomain = `${plugin.name}.list.test`;
                    list = get(page, listDomain);
                })

                // update data
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, []);
                    t.is(data.totalPage, undefined);
                    t.is(data.hasMore, true);
                    t.is(data.currentPage, 0);
                })

                // setTotalPage
                .then(() => list.setTotalPage(2))
                .then(() => list.updateData())
   
                // first page
                .then(() => list.nextPage())
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, [testPageData]);
                    t.is(data.totalPage, 2);
                    t.is(data.hasMore, true);
                    t.is(data.currentPage, 1);
                })

                // second page
                .then(() => list.nextPage())
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, [testPageData, testPageData]);
                    t.is(data.totalPage, 2);
                    t.is(data.hasMore, false);
                    t.is(data.currentPage, 2);
                })

                // overpage was nothing hpageen
                .then(() => list.nextPage())
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, [testPageData, testPageData]);
                    t.is(data.totalPage, 2);
                    t.is(data.hasMore, false);
                    t.is(data.currentPage, 2);
                })

                // update totalPage
                .then(() => list.setTotalPage(3))
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, [testPageData, testPageData]);
                    t.is(data.totalPage, 3);
                    t.is(data.hasMore, true);
                    t.is(data.currentPage, 2);
                })

                // after update totalPage, that can be load page
                .then(() => list.nextPage())
                .then(() => list.updateData())
                .then(() => {
                    const data = get(page, dataDomain);
                    t.deepEqual(data.data, [testPageData, testPageData, testPageData]);
                    t.is(data.totalPage, 3);
                    t.is(data.hasMore, false);
                    t.is(data.currentPage, 3);
                });
        });
});

test('pullDownRefresh', (t) => {
    const testPageData = { name: 'jc' };
    let page, plugin, dataDomain, listDomain, list;

    return Promise
        .resolve()

        .then(() => newAppUseingPlugin({
            lists: [{
                name: 'test',
                fetchPageData: () => testPageData,
            }],
            enabledPullDownRefresh: true,
            enabledReachBottom: true,
        }))

        .then((result) => {
            page = result.page;
            plugin = result.plugin;
            dataDomain = `data.${plugin.name}.list.test`;
            listDomain = `${plugin.name}.list.test`;
            list = get(page, listDomain);
        })

        // first page
        .then(() => list.nextPage())
        .then(() => list.updateData())
        .then(() => {
            const data = get(page, dataDomain);
            t.deepEqual(data.data, [testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        })

        // second page
        .then(() => page.onReachBottom())
        .then(() => {
            const data = get(page, dataDomain);
            t.deepEqual(data.data, [testPageData, testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 2);
        })

        // reload page on pull down refresh
        .then(() => Promise.all([
            onStopPullDownRefresh(),
            page.onPullDownRefresh(),
        ]))
        .then(() => {
            const data = get(page, dataDomain);
            t.deepEqual(data.data, [testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        })

        // disable enabledPullDownRefresh
        .then(() => {
            get(page, listDomain).options.enabledPullDownRefresh = false;
        })
        .then(() => list.nextPage())
        .then(() => list.updateData())

        .then(() => Promise.all([
            onStopPullDownRefresh(),
            page.onPullDownRefresh(),
        ]))
        .then(() => {
            const data = get(page, dataDomain);
            t.deepEqual(data.data, [testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        });
});

test('reachBottom', (t) => {
    const testPageData = { name: 'jc' };
    let page, plugin, dataDomain, listDomain, list;

    return Promise
        .resolve()

        .then(() => newAppUseingPlugin({
            lists: [{
                name: 'test',
                fetchPageData: () => testPageData,
            }],
            enabledReachBottom: true,
        }))

        .then((result) => {
            page = result.page;
            plugin = result.plugin;
            dataDomain = `data.${plugin.name}.list.test`;
            listDomain = `${plugin.name}.list.test`;
            list = get(page, listDomain);
        })

        // update data
        .then(() => list.updateData())
        .then(() => {
            const data = get(page, dataDomain);
            t.deepEqual(data.data, []);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 0);
        })

        // fisrt page of reachBottom
        .then(() => page.onReachBottom())
        .then(() => {
            const data = get(page, dataDomain);
            t.deepEqual(data.data, [testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        })

        // multi reachBottom in a time
        .then(() => Promise.all([
            page.onReachBottom(),
            page.onReachBottom(),
            page.onReachBottom(),
        ]))
        .then(() => {
            const data = get(page, dataDomain);
            t.deepEqual(data.data, [testPageData, testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 2);
        })

        // disable enabledReachBottom
        .then(() => {
            get(page, `${plugin.name}`).setEnabledReachBottom(false);
            return page.onReachBottom();
        })
        .then(() => {
            const data = get(page, dataDomain);
            t.deepEqual(data.data, [testPageData, testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 2);
        });
});

test('setActiveList', (t) => {
    const testPageData = { name: 'jc' };
    const test2PageData = [{ name: 'jcc' }];
    let page, plugin, dataDomain;

    return Promise
        .resolve()

        .then(() => newAppUseingPlugin({
            lists: [{
                name: 'test',
                fetchPageData: () => testPageData,
            }, {
                name: 'test2',
                fetchPageData: () => test2PageData,
            }],
            enabledReachBottom: true,
            enabledPullDownRefresh: true,
        }))

        .then((result) => {
            page = result.page;
            plugin = result.plugin;
            dataDomain = `data.${plugin.name}.list`;
        })

        // first page at current active list
        .then(() => page.onReachBottom())
        .then(() => {
            const data = get(page, `${dataDomain}.test`);
            t.deepEqual(data.data, [testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        })
        .then(() => {
            const data = get(page, `${dataDomain}.test2`);
            t.deepEqual(data.data, []);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 0);
        })

        // change active list
        .then(() => page[`${plugin.name}`].setActiveList('test2'))

        // then reachBottom
        .then(() => page.onReachBottom())
        .then(() => {
            const data = get(page, `${dataDomain}.test`);
            t.deepEqual(data.data, [testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        })
        .then(() => {
            const data = get(page, `${dataDomain}.test2`);
            t.deepEqual(data.data, [].concat(test2PageData));
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        })

        // load active list (test2) again
        .then(() => page.onReachBottom())
        .then(() => {
            const data = get(page, `${dataDomain}.test2`);
            t.deepEqual(data.data, [].concat(test2PageData).concat(test2PageData));
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 2);
        })

        // then pullDownRefresh
        .then(() => Promise.all([
            onStopPullDownRefresh(),
            page.onPullDownRefresh(),
        ]))
        .then(() => {
            const data = get(page, `${dataDomain}.test`);
            t.deepEqual(data.data, [testPageData]);
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        })
        .then(() => {
            const data = get(page, `${dataDomain}.test2`);
            t.deepEqual(data.data, [].concat(test2PageData));
            t.is(data.totalPage, undefined);
            t.is(data.hasMore, true);
            t.is(data.currentPage, 1);
        });
});
/* globals module */
/* exported  tabsTitles */
'use strict';

/**
* tabsTitles holds data for tabs title that changed by users in this session
*
* the data is stores in object for each tab that contains changed titles
* the object key for each tab is its id...
* {
*   1: {
*     fixedTitle: <USER TITLE>:string
*                 exist when user set: 'Rename this tab regardless to its address'
*     titles: {
*        <URL 1>: <USER TITLE 1>:string,
*        <URL 2>: <USER TITLE 2>:string,
*                 exist only if we did not set fixedTitle and the title changed
*     }
*   }
*   2: {
*     .......
*   }
* }
*/

class Titles {
  constructor(id, url, currentTitle, permanently = false, title = '') {
    this.id = id;
    if (typeof url == 'object') {
      this.fixedTitle = url.fixedTitle;
      this.titles = url.titles;
    } else {
      this.fixedTitle = '';
      this.titles = {};
      this.saveTitles(url, currentTitle, permanently, title);
    }
  }

  saveTitles(url, currentTitle, permanently = false, title = '') {
    // update fixedTitle state
    if (!permanently && this.fixedTitle) {
      this.fixedTitle = '';
    } else if (permanently && this.fixedTitle != title) {
      this.fixedTitle = title;
      this.titles = {};
    }

    // update titles for url
    if (!permanently) {
      this.titles[url] = title;
    }
  }
}

const tabsData = {};
const tabsTitles = {
  restoredTabs: {},

  get data() {
    return tabsData;
  },

  getData(id) {
    return tabsData[id] || {
      titles: {},
      fixedTitle: '',
    };
  },

  // sessions.js module will replace this function
  updateTabValue() {},

  // tabUpdated.js module will replace this function
  toggleListeners() {},

  creatTitlesObject(id, url, currentTitle, permanently, title) {
    tabsData[id] = new Titles(id, url, currentTitle, permanently, title);

    // add listeners
    this.toggleListeners(true);
  },

  removeListeners() {
    if (!Object.keys(tabsData).length) {
      this.toggleListeners(false);
    }
  },

  deleteTitles(titles, id, url) {
    delete titles[url];
    if (!Object.keys(titles).length) {
      delete tabsData[id];
      this.removeListeners();
    }
    this.updateTabValue(id);
  },

  saveTitles({id, url, title: currentTitle}, {permanently, title} = {permanently: false, title: ''}) {
    const data = tabsData[id];

    // reset title for url
    const resetTitle = !title;
    if (resetTitle) {
      if (data) {
        data.fixedTitle = '';
        const {titles = {}} = data || {};
        this.deleteTitles(titles, id, url);
      }
      return;
    }

    if (!data) {
      this.creatTitlesObject(id, url, currentTitle, permanently, title);
    } else {
      data.saveTitles(url, currentTitle, permanently, title);
    }
    this.updateTabValue(id);
  },

  getTitles(id, url) {
    const {titles = {}, fixedTitle = ''} = this.getData(id);
    if (fixedTitle) {
      return {
        permanently: true,
        currentUserTitle: fixedTitle,
        otherPagesModified: false,
      };
    }

    // check if other pages in this tab already have user title
    const otherPagesModified = Object.keys(titles).length > 0;

    return {
      permanently: false,
      currentUserTitle: titles[url] || '',
      otherPagesModified,
    };
  },

  getUserTitle(id, url) {
    const {titles = {}, fixedTitle} = this.getData(id);
    if (fixedTitle) {
      return fixedTitle;
    }
    return titles[url] || '';
  },
};

/*
export default tabsTitles;
*/
if (typeof module == 'object' && typeof module.exports == 'object') {
  module.exports = {tabsTitles};
}

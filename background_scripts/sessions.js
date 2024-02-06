/*
import {isExcludedUrl, preferences, setDocumentTitle, toggleListeners} from './common.js';
import {getBookmark} from './bookmarks.js';
import tabsTitles from './titles.js';
*/
/* globals isExcludedUrl, preferences, setDocumentTitle, toggleListeners,
           getBookmark, tabsTitles */
'use strict';

const RENAME_KEY = 'tabmix-rename-tab';

tabsTitles.updateTabValue = updateTabValue;

async function onReplacingLastTab({windowId, isWindowClosing}) {
  // browser.tabs.onCreated doesn't fire when restoring closed tab in a
  // window with 1 blank tab
  if (!isWindowClosing) {
    const tabs = await browser.tabs.query({windowId});
    if (tabs.length == 1) {
      const id = tabs[0].id;
      getTabValue({id});
    }
  }
}

function onTabRemoved(id, removeInfo) {
  delete tabsTitles.data[id];
  tabsTitles.removeListeners();
  if (preferences.save_with_sessions) {
    onReplacingLastTab(removeInfo);
  }
}

async function getTabValue({id, url}) {
  // we allow about:blank for the case of restored tab
  if (!preferences.save_with_sessions ||
      url != 'about:blank' && isExcludedUrl(url)) {
    return;
  }
  const renameData = await browser.sessions.getTabValue(id, RENAME_KEY);
  if (renameData) {
    const state = JSON.parse(renameData);
    tabsTitles.creatTitlesObject(id, state);
    tabsTitles.restoredTabs[id] = true;
  }
}

function updateTabValue(id) {
  const data = preferences.save_with_sessions && tabsTitles.data[id] || {};
  if (Object.keys(data).length) {
    const state = JSON.stringify(data);
    browser.sessions.setTabValue(id, RENAME_KEY, state);
  } else {
    browser.sessions.removeTabValue(id, RENAME_KEY);
  }
}

let firstRun = true;

async function updateAllTabsOnPrefsChanged() {
  async function updateTab(tab) {
    const {id, title, url} = tab;
    if (isExcludedUrl(url)) {
      return;
    }
    if (firstRun) {
      if (preferences.save_with_sessions) {
        await getTabValue(tab);
      } else {
        browser.sessions.removeTabValue(id, RENAME_KEY);
      }
    }
    const newTitle = tabsTitles.getUserTitle(id, url) || await getBookmark(url);
    setDocumentTitle(id, title, newTitle);
  }
  const tabs = await browser.tabs.query({});
  tabs.forEach(updateTab);
  firstRun = false;
}

async function onSessionPrefChanged() {
  const tabs = await browser.tabs.query({});
  tabs.forEach(({id}) => updateTabValue(id));
}

function onTabAttached(...args) {
  updateTabValue(...args);
}
function onTabCreated(...args) {
  getTabValue(...args);
}

// don't toggle this listener we need it to remove tabsData for closed tabs
browser.tabs.onRemoved.addListener(onTabRemoved);

function sessionsPrefsListener(changes) {
  if (firstRun || changes.includes('title_from_bookmark')) {
    updateAllTabsOnPrefsChanged();
  }
  if (changes.includes('save_with_sessions')) {
    if (!firstRun) {
      onSessionPrefChanged();
    }
    const listeners = [onTabAttached, onTabCreated];
    const pref = preferences.save_with_sessions;
    toggleListeners(browser.tabs, listeners, pref, 'Tab');
  }
}

preferences.onChanged.addListener(sessionsPrefsListener, true);

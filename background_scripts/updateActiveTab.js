/*
import {isExcludedUrl, isVersion} from './common.js';
import tabsTitles from './titles.js';
*/
/* globals isExcludedUrl, isVersion, tabsTitles */
'use strict';

// when rename tab panel opener is not the active tab, we call this function
// with the active tab as the 1st argument and the opener tab as the 2nd argument
/*
export function updateIcon(tab, opener) {
*/
function updateIcon(tab, opener) {
  const {id, url} = opener || tab;
  const disableAction = isExcludedUrl(url);
  if (disableAction) {
    browser.browserAction.disable(tab.id);
  } else {
    browser.browserAction.enable(tab.id);
  }
  const title = tabsTitles.getUserTitle(id, url);
  const color = disableAction || !title ? '' : '_blue';
  const path = `../icons/rename_icon${color}.svg`;
  browser.browserAction.setIcon({
    path,
    tabId: tab.id,
  });
}

function onUrlChanged(tabId, changeInfo, tabInfo) {
  if (tabInfo.active && changeInfo.url) {
    updateIcon(tabInfo);
  }
}

/*
export async function updateActiveTab({opener} = {}) {
*/
async function updateActiveTab({opener} = {}) {
  const tabs = await browser.tabs.query({active: true, currentWindow: true});
  if (tabs[0]) {
    updateIcon(tabs[0], opener);
  }
}

async function initialize() {
  // listen to tab switching
  browser.tabs.onActivated.addListener(updateActiveTab);

  // update when the extension loads initially
  updateActiveTab();

  // listen to tab URL changes
  const isVersion61 = await isVersion(61);
  // extraParameters are supported since Firefox 61
  if (isVersion61) {
    browser.tabs.onUpdated.addListener(onUrlChanged, {properties: ['status']});
  } else {
    browser.tabs.onUpdated.addListener(onUrlChanged);
  }
}

initialize();

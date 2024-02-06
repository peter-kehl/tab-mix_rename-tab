/*
import {isExcludedUrl, isVersion, preferences, setDocumentTitle, toggleListeners} from './common.js';
import {getBookmark} from './bookmarks.js';
import tabsTitles from './titles.js';
*/
/* globals getTabValue, isExcludedUrl, isVersion, preferences, setDocumentTitle,
           toggleListeners, getBookmark, tabsTitles */
'use strict';

async function onTabUpdated(tabId, changeInfo, tabInfo) {
  const {status, url: statusUrl} = changeInfo;
  const {id, url, title, discarded} = tabInfo;
  if (isExcludedUrl(url)) {
    return;
  }

  const titlesData = await (tabsTitles.data[id] || getTabValue({id, url}));
  if (!titlesData && !preferences.title_from_bookmark) {
    if (statusUrl && status == 'loading') {
      browser.tabs.sendMessage(id, {type: 'reset_doc_title'});
    }
    return;
  }

  if (discarded) {
    tabsTitles.restoredTabs[id] = true;
  }
  if (tabsTitles.restoredTabs[id]) {
    // if we try to change title on restored tab too early
    // we get "Missing host permission for the tab" error
    if (status == 'complete') {
      delete tabsTitles.restoredTabs[id];
    } else {
      return;
    }
  }

  // if user title exist use it
  // if not try to find bookmark title
  const newTitle = tabsTitles.getUserTitle(id, url) || await getBookmark(url);
  setDocumentTitle(id, title, newTitle, changeInfo);
}

// logic to enable the update listener
// - title_from_bookmark was true during the session
// - tabsTitles is active. i.e. at least on tab contains user title
let sessionTitleFromBookmark = false;
function tabUpdatedPrefsListener(changes) {
  if (changes.includes('title_from_bookmark')) {
    if (preferences.title_from_bookmark) {
      sessionTitleFromBookmark = true;
    }
    toggleOnUpdatedListener();
  }
}

const updateListeners = [{func: onTabUpdated}];

(async function addExtraParameters() {
  const isVersion61 = await isVersion(61);
  if (isVersion61) {
    // extraParameters are supported since Firefox 61
    updateListeners[0].extraParameters = {properties: ['title', 'status']};
  }
}());

function toggleOnUpdatedListener(add) {
  const activate = add || sessionTitleFromBookmark;
  toggleListeners(browser.tabs, updateListeners, activate, 'Tab');
}

tabsTitles.toggleListeners = toggleOnUpdatedListener;

preferences.onChanged.addListener(tabUpdatedPrefsListener, true);

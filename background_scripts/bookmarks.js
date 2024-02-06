/*
import {debounce, isExcludedUrl, preferences, setDocumentTitle, toggleListeners} from './common.js';
import tabsTitles from './titles.js';
*/

/* globals debounce, isExcludedUrl, preferences, setDocumentTitle,
           toggleListeners, tabsTitles
*/
'use strict';

/*
export async function getBookmark(url) {
*/
async function getBookmark(url) {
  if (!preferences.title_from_bookmark) {
    return '';
  }
  // results are returned in the order that the bookmarks were created
  // last modified bookmark is the last in the array
  let bookmarks = await browser.bookmarks.search({url});
  if (bookmarks.length == 0 && url.includes('#')) {
    bookmarks = await browser.bookmarks.search({url: url.split('#')[0]});
  }
  return bookmarks.length ? bookmarks[bookmarks.length - 1] : {id: '', title: ''};
}

async function updateTabTitle({id, title, url}, bookmarkId) {
  if (isExcludedUrl(url) || tabsTitles.getUserTitle(id, url)) {
    return;
  }
  const savedId = await browser.tabs.sendMessage(id, {type: 'get_bookmark_id'});
  if (savedId && (!bookmarkId || savedId == bookmarkId)) {
    const newTitle = await getBookmark(url);
    setDocumentTitle(id, title, newTitle);
  }
}

// 1. when bookmark url changed, we don't have access to the former url.
// 2. when a folder is removed recursively, a single notification is fired
//    for the folder, and none for its contents.
//
// notify all tabs to check if the tab title was taken from the
// bookmark with the given id, if it does - update the title
async function onUnspecificChange(bookmarkId) {
  const tabs = await browser.tabs.query({});
  tabs.forEach(tab => {
    updateTabTitle(tab, bookmarkId);
  });
}

// updateTabTitle look for tab that already have a bookmarkId
// this function check for all tab if bookmark exist
async function updateAllTabs() {
  const updateTab = async({id, title, url}) => {
    if (!isExcludedUrl(url) && !tabsTitles.getUserTitle(id, url)) {
      const newTitle = await getBookmark(url);
      setDocumentTitle(id, title, newTitle);
    }
  };
  const tabs = await browser.tabs.query({});
  tabs.forEach(updateTab);
}

async function updateTabsTitleFromBookmark(bookmark) {
  if (isExcludedUrl(bookmark.url)) {
    return;
  }
  const tabs = await browser.tabs.query({url: bookmark.url});
  tabs.forEach(({id, title, url}) => {
    // no need to get tab title from bookmark if the user rename the tab
    if (!isExcludedUrl(url) && !tabsTitles.getUserTitle(id, url)) {
      setDocumentTitle(id, title, bookmark);
    }
  });
}

function onBookmarkCreated(id, node) {
  if (preferences.title_from_bookmark && node.type == 'bookmark') {
    updateTabsTitleFromBookmark(node);
  }
}

async function onBookmarkChanged(id, info) {
  if (!preferences.title_from_bookmark) {
    return;
  }
  // after bookmark changed info contain title or url
  // we use bookmarks.get to get type, title and url
  const node = (await browser.bookmarks.get(id))[0] || {};
  if (node.type == 'bookmark') {
    if (info.url) {
      onUnspecificChange(id);
    }
    updateTabsTitleFromBookmark(node);
  }
}

function onBookmarkRemoved(id, info) {
  if (preferences.title_from_bookmark) {
    const {url, type} = info.node;
    if (type == 'bookmark') {
      updateTabsTitleFromBookmark({url});
    } else if (type == 'folder') {
      onUnspecificChange();
    }
  }
}

function onEndUpdateBatch(fnName) {
  switch (fnName) {
    case 'onBookmarkCreated':
      updateAllTabs();
      break;
    case 'onBookmarkChanged':
      updateAllTabs();
      break;
    case 'onBookmarkRemoved':
      onUnspecificChange();
      break;
    default:
      updateAllTabs();
  }
}

const bookmarksListeners = [onBookmarkCreated, onBookmarkChanged, onBookmarkRemoved];

(function setDebounce() {
  bookmarksListeners.forEach((fn, index) => {
    bookmarksListeners[index] = debounce(fn, onEndUpdateBatch, 100);
  });
}());

function bookmarksPrefsListener(changes) {
  if (changes.includes('title_from_bookmark')) {
    const pref = preferences.title_from_bookmark;
    toggleListeners(browser.bookmarks, bookmarksListeners, pref, 'Bookmark');
  }
}

preferences.onChanged.addListener(bookmarksPrefsListener, true);

/*
TODO
* update title when the extension disabled, runtime.onSuspend does not supported
*/

/*
export {preferences} from './storage.js';
*/
/* globals module */
/* exported isExcludedUrl, getDocumentTitle, setDocumentTitle, toggleListeners,
            debounce, loadLocalStrings, isVersion
*/
'use strict';

// webExtension don't have permission to rename these urls
const excludedUrls = ['about:', 'addons.mozilla.org'];

/*
export const isExcludedUrl = url => url && excludedUrls.some(str => url.includes(str));
*/
const isExcludedUrl = url => url && excludedUrls.some(str => url.includes(str));

/*
export function getDocumentTitle(id) {
*/
function getDocumentTitle(id) {
  return browser.tabs.sendMessage(id, {type: 'get_original_title'});
}

// newTitle may contain title string or bookmark object
/*
export async function setDocumentTitle(id, tabTitle, newTitle, info = '') {
*/
async function setDocumentTitle(id, tabTitle, newTitle, info = '') {
  const message = typeof newTitle == 'string' ? {title: newTitle} : newTitle;
  const {title, id: bookmarkId} = message;
  if (tabTitle == title) {
    // nothing to do....
    return {success: true, error: ''};
  }
  const data = {success: false, error: ''};
  try {
    const type = 'change_doc_title';
    const result = await browser.tabs.sendMessage(id, {type, title, bookmarkId});
    // the result should be our new title or reset_doc_title
    const expected = title || 'reset_doc_title';
    if (result == expected) {
      data.success = true;
    } else {
      data.error = new Error(`Unexpected result "${result}" instead of "${expected}"`);
      console.error(data.error, info);
    }
  } catch (ex) {
    const msg = 'could not establish connection';
    const notConnected = ex.toString().toLowerCase().includes(msg);
    if (!notConnected) {
      console.error(ex, info);
    }
    data.error = ex;
  }
  return data;
}

/*
export function toggleListeners(target, listeners, action, match = '') {
*/
function toggleListeners(target, listeners, action, match = '') {
  const command = action ? 'addListener' : 'removeListener';
  for (let fn of listeners) {
    const {func, extraParameters} = fn;
    if (func) {
      fn = func;
    }
    const listener = fn.name.replace(match, '');
    if (action != target[listener].hasListener(fn)) {
      if (extraParameters && action) {
        target[listener][command](fn, extraParameters);
      } else {
        target[listener][command](fn);
      }
    }
  }
}

/*
export function debounce(fn, callback, wait) {
*/
function debounce(fn, callback, wait) {
  let lastCallTime = 0;
  let timeOutId;
  const innerDebounce = function() {
    const now = Date.now();
    const lastTime = lastCallTime;
    lastCallTime = now;
    if (now - lastTime >= wait) {
      timeOutId = setTimeout((...args) => {
        fn(...args);
      }, 0, ...arguments);
    } else {
      if (timeOutId !== undefined) {
        clearTimeout(timeOutId);
      }
      timeOutId = setTimeout(() => {
        callback(fn.name);
        timeOutId = undefined;
      }, wait);
    }
  };
  Object.defineProperty(innerDebounce, 'name', {value: fn.name});
  Object.defineProperty(innerDebounce, 'isDebounce', {value: true});
  return innerDebounce;
}

/*
export function loadLocalStrings(container) {
*/
function loadLocalStrings(container) {
  const getMessage = browser.i18n.getMessage;
  const elements = container.querySelectorAll('[i18n]');
  for (const item of Array.from(elements)) {
    const [messageName, extra1 = '', extra2 = ''] = item.getAttribute('i18n').split(' ');
    const match = /^\[(.*)\]$/.exec(extra1);
    if (match) {
      const args = match[1].split(',').map(msg => getMessage(msg));
      item.textContent = getMessage(messageName, args) + extra2;
    } else {
      item.textContent = getMessage(messageName) + extra1;
    }
  }
}

/*
export async function isVersion(versionNo) {
*/
async function isVersion(versionNo) {
  const info = await browser.runtime.getBrowserInfo();
  const version = info.version.split('.')[0];
  return Number(version) >= versionNo;
}

if (typeof module == 'object' && typeof module.exports == 'object') {
  module.exports = {
    isExcludedUrl,
    getDocumentTitle,
    setDocumentTitle,
    toggleListeners,
    debounce,
    loadLocalStrings,
    isVersion,
  };
}

/*
import {
  getDocumentTitle, isExcludedUrl, preferences, setDocumentTitle,
  toggleListeners,
} from './common.js';
import {updateActiveTab, updateIcon} from './updateActiveTab.js';
import {getBookmark} from './bookmarks.js';
import tabsTitles from './titles.js';
*/
/* globals getDocumentTitle, isExcludedUrl, preferences, setDocumentTitle,,
           toggleListeners, updateActiveTab, updateIcon, getBookmark, tabsTitles */
'use strict';

/***   rename tab context menu   ***/

function toggleRenameTabMenu(add) {
  if (add) {
    browser.contextMenus.create({
      id: 'tabmix-rename-tab',
      title: `${browser.i18n.getMessage('context_menu_rename_tab')}…`,
      contexts: ['tab'],
    });
  } else {
    browser.contextMenus.remove('tabmix-rename-tab');
  }
}

function updateMenuItem(enabled) {
  browser.contextMenus.update('tabmix-rename-tab', {enabled});
  browser.contextMenus.refresh();
}

function onPanelSateChanged(tab, state) {
  if (!tab.active) {
    const opener = state == 'opened' ? tab : null;
    updateActiveTab({opener});
  }
}

function onRenameTabMenuClicked(info, tab) {
  switch (info.menuItemId) {
    case 'tabmix-rename-tab':
      onPanelSateChanged(tab, 'opened');
      openRenameTabPanel(tab);
      break;
  }
}

function onRenameTabMenuShown({pageUrl}, {discarded}) {
  const disableRenameTab = !pageUrl || isExcludedUrl(pageUrl) || discarded;
  updateMenuItem(!disableRenameTab);
}

function menusPrefsListener(changes) {
  if (changes.includes('show_in_context_menu')) {
    const prefValue = preferences.show_in_context_menu;
    toggleRenameTabMenu(prefValue);
    // toggle listeners
    const listeners = [onRenameTabMenuClicked, onRenameTabMenuShown];
    toggleListeners(browser.contextMenus, listeners, prefValue, 'RenameTabMenu');
  }
}

preferences.onChanged.addListener(menusPrefsListener, true);

/***   rename tab panel   ***/

// send to the panel only the data it need to set dom values
async function prepareDataForPanel(tab) {
  const state = tabsTitles.getTitles(tab.id, tab.url);
  const {permanently, currentUserTitle, otherPagesModified} = state;
  const modified = Boolean(currentUserTitle);
  const {title: bookmarkName} = await getBookmark(tab.url);
  const documentTitle = bookmarkName || await getDocumentTitle(tab.id);
  const thumbnail = await browser.tabs.captureTab(tab.id, {format: 'jpeg', quality: 50});
  const image = tab.url.includes('tabmixplus.org') ? '../../icons/tabmix-32.png' : tab.favIconUrl;
  return {
    type: 'init_state_for_panel',
    image,
    thumbnail,
    permanently,
    permanentlyChecked: permanently || !modified && !otherPagesModified,
    title: tab.title,
    documentTitle,
    currentUserTitle,
    modified,
  };
}

function checkRespondOnPanelDone(tab, respond) {
  const {title, reset, documentTitle, currentUserTitle, permanently, permanentlyChecked} = respond;
  // title should not be empty, to be safe we add fallbacks
  const newTitle = title.trim() || currentUserTitle || tab.title;

  const resetDefault = reset || newTitle == documentTitle && !permanentlyChecked;
  if (resetDefault) {
    return {tab, title: newTitle, reset: true};
  }

  const stateChanged = newTitle != currentUserTitle || permanentlyChecked != permanently;
  return {tab, stateChanged, title: newTitle, permanently: permanentlyChecked};
}

// check if user change the data we sent to the panel
// if anything change updated database
// if title changed update document.title
async function onPanelDone({tab, stateChanged, title, permanently, reset}) {
  // update tab title
  const {success, error} = await setDocumentTitle(tab.id, tab.title, title);
  if (error) {
    reset = true;
  }
  // update database
  if (reset) {
    tabsTitles.saveTitles(tab);
  } else if (stateChanged) {
    tabsTitles.saveTitles(tab, {permanently, title});
  }

  if (reset || stateChanged) {
    updateIcon(tab);
  }

  onPanelSateChanged(tab, 'closed');

  return success;
}

function addPanelListeners(tab) {
  function onMessage(message) {
    let responding;
    switch (message.type) {
      case 'rename_panel_opened':
        responding = prepareDataForPanel(tab);
        break;
      case 'rename_panel_closed':
        onPanelSateChanged(tab, 'closed');
        if (browser.runtime.onMessage.hasListener(onMessage)) {
          browser.runtime.onMessage.removeListener(onMessage);
        }
        break;
      case 'rename_panel_done': {
        const data = checkRespondOnPanelDone(tab, message);
        responding = onPanelDone(data);
        break;
      }
    }
    return responding;
  }
  browser.runtime.onMessage.addListener(onMessage);
  return onMessage;
}

function openRenameTabPanel(tab) {
  addPanelListeners(tab);
  browser.browserAction.setPopup({popup: '/panel/renameTab.html'});
  browser.browserAction.openPopup();
  // when our button pinned to the overflow menu, the menu is flickers if we
  // remove the popup attribute too soon
  setTimeout(() => {
    browser.browserAction.setPopup({popup: ''});
  }, 200);
}

/***   rename tab browserAction   ***/

browser.browserAction.onClicked.addListener(tab => {
  if (!isExcludedUrl(tab.url)) {
    openRenameTabPanel(tab);
  }
});

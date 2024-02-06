'use strict';

/*
* Preferences
*
* Toggle: save user titles with session API
* Toggle: use bookmark name as tab title
* Toggle: add Rename tab item to tab context menu
*/
const preferencesRestored = browser.storage.local
    .get(null)
    .then(updateAllPrefs, onError);

const preferences = {
  save_with_sessions: true,
  show_in_context_menu: true,
  title_from_bookmark: true,
  onChanged: {
    listeners: [],
    addListener(listener, callWhenReady) {
      this.listeners.push(listener);
      if (callWhenReady) {
        preferencesRestored.then(listener);
      }
    },
    notifyListeners(changes) {
      this.listeners.forEach(cb => cb(changes));
    },
  },
};

Object.defineProperty(preferences, 'onChanged', {
  enumerable: false,
  configurable: false,
  writable: false,
});

/*
export {preferences};
*/

/*
Update the options UI with the settings values retrieved from storage,
or the default settings if the stored settings are empty.
*/
function updateAllPrefs(restoredPrefs) {
  const prefs = Object.entries(restoredPrefs);
  for (const [prefName, value] of prefs) {
    updatePref(prefName, value);
  }

  return Object.keys(preferences);
}

/*
Update our preferences object after storage area that changed
*/
function onStorageChanged(changes, area) {
  if (area != 'local') {
    return;
  }

  const changedItems = Object.keys(changes);
  const changedPrefs = changedItems.filter(prefName => {
    const {oldValue, newValue} = changes[prefName];
    return oldValue != newValue && updatePref(prefName, newValue);
  });

  // notify listeners
  preferences.onChanged.notifyListeners(changedPrefs);
}

function updatePref(prefName, newValue) {
  const type = typeof newValue != 'undefined' && typeof preferences[prefName];
  switch (type) {
    case 'number':
      preferences[prefName] = Number(newValue);
      break;
    case 'boolean':
      preferences[prefName] = Boolean(newValue);
      break;
    default:
      return false;
  }
  return true;
}

function onError(e) {
  console.error(e);
}

browser.storage.onChanged.addListener(onStorageChanged);

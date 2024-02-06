/*
import {loadLocalStrings} from '../background_scripts/common.js';
import {preferences} from '../background_scripts/storage.js';
*/
/* globals loadLocalStrings preferences */
'use strict';

/*
Update the options UI with the settings values retrieved from storage,
or the default settings if the stored settings are empty.
*/
function updateUI(prefs) {
  for (const pref of prefs) {
    const item = document.querySelector(`#${pref}`);
    if (item) {
      const type = item.getAttribute('type');
      if (type == 'checkbox') {
        item.checked = Boolean(preferences[pref]);
      } else {
        console.error(`need to update option UI for ${pref} with type ${type}`);
      }
    }
  }
}

preferences.onChanged.addListener(updateUI, true);

/*
Store currently changed preference.
*/
function savePreferences(preference) {
  const {id, type, checked} = preference;
  if (typeof preferences[id] == 'undefined' || type != 'checkbox') {
    console.error(`need to update option UI for ${id} with type ${type}`);
    return;
  }

  browser.storage.local.set({[`${id}`]: checked});
}

// save preferences on every change
function onChange(event) {
  const preference = event.target;
  savePreferences(preference);
}

const optionsBox = document.querySelector('.panel-section-list');
optionsBox.addEventListener('change', onChange);

async function openContributeTab() {
  const tabs = await browser.tabs.query({currentWindow: true, active: true});
  const index = tabs[0].index + 1;
  const url = 'http://tabmixplus.org/support/contribute/contribute.html';
  browser.tabs.create({url, index});
}

document.querySelector('.contribute').addEventListener('click', openContributeTab);

function loadStrings() {
  loadLocalStrings(document);
}

document.addEventListener('DOMContentLoaded', loadStrings, true);

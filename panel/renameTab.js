/*
import {loadLocalStrings} from '../background_scripts/common.js';
*/
/* globals loadLocalStrings */
'use strict';

let data = {};

const $ = id => document.getElementById(id);

// fix white gap bellow panel buttons
// round the hight to the nearest even number
function sizeToContent() {
  const body = $('panel').parentNode;
  body.style.height = '';
  const rect = body.getBoundingClientRect();
  const height = Math.round(rect.height);
  body.style.height = `${height - height % 2}px`;
}

function onError() {
  $('error-msg').classList.add('show-error');
  $('error-msg').textContent = browser.i18n.getMessage('panel_error_msg');
  const updateButton = $('updateButton');
  updateButton.hidden = true;
  updateButton.removeAttribute('default');
  const resetButton = $('resetButton');
  resetButton.textContent = browser.i18n.getMessage('panel_button_cancel');
  resetButton.setAttribute('default', true);
  data.error = true;
  sizeToContent();
}

function onCheckboxChanged(event) {
  const checked = event.target.checked;
  data.permanentlyChecked = checked;
}

function onEnterPressed() {
  if (data.error) {
    hidePopup();
  } else {
    updateTitle();
  }
}

function onKeyPressed(event) {
  if (event.keyCode == event.DOM_VK_RETURN &&
      event.target.localName != 'button') {
    onEnterPressed();
  }
}

function onTitleFieldChanged(event) {
  const newTitle = event.target.value;
  data.title = newTitle;
  if (data.title.trim()) {
    $('updateButton').removeAttribute('disabled');
  } else {
    $('updateButton').setAttribute('disabled', true);
  }

  const {title, documentTitle, modified} = data;
  if (!modified) {
    if (title != documentTitle) {
      $('panel').setAttribute('modified', true);
    } else {
      $('panel').removeAttribute('modified');
    }
    sizeToContent();
  }
}

const listeners = {
  _events: {
    click_updateButton: event => updateTitle(event),
    click_resetButton: event => resetTitle(event),
    'input_title-field': event => onTitleFieldChanged(event),
    change_permanently: event => onCheckboxChanged(event),
    blur_window: event => hidePopup(event),
    keypress_window: event => onKeyPressed(event),
  },
  toggleEventListener(enable) {
    const eventListener = enable ? 'addEventListener' : 'removeEventListener';
    Object.keys(this._events).forEach(key => {
      const [eventName, targetName] = key.split('_');
      const target = targetName == 'window' ? window : $(targetName);
      target[eventListener](eventName, this);
    });
  },
  handleEvent(event) {
    const type = event.type;
    const target = type == 'keypress' ? 'window' : event.target.id || 'window';
    const name = `${type}_${target}`;
    this._events[name](event);
  },
};

function hidePopup(event) {
  listeners.toggleEventListener(false);
  browser.runtime.sendMessage({type: 'rename_panel_closed'});
  if (!event) {
    window.close();
  }
}

function resetTitle() {
  if (!data.error && data.modified) {
    data.title = data.documentTitle;
    data.reset = true;
    updateTitle();
  } else {
    hidePopup();
  }
}

async function updateTitle() {
  if ($('updateButton').hasAttribute('disabled')) {
    return;
  }
  data.type = 'rename_panel_done';
  const success = await browser.runtime.sendMessage(data);
  if (success) {
    hidePopup();
  } else {
    onError();
  }
}

function initPanel(respond) {
  const {image, title, documentTitle, modified, permanentlyChecked, thumbnail} = data = respond;
  delete data.image;
  delete data.thumbnail;

  // init input fields
  const titleField = $('title-field');
  titleField.value = title;
  titleField.focus();
  titleField.select();

  $('default-title').value = documentTitle;
  $('permanently').checked = permanentlyChecked;

  if (modified) {
    $('panel').setAttribute('modified', true);
    $('resetButton').textContent = browser.i18n.getMessage('panel_button_reset');
  }

  // init icon and thumbnail
  if (image) {
    $('icon').setAttribute('src', image);
  }

  if (thumbnail) {
    $('panel').setAttribute('thumbnail', true);
    $('panelImage').style.backgroundImage = `url(${thumbnail})`;
  }

  sizeToContent();
}

function init(respond) {
  initPanel(respond);
  listeners.toggleEventListener(true);
}

// notify background script that we are ready and get title data back
browser.runtime.sendMessage({type: 'rename_panel_opened'}).then(init);

function loadStrings() {
  loadLocalStrings(document);
}

document.addEventListener('DOMContentLoaded', loadStrings, true);

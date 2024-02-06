// eslint-disable-next-line strict
'use strict';

const data = {};
let lastTitle = '';

const contentLoadedPromise = new Promise(resolve => {
  document.addEventListener('DOMContentLoaded', () => {
    saveOriginalTitle();
    resolve();
  }, {once: true});
});

function delayedRespond() {
  return contentLoadedPromise.then(() => {
    document.title = lastTitle;
    return document.title;
  });
}

function updateTitle({type, title, bookmarkId}) {
  let respond;
  if (type == 'change_doc_title' && !title) {
    type = 'reset_doc_title';
  }
  switch (type) {
    case 'change_doc_title':
      saveOriginalTitle();
      document.title = `${title}`;
      respond = document.title;
      data.bookmarkId = bookmarkId;
      lastTitle = title;
      if (!document.title) {
        return delayedRespond();
      }
      break;
    case 'reset_doc_title': {
      const docTitle = data.originalTitle;
      if (docTitle && docTitle != document.title) {
        document.title = docTitle;
      }
      lastTitle = docTitle;
      delete data.bookmarkId;
      respond = 'reset_doc_title';
      break;
    }
    case 'get_original_title':
      return contentLoadedPromise.then(() => {
        return data.originalTitle;
      });
    case 'get_bookmark_id':
      respond = data.bookmarkId || '';
      break;
    case 'get_extension_data':
      respond = {
        ...data,
        title: document.title,
      };
      break;
  }
  return Promise.resolve(respond);
}

function onMessage(message) {
  try {
    return updateTitle(message);
  } catch (ex) {
    console.error(ex, `url: ${document.URL}`);
    return Promise.reject(ex);
  }
}

function saveOriginalTitle() {
  if (!data.originalTitle) {
    data.originalTitle = document.title;
  }
}

browser.runtime.onMessage.addListener(onMessage);

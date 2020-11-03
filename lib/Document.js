"use strict";

const cheerio = require("cheerio");
const DocumentFragment = require("./DocumentFragment");
const Element = require("./Element");
const getLocation = require("./getLocation");
const {EventEmitter} = require("events");
const {Event} = require("./Events");
const {HTMLCollection} = require("./HTMLCollection");

module.exports = Document;

function Document(source, cookieJar) {
  const location = source.location || getLocation(source.url);
  const referrer = source.referrer || "";
  const $ = cheerio.load(source.text, {decodeEntities: false});
  const loaded = [];

  const emitter = new EventEmitter();

  let fullscreenElement = null;
  let forms;

  const document = {
    $,
    _getElement: getElement,
    _emitter: emitter,
    addEventListener,
    createDocumentFragment() {
      return DocumentFragment(Element);
    },
    createComment,
    createElement,
    createElementNS,
    createTextNode,
    dispatchEvent,
    exitFullscreen,
    getElementById,
    getElementsByTagName(name) {
      return this.documentElement.getElementsByTagName(name);
    },
    getElementsByClassName(classNames) {
      return this.documentElement.getElementsByClassName(classNames);
    },
    getElementsByName,
    importNode,
    location,
    removeEventListener,
    referrer,
    textContent: null,
    implementation: {
      createHTMLDocument(title = "") {
        return Document({text: `<!doctype html><html><head><title>${title}</title></head><body></body></html>`}, cookieJar);
      }
    }
  };

  Object.defineProperty(document, "head", {
    get: getHead
  });

  Object.defineProperty(document, "body", {
    get: getBody
  });

  Object.defineProperty(document, "documentElement", {
    get: () => getElement($("html"))
  });

  Object.defineProperty(document, "firstElementChild", {
    get: () => getElement($("html"))
  });

  Object.defineProperty(document, "firstChild", {
    get: () => getElement($("> :first-child"))
  });

  Object.defineProperty(document, "fullscreenElement", {
    get: () => fullscreenElement
  });

  Object.defineProperty(document, "cookie", {
    get() {
      const cookies = cookieJar.getCookies({path: location.pathname, script: true, domain: location.hostname, secure: location.protocol === "https:"});
      return cookies.map((cookie) => cookie.toValueString()).join("; ");
    },
    set: (value) => {
      cookieJar.setCookie(value);
    }
  });

  Object.defineProperty(document, "title", {
    get: () => getElement($("head > title")).textContent,
    set: (value) => {
      getElement($("head > title")).textContent = value;
    }
  });

  Object.defineProperty(document, "nodeType", {
    get: () => 9
  });

  Object.defineProperty(document, "forms", {
    get() {
      if (!forms) forms = document.documentElement.getElementsByTagName("form");
      return forms;
    }
  });

  return document;

  function exitFullscreen() {
    const fullscreenchangeEvent = new Event("fullscreenchange");
    fullscreenchangeEvent.target = fullscreenElement;

    document.dispatchEvent(fullscreenchangeEvent);
  }

  function getHead() {
    return getElement($("head"));
  }

  function getBody() {
    return getElement($("body"));
  }

  function getElement($elm) {
    if ($elm === $) return document;
    if (!$elm.length) return;

    let mockElement = loaded.find((mockedElm) => mockedElm.$elm[0] === $elm[0]);
    if (mockElement) {
      return mockElement;
    }

    mockElement = Element(document, $elm);

    loaded.push(mockElement);
    return mockElement;
  }

  function getElementById(id) {
    const selector = ("#" + id).replace(/\./g, "\\."); // eslint-disable-line
    const $idElm = $(selector).eq(0);
    if ($idElm && $idElm.length) return getElement($idElm);
    return null;
  }

  function getElementsByName(name) {
    return new HTMLCollection(document.documentElement, `[name="${name}"],#${name}`, {attributes: true});
  }

  function createElement(elementTagName) {
    const element = Element(document, document.$(`<${elementTagName}></${elementTagName}>`));
    loaded.push(element);
    return element;
  }

  function createElementNS(namespaceURI, elementTagName) {
    return createElement(elementTagName);
  }

  function createTextNode(text) {
    return {
      nodeType: 3,
      textContent: text,
    };
  }

  function createComment(text) {
    return {
      nodeType: 8,
      textContent: text,
    };
  }

  function addEventListener(...args) {
    emitter.on(...args);
  }

  function removeEventListener(...args) {
    emitter.removeListener(...args);
  }

  function dispatchEvent(event) {
    if (event && event.type === "fullscreenchange") {
      _handleFullscreenChange(event);
    } else {
      emitter.emit(event.type, event);
    }
  }

  function _handleFullscreenChange(event) {
    if (!event.target) return;

    if (fullscreenElement === null) {
      fullscreenElement = event.target;
    } else if (fullscreenElement === event.target) {
      fullscreenElement = null;
    }

    emitter.emit("fullscreenchange", event);
  }

  function importNode(element, deep) {
    if (element instanceof DocumentFragment) {
      return element._clone(deep);
    }

    return element.cloneNode(deep);
  }
}

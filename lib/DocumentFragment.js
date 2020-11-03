"use strict";

const cheerio = require("cheerio");

module.exports = function DocumentFragment(Element, templateElement) {
  const $ = cheerio.load("", {decodeEntities: false});
  const $body = $("body");
  const loaded = [];

  if (templateElement) {
    $body.html(getContent(templateElement.$elm));
  }

  const fragment = {
    $,
    $elm: $body,
    _getElement: getElement,
    _getContent() {
      return getContent($body);
    },
    _clone: clone,
    querySelector,
    querySelectorAll,
    appendChild,
  };

  Object.defineProperty(fragment, "firstChild", {
    get: getFirstChild
  });

  Object.defineProperty(fragment, "firstElementChild", {
    get: getFirstChildElement
  });

  Object.defineProperty(fragment, "childNodes", {
    get() {
      return $body.contents().map(toElement).toArray();
    }
  });

  Object.defineProperty(fragment, "nodeType", {
    get() {
      return 11;
    },
    set(value) {
      return value;
    }
  });

  Object.setPrototypeOf(fragment, DocumentFragment.prototype);
  return fragment;

  function clone(deep) {
    return DocumentFragment(Element, deep && {$elm: $body});
  }

  function getElement($elm) {
    if ($elm === $) return fragment;
    if (!$elm.length) return;

    let mockElement = loaded.find((mockedElm) => mockedElm.$elm[0] === $elm[0]);
    if (mockElement) {
      return mockElement;
    }

    mockElement = Element(fragment, $elm);

    loaded.push(mockElement);
    return mockElement;
  }

  function getContent($elm) {
    let content = "";
    $elm.contents().each((_, elm) => {
      content += $.html(elm, {decodeEntities: true});
    });

    return content;
  }

  function querySelector(selector) {
    return getElement($body.find(selector).eq(0)) || null;
  }

  function querySelectorAll(selector) {
    return $body.find(selector).map((_, elm) => getElement($(elm)));
  }

  function appendChild(child) {
    const $appendedChild = $body.append(child.$elm);
    return getElement($appendedChild);
  }

  function getFirstChild() {
    const $child = $body.contents().first();
    if (!$child || !$child[0]) return null;
    return getElement($child);
  }

  function getFirstChildElement() {
    const firstChild = find("> :first-child");
    if (!firstChild.length) return null;
    return getElement(firstChild);
  }

  function find(selector) {
    return $body.find(selector);
  }

  function toElement(idx, elm) {
    return getElement($(elm));
  }
};

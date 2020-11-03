"use strict";

const DocumentFragment = require("./DocumentFragment");
const DOMException = require("domexception");
const makeAbsolute = require("./makeAbsolute");
const NamedNodeMap = require("./NamedNodeMap");
const url = require("url");
const vm = require("vm");
const {EventEmitter} = require("events");
const {Event} = require("./Events");
const {getElementsByClassName, getElementsByTagName} = require("./HTMLCollection");
const {RadioNodeList} = require("./NodeList");

const rwProperties = ["id", "name", "type"];
const inputElements = ["input", "button", "textarea"];

module.exports = Element;

function Element(document, $elm) {
  const {$, location, _getElement} = document;
  const tagName = (($elm[0] && $elm[0].name) || "").toLowerCase();
  const nodeType = $elm[0] && $elm[0].nodeType;

  let eventTarget;

  if (nodeType === 3) return Text(document, $elm);

  const rects = {
    top: 99999,
    bottom: 99999,
    right: 0,
    left: 0,
    height: 0,
    width: 0
  };

  rects.bottom = rects.top + rects.height;

  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  const classList = getClassList();

  const element = eventTarget = {
    $elm,
    _emitter: emitter,
    _setBoundingClientRect: setBoundingClientRect,
    appendChild,
    classList,
    click,
    closest,
    contains,
    dispatchEvent,
    focus,
    getAttribute,
    getBoundingClientRect,
    getClientRects() {
      return [getBoundingClientRect()];
    },
    getElementsByClassName(classNames) {
      return getElementsByClassName(this, classNames);
    },
    getElementsByTagName(name) {
      return getElementsByTagName(this, name);
    },
    hasAttribute,
    insertAdjacentHTML,
    insertBefore,
    matches,
    remove,
    removeAttribute,
    removeChild,
    replaceChild,
    requestFullscreen,
    setAttribute,
    setElementsToScroll,
    cloneNode,
    style: getStyle(),
  };

  Object.setPrototypeOf(element, Element.prototype);

  Object.defineProperty(element, "tagName", {
    get: () => tagName ? tagName.toUpperCase() : undefined,
    set(value) {
      return value;
    }
  });

  Object.defineProperty(element, "nodeName", {
    get: () => element.tagName,
    set(value) {
      return value;
    }
  });

  rwProperties.forEach((p) => {
    Object.defineProperty(element, p, {
      get: () => getAttribute(p),
      set: (value) => setAttribute(p, value)
    });
  });

  Object.defineProperty(element, "nodeType", {
    enumerable: true,
    set() {},
    get() {
      return nodeType;
    },
  });

  Object.defineProperty(element, "nodeValue", {
    set(value) {
      return value;
    },
    get() {
      return null;
    },
  });

  Object.defineProperty(element, "ownerDocument", {
    get() {
      return document;
    }
  });

  Object.defineProperty(element, "firstChild", {
    get: getFirstChild
  });

  Object.defineProperty(element, "firstElementChild", {
    get: getFirstChildElement
  });

  Object.defineProperty(element, "lastChild", {
    get: getLastChild
  });

  Object.defineProperty(element, "lastElementChild", {
    get: getLastChildElement
  });

  Object.defineProperty(element, "previousElementSibling", {
    get: () => _getElement($elm.prev())
  });

  Object.defineProperty(element, "nextElementSibling", {
    get: () => _getElement($elm.next())
  });

  Object.defineProperty(element, "children", {
    get: getChildren
  });

  Object.defineProperty(element, "childNodes", {
    get: getChildNodes
  });

  Object.defineProperty(element, "parentElement", {
    get: () => _getElement($elm.parent())
  });

  Object.defineProperty(element, "parentNode", {
    get: () => _getElement($elm.parent())
  });

  Object.defineProperty(element, "innerHTML", {
    get: () => $elm.html(),
    set: (value) => {
      $elm.html(value);
      if (tagName === "textarea") {
        element.value = $elm.html();
      }

      emitter.emit("_insert");
    }
  });

  Object.defineProperty(element, "innerText", {
    get: () => element.textContent,
    set: (value) => {
      element.textContent = value;

      if (tagName === "textarea") {
        element.value = element.textContent;
      }
    }
  });

  Object.defineProperty(element, "textContent", {
    get: () => {
      return tagName === "script" ? $elm.html() : $elm.text();
    },
    set: (value) => {
      const response = tagName === "script" ? $elm.html(value) : $elm.text(value);
      emitter.emit("_insert");
      return response;
    }
  });

  Object.defineProperty(element, "outerHTML", {
    get: () => {
      return $.html($elm);
    },
    set: (value) => {
      $elm.replaceWith($(value));
      emitter.emit("_insert");
    }
  });

  Object.defineProperty(element, "href", {
    get: () => {
      const rel = getAttribute("href");
      return makeAbsolute(location, rel);
    },
    set: (value) => {
      setAttribute("href", value);
    }
  });

  Object.defineProperty(element, "protocol", {
    get: hrefPropertyGetter("protocol")
  });

  Object.defineProperty(element, "host", {
    get: hrefPropertyGetter("host")
  });

  Object.defineProperty(element, "hostname", {
    get: hrefPropertyGetter("hostname")
  });

  Object.defineProperty(element, "port", {
    get: hrefPropertyGetter("port")
  });

  Object.defineProperty(element, "pathname", {
    get() {
      const href = element.href;
      if (!href) return null;
      const parsedHref = url.parse(href);
      const pathname = parsedHref.pathname;
      if (pathname === "/" && href !== parsedHref.href) return "";
      return pathname;
    },
  });

  Object.defineProperty(element, "search", {
    get: hrefPropertyGetter("search")
  });

  Object.defineProperty(element, "hash", {
    get: hrefPropertyGetter("hash")
  });

  function hrefPropertyGetter(propertyName) {
    return function getHrefProperty() {
      const href = element.href;
      if (!href) return null;
      return url.parse(href)[propertyName] || "";
    };
  }

  Object.defineProperty(element, "src", {
    get: () => {
      const rel = getAttribute("src");
      return makeAbsolute(location, rel);
    },
    set: (value) => {
      setAttribute("src", value);
      dispatchEvent(new Event("load", {bubbles: true}));
    }
  });

  Object.defineProperty(element, "content", {
    get: () => {
      if (tagName !== "template") return;
      return DocumentFragment(Element, element);
    }
  });

  Object.defineProperty(element, "checked", {
    get: () => getProperty("checked"),
    set: (value) => {
      if ($elm.attr("type") === "radio") radioButtonChecked(value);
      else if ($elm.attr("type") === "checkbox") checkboxChecked(value);
    }
  });

  Object.defineProperty(element, "options", {
    get: () => getChildren("option")
  });

  Object.defineProperty(element, "selected", {
    get: () => getProperty("selected"),
    set: (value) => {
      const oldValue = getProperty("selected");
      const $select = $elm.parent("select");
      if (!$select.attr("multiple")) {
        if (value) $elm.siblings("option").prop("selected", false);
      }

      setProperty("selected", value);

      if (value !== oldValue) {
        _getElement($select).dispatchEvent(new Event("change", { bubbles: true }));
      }

      return value;
    }
  });

  Object.defineProperty(element, "selectedIndex", {
    get: () => getChildren("option").findIndex((option) => option.selected)
  });

  Object.defineProperty(element, "selectedOptions", {
    get() {
      return element.options ? element.options.filter((option) => option.selected) : undefined;
    }
  });

  Object.defineProperty(element, "disabled", {
    get: () => {
      const value = getAttribute("disabled");
      if (value === undefined) {
        if (!inputElements.includes(tagName)) return;
      }
      return value === "disabled";
    },
    set: (value) => {
      if (value === true) return setAttribute("disabled", "disabled");
      $elm.removeAttr("disabled");
    }
  });

  Object.defineProperty(element, "className", {
    get: () => $elm.attr("class"),
    set: (value) => setAttribute("class", value)
  });

  Object.defineProperty(element, "form", {
    get: () => _getElement($elm.closest("form"))
  });

  Object.defineProperty(element, "offsetWidth", {
    get: () => getBoundingClientRect().width
  });

  Object.defineProperty(element, "offsetHeight", {
    get: () => getBoundingClientRect().height
  });

  Object.defineProperty(element, "dataset", {
    get: () => Dataset($elm)
  });

  Object.defineProperty(element, "scrollWidth", {
    get: () => {
      return element.children.reduce((acc, el) => {
        acc += el.getBoundingClientRect().width;
        return acc;
      }, 0);
    }
  });

  Object.defineProperty(element, "scrollHeight", {
    get: () => {
      return element.children.reduce((acc, el) => {
        acc += el.getBoundingClientRect().height;
        return acc;
      }, 0);
    }
  });

  Object.defineProperty(element, "value", {
    get: () => {
      if (element.tagName === "SELECT") {
        const selectedIndex = element.selectedIndex;
        if (selectedIndex < 0) return "";
        const option = element.options[selectedIndex];
        if (option.hasAttribute("value")) {
          return option.getAttribute("value");
        }
        return option.innerText;
      } else if (element.tagName === "OPTION") {
        if (element.hasAttribute("value")) {
          return element.getAttribute("value");
        }
        return "";
      }

      if (!inputElements.includes(tagName)) return;
      const value = getAttribute("value");
      if (value === undefined) return "";
      return value;
    },
    set: (value) => {
      if (!inputElements.includes(tagName)) return;
      setAttribute("value", value);
    }
  });

  Object.defineProperty(element, "elements", {
    get() {
      if (tagName !== "form") return;
      return $elm.find("input,button,select,textarea").map(toElement).toArray();
    }
  });

  Object.defineProperty(element, "attributes", {
    get() {
      return NamedNodeMap(element);
    }
  });

  let currentScrollLeft = 0;
  Object.defineProperty(element, "scrollLeft", {
    get: () => currentScrollLeft,
    set: (value) => {
      const maxScroll = element.scrollWidth - element.offsetWidth;
      if (value > maxScroll) value = maxScroll;
      else if (value < 0) value = 0;

      onElementScroll(value);
      currentScrollLeft = value;
      dispatchEvent(new Event("scroll", { bubbles: true }));
    }
  });

  let currentScrollTop = 0;
  Object.defineProperty(element, "scrollTop", {
    get: () => currentScrollTop,
    set: (value) => {
      const maxScroll = element.scrollHeight - element.offsetHeight;
      if (value > maxScroll) value = maxScroll;
      else if (value < 0) value = 0;

      onElementScroll(undefined, value);
      currentScrollTop = value;
      dispatchEvent(new Event("scroll", { bubbles: true }));
    }
  });

  let elementsToScroll = () => {};
  function setElementsToScroll(elmsToScrollFn) {
    elementsToScroll = elmsToScrollFn;
  }

  function onElementScroll(scrollLeft, scrollTop) {
    if (!elementsToScroll) return;
    const elms = elementsToScroll(document);
    if (!elms || !elms.length) return;

    if (scrollLeft !== undefined) onHorizontalScroll(elms, scrollLeft);
    if (scrollTop !== undefined) onVerticalScroll(elms, scrollTop);
  }

  function onHorizontalScroll(elms, scrollLeft) {
    const delta = currentScrollLeft - scrollLeft;

    elms.slice().forEach((elm) => {
      const {left, right} = elm.getBoundingClientRect();
      elm._setBoundingClientRect({
        left: (left || 0) + delta,
        right: (right || 0) + delta
      });
    });
  }

  function onVerticalScroll(elms, scrollTop) {
    const delta = currentScrollTop - scrollTop;

    elms.slice().forEach((elm) => {
      const {top, bottom} = elm.getBoundingClientRect();
      elm._setBoundingClientRect({
        top: (top || 0) + delta,
        bottom: (bottom || 0) + delta
      });
    });
  }

  if (tagName === "video") {
    element.play = () => {
      return Promise.resolve(undefined);
    };

    element.pause = () => {
      return undefined;
    };

    element.load = () => {
    };

    element.canPlayType = function canPlayType() {
      return "maybe";
    };
  }

  Object.assign(element, EventListeners(element));

  emitter.on("_insert", (...args) => {
    if (element.parentElement) {
      element.parentElement._emitter.emit("_insert", ...args);
    }
  }).on("_attributeChange", (...args) => {
    if (element.parentElement) {
      element.parentElement._emitter.emit("_attributeChange", ...args);
    }
  });

  if (tagName === "form") {
    element.submit = submit;
    element.reset = reset;

    return (eventTarget = addFormFieldProxy(element, _getElement));
  }

  if (tagName === "script") {
    Object.defineProperty(element, "text", {
      enumerable: true,
      get() {
        return $elm.html();
      },
      set(value) {
        return $elm.html(value);
      },
    });
  }

  return element;

  function getFirstChildElement() {
    const firstChild = find("> :first-child");
    if (!firstChild.length) return null;
    return _getElement(firstChild);
  }

  function getLastChildElement() {
    const lastChild = find("> :last-child");
    if (!lastChild.length) return null;
    return _getElement(find("> :last-child"));
  }

  function getFirstChild() {
    const child = $elm.contents().first();
    if (!child || !child[0]) return null;
    return _getElement(child);
  }

  function getLastChild() {
    const child = $elm.contents().last();
    if (!child || !child[0]) return null;
    return _getElement(child);
  }

  function appendChild(childElement) {
    if (childElement instanceof DocumentFragment) {
      insertAdjacentHTML("beforeend", childElement._getContent());
    } else if (childElement.$elm) {
      $elm.append(childElement.$elm);

      if (childElement.$elm[0].tagName === "script") {
        vm.runInNewContext(childElement.innerText, document.window);
      }

      emitter.emit("_insert");
    } else if (childElement.textContent) {
      insertAdjacentHTML("beforeend", getTextMarkup(childElement));
    }
    return childElement;
  }

  function click() {
    if (element.disabled) return;
    const clickEvent = new Event("click", { bubbles: true });

    let changed = false;
    if (element.type === "radio") {
      changed = !element.checked;
      element.checked = true;
    }

    if (element.type === "checkbox") {
      changed = true;
      element.checked = !element.checked;
    }

    dispatchEvent(clickEvent);

    if (!clickEvent.defaultPrevented && element.form) {
      if (changed) {
        dispatchEvent(new Event("change", { bubbles: true }));
      } else if (!element.type || element.type === "submit") {
        const submitEvent = new Event("submit", { bubbles: true });
        submitEvent._submitElement = element;
        element.form.dispatchEvent(submitEvent);
      } else if (element.type === "reset") {
        element.form.reset();
      }
    }
  }

  function focus() {
    if (element.disabled) return;
    const focusEvent = new Event("focus", { bubbles: true });
    dispatchEvent(focusEvent);
  }

  function contains(el) {
    return $elm === el.$elm || $elm.find(el.$elm).length > 0;
  }

  function matches(selector) {
    try {
      return $elm.is(selector);
    } catch (error) {
      throw new DOMException(`Failed to execute 'matches' on 'Element': '${selector}' is not a valid selector.`, "SyntaxError");
    }
  }

  function dispatchEvent(event) {
    if (event.cancelBubble) return;
    event.path.push(eventTarget);
    if (!event.target) {
      event.target = eventTarget;
    }
    emitter.emit(event.type, event);
    if (event.bubbles) {
      if (element.parentElement) return element.parentElement.dispatchEvent(event);

      if (document && document.firstElementChild === element) {
        document.dispatchEvent(event);
      }
    }
  }

  function getAttribute(name) {
    return $elm.attr(name);
  }

  function hasAttribute(name) {
    return $elm.is(`[${name}]`);
  }

  function getProperty(name) {
    return $elm.prop(name);
  }

  function setProperty(name, val) {
    return $elm.prop(name, val);
  }

  function removeChild(child) {
    if ($elm[0].children.indexOf(child.$elm[0]) === -1) {
      throw new DOMException("Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.");
    }

    child.$elm.remove();
    emitter.emit("_insert");
    return child;
  }

  function replaceChild(newChild, oldChild) {
    if (!newChild) {
      throw new DOMException("Failed to execute 'replaceChild' on 'Node': parameter 2 is not of type 'Node'.");
    }
    if (!oldChild) {
      throw new DOMException("Failed to execute 'replaceChild' on 'Node': parameter 2 is not of type 'Node'.");
    }
    if ($elm[0].children.indexOf(oldChild.$elm[0]) === -1) {
      throw new DOMException("Failed to execute 'replaceChild' on 'Node': The node to be replaced is not a child of this node.");
    }

    oldChild.$elm.replaceWith(newChild.nodeType === 3 ? getTextMarkup(newChild) : newChild.outerHTML);

    emitter.emit("_insert");
    return oldChild;
  }

  function remove() {
    $elm.remove();
  }

  function find(selector) {
    return $elm.find(selector);
  }

  function closest(selector) {
    return _getElement($elm.closest(selector));
  }

  function getChildren(selector) {
    if (!$elm) return [];
    return $elm.children(selector).map(toElement).toArray();
  }

  function getChildNodes() {
    return $elm.contents().map(toElement).toArray();
  }

  function insertAdjacentHTML(position, markup) {
    switch (position) {
      case "beforebegin":
        $elm.before(markup);
        if (element.parentElement) element.parentElement._emitter.emit("_insert");
        break;
      case "afterbegin":
        $elm.prepend(markup);
        emitter.emit("_insert");
        break;
      case "beforeend":
        $elm.append(markup);
        emitter.emit("_insert");
        break;
      case "afterend":
        $elm.after(markup);
        if (element.parentElement) element.parentElement._emitter.emit("_insert");
        break;
      default:
        throw new DOMException(`Failed to execute 'insertAdjacentHTML' on 'Element': The value provided (${position}) is not one of 'beforeBegin', 'afterBegin', 'beforeEnd', or 'afterEnd'.`);
    }
  }

  function insertBefore(newNode, referenceNode) {
    if (referenceNode === null) {
      element.appendChild(newNode);
      return newNode;
    }

    if (newNode.$elm) {
      if (referenceNode.parentElement !== element) {
        throw new DOMException("Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.");
      }
      newNode.$elm.insertBefore(referenceNode.$elm);
      emitter.emit("_insert");
      return newNode;
    }

    if (newNode.textContent) {
      referenceNode.$elm.before(getTextMarkup(newNode));
      emitter.emit("_insert");
      return newNode;
    }
  }

  function setBoundingClientRect(axes) {
    if (!("bottom" in axes)) {
      axes.bottom = axes.top;
    }

    for (const axis in axes) {
      if (axes.hasOwnProperty(axis)) {
        rects[axis] = axes[axis];
      }
    }

    rects.height = rects.bottom - rects.top;
    rects.width = rects.right - rects.left;

    return rects;
  }

  function getBoundingClientRect() {
    return rects;
  }

  function setAttribute(name, val) {
    $elm.attr(name, val);
    emitter.emit("_attributeChange", name, element);
  }

  function removeAttribute(name) {
    $elm.removeAttr(name);
  }

  function requestFullscreen() {
    const fullscreenchangeEvent = new Event("fullscreenchange", { bubbles: true });
    fullscreenchangeEvent.target = element;

    document.dispatchEvent(fullscreenchangeEvent);
  }

  function cloneNode(deep) {
    const $clone = $elm.clone();
    if (!deep) {
      $clone.empty();
    }
    return _getElement($clone);
  }

  function radioButtonChecked(value) {
    uncheckRadioButtons();
    setAttribute("checked", value);
  }

  function checkboxChecked(value) {
    setProperty("checked", value);
  }

  function uncheckRadioButtons() {
    if ($elm.attr("type") !== "radio") return;

    const name = $elm.attr("name");

    const $form = $elm.closest("form");
    if ($form && $form.length) {
      return $form.find(`input[type="radio"][name="${name}"]`).removeAttr("checked");
    }

    $(`input[type="radio"][name="${name}"]`).removeAttr("checked");
  }

  function toElement(idx, elm) {
    return _getElement($(elm));
  }

  function submit() {
    dispatchEvent(new Event("submit", { bubbles: true }));
  }

  function reset() {
    const $inputs = find("input[type='checkbox']");
    if ($inputs.length) {
      $inputs.each((idx, elm) => {
        $(elm).prop("checked", !!$(elm).attr("checked"));
      });
    }

    const $options = find("option");
    if ($options.length) {
      $options.each((idx, elm) => {
        $(elm).prop("selected", !!$(elm).attr("selected"));
      });
    }

    dispatchEvent(new Event("reset", { bubbles: true }));
  }

  function getClassList() {
    if (!$elm.attr) return;

    const classListApi = {
      contains(className) {
        return $elm.hasClass(className);
      },
      add(...classNames) {
        $elm.addClass(classNames.join(" "));
        emitter.emit("_classadded", ...classNames);
        emitter.emit("_attributeChange", "class", element);
      },
      remove(...classNames) {
        $elm.removeClass(classNames.join(" "));
        emitter.emit("_classremoved", ...classNames);
        emitter.emit("_attributeChange", "class", element);
      },
      toggle(className, force) {
        const hasClass = $elm.hasClass(className);

        if (force === undefined) {
          const methodName = this.contains(className) ? "remove" : "add";
          this[methodName](className);
          return !hasClass;
        }

        if (force) {
          this.add(className);
        } else {
          this.remove(className);
        }
        return !hasClass;
      }
    };

    Object.defineProperty(classListApi, "_classes", {
      get: getClassArray
    });

    return classListApi;

    function getClassArray() {
      return ($elm.attr("class") || "").split(" ");
    }
  }

  function getStyle() {
    const elementStyle = getAttribute("style") || "";
    const prefixNamePattern = /^(-?)(moz|ms|webkit)([A-Z]|\1)/;

    const Style = {};
    if (elementStyle) {
      elementStyle.replace(/\s*(.+?):\s*(.*?)(;|$)/g, (_, name, value) => {
        let ccName = name.replace(prefixNamePattern, (__, isPrefix, prefix, suffix) => {
          return prefix + suffix;
        });
        ccName = ccName.replace(/-(\w)(\w+)/g, (__, firstLetter, rest) => `${firstLetter.toUpperCase()}${rest}`);
        Style[ccName] = value;
      });
    }

    Object.defineProperty(Style, "removeProperty", {
      enumerable: false,
      value: removeProperty
    });

    const StyleHandler = {
      set: (target, name, value) => {
        if (!name) return false;
        target[name] = handleResetValue(value);
        setStyle();
        return true;
      },
      deleteProperty: (target, name) => {
        if (!name) return false;
        delete target[name];
        setStyle();
        return true;
      }
    };

    return new Proxy(Style, StyleHandler);

    function removeProperty(name) {
      delete Style[name];
      setStyle();
    }

    function setStyle() {
      const keys = Object.keys(Style);
      if (!keys.length) return removeAttribute("style");
      const styleValue = keys.reduce((result, name) => {
        const value = Style[name];
        if (value === undefined || value === "") return result;

        let kcName = name.replace(prefixNamePattern, (__, isPrefix, prefix, suffix) => {
          return `-${prefix}${suffix}`;
        });

        kcName = kcName.replace(/([A-Z])([a-z]+)/g, (__, firstLetter, rest) => `-${firstLetter.toLowerCase()}${rest}`);

        result += `${kcName}: ${value};`;
        return result;
      }, "");

      if (!styleValue) return removeAttribute("style");
      setAttribute("style", styleValue);
    }

    function handleResetValue(value) {
      if (value === "" || value === null) return "";
      return value;
    }
  }
}

function Dataset($elm) {
  if (!$elm || !$elm[0]) return;
  return makeProxy(get());

  function get() {
    if (!$elm[0].attribs) return {};
    const {attribs} = $elm[0];
    return Object.keys(attribs).reduce((acc, key) => {
      if (key.startsWith("data-")) {
        acc[key.replace(/^data-/, "").replace(/-(\w)/g, (a, b) => b.toUpperCase())] = attribs[key];
      }
      return acc;
    }, {});
  }

  function makeProxy(attributes = {}) {
    return new Proxy(attributes, {
      set: setDataset
    });
  }

  function setDataset(_, prop, value) {
    if (!$elm || !$elm[0] || !$elm[0].attribs) return false;
    const key = prop.replace(/[A-Z]/g, (g) => `-${g[0].toLowerCase()}`);
    $elm.attr(`data-${key}`, value);
    return true;
  }
}

function EventListeners(element) {
  const listeners = [];
  return {
    addEventListener,
    removeEventListener
  };

  function addEventListener(name, fn, options) {
    const config = [name, fn, usesCapture(options), boundFn];
    const existingListenerIndex = getExistingIndex(...config);
    if (existingListenerIndex !== -1) return;

    listeners.push(config);
    element._emitter.on(name, boundFn);

    function boundFn(...args) {
      fn.apply(element, args);

      if (options && options.once) {
        removeEventListener(name, fn);
      }
    }
  }

  function removeEventListener(name, fn, options) {
    const existingListenerIndex = getExistingIndex(name, fn, usesCapture(options));
    if (existingListenerIndex === -1) return;

    const existingListener = listeners[existingListenerIndex];
    const boundFn = existingListener[3];

    element._emitter.removeListener(name, boundFn);
    listeners.splice(existingListenerIndex, 1);
  }

  function usesCapture(options) {
    if (typeof options === "object") {
      return !!options.capture;
    }

    return !!options;
  }

  function getExistingIndex(...config) {
    return listeners.findIndex((listener) => {
      return listener[0] === config[0]
        && listener[1] === config[1]
        && listener[2] === config[2];
    });
  }
}

function Text(document, $elm) {
  const nodeType = $elm[0].nodeType;
  const node = {
    $elm,
  };

  Object.setPrototypeOf(node, Text.prototype);

  Object.defineProperty(node, "ownerDocument", {
    get() {
      return document;
    },
  });

  Object.defineProperty(node, "textContent", {
    enumerable: true,
    set(value) {
      $elm[0].data = value;
      return value;
    },
    get() {
      return $elm[0].data;
    },
  });

  Object.defineProperty(node, "nodeType", {
    enumerable: true,
    set() {},
    get() {
      return nodeType;
    },
  });

  Object.defineProperty(node, "nodeName", {
    get() {
      return "#text";
    },
    set(value) {
      return value;
    }
  });

  Object.defineProperty(node, "nodeValue", {
    enumerable: true,
    set(value) {
      $elm[0].data = value;
      return value;
    },
    get() {
      return node.textContent;
    }
  });

  return node;
}

function addFormFieldProxy(element, _getElement) {
  const nameHandler = {
    has(target, prop) {
      if (prop in target) return true;
      const result = Object.getOwnPropertyDescriptor(target, prop);
      if (result) return true;
      return !!element.$elm.find(`[name="${prop}"]`).length;
    },
    get(target, prop) {
      if (typeof prop === "symbol") return target[prop];
      const value = target[prop];
      if (value !== undefined) return value;

      const namedElement = element.$elm.find(`[name="${prop}"]`).eq(0);
      if (!namedElement) return;

      if (namedElement.attr("type") === "radio") return new RadioNodeList(element, `[name="${prop}"]`);
      return _getElement(element.$elm.find(`[name="${prop}"]`).eq(0));
    }
  };

  return new Proxy(element, nameHandler);
}

function getTextMarkup({nodeType, textContent}) {
  if (nodeType === 8) return `<!--${textContent}-->`;
  return textContent;
}

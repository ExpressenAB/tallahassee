"use strict";

const Element = require("./Element");
const getLocation = require("./getLocation");
const Navigator = require("./Navigator");
const url = require("url");
const {atob, btoa} = require("./atobtoa");
const {Event, CustomEvent} = require("./Events");
const {EventEmitter} = require("events");
const {performance} = require("perf_hooks");
const MediaQueryList = require("./MediaQueryList");

module.exports = function Window(resp, windowObjects = {console}, userAgent) {
  const emitter = new EventEmitter();
  const navigator = Navigator(userAgent);
  const location = windowObjects.location || getLocation(resp.url);
  location.replace = replaceLocation;

  let pageXOffset = 0;
  let pageYOffset = 0;
  const innerWidth = 760, innerHeight = 760;

  const window = {
    _resize: resizeWindow,
    addEventListener,
    dispatchEvent,
    matchMedia: (...args) => MediaQueryList.call(window, ...args),
    history: {
      replaceState
    },
    innerHeight,
    innerWidth,
    location,
    navigator,
    removeEventListener,
    scroll,
    requestAnimationFrame: (callback) => {
      callback(performance.now());
      return 0;
    },
    cancelAnimationFrame: () => {},
    get window() {
      return this;
    },
    Element,
    Event,
    CustomEvent,
    atob,
    btoa,
    ...windowObjects,
  };

  Object.defineProperty(window, "pageXOffset", {
    get: () => pageXOffset
  });

  Object.defineProperty(window, "pageYOffset", {
    get: () => pageYOffset
  });

  Object.defineProperty(window, "self", {
    get: () => window
  });

  Object.defineProperty(window, "location", {
    get: () => location,
    set: replaceLocation,
  });

  function replaceLocation(newUri) {
    const previousHref = location.href;
    let newLocation = getLocation(newUri);

    if (!newLocation.host) {
      newLocation = getLocation(url.resolve(previousHref, newUri));
    }

    if (previousHref + newLocation.hash !== newLocation.href) {
      emitter.emit("unload");
    }

    Object.assign(location, newLocation, {replace: replaceLocation});
    return location;
  }

  return window;

  function addEventListener(...args) {
    emitter.on(...args);
  }

  function dispatchEvent(event, ...args) {
    if (event === undefined) throw new TypeError("Failed to execute 'dispatchEvent' on 'EventTarget': 1 argument required, but only 0 present.");
    if (typeof event === "string") {
      return emitter.emit(event, ...args);
    }

    if (!event.type) return;
    return emitter.emit(event.type, event);
  }

  function removeEventListener(...args) {
    emitter.removeListener(...args);
  }

  function replaceState(ign1, ign2, relativeUrl) {
    const newUrl = url.parse(relativeUrl);
    location.path = newUrl.path;
    location.pathname = newUrl.pathname;
    location.search = newUrl.search;
    location.href = url.format(location);
  }

  function scroll(xCoord, yCoord) {
    if (xCoord && typeof xCoord === "object") {
      const {top, left} = xCoord;
      pageYOffset = !isNaN(top) ? top : pageYOffset;
      pageXOffset = !isNaN(left) ? left : pageXOffset;
    } else {
      if (xCoord !== undefined) pageXOffset = xCoord;
      if (yCoord !== undefined) pageYOffset = yCoord;
    }
    dispatchEvent(new Event("scroll"));
  }

  function resizeWindow(newInnerWidth, newInnerHeight) {
    if (newInnerWidth !== undefined) {
      window.innerWidth = newInnerWidth;
    }
    if (newInnerHeight !== undefined) {
      window.innerHeight = newInnerHeight;
    }
    window.dispatchEvent(new Event("resize"));
  }
};

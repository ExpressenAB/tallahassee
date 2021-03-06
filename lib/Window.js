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
  let location = windowObjects.location || getLocation(resp.url);

  let pageXOffset = 0;
  let pageYOffset = 0;
  const innerWidth = 760, innerHeight = 760;

  let historyStates = [Object.assign({}, location)];
  let currentHistoryState = 0;

  const window = {
    _resize: resizeWindow,
    addEventListener,
    dispatchEvent,
    matchMedia: (...args) => MediaQueryList.call(window, ...args),
    history: {
      back,
      forward,
      go,
      pushState,
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
    set(value) {
      const previousHref = location.href;
      let newLocation = getLocation(value);

      if (!newLocation.host) {
        newLocation = getLocation(url.resolve(previousHref, value));
      }

      if (previousHref + newLocation.hash !== newLocation.href) {
        emitter.emit("unload");
      }

      location = newLocation;
    }
  });

  return window;

  function addEventListener(...args) {
    emitter.on(...args);
  }

  function back() {
    go(-1);
  }

  function dispatchEvent(event, ...args) {
    if (event === undefined) throw new TypeError("Failed to execute 'dispatchEvent' on 'EventTarget': 1 argument required, but only 0 present.");
    if (typeof event === "string") {
      return emitter.emit(event, ...args);
    }

    if (!event.type) return;
    return emitter.emit(event.type, event);
  }

  function forward() {
    go(1);
  }

  function go(delta) {
    if (delta === 0) return;
    // It should not be possible to go back to a state before the first one
    if (delta < 0 && Math.abs(delta) > currentHistoryState) return;
    // It should not be possible to go to a state that is beyond the stored states
    if (delta > 0 && delta >= historyStates.length - currentHistoryState) return;
    const newState = historyStates[currentHistoryState + delta];
    location.path = newState.path;
    location.pathname = newState.pathname;
    location.search = newState.search;
    location.href = url.format(location);
    currentHistoryState += delta;
  }

  function pushState(ign1, ign2, relativeUrl) {
    const newUrl = url.parse(relativeUrl);
    location.path = newUrl.path;
    location.pathname = newUrl.pathname;
    location.search = newUrl.search;
    location.href = url.format(location);
    currentHistoryState++;
    historyStates = historyStates.slice(0, currentHistoryState);
    historyStates.push(Object.assign({}, location));
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
    dispatchEvent("scroll");
  }

  function resizeWindow(newInnerWidth, newInnerHeight) {
    if (newInnerWidth !== undefined) {
      window.innerWidth = newInnerWidth;
    }
    if (newInnerHeight !== undefined) {
      window.innerHeight = newInnerHeight;
    }
    window.dispatchEvent("resize");
  }
};

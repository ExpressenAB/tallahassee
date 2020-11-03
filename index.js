"use strict";

const assert = require("assert");
const getLocation = require("./lib/getLocation");
const Fetch = require("./lib/Fetch");
const makeAbsolute = require("./lib/makeAbsolute");
const NodeFetch = require("node-fetch");
const querystring = require("querystring");
const supertest = require("supertest");
const url = require("url");
const vm = require("vm");
const {version} = require("./package.json");
const {CookieAccessInfo, Cookie} = require("cookiejar");
const {Document, Window} = require("./lib");
const {normalizeHeaders, getLocationHost} = require("./lib/getHeaders");

module.exports = Tallahassee;

function Tallahassee(app, options = {}) {
  const agent = supertest.agent(app);
  const defaultHeaders = normalizeHeaders(options.headers);
  return {
    jar: agent.jar,
    navigateTo,
  };

  function navigateTo(linkUrl, headers = {}, statusCode = 200) {
    const requestHeaders = {
      ...defaultHeaders,
      ...normalizeHeaders(headers),
    };

    if (requestHeaders["set-cookie"]) {
      const setCookies = requestHeaders["set-cookie"];
      saveToJar(setCookies);
      requestHeaders["set-cookie"] = undefined;
    }

    const webPage = WebPage(agent, requestHeaders, agent.jar);
    return webPage.load(linkUrl, requestHeaders, statusCode);
  }

  function WebPage(origin, originRequestHeaders, jar) {
    const originHost = getLocationHost(originRequestHeaders);
    const protocol = `${originRequestHeaders["x-forwarded-proto"] || "http"}:`;

    let userAgent = `Tallahassee/${version}`;
    const referrer = originRequestHeaders.referer;
    const page = {
      originHost,
      load,
      fetch,
    };

    return page;

    function load(uri, headers, statusCode = 200) {
      const requestHeaders = normalizeHeaders(headers);
      if (requestHeaders["user-agent"]) userAgent = requestHeaders["user-agent"];

      if (requestHeaders.cookie) {
        const publicHost = getLocationHost(requestHeaders);
        const parsedUri = url.parse(uri);
        const cookieDomain = parsedUri.hostname || publicHost || originHost || "127.0.0.1";
        const isSecure = (parsedUri.protocol || protocol) === "https:";

        agent.jar.setCookies(requestHeaders.cookie.split(";").map((c) => c.trim()).filter(Boolean), cookieDomain, "/", isSecure);
      }

      return fetch(uri, {
        method: "GET",
        headers: requestHeaders,
      }).then((resp) => {
        assert.equal(resp.status, statusCode, `Unexepected status code. Expected: ${statusCode}. Actual: ${resp.statusCode}`);
        assert(resp.headers.get("content-type").match(/text\/html/i), `Unexepected content type. Expected: text/html. Actual: ${resp.headers["content-type"]}`);
        return resp;
      }).then(loadDOMContent);
    }

    function fetch(uri, requestOptions = {}) {
      let numRedirects = 0;
      return makeRequest(uri, requestOptions).then(handleResponse);

      function handleResponse(res) {
        const setCookieHeader = res.headers.get("set-cookie");
        if (setCookieHeader) {
          const cookieDomain = url.parse(res.url).hostname;
          saveToJar(setCookieHeader, cookieDomain);
        }

        if (res.status > 300 && res.status < 309 && requestOptions.redirect !== "manual") {
          numRedirects++;
          if (numRedirects > 20) {
            throw new Error("Too many redirects");
          }
          const location = res.headers.get("location");
          const redirectOptions = {...requestOptions};

          if (res.status === 307 || res.status === 308) {
            // NO-OP
          } else {
            redirectOptions.method = "GET";
            redirectOptions.body = undefined;
          }

          return makeRequest(location, redirectOptions).then(handleResponse);
        }

        return res;
      }
    }

    async function loadDOMContent(resp) {
      const location = getLocation(resp.url);

      let pending, currentPageXOffset, currentPageYOffset;
      let elementsToScroll = () => {};
      const stickedElements = [];

      const text = await resp.text();

      const document = Document({
        text,
        location,
        referrer,
      }, agent.jar);
      const window = Window(resp, {
        location,
        fetch: Fetch(fetch),
        get document() {
          return document;
        },
      }, userAgent);

      Object.defineProperty(document, "window", {
        get() {
          return window;
        }
      });

      const browserContext = {
        $: document.$,
        jar,
        document,
        focus,
        focusIframe,
        navigateTo: navigateAway,
        runScript,
        runScripts,
        setElementsToScroll,
        scrollToBottomOfElement,
        scrollToTopOfElement,
        stickElementToTop,
        unstickElementFromTop,
        window,
        response: resp
      };

      Object.defineProperty(browserContext, "_pending", {
        get: () => pending
      });

      currentPageXOffset = window.pageXOffset;
      currentPageYOffset = window.pageYOffset;

      document.addEventListener("submit", onDocumentSubmit);
      window.addEventListener("scroll", onWindowScroll);

      focus();

      return browserContext;

      function navigateAway(...args) {
        return load(...args);
      }

      function focus() {
      }

      function onDocumentSubmit(event) {
        if (event.target.tagName === "FORM") {
          pending = new Promise((resolve) => {
            process.nextTick(navigate, resolve);
          });
        }

        function navigate(resolve) {
          if (event.defaultPrevented) return resolve();

          const form = event.target;
          const method = form.getAttribute("method") || "GET";
          const formaction = (event._submitElement && event._submitElement.getAttribute("formaction")) || form.getAttribute("action");
          const action = formaction || window.location.pathname + (window.location.search ? window.location.search : "");

          const formData = getFormData(form, event._submitElement);

          if (method.toUpperCase() === "GET") {
            const p = url.parse(action, true);
            Object.assign(p.query, formData);

            const navigation = fetch(url.format(p)).then(loadDOMContent);
            resolve(navigation);
          } else if (method.toUpperCase() === "POST") {
            const navigation = fetch(action, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: querystring.stringify(formData),
            }).then(loadDOMContent);
            resolve(navigation);
          }
        }
      }

      function runScript(script) {
        const $script = script.$elm;

        const scriptType = $script.attr("type");
        if (scriptType && !/javascript/i.test(scriptType)) return;

        const scriptBody = $script.html();
        if (scriptBody) vm.runInNewContext(scriptBody, window);
      }

      function runScripts(context) {
        context = context || document.documentElement;

        context.$elm.find("script").each((idx, elm) => {
          const script = document._getElement(document.$(elm));

          runScript(script);
        });
      }

      function setElementsToScroll(elmsToScrollFn) {
        elementsToScroll = elmsToScrollFn;
      }

      function onWindowScroll() {
        if (!elementsToScroll) return;
        const elms = elementsToScroll(document);
        if (!elms || !elms.length) return;

        const {pageXOffset, pageYOffset} = window;
        const deltaX = currentPageXOffset - pageXOffset;
        const deltaY = currentPageYOffset - pageYOffset;

        for (const elm of elms) {
          if (isElementSticky(elm)) continue;
          const {left, right, top, bottom} = elm.getBoundingClientRect();
          elm._setBoundingClientRect({
            left: (left || 0) + deltaX,
            right: (right || 0) + deltaX,
            top: (top || 0) + deltaY,
            bottom: (bottom || 0) + deltaY,
          });
        }

        currentPageXOffset = pageXOffset;
        currentPageYOffset = pageYOffset;
      }

      function scrollToTopOfElement(element, offset = 0) {
        if (isElementSticky(element)) throw new Error("Cannot scroll to sticky element");

        const {top} = element.getBoundingClientRect();

        const pageYOffset = window.pageYOffset;
        let newYOffset = pageYOffset + top - offset;
        if (newYOffset < 0) newYOffset = 0;

        window.scroll(window.pageXOffset, newYOffset);
      }

      function scrollToBottomOfElement(element, offset = 0) {
        if (isElementSticky(element)) throw new Error("Cannot scroll to sticky element");
        const {height} = element.getBoundingClientRect();
        const offsetFromBottom = window.innerHeight - height;
        return scrollToTopOfElement(element, offsetFromBottom + offset);
      }

      function stickElementToTop(element) {
        if (isElementSticky(element)) return;

        const {top, height} = element.getBoundingClientRect();
        element._tallahasseePositionBeforeSticky = window.pageYOffset + top;
        element._setBoundingClientRect({
          top: 0,
          bottom: (height || 0)
        });
        stickedElements.push(element);
      }

      function unstickElementFromTop(element) {
        const idx = stickedElements.indexOf(element);
        if (idx < 0) return;
        stickedElements.splice(idx, 1);
        const top = element._tallahasseePositionBeforeSticky - window.pageYOffset;
        const {height} = element.getBoundingClientRect();
        element._setBoundingClientRect({
          top: top,
          bottom: height ? top + height : top
        });
        element._tallahasseePositionBeforeSticky = undefined;
      }

      function isElementSticky(element) {
        return stickedElements.indexOf(element) > -1;
      }

      async function focusIframe(element, src) {
        if (!element) return;
        if (!element.tagName === "IFRAME") return;

        src = src || element.src;

        const srcUrl = makeAbsolute(browserContext.window.location, src);
        const parsedUrl = url.parse(srcUrl);
        const srcUri = parsedUrl.hostname === browserContext.window.location.hostname ? element.getAttribute("src") : srcUrl;

        const iframeScope = await load(srcUri);

        if (iframeScope.window.location.hostname === browserContext.window.location.hostname) {
          iframeScope.window.frameElement = element;
          iframeScope.window.top = browserContext.window;
        } else {
          iframeScope.window.top = getLockedWindow(iframeScope.window.location.href);
        }

        return iframeScope;
      }

      function getLockedWindow(frameSrc) {
        const lockedWindow = {};
        const frameOrigin = url.parse(frameSrc);

        lockedWindow.location = new Proxy({}, {
          set: unauth,
          get: unauth,
          deleteProperty: unauth
        });

        return lockedWindow;

        function unauth() {
          throw new Error(`Blocked a frame with origin "${frameOrigin.protocol}//${frameOrigin.host}" from accessing a cross-origin frame.`);
        }
      }
    }

    function makeRequest(uri, requestOptions = {method: "GET", headers: {}}) {
      const parsedUri = url.parse(uri);
      let headers = requestOptions.headers = normalizeHeaders(requestOptions.headers);
      const isLocal = isLocalResource();
      if (isLocal) {
        headers = requestOptions.headers = {...originRequestHeaders, ...headers};
      } else {
        headers.host = parsedUri.host;
      }

      const publicHost = getLocationHost(headers);
      const cookieDomain = parsedUri.hostname || publicHost || originHost || "127.0.0.1";
      const isSecure = (parsedUri.protocol || protocol) === "https:";
      const accessInfo = CookieAccessInfo(cookieDomain, parsedUri.pathname, isSecure);

      const cookieValue = jar.getCookies(accessInfo).toValueString();
      if (cookieValue) headers.cookie = cookieValue;

      return isLocal ? originRequest(parsedUri.path, requestOptions) : NodeFetch(uri, {...requestOptions, redirect: "manual"});

      function isLocalResource() {
        if (uri.startsWith("/")) return true;
        return parsedUri.hostname === originHost;
      }
    }

    function originRequest(uri, requestOptions) {
      let req;
      if (requestOptions.method === "POST") {
        req = agent.post(uri).send(requestOptions.body);
      } else if (requestOptions.method === "HEAD") {
        req = agent.head(uri);
      } else {
        req = agent.get(uri);
      }

      if (requestOptions.headers) {
        for (const header in requestOptions.headers) {
          const headerValue = requestOptions.headers[header];
          if (headerValue) req.set(header, requestOptions.headers[header]);
        }
      }

      return req.then((res) => {
        const statusCode = res.statusCode;
        return {
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          url: normalizeUri(),
          headers: new Map(Object.entries(res.headers)),
          text() {
            return Promise.resolve(res.text);
          },
          json() {
            return Promise.resolve(res.body);
          },
        };

        function normalizeUri() {
          if (originHost) return `${protocol}//${originHost}${uri}`;
          return res.request.url;
        }
      });
    }
  }

  function saveToJar(cookieList, cookieDomain) {
    if (!cookieList) return;
    if (!Array.isArray(cookieList)) cookieList = cookieList.split(",").filter(Boolean);

    for (const cookieStr of cookieList) {
      const cookie = Cookie(cookieStr.trim());
      if (!cookie.domain) cookie.domain = cookieDomain;
      agent.jar.setCookie(cookie);
    }
  }
}

function getFormData(form, submitElement) {
  const inputs = form.elements;

  const payload = inputs.reduce((acc, input) => {
    if (input.disabled) return acc;

    if (input.name && input.value) {
      if (input.type === "radio" || input.type === "checkbox") {
        if (input.checked) {
          acc[input.name] = acc[input.name] || [];
          acc[input.name].push(input.value);
        }
      } else if (input.tagName === "SELECT") {
        const selected = input.selectedOptions;

        if (selected.length === 1) {
          acc[input.name] = selected[0].value;
        } else if (selected.length > 1) {
          acc[input.name] = selected.map((option) => option.getAttribute("value"));
        }
      } else {
        acc[input.name] = input.value;
      }
    }
    return acc;
  }, {});

  if (submitElement && submitElement.name) {
    payload[submitElement.name] = submitElement.value;
  }

  return payload;
}

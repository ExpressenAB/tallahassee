"use strict";

const app = require("../app/app");
const Browser = require("../");
const nock = require("nock");
const Path = require("path");
const Script = require("@bonniernews/wichita");

describe("Tallahassee", () => {
  describe("navigateTo()", () => {
    it("navigates to url", async () => {
      await Browser(app).navigateTo("/");
    });

    it("returns browser window", async () => {
      const browser = await Browser(app).navigateTo("/");
      expect(browser.window).to.be.ok;
    });

    it("sets browser window location", async () => {
      const browser = await Browser(app).navigateTo("/", {
        Host: "www.expressen.se",
        "x-forwarded-proto": "https"
      });
      expect(browser.window).to.be.ok;
      expect(browser.window.location.protocol).to.equal("https:");
      expect(browser.window.location.host).to.equal("www.expressen.se");
    });

    it("exposes http response", async () => {
      const browser = await Browser(app).navigateTo("/");
      expect(browser.response).to.be.ok;
      expect(browser.response).to.have.property("status", 200);
      expect(browser.response).to.have.property("headers");
      expect(browser.response.headers.get("content-type")).to.equal("text/html; charset=UTF-8");
    });

    it("throws if not 200", async () => {
      try {
        await Browser(app).navigateTo("/404");
      } catch (e) {
        var err = e; // eslint-disable-line no-var
      }
      expect(err).to.be.ok;
    });

    it("passes along cookies", async () => {
      const browser = await Browser(app).navigateTo("/reply-with-cookies", { cookie: "myCookie=singoalla;mySecondCookie=chocolateChip" });
      expect(browser.$("body").text()).to.equal("myCookie=singoalla;mySecondCookie=chocolateChip");
    });

    it("returns browser with navigateTo capability that returns new browser with preserved cookie", async () => {
      const browser = await Browser(app).navigateTo("/", { cookie: "myCookie=singoalla;mySecondCookie=chocolateChip" });

      const newBrowser = await browser.navigateTo("/reply-with-cookies");

      expect(newBrowser.$("body").text()).to.equal("myCookie=singoalla;mySecondCookie=chocolateChip");
    });

    it("follows redirects", async () => {
      const browser = await Browser(app).navigateTo("/redirect");
      expect(browser.response).to.be.ok;
      expect(browser.response).to.have.property("status", 200);
      expect(browser.window.location.pathname).to.equal("/req-info-html");
    });

    it("keeps original request headers when it follows local redirects", async () => {
      const browser = await Browser(app).navigateTo("/redirect", {
        host: "www.expressen.se",
        "x-forwarded-proto": "https"
      });
      expect(browser.response).to.be.ok;
      const reqInfo = JSON.parse(browser.$("body").text());
      expect(reqInfo.reqHeaders).to.have.property("host", "www.expressen.se");
      expect(reqInfo.reqHeaders).to.have.property("x-forwarded-proto", "https");
    });

    it("only sends specified headers when following local redirects", async () => {
      nock("https://www.example.com")
        .get("/")
        .reply(302, "", {
          location: "https://www.expressen.se/req-info-html"
        });
      const browser = await Browser(app).navigateTo("/external-redirect", {
        host: "www.expressen.se",
        "x-forwarded-proto": "https"
      });
      expect(browser.response).to.be.ok;
      const reqInfo = JSON.parse(browser.$("body").text());
      expect(reqInfo.reqHeaders).to.have.property("host", "www.expressen.se");
      expect(reqInfo.reqHeaders).to.have.property("x-forwarded-proto", "https");
    });

    it("handles redirect loops by throwing", (done) => {
      Browser(app).navigateTo("/redirect-loop")
        .catch(() => {
          done();
        });
    });

    it("makes request to local app when the requested host matches host header from browser creation", async () => {
      let browser = await Browser(app, { headers: { host: "www.expressen.se" } }).navigateTo("/");
      browser = await browser.navigateTo("http://www.expressen.se/");
      expect(browser.response).to.be.ok;
    });

    it("makes request to local app when the requested host matches x-forwarded-host from browser creation", async () => {
      let browser = await Browser(app, {
        headers: {
          host: "some-other-host.com",
          "x-forwarded-host": "www.expressen.se"
        }
      }).navigateTo("/");
      browser = await browser.navigateTo("http://www.expressen.se/");
      expect(browser.response).to.be.ok;
    });

    it("makes request to local app when the requested host matches x-forwarded-host and protocol matches x-forwarded-proto from browser creation", async () => {
      let browser = await Browser(app, {
        headers: {
          host: "some-other-host.com",
          "x-forwarded-host": "www.expressen.se",
          "x-forwarded-proto": "https"
        }
      }).navigateTo("/");
      browser = await browser.navigateTo("https://www.expressen.se/");
      expect(browser.response).to.be.ok;
    });

    it("makes request to local app when the requested host matches x-forwarded-host and protocol matches x-forwarded-proto from navigation", async () => {
      let browser = await Browser(app).navigateTo("/", {
        host: "some-other-host.com",
        "x-forwarded-host": "www.expressen.se",
        "x-forwarded-proto": "https"
      });
      browser = await browser.navigateTo("https://www.expressen.se/");
      expect(browser.response).to.be.ok;
    });

    it("passes cookie if host is specified", async () => {
      const browser = await Browser(app).navigateTo("/reply-with-cookies", {
        host: "www.expressen.se",
        cookie: "myCookie=singoalla;mySecondCookie=chocolateChip",
      });
      expect(browser.$("body").text()).to.equal("myCookie=singoalla;mySecondCookie=chocolateChip");
    });

    it("passes cookie if options.host is specified", async () => {
      const browser = await Browser(app, {
        headers: {
          host: "www.expressen.se",
        }
      }).navigateTo("/reply-with-cookies", {cookie: "myCookie=singoalla;mySecondCookie=chocolateChip"});
      expect(browser.$("body").text()).to.equal("myCookie=singoalla;mySecondCookie=chocolateChip");
    });

    it("passes cookie if options.x-forwarded-host is specified", async () => {
      const browser = await Browser(app, {
        headers: {
          host: "some-other-host.com",
          "x-forwarded-host": "www.expressen.se",
        }
      }).navigateTo("/reply-with-cookies", {cookie: "myCookie=singoalla;mySecondCookie=chocolateChip"});
      expect(browser.$("body").text()).to.equal("myCookie=singoalla;mySecondCookie=chocolateChip");
    });

    it("passes cookie if options.x-forwarded-host is specified", async () => {
      const browser = await Browser(app, {
        headers: {
          host: "some-other-host.com",
          "x-forwarded-host": "www.expressen.se",
        }
      }).navigateTo("/reply-with-cookies", {cookie: "myCookie=singoalla;mySecondCookie=chocolateChip"});
      expect(browser.$("body").text()).to.equal("myCookie=singoalla;mySecondCookie=chocolateChip");
    });
  });

  describe("runScript(scriptElement)", () => {
    let browser;

    beforeEach(async () => {
      browser = await Browser(app).navigateTo("/");
    });

    it("runs supplied script element", () => {
      expect(browser.document.documentElement.classList.contains("no-js")).to.be.true;
      expect(browser.window).to.not.have.property("scriptsAreExecutedInBody");

      const scriptElement = browser.document.getElementsByTagName("script")[0];

      browser.runScript(scriptElement);

      expect(browser.document.documentElement.classList.contains("no-js")).to.be.false;
      expect(browser.window).to.not.have.property("scriptsAreExecutedInBody");
    });

    it("does not run if script type is not JavaScript", () => {
      const scriptElement = browser.document.getElementsByTagName("script")[1];
      const scriptType = scriptElement.$elm.attr("type");

      expect(scriptType).to.be.ok;
      expect(scriptType).to.not.include("javascript");
      browser.runScript(scriptElement);
    });
  });

  describe("runScripts(scopeElement)", () => {
    let browser;

    beforeEach(async () => {
      browser = await Browser(app).navigateTo("/");
    });

    it("runs all scripts without scope element", () => {
      expect(browser.document.documentElement.classList.contains("no-js")).to.be.true;
      expect(browser.window).to.not.have.property("scriptsAreExecutedInBody");

      browser.runScripts();

      expect(browser.document.documentElement.classList.contains("no-js")).to.be.false;
      expect(browser.window).to.have.property("scriptsAreExecutedInBody", true);
    });

    it("runs scripts within supplied scope element", () => {
      expect(browser.document.documentElement.classList.contains("no-js")).to.be.true;
      expect(browser.window).to.not.have.property("scriptsAreExecutedInBody");

      browser.runScripts(browser.document.head);

      expect(browser.document.documentElement.classList.contains("no-js")).to.be.false;
      expect(browser.window).to.not.have.property("scriptsAreExecutedInBody");
    });
  });

  describe("document", () => {
    it("expose current window on document", async () => {
      const browser = await Browser(app).navigateTo("/");
      expect(browser.document).to.have.property("window").that.equal(browser.window);
    });

    it("doesn't expose classList on document", async () => {
      const browser = await Browser(app).navigateTo("/");
      expect(browser.document.classList, "classList on document").to.be.undefined;
    });

    it("sets cookie on document", async () => {
      const browser = await Browser(app).navigateTo("/", {
        cookie: "_ga=12"
      });

      expect(browser.document).to.have.property("cookie", "_ga=12");
    });

    it("sets cookie on document disregarding casing", async () => {
      const browser = await Browser(app).navigateTo("/", {
        CookIe: "_ga=13"
      });

      expect(browser.document).to.have.property("cookie", "_ga=13");
    });

    it("sets multiple cookies on document", async () => {
      const browser = await Browser(app).navigateTo("/", {
        cookie: "cookie1=abc;cookie2=def"
      });

      expect(browser.document).to.have.property("cookie", "cookie1=abc; cookie2=def");
    });

    it("sets multiple cookies on document disregarding whitespace and empty values", async () => {
      const browser = await Browser(app).navigateTo("/", {
        cookie: " cookie1=abc; cookie2=def; ;   ;\tcookie3=ghi;; ;   ;"
      });

      expect(browser.document).to.have.property("cookie", "cookie1=abc; cookie2=def; cookie3=ghi");
    });

    it("sets referer from navigation headers", async () => {
      const browser = await Browser(app).navigateTo("/", {
        referer: "https://www.example.com"
      });

      expect(browser.document).to.have.property("referrer", "https://www.example.com");
    });
  });

  describe("window", () => {
    it("exposes a document property", async () => {
      const browser = await Browser(app).navigateTo("/");

      expect(browser.window.document === browser.document).to.be.true;
    });

    it("exposes navigator property with userAgent from options", async () => {
      const browser = await Browser(app, {
        headers: {
          "User-Agent": "Mozilla 5.0"
        }
      }).navigateTo("/");

      expect(browser.window.navigator).to.be.ok;
      expect(browser.window.navigator).to.have.property("userAgent", "Mozilla 5.0");
    });

    it("exposes navigator property with userAgent from navigateTo headers", async () => {
      const browser = await Browser(app).navigateTo("/", {
        "User-Agent": "Mozilla 5.0"
      });

      expect(browser.window.navigator).to.be.ok;
      expect(browser.window.navigator).to.have.property("userAgent", "Mozilla 5.0");
    });
  });

  describe("run script", () => {
    it("runs es6 script with browser window as global", async () => {
      const browser = await Browser(app).navigateTo("/", {
        Cookie: "_ga=1"
      });
      expect(browser.document.cookie).to.equal("_ga=1");

      const script = Script("../app/assets/scripts/main");

      await script.run(browser.window);

      expect(browser.document.getElementsByClassName("set-by-js").length).to.equal(1);
    });

    it("again", async () => {
      const browser = await Browser(app).navigateTo("/");

      const script = Script("../app/assets/scripts/main");

      await script.run(browser.window);

      expect(browser.document.cookie).to.equal("");
      expect(browser.document.getElementsByClassName("set-by-js").length).to.equal(0);
    });
  });

  describe("submit", () => {
    it("submits get form on click with maintained headers", async () => {
      const browser = await Browser(app).navigateTo("/", {
        host: "www.expressen.se",
        "x-forwarded-proto": "https",
        cookie: "_ga=2",
      });

      const form = browser.document.getElementById("get-form");
      const input = form.getElementsByTagName("input")[0];
      const button = form.getElementsByTagName("button")[0];

      input.name = "q";
      input.value = "12";

      button.click();

      expect(browser._pending).to.be.ok;

      const newNavigation = await browser._pending;

      expect(newNavigation.document.cookie).to.equal("_ga=2");
      expect(newNavigation.window.location).to.have.property("host", "www.expressen.se");
      expect(newNavigation.window.location).to.have.property("protocol", "https:");
      expect(newNavigation.window.location).to.have.property("search", "?q=12");
    });

    it("submits post form on click with maintained headers", async () => {
      const browser = await Browser(app).navigateTo("/", {
        host: "www.expressen.se",
        "x-forwarded-proto": "https",
        cookie: "_ga=2",
        "content-type": "unknown/mime-type"
      });

      const form = browser.document.getElementById("post-form");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      const newBrowser = await browser._pending;

      expect(newBrowser.document.body.innerHTML).to.contain("Post body");

      expect(newBrowser.document.cookie).to.equal("_ga=2");
      expect(newBrowser.window.location).to.have.property("host", "www.expressen.se");
      expect(newBrowser.window.location).to.have.property("protocol", "https:");
    });

    it("submits post form with payload on click", async () => {
      const browser = await Browser(app).navigateTo("/");

      const form = browser.document.getElementById("post-form");
      const input = form.getElementsByTagName("input")[0];
      const button = form.getElementsByTagName("button")[0];

      input.name = "q";
      input.value = "12";

      button.click();

      expect(browser._pending).to.be.ok;

      const newBrowser = await browser._pending;

      expect(newBrowser.document.body.innerHTML).to.contain("{\"q\":\"12\",\"p\":\"text\"}");
    });

    it("submits post form without action to the same route on click", async () => {
      const browser = await Browser(app).navigateTo("/?a=b");

      const form = browser.document.getElementById("post-form-without-action");
      const input = form.getElementsByTagName("input")[0];
      const button = form.getElementsByTagName("button")[0];

      input.name = "q";
      input.value = "12";

      button.click();

      expect(browser._pending).to.be.ok;

      const newBrowser = await browser._pending;

      expect(newBrowser.document.body.innerHTML).to.contain("{\"q\":\"12\"}");
      expect(newBrowser.window.location).to.have.property("search", "?a=b");
    });

    it("submits get form with values from checkboxes", async () => {
      const browser = await Browser(app).navigateTo("/");

      const form = browser.document.getElementById("checkboxes-get-form");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      const newNavigation = await browser._pending;
      expect(newNavigation.window.location).to.have.property("search", "?filter=cb1&filter=cb3");
    });

    it("submits post form with values from checkboxes", async () => {
      const browser = await Browser(app).navigateTo("/");

      const form = browser.document.getElementById("checkboxes-post-form");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      const newNavigation = await browser._pending;
      expect(newNavigation.document.body.innerHTML).to.contain("{\"filter\":[\"cb1\",\"cb3\"]}");
    });

    it("submits post form with values from select inputs", async () => {
      const browser = await Browser(app).navigateTo("/");

      const form = browser.document.getElementById("select-form");
      const button = form.getElementsByTagName("button")[0];

      const selects = form.getElementsByTagName("select");
      const select = selects[0];
      const multipleSelect = selects[1];

      select.options[0].selected = true;
      multipleSelect.options[0].selected = true;
      multipleSelect.options[2].selected = true;

      button.click();

      expect(browser._pending).to.be.ok;

      const newNavigation = await browser._pending;
      expect(newNavigation.document.body.innerHTML).to.contain("{\"single-select\":\"1\",\"multiple-select\":[\"1\",\"3\"]}");
    });

    it("submits empty select input if option value is empty", async () => {
      const browser = await Browser(app).navigateTo("/");

      const form = browser.document.getElementById("select-form");
      const button = form.getElementsByTagName("button")[0];

      const select = form.getElementsByTagName("select")[0];

      select.options[2].selected = true;

      button.click();

      expect(browser._pending).to.be.ok;

      const newNavigation = await browser._pending;
      expect(newNavigation.document.body.innerHTML).to.contain("{\"single-select\":\"\"}");
    });

    it("follows redirect on get", async () => {
      const browser = await Browser(app).navigateTo("/");

      const form = browser.document.getElementById("get-form-redirect");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      const newBrowser = await browser._pending;

      expect(newBrowser.window.location.pathname).to.equal("/req-info-html");
    });

    it("follows redirect on post", async () => {
      const browser = await Browser(app).navigateTo("/");

      const form = browser.document.getElementById("post-form-redirect");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      const newBrowser = await browser._pending;

      expect(newBrowser.window.location.pathname).to.equal("/req-info-html");
    });

    it("follows external redirect on post", async () => {
      nock("https://www.example.com")
        .get("/")
        .matchHeader("host", "www.example.com")
        .reply(200, "<html><body></body></html>", {
          "content-type": "text/html"
        });

      const browser = await Browser(app, {
        headers: {host: "www.expressen.se"}
      }).navigateTo("/");

      const form = browser.document.getElementById("post-form-external-redirect");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      const newBrowser = await browser._pending;

      expect(newBrowser.window.location.href).to.equal("https://www.example.com/");
    });

    it("follows external redirect on post that redirects back to app", async () => {
      const browser = await Browser(app, {
        headers: {host: "www.expressen.se"}
      }).navigateTo("/", );

      nock("https://www.example.com")
        .get("/")
        .reply(302, undefined, {
          location: browser.window.location.href
        });

      const form = browser.document.getElementById("post-form-external-redirect");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      const newBrowser = await browser._pending;

      expect(newBrowser.window.location.host).to.equal("www.expressen.se");
      expect(newBrowser.window.location.pathname).to.equal("/");
    });

    it("follows external url on post", async () => {
      nock("https://www.example.com")
        .post("/blahonga/", "a=b")
        .matchHeader("host", "www.example.com")
        .reply(200, "<html><body></body></html>", {
          "content-type": "text/html"
        });

      const browser = await Browser(app, {
        headers: {host: "www.expressen.se"}
      }).navigateTo("/");

      const form = browser.document.getElementById("post-form-external-direct");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      const newBrowser = await browser._pending;

      expect(newBrowser.window.location.href).to.equal("https://www.example.com/blahonga/");
    });

    it("external site posts", async () => {
      nock("https://www.example.com")
        .post("/blahonga/", "a=b")
        .matchHeader("host", "www.example.com")
        .reply(200, "<html><body><form method='POST' action='http://www.expressen.se'><button type='submit'></button></form></body></html>", {
          "content-type": "text/html"
        });

      let browser = await Browser(app, {
        headers: {host: "www.expressen.se"}
      }).navigateTo("/");

      const form = browser.document.getElementById("post-form-external-direct");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      browser = await browser._pending;

      expect(browser.window.location.href).to.equal("https://www.example.com/blahonga/");

      const newButton = browser.document.getElementsByTagName("button")[0];

      newButton.click();

      browser = await browser._pending;

      expect(browser.window.location.href).to.equal("http://www.expressen.se/");
    });

    it("respects submit formaction", async () => {
      nock("https://www.example.com")
        .get("/")
        .matchHeader("host", "www.example.com")
        .reply(200, "<html><body><form method='POST' action='http://www.expressen.se'><button type='submit'></button></form></body></html>", {
          "content-type": "text/html"
        });

      let browser = await Browser(app, {
        headers: {host: "www.expressen.se"}
      }).navigateTo("/");

      const form = browser.document.getElementById("multi-submit-form");
      const button = form.getElementsByTagName("button")[1];

      button.click();

      browser = await browser._pending;

      expect(browser.window.location.href).to.equal("https://www.example.com/");
    });

    it("named submit element appear in payload empty value", async () => {
      nock("https://www.example.com")
        .post("/1", (body) => {
          expect(body).to.have.property("named-button").that.is.empty;
          return true;
        })
        .matchHeader("host", "www.example.com")
        .reply(200, "<html><body><form method='POST' action='http://www.expressen.se'><button type='submit'></button></form></body></html>", {
          "content-type": "text/html"
        });

      let browser = await Browser(app, {
        headers: {host: "www.expressen.se"}
      }).navigateTo("/");

      const form = browser.document.getElementById("multi-submit-form");
      const button = form.getElementsByTagName("button")[2];

      button.click();

      browser = await browser._pending;

      expect(browser.window.location.href).to.equal("https://www.example.com/1");
    });

    it("named submit element with value send payload with value", async () => {
      nock("https://www.example.com")
        .post("/2", (body) => {
          expect(body).to.have.property("named-button-with-value").that.equal("1");
          return true;
        })
        .matchHeader("host", "www.example.com")
        .reply(200, "<html><body><form method='POST' action='http://www.expressen.se'><button type='submit'></button></form></body></html>", {
          "content-type": "text/html"
        });

      let browser = await Browser(app, {
        headers: {host: "www.expressen.se"}
      }).navigateTo("/");

      const form = browser.document.getElementById("multi-submit-form");
      const button = form.getElementsByTagName("button")[3];

      button.click();

      browser = await browser._pending;

      expect(browser.window.location.href).to.equal("https://www.example.com/2");
    });

    it("submits to local app if absolute form action matches host header", async () => {
      let browser = await Browser(app, {
        headers: {host: "www.expressen.se"}
      }).navigateTo("/");

      const form = browser.document.getElementById("post-form-absolute-url");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      browser = await browser._pending;

      expect(browser.window.location.href).to.equal("http://www.expressen.se/");
    });

    it("submits to local app if absolute form action matches x-forwarded-host header", async () => {
      let browser = await Browser(app, {
        headers: {
          host: "some-other-host.com",
          "x-forwarded-host": "www.expressen.se"
        }
      }).navigateTo("/");

      const form = browser.document.getElementById("post-form-absolute-url");
      const button = form.getElementsByTagName("button")[0];

      button.click();

      expect(browser._pending).to.be.ok;

      browser = await browser._pending;

      expect(browser.window.location.href).to.equal("http://www.expressen.se/");
    });
  });

  describe("focusIframe()", () => {
    it("iframe from same host scopes window and document and sets frameElement and inherits cookie", async () => {
      const browser = await Browser(app).navigateTo("/", {cookie: "_ga=2"});

      const element = browser.document.createElement("iframe");
      element.id = "friendly-frame";
      element.src = "/friendly/";
      browser.document.body.appendChild(element);

      const iframe = browser.document.getElementById("friendly-frame");
      const iframeScope = await browser.focusIframe(iframe);

      expect(iframeScope.window === browser.window, "scoped window").to.be.false;
      expect(iframeScope.window.top === browser.window, "window.top").to.be.true;
      expect(iframeScope.document === browser.document, "scoped document").to.be.false;
      expect(iframeScope.document.cookie, "scoped document cookie").to.equal("_ga=2");
      expect(iframeScope.window.frameElement === iframe, "window.frameElement property").to.be.true;
    });

    it("iframe from other host scopes window and document", async () => {
      nock("http://example.com")
        .get("/framed-content")
        .replyWithFile(200, Path.join(__dirname, "../app/assets/public/index.html"), {
          "Content-Type": "text/html"
        });

      const browser = await Browser(app).navigateTo("/", {
        cookie: "_ga=2"
      });

      const element = browser.document.createElement("iframe");
      element.id = "iframe";
      element.src = "//example.com/framed-content";
      browser.document.body.appendChild(element);

      const iframe = browser.document.getElementById("iframe");
      const iframeScope = await browser.focusIframe(iframe);

      expect(iframeScope.window === browser.window, "scoped window").to.be.false;
      expect(iframeScope.window.top, "window.top").to.be.ok;

      expect(() => iframeScope.window.top.location.pathname).to.throw("Blocked a frame with origin \"http://example.com\" from accessing a cross-origin frame.");

      expect(iframeScope.document === browser.document, "scoped document").to.be.false;
      expect(iframeScope.document.cookie, "scoped document cookie").to.equal("");
      expect(iframeScope.window.frameElement, "window.frameElement property").to.be.undefined;
    });
  });

  describe("non 200 response", () => {
    it("can override expected status code", async () => {
      const browser = await Browser(app).navigateTo("/404", null, 404);
      expect(browser.document.getElementsByTagName("h1")[0].innerText).to.equal("Apocalyptic");
    });

  });
});

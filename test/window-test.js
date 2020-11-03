"use strict";

const getLocation = require("../lib/getLocation");
const {Window, Document} = require("../lib");

describe("Window", () => {
  let window, document;
  beforeEach(() => {
    document = Document({
      url: "https://www.expressen.se/nyheter/article-slug/",
      text: `
        <html>
          <body>
            <h2 id="headline">Test</h2>
            <input type="button"
            <script>var a = 1;</script>
          </body>
        </html>`
    });

    window = Window({
      url: "https://www.expressen.se/nyheter/article-slug/"
    },
    {
      document
    }
    );
  });

  describe("properties", () => {
    it("has Element", () => {
      expect(window).to.have.property("Element");
    });
  });

  describe("history", () => {
    it("has property", () => {
      expect(window).to.have.property("history");
    });

    it("history has replaceState function", () => {
      expect(window.history).to.have.property("replaceState").that.is.a("function");
    });

    it("replaceState() sets new location", () => {
      window.history.replaceState(null, null, "/?a=1");

      expect(window.location).to.have.property("hostname", "www.expressen.se");
      expect(window.location).to.have.property("protocol", "https:");
      expect(window.location).to.have.property("pathname", "/");
      expect(window.location).to.have.property("search", "?a=1");

      window.history.replaceState(null, null, "/nyheter/article-slug-2/");
      expect(window.location).to.have.property("pathname", "/nyheter/article-slug-2/");
      expect(window.location).to.have.property("search").to.be.null;
    });
  });

  describe("requestAnimationFrame", () => {
    it("executes callback with timestamp immediately", () => {
      let called;
      const callback = (timestamp) => {
        called = timestamp;
      };

      window.requestAnimationFrame(callback);

      expect(called).to.be.a("number");
      expect(isNaN(called)).to.be.false;
    });

    it("returns arbitrary number", () => {
      const result = window.requestAnimationFrame(() => {});

      expect(result).to.be.a("number");
      expect(isNaN(result)).to.be.false;
    });
  });

  describe("cancelAnimationFrame", () => {
    it("does nothing", () => {
      const result = window.cancelAnimationFrame();
      expect(result).to.be.undefined;
    });
  });

  describe("navigator", () => {
    it(".userAgent returns Tallahassee by default", () => {
      const wndw = Window({
        headers: new Map(Object.entries({})),
      }, {document});

      expect(wndw.navigator).to.have.property("userAgent", "Tallahassee");
    });

    it(".userAgent is returns User-Agent header", () => {
      const wndw = Window({
        headers: new Map(Object.entries({})),
      }, {document}, "Mozilla/5.0");

      expect(wndw.navigator).to.have.property("userAgent", "Mozilla/5.0");
    });

    it(".userAgent is read only", () => {
      const wndw = Window({
        headers: new Map(Object.entries({})),
        url: "https://www.expressen.se/nyheter/article-slug/"
      }, {document});

      wndw.navigator.userAgent = "Zombie";
      expect(wndw.navigator).to.have.property("userAgent", "Tallahassee");
    });

    it(".geolocation is returns expected api", () => {
      const wndw = Window({
        headers: new Map(Object.entries({})),
        url: "https://www.expressen.se/nyheter/article-slug/"
      }, {document});

      expect(wndw.navigator).to.have.property("geolocation");
      expect(wndw.navigator.geolocation.getCurrentPosition).to.be.a("function");
      expect(wndw.navigator.geolocation.watchPosition).to.be.a("function");
      expect(wndw.navigator.geolocation.clearWatch).to.be.a("function");
    });

    it(".geolocation is read only", () => {
      const wndw = Window({
        headers: new Map(Object.entries({})),
        url: "https://www.expressen.se/nyheter/article-slug/"
      }, {document});

      wndw.navigator.geolocation = () => {};
      expect(wndw.navigator.geolocation.getCurrentPosition).to.be.a("function");
    });
  });

  describe("events ", () => {
    it(".dispatchEvent() emits passed event type as string", (done) => {
      window.addEventListener("test-event", done);
      window.dispatchEvent("test-event");
    });

    it(".dispatchEvent() takes object (Event) with type and emits event with type as name", (done) => {
      window.addEventListener("test-event", (arg) => {
        expect(arg).to.eql({type: "test-event"});
        done();
      });
      window.dispatchEvent({type: "test-event"});
    });

    it(".dispatchEvent() throws if no argument is passed", () => {
      expect(() => {
        window.dispatchEvent();
      }).to.throw(TypeError);
    });

    it("can dispatch window.Event", (done) => {
      window.addEventListener("test-event", (arg) => {
        expect(arg).to.have.property("type", "test-event");
        done();
      });
      window.dispatchEvent(new window.Event("test-event"));
    });
  });

  describe("matchMedia", () => {
    it("should throw with no arguments passed", () => {
      expect(() => window.matchMedia()).to.throw(TypeError);
    });

    it("should return object that matches media type 'screen'", () => {
      window.styleMedia = { type: "screen" };
      const media = window.matchMedia("screen");
      expect(media.media).to.equal("screen");
      expect(media.matches).to.be.true;
    });

    it("should return object that does not match media type 'screen'", () => {
      window.styleMedia = { type: "print" };
      const media = window.matchMedia("screen");
      expect(media.media).to.equal("screen");
      expect(media.matches).to.be.false;
    });

    it("should return object that matches media type 'print'", () => {
      window.styleMedia = { type: "print" };
      const media = window.matchMedia("print");
      expect(media.media).to.equal("print");
      expect(media.matches).to.be.true;
    });

    it("should return object that matches one media condition", () => {
      window.innerWidth = 600;
      const media = window.matchMedia("(min-width: 500px)");
      expect(media.media).to.equal("(min-width: 500px)");
      expect(media.matches).to.be.true;
    });

    it("should return object that does not match one media condition", () => {
      window.innerWidth = 600;
      const media = window.matchMedia("(max-width: 500px)");
      expect(media.media).to.equal("(max-width: 500px)");
      expect(media.matches).to.be.false;
    });

    it("should return object that matches one media type and one media condition", () => {
      window.styleMedia = { type: "screen" };
      window.innerWidth = 500;
      const media = window.matchMedia("screen and (max-width: 500px)");
      expect(media.media).to.equal("screen and (max-width: 500px)");
      expect(media.matches).to.be.true;
    });

    it("should return object that does not match one media type and one media condition", () => {
      window.innerWidth = 600;
      window.styleMedia = { type: "screen" };
      const media = window.matchMedia("screen and (max-width: 500px)");
      expect(media.media).to.equal("screen and (max-width: 500px)");
      expect(media.matches).to.be.false;
    });

    it("executes callback when match changes", () => {
      window.innerWidth = 600;
      const media = window.matchMedia("(max-width: 500px)");
      expect(media.matches).to.be.false;

      const matchUpdates = [];
      const listener = (event) => matchUpdates.push(event.matches);
      media.addListener(listener);

      window._resize(400);
      expect(matchUpdates).to.deep.equal([true]);

      window._resize(300);
      expect(matchUpdates).to.deep.equal([true]);

      window._resize(700);
      expect(matchUpdates).to.deep.equal([true, false]);

      media.removeListener(listener);

      window._resize(400);
      expect(matchUpdates).to.deep.equal([true, false]);
    });
  });

  describe("scroll", () => {
    it("should set x coordinate properly", () => {
      window.scroll(100, 0);
      expect(window.pageXOffset).to.equal(100);
    });

    it("should set y coordinate properly", () => {
      window.scroll(0, 100);
      expect(window.pageYOffset).to.equal(100);
    });

    it("should set y coordinate properly with object parameters and value being 0", () => {
      window.scroll({top: 100});
      expect(window.pageYOffset).to.equal(100);
      window.scroll({top: 0});
      expect(window.pageYOffset).to.equal(0);
    });

    it("should set x coordinate properly with object parameters and value being 0", () => {
      window.scroll({left: 100});
      expect(window.pageXOffset).to.equal(100);
      window.scroll({left: 0});
      expect(window.pageXOffset).to.equal(0);
    });

    it("should set y coordinate properly with object parameters", () => {
      window.scroll({top: 100});
      expect(window.pageYOffset).to.equal(100);
      expect(window.pageXOffset).to.equal(0);
    });

    it("should set x coordinate properly with object parameters", () => {
      window.scroll({left: 100});
      expect(window.pageXOffset).to.equal(100);
      expect(window.pageYOffset).to.equal(0);
    });

    it("should set both coordinates properly with object parameters", () => {
      window.scroll({top: 100, left: 100});
      expect(window.pageXOffset).to.equal(100);
      expect(window.pageYOffset).to.equal(100);
    });

    it("allows null as x", () => {
      window.scroll(null, 100);
      expect(window.pageYOffset).to.equal(100);
    });
  });

  describe("location", () => {
    it("exposes location", () => {
      const wdw = Window({}, {
        location: getLocation("https://www.expressen.se/nyheter/article-slug/?q=1")
      });

      expect(wdw.location).to.have.property("href", "https://www.expressen.se/nyheter/article-slug/?q=1");
      expect(wdw.location).to.have.property("protocol", "https:");
      expect(wdw.location).to.have.property("host", "www.expressen.se");
      expect(wdw.location).to.have.property("hostname", "www.expressen.se");
      expect(wdw.location).to.have.property("origin", "https://www.expressen.se");
      expect(wdw.location).to.have.property("pathname", "/nyheter/article-slug/");
      expect(wdw.location).to.not.have.property("path");
      expect(wdw.location).to.have.property("search", "?q=1");
    });

    it("exposes location with port", () => {
      const wdw = Window({}, {
        location: getLocation("https://www.expressen.se:443/nyheter/article-slug/?q=1")
      });

      expect(wdw.location).to.have.property("href", "https://www.expressen.se:443/nyheter/article-slug/?q=1");
      expect(wdw.location).to.have.property("protocol", "https:");
      expect(wdw.location).to.have.property("port", "443");
      expect(wdw.location).to.have.property("host", "www.expressen.se:443");
      expect(wdw.location).to.have.property("hostname", "www.expressen.se");
      expect(wdw.location).to.have.property("origin", "https://www.expressen.se:443");
      expect(wdw.location).to.have.property("pathname", "/nyheter/article-slug/");
      expect(wdw.location).to.not.have.property("path");
      expect(wdw.location).to.have.property("search", "?q=1");
    });

    it("has setter", () => {
      const wdw = Window({}, {
        location: getLocation("https://www.expressen.se/nyheter/article-slug/?q=1")
      });

      wdw.location = "https://www.expressen.se/nyheter/";

      expect(wdw.location).to.have.property("href", "https://www.expressen.se/nyheter/");
      expect(wdw.location).to.have.property("protocol", "https:");
      expect(wdw.location).to.have.property("host", "www.expressen.se");
      expect(wdw.location).to.have.property("pathname", "/nyheter/");
      expect(wdw.location).to.not.have.property("path");
      expect(wdw.location).to.have.property("search", null);
    });

    it.skip("property can be replaced for testing purposes", () => {
      const wdw = Window({}, {
        location: getLocation("https://www.expressen.se/nyheter/article-slug/?q=1")
      });

      delete wdw.location;

      wdw.location = "https://www.expressen.se/nyheter/";

      expect(wdw.location).to.equal("https://www.expressen.se/nyheter/");
    });

    it("supports relative path", () => {
      const wdw = Window({}, {
        location: getLocation("https://www.expressen.se/nyheter/article-slug/?q=1")
      });

      wdw.location = "/nyheter/";

      expect(wdw.location).to.have.property("href", "https://www.expressen.se/nyheter/");
      expect(wdw.location).to.have.property("protocol", "https:");
      expect(wdw.location).to.have.property("host", "www.expressen.se");
      expect(wdw.location).to.have.property("pathname", "/nyheter/");
      expect(wdw.location).to.not.have.property("path");
      expect(wdw.location).to.have.property("search", null);
    });

    it("emits unload on window if set", (done) => {
      const wdw = Window({}, {
        location: getLocation("https://www.expressen.se/nyheter/article-slug/?q=1")
      });

      wdw.addEventListener("unload", () => {
        done();
      });

      wdw.location = "https://www.expressen.se/nyheter/";
    });

    it("emits unload even if changed to the same url", (done) => {
      const wdw = Window({}, {
        location: getLocation("https://www.expressen.se/nyheter/article-slug/?q=1")
      });

      wdw.addEventListener("unload", () => {
        done();
      });

      wdw.location = "https://www.expressen.se/nyheter/article-slug/?q=1";
    });

    it("doesn't emit unload if changed to the same url with hash", () => {
      const wdw = Window({}, {
        location: getLocation("https://www.expressen.se/nyheter/article-slug/")
      });

      let fired = false;
      wdw.addEventListener("unload", () => {
        fired = true;
      });

      wdw.location = "https://www.expressen.se/nyheter/article-slug/#1";

      expect(fired).to.be.false;
    });

    describe("replace(newUri)", () => {
      it("replaces location", () => {
        const wdw = Window({}, {
          location: getLocation("https://www.expressen.se/nyheter/article-slug/?q=1")
        });

        wdw.location.replace("https://www.expressen.se/nyheter/");

        expect(wdw.location).to.have.property("href", "https://www.expressen.se/nyheter/");
        expect(wdw.location).to.have.property("protocol", "https:");
        expect(wdw.location).to.have.property("host", "www.expressen.se");
        expect(wdw.location).to.have.property("pathname", "/nyheter/");
        expect(wdw.location).to.not.have.property("path");
        expect(wdw.location).to.have.property("search", null);
        expect(wdw.location).to.have.property("hash", null);
      });

      it("hash only adds hash to current location", () => {
        const wdw = Window({}, {
          location: getLocation("https://www.expressen.se/nyheter/")
        });

        wdw.location.replace("#atillo");

        expect(wdw.location).to.have.property("href", "https://www.expressen.se/nyheter/#atillo");
        expect(wdw.location).to.have.property("protocol", "https:");
        expect(wdw.location).to.have.property("host", "www.expressen.se");
        expect(wdw.location).to.have.property("pathname", "/nyheter/");
        expect(wdw.location).to.not.have.property("path");
        expect(wdw.location).to.have.property("search", null);
        expect(wdw.location).to.have.property("hash", "#atillo");
      });

      it("emits unload if replaced with new uri", (done) => {
        const wdw = Window({}, {
          location: getLocation("https://www.expressen.se/nyheter/article-slug/?q=1")
        });

        wdw.addEventListener("unload", () => {
          done();
        });

        wdw.location.replace("https://www.expressen.se/nyheter/");
      });
    });
  });

  describe("window.atob()", () => {
    it("decodes base64 encoded string", () => {
      const wdw = Window({
        url: "https://www.expressen.se/nyheter/article-slug/"
      });

      expect(wdw.atob(Buffer.from("obfusca", "latin1").toString("base64"))).to.equal("obfusca");
      expect(wdw.atob(Buffer.from("obfuscåa", "latin1").toString("base64"))).to.equal("obfuscåa");
      expect(wdw.atob(Buffer.from("obfusc😭a", "latin1").toString("base64"))).to.equal("obfusc=-a");
    });

    it("throws if trying to decode invalid base64 string", () => {
      const wdw = Window({
        url: "https://www.expressen.se/nyheter/article-slug/"
      });

      expect(() => wdw.atob({})).to.throw(/not correctly encoded/);
      expect(() => wdw.atob(undefined)).to.throw(/not correctly encoded/);
    });

    it("called with no arg is NOT ok", () => {
      const wdw = Window({
        url: "https://www.expressen.se/nyheter/article-slug/"
      });

      expect(() => wdw.atob()).to.throw(TypeError);
    });
  });

  describe("window.btoa()", () => {
    it("decodes base64 encoded string as latin1", () => {
      const wdw = Window({
        url: "https://www.expressen.se/nyheter/article-slug/"
      });

      expect(wdw.btoa("pål med å inte äöáÿ")).to.equal("cOVsIG1lZCDlIGludGUg5Pbh/w==");
    });

    it("throws if trying to encode chars outside latin1 range (>255)", () => {
      const wdw = Window({
        url: "https://www.expressen.se/nyheter/article-slug/"
      });

      expect(() => wdw.btoa("ÿ Ā")).to.throw(/latin1/i);
      expect(() => wdw.btoa("\u0100")).to.throw(/latin1/i);
      expect(() => wdw.btoa("\u00FF")).to.not.throw();
    });

    it("called with undefined is ok", () => {
      const wdw = Window({
        url: "https://www.expressen.se/nyheter/article-slug/"
      });

      expect(() => wdw.btoa(undefined)).to.not.throw();
    });

    it("called with no arg is NOT ok", () => {
      const wdw = Window({
        url: "https://www.expressen.se/nyheter/article-slug/"
      });

      expect(() => wdw.btoa()).to.throw(TypeError);
    });
  });
});

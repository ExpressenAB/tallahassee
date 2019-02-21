Tallahassee
===========

![Utilities](https://raw.github.com/ExpressenAB/tallahassee/master/app/assets/images/tallahassee-1.png)

[![Build Status](https://travis-ci.org/ExpressenAB/tallahassee.svg?branch=master)](https://travis-ci.org/ExpressenAB/tallahassee)[![dependencies Status](https://david-dm.org/ExpressenAB/tallahassee/status.svg)](https://david-dm.org/ExpressenAB/tallahassee)

Test your client scripts in a headless browser.

# Introduction

Supports just about everything except `querySelectorAll()` which we don´t want developers to use.

- IntersectionObserver? Yes, check [here](/API.md#intersectionobserver)

# Example:

```javascript
"use strict";

const app = require("../app/app");
const Browser = require("@expressen/tallahassee");
const Script = require("@bonniernews/wichita");

describe("Tallahassee", () => {
  describe("navigateTo()", () => {
    it("navigates to url", async () => {
      await Browser(app).navigateTo("/");
    });

    it("throws if not 200", async () => {
      try {
        await Browser(app).navigateTo("/404");
      } catch (e) {
        var err = e; // eslint-disable-line no-var
      }
      expect(err).to.be.ok;
    });

    it("unless you override status code", async () => {
      const browser = await Browser(app).navigateTo("/404", null, 404);
      expect(browser.document.getElementsByTagName("h1")[0].innerText).to.equal("Apocalyptic");
    });
  });

  describe("run script", () => {
    it("run es6 script sources with @bonniernews/wichita", async () => {
      const browser = await Browser(app).navigateTo("/", {
        Cookie: "_ga=1"
      });

      await Script("../app/assets/scripts/main").run(browser.window);

      expect(browser.document.cookie).to.equal("_ga=1");
      expect(browser.document.getElementsByClassName("set-by-js")).to.have.length(1);
    });

    it("again", async () => {
      const browser = await Browser(app).navigateTo("/");

      await Script("../app/assets/scripts/main").run(browser.window);

      expect(browser.document.cookie).to.equal("");
      expect(browser.document.getElementsByClassName("set-by-js")).to.have.length(0);
    });
  });
});
```

# External scripts

May we suggest you to use Wichita, the Tallahassee sidekick. It can be found here https://www.npmjs.com/package/@bonniernews/wichita

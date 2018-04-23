"use strict";

const DOMException = require("domexception");
const {Document} = require("../lib");
const Element = require("../lib/Element");

const elementProperties = [
  "children",
  "classList",
  "className",
  "dataset",
  "disabled",
  "firstChild",
  "firstElementChild",
  "id",
  "lastChild",
  "lastElementChild",
  "name",
  "innerHTML",
  "offsetHeight",
  "outerHTML",
  "src",
  "style",
  "tagName",
  "type",
  "value",
  "nextElementSibling"
];

const elementApi = [
  "getElementsByTagName",
  "getElementsByClassName",
  "getBoundingClientRect",
  "remove",
];

describe("elements", () => {
  describe("properties", () => {
    let document;
    beforeEach(() => {
      document = Document({
        request: {
          url: "https://www.expressen.se/"
        },
        text: `
          <html>
            <body>
              <h1>Elements</h1>
              <h2 id="headline">Test</h2>
              <input type="button">
              <script>var a = 1;</script>
              <img style="display: none;height:0">

              <a href="//example.com">Absolute link no protocol</a>
              <a href="http://example.com">Absolute link with protocol</a>
              <a href="/slug/">Relative link</a>

              <img class="test-src" src="//example.com/img.png">Absolute link no protocol</iframe>
              <iframe class="test-src" src="http://example.com">Absolute link with protocol</iframe>
              <iframe class="test-src" src="/slug/">Relative link</iframe>
            </body>
          </html>`
      });
    });

    it("element should have property tagName", () => {
      const children = document.body.children;
      expect(children).to.have.length.above(0);
      children.forEach((elm) => {
        expect(elm).to.have.property("tagName").that.match(/[A-Z]+/);
      });
    });

    elementProperties.forEach((name) => {
      it(`"${name}" should exist`, () => {
        const children = document.body.children;
        expect(children).to.have.length.above(0);
        children.forEach((elm) => {
          expect(elm, elm.tagName).to.have.property(name);
        });
      });
    });

    describe("classList", () => {
      let elm;

      beforeEach(() => {
        [elm] = document.getElementsByTagName("h1");
      });

      it("exposes classList with the expected behaviour", async () => {
        expect(elm.classList).to.be.ok;
        elm.classList.add("class-list");

        expect(elm.classList._classes).to.contain("class-list");

        elm.classList.toggle("class-list");
        expect(elm.classList._classes).to.not.contain("class-list");

        elm.classList.toggle("class-list", false);
        expect(elm.classList._classes).to.not.contain("class-list");

        elm.classList.toggle("class-list", true);
        expect(elm.classList._classes).to.contain("class-list");

        elm.classList.toggle("class-list");
        expect(elm.classList._classes).to.not.contain("class-list");

        elm.classList.add("class-list", "second-class");
        expect(elm.classList._classes).to.include.members(["class-list", "second-class"]);

        elm.classList.remove("class-list", "second-class");
        expect(elm.classList._classes).to.not.include.members(["class-list", "second-class"]);
      });

      it("exposes hook for manipulating element when class is added", () => {
        expect(elm.style).to.not.have.property("display");
        elm.addEventListener("_classadded", (...classNames) => {
          if (classNames.includes("hidden")) {
            elm.style.display = "none";
          }
        });

        elm.classList.add("hidden");
        expect(elm.style).to.have.property("display", "none");
      });

      it("exposes hook for manipulating element when class is removed", () => {
        elm.style.position = "fixed";

        elm.addEventListener("_classremoved", (...classNames) => {
          if (classNames.includes("sticky")) {
            elm.style.position = "relative";
          }
        });

        elm.classList.remove("sticky");
        expect(elm.style).to.have.property("position", "relative");
      });
    });

    it("exposes disabled with the expected behaviour on input element", async () => {
      const [elm] = document.getElementsByTagName("input");
      expect(elm).to.have.property("disabled").that.is.false;
      elm.disabled = true;
      expect(elm.outerHTML).to.equal("<input type=\"button\" disabled=\"disabled\">");
      elm.disabled = false;
      expect(elm.outerHTML).to.equal("<input type=\"button\">");
    });

    it("exposes disabled with the expected behaviour on non-input element", async () => {
      const [elm] = document.getElementsByTagName("h2");
      expect(elm).to.have.property("disabled").that.is.undefined;
      elm.disabled = true;
      expect(elm.outerHTML).to.equal("<h2 id=\"headline\" disabled=\"disabled\">Test</h2>");
      elm.disabled = false;
      expect(elm.outerHTML).to.equal("<h2 id=\"headline\">Test</h2>");
    });

    it("exposes .href with the expected behaviour", async () => {
      const [noprot, abs, rel] = document.getElementsByTagName("a");
      expect(noprot).to.have.property("href", "https://example.com");
      expect(abs).to.have.property("href", "http://example.com");
      expect(rel).to.have.property("href", "https://www.expressen.se/slug/");
    });

    it("exposes .src with the expected behaviour", async () => {
      const [noprot, abs, rel] = document.getElementsByClassName("test-src");
      expect(noprot).to.have.property("src", "https://example.com/img.png");
      expect(abs).to.have.property("src", "http://example.com");
      expect(rel).to.have.property("src", "https://www.expressen.se/slug/");
      noprot.src = "/img/set.gif";
      expect(noprot).to.have.property("src", "https://www.expressen.se/img/set.gif");
    });

    it("triggers load event when setting .src", async () => {
      const [img1, img2] = document.getElementsByTagName("img");
      img1.imageLoaded = "false";
      img2.imageLoaded = "false";

      img1.addEventListener("load", () => img1.imageLoaded = "true");
      img2.addEventListener("load", () => img2.imageLoaded = "true");

      img2.src = "/img/setImage2.gif";
      expect(img1).to.have.property("imageLoaded", "false");
      expect(img2).to.have.property("imageLoaded", "true");
    });


  });

  describe(".style", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2 id="headline">Test</h2>
              <img style="display: none;height:0; -moz-transition-duration: 12ms">
            </body>
          </html>`
      });
    });

    it("exposes style with the expected behaviour", async () => {
      const [elm] = document.getElementsByTagName("h2");
      expect(elm).to.have.property("style").that.eql({});
      elm.style.display = "none";
      expect(elm.outerHTML).to.equal("<h2 id=\"headline\" style=\"display: none;\">Test</h2>");
      elm.style.removeProperty("display");
      expect(elm.outerHTML).to.equal("<h2 id=\"headline\">Test</h2>");

      const [img] = document.getElementsByTagName("img");
      expect(img.style).to.eql({
        mozTransitionDuration: "12ms",
        display: "none",
        height: "0"
      });

      img.style.height = "12px";
      img.style.width = "0";
      expect(img.getAttribute("style")).to.equal("display: none;height: 12px;-moz-transition-duration: 12ms;width: 0;");
    });

    it("handles setting camel cased properties", async () => {
      const [elm] = document.getElementsByTagName("h2");

      elm.style.mozTransitionDuration = "6s";
      expect(elm.outerHTML).to.equal("<h2 id=\"headline\" style=\"-moz-transition-duration: 6s;\">Test</h2>");
      elm.style.removeProperty("mozTransitionDuration");
      expect(elm.outerHTML).to.equal("<h2 id=\"headline\">Test</h2>");

      elm.style.msGridColumns = "auto auto";
      expect(elm.outerHTML).to.equal("<h2 id=\"headline\" style=\"-ms-grid-columns: auto auto;\">Test</h2>");

      elm.style.marginTop = 0;
      expect(elm.outerHTML).to.equal("<h2 id=\"headline\" style=\"-ms-grid-columns: auto auto;margin-top: 0;\">Test</h2>");
    });
  });

  describe("api", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2 id="headline">Test</h2>
              <input type="button">
              <script>var a = 1;</script>
            </body>
          </html>`
      });
    });

    elementApi.forEach((name) => {
      it(`"${name}" should be a function`, () => {
        const children = document.body.children;
        expect(children).to.have.length.above(0);
        children.forEach((elm) => {
          expect(elm, elm.tagName).to.have.property(name).and.be.a("function");
        });
      });
    });
  });

  describe("input[type=radio]", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <input type="radio" name="test" value="1" checked="checked">
              <input type="radio" name="test" value="2">
            </body>
          </html>`
      });
    });

    it("has checked true if checked", () => {
      expect(document.getElementsByTagName("input")[0].checked).to.be.true;
    });

    it("has checked false if not checked", () => {
      expect(document.getElementsByTagName("input")[1].checked).to.be.false;
    });

    it("has value", () => {
      expect(document.getElementsByTagName("input")[0].value).to.equal("1");
      expect(document.getElementsByTagName("input")[1].value).to.equal("2");
    });

    it("can set checked", () => {
      const elm = document.getElementsByTagName("input")[1];
      elm.checked = true;
      expect(elm.checked).to.be.true;
    });

    it("unsets checked on siblings", () => {
      const elms = document.getElementsByTagName("input");
      elms[1].checked = true;
      expect(elms[0].checked).to.be.false;
    });

    it("unsets checked on siblings in same form", () => {
      document = Document({
        text: `
          <html>
            <body>
              <form id="form1">
                <input type="radio" name="test" value="1" checked="checked">
                <input type="radio" name="test" value="2">
              </form>
              <form id="form2">
                <input type="radio" name="test" value="1" checked="checked">
                <input type="radio" name="test" value="2">
              </form>
            </body>
          </html>`
      });

      const elms1 = document.getElementById("form1").getElementsByTagName("input");
      elms1[1].checked = true;
      expect(elms1[0].checked).to.be.false;

      const elms2 = document.getElementById("form2").getElementsByTagName("input");
      expect(elms2[0].checked).to.be.true;
      expect(elms2[1].checked).to.be.false;
    });
  });

  describe("_setBoundingClientRect", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2>Test</h2>
              <p>Body text</p>
            </body>
          </html>`
      });
    });

    it("sets result of getBoundingClientRect", () => {
      const [elm] = document.getElementsByTagName("p");
      elm._setBoundingClientRect({
        top: 10,
        bottom: 20,
        left: 10,
        right: 20,
      });

      expect(elm.getBoundingClientRect()).to.eql({
        top: 10,
        bottom: 20,
        height: 10,
        left: 10,
        right: 20,
        width: 10,
      });
    });

    it("sets height to 0 and sets bottom value to top value if there is only top", () => {
      const [elm] = document.getElementsByTagName("p");
      elm._setBoundingClientRect({
        top: 10,
      });

      expect(elm.getBoundingClientRect()).to.eql({
        top: 10,
        left: 0,
        right: 0,
        width: 0,
        bottom: 10,
        height: 0
      });
    });

    it("sets offsetHeight as well", () => {
      const [elm] = document.getElementsByTagName("p");
      elm._setBoundingClientRect({
        top: 10, bottom: 200
      });

      expect(elm.offsetHeight).to.equal(190);
    });
  });

  describe(".textContent", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2>Test</h2>
              <script>var a = 1;</script>
            </body>
          </html>`
      });
    });

    it("returns null on document", () => {
      expect(document).to.have.property("textContent", null);
    });

    it("returns text content of element", () => {
      expect(document.getElementsByTagName("h2")[0]).to.have.property("textContent", "Test");
    });

    it("sets text content of element", () => {
      const elm = document.getElementsByTagName("h2")[0];
      elm.textContent = "Modified test";
      expect(elm).to.have.property("textContent", "Modified test");
    });

    it("returns text content of script element", () => {
      expect(document.getElementsByTagName("script")[0]).to.have.property("textContent", "var a = 1;");
    });

    it("sets text content of script element", () => {
      const elm = document.getElementsByTagName("script")[0];
      elm.textContent = "var b = 2;";
      expect(elm).to.have.property("textContent", "var b = 2;");
    });

  });

  describe(".firstElementChild", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2>Test</h2>
              <p>
                Some <strong>string</strong> text
              </p>
            </body>
          </html>`
      });
    });

    it("returns first element child", () => {
      expect(document.body.firstElementChild).to.have.property("tagName", "H2");
    });

    it("returns null if no element children", () => {
      expect(document.getElementsByTagName("h2")[0].firstElementChild).to.be.null;
    });

    it("ignores text content", () => {
      expect(document.getElementsByTagName("p")[0].firstElementChild).to.have.property("tagName", "STRONG");
    });
  });

  describe(".firstChild", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body><h2>Test</h2>
              <p>Some <strong>string</strong> text</p>
              <p class="empty"></p>
            </body>
          </html>`
      });
    });

    it("returns first child", () => {
      expect(document.body.firstChild).to.have.property("tagName", "H2");
    });

    it("returns text content", () => {
      expect(document.getElementsByTagName("p")[0].firstChild).to.equal("Some ");
    });

    it("returns null if no element children", () => {
      expect(document.getElementsByClassName("empty")[0].firstChild).to.be.null;
    });
  });

  describe(".lastElementChild", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2>Test</h2>
              <p>
                Some <strong>string</strong> <b>bold</b> text
              </p>
            </body>
          </html>`
      });
    });

    it("returns last element child", () => {
      expect(document.body.lastElementChild).to.have.property("tagName", "P");
    });

    it("returns null if no element children", () => {
      expect(document.getElementsByTagName("h2")[0].lastElementChild).to.be.null;
    });

    it("ignores text content", () => {
      expect(document.getElementsByTagName("p")[0].lastElementChild).to.have.property("tagName", "B");
    });
  });

  describe(".lastChild", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2>Test <b>title</b></h2>
              <p>Some <strong>string</strong> <b>bold</b> text</p>
            <p class="empty"></p></body></html>`
      });
    });

    it("returns last child", () => {
      expect(document.body.lastChild).to.have.property("tagName", "P");
    });

    it("returns text content", () => {
      expect(document.getElementsByTagName("p")[0].lastChild).to.equal(" text");
    });

    it("returns element if last", () => {
      expect(document.getElementsByTagName("h2")[0].lastChild).to.have.property("tagName", "B");
    });

    it("returns null if no element children", () => {
      expect(document.getElementsByClassName("empty")[0].lastChild).to.be.null;
    });
  });

  describe(".className", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html class="no-js">
            <body>
              <h2 id="h" class="header">Test <b>title</b></h2>
            </body>
          </html>`
      });
    });

    it("returns class attribute", () => {
      expect(document.getElementById("h").className).to.equal("header");
    });

    it("sets class attribute", () => {
      document.body.className = "hidden no-js";
      expect(document.body.className).to.equal("hidden no-js");
    });
  });

  describe("forms", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2>Test <b>title</b></h2>
              <form id="get-form" type="get" action="/">
                <button type="submit">Submit</submit>
              </form>
            </body>
          </html>`
      });
    });

    it("has submit method", () => {
      expect(document.getElementById("get-form")).to.have.property("submit").that.is.a("function");
    });

    it("submit button has associated form property", () => {
      const [form] = document.getElementsByTagName("form");
      const [button] = document.getElementsByTagName("button");

      expect(form === button.form).to.be.true;
    });

    it("submit button click emits submit on document", (done) => {
      const [button] = document.getElementsByTagName("button");

      document.addEventListener("submit", () => done());

      button.click();
    });

    it("submit sets event target to form", (done) => {
      const [form] = document.getElementsByTagName("form");
      const [button] = document.getElementsByTagName("button");

      document.addEventListener("submit", (event) => {
        expect(event.target === form).to.be.true;
        done();
      });

      button.click();
    });
  });

  describe("video element", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2>Test <b>title</b></h2>
              <video id="video-element"></video>
            </body>
          </html>`
      });
    });

    it("has a play method", () => {
      const videoElement = document.getElementById("video-element");
      expect(typeof videoElement.play === "function").to.be.true;
    });

    it("the play method returns a resolved promise", (done) => {
      const videoElement = document.getElementById("video-element");
      const returnValue = videoElement.play();
      expect(returnValue instanceof Promise).to.be.true;
      returnValue.then((value) => {
        expect(value).to.be.undefined;
        done();
      });
    });

    it("has a pause method", () => {
      const videoElement = document.getElementById("video-element");
      expect(typeof videoElement.pause === "function").to.be.true;
    });

    it("the pause method returns undefined", () => {
      const videoElement = document.getElementById("video-element");
      const returnValue = videoElement.pause();
      expect(returnValue).to.be.undefined;
    });
  });

  describe("template element", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h1>Template</h1>
              <template><h2>Test <b>title</b></h2></template>
            </body>
          </html>`
      });
    });

    it("has content property", () => {
      const [element] = document.getElementsByTagName("template");
      expect(element.content === element).to.be.true;
    });

    it("non-template element returns undefined", () => {
      const [element] = document.getElementsByTagName("h1");
      expect(element.content).to.be.undefined;
    });
  });

  describe("instanceof", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <h2>Test <b>title</b></h2>
              <form id="get-form" type="get" action="/">
                <button type="submit">Submit</submit>
              </form>
            </body>
          </html>`
      });
    });

    it("instance has an instanceof Element", () => {
      const element = document.getElementById("get-form");
      expect(element instanceof Element).to.be.true;
    });
  });

  describe("dataset", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <div data-test-get="should be fetched"></div>
            </body>
          </html>`
      });
    });

    it("should get the dataset attribute", () => {
      const [elm] = document.getElementsByTagName("div");
      expect(elm.dataset).to.eql({
        testGet: "should be fetched"
      });
      expect(elm.dataset.testGet).to.equal("should be fetched");
      expect(elm.dataset["testGet"]).to.equal("should be fetched"); // eslint-disable-line dot-notation
    });

    it("should set a dataset attribute", () => {
      const [elm] = document.getElementsByTagName("div");
      elm.dataset.testSetObjectLike = "bar";
      elm.dataset["testSetArrayLike"] = "baz"; // eslint-disable-line dot-notation
      expect(elm.$elm[0].attribs).to.have.property("data-test-set-object-like", "bar");
      expect(elm.dataset.testSetObjectLike).to.equal("bar");
      expect(elm.$elm[0].attribs).to.have.property("data-test-set-array-like", "baz");
      expect(elm.dataset["testSetArrayLike"]).to.equal("baz"); // eslint-disable-line dot-notation
    });

    it("returns new attribute set by setAttribute", () => {
      const [elm] = document.getElementsByTagName("div");
      elm.setAttribute("data-test-set-attribute", 1);

      expect(elm.dataset).to.eql({
        testGet: "should be fetched",
        testSetAttribute: "1"
      });
    });
  });

  describe("previous- and nextElementSibling", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <div class="previous-element"></div>
              text
              <div class="start-element"></div>
              text
              <div class="next-element"></div>
            </body>
          </html>`
      });
    });

    it("should get the previous element sibling", () => {
      const [elm] = document.getElementsByClassName("start-element");
      expect(elm.previousElementSibling.classList.contains("previous-element")).to.be.true;
    });

    it("should return null if no previous sibling", () => {
      const [elm] = document.getElementsByClassName("previous-element");
      expect(elm.previousElementSibling).to.equal(undefined);
    });

    it("should get the next element sibling", () => {
      const [elm] = document.getElementsByClassName("start-element");
      expect(elm.nextElementSibling.classList.contains("next-element")).to.be.true;
    });

    it("should return null if no next sibling", () => {
      const [elm] = document.getElementsByClassName("next-element");
      expect(elm.nextElementSibling).to.equal(undefined);
    });
  });

  describe("insertBefore", () => {
    let document;
    beforeEach(() => {
      document = Document({
        text: `
          <html>
            <body>
              <div class="element-10"></div>
              text1
              <div class="element-20"></div>
              text2
            </body>
          </html>`
      });
    });

    it("should insert node before reference node", () => {
      const [parentElm] = document.getElementsByTagName("body");
      const [beforeElm] = document.getElementsByClassName("element-20");

      const newNode = document.createElement("div");
      newNode.classList.add("element-15");

      const returnValue = parentElm.insertBefore(newNode, beforeElm);

      const divs = parentElm.getElementsByTagName("div");
      expect(divs.length).to.equal(3);
      expect(divs[1].classList.contains("element-15")).to.be.true;
      expect(returnValue).to.eql(newNode);
    });

    it("should insert node as last child of parent when referenceNode is null", () => {
      const [parentElm] = document.getElementsByTagName("body");

      const newNode = document.createElement("div");
      newNode.classList.add("element-30");

      const returnValue = parentElm.insertBefore(newNode, null);

      const divs = parentElm.getElementsByTagName("div");
      expect(divs.length).to.equal(3);
      expect(divs[2].classList.contains("element-30")).to.be.true;
      expect(returnValue).to.eql(newNode);
    });

    it("should throw DOMException when referenceNode is not child of target", () => {
      const [parentElm] = document.getElementsByClassName("element-10");
      const [beforeElm] = document.getElementsByClassName("element-20");

      const newNode = document.createElement("div");
      newNode.classList.add("element-15");

      expect(() => {
        parentElm.insertBefore(newNode, beforeElm);
      }).to.throw(DOMException);

      const divs = document.getElementsByTagName("body")[0].getElementsByTagName("div");
      expect(divs.length).to.equal(2);
    });

    it("should move existing nodes", () => {
      const [parentElm] = document.getElementsByTagName("body");
      const [beforeElm] = document.getElementsByClassName("element-10");
      const [moveElm] = document.getElementsByClassName("element-20");

      const returnValue = parentElm.insertBefore(moveElm, beforeElm);

      const divs = parentElm.getElementsByTagName("div");
      expect(divs.length).to.equal(2);
      expect(divs[0].classList.contains("element-20")).to.be.true;
      expect(divs[1].classList.contains("element-10")).to.be.true;
      expect(returnValue).to.eql(moveElm);
    });

    it("should handle text nodes", () => {
      const [parentElm] = document.getElementsByTagName("body");
      const [beforeElm] = document.getElementsByClassName("element-20");

      const newNode = document.createTextNode("Tordyveln flyger i skymningen");

      const returnValue = parentElm.insertBefore(newNode, beforeElm);

      const text = parentElm.textContent.replace(/\s/g, "");
      expect(text).to.equal("text1Tordyvelnflygeriskymningentext2");
      expect(returnValue).to.eql(newNode);
    });
  });
});

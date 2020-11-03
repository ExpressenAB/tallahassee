"use strict";

const Document = require("../lib/Document");
const DocumentFragment = require("../lib/DocumentFragment");
const Element = require("../lib/Element");

describe("DocumentFragment", () => {
  let documentFragment;
  beforeEach(() => {
    documentFragment = DocumentFragment(Element);
    documentFragment.$elm.html(`
      <li><a>Item</a></li>
    `);
  });

  describe(".querySelector()", () => {
    it("returns one matching element", () => {
      const child = documentFragment.querySelector("*");
      expect(child).to.be.ok;
      expect(child).to.have.property("tagName", "LI");
    });

    it("returns null if selector doesn't match any children", () => {
      const child = documentFragment.querySelector("h1");
      expect(child).to.be.null;
    });
  });

  describe(".querySelector()", () => {
    it("returns all matching elements", () => {
      const children = documentFragment.querySelectorAll("*");
      expect(children).to.have.length(2);
      expect(children[0]).to.have.property("tagName", "LI");
      expect(children[1]).to.have.property("tagName", "A");
    });

    it("returns empty array if selector doesn't match any children", () => {
      const children = documentFragment.querySelectorAll("h1");
      expect(children).to.have.length(0);
    });
  });

  describe(".appendChild()", () => {
    it("appends a new child", () => {
      const child = Document({text: ""}).createElement("li");
      documentFragment.appendChild(child);
      const children = documentFragment.querySelectorAll("li");
      expect(children).to.have.length(2);
    });

    it("appends an existing child", () => {
      const child = documentFragment.querySelector("a");
      documentFragment.appendChild(child);
      const children = documentFragment.querySelectorAll("*");
      expect(children).to.have.length(2);
      expect(children[1].previousElementSibling).to.have.property("tagName", "LI");
    });

    it("append child returns child element fragment", () => {
      const child = Document({text: ""}).createElement("li");
      const returnChild = documentFragment.appendChild(child);
      expect(returnChild).to.be.ok;
      expect(returnChild instanceof Element).to.be.true;
    });
  });

  describe(".firstChild", () => {
    it("returns first child if element", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("<li><a>Item</a></li>");

      const firstChild = fragment.firstChild;

      expect(firstChild).to.be.ok;
      expect(firstChild.nodeType).to.equal(1);
      expect(firstChild.tagName).to.equal("LI");
    });

    it("returns first child if text", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("Memememe<li><a>Item</a></li>");

      const firstChild = fragment.firstChild;

      expect(firstChild).to.be.ok;
      expect(firstChild.nodeType).to.equal(3);
    });

    it("returns null if no children", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("");

      expect(fragment.firstChild).to.be.null;
    });
  });

  describe(".firstElementChild", () => {
    it("returns first child element", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("<li><a>Item</a></li>");

      const firstChild = fragment.firstElementChild;

      expect(firstChild).to.be.ok;
      expect(firstChild.nodeType).to.equal(1);
      expect(firstChild.tagName).to.equal("LI");
    });

    it("returns first element child if first child is text", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("Memememe<li><a>Item</a></li>");

      const firstChild = fragment.firstElementChild;

      expect(firstChild).to.be.ok;
      expect(firstChild.nodeType).to.equal(1);
      expect(firstChild.tagName).to.equal("LI");
    });

    it("returns null if no children", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("Mememem");

      expect(fragment.firstElementChild).to.be.null;
    });
  });

  describe(".childNodes", () => {
    it("returns child nodes", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("Mememem<li><a>Item</a></li>");

      const childNodes = fragment.childNodes;

      expect(childNodes).to.be.ok;
      expect(childNodes.length).to.equal(2);
      expect(childNodes[0].nodeType).to.equal(3);
      expect(childNodes[1].nodeType).to.equal(1);
    });

    it("child childNodes also returns children", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("<li><a>Item</a></li>");

      const childNode = fragment.childNodes[0];

      expect(childNode.childNodes).to.be.ok;
      expect(childNode.childNodes.length).to.equal(1);
      expect(childNode.childNodes[0].tagName).to.equal("A");
    });

    it("returns empty if no children", () => {
      const fragment = DocumentFragment(Element);
      fragment.$elm.html("");

      expect(fragment.childNodes).to.be.empty;
    });
  });
});

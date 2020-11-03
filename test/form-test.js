"use strict";

const Document = require("../lib/Document");

describe("forms", () => {
  let document;
  beforeEach(() => {
    document = Document({
      text: `
        <html>
          <body>
            <h2>Test <b>title</b></h2>
            <form id="get-form" type="get" action="/">
              <input type="checkbox" value="1">
              <input type="checkbox" value="2" checked="checked">
              <select>
                <option value="1">1</option>
                <option value="2" selected="selected">2</option>
              </select>
              <label>Description<textarea name="multiline"></textarea></label>
              <input name="myinput" type="text"></text>
              <button type="submit">Submit</submit>
              <button>Submit</submit>
              <button type="reset">Reset</submit>
            </form>
          </body>
        </html>`
    });
  });

  it("has submit method", () => {
    expect(document.getElementById("get-form")).to.have.property("submit").that.is.a("function");
  });

  it("has reset method", () => {
    expect(document.getElementById("get-form")).to.have.property("reset").that.is.a("function");
    expect(document.getElementById("get-form")).to.have.property("reset").that.is.a("function");
  });

  it("returns the same form twice", () => {
    expect(document.getElementById("get-form") === document.getElementById("get-form")).to.be.true;
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

  it("submit button click emits submit on form", (done) => {
    const [form] = document.getElementsByTagName("form");
    const [button] = document.getElementsByTagName("button");

    form.addEventListener("submit", () => done());

    button.click();
  });

  it("typeless button click emits submit on form", (done) => {
    const [form] = document.getElementsByTagName("form");
    const [, button] = document.getElementsByTagName("button");

    form.addEventListener("submit", () => done());

    button.click();
  });

  it("submit sets event target to form", (done) => {
    const form = document.getElementsByTagName("form")[0];
    const button = document.getElementsByTagName("button")[0];

    document.addEventListener("submit", (event) => {
      expect(event.target === form, "event target is not form").to.be.true;
      done();
    });

    button.click();
  });

  it("reset button click emits reset on form", (done) => {
    const form = document.getElementsByTagName("form")[0];
    const button = form.getElementsByTagName("button")[2];

    form.addEventListener("reset", () => done());

    button.click();
  });

  it("reset form resets form elements", () => {
    const form = document.getElementsByTagName("form")[0];
    const select = form.getElementsByTagName("select")[0];
    const checkboxes = form.getElementsByTagName("input");

    select.options[0].selected = true;

    checkboxes[0].checked = true;
    checkboxes[1].checked = false;

    form.reset();

    expect(select.options[0].selected).to.be.false;
    expect(select.options[1].selected).to.be.true;

    expect(checkboxes[0].checked).to.be.false;
    expect(checkboxes[1].checked).to.be.true;
  });

  it("input can get and set value", () => {
    const input = document.getElementsByTagName("input")[0];
    expect(input).to.have.property("value", "1");
    input.value = 3;
    expect(input).to.have.property("value", "3");
  });

  it("textarea can get and set value", () => {
    const input = document.getElementsByTagName("textarea")[0];
    expect(input).to.have.property("value", "");
    input.value = "line 1\nline 2";
    expect(input).to.have.property("value", "line 1\nline 2");
  });

  it("set innerHTML on textarea updates value", () => {
    const input = document.getElementsByTagName("textarea")[0];
    input.innerHTML = "&lt;p&gt;A test&lt;/p&gt;";
    expect(input.value).to.equal("<p>A test</p>");
  });

  it("set innerText on textarea updates value", () => {
    const input = document.getElementsByTagName("textarea")[0];
    input.innerText = "&lt;p&gt;A test&lt;/p&gt;";
    expect(input.value).to.equal("&lt;p&gt;A test&lt;/p&gt;");
  });

  it("button can get and set value", () => {
    const button = document.getElementsByTagName("button")[0];
    expect(button).to.have.property("value", "");
    button.value = "send";
    expect(button).to.have.property("value", "send");
  });

  it("form property elements return form fields", () => {
    const form = document.getElementsByTagName("form")[0];
    expect(form).to.have.property("elements");
    const elements = form.elements;
    expect(elements.length).to.equal(8);
    for (let i = 0; i < elements.length; ++i) {
      expect(["INPUT", "BUTTON", "SELECT", "TEXTAREA"].indexOf(elements[i].tagName), elements[i].tagName).to.be.above(-1);
    }
  });

  it("named input field can be retreived by named property", () => {
    const form = document.getElementsByTagName("form")[0];
    expect(form.myinput).to.be.ok;
    expect(form.myinput.name).to.equal("myinput");
    expect(form.myinput.tagName).to.equal("INPUT");
  });

  it("named input field is in form", () => {
    const form = document.getElementsByTagName("form")[0];
    expect("myinput" in form).to.be.true;
    expect("abrakadabra" in form).to.be.false;
  });

  it("unknown input field returns undefined", () => {
    const form = document.getElementsByTagName("form")[0];
    expect(form.abrakadabra === undefined).to.be.true;
  });

  it("added property is returned", () => {
    const form = document.getElementsByTagName("form")[0];
    const obj = form.abrakadabra = {};
    expect(form.abrakadabra === obj).to.be.true;
  });
});

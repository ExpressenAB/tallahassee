"use strict";

process.env.TZ = "Europe/Stockholm";
process.env.NODE_ENV = "test";

const chai = require("chai");

chai.config.truncateThreshold = 0;
chai.config.includeStack = true;

global.expect = chai.expect;

const nock = require("nock");
nock.enableNetConnect("127.0.0.1");

module.exports = {
  timeout: 2000,
  recursive: true,
  reporter: "spec",
};

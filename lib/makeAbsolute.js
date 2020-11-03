"use strict";

const url = require("url");

module.exports = function makeAbsolute(location, val) {
  if (!val) return val;
  if (/^\/\/\w/.test(val)) return location.protocol + val;
  if (!/^[/#]/.test(val)) return val;

  return url.format(Object.assign(
    {},
    location,
    Object.entries(url.parse(val))
      .reduce(cleanNullValues, {})
  ));

  function cleanNullValues(obj, [key, value]) {
    if (!value) return obj;

    obj[key] = value;
    return obj;
  }
};

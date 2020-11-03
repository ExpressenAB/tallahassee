"use strict";

const Url = require("url");

module.exports = function getLocation(uri) {
  if (!uri) return {};
  const {hash, host, hostname, href, pathname, port, protocol, search} = Url.parse(uri);

  return {
    hash,
    host,
    hostname,
    href,
    pathname,
    port,
    protocol,
    search,
    origin: `${protocol}//${host}`,
  };
};

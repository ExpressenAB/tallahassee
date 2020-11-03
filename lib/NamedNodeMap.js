"use strict";

module.exports = function NamedNodeMap(element) {
  const attributes = [];
  attributes.getNamedItem = function getNamedItem(name) {
    return attributes.find((a) => a.name === name) || null;
  };

  Object.entries(element.$elm[0].attribs).reduce((result, [name, value]) => {
    result.push({
      name,
      localName: name,
      nodeName: name,
      nodeType: 2,
      value,
    });
    return result;
  }, attributes);

  return attributes;
};

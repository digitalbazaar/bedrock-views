export const translate = function(load) {
  if(load.metadata.format !== 'json') {
    load.metadata.format = 'cjs';
    return `module.exports = ${load.source};`;
  }
  return load.source;
};

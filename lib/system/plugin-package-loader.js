export const fetch = function(info) {
  if(info.name.endsWith('crypto/package.json')) {
    const pkg = {
      "name": "crypto",
      "main": "index.js"
    };
    return JSON.stringify(pkg);
  }
  if(info.name.endsWith('crypto/index.js')) {
    return 'module.exports = window.crypto;';
  }
  throw new Error('No special package loading rule defined.');
};

export const translate = function(load) {
  // no change to crypto/index.js
  if(load.name.endsWith('crypto/index.js')) {
    return load.source;
  }

  const pkg = JSON.parse(load.source);
  const main = pkg.main;
  if(Array.isArray(main)) {
    // default to first file, but search for a `.js` extension
    pkg.main = pkg.main[0];
    for(let i = 0; i < main.length; ++i) {
      if(main[i].endsWith('.js')) {
        pkg.main = main[i];
        break;
      }
    }
  }
  return JSON.stringify(pkg);
};

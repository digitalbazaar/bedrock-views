export const translate = function(load) {
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

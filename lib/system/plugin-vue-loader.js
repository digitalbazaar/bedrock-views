/*
 * Single File Vue Component Loader.
 */
exports.fetch = async url => {
  const {vue} = System.getConfig().meta['*.vue'];
  const path = new URL(url.name).pathname;
  const response = await fetch(
    vue.compiler + '?component=' + encodeURIComponent(path));
  if(response.status !== 200) {
    let message = 'Could not compile SFC: ' + path + '\n';
    try {
      const error = await response.json();
      if(error.details && error.details.errors) {
        message += error.details.errors.join('\n');
      } else {
        message += JSON.stringify(error, null, 2);
      }
    } catch(e) {
      message += 'Could not receive compile error either: ' +
        JSON.stringify(e, null, 2);
    }
    throw new Error(message);
  }
  return response.text();
};

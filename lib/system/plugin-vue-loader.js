/*
 * Single File Vue Component Loader.
 */
/* global System, URL, fetch */
exports.fetch = async (url) => {
  const {vue} = System.getConfig().meta['*.vue'];
  const path = new URL(url.name).pathname;
  const response = await fetch(
    vue.compiler + '?component=' + encodeURIComponent(path));
  if(response.status !== 200) {
    const error = await response.json();
    let message = 'Could not compile SFC: ' + path + '\n';
    if(error.details && error.details.errors) {
      message += error.details.errors.join('\n');
    } else {
      message += JSON.stringify(error, null, 2);
    }
    throw new Error(message);
  }
  return response.text();
};

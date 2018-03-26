/*
 * Single File Vue Component Loader.
 */
/* global System, URL, fetch */
exports.fetch = async (url) => {
  const {vue} = System.getConfig().meta['*.vue'];
  const path = new URL(url.name).pathname;
  const response = await fetch(
    vue.compiler + '?component=' + encodeURIComponent(path));
  return response.text();
};

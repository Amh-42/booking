/* eslint-disable no-unused-expressions, no-var, prefer-template, vars-on-top, no-console, no-template-curly-in-string */

!(function () {
  if (!window.MemberSpace) {
    window.MemberSpace = {};
  }

  var currentBundleSource = '';
  var ENTRY_POINTS = {
    DEVELOPMENT: {
      js: 'http://localhost:3000/assets/index.js',
      css: 'http://localhost:3000/assets/index.css',
    },
    STAGING: { js: '//cdn.memberspace-staging.com/scripts/widgets.js' },
    PRODUCTION: {
      js: '//cdn.memberspace.com/scripts/widgets.js',
    },
  };

  window.MemberSpace.overrideBundle = function (rawSrc, rawEnvSet) {
    if (!rawSrc) {
      // Clear previous overrides
      sessionStorage.removeItem('ms-bundleSource');
      sessionStorage.removeItem('ms-envSet');

      window.location.reload();
      return 'CLEARED';
    }

    var src = rawSrc.toUpperCase();
    var envSet = rawEnvSet && rawEnvSet.toUpperCase();

    if (src !== 'DEVELOPMENT' && src !== 'STAGING' && src !== 'PRODUCTION')
      return "bundleSource must be one of [ 'DEVELOPMENT' / 'STAGING' / 'PRODUCTION' ]";

    if (
      envSet &&
      envSet !== 'DEVELOPMENT' &&
      envSet !== 'STAGING' &&
      envSet !== 'PRODUCTION'
    )
      return "envSet must be one of [ undef / 'DEVELOPMENT' / 'STAGING' / 'PRODUCTION' ]";

    // store bundleSource in LS
    sessionStorage.setItem('ms-bundleSource', src);

    // store envSet in LS
    if (envSet) {
      sessionStorage.setItem('ms-envSet', envSet);
    } else {
      sessionStorage.removeItem('ms-envSet');
    }

    window.location.reload();
    return 'OK';
  };

  function init() {
    var cdnBaseUrl = '//cdn.memberspace.com/widget/20240620T194103X501975072';

    var scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'module');
    scriptEl.setAttribute('src', cdnBaseUrl + '/scripts/main.js');
    document.getElementsByTagName('head')[0].appendChild(scriptEl);

    var linkEl = document.createElement('link');
    linkEl.setAttribute('rel', 'stylesheet');
    linkEl.setAttribute('type', 'text/css');
    linkEl.setAttribute('href', cdnBaseUrl + '/styles/widget.css');
    document.getElementsByTagName('head')[0].appendChild(linkEl);
  }

  function alternateInit(source) {
    // Inject the loader of another bundle
    console.warn(
      'Loading alternate (' + source + ') bundle from:',
      ENTRY_POINTS[source]
    );

    var scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'module');
    scriptEl.setAttribute('src', ENTRY_POINTS[source].js);
    document.getElementsByTagName('head')[0].appendChild(scriptEl);

    // On DEVELOPMENT we also need to load the CSS, since we are not injecting the loader
    if (ENTRY_POINTS[source].css) {
      var linkEl = document.createElement('link');
      linkEl.setAttribute('rel', 'stylesheet');
      linkEl.setAttribute('type', 'text/css');
      linkEl.setAttribute('href', ENTRY_POINTS[source].css);
      document.getElementsByTagName('head')[0].appendChild(linkEl);
    }
  }

  function testCapabilities() {
    // Do not redirect if check is disabled
    if (window.MemberSpace.disableOldBrowserRedirect) {
      return;
    }

    // Fail gracefully on "less than modern" browsers
    try {
      // Test global capabilities
      if (!Array.prototype.includes)
        throw new Error('Browser is not Array includes capable');
      if (!window.fetch) throw new Error('Browser is not fetch capable');
      if (!window.MutationObserver)
        throw new Error('Browser is not MutationObserver capable');
      if (!window.URL) throw new Error('Browser is not URL capable');
      if (!window.URLSearchParams)
        throw new Error('Browser is not URLSearchParams capable');
      if (!window.CustomEvent)
        throw new Error('Browser is not CustomEvent capable');
      if (!document.evaluate) throw new Error('Browser is not xpath capable');

      // if (!window.ResizeObserver)
      //  throw new Error('Browser is not ResizeObserver capable');

      if (!window.Intl)
        // https://formatjs.io/docs/react-intl/#runtime-requirements
        throw new Error('Browser is not Intl capable');
      if (!window.Intl.NumberFormat)
        throw new Error('Browser is not Intl.NumberFormat capable');
      if (!window.Intl.DateTimeFormat)
        throw new Error('Browser is not Intl.DateTimeFormat capable');
      if (!window.Intl.RelativeTimeFormat)
        throw new Error('Browser is not Intl.RelativeTimeFormat capable');

      // Test element capabilities
      var testEl = document.createElement('ms-test');
      if (!testEl.replaceWith)
        throw new Error('Browser is not element.replaceWith capable');

      if (!testEl.remove)
        throw new Error('Browser is not element.remove capable');

      // Test localStorage and sessionStorage (will throw if cookies are disabled)
      window.localStorage.setItem('ms-cap-test', true);
      window.localStorage.getItem('ms-cap-test');
      window.localStorage.removeItem('ms-cap-test');
      window.sessionStorage.setItem('ms-cap-test', true);
      window.sessionStorage.getItem('ms-cap-test');
      window.sessionStorage.removeItem('ms-cap-test');
    } catch (e) {
      console.error(
        'Memberspace widget: UA failed capabilities check: ' + e.message
      );
      var fallback = 'https://outdated-browser.com';
      if (window.MemberSpace && window.MemberSpace.subdomain) {
        fallback = fallback + '?subdomain=' + window.MemberSpace.subdomain;
      }
      window.location.href = fallback;
    }
  }

  // Check if bundle source is overridden. May throw if access is denied to sessionStorage
  try {
    var overrideBundleSource = sessionStorage.getItem('ms-bundleSource');
    if (overrideBundleSource && overrideBundleSource !== currentBundleSource) {
      alternateInit(overrideBundleSource);
      return;
    }
  } catch (e) {
    // noop
  }

  init();
  testCapabilities();
})();

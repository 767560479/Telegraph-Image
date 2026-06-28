(function (global) {
  var DEFAULT_NEXT = './admin-imgtc.html';

  function safeNext(raw) {
    if (!raw) return DEFAULT_NEXT;
    try {
      var decoded = decodeURIComponent(raw);
      if (decoded.indexOf('://') !== -1 || decoded.indexOf('//') === 0) return DEFAULT_NEXT;
      if (/^\.\/[a-zA-Z0-9_.-]+\.html(\?.*)?(#.*)?$/.test(decoded)) return decoded;
      if (/^\/admin[a-zA-Z0-9_.-]*\.html(\?.*)?(#.*)?$/.test(decoded)) return decoded;
    } catch (e) { /* ignore */ }
    return DEFAULT_NEXT;
  }

  global.AdminAuth = {
    DEFAULT_NEXT: DEFAULT_NEXT,
    safeNext: safeNext,
    loginUrl: function (next) {
      var target = safeNext(next || (global.location.pathname + global.location.search));
      return './login.html?next=' + encodeURIComponent(target);
    },
    redirectToLogin: function (next) {
      global.location.href = this.loginUrl(next);
    },
    logout: function () {
      return fetch('./api/manage/logout', { method: 'GET', credentials: 'include' })
        .finally(function () {
          global.location.href = '/';
        });
    },
    checkAuthEnabled: function () {
      return fetch('./api/manage/check', { method: 'GET', credentials: 'include' })
        .then(function (r) { return r.text(); });
    },
    ensureAuth: function () {
      return this.checkAuthEnabled().then(function (result) {
        if (result === 'Not using basic auth.') {
          return { enabled: false, authenticated: true };
        }
        return fetch('./api/manage/list?limit=1', { method: 'GET', credentials: 'include' })
          .then(function (r) {
            return { enabled: true, authenticated: r.ok };
          });
      });
    }
  };
})(window);

(function (global) {
  var toastEl = null;
  var loadingToast = null;

  function ensureToast() {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    return toastEl;
  }

  function showToast(message, type, duration) {
    var el = ensureToast();
    el.textContent = message;
    el.className = 'toast show' + (type ? ' toast--' + type : '');
    clearTimeout(showToast._t);
    if (duration !== 0) {
      showToast._t = setTimeout(function () {
        el.classList.remove('show');
      }, duration == null ? 3000 : duration);
    }
    return {
      close: function () {
        el.classList.remove('show');
      }
    };
  }

  function createModal(title, bodyHtml, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay is-open';
      overlay.innerHTML =
        '<div class="modal" role="dialog">' +
        (title ? '<div class="modal__title">' + title + '</div>' : '') +
        '<div class="modal__body">' + bodyHtml + '</div>' +
        '<div class="modal__actions">' +
        '<button type="button" class="button-secondary" data-action="cancel">' +
        (options.cancelButtonText || '取消') +
        '</button>' +
        '<button type="button" class="button-primary" data-action="confirm">' +
        (options.confirmButtonText || '确定') +
        '</button>' +
        '</div></div>';

      function close(result) {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        if (result) resolve(result);
        else reject(new Error('cancel'));
      }

      function onKey(e) {
        if (e.key === 'Escape') close(false);
      }

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(false);
      });
      overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () {
        close(false);
      });
      overlay.querySelector('[data-action="confirm"]').addEventListener('click', function () {
        var input = overlay.querySelector('textarea.text-input, textarea.textarea-input, input.text-input');
        close(input ? { value: input.value } : true);
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
      var focusEl = overlay.querySelector('.text-input, .textarea-input, [data-action="confirm"]');
      if (focusEl) focusEl.focus();
    });
  }

  global.AdminUI = {
    toast: showToast,
    confirm: function (message, title, options) {
      options = options || {};
      return createModal(title || '提示', '<p>' + message + '</p>', options);
    },
    prompt: function (message, title, options) {
      options = options || {};
      var isTextarea = options.inputType === 'textarea';
      var cls = isTextarea ? 'textarea-input text-input' : 'text-input';
      var inputHtml = options.message ? '<p>' + options.message + '</p>' : '';
      if (isTextarea) {
        inputHtml += '<textarea class="' + cls + '">' + (options.inputValue || '') + '</textarea>';
      } else {
        inputHtml += '<input class="' + cls + '" type="text" value="' + (options.inputValue || '').replace(/"/g, '&quot;') + '">';
      }
      return createModal(title || message || '', inputHtml, options).then(function (result) {
        if (options.inputValidator) {
          var err = options.inputValidator(result.value);
          if (err !== true) {
            showToast(err, 'error');
            return global.AdminUI.prompt(message, title, options);
          }
        }
        return result;
      });
    },
    installVue: function (Vue) {
      function message(opts) {
        if (typeof opts === 'string') opts = { message: opts };
        var typeMap = { success: 'success', error: 'error', warning: 'warning', info: '' };
        if (opts.duration === 0) {
          loadingToast = showToast(opts.message, typeMap[opts.type] || '', 0);
          return loadingToast;
        }
        return showToast(opts.message, typeMap[opts.type] || '', opts.duration);
      }
      message.success = function (text, duration) {
        return message({ message: text, type: 'success', duration: duration });
      };
      message.error = function (text, duration) {
        return message({ message: text, type: 'error', duration: duration });
      };
      message.warning = function (text, duration) {
        return message({ message: text, type: 'warning', duration: duration });
      };
      message.info = function (text, duration) {
        return message({ message: text, type: 'info', duration: duration });
      };
      Vue.prototype.$message = message;
      Vue.prototype.$confirm = function (message, title, options) {
        options = options || {};
        return global.AdminUI.confirm(message, title, {
          confirmButtonText: options.confirmButtonText,
          cancelButtonText: options.cancelButtonText
        });
      };
      Vue.prototype.$prompt = function (message, title, options) {
        return global.AdminUI.prompt(message, title, options || {});
      };
    },
    closeDropdowns: function (except) {
      document.querySelectorAll('.dropdown.is-open').forEach(function (el) {
        if (el !== except) el.classList.remove('is-open');
      });
    }
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown')) {
      global.AdminUI.closeDropdowns();
    }
  });

  showToast._t = null;
})(window);

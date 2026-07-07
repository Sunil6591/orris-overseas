/*
 * contact-resend.js
 * Makes the exported Divi contact forms actually send email via the
 * /api/contact serverless function (Resend). Runs on every page; it
 * auto-attaches to any Divi contact form present, so no per-form markup
 * changes are needed.
 */
(function () {
  'use strict';

  // Hide Divi's dead "2 + 15 =" math captcha. It's inert on the static site
  // (the server no longer validates it, and our submit handler ignores it);
  // spam is handled by the server-side honeypot instead. Injected as CSS so it
  // never blocks submission. The captcha lives in .et_pb_contact_right, a
  // sibling of the submit button, so hiding it leaves the rest of the form intact.
  (function hideCaptcha() {
    var css = '.et_pb_contact_form .et_pb_contact_right{display:none !important;}';
    var style = document.createElement('style');
    style.setAttribute('data-orris', 'hide-captcha');
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  })();

  function fieldValue(form, key) {
    // Divi names fields et_pb_contact_<key>_<n>; also match data-original_id.
    var el =
      form.querySelector('[name^="et_pb_contact_' + key + '_"]') ||
      form.querySelector('[data-original_id="' + key + '"] input, [data-original_id="' + key + '"] textarea');
    return el ? String(el.value || '').trim() : '';
  }

  function showStatus(form, ok, text) {
    var box = form.querySelector('.orris-form-status');
    if (!box) {
      box = document.createElement('p');
      box.className = 'orris-form-status';
      box.setAttribute('role', 'status');
      box.style.margin = '12px 0 0';
      box.style.padding = '10px 14px';
      box.style.borderRadius = '4px';
      box.style.fontSize = '14px';
      form.appendChild(box);
    }
    box.style.background = ok ? '#e7f6ec' : '#fdecec';
    box.style.color = ok ? '#1a7f37' : '#b42318';
    box.textContent = text;
  }

  function attach(form) {
    if (form.__orrisBound) return;
    form.__orrisBound = true;

    // Kill the dead Divi/Simply-Static action so nothing navigates away.
    form.setAttribute('action', '/api/contact');
    form.setAttribute('method', 'post');

    // Add a honeypot field (hidden from users; bots tend to fill it).
    if (!form.querySelector('[name="_gotcha"]')) {
      var hp = document.createElement('input');
      hp.type = 'text';
      hp.name = '_gotcha';
      hp.tabIndex = -1;
      hp.autocomplete = 'off';
      hp.setAttribute('aria-hidden', 'true');
      hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
      form.appendChild(hp);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var payload = {
        name: fieldValue(form, 'name'),
        email: fieldValue(form, 'email'),
        phone: fieldValue(form, 'phone'),
        message: fieldValue(form, 'message'),
        _gotcha: (form.querySelector('[name="_gotcha"]') || {}).value || '',
        page: location.pathname,
      };

      if (!payload.email || !payload.message) {
        showStatus(form, false, 'Please enter your email and a message.');
        return;
      }

      var submitBtn = form.querySelector('[type="submit"], button, .et_pb_contact_submit');
      if (submitBtn) submitBtn.disabled = true;
      showStatus(form, true, 'Sending…');

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (data) {
          if (data && data.ok) {
            form.reset();
            showStatus(form, true, 'Thanks — your message has been sent. We will get back to you shortly.');
          } else {
            showStatus(form, false, (data && data.error) || 'Could not send your message. Please try again.');
          }
        })
        .catch(function () {
          showStatus(form, false, 'Network error. Please try again later.');
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    }, true);
  }

  function init() {
    var forms = document.querySelectorAll('form.et_pb_contact_form');
    for (var i = 0; i < forms.length; i++) attach(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

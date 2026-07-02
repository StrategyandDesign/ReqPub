/* ReqPub v2 — sign in, password reset request, and reset completion. */
(function () {
  var cfg = window.SB_CFG || {};
  if (!cfg.url || !cfg.anon || !window.supabase) return;
  var sb = window.supabase.createClient(cfg.url, cfg.anon);

  var $ = function (id) { return document.getElementById(id); };
  var say = function (el, text, ok) { el.innerHTML = text ? '<div class="' + (ok ? 'ok' : 'err') + '">' + text.replace(/[<>&]/g, '') + '</div>' : ''; };

  // A recovery link lands here with type=recovery in the URL fragment.
  if ((location.hash || '').indexOf('type=recovery') >= 0) {
    $('paneSignin').style.display = 'none';
    $('paneReset').style.display = '';
  } else {
    // Already signed in? Straight to the app.
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) location.replace('/app/');
    });
  }

  $('signinForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('signinBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    say($('msg'), '');
    sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value })
      .then(function (r) {
        if (r.error) {
          btn.disabled = false; btn.textContent = 'Sign in';
          say($('msg'), r.error.message === 'Invalid login credentials'
            ? 'That email and password do not match. Check both, or use Forgot.'
            : r.error.message);
          return;
        }
        location.replace('/app/');
      });
  });

  $('forgotBtn').addEventListener('click', function () {
    var email = $('email').value.trim();
    if (!email) { say($('msg'), 'Enter your email above first, then press Forgot again.'); return; }
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/login/' })
      .then(function (r) {
        say($('msg'), r.error ? r.error.message : 'Reset link sent to ' + email + ' — check your inbox.', !r.error);
      });
  });

  $('resetBtn').addEventListener('click', function () {
    var pw = $('newPassword').value;
    if (pw.length < 8) { say($('msgReset'), 'Use at least 8 characters.'); return; }
    var btn = $('resetBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    sb.auth.updateUser({ password: pw }).then(function (r) {
      if (r.error) {
        btn.disabled = false; btn.textContent = 'Save password';
        say($('msgReset'), r.error.message);
        return;
      }
      say($('msgReset'), 'Password updated — taking you in…', true);
      setTimeout(function () { location.replace('/app/'); }, 700);
    });
  });
})();

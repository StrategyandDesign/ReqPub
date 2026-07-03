/* ReqPub v2 — sign in, password reset request, and reset completion. */
(function () {
  var cfg = window.SB_CFG || {};
  if (!cfg.url || !cfg.anon || !window.supabase) return;
  var sb = window.supabase.createClient(cfg.url, cfg.anon);

  var $ = function (id) { return document.getElementById(id); };
  var say = function (el, text, ok) { el.innerHTML = text ? '<div class="' + (ok ? 'ok' : 'err') + '">' + text.replace(/[<>&]/g, '') + '</div>' : ''; };

  // Recovery links arrive in two shapes depending on the project's auth flow:
  //   implicit:  /login/#access_token=…&type=recovery
  //   PKCE:      /login/?code=…
  // Either way a temporary session is established, so the signed-in
  // auto-redirect below MUST NOT run during recovery or the user is bounced
  // into the app before they can set a new password.
  var recovering =
    (location.hash || '').indexOf('type=recovery') >= 0 ||
    /[?&]code=/.test(location.search || '');

  function showReset() {
    recovering = true;
    $('paneSignin').style.display = 'none';
    $('paneReset').style.display = '';
  }

  // Expired or already-used links arrive as #error=…&error_description=…
  var errMatch = /error_description=([^&]+)/.exec(location.hash || '');
  if (errMatch) {
    say($('msg'), decodeURIComponent(errMatch[1].replace(/\+/g, ' ')) +
      ' Enter your email and press Forgot to get a fresh link.');
  }

  if (recovering) showReset();

  // Covers both flows definitively: Supabase fires PASSWORD_RECOVERY once the
  // recovery session is ready, whichever URL shape delivered it.
  sb.auth.onAuthStateChange(function (event) {
    if (event === 'PASSWORD_RECOVERY') showReset();
  });

  if (!recovering && !errMatch) {
    // Already signed in (and not resetting)? Straight to the app.
    sb.auth.getSession().then(function (r) {
      if (recovering) return;
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

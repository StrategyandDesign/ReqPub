/* ReqPub v2 — sign up. The display name travels in user metadata; the app
   copies it into user_profiles at first sign-in (works with or without
   email confirmation enabled). claim_invites() at first app load routes
   invited teammates and partners to the right workspace. */
(function () {
  var cfg = window.SB_CFG || {};
  if (!cfg.url || !cfg.anon || !window.supabase) return;
  var sb = window.supabase.createClient(cfg.url, cfg.anon);
  var $ = function (id) { return document.getElementById(id); };

  $('signupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('signupBtn');
    btn.disabled = true; btn.textContent = 'Creating…';
    $('msg').innerHTML = '';
    sb.auth.signUp({
      email: $('email').value.trim(),
      password: $('password').value,
      options: { data: { display_name: $('name').value.trim() } }
    }).then(function (r) {
      if (r.error) {
        btn.disabled = false; btn.textContent = 'Create account';
        $('msg').innerHTML = '<div class="err">' + String(r.error.message || 'Could not sign up').replace(/[<>&]/g, '') + '</div>';
        return;
      }
      if (r.data && r.data.session) { location.replace('/app/'); return; }
      $('msg').innerHTML = '<div class="ok"><strong>Check your email.</strong> We sent a confirmation link to ' +
        $('email').value.trim().replace(/[<>&]/g, '') + '. Open it, then sign in.</div>';
      btn.textContent = 'Account created';
    });
  });
})();

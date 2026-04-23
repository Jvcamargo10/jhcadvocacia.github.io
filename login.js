/* login.js — JHC ADV AGRO — Autenticação */

var ALL_PANELS = ['login', 'reg', 'staff', 'reset', 'reset-staff', 'nova-senha'];
var MAIN_TABS  = ['login', 'reg', 'staff'];

// ── SHOW TAB ──────────────────────────────────────────────
function showTab(t) {
  for (var i = 0; i < ALL_PANELS.length; i++) {
    var el = document.getElementById('p-' + ALL_PANELS[i]);
    if (el) el.classList.remove('act');
  }
  var target = document.getElementById('p-' + t);
  if (target) {
    target.classList.add('act');
  } else {
    var fb = document.getElementById('p-login');
    if (fb) fb.classList.add('act');
    t = 'login';
  }
  for (var j = 0; j < MAIN_TABS.length; j++) {
    var tb = document.getElementById('tb-' + MAIN_TABS[j]);
    if (tb) tb.classList.toggle('act', MAIN_TABS[j] === t);
  }
  clrAl('al-auth');
}

// ── LOGIN CLIENTE ─────────────────────────────────────────
function doLogin() {
  var em = (g('l-em') ? g('l-em').value : '').trim();
  var pw = g('l-pw') ? g('l-pw').value : '';
  if (!em || !pw) { shAl('al-auth', 'Preencha e-mail e senha.', 'e'); return; }
  var btn = g('bl');
  btn.innerHTML = '<span class="ld"></span>'; btn.disabled = true;
  q(function(s) { return s.auth.signInWithPassword({ email: em, password: pw }); })
    .then(function(res) {
      btn.innerHTML = 'Entrar'; btn.disabled = false;
      if (res.error) {
        if (res.error.message && res.error.message.indexOf('confirm') !== -1)
          return shAl('al-auth', 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.', 'w');
        return shAl('al-auth', 'E-mail ou senha incorretos.', 'e');
      }
      var remem = g('remem');
      if (remem && remem.checked) { localStorage.setItem('jhc_em', em); localStorage.setItem('jhc_rem', '1'); }
      else { localStorage.removeItem('jhc_em'); localStorage.removeItem('jhc_rem'); }
      window.CU = res.data.user;
      return q(function(s) { return s.from('profiles').select('*').eq('id', window.CU.id).single(); })
        .then(function(pr) {
          window.CP = pr.data || { full_name: window.CU.email, role: 'client' };
          localStorage.setItem('jhc_cu', JSON.stringify({ id: window.CU.id, email: window.CU.email }));
          localStorage.setItem('jhc_cp', JSON.stringify(window.CP));
          lgAct('login', 'Cliente logou: ' + (window.CP.full_name || window.CU.email), 'client');
          location.href = 'portalcliente.html';
        }).catch(function() {
          window.CP = { full_name: window.CU.email, role: 'client' };
          localStorage.setItem('jhc_cu', JSON.stringify({ id: window.CU.id, email: window.CU.email }));
          localStorage.setItem('jhc_cp', JSON.stringify(window.CP));
          location.href = 'portalcliente.html';
        });
    })
    .catch(function(e) {
      btn.innerHTML = 'Entrar'; btn.disabled = false;
      shAl('al-auth', e.message || 'Erro de conexão. Verifique sua internet.', 'e');
    });
}

// ── CADASTRO CLIENTE ──────────────────────────────────────
function doReg() {
  var nm  = (g('r-nm')  ? g('r-nm').value  : '').trim();
  var cpf = (g('r-cpf') ? g('r-cpf').value : '').trim();
  var em  = (g('r-em')  ? g('r-em').value  : '').trim();
  var ph  = (g('r-ph')  ? g('r-ph').value  : '').trim();
  var pw  = g('r-pw')  ? g('r-pw').value  : '';
  var pw2 = g('r-pw2') ? g('r-pw2').value : '';
  if (!nm || !em || !pw) { shAl('al-auth', 'Preencha os campos obrigatórios (*).', 'e'); return; }
  if (pw !== pw2) { shAl('al-auth', 'As senhas não coincidem.', 'e'); return; }
  if (pw.length < 8) { shAl('al-auth', 'Senha deve ter ao menos 8 caracteres.', 'e'); return; }
  var btn = g('br'); btn.innerHTML = '<span class="ld"></span>'; btn.disabled = true;
  q(function(s) {
    return s.auth.signUp({
      email: em, password: pw,
      options: { data: { full_name: nm }, emailRedirectTo: location.origin + '/login.html#nova-senha' }
    });
  }).then(function(res) {
    btn.innerHTML = 'Criar Minha Conta'; btn.disabled = false;
    if (res.error) {
      if (res.error.message && res.error.message.indexOf('already') !== -1)
        return shAl('al-auth', 'E-mail já cadastrado. Faça login.', 'e');
      return shAl('al-auth', res.error.message, 'e');
    }
    if (res.data && res.data.user) {
      window.CU = res.data.user;
      q(function(s) {
        return s.from('profiles').upsert({
          id: res.data.user.id, full_name: nm, cpf: cpf || null,
          phone: ph || null, email: em, role: 'client'
        });
      }).catch(function() {});
      var lEm = g('l-em'); if (lEm) lEm.value = em;
      var lPw = g('l-pw'); if (lPw) lPw.value = pw;
      if (res.data.session) {
        window.CP = { full_name: nm, cpf: cpf, phone: ph, email: em, role: 'client' };
        localStorage.setItem('jhc_cu', JSON.stringify({ id: window.CU.id, email: em }));
        localStorage.setItem('jhc_cp', JSON.stringify(window.CP));
        location.href = 'portalcliente.html';
      } else {
        shAl('al-auth',
          '✅ Conta criada! Confirme seu e-mail para entrar. ' +
          'Suas credenciais já estão preenchidas na aba <strong>Entrar</strong>.',
          's'
        );
        showTab('login');
      }
    }
  }).catch(function(e) {
    btn.innerHTML = 'Criar Minha Conta'; btn.disabled = false;
    shAl('al-auth', e.message || 'Erro ao criar conta.', 'e');
  });
}

// ── LOGIN FUNCIONÁRIO / ADMIN ─────────────────────────────
function doStaff() {
  var lg = (g('st-us') ? g('st-us').value : '').trim().toLowerCase();
  var pw = g('st-pw') ? g('st-pw').value : '';
  if (!lg || !pw) { shAl('al-auth', 'Preencha login e senha.', 'e'); return; }
  var btn = g('bst'); btn.innerHTML = '<span class="ld"></span>'; btn.disabled = true;
  q(function(s) { return s.from('lawyers').select('*').eq('staff_login', lg).maybeSingle(); })
    .then(function(res) {
      btn.innerHTML = 'Acessar Sistema Interno'; btn.disabled = false;
      var lw = res.data, error = res.error;
      if (error && error.code !== 'PGRST116') throw error;
      if (!lw) { shAl('al-auth', 'Login não encontrado. Verifique suas credenciais.', 'e'); return; }
      if (!lw.is_active) { shAl('al-auth', 'Conta desativada. Contate o administrador.', 'e'); return; }
      if (lw.staff_password !== pw) { shAl('al-auth', 'Senha incorreta.', 'e'); return; }
      localStorage.setItem('jhc_cs', JSON.stringify(lw));
      localStorage.setItem('jhc_first', lw.first_access ? '1' : '0');
      lgAct('login', 'Funcionário logou: ' + lw.staff_name, lw.staff_role);
      if (lw.staff_role === 'admin') location.href = 'portaladmin.html';
      else location.href = 'portalfuncionario.html';
    })
    .catch(function(e) {
      btn.innerHTML = 'Acessar Sistema Interno'; btn.disabled = false;
      shAl('al-auth', e.message || 'Erro de conexão.', 'e');
    });
}

// ── RESET SENHA CLIENTE ───────────────────────────────────
function doReset() {
  var em = (g('rst-em') ? g('rst-em').value : '').trim();
  if (!em) { shAl('al-reset', 'Informe seu e-mail.', 'e'); return; }
  var btn = g('brst'); btn.innerHTML = '<span class="ld"></span>'; btn.disabled = true;
  q(function(s) {
    return s.auth.resetPasswordForEmail(em, { redirectTo: location.origin + '/login.html#nova-senha' });
  }).then(function(res) {
    btn.innerHTML = 'Enviar Link de Redefinição'; btn.disabled = false;
    if (res.error) { shAl('al-reset', 'Erro: ' + res.error.message, 'e'); return; }
    shAl('al-reset', '✅ Link enviado para <strong>' + esc(em) + '</strong>. Verifique sua caixa de entrada e spam.', 's');
    if (g('rst-em')) g('rst-em').value = '';
  }).catch(function(e) {
    btn.innerHTML = 'Enviar Link de Redefinição'; btn.disabled = false;
    shAl('al-reset', e.message || 'Erro de conexão.', 'e');
  });
}

// ── RESET SENHA FUNCIONÁRIO ───────────────────────────────
function doResetStaff() {
  var lg = (g('rst-st-lg') ? g('rst-st-lg').value : '').trim().toLowerCase();
  var em = (g('rst-st-em') ? g('rst-st-em').value : '').trim();
  if (!lg || !em) { shAl('al-reset-staff', 'Preencha login e e-mail.', 'e'); return; }
  var btn = g('brst-st'); btn.innerHTML = '<span class="ld"></span>'; btn.disabled = true;
  q(function(s) { return s.from('lawyers').select('id,staff_name,is_active').eq('staff_login', lg).maybeSingle(); })
    .then(function(res) {
      btn.innerHTML = 'Solicitar Redefinição'; btn.disabled = false;
      var lw = res.data, error = res.error;
      if (error && error.code !== 'PGRST116') throw error;
      if (!lw) { shAl('al-reset-staff', 'Login não encontrado.', 'e'); return; }
      if (!lw.is_active) { shAl('al-reset-staff', 'Conta desativada. Contate o administrador.', 'e'); return; }
      return q(function(s) {
        return s.from('staff_password_resets').insert({
          lawyer_id: lw.id, staff_login: lg, requester_email: em, status: 'pending'
        });
      }).then(function() {
        return q(function(s) {
          return s.from('activity_logs').insert({
            actor_id: lw.id, actor_name: lw.staff_name, actor_role: 'staff',
            action_type: 'password_reset_request',
            action_detail: 'Solicitação de reset para: ' + lg + ' (' + em + ')'
          });
        });
      }).then(function() {
        shAl('al-reset-staff',
          '✅ Solicitação registrada! O administrador foi notificado e entrará em contato em <strong>' + esc(em) + '</strong>.',
          's'
        );
        if (g('rst-st-lg')) g('rst-st-lg').value = '';
        if (g('rst-st-em')) g('rst-st-em').value = '';
      });
    })
    .catch(function(e) {
      btn.innerHTML = 'Solicitar Redefinição'; btn.disabled = false;
      shAl('al-reset-staff', e.message || 'Erro de conexão.', 'e');
    });
}

// ── NOVA SENHA (via link email) ───────────────────────────
function confirmarNovaSenha() {
  var p1 = g('nova-pw1') ? g('nova-pw1').value : '';
  var p2 = g('nova-pw2') ? g('nova-pw2').value : '';
  if (!p1 || !p2) { shAl('al-nova', 'Preencha ambos os campos.', 'e'); return; }
  if (p1 !== p2) { shAl('al-nova', 'As senhas não coincidem.', 'e'); return; }
  if (p1.length < 8) { shAl('al-nova', 'Senha deve ter ao menos 8 caracteres.', 'e'); return; }
  q(function(s) { return s.auth.updateUser({ password: p1 }); })
    .then(function(res) {
      if (res.error) { shAl('al-nova', 'Erro: ' + res.error.message, 'e'); return; }
      shAl('al-nova', '✅ Senha atualizada com sucesso! Redirecionando...', 's');
      setTimeout(function() { location.href = 'portalcliente.html'; }, 2000);
    })
    .catch(function(e) { shAl('al-nova', e.message || 'Erro.', 'e'); });
}

// ── INICIALIZAÇÃO ─────────────────────────────────────────
(function() {
  initSB();

  // Restore saved email
  if (localStorage.getItem('jhc_rem') === '1') {
    var em = localStorage.getItem('jhc_em');
    var el = g('l-em'); if (em && el) el.value = em;
    var r  = g('remem'); if (r) r.checked = true;
  }

  // Read URL hash → open correct panel
  var hash = (location.hash || '').replace('#', '');
  if      (hash === 'reg')          showTab('reg');
  else if (hash === 'staff')        showTab('staff');
  else if (hash === 'reset')        showTab('reset');
  else if (hash === 'reset-staff')  showTab('reset-staff');
  else if (hash === 'nova-senha') {
    if (SB_OK) {
      sb.auth.getSession().then(function(res) {
        if (res.data && res.data.session && res.data.session.user) {
          showTab('nova-senha');
        } else {
          showTab('login');
          shAl('al-auth', 'Link de redefinição expirado. Solicite um novo clicando em "Esqueci a senha".', 'e');
        }
      }).catch(function() { showTab('login'); });
    } else { showTab('login'); }
  }
  else showTab('login');

  // If already logged in as client → go to portal
  if (SB_OK && hash !== 'nova-senha') {
    sb.auth.getSession().then(function(res) {
      if (res.data && res.data.session && res.data.session.user) {
        location.href = 'portalcliente.html';
      }
    }).catch(function() {});
  }
})();
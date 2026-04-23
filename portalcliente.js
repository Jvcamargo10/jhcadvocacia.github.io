/* portalcliente.js — JHC ADV AGRO */

window.CU = null;
window.CP = null;
window.CS = null;
var cases = [], chatInt = null, activeCaseId = null;

// ── INIT ─────────────────────────────────────────────────
function init() {
  initSB();
  if (!SB_OK) { location.href = 'login.html'; return; }
  sb.auth.getSession().then(function(res) {
    if (!res.data || !res.data.session || !res.data.session.user) {
      location.href = 'login.html'; return;
    }
    window.CU = res.data.session.user;
    return q(function(s) { return s.from('profiles').select('*').eq('id', window.CU.id).single(); })
      .then(function(pr) {
        window.CP = pr.data || { full_name: window.CU.email, role: 'client' };
        setupUI();
        showS('noticias');
        ldNews();
      }).catch(function() {
        window.CP = { full_name: window.CU.email, role: 'client' };
        setupUI();
        showS('noticias');
        ldNews();
      });
  }).catch(function() { location.href = 'login.html'; });
}

function setupUI() {
  var nm = window.CP.full_name || window.CU.email;
  var av = nm.split(' ').map(function(x) { return x[0]; }).join('').slice(0, 2).toUpperCase();
  var sbAv = document.getElementById('sb-av'); if (sbAv) sbAv.textContent = av;
  var sbNm = document.getElementById('sb-nm'); if (sbNm) sbNm.textContent = nm;
  // Auto-fill service request form with profile data
  fillAutoFields();
}

function fillAutoFields() {
  if (!window.CP) return;
  var fields = [
    ['np-nome', 'full_name'], ['np-cpf', 'cpf'],
    ['np-email', 'email'], ['np-tel', 'phone']
  ];
  fields.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el && window.CP[pair[1]]) el.value = window.CP[pair[1]];
  });
  if (window.CU) {
    var emailEl = document.getElementById('np-email');
    if (emailEl && !emailEl.value) emailEl.value = window.CU.email || '';
  }
}

// ── SECTION NAVIGATION ────────────────────────────────────
function navTo(section) {
  showS(section);
  if (section === 'noticias') ldNews();
  if (section === 'processos') ldProcs();
  if (section === 'chat') ldChats();
  if (section === 'perfil') fillPerfil();
  if (section === 'novo') fillAutoFields();
}

// ── NEWS ─────────────────────────────────────────────────
function ldNews() {
  var el = document.getElementById('news-grid');
  if (!el) return;
  var ICONS = ['📰','⚖️','🌾','📋','🏛','📌','💼','🔔'];
  el.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">Carregando notícias...</div></div>';
  q(function(s) {
    return s.from('news').select('*').eq('published', true)
      .order('published_at', { ascending: false }).limit(12);
  }).then(function(res) {
    var ns = res.data || [];
    if (!ns.length) {
      el.innerHTML = '<div class="empty"><div class="empty-i">📰</div><div class="empty-t">Nenhuma notícia publicada ainda.<br>Fique ligado nas novidades do escritório!</div></div>';
      return;
    }
    el.innerHTML = ns.map(function(n, i) {
      var icon = ICONS[i % ICONS.length];
      return '<div class="news-card">' +
        '<div class="nc-img">' + icon + '</div>' +
        '<div class="nc-body">' +
        (n.category ? '<div class="nc-cat">' + esc(n.category) + '</div>' : '') +
        '<div class="nc-tit">' + esc(n.title) + '</div>' +
        (n.excerpt ? '<div class="nc-exc">' + esc(n.excerpt) + '</div>' : '') +
        '<div class="nc-dt">📅 ' + fdatefull(n.published_at || n.created_at) + '</div>' +
        '</div></div>';
    }).join('');
  }).catch(function(e) {
    el.innerHTML = '<div class="empty"><div class="empty-i">⚠️</div><div class="empty-t">' + esc(e.message) + '</div></div>';
  });
}

// ── PROCESS LIST ─────────────────────────────────────────
function ldProcs() {
  var el = document.getElementById('proc-list');
  if (!el || !window.CU) return;
  el.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">Carregando...</div></div>';
  q(function(s) {
    return s.from('cases').select('*').eq('client_id', window.CU.id)
      .order('created_at', { ascending: false });
  }).then(function(res) {
    cases = res.data || [];
    if (!cases.length) {
      el.innerHTML = '<div class="empty"><div class="empty-i">📁</div><div class="empty-t">Nenhum processo ainda.<br><span class="flk" onclick="navTo(\'novo\')">Solicitar primeiro serviço →</span></div></div>';
      return;
    }
    el.innerHTML = cases.map(function(c) {
      return '<div class="pcard" onclick="viewProc(\'' + c.id + '\')">' +
        '<div class="pc-top"><div>' +
        '<div class="pc-num">' + esc(c.case_number || 'Nº pendente') + '</div>' +
        '<div class="pc-tit">' + esc(c.title) + '</div>' +
        '<div class="pc-typ">' + esc(c.case_type) + '</div>' +
        '</div>' + sbdg(c.status) + '</div>' +
        '<div class="pc-ft">' +
        '<span>📅 ' + fdate(c.created_at) + '</span>' +
        (c.court ? '<span>🏛 ' + esc(c.court) + '</span>' : '') +
        (c.lawyer_name ? '<span style="color:var(--gold)">⚖ ' + esc(c.lawyer_name) + '</span>' : '<span>Aguardando atribuição</span>') +
        '<span class="pc-link">Ver detalhes →</span></div></div>';
    }).join('');
  }).catch(function(e) {
    el.innerHTML = '<div class="empty"><div class="empty-i">⚠️</div><div class="empty-t">' + esc(e.message) + '</div></div>';
  });
}

// ── VIEW PROCESS ─────────────────────────────────────────
function viewProc(id) {
  var c = null;
  for (var i = 0; i < cases.length; i++) { if (cases[i].id === id) { c = cases[i]; break; } }
  if (!c) return;
  activeCaseId = id;
  var el = document.getElementById('proc-det-c');
  if (!el) return;

  Promise.all([
    q(function(s) { return s.from('case_updates').select('*').eq('case_id', id).eq('is_visible_to_client', true).order('created_at', { ascending: false }); }).catch(function() { return { data: [] }; }),
    q(function(s) { return s.from('case_files').select('*').eq('case_id', id).order('created_at', { ascending: false }); }).catch(function() { return { data: [] }; })
  ]).then(function(results) {
    var updates = results[0].data || [];
    var files   = results[1].data || [];

    el.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">' +
      '<div><h2 style="font-size:1.45rem;color:var(--white)">' + esc(c.title) + '</h2>' +
      '<div style="color:var(--muted);margin-top:.18rem">' + esc(c.case_type) + (c.case_number ? ' · Nº ' + esc(c.case_number) : '') + '</div></div>' +
      sbdg(c.status) + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">' +
      '<div class="sc"><div class="sc-l">Descrição</div><div style="font-size:.81rem;margin-top:.35rem;color:var(--muted);line-height:1.7">' + esc(c.description || '—') + '</div></div>' +
      '<div class="sc"><div class="sc-l">Informações</div><div style="font-size:.81rem;margin-top:.35rem">' +
      (c.court ? '<div>🏛 ' + esc(c.court) + '</div>' : '') +
      (c.opposing_party ? '<div>⚖ Parte: ' + esc(c.opposing_party) + '</div>' : '') +
      '<div style="color:var(--muted)">📅 ' + fdatefull(c.created_at) + '</div>' +
      '<div style="color:var(--gold);font-weight:600;margin-top:.25rem">⚖ ' + esc(c.lawyer_name || 'Aguardando atribuição') + '</div>' +
      '</div></div></div>' +
      (files.length ? '<div class="tw" style="margin-bottom:1.5rem"><div class="tw-top"><span class="tw-tit">📎 Documentos</span></div>' +
      '<div style="padding:.75rem 1rem;display:flex;flex-direction:column;gap:.42rem">' +
      files.map(function(f) {
        return '<div style="display:flex;align-items:center;gap:.85rem;padding:.55rem .85rem;background:var(--navy3);border-radius:var(--r);font-size:.8rem">' +
          '<span>📄</span><span style="flex:1">' + esc(f.file_name) + '</span>' +
          '<span style="font-size:.67rem;color:var(--muted)">' + fdate(f.created_at) + '</span>' +
          (f.file_url ? '<a href="' + f.file_url + '" target="_blank" style="color:var(--gold);font-size:.75rem">⬇ Baixar</a>' : '') +
          '</div>';
      }).join('') + '</div></div>' : '') +
      '<h3 style="font-size:.94rem;color:var(--white);margin-bottom:1.1rem;font-family:var(--sans);font-weight:700">📋 Andamento do Processo</h3>' +
      (updates.length ?
        '<div class="tl">' + updates.map(function(u) {
          return '<div class="tl-i"><div class="tl-dot"></div><div class="tl-dt">' + fdatefull(u.created_at) + '</div>' +
            '<div class="tl-box"><div class="tl-tit">' + esc(u.title) + '</div><div class="tl-txt">' + esc(u.description) + '</div></div></div>';
        }).join('') + '</div>' :
        '<div class="empty"><div class="empty-i">🔔</div><div class="empty-t">Nenhuma atualização ainda.<br>Nossa equipe atualizará assim que houver novidades.</div></div>') +
      (c.lawyer_id ? '<div style="margin-top:1.5rem"><button class="btn btn-o" onclick="openChat(\'' + c.id + '\',\'' + c.lawyer_id + '\',\'' + esc(c.lawyer_name || 'Advogado') + '\')">💬 Abrir Chat com o Responsável</button></div>' : '');

    showS('proc-det');
  });
}

// ── SUBMIT NEW PROCESS ────────────────────────────────────
function submitProc() {
  if (!window.CU) return;
  var tit  = (document.getElementById('np-tit')  ? document.getElementById('np-tit').value  : '').trim();
  var tp   = document.getElementById('np-tp')   ? document.getElementById('np-tp').value   : '';
  var desc = (document.getElementById('np-desc') ? document.getElementById('np-desc').value : '').trim();
  var num  = (document.getElementById('np-num')  ? document.getElementById('np-num').value  : '').trim();
  var court= (document.getElementById('np-court')? document.getElementById('np-court').value: '').trim();
  var opp  = (document.getElementById('np-opp')  ? document.getElementById('np-opp').value  : '').trim();
  if (!tit || !tp || !desc) { shAl('al-np', 'Preencha título, área e descrição.', 'e'); return; }
  var btn = document.getElementById('btn-np');
  btn.innerHTML = '<span class="ld"></span>'; btn.disabled = true;
  q(function(s) {
    return s.from('cases').insert({
      client_id: window.CU.id, title: tit, case_type: tp, description: desc,
      case_number: num || null, court: court || null, opposing_party: opp || null,
      status: 'pending', priority: 'normal'
    }).select().single();
  }).then(function(res) {
    if (res.error) throw res.error;
    var caseId = res.data.id;
    var uploaderName = window.CP ? (window.CP.full_name || 'Cliente') : 'Cliente';
    return uploadFiles(caseId, uploaderName, window.CU.id).then(function() {
      lgAct('new_case', 'Novo processo: ' + tit, 'client');
      btn.innerHTML = 'Enviar Solicitação'; btn.disabled = false;
      shAl('al-np', '✅ Solicitação enviada! Nossa equipe entrará em contato em breve.', 's');
      ['np-tit','np-tp','np-desc','np-num','np-court','np-opp'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
      });
      setTimeout(function() { navTo('processos'); }, 2500);
    });
  }).catch(function(e) {
    btn.innerHTML = 'Enviar Solicitação'; btn.disabled = false;
    shAl('al-np', e.message || 'Erro de conexão.', 'e');
  });
}

// ── CHAT ─────────────────────────────────────────────────
function ldChats() {
  var el = document.getElementById('chat-list-c');
  if (!el || !window.CU) return;
  q(function(s) { return s.from('cases').select('*').eq('client_id', window.CU.id).not('lawyer_id', 'is', null); })
    .then(function(res) {
      var cs = res.data || [];
      if (!cs.length) {
        el.innerHTML = '<div style="padding:1rem;font-size:.8rem;color:var(--muted)">Nenhum responsável atribuído ainda. Aguarde a equipe designar um advogado.</div>';
        return;
      }
      cases = cs;
      el.innerHTML = cs.map(function(c) {
        return '<div class="chat-item" onclick="openChat(\'' + c.id + '\',\'' + (c.lawyer_id || '') + '\',\'' + esc(c.lawyer_name || 'Advogado') + '\')">' +
          '<div class="chat-nm">⚖ ' + esc(c.lawyer_name || 'Advogado') + '</div>' +
          '<div class="chat-prev">' + esc((c.title || '').substring(0, 28)) + '</div></div>';
      }).join('');
      if (cs.length === 1) openChat(cs[0].id, cs[0].lawyer_id || '', cs[0].lawyer_name || 'Advogado');
    }).catch(function() {});
}

function openChat(caseId, lawyerId, lawyerName) {
  activeCaseId = caseId;
  var el = document.getElementById('chat-main');
  if (!el) return;
  el.innerHTML =
    '<div class="chat-hdr"><div class="chat-av">' + (lawyerName || 'A').charAt(0) + '</div>' +
    '<div><div class="chat-hn">' + esc(lawyerName) + '</div><div class="chat-hs">● Online</div></div></div>' +
    '<div class="chat-msgs" id="chat-msgs"></div>' +
    '<div class="chat-inp">' +
    '<input type="text" id="chat-inp" placeholder="Digite sua mensagem..." onkeypress="if(event.key===\'Enter\')sendMsg()">' +
    '<button class="csnd" onclick="sendMsg()">➤</button></div>';
  rfMsgs();
  if (chatInt) clearInterval(chatInt);
  chatInt = setInterval(rfMsgs, 6000);
}

function rfMsgs() {
  if (!activeCaseId) return;
  q(function(s) { return s.from('case_messages').select('*').eq('case_id', activeCaseId).order('created_at', { ascending: true }); })
    .then(function(res) {
      var el = document.getElementById('chat-msgs'); if (!el) return;
      var msgs = res.data || [];
      el.innerHTML = msgs.length ? msgs.map(function(m) {
        var mine = m.sender_id === (window.CU && window.CU.id);
        return '<div class="msg ' + (mine ? 's' : 'r') + '">' +
          '<div class="mb">' + esc(m.content) + '</div>' +
          '<div class="mt">' + esc(m.sender_name || '') + ' · ' + fdate(m.created_at) + '</div></div>';
      }).join('') : '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Inicie a conversa com o responsável pelo seu processo.</div>';
      el.scrollTop = el.scrollHeight;
    }).catch(function() {});
}

function sendMsg() {
  var inp = document.getElementById('chat-inp');
  if (!inp || !activeCaseId) return;
  var txt = inp.value.trim(); if (!txt) return;
  inp.value = '';
  q(function(s) {
    return s.from('case_messages').insert({
      case_id: activeCaseId, sender_id: window.CU.id,
      sender_name: window.CP ? (window.CP.full_name || 'Cliente') : 'Cliente',
      content: txt, sender_role: 'client'
    });
  }).then(function() { rfMsgs(); }).catch(function() {});
}

// ── PROFILE ───────────────────────────────────────────────
function fillPerfil() {
  if (!window.CP) return;
  var pairs = [['pf-nm','full_name'],['pf-cpf','cpf'],['pf-em','email'],['pf-ph','phone'],
               ['pf-bd','birth_date'],['pf-cep','zip_code'],['pf-end','address'],['pf-cid','city'],['pf-uf','state']];
  pairs.forEach(function(p) {
    var el = document.getElementById(p[0]);
    if (el && window.CP[p[1]]) el.value = window.CP[p[1]];
  });
  var emEl = document.getElementById('pf-em');
  if (emEl && window.CU) emEl.value = window.CP.email || window.CU.email || '';
}

function savePerfil() {
  var u = {
    full_name: (document.getElementById('pf-nm') ? document.getElementById('pf-nm').value : '').trim(),
    cpf:       (document.getElementById('pf-cpf')? document.getElementById('pf-cpf').value: '').trim(),
    phone:     (document.getElementById('pf-ph') ? document.getElementById('pf-ph').value : '').trim(),
    birth_date: document.getElementById('pf-bd') ? document.getElementById('pf-bd').value || null : null,
    zip_code:  (document.getElementById('pf-cep')? document.getElementById('pf-cep').value: '').trim(),
    address:   (document.getElementById('pf-end')? document.getElementById('pf-end').value: '').trim(),
    city:      (document.getElementById('pf-cid')? document.getElementById('pf-cid').value: '').trim(),
    state:     (document.getElementById('pf-uf') ? document.getElementById('pf-uf').value : '').trim(),
    updated_at: new Date().toISOString()
  };
  q(function(s) { return s.from('profiles').update(u).eq('id', window.CU.id); })
    .then(function(res) {
      if (res.error) { shAl('al-pf', res.error.message, 'e'); return; }
      window.CP = Object.assign({}, window.CP, u);
      var av = u.full_name.split(' ').map(function(x) { return x[0]; }).join('').slice(0, 2).toUpperCase();
      var sbAv = document.getElementById('sb-av'); if (sbAv) sbAv.textContent = av;
      var sbNm = document.getElementById('sb-nm'); if (sbNm) sbNm.textContent = u.full_name;
      fillAutoFields();
      shAl('al-pf', '✅ Perfil salvo com sucesso!', 's');
    }).catch(function(e) { shAl('al-pf', e.message || 'Erro.', 'e'); });
}

function chgPwCli() {
  var atual = document.getElementById('pw-atual') ? document.getElementById('pw-atual').value : '';
  var n1    = document.getElementById('pw-nova1') ? document.getElementById('pw-nova1').value : '';
  var n2    = document.getElementById('pw-nova2') ? document.getElementById('pw-nova2').value : '';
  if (!atual || !n1 || !n2) { shAl('al-pw-cli', 'Preencha todos os campos.', 'e'); return; }
  if (n1 !== n2) { shAl('al-pw-cli', 'As novas senhas não coincidem.', 'e'); return; }
  if (n1.length < 8) { shAl('al-pw-cli', 'Nova senha deve ter ao menos 8 caracteres.', 'e'); return; }
  q(function(s) { return s.auth.signInWithPassword({ email: window.CU.email, password: atual }); })
    .then(function(res) {
      if (res.error) { shAl('al-pw-cli', 'Senha atual incorreta.', 'e'); return; }
      return q(function(s) { return s.auth.updateUser({ password: n1 }); }).then(function(res2) {
        if (res2.error) { shAl('al-pw-cli', 'Erro: ' + res2.error.message, 'e'); return; }
        shAl('al-pw-cli', '✅ Senha alterada com sucesso!', 's');
        ['pw-atual','pw-nova1','pw-nova2'].forEach(function(id) {
          var el = document.getElementById(id); if (el) el.value = '';
        });
      });
    }).catch(function(e) { shAl('al-pw-cli', e.message || 'Erro.', 'e'); });
}

// ── LOGOUT ───────────────────────────────────────────────
function sair() {
  if (chatInt) clearInterval(chatInt);
  q(function(s) { return s.auth.signOut(); }).catch(function() {}).then(function() {
    ['jhc_cu','jhc_cp','jhc_cs','jhc_first','jhc_em'].forEach(function(k) { localStorage.removeItem(k); });
    location.href = 'login.html';
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);
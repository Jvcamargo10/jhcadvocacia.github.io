/* portalcliente.js — JHC ADV AGRO */

window.CU = null;
window.CP = null;
var _cases = [], _chatInt = null, _activeCaseId = null;

// ── AUTH GUARD — redireciona se não logado ─────────────────────
function init() {
  initSB();
  if (!SB_OK) { location.href = 'login.html'; return; }

  sb.auth.getSession().then(function (res) {
    if (!res.data || !res.data.session || !res.data.session.user) {
      location.href = 'login.html';
      return;
    }
    window.CU = res.data.session.user;
    return q(function (s) {
      return s.from('profiles').select('*').eq('id', window.CU.id).single();
    }).then(function (pr) {
      window.CP = pr.data || { full_name: window.CU.email, role: 'client' };
      _setupSidebar();
      navTo('noticias');
    }).catch(function () {
      window.CP = { full_name: window.CU.email, role: 'client' };
      _setupSidebar();
      navTo('noticias');
    });
  }).catch(function () { location.href = 'login.html'; });
}

function _setupSidebar() {
  var nm = (window.CP && window.CP.full_name) || (window.CU && window.CU.email) || 'Cliente';
  var av = nm.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase();
  var sbAv = g('sb-av'); if (sbAv) sbAv.textContent = av;
  var sbNm = g('sb-nm'); if (sbNm) sbNm.textContent = nm;
}

// ── NAVIGATION ────────────────────────────────────────────────
function navTo(section) {
  showS(section);
  if (section === 'noticias')  ldNews();
  if (section === 'processos') ldProcs();
  if (section === 'novo')      { fillAutoFields(); selFiles = []; rFL(); }
  if (section === 'chat')      ldChats();
  if (section === 'perfil')    fillPerfil();
}

// ── NOTÍCIAS ──────────────────────────────────────────────────
function ldNews() {
  var el = g('news-grid'); if (!el) return;
  var ICONS = ['📰','⚖️','🌾','📋','🏛','📌','💼','🔔','📢','🏆','📜'];
  el.style.display = 'block';
  el.innerHTML = '<div class="empty"><div class="empty-i" style="font-size:2rem">⏳</div>'
               + '<div class="empty-t">Carregando notícias...</div></div>';

  q(function (s) {
    return s.from('news').select('*').eq('published', true)
      .order('published_at', { ascending: false }).limit(20);
  }).then(function (res) {
    var ns = res.data || [];
    if (!ns.length) {
      el.innerHTML = '<div class="empty"><div class="empty-i">📰</div>'
        + '<div class="empty-t"><strong style="color:var(--white);display:block;margin-bottom:.5rem">'
        + 'Nenhuma notícia ainda</strong>'
        + 'Em breve a equipe trará novidades jurídicas para você!</div></div>';
      return;
    }
    el.style.display = 'grid';
    el.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    el.style.gap = '1.25rem';
    el.innerHTML = ns.map(function (n, i) {
      var icon = ICONS[i % ICONS.length];
      var cat  = n.category || '';
      var fileBtn = n.file_url
        ? '<a href="' + n.file_url + '" target="_blank" class="btn btn-o btn-sm" style="margin-top:.5rem;font-size:.72rem">📎 Ver Arquivo</a>'
        : '';
      var byLine = n.author_name
        ? ' · <span style="color:var(--gold)">' + esc(n.author_name) + '</span>' : '';
      return '<div class="news-card">'
        + '<div class="nc-img">' + icon + '</div>'
        + '<div class="nc-body">'
        + (cat ? '<div class="nc-cat">' + esc(cat) + '</div>' : '')
        + '<div class="nc-tit">' + esc(n.title) + '</div>'
        + (n.excerpt ? '<div class="nc-exc">' + esc(n.excerpt) + '</div>' : '')
        + '<div class="nc-dt">📅 ' + fdatefull(n.published_at || n.created_at) + byLine + '</div>'
        + fileBtn + '</div></div>';
    }).join('');
  }).catch(function (e) {
    el.style.display = 'block';
    el.innerHTML = '<div class="empty"><div class="empty-i">⚠️</div>'
      + '<div class="empty-t">Erro ao carregar: ' + esc(e.message) + '</div></div>';
  });
}

// ── PROCESSOS ─────────────────────────────────────────────────
var _allProcs = [];

function ldProcs() {
  var el = g('proc-list'); if (!el || !window.CU) return;
  el.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">Carregando...</div></div>';
  q(function (s) {
    return s.from('cases').select('*').eq('client_id', window.CU.id)
      .order('created_at', { ascending: false });
  }).then(function (res) {
    _allProcs = res.data || [];
    _renderProcs(_allProcs);
  }).catch(function (e) {
    el.innerHTML = '<div class="empty"><div class="empty-i">⚠️</div><div class="empty-t">' + esc(e.message) + '</div></div>';
  });
}

function filterProcs(status) {
  document.querySelectorAll('.psb-item').forEach(function (x) { x.classList.remove('act'); });
  if (event && event.target) event.target.classList.add('act');
  _renderProcs(status ? _allProcs.filter(function (c) { return c.status === status; }) : _allProcs);
}

function _renderProcs(list) {
  var el = g('proc-list'); if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="empty-i">📁</div>'
      + '<div class="empty-t">Nenhum processo' + (_allProcs.length ? ' nesta categoria' : ' ainda')
      + '.<br><span class="flk" onclick="navTo(\'novo\')">Solicitar serviço →</span></div></div>';
    return;
  }
  el.innerHTML = list.map(function (c) {
    return '<div class="pcard" onclick="viewProc(\'' + c.id + '\')">'
      + '<div class="pc-top"><div>'
      + '<div class="pc-num">' + esc(c.case_number || 'Nº pendente') + '</div>'
      + '<div class="pc-tit">' + esc(c.title) + '</div>'
      + '<div class="pc-typ">' + esc(c.case_type) + '</div></div>' + sbdg(c.status) + '</div>'
      + '<div class="pc-ft"><span>📅 ' + fdate(c.created_at) + '</span>'
      + (c.court ? '<span>🏛 ' + esc(c.court) + '</span>' : '')
      + (c.lawyer_name
          ? '<span style="color:var(--gold)">⚖ ' + esc(c.lawyer_name) + '</span>'
          : '<span style="color:var(--muted);font-style:italic">Aguardando advogado</span>')
      + '<span class="pc-link">Ver detalhes →</span></div></div>';
  }).join('');
}

// ── VER PROCESSO ──────────────────────────────────────────────
function viewProc(id) {
  _activeCaseId = id;
  var c = null;
  for (var i = 0; i < _allProcs.length; i++) if (_allProcs[i].id === id) { c = _allProcs[i]; break; }
  var load = c ? Promise.resolve(c)
    : q(function (s) { return s.from('cases').select('*').eq('id', id).single(); }).then(function (r) { return r.data; });

  load.then(function (c) {
    return Promise.all([
      q(function (s) {
        return s.from('case_updates').select('*').eq('case_id', id)
          .eq('is_visible_to_client', true).order('created_at', { ascending: false });
      }).catch(function () { return { data: [] }; }),
      q(function (s) {
        return s.from('case_files').select('*').eq('case_id', id).order('created_at', { ascending: false });
      }).catch(function () { return { data: [] }; })
    ]).then(function (results) {
      var updates = results[0].data || [], files = results[1].data || [];
      var el = g('proc-det-c'); if (!el) return;
      el.innerHTML = _buildProcDetail(c, updates, files);
      navTo('proc-det');
    });
  }).catch(function (e) { console.error('viewProc:', e); });
}

function _buildProcDetail(c, updates, files) {
  return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">'
    + '<div><h2 style="font-size:1.4rem;color:var(--white)">' + esc(c.title) + '</h2>'
    + '<div style="color:var(--muted);margin-top:.2rem">' + esc(c.case_type)
    + (c.case_number ? ' · Nº ' + esc(c.case_number) : '') + '</div></div>' + sbdg(c.status) + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.85rem;margin-bottom:1.5rem">'
    + '<div class="sc"><div class="sc-l">Descrição</div><div style="font-size:.81rem;margin-top:.35rem;color:var(--muted);line-height:1.7">' + esc(c.description || '—') + '</div></div>'
    + '<div class="sc"><div class="sc-l">Informações</div><div style="font-size:.81rem;margin-top:.35rem;line-height:1.8">'
    + (c.court ? '<div>🏛 ' + esc(c.court) + '</div>' : '')
    + (c.opposing_party ? '<div>⚖ Parte: ' + esc(c.opposing_party) + '</div>' : '')
    + '<div style="color:var(--muted)">📅 ' + fdatefull(c.created_at) + '</div>'
    + '<div style="color:var(--gold);font-weight:600">⚖ ' + esc(c.lawyer_name || 'Aguardando advogado') + '</div>'
    + '</div></div></div>'
    + (files.length ? '<div class="tw" style="margin-bottom:1.5rem"><div class="tw-top"><span class="tw-tit">📎 Documentos</span></div>'
      + '<div style="padding:.75rem 1rem;display:flex;flex-direction:column;gap:.4rem">'
      + files.map(function (f) {
          return '<div style="display:flex;align-items:center;gap:.85rem;padding:.55rem .85rem;background:var(--navy3);border-radius:var(--r);font-size:.8rem">'
            + '<span>📄</span><span style="flex:1">' + esc(f.file_name) + '</span>'
            + '<span style="font-size:.67rem;color:var(--muted)">' + fdate(f.created_at) + '</span>'
            + (f.file_url ? '<a href="' + f.file_url + '" target="_blank" style="color:var(--gold);font-size:.75rem">⬇ Baixar</a>' : '')
            + '</div>';
        }).join('') + '</div></div>' : '')
    + '<h3 style="font-size:.94rem;color:var(--white);margin-bottom:1rem;font-family:var(--sans);font-weight:700">📋 Andamento do Processo</h3>'
    + (updates.length
        ? '<div class="tl">' + updates.map(function (u) {
            return '<div class="tl-i"><div class="tl-dot"></div>'
              + '<div class="tl-dt">' + fdatefull(u.created_at) + '</div>'
              + '<div class="tl-box"><div class="tl-tit">' + esc(u.title) + '</div>'
              + '<div class="tl-txt">' + esc(u.description) + '</div></div></div>';
          }).join('') + '</div>'
        : '<div class="empty" style="padding:2rem 0"><div class="empty-i">🔔</div>'
          + '<div class="empty-t">Nenhuma atualização ainda.<br>Você será notificado quando houver novidades.</div></div>')
    + (c.lawyer_id
        ? '<div style="margin-top:1.5rem"><button class="btn btn-o" onclick="navTo(\'chat\')">'
          + '💬 Abrir Chat com o Responsável</button></div>'
        : '');
}

// ── SOLICITAR PROCESSO ────────────────────────────────────────
function fillAutoFields() {
  var CP = window.CP || {}, CU = window.CU || {};
  [['np-nome', CP.full_name || ''],
   ['np-cpf',  CP.cpf || ''],
   ['np-email', CP.email || CU.email || ''],
   ['np-tel',  CP.phone || '']
  ].forEach(function (p) { var el = g(p[0]); if (el) el.value = p[1]; });
}

function submitProc() {
  if (!window.CU) { location.href='login.html'; return; }
  var tit  = (g('np-tit')   ? g('np-tit').value   : '').trim();
  var tp   = g('np-tp')    ? g('np-tp').value    : '';
  var desc = (g('np-desc')  ? g('np-desc').value  : '').trim();
  var num  = (g('np-num')   ? g('np-num').value   : '').trim();
  var court= (g('np-court') ? g('np-court').value : '').trim();
  var opp  = (g('np-opp')  ? g('np-opp').value   : '').trim();
  if (!tit || !tp || !desc) { shAl('al-np', 'Preencha título, área e descrição.', 'e'); return; }
  var btn = g('btn-np'); btn.innerHTML = '<span class="ld"></span>'; btn.disabled = true;
  q(function (s) {
    return s.from('cases').insert({
      client_id: window.CU.id, title: tit, case_type: tp, description: desc,
      case_number: num || null, court: court || null, opposing_party: opp || null,
      status: 'pending', priority: 'normal'
    }).select().single();
  }).then(function (res) {
    if (res.error) throw res.error;
    var nm = window.CP ? (window.CP.full_name || 'Cliente') : 'Cliente';
    return uploadFiles(res.data.id, nm, window.CU.id).then(function () {
      lgAct('new_case', 'Novo processo: ' + tit, 'client');
      btn.innerHTML = 'Enviar Solicitação'; btn.disabled = false;
      shAl('al-np', '✅ Solicitação enviada! Nossa equipe entrará em contato em breve.', 's');
      ['np-tit','np-tp','np-desc','np-num','np-court','np-opp'].forEach(function (id) {
        var e = g(id); if (e) e.value = '';
      });
      selFiles = []; rFL();
      setTimeout(function () { navTo('processos'); }, 2500);
    });
  }).catch(function (e) {
    btn.innerHTML = 'Enviar Solicitação'; btn.disabled = false;
    shAl('al-np', e.message || 'Erro de conexão.', 'e');
  });
}

// ── CHAT ──────────────────────────────────────────────────────
function ldChats() {
  var el = g('chat-list-c'); if (!el || !window.CU) return;
  q(function (s) {
    return s.from('cases').select('*').eq('client_id', window.CU.id)
      .not('lawyer_id', 'is', null);
  }).then(function (res) {
    var cs = res.data || [];
    if (!cs.length) {
      el.innerHTML = '<div style="padding:1rem;font-size:.8rem;color:var(--muted);line-height:1.6">'
        + 'Nenhum advogado foi atribuído ainda.<br>Aguarde a equipe designar um responsável.</div>';
      return;
    }
    el.innerHTML = cs.map(function (c) {
      return '<div class="chat-item" onclick="openChat(\'' + c.id + '\',\''
        + esc(c.lawyer_name || 'Advogado') + '\')">'
        + '<div class="chat-nm">⚖ ' + esc(c.lawyer_name || 'Advogado') + '</div>'
        + '<div class="chat-prev">' + esc((c.title || '').substring(0, 30)) + '</div></div>';
    }).join('');
    if (cs.length === 1) openChat(cs[0].id, cs[0].lawyer_name || 'Advogado');
  }).catch(function () {});
}

function openChat(caseId, lawyerName) {
  _activeCaseId = caseId;
  var el = g('chat-main'); if (!el) return;
  el.innerHTML = '<div class="chat-hdr">'
    + '<div class="chat-av">' + (lawyerName || 'A').charAt(0) + '</div>'
    + '<div><div class="chat-hn">' + esc(lawyerName) + '</div>'
    + '<div class="chat-hs">Chat do processo</div></div></div>'
    + '<div class="chat-msgs" id="chat-msgs"></div>'
    + '<div class="chat-inp">'
    + '<input type="text" id="chat-inp" placeholder="Sua mensagem..." onkeypress="if(event.key===\'Enter\')sendMsg()">'
    + '<button class="csnd" onclick="sendMsg()">➤</button></div>';
  _rfMsgs();
  if (_chatInt) clearInterval(_chatInt);
  _chatInt = setInterval(_rfMsgs, 6000);
}

function _rfMsgs() {
  if (!_activeCaseId) return;
  q(function (s) {
    return s.from('case_messages').select('*').eq('case_id', _activeCaseId)
      .order('created_at', { ascending: true });
  }).then(function (res) {
    var el = g('chat-msgs'); if (!el) return;
    var msgs = res.data || [];
    el.innerHTML = msgs.length
      ? msgs.map(function (m) {
          var mine = m.sender_id === (window.CU && window.CU.id);
          return '<div class="msg ' + (mine ? 's' : 'r') + '">'
            + '<div class="mb">' + esc(m.content) + '</div>'
            + '<div class="mt">' + esc(m.sender_name || '') + ' · ' + fdate(m.created_at) + '</div></div>';
        }).join('')
      : '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Nenhuma mensagem ainda. Inicie a conversa!</div>';
    el.scrollTop = el.scrollHeight;
  }).catch(function () {});
}

function sendMsg() {
  var inp = g('chat-inp'); if (!inp || !_activeCaseId || !window.CU) return;
  var txt = inp.value.trim(); if (!txt) return; inp.value = '';
  q(function (s) {
    return s.from('case_messages').insert({
      case_id: _activeCaseId, sender_id: window.CU.id,
      sender_name: window.CP ? (window.CP.full_name || 'Cliente') : 'Cliente',
      content: txt, sender_role: 'client'
    });
  }).then(function () { _rfMsgs(); }).catch(function () {});
}

// ── ANÁLISE IA DE DOCUMENTO ───────────────────────────────────
function analisarDocumento(file) {
  var statusEl = g('ai-status'); if (!statusEl || !file) return;
  var validTypes = ['application/pdf','image/jpeg','image/jpg','image/png'];
  if (validTypes.indexOf(file.type) === -1) return;
  statusEl.innerHTML = '<div class="al al-i" style="display:flex;align-items:center;gap:.65rem">'
    + '<span class="ld"></span><span>🤖 Analisando documento com IA...</span></div>';
  var reader = new FileReader();
  reader.onload = function (e) {
    var b64 = e.target.result.split(',')[1];
    var mt  = file.type === 'application/pdf' ? 'application/pdf' : file.type;
    var msg = [
      { type: mt === 'application/pdf' ? 'document' : 'image',
        source: { type: 'base64', media_type: mt, data: b64 } },
      { type: 'text', text: 'Analise este documento jurídico e retorne JSON puro (sem markdown):\n{"titulo":"(max 80 chars)","area":"Direito do Agronegócio e Agrário|Tributário|Empresarial|Sucessório|Trabalhista|Penal-Econômico|Ambiental|Outros","numero_processo":"","descricao":"(max 400 chars)","vara":"","parte_contraria":""}' }
    ];
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800,
        messages: [{ role: 'user', content: msg }] })
    }).then(function (r) { return r.json(); }).then(function (data) {
      var txt = (data.content || []).filter(function (b) { return b.type === 'text'; })
                  .map(function (b) { return b.text; }).join('');
      var info = JSON.parse(txt.replace(/```json|```/g, '').trim());
      [['np-tit', info.titulo], ['np-num', info.numero_processo],
       ['np-desc', info.descricao], ['np-court', info.vara],
       ['np-opp', info.parte_contraria]].forEach(function (p) {
        var el = g(p[0]); if (el && p[1]) el.value = p[1];
      });
      if (info.area) {
        var sel = g('np-tp');
        if (sel) {
          for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].text.toLowerCase().indexOf(info.area.toLowerCase().slice(0,8)) > -1) {
              sel.selectedIndex = i; break;
            }
          }
        }
      }
      statusEl.innerHTML = '<div class="al al-s">✅ Campos preenchidos pela IA. Revise antes de enviar.</div>';
      setTimeout(function () { statusEl.innerHTML = ''; }, 6000);
    }).catch(function () {
      statusEl.innerHTML = '<div class="al al-w">⚠️ Não foi possível analisar. Preencha manualmente.</div>';
      setTimeout(function () { statusEl.innerHTML = ''; }, 5000);
    });
  };
  reader.readAsDataURL(file);
}

// ── PERFIL ────────────────────────────────────────────────────
function fillPerfil() {
  if (!window.CP) return;
  var map = [['pf-nm','full_name'],['pf-cpf','cpf'],['pf-ph','phone'],
             ['pf-bd','birth_date'],['pf-cep','zip_code'],
             ['pf-end','address'],['pf-cid','city'],['pf-uf','state']];
  map.forEach(function (p) { var el = g(p[0]); if (el && window.CP[p[1]]) el.value = window.CP[p[1]]; });
  var emEl = g('pf-em');
  if (emEl) emEl.value = (window.CP && window.CP.email) || (window.CU && window.CU.email) || '';
}

function savePerfil() {
  if (!window.CU) return;
  var u = {
    full_name: (g('pf-nm')  ? g('pf-nm').value  : '').trim(),
    cpf:       (g('pf-cpf') ? g('pf-cpf').value : '').trim(),
    phone:     (g('pf-ph')  ? g('pf-ph').value  : '').trim(),
    birth_date: g('pf-bd')  ? g('pf-bd').value || null : null,
    zip_code:  (g('pf-cep') ? g('pf-cep').value : '').trim(),
    address:   (g('pf-end') ? g('pf-end').value : '').trim(),
    city:      (g('pf-cid') ? g('pf-cid').value : '').trim(),
    state:     (g('pf-uf')  ? g('pf-uf').value  : '').trim(),
    updated_at: new Date().toISOString()
  };
  q(function (s) { return s.from('profiles').update(u).eq('id', window.CU.id); })
    .then(function (res) {
      if (res.error) { shAl('al-pf', res.error.message, 'e'); return; }
      window.CP = Object.assign({}, window.CP, u);
      _setupSidebar();
      shAl('al-pf', '✅ Perfil salvo com sucesso!', 's');
    }).catch(function (e) { shAl('al-pf', e.message || 'Erro.', 'e'); });
}

function chgPwCli() {
  if (!window.CU) return;
  var atual = g('pw-atual') ? g('pw-atual').value : '';
  var n1    = g('pw-nova1') ? g('pw-nova1').value : '';
  var n2    = g('pw-nova2') ? g('pw-nova2').value : '';
  if (!atual || !n1 || !n2) { shAl('al-pw-cli', 'Preencha todos os campos.', 'e'); return; }
  if (n1 !== n2)            { shAl('al-pw-cli', 'As senhas não coincidem.', 'e'); return; }
  if (n1.length < 8)        { shAl('al-pw-cli', 'Mínimo 8 caracteres.', 'e'); return; }
  q(function (s) { return s.auth.signInWithPassword({ email: window.CU.email, password: atual }); })
    .then(function (res) {
      if (res.error) { shAl('al-pw-cli', 'Senha atual incorreta.', 'e'); return; }
      return q(function (s) { return s.auth.updateUser({ password: n1 }); }).then(function (res2) {
        if (res2.error) { shAl('al-pw-cli', 'Erro: ' + res2.error.message, 'e'); return; }
        shAl('al-pw-cli', '✅ Senha alterada com sucesso!', 's');
        ['pw-atual','pw-nova1','pw-nova2'].forEach(function (id) { var e = g(id); if (e) e.value = ''; });
      });
    }).catch(function (e) { shAl('al-pw-cli', e.message || 'Erro.', 'e'); });
}

// ── SAIR ──────────────────────────────────────────────────────
function sair() {
  if (_chatInt) clearInterval(_chatInt);
  q(function (s) { return s.auth.signOut(); }).catch(function () {}).then(function () {
    ['jhc_cu','jhc_cp','jhc_cs','jhc_first','jhc_em'].forEach(function (k) { localStorage.removeItem(k); });
    location.href = 'index.html';
  });
}

document.addEventListener('DOMContentLoaded', init);

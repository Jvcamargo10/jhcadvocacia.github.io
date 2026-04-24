/* portalfuncionario.js — JHC ADV AGRO */

window.CU = null; window.CP = null; window.CS = null;
var myCases = [], chatInt = null, activeCaseId = null, firstLogin = false;

function init() {
  initSB();
  var csData = localStorage.getItem('jhc_cs');
  if (!csData) { location.href = 'index.html'; return; }
  try { window.CS = JSON.parse(csData); } catch(e) { location.href = 'index.html'; return; }
  if (!window.CS || !window.CS.id) { location.href = 'index.html'; return; }
  firstLogin = localStorage.getItem('jhc_first') === '1';
  if (window.CS.staff_role === 'admin') { location.href = 'portaladmin.html'; return; }
  var nm = window.CS.staff_name || 'Funcionário';
  var av = nm.split(' ').map(function(x){return x[0];}).join('').slice(0,2).toUpperCase();
  var sbav = g('sb-av'); if (sbav) sbav.textContent = av;
  var sbnm = g('sb-nm'); if (sbnm) sbnm.textContent = nm;
  var sbrl = g('sb-role'); if (sbrl) sbrl.textContent = window.CS.staff_role === 'lawyer' ? 'Advogado(a)' : (window.CS.staff_role || 'Funcionário');
  var gr = g('greet'); if (gr) gr.textContent = 'Olá, ' + nm.split(' ')[0] + ' 👋';
  if (firstLogin) {
    var b = g('pw-banner'); if (b) b.style.display = 'flex';
    showS('perfil');
    shAl('al-pf', '🔒 Defina sua nova senha para continuar.', 'w');
  } else {
    showS('dash'); ldDash();
  }
}

function navTo(n) {
  showS(n);
  if (n === 'dash') ldDash();
  if (n === 'meus-proc') ldProcs();
  if (n === 'chats') ldAllChats();
  if (n === 'perfil') fillPerfil();
  if (n === 'noticias') ldNoticiasFunc();
}

function ldDash() {
  var el = g('dash-tb'); if (!el) return;
  el.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">Carregando...</div></div>';
  q(function(s) {
    return s.from('cases').select('*, profiles(full_name,email)').eq('lawyer_id', window.CS.id).order('updated_at', {ascending:false});
  }).then(function(res) {
    myCases = res.data || [];
    var sv = function(id,v){var e=g(id);if(e)e.textContent=v;};
    sv('st1', myCases.length);
    sv('st2', myCases.filter(function(x){return x.status==='pending';}).length);
    sv('st3', myCases.filter(function(x){return x.status==='active'||x.status==='in_review';}).length);
    sv('st4', myCases.filter(function(x){return x.status==='concluded';}).length);
    if (!myCases.length) { el.innerHTML = '<div class="empty"><div class="empty-i">📁</div><div class="empty-t">Nenhum processo delegado a você ainda.</div></div>'; return; }
    el.innerHTML = '<div class="tsc"><table><thead><tr><th>Título</th><th>Cliente</th><th>Status</th><th>Área</th><th>Data</th><th>Ações</th></tr></thead><tbody>' +
      myCases.slice(0,6).map(function(c) {
        var pf = c.profiles || {};
        return '<tr><td><strong>' + esc(c.title) + '</strong></td>' +
          '<td style="color:var(--muted)">' + esc(pf.full_name || '—') + '</td>' +
          '<td>' + sbdg(c.status) + '</td>' +
          '<td style="color:var(--muted)">' + esc(c.case_type) + '</td>' +
          '<td style="color:var(--muted)">' + fdate(c.created_at) + '</td>' +
          '<td><button class="btn btn-gh btn-sm" onclick="viewProc(\'' + c.id + '\')">Abrir</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }).catch(function(e) { el.innerHTML = '<div class="empty"><div class="empty-i">⚠️</div><div class="empty-t">' + esc(e.message) + '</div></div>'; });
}

function ldProcs() {
  var el = g('proc-list'); if (!el) return;
  el.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">Carregando...</div></div>';
  q(function(s) {
    return s.from('cases').select('*, profiles(full_name,email,phone)').eq('lawyer_id', window.CS.id).order('updated_at', {ascending:false});
  }).then(function(res) {
    myCases = res.data || [];
    if (!myCases.length) { el.innerHTML = '<div class="empty"><div class="empty-i">📁</div><div class="empty-t">Nenhum processo delegado a você ainda.</div></div>'; return; }
    el.innerHTML = myCases.map(function(c) {
      var pf = c.profiles || {};
      return '<div class="pcard" onclick="viewProc(\'' + c.id + '\')">' +
        '<div class="pc-top"><div><div class="pc-num">' + esc(c.case_number || 'Nº pendente') + '</div>' +
        '<div class="pc-tit">' + esc(c.title) + '</div>' +
        '<div class="pc-typ">' + esc(c.case_type) + ' — <strong style="color:var(--white)">' + esc(pf.full_name || 'Cliente') + '</strong></div></div>' +
        sbdg(c.status) + '</div>' +
        '<div class="pc-ft"><span>📅 ' + fdate(c.created_at) + '</span>' +
        (c.court ? '<span>🏛 ' + esc(c.court) + '</span>' : '') +
        '<button class="btn btn-g btn-sm" style="margin-left:auto" onclick="event.stopPropagation();viewProc(\'' + c.id + '\')">Abrir</button></div></div>';
    }).join('');
  }).catch(function(e) { el.innerHTML = '<div class="empty"><div class="empty-i">⚠️</div><div class="empty-t">' + esc(e.message) + '</div></div>'; });
}

function viewProc(id) {
  activeCaseId = id;
  var c = null;
  for (var i = 0; i < myCases.length; i++) { if (myCases[i].id === id) { c = myCases[i]; break; } }
  var loadCase = c ? Promise.resolve(c) : q(function(s){ return s.from('cases').select('*, profiles(full_name,email,phone)').eq('id',id).single(); }).then(function(r){ return r.data; });

  loadCase.then(function(c) {
    return Promise.all([
      q(function(s){ return s.from('case_updates').select('*').eq('case_id',id).order('created_at',{ascending:false}); }).catch(function(){return {data:[]};}),
      q(function(s){ return s.from('case_files').select('*').eq('case_id',id).order('created_at',{ascending:false}); }).catch(function(){return {data:[]};})
    ]).then(function(results) {
      var updates = results[0].data || [], files = results[1].data || [];
      var pf = c.profiles || {};
      var el = g('proc-det-c'); if (!el) return;
      el.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">' +
        '<div><h2 style="font-size:1.45rem;color:var(--white)">' + esc(c.title) + '</h2>' +
        '<div style="color:var(--muted);margin-top:.18rem">' + esc(c.case_type) + (c.case_number ? ' · Nº ' + esc(c.case_number) : '') + '</div></div>' + sbdg(c.status) + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.85rem;margin-bottom:1.5rem">' +
        '<div class="sc"><div class="sc-l">Cliente</div><div style="font-size:.88rem;font-weight:700;color:var(--white);margin-top:.3rem">' + esc(pf.full_name || '—') + '</div>' +
        '<div style="font-size:.74rem;color:var(--muted)">' + esc(pf.email || '') + '</div>' +
        (pf.phone ? '<div style="font-size:.74rem;color:var(--gold)">' + esc(pf.phone) + '</div>' : '') + '</div>' +
        '<div class="sc"><div class="sc-l">Descrição</div><div style="font-size:.8rem;margin-top:.3rem;color:var(--muted);line-height:1.62">' + esc(c.description || '—') + '</div></div>' +
        (c.court ? '<div class="sc"><div class="sc-l">Vara/Tribunal</div><div style="font-size:.86rem;margin-top:.3rem">' + esc(c.court) + '</div></div>' : '') + '</div>' +
        (files.length ? '<div class="tw" style="margin-bottom:1.5rem"><div class="tw-top"><span class="tw-tit">📎 Arquivos</span></div><div style="padding:.75rem 1rem;display:flex;flex-direction:column;gap:.42rem">' +
          files.map(function(f){ return '<div style="display:flex;align-items:center;gap:.85rem;padding:.55rem .85rem;background:var(--navy3);border-radius:var(--r);font-size:.8rem"><span>📄</span><span style="flex:1">' + esc(f.file_name) + '</span><span style="font-size:.67rem;color:var(--muted)">' + fdate(f.created_at) + '</span>' + (f.file_url ? '<a href="' + f.file_url + '" target="_blank" style="color:var(--gold);font-size:.75rem">⬇ Baixar</a>' : '') + '</div>'; }).join('') +
          '</div></div>' : '') +
        '<h3 style="font-size:.94rem;color:var(--white);margin-bottom:1.1rem;font-family:var(--sans);font-weight:700">📋 Histórico</h3>' +
        (updates.length ? '<div class="tl">' + updates.map(function(u){
          return '<div class="tl-i"><div class="tl-dot"></div><div class="tl-dt">' + fdatefull(u.created_at) + ' ' +
            (u.is_visible_to_client ? '<span style="color:var(--gold);font-size:.62rem">• Visível ao cliente</span>' : '<span style="color:var(--muted);font-size:.62rem">• Interno</span>') + '</div>' +
            '<div class="tl-box"><div class="tl-tit">' + esc(u.title) + '</div><div class="tl-txt">' + esc(u.description) + '</div></div></div>';
        }).join('') + '</div>' : '<div class="empty"><div class="empty-i">🔔</div><div class="empty-t">Nenhuma atualização ainda.</div></div>');

      // Chat setup
      var chatAv = g('chat-av'); if (chatAv) chatAv.textContent = (pf.full_name || 'C').charAt(0);
      var chatHn = g('chat-hn'); if (chatHn) chatHn.textContent = pf.full_name || 'Cliente';
      var clc = g('chat-list-c');
      if (clc) clc.innerHTML = '<div class="chat-item act"><div class="chat-nm">👤 ' + esc(pf.full_name || 'Cliente') + '</div><div class="chat-prev">' + esc((c.title || '').substring(0,28)) + '</div></div>';
      rfMsgs();
      if (chatInt) clearInterval(chatInt);
      chatInt = setInterval(rfMsgs, 6000);
      showS('proc-det');
    });
  }).catch(function(e) { console.error('viewProc:', e); });
}

function salvarUpd() {
  var tit  = (g('upd-tit') ? g('upd-tit').value : '').trim();
  var desc = (g('upd-desc')? g('upd-desc').value: '').trim();
  var st   = g('upd-st')  ? g('upd-st').value   : '';
  var vis  = g('upd-vis') ? g('upd-vis').checked : true;
  if (!tit || !desc) { shAl('al-upd', 'Preencha título e descrição.', 'e'); return; }
  var saves = [];
  saves.push(q(function(s){ return s.from('case_updates').insert({case_id:activeCaseId,title:tit,description:desc,is_visible_to_client:vis,author_id:window.CS.id}); }));
  if (st) saves.push(q(function(s){ return s.from('cases').update({status:st,updated_at:new Date().toISOString()}).eq('id',activeCaseId); }));
  Promise.all(saves).then(function() {
    if (selFiles.length) return uploadFiles(activeCaseId, window.CS.staff_name, window.CS.id);
  }).then(function() {
    lgAct('update_case', 'Processo atualizado por ' + window.CS.staff_name, window.CS.staff_role);
    shAl('al-upd', '✅ Atualização salva com sucesso!', 's');
    var ut = g('upd-tit'); if (ut) ut.value = '';
    var ud = g('upd-desc'); if (ud) ud.value = '';
    var us = g('upd-st'); if (us) us.value = '';
    viewProc(activeCaseId);
  }).catch(function(e) { shAl('al-upd', e.message || 'Erro.', 'e'); });
}

function rfMsgs() {
  if (!activeCaseId) return;
  q(function(s){ return s.from('case_messages').select('*').eq('case_id',activeCaseId).order('created_at',{ascending:true}); })
    .then(function(res) {
      var el = g('chat-msgs'); if (!el) return;
      var msgs = res.data || [];
      el.innerHTML = msgs.length ? msgs.map(function(m) {
        var mine = (m.sender_role === 'lawyer' || m.sender_role === 'admin') || m.sender_id === (window.CS && window.CS.id);
        return '<div class="msg ' + (mine ? 's' : 'r') + '"><div class="mb">' + esc(m.content) + '</div>' +
          '<div class="mt">' + esc(m.sender_name || '') + ' · ' + fdate(m.created_at) + '</div></div>';
      }).join('') : '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Nenhuma mensagem ainda.</div>';
      el.scrollTop = el.scrollHeight;
    }).catch(function(){});
}

function sendMsg() {
  var inp = g('chat-inp'); if (!inp || !activeCaseId) return;
  var txt = inp.value.trim(); if (!txt) return; inp.value = '';
  q(function(s){ return s.from('case_messages').insert({case_id:activeCaseId,sender_id:window.CS.id,sender_name:window.CS.staff_name,content:txt,sender_role:window.CS.staff_role}); })
    .then(function(){ rfMsgs(); }).catch(function(){});
}

function ldAllChats() {
  var el = g('all-chats-list'); if (!el) return;
  el.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">Carregando...</div></div>';
  q(function(s){ return s.from('cases').select('*, profiles(full_name)').eq('lawyer_id',window.CS.id); })
    .then(function(res) {
      var cs = res.data || [];
      if (!cs.length) { el.innerHTML = '<div class="empty"><div class="empty-i">💬</div><div class="empty-t">Nenhum processo delegado ainda.</div></div>'; return; }
      el.innerHTML = cs.map(function(c) {
        var pf = c.profiles || {};
        return '<div class="pcard" onclick="viewProc(\'' + c.id + '\')"><div class="pc-top"><div><div class="pc-tit">💬 ' + esc(pf.full_name || 'Cliente') + '</div><div class="pc-typ">' + esc(c.title) + '</div></div>' + sbdg(c.status) + '</div><div class="pc-ft"><span class="pc-link">Abrir chat →</span></div></div>';
      }).join('');
    }).catch(function(e) { el.innerHTML = '<div class="empty"><div class="empty-i">⚠️</div><div class="empty-t">' + esc(e.message) + '</div></div>'; });
}

function fillPerfil() {
  if (!window.CS) return;
  var nm = g('pf-nm'); if (nm) nm.value = window.CS.staff_name || '';
  var lg = g('pf-lg'); if (lg) lg.value = window.CS.staff_login || '';
  var ro = g('pf-ro'); if (ro) ro.value = window.CS.staff_role === 'lawyer' ? 'Advogado(a)' : (window.CS.staff_role || '');
}

function chgPw() {
  if (!window.CS || !window.CS.id) { shAl('al-pf', 'Sessão inválida. Faça login novamente.', 'e'); return; }
  var p1 = g('pw1') ? g('pw1').value : '', p2 = g('pw2') ? g('pw2').value : '';
  if (!p1||!p2) { shAl('al-pf','Preencha ambos os campos.','e'); return; }
  if (p1!==p2) { shAl('al-pf','As senhas não coincidem.','e'); return; }
  if (p1.length<8) { shAl('al-pf','Senha deve ter ao menos 8 caracteres.','e'); return; }
  q(function(s){ return s.from('lawyers').update({staff_password:p1,first_access:false}).eq('id',window.CS.id); })
    .then(function(res) {
      if (res.error) { shAl('al-pf','Erro: '+res.error.message,'e'); return; }
      window.CS.staff_password = p1; window.CS.first_access = false;
      localStorage.setItem('jhc_cs', JSON.stringify(window.CS));
      localStorage.setItem('jhc_first','0');
      firstLogin = false;
      var b = g('pw-banner'); if (b) b.style.display = 'none';
      shAl('al-pf','✅ Senha alterada com sucesso!','s');
      var p1e = g('pw1'); if(p1e) p1e.value='';
      var p2e = g('pw2'); if(p2e) p2e.value='';
      showS('dash'); ldDash();
    }).catch(function(e){ shAl('al-pf',e.message||'Erro.','e'); });
}

// ── NOTÍCIAS (funcionário) ────────────────────────────────
var newsFile = null;

function hNewsFile(files) {
  if (!files || !files.length) return;
  newsFile = files[0];
  var el = document.getElementById('news-file-name');
  if (el) el.textContent = '📄 ' + newsFile.name + ' (' + (newsFile.size/1024).toFixed(0) + 'KB)';
}

function ldNoticiasFunc() {
  var el = g('func-news-tb'); if (!el) return;
  el.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)"><span class="ld"></span> Carregando...</td></tr>';
  q(function(s) { return s.from('news').select('*').order('created_at', {ascending:false}); })
    .then(function(res) {
      var ns = res.data || [];
      if (!ns.length) {
        el.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Nenhuma notícia publicada ainda. Clique em "+ Nova Notícia" para começar.</td></tr>';
        return;
      }
      el.innerHTML = ns.map(function(n) {
        return '<tr>' +
          '<td><strong>' + esc(n.title) + '</strong></td>' +
          '<td style="color:var(--muted)">' + esc(n.category||'Geral') + '</td>' +
          '<td style="color:var(--muted)">' + esc(n.author_name||'—') + '</td>' +
          '<td>' + (n.published ? '<span class="bdg ba">Publicada</span>' : '<span class="bdg bp">Rascunho</span>') + '</td>' +
          '<td style="color:var(--muted)">' + fdate(n.created_at) + '</td>' +
          '<td><button class="btn btn-d btn-sm" onclick="delNoticia('' + n.id + '')">Remover</button></td>' +
          '</tr>';
      }).join('');
    }).catch(function(e) {
      el.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#f08080">' + esc(e.message) + '</td></tr>';
    });
}

function salvarNewsFunc() {
  var ti = (g('fnw-ti') ? g('fnw-ti').value : '').trim();
  var co = (g('fnw-co') ? g('fnw-co').value : '').trim();
  var ex = (g('fnw-ex') ? g('fnw-ex').value : '').trim();
  var ca = g('fnw-ca') ? g('fnw-ca').value : '';
  if (!ti) { shAl('al-nws-func', 'Preencha o título da notícia.', 'e'); return; }
  if (!co && !newsFile) { shAl('al-nws-func', 'Escreva o conteúdo ou envie um arquivo.', 'e'); return; }
  var nm = window.CS ? window.CS.staff_name : 'Funcionário';
  var slug = ti.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-') + '-' + Date.now();

  // If file provided, upload it first
  var filePromise = newsFile ? uploadNewsFile(newsFile) : Promise.resolve(null);

  filePromise.then(function(fileUrl) {
    var content = co || (newsFile ? '📎 Arquivo anexado: ' + newsFile.name : '');
    if (fileUrl) content += '

[Arquivo: ' + (newsFile ? newsFile.name : '') + '](' + fileUrl + ')';
    return q(function(s) {
      return s.from('news').insert({
        title: ti, excerpt: ex || null, content: content,
        category: ca || null, slug: slug,
        published: true, published_at: new Date().toISOString(),
        author_id: null, author_name: nm,
        file_url: fileUrl || null
      });
    });
  }).then(function(res) {
    if (res && res.error) { shAl('al-nws-func', res.error.message, 'e'); return; }
    cM('m-news-func');
    // Reset form
    ['fnw-ti','fnw-ex','fnw-co'].forEach(function(id){ var e=g(id); if(e)e.value=''; });
    var fn=g('news-file-name'); if(fn) fn.textContent='';
    newsFile = null;
    ldNoticiasFunc();
    shAl('al-upd','✅ Notícia publicada com sucesso!','s');
  }).catch(function(e) {
    shAl('al-nws-func', e.message || 'Erro ao publicar.', 'e');
  });
}

function uploadNewsFile(file) {
  var fname = 'news_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  return q(function(s) { return s.storage.from('news-files').upload(fname, file); })
    .then(function() {
      return q(function(s) { return s.storage.from('news-files').getPublicUrl(fname); });
    }).then(function(r) {
      return r && r.data ? r.data.publicUrl : null;
    }).catch(function() { return null; });
}

function delNoticia(id) {
  if (!confirm('Remover esta notícia? Esta ação não pode ser desfeita.')) return;
  q(function(s) { return s.from('news').delete().eq('id',id); })
    .then(function() { ldNoticiasFunc(); })
    .catch(function(e) { alert('Erro: ' + e.message); });
}

function sair() {
  if (chatInt) clearInterval(chatInt);
  ['jhc_cs','jhc_first','jhc_cu','jhc_cp','jhc_em'].forEach(function(k){ localStorage.removeItem(k); });
  location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', init);
/* portaladmin.js — JHC ADV AGRO */

window.CU = null; window.CP = null; window.CS = null;
var allCases = [], allClients = [], lawyers = [], allFiles = [];
var chatInt = null, activeCaseId = null;

function init() {
  initSB();
  var csData = localStorage.getItem('jhc_cs');
  if (!csData) { location.href = 'login.html#staff'; return; }
  try { window.CS = JSON.parse(csData); } catch(e) { location.href = 'login.html#staff'; return; }
  if (!window.CS || window.CS.staff_role !== 'admin') { location.href = 'login.html#staff'; return; }
  var nm = window.CS.staff_name || 'Admin';
  var av = nm.split(' ').map(function(x){return x[0];}).join('').slice(0,2).toUpperCase();
  var sbav = g('sb-av'); if (sbav) { sbav.textContent = av; }
  var sbnm = g('sb-nm'); if (sbnm) sbnm.textContent = nm;
  var gr = g('greet'); if (gr) gr.textContent = 'Painel — ' + nm.split(' ')[0];
  showS('dash'); ldDash();
}

function navTo(n) {
  showS(n);
  if (n === 'dash')        ldDash();
  if (n === 'processos')   ldProcs();
  if (n === 'clientes')    ldClientes();
  if (n === 'equipe')      { ldEquipe(); ldPwResets(); }
  if (n === 'interacoes')  ldInteracoes();
  if (n === 'arquivos')    ldArquivos();
  if (n === 'noticias')    ldNoticias();
  if (n === 'log')         ldLog();
  if (n === 'perfil')      fillPerfil();
}

// ── DASHBOARD ─────────────────────────────────────────────
function ldDash() {
  Promise.all([
    q(function(s){ return s.from('cases').select('*, profiles(full_name)').order('created_at',{ascending:false}); }).catch(function(){return {data:[]};}),
    q(function(s){ return s.from('profiles').select('id').eq('role','client'); }).catch(function(){return {data:[]};}),
    q(function(s){ return s.from('lawyers').select('id').eq('is_active',true); }).catch(function(){return {data:[]};})
  ]).then(function(results) {
    allCases = results[0].data || [];
    var clients = results[1].data || [];
    var lws = results[2].data || [];
    var sv = function(id,v){ var e=g(id); if(e) e.textContent=v; };
    sv('st1', allCases.length);
    sv('st2', allCases.filter(function(x){return x.status==='pending';}).length);
    sv('st3', allCases.filter(function(x){return x.status==='active'||x.status==='in_review';}).length);
    sv('st4', clients.length);
    sv('st5', lws.length);
    sv('st6', allCases.filter(function(x){return x.status==='concluded';}).length);
    var el = g('dash-tb'); if (!el) return;
    if (!allCases.length) { el.innerHTML = '<div class="empty"><div class="empty-i">📂</div><div class="empty-t">Nenhum processo ainda.</div></div>'; return; }
    el.innerHTML = '<div class="tsc"><table><thead><tr><th>Título</th><th>Cliente</th><th>Status</th><th>Responsável</th><th>Data</th><th>Ações</th></tr></thead><tbody>' +
      allCases.slice(0,8).map(function(c) {
        var pf = c.profiles || {};
        return '<tr><td><strong>' + esc(c.title) + '</strong></td>' +
          '<td style="color:var(--muted)">' + esc(pf.full_name||'—') + '</td>' +
          '<td>' + sbdg(c.status) + '</td>' +
          '<td style="color:var(--gold)">' + esc(c.lawyer_name||'—') + '</td>' +
          '<td style="color:var(--muted)">' + fdate(c.created_at) + '</td>' +
          '<td><button class="btn btn-gh btn-sm" onclick="viewProc(\'' + c.id + '\')">Abrir</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }).catch(function(e) { var el=g('dash-tb'); if(el) el.innerHTML='<div class="empty"><div class="empty-i">⚠️</div><div class="empty-t">'+esc(e.message)+'</div></div>'; });
}

// ── ALL PROCESSES ─────────────────────────────────────────
function ldProcs() {
  var el = g('procs-tb'); if (!el) return;
  el.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)"><span class="ld"></span></td></tr>';
  q(function(s){ return s.from('cases').select('*, profiles(full_name,email)').order('created_at',{ascending:false}); })
    .then(function(res) {
      allCases = res.data || [];
      rProcs(allCases);
    }).catch(function(e){ el.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:#f08080">'+esc(e.message)+'</td></tr>'; });
}

function rProcs(cases) {
  var el = g('procs-tb'); if (!el) return;
  if (!cases.length) { el.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">Nenhum processo.</td></tr>'; return; }
  el.innerHTML = cases.map(function(c) {
    var pf = c.profiles || {};
    return '<tr><td><strong>' + esc(c.title) + '</strong>' + (c.case_number?'<div style="font-size:.69rem;color:var(--muted)">'+esc(c.case_number)+'</div>':'') + '</td>' +
      '<td style="color:var(--muted)">' + esc(pf.full_name||'—') + '</td>' +
      '<td style="color:var(--muted);font-size:.78rem">' + esc(c.case_type) + '</td>' +
      '<td>' + sbdg(c.status) + '</td>' +
      '<td style="color:var(--gold)">' + esc(c.lawyer_name||'—') + '</td>' +
      '<td style="color:var(--muted)">' + fdate(c.created_at) + '</td>' +
      '<td><button class="btn btn-gh btn-sm" onclick="viewProc(\'' + c.id + '\')">Abrir</button></td></tr>';
  }).join('');
}

function filtProcs(v) { rProcs(allCases.filter(function(c){ var pf=c.profiles||{}; return (c.title||'').toLowerCase().indexOf(v.toLowerCase())>-1||(pf.full_name||'').toLowerCase().indexOf(v.toLowerCase())>-1; })); }
function filtProcsSt(s) { rProcs(s ? allCases.filter(function(c){return c.status===s;}) : allCases); }

// ── VIEW PROCESS (admin) ──────────────────────────────────
function viewProc(id) {
  activeCaseId = id;
  var c = null;
  for (var i=0;i<allCases.length;i++){if(allCases[i].id===id){c=allCases[i];break;}}
  var loadCase = c ? Promise.resolve(c) : q(function(s){ return s.from('cases').select('*, profiles(full_name,email,phone)').eq('id',id).single(); }).then(function(r){return r.data;});

  loadCase.then(function(c){
    // Load lawyers for delegation dropdown
    return q(function(s){return s.from('lawyers').select('id,staff_name,staff_role').eq('is_active',true);}).then(function(lwr){
      lawyers = lwr.data || [];
      return Promise.all([
        q(function(s){return s.from('case_updates').select('*').eq('case_id',id).order('created_at',{ascending:false});}).catch(function(){return {data:[]};}),
        q(function(s){return s.from('case_files').select('*').eq('case_id',id).order('created_at',{ascending:false});}).catch(function(){return {data:[]};})
      ]).then(function(results){
        var updates=results[0].data||[], files=results[1].data||[];
        var pf=c.profiles||{};

        // Populate lawyer dropdown
        var sel=g('upd-lawyer');
        if(sel){
          sel.innerHTML='<option value="">Manter atual</option>';
          lawyers.forEach(function(l){
            var o=document.createElement('option');
            o.value=l.id; o.textContent=l.staff_name+(l.staff_role==='admin'?' (Admin)':'');
            if(c.lawyer_id===l.id) o.selected=true;
            sel.appendChild(o);
          });
        }

        var el=g('proc-det-c'); if(!el)return;
        el.innerHTML=
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">' +
          '<div><h2 style="font-size:1.45rem;color:var(--white)">'+esc(c.title)+'</h2>' +
          '<div style="color:var(--muted);margin-top:.18rem">'+esc(c.case_type)+(c.case_number?' · Nº '+esc(c.case_number):'')+' </div></div>'+sbdg(c.status)+'</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.85rem;margin-bottom:1.5rem">' +
          '<div class="sc"><div class="sc-l">Cliente</div><div style="font-size:.88rem;font-weight:700;color:var(--white);margin-top:.3rem">'+esc(pf.full_name||'—')+'</div>' +
          '<div style="font-size:.74rem;color:var(--muted)">'+esc(pf.email||'')+'</div>' +
          (pf.phone?'<div style="font-size:.74rem;color:var(--gold)">'+esc(pf.phone)+'</div>':'')+'</div>' +
          '<div class="sc"><div class="sc-l">Responsável Atual</div><div style="font-size:.88rem;font-weight:700;color:var(--gold);margin-top:.3rem">'+esc(c.lawyer_name||'Sem responsável')+'</div></div>' +
          '<div class="sc"><div class="sc-l">Descrição</div><div style="font-size:.79rem;margin-top:.3rem;color:var(--muted);line-height:1.62">'+esc(c.description||'—')+'</div></div>' +
          (c.court?'<div class="sc"><div class="sc-l">Vara</div><div style="font-size:.86rem;margin-top:.3rem">'+esc(c.court)+'</div></div>':'')+'</div>' +
          (files.length?'<div class="tw" style="margin-bottom:1.5rem"><div class="tw-top"><span class="tw-tit">📎 Arquivos</span></div><div style="padding:.75rem 1rem;display:flex;flex-direction:column;gap:.42rem">'+
            files.map(function(f){return '<div style="display:flex;align-items:center;gap:.85rem;padding:.55rem .85rem;background:var(--navy3);border-radius:var(--r);font-size:.8rem"><span>📄</span><span style="flex:1">'+esc(f.file_name)+'</span><span style="font-size:.67rem;color:var(--muted)">'+esc(f.uploaded_by_name||'')+'</span><span style="font-size:.67rem;color:var(--muted)">'+fdate(f.created_at)+'</span>'+(f.file_url?'<a href="'+f.file_url+'" target="_blank" style="color:var(--gold);font-size:.75rem">⬇ Baixar</a>':'')+'</div>';}).join('')+
            '</div></div>':'') +
          '<h3 style="font-size:.94rem;color:var(--white);margin-bottom:1.1rem;font-family:var(--sans);font-weight:700">📋 Histórico</h3>' +
          (updates.length?'<div class="tl">'+updates.map(function(u){
            return '<div class="tl-i"><div class="tl-dot"></div><div class="tl-dt">'+fdatefull(u.created_at)+' '+(u.is_visible_to_client?'<span style="color:var(--gold);font-size:.62rem">• Visível ao cliente</span>':'<span style="color:var(--muted);font-size:.62rem">• Interno</span>')+'</div><div class="tl-box"><div class="tl-tit">'+esc(u.title)+'</div><div class="tl-txt">'+esc(u.description)+'</div></div></div>';
          }).join('')+'</div>':'<div class="empty"><div class="empty-i">🔔</div><div class="empty-t">Nenhuma atualização.</div></div>');

        // Chat
        var chatAv=g('chat-av'); if(chatAv) chatAv.textContent=(pf.full_name||'C').charAt(0);
        var chatHn=g('chat-hn'); if(chatHn) chatHn.textContent=pf.full_name||'Cliente';
        var clc=g('chat-list-c'); if(clc) clc.innerHTML='<div class="chat-item act"><div class="chat-nm">👤 '+esc(pf.full_name||'Cliente')+'</div><div class="chat-prev">'+esc((c.title||'').substring(0,28))+'</div></div>';
        rfMsgs();
        if(chatInt) clearInterval(chatInt);
        chatInt=setInterval(rfMsgs,6000);
        showS('proc-det');
      });
    });
  }).catch(function(e){console.error('viewProc:',e);});
}

function salvarUpd() {
  var tit=(g('upd-tit')?g('upd-tit').value:'').trim();
  var desc=(g('upd-desc')?g('upd-desc').value:'').trim();
  var st=g('upd-st')?g('upd-st').value:'';
  var lwId=g('upd-lawyer')?g('upd-lawyer').value:'';
  var vis=g('upd-vis')?g('upd-vis').checked:true;
  if (!tit||!desc){ shAl('al-upd','Preencha título e descrição.','e'); return; }
  var lwNm=null;
  if(lwId){ var found=lawyers.filter(function(l){return l.id===lwId;}); if(found.length) lwNm=found[0].staff_name; }
  var saves=[];
  saves.push(q(function(s){return s.from('case_updates').insert({case_id:activeCaseId,title:tit,description:desc,is_visible_to_client:vis,author_id:window.CS.id});}));
  var upd={updated_at:new Date().toISOString()};
  if(st) upd.status=st;
  if(lwId){upd.lawyer_id=lwId; upd.lawyer_name=lwNm;}
  if(st||lwId) saves.push(q(function(s){return s.from('cases').update(upd).eq('id',activeCaseId);}));
  Promise.all(saves).then(function(){
    if(selFiles.length) return uploadFiles(activeCaseId,window.CS.staff_name,window.CS.id);
  }).then(function(){
    lgAct('update_case','Admin atualizou processo',window.CS.staff_role);
    shAl('al-upd','✅ Atualização salva!','s');
    var ut=g('upd-tit');if(ut)ut.value='';
    var ud=g('upd-desc');if(ud)ud.value='';
    var us=g('upd-st');if(us)us.value='';
    viewProc(activeCaseId);
  }).catch(function(e){shAl('al-upd',e.message||'Erro.','e');});
}

function rfMsgs(){
  if(!activeCaseId)return;
  q(function(s){return s.from('case_messages').select('*').eq('case_id',activeCaseId).order('created_at',{ascending:true});})
    .then(function(res){
      var el=g('chat-msgs');if(!el)return;
      var msgs=res.data||[];
      el.innerHTML=msgs.length?msgs.map(function(m){
        var mine=m.sender_role==='admin'||m.sender_id===(window.CS&&window.CS.id);
        return '<div class="msg '+(mine?'s':'r')+'"><div class="mb">'+esc(m.content)+'</div><div class="mt">'+esc(m.sender_name||'')+' · '+fdate(m.created_at)+'</div></div>';
      }).join(''):'<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Nenhuma mensagem neste processo.</div>';
      el.scrollTop=el.scrollHeight;
    }).catch(function(){});
}

function sendMsg(){
  var inp=g('chat-inp');if(!inp||!activeCaseId)return;
  var txt=inp.value.trim();if(!txt)return;inp.value='';
  q(function(s){return s.from('case_messages').insert({case_id:activeCaseId,sender_id:window.CS.id,sender_name:window.CS.staff_name+' (Admin)',content:txt,sender_role:'admin'});})
    .then(function(){rfMsgs();}).catch(function(){});
}

// ── CLIENTS ───────────────────────────────────────────────
function ldClientes(){
  var el=g('cli-tb');if(!el)return;
  q(function(s){return s.from('profiles').select('*').eq('role','client').order('created_at',{ascending:false});})
    .then(function(res){allClients=res.data||[];rClientes(allClients);})
    .catch(function(e){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:#f08080">'+esc(e.message)+'</td></tr>';});
}
function rClientes(cs){
  var el=g('cli-tb');if(!el)return;
  if(!cs.length){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Nenhum cliente.</td></tr>';return;}
  el.innerHTML=cs.map(function(c){
    return '<tr><td><strong>'+esc(c.full_name||'—')+'</strong></td><td style="color:var(--muted)">'+esc(c.email||'—')+'</td><td style="color:var(--muted)">'+esc(c.cpf||'—')+'</td><td>'+esc(c.phone||'—')+'</td><td style="color:var(--muted)">'+esc(c.city||'—')+'</td><td style="color:var(--muted)">'+fdate(c.created_at)+'</td></tr>';
  }).join('');
}
function filtClientes(v){rClientes(allClients.filter(function(c){return(c.full_name||'').toLowerCase().indexOf(v.toLowerCase())>-1||(c.email||'').toLowerCase().indexOf(v.toLowerCase())>-1;}));}

// ── TEAM ─────────────────────────────────────────────────
function ldEquipe(){
  var el=g('eq-tb');if(!el)return;
  q(function(s){return s.from('lawyers').select('*').order('created_at',{ascending:false});})
    .then(function(res){lawyers=res.data||[];rEquipe(lawyers);})
    .catch(function(e){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:#f08080">'+esc(e.message)+'</td></tr>';});
}
function rEquipe(lws){
  var el=g('eq-tb');if(!el)return;
  if(!lws.length){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Nenhum funcionário.</td></tr>';return;}
  el.innerHTML=lws.map(function(l){
    return '<tr><td><strong>'+esc(l.staff_name)+'</strong>'+(l.oab_number?'<div style="font-size:.69rem;color:var(--gold)">'+esc(l.oab_number)+'</div>':'')+'</td>' +
      '<td><code style="background:var(--navy3);padding:.15rem .5rem;border-radius:4px;font-size:.79rem;color:var(--gold)">'+esc(l.staff_login)+'</code></td>' +
      '<td>'+(l.staff_role==='admin'?'<span class="chip-a">Admin</span>':'<span class="chip-l">'+(l.staff_role==='lawyer'?'Advogado(a)':esc(l.staff_role))+'</span>')+'</td>' +
      '<td>—</td>' +
      '<td>'+(l.is_active?'<span class="bdg ba">Ativo</span>':'<span class="bdg bc">Inativo</span>')+(l.first_access?' <span style="font-size:.65rem;color:var(--gold)">⚠ Temp.</span>':'')+'</td>' +
      '<td style="display:flex;gap:.4rem"><button class="btn btn-gh btn-sm" onclick="tgLw(\''+l.id+'\','+l.is_active+')">'+(l.is_active?'Desativar':'Ativar')+'</button>' +
      (l.staff_role!=='admin'?'<button class="btn btn-d btn-sm" onclick="rstPw(\''+l.id+'\',\''+l.staff_login+'\')">Reset</button>':'')+'</td></tr>';
  }).join('');
}
function tgLw(id,cur){
  q(function(s){return s.from('lawyers').update({is_active:!cur}).eq('id',id);}).then(function(){ldEquipe();}).catch(function(e){alert(e.message);});
}
function rstPw(id,lg){
  if(!confirm('Resetar senha de "'+lg+'"?\n\nA nova senha inicial será o próprio login.\nO funcionário deverá trocar no próximo acesso.'))return;
  q(function(s){return s.from('lawyers').update({staff_password:lg,first_access:true}).eq('id',id);})
    .then(function(){
      return q(function(s){return s.from('activity_logs').insert({actor_id:window.CS.id,actor_name:window.CS.staff_name,actor_role:'admin',action_type:'password_reset',action_detail:'Senha resetada pelo admin para: '+lg});});
    }).then(function(){
      shAl('al-auth','✅ Senha de "'+lg+'" resetada.','s');
      ldEquipe();
    }).catch(function(e){alert(e.message);});
}

// ── PASSWORD RESET REQUESTS ───────────────────────────────
function ldPwResets(){
  var el=g('pw-resets-tb');if(!el)return;
  el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--muted)"><span class="ld"></span></td></tr>';
  q(function(s){return s.from('staff_password_resets').select('*, lawyers(staff_name,staff_login)').order('created_at',{ascending:false}).limit(50);})
    .then(function(res){
      var rs=res.data||[];
      if(!rs.length){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--muted)">Nenhuma solicitação pendente.</td></tr>';return;}
      el.innerHTML=rs.map(function(r){
        var lw=r.lawyers||{};
        return '<tr><td><strong>'+esc(lw.staff_name||r.staff_login)+'</strong></td>' +
          '<td><code style="background:var(--navy3);padding:.15rem .5rem;border-radius:4px;font-size:.79rem;color:var(--gold)">'+esc(r.staff_login)+'</code></td>' +
          '<td style="color:var(--muted)">'+esc(r.requester_email)+'</td>' +
          '<td style="color:var(--muted)">'+fdate(r.created_at)+'</td>' +
          '<td>'+(r.status==='pending'?'<span class="bdg bp">Pendente</span>':r.status==='resolved'?'<span class="bdg ba">Resolvida</span>':'<span class="bdg bc">Cancelada</span>')+'</td>' +
          '<td style="display:flex;gap:.4rem">'+(r.status==='pending'?'<button class="btn btn-g btn-sm" onclick="resolveReset(\''+r.id+'\',\''+r.staff_login+'\')">Resetar Senha</button><button class="btn btn-gh btn-sm" onclick="cancelReset(\''+r.id+'\')">Cancelar</button>':'—')+'</td></tr>';
      }).join('');
    }).catch(function(e){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#f08080">'+esc(e.message)+'</td></tr>';});
}
function resolveReset(resetId,lg){
  if(!confirm('Resetar senha de "'+lg+'" para o login do funcionário?\nEle deverá alterar no próximo acesso.'))return;
  q(function(s){return s.from('lawyers').select('id,staff_name').eq('staff_login',lg).single();})
    .then(function(res){
      var lw=res.data;
      if(!lw)throw new Error('Funcionário não encontrado');
      return q(function(s){return s.from('lawyers').update({staff_password:lg,first_access:true}).eq('id',lw.id);}).then(function(){
        return q(function(s){return s.from('staff_password_resets').update({status:'resolved',resolved_by:window.CS.id,resolved_at:new Date().toISOString()}).eq('id',resetId);});
      }).then(function(){
        return q(function(s){return s.from('activity_logs').insert({actor_id:window.CS.id,actor_name:window.CS.staff_name,actor_role:'admin',action_type:'password_reset',action_detail:'Senha resetada via solicitação para: '+lg});});
      });
    }).then(function(){
      shAl('al-auth','✅ Senha de "'+lg+'" resetada. Funcionário deve alterar no próximo acesso.','s');
      ldPwResets(); ldEquipe();
    }).catch(function(e){alert('Erro: '+e.message);});
}
function cancelReset(resetId){
  q(function(s){return s.from('staff_password_resets').update({status:'cancelled'}).eq('id',resetId);}).then(function(){ldPwResets();}).catch(function(e){alert(e.message);});
}

// ── INTERACTIONS ─────────────────────────────────────────
function ldInteracoes(){
  var el=g('int-tb');if(!el)return;
  el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)"><span class="ld"></span></td></tr>';
  q(function(s){return s.from('cases').select('id,title,lawyer_name,profiles(full_name)').not('lawyer_id','is',null).order('updated_at',{ascending:false});})
    .then(function(res){
      var cs=res.data||[];
      if(!cs.length){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Nenhuma interação ainda.</td></tr>';return;}
      el.innerHTML=cs.map(function(c){
        var pf=c.profiles||{};
        return '<tr><td><strong>'+esc(c.title)+'</strong></td><td style="color:var(--muted)">'+esc(pf.full_name||'—')+'</td><td style="color:var(--gold)">'+esc(c.lawyer_name||'—')+'</td><td>—</td><td>—</td><td><button class="btn btn-gh btn-sm" onclick="viewProc(\''+c.id+'\')">Ver Chat</button></td></tr>';
      }).join('');
    }).catch(function(e){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:#f08080">'+esc(e.message)+'</td></tr>';});
}

// ── FILES ─────────────────────────────────────────────────
function ldArquivos(){
  var el=g('arq-tb');if(!el)return;
  q(function(s){return s.from('case_files').select('*, cases(title,profiles(full_name))').order('created_at',{ascending:false}).limit(150);})
    .then(function(res){allFiles=res.data||[];rArqs(allFiles);})
    .catch(function(e){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:#f08080">'+esc(e.message)+'</td></tr>';});
}
function rArqs(files){
  var el=g('arq-tb');if(!el)return;
  if(!files.length){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Nenhum arquivo enviado.</td></tr>';return;}
  el.innerHTML=files.map(function(f){
    var cs=f.cases||{}, pf=cs.profiles||{};
    return '<tr><td><strong>'+esc(f.file_name)+'</strong></td><td style="color:var(--muted)">'+esc((cs.title||'—').substring(0,30))+'</td><td style="color:var(--muted)">'+esc(pf.full_name||'—')+'</td><td style="color:var(--muted)">'+esc(f.uploaded_by_name||'—')+'</td><td style="color:var(--muted)">'+fdate(f.created_at)+'</td><td>'+(f.file_url?'<a href="'+f.file_url+'" target="_blank" class="btn btn-gh btn-sm">⬇ Baixar</a>':'—')+'</td></tr>';
  }).join('');
}
function filtArqs(v){rArqs(allFiles.filter(function(f){return(f.file_name||'').toLowerCase().indexOf(v.toLowerCase())>-1;}));}

// ── NEWS ─────────────────────────────────────────────────
function ldNoticias(){
  var el=g('news-tb');if(!el)return;
  q(function(s){return s.from('news').select('*').order('created_at',{ascending:false});})
    .then(function(res){
      if(!res.data||!res.data.length){el.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">Nenhuma notícia.</td></tr>';return;}
      el.innerHTML=res.data.map(function(n){
        return '<tr><td><strong>'+esc(n.title)+'</strong></td><td style="color:var(--muted)">'+esc(n.category||'—')+'</td><td>'+(n.published?'<span class="bdg ba">Publicada</span>':'<span class="bdg bp">Rascunho</span>')+'</td><td style="color:var(--muted)">'+fdate(n.created_at)+'</td><td><button class="btn btn-d btn-sm" onclick="delNews(\''+n.id+'\')">Remover</button></td></tr>';
      }).join('');
    }).catch(function(e){el.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2rem;color:#f08080">'+esc(e.message)+'</td></tr>';});
}
function salvarNews(){
  var ti=(g('nw-ti')?g('nw-ti').value:'').trim();
  var co=(g('nw-co')?g('nw-co').value:'').trim();
  var ex=(g('nw-ex')?g('nw-ex').value:'').trim();
  var ca=g('nw-ca')?g('nw-ca').value:'';
  if(!ti||!co){shAl('al-nws','Preencha título e conteúdo.','e');return;}
  var slug=ti.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now();
  q(function(s){return s.from('news').insert({title:ti,excerpt:ex,content:co,category:ca,slug:slug,published:true,published_at:new Date().toISOString(),author_id:window.CS.id});})
    .then(function(res){
      if(res.error){shAl('al-nws',res.error.message,'e');return;}
      cM('m-news');
      ['nw-ti','nw-ex','nw-co'].forEach(function(id){var e=g(id);if(e)e.value='';});
      ldNoticias();
    }).catch(function(e){shAl('al-nws',e.message||'Erro.','e');});
}
function delNews(id){if(!confirm('Remover esta notícia?'))return;q(function(s){return s.from('news').delete().eq('id',id);}).then(function(){ldNoticias();}).catch(function(e){alert(e.message);});}

// ── LOG ───────────────────────────────────────────────────
function ldLog(){
  var el=g('log-tb');if(!el)return;
  q(function(s){return s.from('activity_logs').select('*').order('created_at',{ascending:false}).limit(200);})
    .then(function(res){
      if(!res.data||!res.data.length){el.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">Nenhuma atividade.</td></tr>';return;}
      el.innerHTML=res.data.map(function(l){
        var roleChip=l.actor_role==='admin'?'<span class="chip-a">Admin</span>':l.actor_role==='client'?'<span style="color:var(--gold);font-size:.75rem">Cliente</span>':'<span class="chip-l">'+esc(l.actor_role||'?')+'</span>';
        return '<tr><td style="color:var(--muted);white-space:nowrap;font-size:.78rem">'+fdatefull(l.created_at)+'</td><td><strong>'+esc(l.actor_name||'?')+'</strong></td><td>'+roleChip+'</td><td style="color:var(--gold)">'+esc(l.action_type||'')+'</td><td style="color:var(--muted)">'+esc(l.action_detail||'')+'</td></tr>';
      }).join('');
    }).catch(function(e){el.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2rem;color:#f08080">'+esc(e.message)+'</td></tr>';});
}

// ── NEW STAFF ─────────────────────────────────────────────
function prvLogin(){
  var nm=(g('nl-nm')?g('nl-nm').value:'').trim().split(' ')[0];
  var f=nm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');
  var lp=g('nl-lp');if(lp)lp.value=f?f+'jhc':'';
}
function criarFunc(){
  var nm=(g('nl-nm')?g('nl-nm').value:'').trim();
  var em=(g('nl-em')?g('nl-em').value:'').trim();
  var ob=(g('nl-oab')?g('nl-oab').value:'').trim();
  var ro=g('nl-ro')?g('nl-ro').value:'lawyer';
  if(!nm||!em){shAl('al-nlw','Preencha nome e e-mail.','e');return;}
  var f=nm.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');
  var lg=f+'jhc';
  q(function(s){return s.from('lawyers').select('id').eq('staff_login',lg).maybeSingle();})
    .then(function(res){
      if(res.data){shAl('al-nlw','Login "'+lg+'" já existe.','e');return;}
      return q(function(s){return s.from('lawyers').insert({staff_name:nm,staff_email:em,oab_number:ob||null,staff_role:ro,staff_login:lg,staff_password:lg,first_access:true,is_active:true});})
        .then(function(res){
          if(res.error){shAl('al-nlw',res.error.message,'e');return;}
          lgAct('create_staff','Funcionário criado: '+nm,'admin');
          cM('m-new-lw'); ldEquipe();
          ['nl-nm','nl-em','nl-oab'].forEach(function(id){var e=g(id);if(e)e.value='';});
          alert('Funcionário criado!\nLogin: '+lg+'\nSenha inicial: '+lg+'\nTroca obrigatória no 1º acesso.');
        });
    }).catch(function(e){shAl('al-nlw',e.message||'Erro.','e');});
}

// ── PROFILE ───────────────────────────────────────────────
function fillPerfil(){
  if(!window.CS)return;
  var nm=g('pf-nm');if(nm)nm.value=window.CS.staff_name||'';
  var lg=g('pf-lg');if(lg)lg.value=window.CS.staff_login||'';
  var ro=g('pf-ro');if(ro)ro.value='Administrador';
}
function chgPw(){
  var p1=g('pw1')?g('pw1').value:'',p2=g('pw2')?g('pw2').value:'';
  if(!p1||!p2){shAl('al-pf','Preencha ambos os campos.','e');return;}
  if(p1!==p2){shAl('al-pf','As senhas não coincidem.','e');return;}
  if(p1.length<8){shAl('al-pf','Senha deve ter ao menos 8 caracteres.','e');return;}
  q(function(s){return s.from('lawyers').update({staff_password:p1,first_access:false}).eq('id',window.CS.id);})
    .then(function(res){
      if(res.error){shAl('al-pf','Erro: '+res.error.message,'e');return;}
      window.CS.staff_password=p1;
      localStorage.setItem('jhc_cs',JSON.stringify(window.CS));
      shAl('al-pf','✅ Senha alterada!','s');
      var p1e=g('pw1');if(p1e)p1e.value='';
      var p2e=g('pw2');if(p2e)p2e.value='';
    }).catch(function(e){shAl('al-pf',e.message||'Erro.','e');});
}

// ── LOGOUT ───────────────────────────────────────────────
function sair(){
  if(chatInt)clearInterval(chatInt);
  ['jhc_cs','jhc_first','jhc_cu','jhc_cp','jhc_em'].forEach(function(k){localStorage.removeItem(k);});
  location.href='login.html#staff';
}

document.addEventListener('DOMContentLoaded', init);
/* index.js — JHC ADV AGRO — Landing page */

// ── NAV SCROLL & SMOOTH ───────────────────────────────────
function goHome() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function sc(id) {
  var el = document.getElementById(id);
  if (el) {
    var top = el.getBoundingClientRect().top + window.pageYOffset - 80;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }
}

function scM(id) {
  cD();
  setTimeout(function() { sc(id); }, 300);
}

// ── MOBILE DRAWER ─────────────────────────────────────────
function toggleDrawer() {
  var mdr = document.getElementById('mdr');
  var hbg = document.getElementById('hbg');
  if (mdr) mdr.classList.toggle('open');
  if (hbg) hbg.classList.toggle('open');
}

function cD() {
  var mdr = document.getElementById('mdr');
  var hbg = document.getElementById('hbg');
  if (mdr) mdr.classList.remove('open');
  if (hbg) hbg.classList.remove('open');
}

document.addEventListener('click', function(e) {
  var mdr = document.getElementById('mdr');
  var hbgEl = document.getElementById('hbg');
  if (!mdr || !hbgEl) return;
  if (e.target === mdr) cD();
  if (mdr.classList.contains('open')) {
    var inside = mdr.contains(e.target) || hbgEl.contains(e.target);
    if (!inside) cD();
  }
});

// ── CONTACT MODAL ─────────────────────────────────────────
function openContactModal() { oM('m-contact'); }

// ── SUBMIT CONTACT FORM ───────────────────────────────────
function submitContact() {
  var nm = (document.getElementById('c-nm') ? document.getElementById('c-nm').value : '').trim();
  var em = (document.getElementById('c-em') ? document.getElementById('c-em').value : '').trim();
  var ph = (document.getElementById('c-ph') ? document.getElementById('c-ph').value : '').trim();
  var ar = document.getElementById('c-ar') ? document.getElementById('c-ar').value : '';
  var mg = (document.getElementById('c-mg') ? document.getElementById('c-mg').value : '').trim();
  if (!nm || !em || !mg) { shAl('al-contact', 'Preencha nome, e-mail e mensagem.', 'e'); return; }
  var btn = document.getElementById('btn-contact');
  if (btn) { btn.innerHTML = '<span class="ld"></span>'; btn.disabled = true; }
  q(function(s) {
    return s.from('contact_forms').insert({
      contact_name: nm, contact_email: em, contact_phone: ph || null,
      contact_area: ar || null, message: mg
    });
  }).then(function(res) {
    if (btn) { btn.innerHTML = 'Enviar Mensagem'; btn.disabled = false; }
    if (res && res.error) { shAl('al-contact', 'Erro ao enviar. Tente novamente.', 'e'); return; }
    shAl('al-contact', '✅ Mensagem enviada! Entraremos em contato em breve.', 's');
    ['c-nm','c-em','c-ph','c-ar','c-mg'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    setTimeout(function() { cM('m-contact'); }, 3000);
  }).catch(function(e) {
    if (btn) { btn.innerHTML = 'Enviar Mensagem'; btn.disabled = false; }
    shAl('al-contact', e.message || 'Erro de conexão.', 'e');
  });
}

// ── NAV SCROLL EFFECT ─────────────────────────────────────
window.addEventListener('scroll', function() {
  var nav = document.getElementById('nav');
  if (!nav) return;
  if (window.pageYOffset > 50) {
    nav.style.background = 'rgba(11,15,46,.98)';
    nav.style.boxShadow = '0 4px 20px rgba(0,0,0,.3)';
  } else {
    nav.style.background = 'rgba(11,15,46,.92)';
    nav.style.boxShadow = 'none';
  }
});

// ── INIT ─────────────────────────────────────────────────
(function() {
  initSB();
  // If already logged in → redirect to portal
  if (SB_OK) {
    sb.auth.getSession().then(function(res) {
      if (res.data && res.data.session && res.data.session.user) {
        location.href = 'portalcliente.html';
      }
    }).catch(function() {});
  }
})();
document.addEventListener('DOMContentLoaded', () => {
    // Header Scroll Effect
    const header = document.getElementById('main-header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Lead Form Submission (Handles both Compact and Standard)
    const leadForm = document.getElementById('lead-form');
    
    if(leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name  = leadForm.querySelector('#name').value;
            const phone = leadForm.querySelector('#phone').value;
            const email = leadForm.querySelector('#email').value;

            if(!name || !phone) return;

            const btn = leadForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Enviando...';
            btn.disabled = true;

            try {
                const response = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, email, origin: 'Hero/Contato' })
                });

                if (response.ok) {
                    btn.innerText = '✅ Recebemos seu contato!';
                    btn.style.background = '#2E7D32';
                    leadForm.reset();
                } else {
                    btn.innerText = '❌ Erro. Tente novamente.';
                    btn.style.background = '#c0392b';
                }
            } catch (err) {
                // Fallback para localStorage se servidor offline
                const newLead = {
                    id: Date.now().toString(),
                    name, phone, email,
                    origin: 'Site/Busca',
                    date: new Date().toLocaleDateString('pt-BR'),
                    status: 'novos'
                };
                const leads = JSON.parse(localStorage.getItem('amo_leads') || '[]');
                leads.push(newLead);
                localStorage.setItem('amo_leads', JSON.stringify(leads));
                btn.innerText = '✅ Recebemos seu contato!';
                btn.style.background = '#2E7D32';
                leadForm.reset();
            } finally {
                btn.disabled = false;
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = '';
                }, 3000);
            }
        });
    }

    // Phone Mask
    const phoneInput = document.getElementById('phone');
    if(phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            var x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    }
});
/* ================== SIMULADOR DE ORÇAMENTO ================== */

const ORC_CONFIG = {
    whatsapp: "5548999999999", // NÚMERO DA AMO
    // Ambientes calibrados com projetos reais (horas × custo-hora)
    ambientes: {
        Residencial: [
            { id: 'quarto',        nome: 'Quarto',                        horas: 28 },
            { id: 'suite',         nome: 'Suíte Master',                  horas: 38 },
            { id: 'sala',          nome: 'Sala / Estar / Jantar',         horas: 28 },
            { id: 'cozinha',       nome: 'Cozinha',                       horas: 32 },
            { id: 'cozinha-gour',  nome: 'Cozinha Gourmet',               horas: 65 },
            { id: 'banheiro',      nome: 'Banheiro',                      horas: 30 },
            { id: 'lavabo',        nome: 'Lavabo',                        horas: 20 },
            { id: 'lavanderia',    nome: 'Lavanderia / Varanda',          horas: 15 },
            { id: 'closet',        nome: 'Closet',                        horas: 38 },
            { id: 'area-ext',      nome: 'Área Externa',                  horas: 42 },
        ],
        Comercial: [
            { id: 'recepcao',      nome: 'Recepção / Escritório',         horas: 38 },
            { id: 'salao',         nome: 'Salão de Atendimento',          horas: 38 },
            { id: 'banheiro-com',  nome: 'Banheiro Comercial',            horas: 22 },
            { id: 'cozinha-com',   nome: 'Cozinha Comercial',             horas: 38 },
            { id: 'cozinha-ind',   nome: 'Cozinha Industrial',            horas: 72 },
            { id: 'deposito',      nome: 'Depósito / Almoxarifado',       horas: 12 },
        ]
    },
    custoHora:  { Residencial: 50, Comercial: 47 },
    overhead:   { Residencial: 115, Comercial: 55 },
    multEscopo: { completo: 1.0, layout: 0.40 },
};

let orcDados = {
    tipo: '',
    ambientes: {},
    escopo: 'completo',
    fachada: '',
    reforma: false,
    paisagismo: false,
    acompanhamento: false,
    estimativa: { minVal: 0, recVal: 0, maxVal: 0, prazo: '' }
};

function orcRenderAmbientes() {
    const container = document.getElementById('orc-amb-container');
    if(!container) return;

    const tipo = orcDados.tipo || 'Residencial';
    const lista = ORC_CONFIG.ambientes[tipo] || [];
    orcDados.ambientes = {};

    container.innerHTML = '<div class="orc-amb-grid"></div>';
    const grid = container.querySelector('.orc-amb-grid');

    lista.forEach(amb => {
        orcDados.ambientes[amb.id] = 0;
        const div = document.createElement('div');
        div.className = 'orc-amb-item';
        div.innerHTML = `
            <span class="orc-amb-nome">${amb.nome}</span>
            <div class="orc-controles">
                <button class="orc-btn-ctrl" onclick="orcAltAmb('${amb.id}', -1)">−</button>
                <span class="orc-num" id="orc-num-${amb.id}">0</span>
                <button class="orc-btn-ctrl" onclick="orcAltAmb('${amb.id}', 1)">+</button>
            </div>
        `;
        grid.appendChild(div);
    });
}

window.orcAltAmb = function(id, delta) {
    const newVal = Math.max(0, (orcDados.ambientes[id] || 0) + delta);
    orcDados.ambientes[id] = newVal;
    const el = document.getElementById(`orc-num-${id}`);
    if(el) {
        el.innerText = newVal;
        el.style.color = newVal > 0 ? 'var(--color-primary)' : '#fff';
    }
    const total = Object.values(orcDados.ambientes).reduce((a, b) => a + b, 0);
    document.getElementById('orc-total-amb').innerText = total;
};

window.orcSelecionarTipo = function(tipo, cardEl) {
    orcDados.tipo = tipo;
    document.querySelectorAll('.orc-tipo-card').forEach(c => c.classList.remove('selecionado'));
    if(cardEl) cardEl.classList.add('selecionado');
    orcRenderAmbientes();
    setTimeout(() => orcIrPara(2), 280);
};

window.orcIrPara = function(passo) {
    document.querySelectorAll('.orc-step').forEach(s => s.classList.remove('ativo'));

    if(passo === 'sucesso') {
        document.getElementById('orc-sucesso').classList.add('ativo');
        // Atualiza barra para tudo completo
        for(let i=1; i<=4; i++) {
            document.getElementById(`orc-ind-${i}`)?.classList.add('ativo');
            if(i < 4) document.getElementById(`orc-line-${i}`)?.classList.add('ativo');
        }
        document.getElementById('orcamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    const target = document.getElementById(`orc-passo-${passo}`);
    if(target) target.classList.add('ativo');

    for(let i=1; i<=4; i++) {
        const dot  = document.getElementById(`orc-ind-${i}`);
        const line = document.getElementById(`orc-line-${i}`);
        const lb   = document.getElementById(`orc-lb-${i}`);
        if(dot)  { dot.classList.toggle('ativo', i === passo); dot.classList.toggle('feito', i < passo); }
        if(line) line.classList.toggle('ativo', i < passo);
        if(lb)   lb.classList.toggle('ativo', i === passo);
    }
    // Scroll suave para o simulador no mobile
    if(window.innerWidth < 768) {
        document.getElementById('orcamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.orcProximoP2 = function() {
    const total = Object.values(orcDados.ambientes).reduce((a, b) => a + b, 0);
    const err = document.getElementById('orc-erro-2');
    if(total === 0) { err.style.display = 'block'; return; }
    err.style.display = 'none';
    orcIrPara(3);
};

window.orcRadio = function(groupId, el) {
    document.getElementById(groupId)?.querySelectorAll('.orc-radio').forEach(r => r.classList.remove('selecionado'));
    el.classList.add('selecionado');
    el.querySelector('input').checked = true;
};

window.orcCalcularEIr4 = function() {
    orcDados.escopo      = document.querySelector('input[name="orc-escopo"]:checked')?.value  || 'completo';
    orcDados.fachada     = document.querySelector('input[name="orc-fachada"]:checked')?.value || '';
    orcDados.reforma     = document.getElementById('orc-chk-reforma')?.checked    || false;
    orcDados.paisagismo  = document.getElementById('orc-chk-paisagismo')?.checked || false;
    orcDados.acompanhamento = document.getElementById('orc-chk-acomp')?.checked  || false;

    const tipo       = orcDados.tipo || 'Residencial';
    const lista      = ORC_CONFIG.ambientes[tipo] || [];
    const custoHora  = ORC_CONFIG.custoHora[tipo] || 50;
    const overhead   = orcDados.escopo === 'completo' ? (ORC_CONFIG.overhead[tipo] || 115) : 0;
    const mult       = ORC_CONFIG.multEscopo[orcDados.escopo] || 1;

    let horasAmb = 0;
    lista.forEach(amb => { horasAmb += (orcDados.ambientes[amb.id] || 0) * amb.horas; });

    let extras = 0;
    if(orcDados.fachada === 'simples')  extras += 42;
    if(orcDados.fachada === 'complexa') extras += 120;
    if(orcDados.reforma)                extras += 25;
    if(orcDados.paisagismo)             extras += 20;

    const horasTotal = Math.round((horasAmb + extras + overhead) * mult);
    const recVal = Math.round(horasTotal * custoHora);
    const minVal = Math.round(recVal * 0.85);
    const maxVal = Math.round(recVal * 1.25);
    const semanas = Math.ceil(horasTotal / 25); // ~5h/dia × 5 dias

    orcDados.estimativa = { minVal, recVal, maxVal, horasTotal, prazo: `${semanas}–${semanas+2} semanas` };

    const fmt = v => 'R$ ' + v.toLocaleString('pt-BR');
    document.getElementById('orc-res-faixa').innerText       = `${fmt(minVal)} — ${fmt(maxVal)}`;
    document.getElementById('orc-res-rec').innerText         = `Investimento recomendado: ${fmt(recVal)}`;
    document.getElementById('orc-res-min').innerText         = fmt(minVal);
    document.getElementById('orc-res-recomendado').innerText = fmt(recVal);
    document.getElementById('orc-res-prazo').innerText       = orcDados.estimativa.prazo;
    document.getElementById('orc-acomp-nota').style.display  = orcDados.acompanhamento ? 'block' : 'none';

    orcIrPara(4);
};

window.orcEnviarCRM = function() {
    const nome  = document.getElementById('orc-nome')?.value.trim();
    const fone  = document.getElementById('orc-fone')?.value.trim();
    const email = document.getElementById('orc-email')?.value.trim();
    const desc  = document.getElementById('orc-desc')?.value.trim();
    const err   = document.getElementById('orc-erro-4');

    if(!nome || !fone) { err.style.display = 'block'; return; }
    err.style.display = 'none';

    const tipo   = orcDados.tipo;
    const lista  = ORC_CONFIG.ambientes[tipo] || [];
    const fmt    = v => 'R$ ' + v.toLocaleString('pt-BR');

    const ambSelecionados = lista
        .filter(a => (orcDados.ambientes[a.id] || 0) > 0)
        .map(a => `${orcDados.ambientes[a.id]}x ${a.nome}`)
        .join(', ');

    const extras = [
        orcDados.fachada === 'simples'  ? 'Fachada simples'  : null,
        orcDados.fachada === 'complexa' ? 'Fachada complexa' : null,
        orcDados.reforma                ? 'Reforma'          : null,
        orcDados.paisagismo             ? 'Paisagismo'       : null,
        orcDados.acompanhamento         ? 'Acomp. de obra'   : null,
    ].filter(Boolean).join(', ');

    // Note estruturada — CRM vai renderizar em tabela
    const note = JSON.stringify({
        tipo,
        escopo:    orcDados.escopo,
        ambientes: ambSelecionados,
        extras:    extras || '—',
        horas:     orcDados.estimativa.horasTotal,
        est_min:   fmt(orcDados.estimativa.minVal),
        est_rec:   fmt(orcDados.estimativa.recVal),
        est_max:   fmt(orcDados.estimativa.maxVal),
        prazo:     orcDados.estimativa.prazo,
        obs:       desc || '',
    });

    const btn = document.getElementById('orc-btn-enviar');
    if(btn) { btn.disabled = true; btn.innerText = 'Enviando…'; }

    fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, phone: fone, email, origin: 'Calculadora LP', note, est_rec: orcDados.estimativa.recVal })
    })
    .then(res => {
        if(res.ok) orcIrPara('sucesso');
        else throw new Error('api_error');
    })
    .catch(() => {
        // Fallback localStorage
        const newLead = {
            id: Date.now().toString(), name: nome, phone: fone, email,
            origin: 'Calculadora LP', note,
            est_rec: orcDados.estimativa.recVal,
            created_at: new Date().toISOString(), status: 'novos'
        };
        const leads = JSON.parse(localStorage.getItem('amo_leads') || '[]');
        leads.push(newLead);
        localStorage.setItem('amo_leads', JSON.stringify(leads));
        orcIrPara('sucesso');
    })
    .finally(() => {
        if(btn) { btn.disabled = false; btn.innerText = '🚀 Confirmar Estimativa e Solicitar Contato'; }
    });
};

// Máscara de telefone — Calculadora
document.getElementById('orc-fone')?.addEventListener('input', function(e) {
    var x = e.target.value.replace(/\D/g,'').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
});

// Init simulador
orcRenderAmbientes();

// ================== FORMULÁRIO DE CONTATO ==================
const contatoForm = document.getElementById('contato-form');
if(contatoForm) {
    document.getElementById('c-phone')?.addEventListener('input', function(e) {
        var x = e.target.value.replace(/\D/g,'').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });

    contatoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name  = document.getElementById('c-name').value.trim();
        const phone = document.getElementById('c-phone').value.trim();
        const email = document.getElementById('c-email').value.trim();
        const msg   = document.getElementById('c-msg').value.trim();
        if(!name || !phone) return;

        const btn = document.getElementById('c-btn');
        btn.disabled = true;
        btn.innerText = 'Enviando…';

        const payload = { name, phone, email, origin: 'Contato LP', note: msg || '' };

        try {
            const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if(res.ok) { btn.innerText = '✅ Mensagem enviada!'; btn.style.background = '#2E7D32'; contatoForm.reset(); }
            else throw new Error();
        } catch {
            const leads = JSON.parse(localStorage.getItem('amo_leads') || '[]');
            leads.push({ id: Date.now().toString(), ...payload, created_at: new Date().toISOString(), status: 'novos' });
            localStorage.setItem('amo_leads', JSON.stringify(leads));
            btn.innerText = '✅ Mensagem enviada!'; btn.style.background = '#2E7D32'; contatoForm.reset();
        } finally {
            btn.disabled = false;
            setTimeout(() => { btn.innerText = 'Enviar Mensagem'; btn.style.background = ''; }, 3500);
        }
    });
}

// Intersection Observer for Reveal Animations
const revealCallback = (entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
};

const revealObserver = new IntersectionObserver(revealCallback, {
    threshold: 0.1
});

document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
});

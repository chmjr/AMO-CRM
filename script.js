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
    ambientes: [
        { id: 'quarto', nome: 'Quarto', preco: 800 },
        { id: 'sala', nome: 'Sala / Estar', preco: 1000 },
        { id: 'cozinha', nome: 'Cozinha', preco: 1200 },
        { id: 'banheiro', nome: 'Banheiro', preco: 600 },
        { id: 'gourmet', nome: 'Área Gourmet', preco: 1100 },
        { id: 'escritorio', nome: 'Escritório', preco: 900 },
        { id: 'outro', nome: 'Outro', preco: 700 }
    ]
};

let orcDados = {
    tipo: '',
    ambientes: {},
    escopo: 'completo',
    fachada: '',
    reforma: false,
    paisagismo: false,
    acompanhamento: false,
    estimativa: { min: 0, max: 0, rec: 0, prazo: 0 }
};

function orcRenderAmbientes() {
    const container = document.getElementById('orc-amb-container');
    if(!container) return;
    
    container.innerHTML = '<div class="orc-amb-grid"></div>';
    const grid = container.querySelector('.orc-amb-grid');
    
    ORC_CONFIG.ambientes.forEach(amb => {
        orcDados.ambientes[amb.id] = 0;
        const div = document.createElement('div');
        div.className = 'orc-amb-item';
        div.innerHTML = `
            <span class="orc-amb-nome">${amb.nome}</span>
            <div class="orc-controles">
                <button class="orc-btn-ctrl" onclick="orcAltAmb('${amb.id}', -1)">-</button>
                <span class="orc-num" id="orc-num-${amb.id}">0</span>
                <button class="orc-btn-ctrl" onclick="orcAltAmb('${amb.id}', 1)">+</button>
            </div>
        `;
        grid.appendChild(div);
    });
}

window.orcAltAmb = function(id, delta) {
    const newVal = Math.max(0, orcDados.ambientes[id] + delta);
    orcDados.ambientes[id] = newVal;
    document.getElementById(`orc-num-${id}`).innerText = newVal;
    const total = Object.values(orcDados.ambientes).reduce((a, b) => a + b, 0);
    document.getElementById('orc-total-amb').innerText = total;
};

window.orcSelecionarTipo = function(tipo) {
    orcDados.tipo = tipo;
    document.querySelectorAll('.orc-tipo-card').forEach(c => {
        c.style.borderColor = 'rgba(255,255,255,0.1)';
        c.style.background = 'rgba(255,255,255,0.02)';
    });
    event.currentTarget.style.borderColor = 'var(--color-primary)';
    event.currentTarget.style.background = 'rgba(197, 168, 128, 0.05)';
    setTimeout(() => orcIrPara(2), 300);
};

window.orcIrPara = function(passo) {
    document.querySelectorAll('.orc-step').forEach(s => s.classList.remove('ativo'));
    
    if(passo === 'sucesso') {
        document.getElementById('orc-sucesso').classList.add('ativo');
        return;
    }
    
    const target = document.getElementById(`orc-passo-${passo}`);
    if(target) target.classList.add('ativo');

    for(let i=1; i<=4; i++) {
        const dot = document.getElementById(`orc-ind-${i}`);
        const line = document.getElementById(`orc-line-${i}`);
        const lb = document.getElementById(`orc-lb-${i}`);
        if(dot) dot.classList.toggle('ativo', i <= (passo === 'sucesso' ? 4 : passo));
        if(line) line.classList.toggle('ativo', i < (passo === 'sucesso' ? 4 : passo));
        if(lb) lb.classList.toggle('ativo', i <= (passo === 'sucesso' ? 4 : passo));
    }
};

window.orcProximoP2 = function() {
    const total = Object.values(orcDados.ambientes).reduce((a, b) => a + b, 0);
    if(total === 0) {
        document.getElementById('orc-erro-2').style.display = 'block';
        return;
    }
    document.getElementById('orc-erro-2').style.display = 'none';
    orcIrPara(3);
};

window.orcRadio = function(groupId, el) {
    const container = document.getElementById(groupId);
    container.querySelectorAll('.orc-radio').forEach(r => r.classList.remove('selecionado'));
    el.classList.add('selecionado');
    el.querySelector('input').checked = true;
};

window.orcCalcularEIr4 = function() {
    orcDados.escopo = document.querySelector('input[name="orc-escopo"]:checked').value;
    orcDados.fachada = document.querySelector('input[name="orc-fachada"]:checked').value;
    orcDados.reforma = document.getElementById('orc-chk-reforma').checked;
    orcDados.paisagismo = document.getElementById('orc-chk-paisagismo').checked;
    orcDados.acompanhamento = document.getElementById('orc-chk-acomp').checked;

    let totalBase = 0;
    ORC_CONFIG.ambientes.forEach(amb => {
        totalBase += orcDados.ambientes[amb.id] * amb.preco;
    });

    if(orcDados.escopo === 'layout') totalBase *= 0.4;
    if(orcDados.fachada === 'simples') totalBase += 1500;
    if(orcDados.fachada === 'complexa') totalBase += 3500;
    if(orcDados.reforma) totalBase *= 1.25;
    if(orcDados.paisagismo) totalBase += 1200;

    const min = totalBase * 0.9;
    const rec = totalBase * 1.15;
    const max = totalBase * 1.5;
    
    const totalAmb = Object.values(orcDados.ambientes).reduce((a, b) => a + b, 0);
    const semanas = Math.ceil(2 + (totalAmb / 2));

    orcDados.estimativa = {
        min: 'R$ ' + Math.floor(min).toLocaleString('pt-BR'),
        rec: 'R$ ' + Math.floor(rec).toLocaleString('pt-BR'),
        max: 'R$ ' + Math.floor(max).toLocaleString('pt-BR'),
        prazo: semanas + ' a ' + (semanas + 2) + ' semanas'
    };

    document.getElementById('orc-res-faixa').innerText = `${orcDados.estimativa.min} — ${orcDados.estimativa.max}`;
    document.getElementById('orc-res-rec').innerText = `Investimento recomendado: ${orcDados.estimativa.rec}`;
    document.getElementById('orc-res-min').innerText = orcDados.estimativa.min;
    document.getElementById('orc-res-recomendado').innerText = orcDados.estimativa.rec;
    document.getElementById('orc-res-prazo').innerText = orcDados.estimativa.prazo;
    document.getElementById('orc-acomp-nota').style.display = orcDados.acompanhamento ? 'block' : 'none';

    orcIrPara(4);
};

window.orcEnviarWhatsApp = function() {
    const nome = document.getElementById('orc-nome').value;
    const fone = document.getElementById('orc-fone').value;
    const email = document.getElementById('orc-email').value;
    const desc = document.getElementById('orc-desc').value;

    if(!nome || !fone) {
        document.getElementById('orc-erro-4').style.display = 'block';
        return;
    }
    document.getElementById('orc-erro-4').style.display = 'none';

    let resumo = `SOLICITAÇÃO DE ORÇAMENTO INTERATIVO\n`;
    resumo += `Tipo: ${orcDados.tipo}\n`;
    resumo += `Estimativa: ${orcDados.estimativa.min} a ${orcDados.estimativa.max}\n`;
    if(desc) resumo += `Obs Cliente: ${desc}`;

    // SALVAR NO CRM EM BACKGROUND (Não bloqueia o WhatsApp)
    fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, phone: fone, email: email, origin: 'Calculadora LP', note: resumo })
    }).catch(e => console.error("Lead save fail", e));

    const msg = `Olá AMO Arquitetura! Acabei de fazer uma simulação no site:
*Projeto:* ${orcDados.tipo}
*Estimativa:* ${orcDados.estimativa.min} a ${orcDados.estimativa.max}
*Nome:* ${nome}
${desc ? `*Notas:* ${desc}` : ''}`;

    const url = `https://wa.me/${ORC_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
    
    // ABRIR WHATSAPP IMEDIATAMENTE (User gesture context)
    window.open(url, '_blank');
    
    orcIrPara('sucesso');
};

// Phone Mask for Calculator
document.getElementById('orc-fone')?.addEventListener('input', function (e) {
    var x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
});

// Init
orcRenderAmbientes();

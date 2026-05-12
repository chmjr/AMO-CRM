// ===== ESTADO =====
let leadsCache = [];
let termoBusca = '';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadLeads();

    // Busca em tempo real
    document.getElementById('crm-busca').addEventListener('input', (e) => {
        termoBusca = e.target.value.toLowerCase().trim();
        renderBoard();
    });

    // Modal Configurações
    const modalSettings = document.getElementById('modal-settings');
    document.getElementById('btn-settings').addEventListener('click', () => {
        const cfg = loadConfig();
        document.getElementById('config-name').value     = cfg.name;
        document.getElementById('config-color').value    = cfg.color;
        document.getElementById('config-whatsapp').value = cfg.whatsapp || '';
        modalSettings.classList.add('active');
    });
    document.getElementById('btn-close-settings').addEventListener('click', () => modalSettings.classList.remove('active'));
    document.getElementById('form-settings').addEventListener('submit', (e) => {
        e.preventDefault();
        const cfg = {
            name:      document.getElementById('config-name').value,
            color:     document.getElementById('config-color').value,
            whatsapp:  document.getElementById('config-whatsapp').value,
        };
        localStorage.setItem('crm_settings', JSON.stringify(cfg));
        applySettings(cfg);
        modalSettings.classList.remove('active');
    });

    // Modal Novo Lead
    const modalAdd = document.getElementById('modal-add');
    document.getElementById('btn-add-lead').addEventListener('click', () => modalAdd.classList.add('active'));
    document.getElementById('btn-close-modal').onclick = () => modalAdd.classList.remove('active');
    
    // Modal Calculadora
    const modalCalc = document.getElementById('modal-calculator');
    const btnOpenCalc = document.getElementById('btn-open-calculator');
    const btnCloseCalc = document.getElementById('btn-close-calculator');
    if(btnOpenCalc)  btnOpenCalc.onclick = () => modalCalc.classList.add('active');
    if(btnCloseCalc) btnCloseCalc.onclick = () => modalCalc.classList.remove('active');

    // Fechar ao clicar fora
    window.onclick = (e) => {
        if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
    };
    document.getElementById('form-add-lead').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        
        try {
            btn.innerText = 'Adicionando...';
            btn.disabled = true;

            const res = await apiPost({
                name:   document.getElementById('manual-name').value.trim(),
                phone:  document.getElementById('manual-phone').value.trim(),
                email:  document.getElementById('manual-email').value.trim(),
                origin: document.getElementById('manual-origin').value,
            });

            if (res && res.status === 201) {
                showToast('✅ Lead adicionado com sucesso!');
                document.getElementById('form-add-lead').reset();
                modalAdd.classList.remove('active');
                await loadLeads();
            } else if (!window.navigator.onLine) {
                // Modo offline (localStorage)
                showToast('✅ Lead salvo localmente (offline)!');
                document.getElementById('form-add-lead').reset();
                modalAdd.classList.remove('active');
                await loadLeads();
            } else {
                throw new Error('Falha ao salvar');
            }
        } catch (err) {
            console.error(err);
            showToast('❌ Erro ao adicionar lead. Tente novamente.', 'error');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    // Modal Detalhes
    document.getElementById('btn-close-details').addEventListener('click', () =>
        document.getElementById('modal-details').classList.remove('active')
    );

    // Fechar modais clicando fora
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', (e) => { if(e.target === m) m.classList.remove('active'); });
    });

    // Compartilhar Questionário
    document.getElementById('btn-share-questionario')?.addEventListener('click', () => {
        const url = window.location.origin + '/questionario';
        navigator.clipboard.writeText(url).then(() => {
            showToast('📋 Link copiado: ' + url);
        }).catch(() => {
            prompt('Copie o link do questionário:', url);
        });
    });

    // Auto-refresh 30s
    setInterval(loadLeads, 30000);
});

// ===== TOAST (NOTIFICAÇÃO) =====
function showToast(message, type = 'success') {
    let toast = document.getElementById('crm-toast');
    if(!toast) {
        toast = document.createElement('div');
        toast.id = 'crm-toast';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.className = `crm-toast active ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}

// ===== CONFIG =====
function loadConfig() {
    return JSON.parse(localStorage.getItem('crm_settings') || '{"name":"ARQUITETURA E INTERIORES","color":"#C5A880","whatsapp":""}');
}
function loadSettings() { applySettings(loadConfig()); }
function applySettings(cfg) {
    document.documentElement.style.setProperty('--color-primary', cfg.color);
    const el = document.getElementById('brand-name');
    if(el) el.innerText = cfg.name;
}

// ===== API =====
async function apiGet() {
    try {
        const res = await fetch('/api/leads');
        return res.ok ? res.json() : loadLocalLeads();
    } catch { return loadLocalLeads(); }
}
async function apiPost(data) {
    try {
        const res = await fetch('/api/leads', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        return res;
    } catch {
        const leads = loadLocalLeads();
        leads.push({ id: Date.now().toString(), ...data, created_at: new Date().toISOString(), status: 'novos' });
        localStorage.setItem('amo_leads', JSON.stringify(leads));
    }
}
async function apiPut(id, data) {
    try {
        await fetch(`/api/leads/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    } catch {
        const leads = loadLocalLeads();
        const idx = leads.findIndex(l => String(l.id) === String(id));
        if(idx >= 0) { leads[idx] = { ...leads[idx], ...data }; localStorage.setItem('amo_leads', JSON.stringify(leads)); }
    }
}
async function apiDelete(id) {
    try {
        await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    } catch {
        const leads = loadLocalLeads().filter(l => String(l.id) !== String(id));
        localStorage.setItem('amo_leads', JSON.stringify(leads));
    }
}

function loadLocalLeads() {
    return JSON.parse(localStorage.getItem('amo_leads') || '[]');
}

// ===== CARREGAR =====
async function loadLeads() {
    leadsCache = await apiGet();
    renderBoard();
}

// ===== PARSE DA NOTE DO SIMULADOR / QUESTIONÁRIO =====
function parseNote(note) {
    if(!note) return null;
    try {
        const obj = JSON.parse(note);
        if(obj.tipo && obj.ambientes) return obj;
        if(obj.tipo_briefing === 'questionario') return obj;
    } catch {}
    return null;
}

function parseAttachments(link) {
    if(!link) return [];
    try {
        const arr = JSON.parse(link);
        if(Array.isArray(arr)) return arr;
    } catch {}
    return link ? [link] : [];
}

// ===== RENDER BOARD =====
function renderBoard() {
    const colunas = ['novos','contato','briefing','orcamento','ganho','perdido'];
    colunas.forEach(s => {
        const col = document.getElementById(`col-${s}`);
        if(col) col.querySelector('.kanban-cards').innerHTML = '';
    });

    const counts = Object.fromEntries(colunas.map(s => [s, 0]));

    // Filtragem por busca
    const lista = termoBusca
        ? leadsCache.filter(l =>
            (l.name  || '').toLowerCase().includes(termoBusca) ||
            (l.phone || '').toLowerCase().includes(termoBusca) ||
            (l.email || '').toLowerCase().includes(termoBusca) ||
            (l.origin|| '').toLowerCase().includes(termoBusca)
          )
        : leadsCache;

    lista.forEach(lead => {
        const status = lead.status || 'novos';
        const col = document.getElementById(`col-${status}`);
        if(!col) return;
        counts[status] = (counts[status] || 0) + 1;

        const sim = parseNote(lead.note);
        const isCalc = lead.origin === 'Calculadora LP';
        const isQuestionario = lead.origin === 'Questionário Briefing';
        const cleanPhone = (lead.phone || '').replace(/\D/g, '');
        const waLink = `https://wa.me/55${cleanPhone}`;
        const dateStr = lead.created_at
            ? new Date(lead.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
            : '—';

        const estBadge = (sim && sim.est_rec) || (lead.est_rec && Number(lead.est_rec) > 0)
            ? `<div class="card-est-badge">≈ ${sim ? sim.est_rec : 'R$ ' + Number(lead.est_rec).toLocaleString('pt-BR')}</div>`
            : '';

        const card = document.createElement('div');
        card.className = `kanban-card${isCalc ? ' calculadora' : ''}`;
        card.draggable = true;
        card.id = `card-${lead.id}`;
        card.ondragstart = drag;
        card.innerHTML = `
            <div class="card-header-row">
                <div class="card-title">${escHtml(lead.name)}</div>
                <button class="btn-delete-card" onclick="deleteLead('${lead.id}')" title="Remover">×</button>
            </div>
            <div class="card-info">
                <a href="${waLink}" target="_blank" class="card-btn-wa" style="display:flex;align-items:center;gap:5px;text-decoration:none;font-size:12px;color:#25D366;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 0C5.385 0 0 5.384 0 12.03c0 2.126.553 4.195 1.604 6.01L.045 23.993l6.105-1.601a11.956 11.956 0 0 0 5.88 1.543h.005c6.643 0 12.03-5.384 12.03-12.03C24.06 5.257 18.675 0 12.031 0m6.602 17.3c-.276.78-1.579 1.488-2.222 1.53-.59.04-1.353.111-3.864-.93-3.085-1.277-5.064-4.444-5.216-4.646-.153-.203-1.244-1.657-1.244-3.161 0-1.503.784-2.24 1.059-2.544.276-.305.6-.381.8-.381.203 0 .406.002.585.011.192.01.448-.075.7.533.264.634.852 2.083.928 2.235.076.152.127.33.025.534-.101.203-.152.33-.304.508-.153.178-.318.394-.457.533-.153.153-.314.32-.14.624.175.304.776 1.288 1.67 2.083 1.156 1.028 2.115 1.346 2.42 1.498.305.153.483.127.66-.076.178-.203.763-.89.966-1.194.204-.305.407-.254.686-.153.28.101 1.765.838 2.07 1.028.304.19.508.28.584.432.076.152.076.889-.2 1.669"/></svg>
                    ${escHtml(lead.phone)}
                </a>
            </div>
            ${lead.email ? `<div class="card-info">✉️ <a href="mailto:${escHtml(lead.email)}">${escHtml(lead.email)}</a></div>` : ''}
            ${estBadge}
            
            <div class="card-upload-area" style="margin-top: 8px;">
                ${(() => {
                    const attachments = parseAttachments(lead.link);
                    if(attachments.length > 1) {
                        const imgs = attachments.filter(a => /\.(jpg|jpeg|png|gif|webp)$/i.test(a));
                        const outros = attachments.filter(a => !/\.(jpg|jpeg|png|gif|webp)$/i.test(a));
                        return `<div style="font-size:11px; color:var(--color-primary); margin-bottom:4px;">📎 ${attachments.length} arquivo(s) anexado(s)</div>` +
                            (imgs.length > 0 ? `<div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:4px;">${imgs.slice(0,4).map(img => `<a href="${escHtml(img)}" target="_blank"><img src="${escHtml(img)}" style="width:48px;height:48px;object-fit:cover;border-radius:3px;border:1px solid rgba(255,255,255,0.1);"></a>`).join('')}${imgs.length > 4 ? `<span style="font-size:10px;color:rgba(255,255,255,0.4);align-self:center;">+${imgs.length-4}</span>` : ''}</div>` : '') +
                            outros.map(f => `<a href="${escHtml(f)}" target="_blank" style="display:block;font-size:11px;color:var(--color-primary);text-decoration:none;margin-bottom:2px;">📄 ${f.split('/').pop()}</a>`).join('') +
                            `<button onclick="updateField('${lead.id}', 'link', '')" style="background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:10px; margin-top:2px;">Remover anexos</button>`;
                    } else if(attachments.length === 1) {
                        const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachments[0]);
                        return `<div style="display:flex; gap:5px; align-items:center; background: rgba(255,255,255,0.05); padding: 5px; border-radius: 4px; font-size:11px;">` +
                            (isImg ? `<a href="${escHtml(attachments[0])}" target="_blank"><img src="${escHtml(attachments[0])}" style="width:40px;height:40px;object-fit:cover;border-radius:3px;"></a>` : '') +
                            `<a href="${escHtml(attachments[0])}" target="_blank" style="flex:1; color: var(--color-primary); text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📄 ${attachments[0].includes('/uploads/') ? 'Arquivo Anexado' : 'Acessar Link'}</a>` +
                            `<button onclick="updateField('${lead.id}', 'link', '')" style="background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer;">&times;</button></div>`;
                    } else {
                        return `<input type="file" id="file-${lead.id}" style="display:none" accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png" onchange="uploadFile('${lead.id}', this.files[0], this)">` +
                            `<label for="file-${lead.id}" class="card-btn" style="display:block; text-align:center; padding: 6px; margin-bottom:4px; font-weight:normal; border-style:dashed;">📎 Anexar Arquivo</label>` +
                            `<input type="url" class="card-input-field" style="margin-top:0;" placeholder="Ou cole um link…" onblur="if(this.value) updateField('${lead.id}', 'link', this.value)">`;
                    }
                })()}
            </div>
            
            <textarea class="card-input-field card-note" placeholder="Anotação rápida…" onblur="updateField('${lead.id}', 'annotation', this.value)">${escHtml(lead.annotation || '')}</textarea>
            <div class="card-actions">
                <button class="card-btn card-btn-wa" onclick="window.open('${waLink}','_blank')">💬 WhatsApp</button>
                ${isQuestionario || isCalc || sim ? `<button class="card-btn btn-show-orc" onclick="showLeadDetails('${lead.id}')">📋 Ver</button>` : `<button class="card-btn" onclick="showLeadDetails('${lead.id}')">📋 Ver</button>`}
                ${!isQuestionario && !isCalc ? `<button class="card-btn" onclick="sendQuestionario('${lead.id}')" title="Enviar questionário para este lead">📝 Questionário</button>` : ''}
            </div>
            <div class="card-footer">
                <span>📅 ${dateStr}</span>
                <span class="tag-origem tag-editable" onclick="editOrigin(event, '${lead.id}')">${isQuestionario ? '＋ Origem' : escHtml(lead.origin || '＋ Origem')}</span>
            </div>
        `;

        col.querySelector('.kanban-cards').appendChild(card);
    });

    // Counts + estados vazios
    colunas.forEach(s => {
        const el = document.getElementById(`count-${s}`);
        if(el) el.innerText = counts[s];
        const cards = document.getElementById(`col-${s}`)?.querySelector('.kanban-cards');
        if(cards && counts[s] === 0 && !termoBusca) {
            const icons = { novos:'🛎️', contato:'💬', briefing:'📐', orcamento:'📊', ganho:'🥂', perdido:'❄️' };
            cards.innerHTML = `<div class="empty-col"><div class="empty-col-icon">${icons[s]}</div>Nenhum lead aqui</div>`;
        }
    });

    updateKPIs(lista);
}

// ===== KPIs =====
function updateKPIs(lista) {
    const hoje = new Date().toDateString();
    const novosHoje   = lista.filter(l => l.created_at && new Date(l.created_at).toDateString() === hoje).length;
    const viaCalc     = lista.filter(l => l.origin === 'Calculadora LP').length;
    const ganhos      = lista.filter(l => l.status === 'ganho').length;
    const perdidos    = lista.filter(l => l.status === 'perdido').length;
    const fechaveis   = ganhos + perdidos;
    const conversao   = fechaveis > 0 ? Math.round((ganhos / fechaveis) * 100) : 0;

    // Potencial = soma das estimativas recomendadas de leads ativos (não perdidos/ganhos)
    let potencial = 0;
    lista.filter(l => l.status !== 'ganho' && l.status !== 'perdido').forEach(l => {
        const sim = parseNote(l.note);
        if(sim && sim.est_rec) {
            const num = parseInt(sim.est_rec.replace(/\D/g, ''));
            if(!isNaN(num)) potencial += num;
        } else if(l.est_rec && Number(l.est_rec) > 0) {
            potencial += Number(l.est_rec);
        }
    });

    document.getElementById('kpi-total').innerText       = lista.length;
    document.getElementById('kpi-novos').innerText        = novosHoje;
    document.getElementById('kpi-calculadora').innerText  = viaCalc;
    document.getElementById('kpi-ganhos').innerText       = ganhos;
    document.getElementById('kpi-potencial').innerText    = potencial > 0 ? 'R$ ' + Math.round(potencial).toLocaleString('pt-BR') : 'R$ 0';
    document.getElementById('kpi-conversao').innerText    = conversao + '%';
}

// ===== AÇÕES =====
window.deleteLead = async function(id) {
    if(confirm('Remover este lead permanentemente?')) {
        await apiDelete(id);
        await loadLeads();
    }
};

window.updateField = async function(id, field, value) {
    await apiPut(id, { [field]: value });
    const lead = leadsCache.find(l => String(l.id) === String(id));
    if(lead) lead[field] = value;
    if(field === 'link') renderBoard(); // Re-renderizar para atualizar visualização do anexo
};

window.uploadFile = async function(id, file, inputElement) {
    if(!file) return;
    
    // Atualizar visual (feedback)
    const label = inputElement.nextElementSibling;
    const oldText = label ? label.innerText : '';
    if(label) label.innerText = '⏳ Enviando...';

    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await fetch(`/api/leads/${id}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if(!res.ok) throw new Error('Falha no upload');
        
        const data = await res.json();
        const lead = leadsCache.find(l => String(l.id) === String(id));
        if(lead && data.link) {
            lead.link = data.link; // Associa a URL do arquivo no objeto
            renderBoard(); // Atualiza a tela
            showToast('✅ Arquivo anexado com sucesso!');
        }
    } catch(e) {
        console.error(e);
        if(label) label.innerText = '❌ Erro. Tente novamente.';
        setTimeout(() => { if(label) label.innerText = oldText; }, 3000);
        showToast('❌ Erro no upload.', 'error');
    }
};

window.showLeadDetails = function(id) {
    const lead = leadsCache.find(l => String(l.id) === String(id));
    if(!lead) return;

    const modal = document.getElementById('modal-details');
    const body  = document.getElementById('details-body');
    const title = document.getElementById('details-title');
    const btnWa = document.getElementById('details-btn-whatsapp');

    title.innerText = lead.name;

    const cleanPhone = (lead.phone || '').replace(/\D/g, '');
    const waLink = `https://wa.me/55${cleanPhone}`;
    btnWa.style.display = 'inline-block';
    btnWa.onclick = () => window.open(waLink, '_blank');

    const sim = parseNote(lead.note);
    const fmt = v => 'R$ ' + Number(v).toLocaleString('pt-BR');

    const attachments = parseAttachments(lead.link);

    if(sim && sim.tipo_briefing === 'questionario') {
        // Lead veio do questionário de briefing
        const fotosHtml = attachments.length > 0
            ? `<div style="margin-top:12px;"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Fotos do Cliente (${attachments.length})</strong><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">${attachments.map(a => {
                const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(a);
                return isImg
                    ? `<a href="${escHtml(a)}" target="_blank"><img src="${escHtml(a)}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid rgba(255,255,255,0.15);"></a>`
                    : `<a href="${escHtml(a)}" target="_blank" style="color:var(--color-primary);font-size:12px;">📄 ${a.split('/').pop()}</a>`;
            }).join('')}</div></div>` : '';

        body.innerHTML = `
            <table class="details-tabela">
                <tr><td>Localização</td><td>${escHtml(sim.localizacao || '—')}</td></tr>
                <tr><td>Metragem</td><td>${escHtml(sim.metragem || '—')}</td></tr>
                <tr><td>Tipo do Projeto</td><td>${escHtml(sim.tipo_projeto || '—')}</td></tr>
                <tr><td>Escopo</td><td>${escHtml(sim.escopo || '—')}</td></tr>
                <tr><td>Serviço</td><td>${escHtml(sim.servico || '—')}</td></tr>
                <tr><td>Tipo da Casa</td><td>${escHtml(sim.tipo_casa || '—')}</td></tr>
                <tr><td>Ambientes Sociais</td><td>${escHtml(sim.ambientes_sociais || '—')}</td></tr>
                <tr><td>Cozinha</td><td>${escHtml(sim.cozinha || '—')}</td></tr>
                <tr><td>Espaço Gourmet</td><td>${escHtml(sim.gourmet || '—')}</td></tr>
                <tr><td>Quartos</td><td>${escHtml(sim.quartos || '—')}</td></tr>
                <tr><td>Suítes</td><td>${escHtml(sim.suites || '—')}</td></tr>
                <tr><td>Área Externa</td><td>${escHtml(sim.area_externa || '—')}</td></tr>
                <tr><td>Garagem</td><td>${escHtml(sim.garagem || '—')}</td></tr>
                <tr><td>Outros Ambientes</td><td>${escHtml(sim.outros || '—')}</td></tr>
                <tr><td>Nível de Investimento</td><td>${escHtml(sim.nivel || '—')}</td></tr>
                <tr><td>Prazo/Urgência</td><td>${escHtml(sim.prazo || '—')}</td></tr>
                <tr><td>Telefone</td><td>${escHtml(lead.phone || '—')}</td></tr>
                <tr><td>E-mail</td><td>${escHtml(lead.email || '—')}</td></tr>
                <tr><td>Origem</td><td>${escHtml(lead.origin || '—')}</td></tr>
                <tr><td>Data</td><td>${lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '—'}</td></tr>
            </table>
            ${sim.obs ? `<div class="details-obs"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Observação do Cliente</strong>\n${escHtml(sim.obs)}</div>` : ''}
            ${fotosHtml}
            ${lead.annotation ? `<div class="details-obs" style="margin-top:8px;"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Anotação Interna</strong>\n${escHtml(lead.annotation)}</div>` : ''}
        `;
    } else if(sim) {
        // Lead veio do simulador — renderiza tabela estruturada
        body.innerHTML = `
            <table class="details-tabela">
                <tr><td>Tipo</td><td>${escHtml(sim.tipo || '—')}</td></tr>
                <tr><td>Escopo</td><td>${escHtml(sim.escopo === 'completo' ? 'Projeto Completo (Layout + 3D + Executivo)' : 'Apenas Planta Baixa')}</td></tr>
                <tr><td>Ambientes</td><td>${escHtml(sim.ambientes || '—')}</td></tr>
                <tr><td>Adicionais</td><td>${escHtml(sim.extras || '—')}</td></tr>
                <tr><td>Horas estimadas</td><td>${sim.horas ? sim.horas + 'h' : '—'}</td></tr>
                <tr><td>Prazo estimado</td><td>${escHtml(sim.prazo || '—')}</td></tr>
                <tr><td>Telefone</td><td>${escHtml(lead.phone || '—')}</td></tr>
                <tr><td>E-mail</td><td>${escHtml(lead.email || '—')}</td></tr>
                <tr><td>Origem</td><td>${escHtml(lead.origin || '—')}</td></tr>
                <tr><td>Data</td><td>${lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '—'}</td></tr>
            </table>
            <div class="details-est-card">
                <div class="details-est-faixa">${escHtml(sim.est_min || '—')} — ${escHtml(sim.est_max || '—')}</div>
                <div class="details-est-rec">Recomendado: <strong>${escHtml(sim.est_rec || '—')}</strong></div>
            </div>
            ${sim.obs ? `<div class="details-obs"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Observação do Cliente</strong>\n${escHtml(sim.obs)}</div>` : ''}
            ${lead.annotation ? `<div class="details-obs" style="margin-top:8px;"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Anotação Interna</strong>\n${escHtml(lead.annotation)}</div>` : ''}
        `;
    } else {
        // Lead manual, contato ou calculadora no formato antigo (texto puro)
        const noteIsOrcamento = lead.origin === 'Calculadora LP' && lead.note && !lead.note.startsWith('{');
        body.innerHTML = `
            <table class="details-tabela">
                <tr><td>Telefone</td><td>${escHtml(lead.phone || '—')}</td></tr>
                <tr><td>E-mail</td><td>${escHtml(lead.email || '—')}</td></tr>
                <tr><td>Origem</td><td>${escHtml(lead.origin || '—')}</td></tr>
                <tr><td>Status</td><td>${escHtml(lead.status || 'novos')}</td></tr>
                <tr><td>Data</td><td>${lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '—'}</td></tr>
            </table>
            ${noteIsOrcamento ? `<div class="details-obs" style="margin-top:12px;"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Dados do Orçamento</strong>\n${escHtml(lead.note)}</div>` : ''}
            ${lead.annotation ? `<div class="details-obs" style="margin-top:8px;"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Anotação Interna</strong>\n${escHtml(lead.annotation)}</div>` : ''}
            ${!noteIsOrcamento && lead.note ? `<div class="details-obs" style="margin-top:8px;"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Observação</strong>\n${escHtml(lead.note)}</div>` : ''}
            ${lead.link ? `<div class="details-obs" style="margin-top:8px;"><strong style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Link</strong>\n<a href="${escHtml(lead.link)}" target="_blank" style="color:var(--color-primary)">${escHtml(lead.link)}</a></div>` : ''}
        `;
    }

    modal.classList.add('active');
};

window.editOrigin = function(event, id) {
    event.stopPropagation();
    const span = event.currentTarget;
    const options = ['WhatsApp','Instagram','Indicação','Site/Busca','Calculadora LP','Pinterest','Outros'];
    const sel = document.createElement('select');
    sel.className = 'origin-select-inline';
    sel.innerHTML = '<option value="" disabled selected>Selecione…</option>' + options.map(o => `<option value="${o}">${o}</option>`).join('');
    sel.style.cssText = 'font-size:11px;background:#2a2a2a;color:#fff;border:1px solid var(--color-primary);border-radius:4px;padding:2px 4px;cursor:pointer;';
    span.replaceWith(sel);
    sel.focus();
    const finish = async (val) => {
        if(val) {
            await apiPut(id, { origin: val });
            const lead = leadsCache.find(l => String(l.id) === String(id));
            if(lead) lead.origin = val;
        }
        renderBoard();
    };
    sel.addEventListener('change', () => finish(sel.value));
    sel.addEventListener('blur', () => finish(null));
};

// ===== DRAG & DROP =====
function allowDrop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('drag-over');
}

function drag(ev) {
    ev.dataTransfer.setData('text', ev.currentTarget.id);
    ev.currentTarget.style.opacity = '0.5';
}

async function drop(ev) {
    ev.preventDefault();
    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));

    const cardId  = ev.dataTransfer.getData('text');
    const cardEl  = document.getElementById(cardId);
    const dropCol = ev.target.closest('.kanban-column');

    if(!dropCol || !cardEl) return;

    // Restora opacidade
    cardEl.style.opacity = '';

    const newStatus = dropCol.getAttribute('data-status');
    const leadId    = cardId.replace('card-', '');

    dropCol.querySelector('.kanban-cards').appendChild(cardEl);
    await apiPut(leadId, { status: newStatus });
    await loadLeads();
}

// Remove drag-over ao sair da coluna
document.addEventListener('dragend', () => {
    document.querySelectorAll('.kanban-card').forEach(c => c.style.opacity = '');
    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
});

// ===== UTIL =====
function escHtml(str) {
    if(str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

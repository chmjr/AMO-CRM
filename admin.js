// ===== Estado em memória (carregado via API) =====
let leadsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadLeads(); // Carrega do banco de dados

    // Limpar todos os leads
    document.getElementById('btn-clear').addEventListener('click', () => {
        if(confirm('Tem certeza que deseja apagar todos os leads de teste?')) {
            Promise.all(leadsCache.map(l => apiDelete(l.id))).then(() => loadLeads());
        }
    });

    // Modal Configurações White-Label (salvo apenas no localStorage do cliente)
    const modalSettings = document.getElementById('modal-settings');
    const configForm    = document.getElementById('form-settings');
    if(modalSettings && configForm) {
        document.getElementById('btn-settings').addEventListener('click', () => {
            const config = loadConfig();
            document.getElementById('config-name').value  = config.name;
            document.getElementById('config-color').value = config.color;
            document.getElementById('config-logo').value  = config.logo;
            modalSettings.classList.add('active');
        });
        document.getElementById('btn-close-settings').addEventListener('click', () =>
            modalSettings.classList.remove('active'));
        
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const config = {
                name:  document.getElementById('config-name').value,
                color: document.getElementById('config-color').value,
                logo:  document.getElementById('config-logo').value
            };
            localStorage.setItem('crm_settings', JSON.stringify(config));
            applySettings(config);
            modalSettings.classList.remove('active');
        });
    }

    // Modal Adicionar Lead Manual
    const modalAdd = document.getElementById('modal-add');
    if(modalAdd) {
        document.getElementById('btn-add-lead').addEventListener('click', () => modalAdd.classList.add('active'));
        document.getElementById('btn-close-modal').addEventListener('click', () => modalAdd.classList.remove('active'));
        
        document.getElementById('form-add-lead').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name:   document.getElementById('manual-name').value,
                phone:  document.getElementById('manual-phone').value,
                email:  document.getElementById('manual-email').value,
                origin: document.getElementById('manual-origin').value
            };
            await apiPost(payload);
            document.getElementById('form-add-lead').reset();
            modalAdd.classList.remove('active');
            await loadLeads();
        });
    }
});

// ===== Configurações visuais (localStorage) =====
function loadConfig() {
    return JSON.parse(localStorage.getItem('crm_settings') || '{"name":"ARQUITETURA E INTERIORES","color":"#C5A880","logo":""}');
}
function loadSettings() {
    applySettings(loadConfig());
}
function applySettings(config) {
    document.documentElement.style.setProperty('--color-primary', config.color);
    const brandName = document.getElementById('brand-name');
    if(brandName) brandName.innerText = config.name;
}

// ===== Chamadas à API REST =====
async function apiGet() {
    const res = await fetch('/api/leads');
    return res.ok ? res.json() : [];
}
async function apiPost(data) {
    return fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}
async function apiPut(id, data) {
    return fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}
async function apiDelete(id) {
    return fetch(`/api/leads/${id}`, { method: 'DELETE' });
}

// ===== Carregamento e renderização do Board =====
async function loadLeads() {
    leadsCache = await apiGet();
    renderBoard();
}

function renderBoard() {
    document.querySelectorAll('.kanban-cards').forEach(col => col.innerHTML = '');
    const counts = { novos: 0, contato: 0, orcamento: 0, ganho: 0, perdido: 0 };

    leadsCache.forEach(lead => {
        const column = document.getElementById(`col-${lead.status}`);
        if(!column) return;
        const container = column.querySelector('.kanban-cards');
        counts[lead.status] = (counts[lead.status] || 0) + 1;

        const card = document.createElement('div');
        card.className  = 'kanban-card';
        card.draggable  = true;
        card.id         = `card-${lead.id}`;
        card.ondragstart = drag;

        const cleanPhone = (lead.phone || '').replace(/\D/g, '');
        const waLink     = `https://wa.me/55${cleanPhone}`;
        const dateStr    = lead.created_at
            ? new Date(lead.created_at).toLocaleDateString('pt-BR')
            : '';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div class="card-title" style="margin-bottom: 0;">${lead.name}</div>
                <button class="btn-delete-card" onclick="deleteLead(${lead.id})" title="Apagar Lead">&times;</button>
            </div>
            <div class="card-info">
                <a href="${waLink}" target="_blank" style="color: #25D366; text-decoration: none; display: flex; align-items: center; gap: 6px;" title="Conversar no WhatsApp">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.031 0C5.385 0 0 5.384 0 12.03c0 2.126.553 4.195 1.604 6.01L.045 23.993l6.105-1.601a11.956 11.956 0 0 0 5.88 1.543h.005c6.643 0 12.03-5.384 12.03-12.03C24.06 5.257 18.675 0 12.031 0m6.602 17.3c-.276.78-1.579 1.488-2.222 1.53-.59.04-1.353.111-3.864-.93-3.085-1.277-5.064-4.444-5.216-4.646-.153-.203-1.244-1.657-1.244-3.161 0-1.503.784-2.24 1.059-2.544.276-.305.6-.381.8-.381.203 0 .406.002.585.011.192.01.448-.075.7.533.264.634.852 2.083.928 2.235.076.152.127.33.025.534-.101.203-.152.33-.304.508-.153.178-.318.394-.457.533-.153.153-.314.32-.14.624.175.304.776 1.288 1.67 2.083 1.156 1.028 2.115 1.346 2.42 1.498.305.153.483.127.66-.076.178-.203.763-.89.966-1.194.204-.305.407-.254.686-.153.28.101 1.765.838 2.07 1.028.304.19.508.28.584.432.076.152.076.889-.2 1.669"/>
                    </svg>
                    ${lead.phone}
                </a>
            </div>
            <div class="card-info">
                <a href="mailto:${lead.email}" style="color: inherit; text-decoration: none; display: flex; align-items: center; gap: 6px;" title="Enviar E-mail">
                    ✉️ ${lead.email}
                </a>
            </div>
            <input type="url" class="card-input-field" placeholder="Link do Orçamento/Drive/Anexo..." onblur="updateLink(${lead.id}, this.value)" value="${lead.link || ''}">
            <textarea class="card-input-field card-note" placeholder="Escrever anotação..." onblur="updateNote(${lead.id}, this.value)">${lead.note || ''}</textarea>
            <div class="card-footer">
                <span>📅 ${dateStr}</span>
                <span class="tag-origem">${lead.origin || 'Site'}</span>
            </div>
        `;

        container.appendChild(card);
    });

    Object.keys(counts).forEach(status => {
        const el = document.getElementById(`count-${status}`);
        if(el) el.innerText = counts[status];
    });
}

// ===== Ações dos cards =====
window.deleteLead = async function(id) {
    if(confirm('Tem certeza que deseja apagar este lead permanentemente?')) {
        await apiDelete(id);
        await loadLeads();
    }
};

window.updateNote = async function(id, text) {
    await apiPut(id, { note: text });
};

window.updateLink = async function(id, text) {
    await apiPut(id, { link: text });
};

// ===== Drag & Drop =====
function allowDrop(ev) { ev.preventDefault(); }

function drag(ev) {
    ev.dataTransfer.setData('text', ev.target.id);
}

async function drop(ev) {
    ev.preventDefault();
    const data        = ev.dataTransfer.getData('text');
    const cardElement = document.getElementById(data);
    const dropTarget  = ev.target.closest('.kanban-column');

    if(dropTarget && cardElement) {
        dropTarget.querySelector('.kanban-cards').appendChild(cardElement);
        const newStatus = dropTarget.getAttribute('data-status');
        const leadId    = parseInt(data.replace('card-', ''), 10);
        await apiPut(leadId, { status: newStatus });
        await loadLeads();
    }
}

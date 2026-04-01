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

    // Lead Form Submission
    const leadForm = document.getElementById('lead-form');
    
    if(leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name  = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;

            if(!name || !phone) return;

            const btn = leadForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Enviando...';
            btn.disabled = true;

            try {
                const response = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, email, origin: 'Site/Busca' })
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

// ============================================================
// 1. CONFIGURAÇÃO (SUPABASE)
// ============================================================
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

let supabaseClient;

// ============================================================
// 2. FUNÇÕES GLOBAIS (DISPONÍVEIS PARA O HTML)
// ============================================================

// Toast de Notificação
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => { toast.style.animation = 'slideIn 0.3s ease forwards'; });
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Formatação de Data
function formatarDataBr(dataIso) {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// ============================================================
// 3. INICIALIZAÇÃO DA PÁGINA
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const page = window.location.pathname;

    if (page.includes('cadastro.html')) initCadastro();
    if (page.includes('agendar.html')) initAgendar();
    if (page.includes('gerenciar.html')) initGerenciar();
    if (page.includes('admin.html')) initAdmin();
});

// ============================================================
// 4. LÓGICA DO PAINEL ADMIN (FUNÇÕES GLOBAIS NECESSÁRIAS)
// ============================================================

// Define as funções no escopo global (window) para o HTML acessá-las
window.carregarAgendaAdmin = async function() {
    const tbody = document.querySelector('#tabelaAgendamentos tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Carregando...</td></tr>';

    const { data, error } = await supabaseClient
        .from('agendamentos')
        .select('*, clientes(nome_responsavel, nome_crianca, telefone, autoriza_foto)') 
        .order('data', { ascending: true })
        .order('horario', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red">${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    data.forEach(item => {
        const hoje = new Date().toISOString().split('T')[0];
        let trClass = item.data === hoje ? 'hoje-highlight' : '';

        // Status
        let statusColor = '#666';
        if (item.status === 'Confirmado') statusColor = 'var(--secondary)';
        if (item.status === 'Cancelado') statusColor = 'var(--danger)';
        if (item.status === 'Compareceu') statusColor = 'var(--success)';

        // Foto e Obs
        const autoriza = item.clientes?.autoriza_foto === 'Sim';
        const iconFoto = autoriza 
            ? `<i class="fa-solid fa-camera" style="color:var(--success); margin-left:5px;" title="Autoriza Foto"></i>` 
            : `<i class="fa-solid fa-camera-slash" style="color:var(--danger); margin-left:5px;" title="NÃO Autoriza Foto"></i>`;

        const obsHtml = item.observacoes 
            ? `<div style="font-size:0.8rem; color:#d97706; margin-top:4px;"><i class="fa-regular fa-note-sticky"></i> ${item.observacoes}</div>` 
            : '';

        const tr = document.createElement('tr');
        tr.className = trClass;
        tr.innerHTML = `
            <td>
                <strong>${item.clientes?.nome_crianca || 'N/A'}</strong> ${iconFoto}<br>
                <span style="font-size:0.85rem; color:#666;">Resp: ${item.clientes?.nome_responsavel || ''}</span>
                ${obsHtml}
            </td>
            <td>
                ${item.servico}<br>
                <span style="font-size:0.85rem; color:#888;">${item.profissional || ''}</span>
            </td>
            <td>
                ${formatarDataBr(item.data)}<br>
                <strong>${item.horario.slice(0, 5)}</strong>
            </td>
            <td>
                <span class="status-badge" style="background:${statusColor}20; color:${statusColor}; border:1px solid ${statusColor}">
                    ${item.status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button onclick="marcarStatus(${item.id}, ${item.cliente_id}, 'Compareceu')" class="btn-icon check" title="Compareceu"><i class="fa-solid fa-check"></i></button>
                    <button onclick="cancelarAgendamento(${item.id})" class="btn-icon cancel" title="Cancelar"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.marcarStatus = async function(id, clienteId, status) {
    if (!confirm(`Marcar como ${status}?`)) return;
    await supabaseClient.from('agendamentos').update({ status: status }).eq('id', id);
    if (status === 'Compareceu') {
        const { data } = await supabaseClient.from('clientes').select('saldo_fidelidade').eq('id', clienteId).single();
        const novoSaldo = (data?.saldo_fidelidade || 0) + 1;
        await supabaseClient.from('clientes').update({ saldo_fidelidade: novoSaldo }).eq('id', clienteId);
        showToast("Presença confirmada!", 'success');
    }
    window.carregarAgendaAdmin();
};

window.cancelarAgendamento = async function(id) {
    if(!confirm("Cancelar este agendamento?")) return;
    const { error } = await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    if (error) showToast("Erro: " + error.message, 'error');
    else {
        showToast("Cancelado!", 'success');
        window.carregarAgendaAdmin();
    }
};

window.carregarServicosAdmin = async function() {
    const tbody = document.querySelector('#tabelaServicos tbody');
    if(!tbody) return;
    const { data } = await supabaseClient.from('servicos').select('*');
    tbody.innerHTML = '';
    data.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td>${s.nome}</td>
                <td>R$ ${s.preco}</td>
                <td><button onclick="deletarItem('servicos', ${s.id})" class="btn-icon cancel"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
    });
};

window.salvarServico = async function() {
    const nome = document.getElementById('nomeServico').value;
    const preco = document.getElementById('precoServico').value;
    if(!nome || !preco) return showToast("Preencha tudo", 'error');
    await supabaseClient.from('servicos').insert([{ nome, preco }]);
    showToast("Serviço salvo!", 'success');
    document.getElementById('nomeServico').value = '';
    document.getElementById('precoServico').value = '';
    window.carregarServicosAdmin();
};

window.carregarProfissionaisAdmin = async function() {
    const tbody = document.querySelector('#tabelaProfissionais tbody');
    if(!tbody) return;
    const { data } = await supabaseClient.from('profissionais').select('*');
    tbody.innerHTML = '';
    data.forEach(p => {
        const diasStr = p.dias_trabalho ? p.dias_trabalho.join(', ') : '-';
        tbody.innerHTML += `
            <tr>
                <td>${p.nome}</td>
                <td>09:00 - 18:00</td>
                <td>${diasStr}</td>
                <td><button onclick="deletarItem('profissionais', ${p.id})" class="btn-icon cancel"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
    });
};

window.salvarProfissional = async function() {
    const nome = document.getElementById('nomeProf').value;
    const dias = Array.from(document.querySelectorAll('input[name="diaTrabalho"]:checked')).map(el => el.value);
    if(!nome) return showToast("Preencha o nome", 'error');
    await supabaseClient.from('profissionais').insert([{ nome, dias_trabalho: dias }]);
    showToast("Profissional salvo!", 'success');
    document.getElementById('nomeProf').value = '';
    window.carregarProfissionaisAdmin();
};

window.deletarItem = async function(tabela, id) {
    if (!confirm("Excluir permanentemente?")) return;
    await supabaseClient.from(tabela).delete().eq('id', id);
    showToast("Excluído!", 'success');
    if (tabela === 'servicos') window.carregarServicosAdmin();
    if (tabela === 'profissionais') window.carregarProfissionaisAdmin();
};

// ============================================================
// 5. LÓGICA POR PÁGINA (INITs)
// ============================================================

function initAdmin() {
    // Agora é seguro chamar, pois foram definidas acima
    window.carregarAgendaAdmin();
    window.carregarServicosAdmin();
    window.carregarProfissionaisAdmin();
}

function initCadastro() {
    const btnSalvar = document.getElementById('btnSalvar');
    if (!btnSalvar) return;

    btnSalvar.addEventListener('click', async (e) => {
        e.preventDefault();
        const nomeResp = document.getElementById('nomeResp').value;
        const nomeCrianca = document.getElementById('nomeCrianca').value;
        const idade = document.getElementById('idade').value;
        const telefone = document.getElementById('telefone').value;
        const origem = document.getElementById('origem').value;
        const foto = document.getElementById('foto').value;

        if (!nomeResp || !nomeCrianca || !telefone) return showToast("Preencha os campos obrigatórios!", 'error');

        const codigo = Math.floor(1000 + Math.random() * 9000).toString();
        btnSalvar.textContent = "Salvando...";
        btnSalvar.disabled = true;

        const { error } = await supabaseClient.from('clientes').insert([{
            codigo_acesso: codigo, nome_responsavel: nomeResp, nome_crianca: nomeCrianca,
            idade: idade, telefone: telefone, origem: origem, autoriza_foto: foto
        }]);

        if (error) {
            showToast("Erro: " + error.message, 'error');
            btnSalvar.disabled = false;
        } else {
            document.querySelector('.box form').style.display = 'none';
            document.querySelector('.box h2').style.display = 'none';
            document.querySelector('.back-link').style.display = 'none';
            const sucessoBox = document.getElementById('sucessoBox');
            sucessoBox.classList.remove('hidden');
            sucessoBox.style.display = 'block';
            document.getElementById('codigoGerado').innerText = codigo;
        }
    });
}

function initAgendar() {
    window.agendamentoEstado = { cliente: null, servico: null, profissional: null, data: null, horario: null };

    // BUSCA CLIENTE
    document.getElementById('btnBuscarCliente').addEventListener('click', async () => {
        const codigo = document.getElementById('codigoCliente').value;
        if (!codigo) return showToast("Digite o código!", 'warning');

        const { data, error } = await supabaseClient.from('clientes').select('*').eq('codigo_acesso', codigo).single();

        if (error || !data) {
            showToast("Código não encontrado.", 'error');
        } else {
            window.agendamentoEstado.cliente = data;
            
            // Transição Passo 1 -> Passo 2 (CORRIGIDO)
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step1').style.display = 'none';
            
            const step2 = document.getElementById('step2');
            step2.classList.remove('hidden'); 
            step2.classList.add('active'); 
            step2.style.display = 'block';

            document.getElementById('infoCliente').innerHTML = `
                <div style="text-align:center;">
                    <strong>Olá, ${data.nome_responsavel}!</strong><br>
                    Atendimento para: <strong>${data.nome_crianca}</strong>
                </div>`;
            carregarServicosAgendamento();
        }
    });

    async function carregarServicosAgendamento() {
        const container = document.getElementById('listaServicos');
        container.innerHTML = '<p>Carregando serviços...</p>';
        const { data } = await supabaseClient.from('servicos').select('*');
        container.innerHTML = '';
        if(data) data.forEach(serv => {
            const div = document.createElement('div');
            div.className = 'option-card';
            div.innerHTML = `<strong>${serv.nome}</strong><span>R$ ${serv.preco}</span>`;
            div.onclick = () => {
                document.querySelectorAll('#listaServicos .option-card').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                window.agendamentoEstado.servico = serv;
                document.getElementById('selecaoData').classList.remove('hidden');
                document.getElementById('selecaoData').style.display = 'block';
                carregarProfissionaisAgendamento();
            };
            container.appendChild(div);
        });
    }

    async function carregarProfissionaisAgendamento() {
        const { data } = await supabaseClient.from('profissionais').select('*');
        window.listaProfissionais = data || [];
        
        const dateInput = document.getElementById('dataAgendamento');
        const hoje = new Date().toISOString().split('T')[0];
        dateInput.value = hoje;
        dateInput.min = hoje;
        buscarHorariosDisponiveis(hoje);
        dateInput.addEventListener('change', (e) => buscarHorariosDisponiveis(e.target.value));
    }

    async function buscarHorariosDisponiveis(dataSelecionada) {
        const container = document.getElementById('horariosGrid');
        container.innerHTML = '<p>Carregando...</p>';
        window.agendamentoEstado.data = dataSelecionada;

        const { data: agendados } = await supabaseClient.from('agendamentos')
            .select('horario, profissional').eq('data', dataSelecionada).neq('status', 'Cancelado');

        const horariosBase = ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];
        container.innerHTML = '';

        if (!window.listaProfissionais?.length) { container.innerHTML = '<p>Sem profissionais.</p>'; return; }

        horariosBase.forEach(hora => {
            const ocupados = agendados.filter(a => a.horario.slice(0,5) === hora).map(a => a.profissional);
            const livres = window.listaProfissionais.filter(p => !ocupados.includes(p.nome));

            if (livres.length > 0) {
                const btn = document.createElement('button');
                btn.className = 'time-btn';
                btn.textContent = hora;
                btn.onclick = () => {
                    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    mostrarModalProfissionais(hora, livres);
                };
                container.appendChild(btn);
            }
        });
    }

    function mostrarModalProfissionais(hora, profissionaisLivres) {
        const modal = document.getElementById('modalProfissionais');
        const lista = document.getElementById('listaProfissionaisModal');
        document.getElementById('horaModalTitle').textContent = `Profissionais às ${hora}`;
        lista.innerHTML = '';
        profissionaisLivres.forEach(prof => {
            const pDiv = document.createElement('div');
            pDiv.style.cssText = "padding:10px; border:1px solid #eee; margin:5px 0; border-radius:8px; cursor:pointer;";
            pDiv.innerHTML = `<strong>${prof.nome}</strong>`;
            pDiv.onclick = () => {
                window.agendamentoEstado.horario = hora;
                window.agendamentoEstado.profissional = prof.nome;
                const resumo = document.getElementById('resumoAgendamento');
                resumo.innerHTML = `Serviço: <strong>${window.agendamentoEstado.servico.nome}</strong><br>Profissional: <strong>${prof.nome}</strong><br>Data: <strong>${formatarDataBr(window.agendamentoEstado.data)}</strong> às <strong>${hora}</strong>`;
                document.getElementById('btnConfirmarAgendamento').disabled = false;
                modal.style.display = 'none';
            };
            lista.appendChild(pDiv);
        });
        modal.style.display = 'flex';
        document.getElementById('fecharModal').onclick = () => modal.style.display = 'none';
    }

    // CONFIRMAR AGENDAMENTO
    document.getElementById('btnConfirmarAgendamento').addEventListener('click', async () => {
        const btn = document.getElementById('btnConfirmarAgendamento');
        const obs = document.getElementById('obsAgendamento').value;
        btn.textContent = "Confirmando...";
        btn.disabled = true;

        const { error } = await supabaseClient.from('agendamentos').insert([{
            cliente_id: window.agendamentoEstado.cliente.id,
            servico: window.agendamentoEstado.servico.nome,
            profissional: window.agendamentoEstado.profissional,
            data: window.agendamentoEstado.data,
            horario: window.agendamentoEstado.horario,
            observacoes: obs,
            status: 'Agendado'
        }]);

        if (error) {
            showToast("Erro: " + error.message, 'error');
            btn.disabled = false;
        } else {
            // Transição Passo 2 -> Passo 3 (CORRIGIDO)
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step2').style.display = 'none';
            
            const step3 = document.getElementById('step3');
            step3.classList.remove('hidden'); 
            step3.classList.add('active');
            step3.style.display = 'block';

            const zapBtn = document.getElementById('btnZap');
            const msg = `Olá! Agendei para ${window.agendamentoEstado.cliente.nome_crianca} dia ${formatarDataBr(window.agendamentoEstado.data)} às ${window.agendamentoEstado.horario}.`;
            zapBtn.onclick = () => window.open(`https://wa.me/554896304505?text=${encodeURIComponent(msg)}`, '_blank');
        }
    });
}

function initGerenciar() {
    document.getElementById('btnVerMeus').addEventListener('click', async () => {
        const codigo = document.getElementById('codigoGerenciar').value;
        if (!codigo) return showToast("Digite o código", 'warning');

        const { data: cliente } = await supabaseClient.from('clientes').select('id').eq('codigo_acesso', codigo).single();
        if (!cliente) return showToast("Código inválido", 'error');

        const lista = document.getElementById('listaMeusAgendamentos');
        lista.innerHTML = 'Carregando...';
        const { data: agendamentos } = await supabaseClient.from('agendamentos')
            .select('*').eq('cliente_id', cliente.id).order('data', { ascending: true });

        lista.innerHTML = '';
        if (!agendamentos?.length) { lista.innerHTML = '<p style="text-align:center;">Nenhum agendamento.</p>'; return; }

        agendamentos.forEach(ag => {
            const card = document.createElement('div');
            card.className = 'card';
            let btnCancel = (ag.status !== 'Cancelado' && ag.status !== 'Compareceu') 
                ? `<button class="btn-cancelar" onclick="cancelarPeloCliente(${ag.id})"><i class="fa-solid fa-ban"></i> Cancelar</button>` : '';
            card.innerHTML = `<div class="card-header"><i class="fa-regular fa-calendar"></i> ${formatarDataBr(ag.data)} - ${ag.horario.slice(0,5)}</div>
                <div><strong>${ag.servico}</strong> (${ag.profissional})</div>
                <div style="font-size:0.9rem;">Status: ${ag.status}</div>${btnCancel}`;
            lista.appendChild(card);
        });
    });
}

window.cancelarPeloCliente = async function(id) {
    if (!confirm("Tem certeza?")) return;
    await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    showToast("Cancelado", 'success');
    document.getElementById('btnVerMeus').click();
};
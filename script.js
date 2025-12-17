// ============================================================
// 1. CONFIGURAÇÃO (SUPABASE)
// ============================================================

// ⚠️ SUBSTITUA PELAS SUAS CHAVES AQUI
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

// Inicializa Variável Global
let supabaseClient;

// --- SISTEMA DE TOAST (NOTIFICAÇÕES) ---
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
    
    // Animação de entrada
    requestAnimationFrame(() => {
        toast.style.animation = 'slideIn 0.3s ease forwards';
    });

    // Remove após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- FORMATAÇÃO DE DATA (AAAA-MM-DD -> DD/MM/AAAA) ---
function formatarDataBr(dataIso) {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// ============================================================
// 2. INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Identifica qual página está aberta
    const page = window.location.pathname;

    if (page.includes('cadastro.html')) initCadastro();
    if (page.includes('agendar.html')) initAgendar();
    if (page.includes('gerenciar.html')) initGerenciar();
    if (page.includes('admin.html')) initAdmin();
});

// ============================================================
// 3. LÓGICA: CADASTRO (cadastro.html)
// ============================================================
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
        const foto = document.getElementById('foto').value; // Sim ou Nao

        if (!nomeResp || !nomeCrianca || !telefone) {
            showToast("Preencha os campos obrigatórios!", 'error');
            return;
        }

        // Gera código único (ex: 45A2)
        const codigo = Math.floor(1000 + Math.random() * 9000).toString();

        btnSalvar.textContent = "Salvando...";
        btnSalvar.disabled = true;

        const { data, error } = await supabaseClient
            .from('clientes')
            .insert([{
                codigo_acesso: codigo,
                nome_responsavel: nomeResp,
                nome_crianca: nomeCrianca,
                idade: idade,
                telefone: telefone,
                origem: origem,
                autoriza_foto: foto
            }]);

        if (error) {
            showToast("Erro ao cadastrar: " + error.message, 'error');
            btnSalvar.textContent = "Concluir Cadastro";
            btnSalvar.disabled = false;
        } else {
            // Sucesso
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

// ============================================================
// 4. LÓGICA: AGENDAR (agendar.html)
// ============================================================
function initAgendar() {
    // Estado do agendamento
    window.agendamentoEstado = {
        cliente: null,
        servico: null,
        profissional: null,
        data: null,
        horario: null
    };

    // --- PASSO 1: BUSCAR CLIENTE ---
    const btnBuscar = document.getElementById('btnBuscarCliente');
    btnBuscar.addEventListener('click', async () => {
        const codigo = document.getElementById('codigoCliente').value;
        if (!codigo) return showToast("Digite o código!", 'warning');

        btnBuscar.innerText = "...";
        const { data, error } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('codigo_acesso', codigo)
            .single();
        
        btnBuscar.innerText = "Entrar";

        if (error || !data) {
            showToast("Código não encontrado.", 'error');
        } else {
            // Sucesso! Salva estado e avança
            window.agendamentoEstado.cliente = data;
            
            // Oculta Passo 1
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step1').style.display = 'none';
            
            // CORREÇÃO: Exibe Passo 2 removendo 'hidden'
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

    // --- CARREGAR SERVIÇOS DO BANCO ---
    async function carregarServicosAgendamento() {
        const container = document.getElementById('listaServicos');
        container.innerHTML = '<p>Carregando serviços...</p>';
        
        const { data, error } = await supabaseClient.from('servicos').select('*');
        if (error) return;

        container.innerHTML = '';
        data.forEach(serv => {
            const div = document.createElement('div');
            div.className = 'option-card';
            div.innerHTML = `<strong>${serv.nome}</strong><span>R$ ${serv.preco}</span>`;
            div.onclick = () => {
                // Remove seleção anterior
                document.querySelectorAll('#listaServicos .option-card').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                window.agendamentoEstado.servico = serv;
                
                // Libera e carrega próxima etapa
                document.getElementById('selecaoData').classList.remove('hidden');
                document.getElementById('selecaoData').style.display = 'block';
                carregarProfissionaisAgendamento();
            };
            container.appendChild(div);
        });
    }

    // --- CARREGAR PROFISSIONAIS ---
    async function carregarProfissionaisAgendamento() {
        // Lógica simplificada: carrega todos. (Poderia filtrar por serviço se tivesse relacionamento)
        const { data } = await supabaseClient.from('profissionais').select('*');
        window.listaProfissionais = data || []; // Salva em variável global para usar no modal
        
        // Atualiza input de data para hoje
        const dateInput = document.getElementById('dataAgendamento');
        const hoje = new Date().toISOString().split('T')[0];
        dateInput.value = hoje;
        dateInput.min = hoje;
        
        // Dispara busca de horários iniciais
        buscarHorariosDisponiveis(hoje);

        // Evento de mudança de data
        dateInput.addEventListener('change', (e) => {
            buscarHorariosDisponiveis(e.target.value);
        });
    }

    // --- BUSCAR HORÁRIOS DISPONÍVEIS ---
    async function buscarHorariosDisponiveis(dataSelecionada) {
        const container = document.getElementById('horariosGrid');
        container.innerHTML = '<p>Carregando horários...</p>';
        window.agendamentoEstado.data = dataSelecionada;

        // 1. Busca agendamentos já feitos nesse dia
        const { data: agendados } = await supabaseClient
            .from('agendamentos')
            .select('horario, profissional')
            .eq('data', dataSelecionada)
            .neq('status', 'Cancelado'); // Ignora cancelados

        // 2. Gera slots baseados nos profissionais
        // Para simplificar: Vamos criar slots de hora em hora das 09:00 as 18:00
        // e verificar se ALGUM profissional está livre.
        
        const horariosBase = ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];
        
        container.innerHTML = '';

        if (!window.listaProfissionais || window.listaProfissionais.length === 0) {
            container.innerHTML = '<p>Nenhum profissional cadastrado.</p>';
            return;
        }

        horariosBase.forEach(hora => {
            // Filtra profissionais que NÃO estão ocupados neste horário
            const ocupadosNestaHora = agendados.filter(a => a.horario.slice(0,5) === hora).map(a => a.profissional);
            
            const profissionaisLivres = window.listaProfissionais.filter(p => !ocupadosNestaHora.includes(p.nome));

            if (profissionaisLivres.length > 0) {
                const btn = document.createElement('button');
                btn.className = 'time-btn';
                btn.textContent = hora;
                btn.onclick = () => {
                    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    mostrarModalProfissionais(hora, profissionaisLivres);
                };
                container.appendChild(btn);
            } else {
                // Horário lotado (opcional: mostrar desabilitado)
            }
        });
    }

    // --- MODAL DE ESCOLHA DE PROFISSIONAL ---
    function mostrarModalProfissionais(hora, profissionaisLivres) {
        const modal = document.getElementById('modalProfissionais');
        const lista = document.getElementById('listaProfissionaisModal');
        const titulo = document.getElementById('horaModalTitle');
        
        titulo.textContent = `Profissionais livres às ${hora}`;
        lista.innerHTML = '';

        profissionaisLivres.forEach(prof => {
            const pDiv = document.createElement('div');
            pDiv.style.cssText = "padding:10px; border:1px solid #eee; margin:5px 0; border-radius:8px; cursor:pointer;";
            pDiv.innerHTML = `<strong>${prof.nome}</strong>`;
            pDiv.onclick = () => {
                selecionarHorarioFinal(hora, prof.nome);
                modal.style.display = 'none';
            };
            lista.appendChild(pDiv);
        });

        modal.style.display = 'flex';
        
        // Botão fechar modal
        document.getElementById('fecharModal').onclick = () => {
            modal.style.display = 'none';
        };
    }

    function selecionarHorarioFinal(hora, nomeProfissional) {
        window.agendamentoEstado.horario = hora;
        window.agendamentoEstado.profissional = nomeProfissional;

        const resumo = document.getElementById('resumoAgendamento');
        resumo.innerHTML = `
            Serviço: <strong>${window.agendamentoEstado.servico.nome}</strong><br>
            Profissional: <strong>${nomeProfissional}</strong><br>
            Data: <strong>${formatarDataBr(window.agendamentoEstado.data)}</strong> às <strong>${hora}</strong>
        `;
        
        document.getElementById('btnConfirmarAgendamento').disabled = false;
    }

    // --- PASSO 2 -> 3: CONFIRMAR AGENDAMENTO ---
    document.getElementById('btnConfirmarAgendamento').addEventListener('click', async () => {
        const btn = document.getElementById('btnConfirmarAgendamento');
        const obs = document.getElementById('obsAgendamento').value;
        
        btn.textContent = "Confirmando...";
        btn.disabled = true;

        const { error } = await supabaseClient
            .from('agendamentos')
            .insert([{
                cliente_id: window.agendamentoEstado.cliente.id,
                servico: window.agendamentoEstado.servico.nome,
                profissional: window.agendamentoEstado.profissional,
                data: window.agendamentoEstado.data,
                horario: window.agendamentoEstado.horario,
                observacoes: obs,
                status: 'Agendado'
            }]);

        if (error) {
            showToast("Erro ao agendar: " + error.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Confirmar Agendamento';
        } else {
            // CORREÇÃO: Remove passo 2 e exibe passo 3
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step2').style.display = 'none';
            
            const step3 = document.getElementById('step3');
            step3.classList.remove('hidden'); // REMOVE A CLASSE HIDDEN
            step3.classList.add('active');
            step3.style.display = 'block';

            // Configura botão do WhatsApp
            const zapBtn = document.getElementById('btnZap');
            const dataF = formatarDataBr(window.agendamentoEstado.data);
            const msg = `Olá! Acabei de agendar para ${window.agendamentoEstado.cliente.nome_crianca} no dia ${dataF} às ${window.agendamentoEstado.horario}.`;
            
            zapBtn.onclick = () => {
                window.open(`https://wa.me/554896304505?text=${encodeURIComponent(msg)}`, '_blank');
            };
        }
    });
}

// ============================================================
// 5. LÓGICA: GERENCIAR (gerenciar.html)
// ============================================================
function initGerenciar() {
    const btnVer = document.getElementById('btnVerMeus');
    btnVer.addEventListener('click', async () => {
        const codigo = document.getElementById('codigoGerenciar').value;
        if (!codigo) return showToast("Digite o código", 'warning');

        // 1. Achar cliente
        const { data: cliente } = await supabaseClient.from('clientes').select('id, nome_crianca').eq('codigo_acesso', codigo).single();
        
        if (!cliente) return showToast("Código inválido", 'error');

        // 2. Buscar agendamentos
        const lista = document.getElementById('listaMeusAgendamentos');
        lista.innerHTML = 'Carregando...';

        const { data: agendamentos } = await supabaseClient
            .from('agendamentos')
            .select('*')
            .eq('cliente_id', cliente.id)
            .order('data', { ascending: true });

        lista.innerHTML = '';
        if (!agendamentos || agendamentos.length === 0) {
            lista.innerHTML = '<p style="text-align:center; color:#666;">Nenhum agendamento encontrado.</p>';
            return;
        }

        agendamentos.forEach(ag => {
            const card = document.createElement('div');
            card.className = 'card';
            
            let btnCancel = '';
            if (ag.status !== 'Cancelado' && ag.status !== 'Compareceu') {
                btnCancel = `<button class="btn-cancelar" onclick="cancelarPeloCliente(${ag.id})"><i class="fa-solid fa-ban"></i> Cancelar</button>`;
            }

            card.innerHTML = `
                <div class="card-header"><i class="fa-regular fa-calendar card-icon"></i> ${formatarDataBr(ag.data)} - ${ag.horario.slice(0,5)}</div>
                <div><strong>${ag.servico}</strong> com ${ag.profissional}</div>
                <div style="font-size:0.9rem; color:#666;">Status: ${ag.status}</div>
                ${btnCancel}
            `;
            lista.appendChild(card);
        });
    });
}

// Função global para o cliente cancelar
window.cancelarPeloCliente = async function(id) {
    if (!confirm("Tem certeza que deseja cancelar?")) return;
    const { error } = await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    if (error) showToast("Erro ao cancelar", 'error');
    else {
        showToast("Agendamento cancelado", 'success');
        document.getElementById('btnVerMeus').click(); // Recarrega lista
    }
}

// ============================================================
// 6. LÓGICA: ADMIN (admin.html)
// ============================================================
function initAdmin() {
    window.carregarAgendaAdmin();
    window.carregarServicosAdmin();
    window.carregarProfissionaisAdmin();
}

// --- CARREGAR AGENDA (ADMIN) ---
// CORREÇÃO: Agora busca 'autoriza_foto' e exibe 'observacoes'
window.carregarAgendaAdmin = async function() {
    const tbody = document.querySelector('#tabelaAgendamentos tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Carregando...</td></tr>';

    // Busca dados unindo com a tabela clientes
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
        // Lógica Data (Destacar hoje)
        const hoje = new Date().toISOString().split('T')[0];
        let trClass = '';
        if (item.data === hoje) trClass = 'hoje-highlight';

        // Cores Status
        let statusColor = '#666';
        if (item.status === 'Confirmado') statusColor = 'var(--secondary)';
        if (item.status === 'Cancelado') statusColor = 'var(--danger)';
        if (item.status === 'Compareceu') statusColor = 'var(--success)';

        // Ícone Foto (Sim/Não)
        const autoriza = item.clientes?.autoriza_foto === 'Sim';
        const iconFoto = autoriza 
            ? `<i class="fa-solid fa-camera" style="color:var(--success); margin-left:5px;" title="Autoriza Foto"></i>` 
            : `<i class="fa-solid fa-camera-slash" style="color:var(--danger); margin-left:5px;" title="NÃO Autoriza Foto"></i>`;

        // Observação
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
                    <button onclick="window.cancelarAgendamento(${item.id})" class="btn-icon cancel" title="Cancelar"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// --- FUNÇÕES ADMIN AUXILIARES ---

window.marcarStatus = async function(id, clienteId, status) {
    if (!confirm(`Marcar como ${status}?`)) return;
    await supabaseClient.from('agendamentos').update({ status: status }).eq('id', id);
    if (status === 'Compareceu') {
        // Incrementa fidelidade (opcional)
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

window.salvarProfissional = async function() {
    const nome = document.getElementById('nomeProf').value;
    // Captura checkboxes de dias
    const dias = Array.from(document.querySelectorAll('input[name="diaTrabalho"]:checked')).map(el => el.value);
    
    if(!nome) return showToast("Preencha o nome", 'error');

    await supabaseClient.from('profissionais').insert([{ 
        nome, 
        dias_trabalho: dias // Salva array ["Seg", "Ter"] 
        // horários inicio/fim podem ser implementados depois
    }]);
    
    showToast("Profissional salvo!", 'success');
    document.getElementById('nomeProf').value = '';
    window.carregarProfissionaisAdmin();
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

window.deletarItem = async function(tabela, id) {
    if (!confirm("Excluir permanentemente?")) return;
    await supabaseClient.from(tabela).delete().eq('id', id);
    showToast("Excluído!", 'success');
    if (tabela === 'servicos') window.carregarServicosAdmin();
    if (tabela === 'profissionais') window.carregarProfissionaisAdmin();
};
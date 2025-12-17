// ============================================================
// 1. CONFIGURAÇÃO (SUPABASE)
// ============================================================
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

// Variável Global do Cliente
let supabaseClient;

// ============================================================
// 2. FUNÇÕES UTILITÁRIAS (TOAST E DATA)
// ============================================================

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    // Ajuste de ícones
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';

    toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Animações
    requestAnimationFrame(() => { toast.style.animation = 'slideIn 0.3s ease forwards'; });
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatarDataBr(dataIso) {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// ============================================================
// 3. FUNÇÕES GLOBAIS DO ADMIN
// (Precisam estar no 'window' para os botões onclick do HTML funcionarem)
// ============================================================

window.carregarAgendaAdmin = async function() {
    const tbody = document.querySelector('#tabelaAgendamentos tbody');
    if (!tbody) return; // Se não estiver na página admin, para aqui.

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Carregando...</td></tr>';

    // Busca dados com relacionamento para pegar nome e se autoriza foto
    const { data, error } = await supabaseClient
        .from('agendamentos')
        .select('*, clientes(nome_responsavel, nome_crianca, telefone, autoriza_foto)') 
        .order('data', { ascending: true })
        .order('horario', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red">Erro: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    if(!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum agendamento.</td></tr>';
        return;
    }

    data.forEach(item => {
        const hoje = new Date().toISOString().split('T')[0];
        const trClass = item.data === hoje ? 'hoje-highlight' : '';

        // Status com cores
        let statusColor = '#666';
        if (item.status === 'Confirmado') statusColor = 'var(--secondary)';
        if (item.status === 'Cancelado') statusColor = 'var(--danger)';
        if (item.status === 'Compareceu') statusColor = 'var(--success)';

        // Ícone Foto
        const autoriza = item.clientes?.autoriza_foto === 'Sim';
        const iconFoto = autoriza 
            ? `<i class="fa-solid fa-camera" style="color:var(--success); margin-left:5px;" title="Autoriza Foto"></i>` 
            : `<i class="fa-solid fa-camera-slash" style="color:var(--danger); margin-left:5px;" title="NÃO Autoriza Foto"></i>`;

        // Observação (Só mostra se tiver)
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
                    <button onclick="cancelarAgendamentoAdmin(${item.id})" class="btn-icon cancel" title="Cancelar"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.marcarStatus = async function(id, clienteId, status) {
    if (!confirm(`Marcar este agendamento como ${status}?`)) return;
    
    await supabaseClient.from('agendamentos').update({ status: status }).eq('id', id);
    
    if (status === 'Compareceu') {
        const { data } = await supabaseClient.from('clientes').select('saldo_fidelidade').eq('id', clienteId).single();
        const novoSaldo = (data?.saldo_fidelidade || 0) + 1;
        await supabaseClient.from('clientes').update({ saldo_fidelidade: novoSaldo }).eq('id', clienteId);
        showToast("Presença confirmada e saldo atualizado!", 'success');
    }
    window.carregarAgendaAdmin();
};

window.cancelarAgendamentoAdmin = async function(id) {
    if(!confirm("Cancelar este agendamento?")) return;
    const { error } = await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    if (error) showToast("Erro: " + error.message, 'error');
    else {
        showToast("Agendamento cancelado!", 'success');
        window.carregarAgendaAdmin();
    }
};

window.salvarServico = async function() {
    const nome = document.getElementById('nomeServico')?.value;
    const preco = document.getElementById('precoServico')?.value;
    if(!nome || !preco) return showToast("Preencha nome e preço", 'error');
    
    await supabaseClient.from('servicos').insert([{ nome, preco }]);
    showToast("Serviço salvo!", 'success');
    
    if(document.getElementById('nomeServico')) document.getElementById('nomeServico').value = '';
    if(document.getElementById('precoServico')) document.getElementById('precoServico').value = '';
    
    window.carregarServicosAdmin();
};

window.carregarServicosAdmin = async function() {
    const tbody = document.querySelector('#tabelaServicos tbody');
    if(!tbody) return;
    
    const { data } = await supabaseClient.from('servicos').select('*');
    tbody.innerHTML = '';
    if(data) {
        data.forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td>${s.nome}</td>
                    <td>R$ ${s.preco}</td>
                    <td><button onclick="deletarItem('servicos', ${s.id})" class="btn-icon cancel"><i class="fa-solid fa-trash"></i></button></td>
                </tr>`;
        });
    }
};

window.salvarProfissional = async function() {
    const nome = document.getElementById('nomeProf')?.value;
    const dias = Array.from(document.querySelectorAll('input[name="diaTrabalho"]:checked')).map(el => el.value);
    
    if(!nome) return showToast("Preencha o nome do profissional", 'error');

    await supabaseClient.from('profissionais').insert([{ nome, dias_trabalho: dias }]);
    showToast("Profissional salvo!", 'success');
    
    if(document.getElementById('nomeProf')) document.getElementById('nomeProf').value = '';
    window.carregarProfissionaisAdmin();
};

window.carregarProfissionaisAdmin = async function() {
    const tbody = document.querySelector('#tabelaProfissionais tbody');
    if(!tbody) return;
    
    const { data } = await supabaseClient.from('profissionais').select('*');
    tbody.innerHTML = '';
    if(data) {
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
    }
};

window.deletarItem = async function(tabela, id) {
    if (!confirm("Tem certeza que deseja excluir permanentemente?")) return;
    await supabaseClient.from(tabela).delete().eq('id', id);
    showToast("Item excluído!", 'success');
    
    if (tabela === 'servicos') window.carregarServicosAdmin();
    if (tabela === 'profissionais') window.carregarProfissionaisAdmin();
};

// ============================================================
// 4. INICIALIZAÇÃO E ROTEAMENTO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa Supabase
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
        console.error("Erro ao iniciar Supabase:", e);
        showToast("Erro de conexão com o banco de dados.", 'error');
        return;
    }

    // Identificação Robusta da Página
    const path = window.location.pathname.toLowerCase();
    const href = window.location.href.toLowerCase();

    // Roteamento
    if (path.includes('cadastro') || href.includes('cadastro')) {
        initCadastro();
    } 
    else if (path.includes('agendar') || href.includes('agendar')) {
        initAgendar();
    } 
    else if (path.includes('gerenciar') || href.includes('gerenciar')) {
        initGerenciar();
    } 
    else if (path.includes('admin') || href.includes('admin')) {
        initAdmin();
    }
});

// ============================================================
// 5. LÓGICA DE CADA TELA
// ============================================================

// --- TELA ADMIN ---
function initAdmin() {
    // Carrega as listas assim que entra no Admin
    window.carregarAgendaAdmin();
    window.carregarServicosAdmin();
    window.carregarProfissionaisAdmin();
}

// --- TELA CADASTRO ---
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

        if (!nomeResp || !nomeCrianca || !telefone) {
            showToast("Preencha os campos obrigatórios!", 'error');
            return;
        }

        const codigo = Math.floor(1000 + Math.random() * 9000).toString();
        btnSalvar.textContent = "Salvando...";
        btnSalvar.disabled = true;

        const { error } = await supabaseClient.from('clientes').insert([{
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
            document.querySelector('.box form').style.display = 'none';
            document.querySelector('.box h2').style.display = 'none';
            // Verifica se o elemento existe antes de tentar acessar estilo
            const backLink = document.querySelector('.back-link');
            if(backLink) backLink.style.display = 'none';
            
            const sucessoBox = document.getElementById('sucessoBox');
            sucessoBox.classList.remove('hidden');
            sucessoBox.style.display = 'block';
            
            document.getElementById('codigoGerado').innerText = codigo;
        }
    });
}

// --- TELA AGENDAR ---
function initAgendar() {
    // Estado local para o fluxo de agendamento
    window.agendamentoEstado = {
        cliente: null, servico: null, profissional: null, data: null, horario: null
    };

    const btnBuscar = document.getElementById('btnBuscarCliente');
    
    // Se não achou o botão, provavelmente não estamos na tela certa, aborta
    if (!btnBuscar) return;

    btnBuscar.addEventListener('click', async () => {
        const codigoInput = document.getElementById('codigoCliente');
        const codigo = codigoInput ? codigoInput.value : '';

        if (!codigo) return showToast("Digite o código do cliente!", 'warning');

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
            // Sucesso
            window.agendamentoEstado.cliente = data;
            
            // Oculta Passo 1
            const step1 = document.getElementById('step1');
            if(step1) {
                step1.classList.remove('active');
                step1.style.display = 'none';
            }
            
            // Exibe Passo 2 (CORREÇÃO FUNDAMENTAL: Remover classe 'hidden')
            const step2 = document.getElementById('step2');
            if(step2) {
                step2.classList.remove('hidden');
                step2.classList.add('active');
                step2.style.display = 'block';
            }

            const infoCliente = document.getElementById('infoCliente');
            if(infoCliente) {
                infoCliente.innerHTML = `
                <div style="text-align:center;">
                    <strong>Olá, ${data.nome_responsavel}!</strong><br>
                    Atendimento para: <strong>${data.nome_crianca}</strong>
                </div>`;
            }
            
            carregarServicosAgendamento();
        }
    });

    // Funções internas do Agendamento
    async function carregarServicosAgendamento() {
        const container = document.getElementById('listaServicos');
        if(!container) return;

        container.innerHTML = '<p>Carregando serviços...</p>';
        const { data } = await supabaseClient.from('servicos').select('*');
        container.innerHTML = '';
        
        if (data) {
            data.forEach(serv => {
                const div = document.createElement('div');
                div.className = 'option-card';
                div.innerHTML = `<strong>${serv.nome}</strong><span>R$ ${serv.preco}</span>`;
                div.onclick = () => {
                    document.querySelectorAll('#listaServicos .option-card').forEach(el => el.classList.remove('selected'));
                    div.classList.add('selected');
                    window.agendamentoEstado.servico = serv;
                    
                    const selecaoData = document.getElementById('selecaoData');
                    if(selecaoData) {
                        selecaoData.classList.remove('hidden');
                        selecaoData.style.display = 'block';
                    }
                    carregarProfissionaisAgendamento();
                };
                container.appendChild(div);
            });
        }
    }

    async function carregarProfissionaisAgendamento() {
        const { data } = await supabaseClient.from('profissionais').select('*');
        window.listaProfissionais = data || [];
        
        const dateInput = document.getElementById('dataAgendamento');
        if(!dateInput) return;

        const hoje = new Date().toISOString().split('T')[0];
        dateInput.value = hoje;
        dateInput.min = hoje;
        
        buscarHorariosDisponiveis(hoje);

        // Remove listeners antigos para evitar duplicação (hack simples)
        const novoInput = dateInput.cloneNode(true);
        dateInput.parentNode.replaceChild(novoInput, dateInput);
        
        novoInput.addEventListener('change', (e) => {
            buscarHorariosDisponiveis(e.target.value);
        });
    }

    async function buscarHorariosDisponiveis(dataSelecionada) {
        const container = document.getElementById('horariosGrid');
        if(!container) return;

        container.innerHTML = '<p>Carregando...</p>';
        window.agendamentoEstado.data = dataSelecionada;

        const { data: agendados } = await supabaseClient
            .from('agendamentos')
            .select('horario, profissional')
            .eq('data', dataSelecionada)
            .neq('status', 'Cancelado');

        // Horários fixos para teste
        const horariosBase = ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];
        
        container.innerHTML = '';

        if (!window.listaProfissionais || window.listaProfissionais.length === 0) {
            container.innerHTML = '<p>Nenhum profissional disponível.</p>';
            return;
        }

        horariosBase.forEach(hora => {
            const ocupados = (agendados || []).filter(a => a.horario.slice(0,5) === hora).map(a => a.profissional);
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
        const titulo = document.getElementById('horaModalTitle');
        
        if(!modal || !lista) return;

        titulo.textContent = `Profissionais às ${hora}`;
        lista.innerHTML = '';

        profissionaisLivres.forEach(prof => {
            const pDiv = document.createElement('div');
            pDiv.style.cssText = "padding:10px; border:1px solid #eee; margin:5px 0; border-radius:8px; cursor:pointer;";
            pDiv.innerHTML = `<strong>${prof.nome}</strong>`;
            pDiv.onclick = () => {
                window.agendamentoEstado.horario = hora;
                window.agendamentoEstado.profissional = prof.nome;
                
                const resumo = document.getElementById('resumoAgendamento');
                if(resumo) {
                    resumo.innerHTML = `
                    Serviço: <strong>${window.agendamentoEstado.servico.nome}</strong><br>
                    Profissional: <strong>${prof.nome}</strong><br>
                    Data: <strong>${formatarDataBr(window.agendamentoEstado.data)}</strong> às <strong>${hora}</strong>`;
                }

                const btnConf = document.getElementById('btnConfirmarAgendamento');
                if(btnConf) btnConf.disabled = false;
                
                modal.style.display = 'none';
            };
            lista.appendChild(pDiv);
        });

        modal.style.display = 'flex';
        
        const btnFechar = document.getElementById('fecharModal');
        if(btnFechar) btnFechar.onclick = () => { modal.style.display = 'none'; };
    }

    // Botão FINAL Confirmar
    const btnConfirmar = document.getElementById('btnConfirmarAgendamento');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', async () => {
            const obsInput = document.getElementById('obsAgendamento');
            const obs = obsInput ? obsInput.value : '';
            
            btnConfirmar.textContent = "Confirmando...";
            btnConfirmar.disabled = true;

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
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Confirmar Agendamento';
            } else {
                // Remove passo 2
                const step2 = document.getElementById('step2');
                if(step2) {
                    step2.classList.remove('active');
                    step2.style.display = 'none';
                }
                
                // Exibe passo 3 (Sucesso)
                const step3 = document.getElementById('step3');
                if(step3) {
                    step3.classList.remove('hidden');
                    step3.classList.add('active');
                    step3.style.display = 'block';
                }

                const zapBtn = document.getElementById('btnZap');
                if(zapBtn) {
                    const dataF = formatarDataBr(window.agendamentoEstado.data);
                    const msg = `Olá! Acabei de agendar para ${window.agendamentoEstado.cliente.nome_crianca} no dia ${dataF} às ${window.agendamentoEstado.horario}.`;
                    zapBtn.onclick = () => {
                        window.open(`https://wa.me/554896304505?text=${encodeURIComponent(msg)}`, '_blank');
                    };
                }
            }
        });
    }
}

// --- TELA GERENCIAR (MEUS AGENDAMENTOS) ---
function initGerenciar() {
    const btnVer = document.getElementById('btnVerMeus');
    if(!btnVer) return;

    btnVer.addEventListener('click', async () => {
        const codigoInput = document.getElementById('codigoGerenciar');
        const codigo = codigoInput ? codigoInput.value : '';
        
        if (!codigo) return showToast("Digite o código", 'warning');

        // 1. Busca cliente
        const { data: cliente } = await supabaseClient.from('clientes').select('id').eq('codigo_acesso', codigo).single();
        
        if (!cliente) return showToast("Código inválido", 'error');

        // 2. Busca agendamentos
        const lista = document.getElementById('listaMeusAgendamentos');
        if(lista) lista.innerHTML = 'Carregando...';

        const { data: agendamentos } = await supabaseClient
            .from('agendamentos')
            .select('*')
            .eq('cliente_id', cliente.id)
            .order('data', { ascending: true });

        if(lista) {
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
        }
    });
}

// Função global para cancelar pelo cliente
window.cancelarPeloCliente = async function(id) {
    if (!confirm("Tem certeza que deseja cancelar?")) return;
    const { error } = await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    if (error) showToast("Erro ao cancelar", 'error');
    else {
        showToast("Agendamento cancelado", 'success');
        document.getElementById('btnVerMeus').click();
    }
}
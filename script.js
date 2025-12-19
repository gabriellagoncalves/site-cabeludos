// ============================================================
// 1. CONFIGURAÇÃO E CONEXÃO COM O SUPABASE
// ============================================================

// ⚠️ COLE SUAS CHAVES AQUI
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

// Inicializa a variável do cliente
let supabaseClient;

// Tenta conectar imediatamente
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase conectado com sucesso.");
    } else {
        console.error("Biblioteca Supabase não encontrada no HTML.");
    }
} catch (e) {
    console.error("Erro ao inicializar Supabase:", e);
}

// ============================================================
// 2. FUNÇÕES UTILITÁRIAS (GLOBAIS)
// ============================================================

window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if(type === 'success') iconClass = 'fa-circle-check';
    if(type === 'error') iconClass = 'fa-circle-exclamation';
    
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
};

window.setLoading = function(btnId, isLoading, text = "Aguarde...") {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    if (isLoading) {
        if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<div class="loading-spinner"></div> ${text}`;
        btn.disabled = true;
    } else {
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }
};

// ============================================================
// 3. LÓGICA DE ADMINISTRAÇÃO (GLOBAIS)
// ============================================================

window.logarAdmin = function() {
    const senhaInput = document.getElementById('senhaAdmin');
    if (!senhaInput) return;
    
    if (senhaInput.value === "admin123") {
        document.getElementById('loginArea').style.display = 'none';
        const painel = document.getElementById('painelAdmin');
        painel.classList.remove('hidden'); 
        painel.style.display = 'block';    
        
        window.initAdmin();
    } else {
        window.showToast("Senha incorreta!", 'error');
    }
};

window.initAdmin = function() {
    const hoje = new Date().toISOString().split('T')[0];
    const inputDate = document.getElementById('dataAgendaAdmin');
    if (inputDate) inputDate.value = hoje;
    
    safeCall(window.carregarAgendaAdmin);
    safeCall(window.carregarServicosAdmin);
    safeCall(window.carregarProfissionaisAdmin);
    safeCall(window.carregarIndicadoresAdmin);
    safeCall(window.carregarFiltroProfissionais);
    safeCall(window.carregarClientesAdmin);
    safeCall(window.carregarDadosAtendimentoRapido); // Carrega dados para aba Rápido
};

function safeCall(fn) { if (typeof fn === 'function') fn(); }

window.abrirTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    const tab = document.getElementById(tabName);
    if (tab) tab.style.display = 'block';
    
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
};

// --- Funções CRUD do Admin ---

window.salvarServico = async function() {
    const nome = document.getElementById('nomeServico').value;
    const valor = document.getElementById('valorServico').value;
    const tempo = document.getElementById('tempoServico').value;

    if (!nome || !valor || !tempo) return window.showToast("Preencha todos os campos!", 'error');

    const { error } = await supabaseClient.from('servicos').insert([{ nome, valor, duracao_minutos: tempo }]);
    
    if (error) window.showToast("Erro: " + error.message, 'error');
    else {
        window.showToast("Serviço Salvo!", 'success');
        window.carregarServicosAdmin();
        document.getElementById('nomeServico').value = "";
        document.getElementById('valorServico').value = "";
        document.getElementById('tempoServico').value = "";
    }
};

window.carregarServicosAdmin = async function() {
    const tbody = document.querySelector('#tabelaServicos tbody');
    if (!tbody) return;
    
    const { data } = await supabaseClient.from('servicos').select('*');
    tbody.innerHTML = "";
    
    if (data) {
        data.forEach(s => {
            tbody.innerHTML += `<tr><td>${s.nome}</td><td>R$ ${s.valor}</td><td>${s.duracao_minutos} min</td><td><button class="btn btn-red" onclick="deletarItem('servicos', '${s.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    }
};

window.salvarProfissional = async function() {
    const nome = document.getElementById('nomeProf').value;
    const inicio = document.getElementById('inicioProf').value;
    const fim = document.getElementById('fimProf').value;
    
    const checkboxes = document.querySelectorAll('input[name="diaTrabalho"]:checked');
    const diasString = Array.from(checkboxes).map(cb => cb.value).join(',');

    if (!nome || !inicio || !fim || !diasString) return window.showToast("Preencha tudo!", 'error');

    const { error } = await supabaseClient.from('profissionais').insert([{ nome, dias_trabalho: diasString, horario_inicio: inicio, horario_fim: fim }]);
    
    if (error) window.showToast("Erro: " + error.message, 'error');
    else {
        window.showToast("Profissional Salvo!", 'success');
        window.carregarProfissionaisAdmin();
        window.carregarFiltroProfissionais();
        document.getElementById('nomeProf').value = "";
    }
};

window.carregarProfissionaisAdmin = async function() {
    const tbody = document.querySelector('#tabelaProfissionais tbody');
    if (!tbody) return;
    
    const { data } = await supabaseClient.from('profissionais').select('*');
    tbody.innerHTML = "";
    
    if (data) {
        data.forEach(p => {
            tbody.innerHTML += `<tr><td>${p.nome}</td><td>${p.horario_inicio.slice(0,5)} - ${p.horario_fim.slice(0,5)}</td><td>${p.dias_trabalho}</td><td><button class="btn btn-red" onclick="deletarItem('profissionais', '${p.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    }
};

window.carregarFiltroProfissionais = async function() {
    const select = document.getElementById('filtroProfissionalAgenda');
    if (!select) return;
    
    const { data } = await supabaseClient.from('profissionais').select('nome');
    select.innerHTML = '<option value="">Todos os Profissionais</option>';
    if (data) {
        data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.nome;
            opt.textContent = p.nome;
            select.appendChild(opt);
        });
    }
};

// --- NOVO: LÓGICA DE CLIENTES COM CONTAGEM DE FIDELIDADE ---
window.carregarClientesAdmin = async function() {
    const termoResp = document.getElementById('buscaResponsavel')?.value.toLowerCase() || "";
    const termoCrianca = document.getElementById('buscaCrianca')?.value.toLowerCase() || "";
    
    // Busca clientes e saldo de fidelidade
    let { data: clientes, error } = await supabaseClient.from('clientes').select('*').order('created_at', { ascending: false });
    
    if (error) return console.error(error);
    if (!clientes) clientes = [];

    const elLista = document.getElementById('kpiOrigemList');
    if (elLista && !termoResp && !termoCrianca) {
        const elTotal = document.getElementById('kpiTotalClientes');
        if (elTotal) elTotal.innerText = clientes.length;
        
        if (clientes.length === 0) {
            elLista.innerHTML = "Nenhum dado ainda.";
        } else {
            const origensCount = {};
            clientes.forEach(c => { 
                const o = c.origem || 'Não informado'; 
                origensCount[o] = (origensCount[o] || 0) + 1; 
            });
            
            let htmlOrigens = '<ul class="origin-list">';
            Object.entries(origensCount)
                .sort((a,b) => b[1] - a[1])
                .forEach(([nome, qtd]) => {
                    const pct = ((qtd/clientes.length)*100).toFixed(0);
                    htmlOrigens += `<li class="origin-item" style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee;">
                        <span>${nome} <small>(${qtd})</small></span> 
                        <span style="font-weight:bold; color:var(--secondary);">${pct}%</span>
                    </li>`;
                });
            htmlOrigens += '</ul>';
            elLista.innerHTML = htmlOrigens;
        }
    }

    const tbody = document.querySelector('#tabelaClientes tbody');
    if (tbody) {
        const filtrados = clientes.filter(c => 
            (c.nome_responsavel || "").toLowerCase().includes(termoResp) && 
            (c.nome_crianca || "").toLowerCase().includes(termoCrianca)
        );
        
        tbody.innerHTML = "";
        if (filtrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Nenhum encontrado</td></tr>';
        } else {
            filtrados.forEach(c => {
                const nasc = c.data_nascimento ? c.data_nascimento.split('-').reverse().join('/') : "-";
                // Cálculo Fidelidade: Saldo atual % 11 (ex: 5/10)
                const saldo = c.saldo_fidelidade || 0;
                const progresso = saldo % 11;
                const statusFid = progresso === 10 ? 
                    `<span style="color:green; font-weight:bold;">GRÁTIS DISPONÍVEL!</span>` : 
                    `<span style="color:#666;">${progresso}/10</span>`;

                tbody.innerHTML += `<tr>
                    <td><strong>${c.codigo_cliente}</strong></td>
                    <td>${c.nome_responsavel}</td>
                    <td>${c.nome_crianca}</td>
                    <td>${nasc}</td>
                    <td>${c.telefone}</td>
                    <td>${statusFid}</td>
                    <td><button class="btn btn-red" style="padding:5px 10px;" onclick="deletarItem('clientes', '${c.id}')"><i class="fa-solid fa-trash"></i></button></td>
                </tr>`;
            });
        }
    }
};

window.carregarAgendaAdmin = async function() {
    const dataInput = document.getElementById('dataAgendaAdmin');
    if (!dataInput) return;
    
    const data = dataInput.value;
    const filtro = document.getElementById('filtroProfissionalAgenda')?.value;
    const div = document.getElementById('listaAgendaAdmin');
    
    div.innerHTML = '<div style="text-align:center; padding:20px;">Carregando...</div>';

    let query = supabaseClient.from('agendamentos')
        .select(`*, clientes(nome_crianca, nome_responsavel, observacoes, autoriza_foto)`)
        .eq('data_agendada', data)
        .order('horario_inicio');

    if (filtro) query = query.eq('profissional_nome', filtro);

    const { data: agenda } = await query;

    if (!agenda || agenda.length === 0) {
        div.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Nenhum agendamento encontrado.</div>';
        return;
    }

    let html = `<table><thead><tr><th>Hora</th><th>Cliente</th><th>Serviço/Prof</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;
    agenda.forEach(item => {
        let badge = `status-${item.status.split(' ')[0]}`;
        const horaDisplay = `${item.horario_inicio.slice(0,5)} - ${item.horario_fim.slice(0,5)}`;
        
        html += `<tr>
            <td><strong>${horaDisplay}</strong></td>
            <td>
                ${item.clientes?.nome_crianca} <small>(${item.clientes?.nome_responsavel})</small>
                ${item.clientes?.observacoes ? `<br><small style="color:red">Obs: ${item.clientes.observacoes}</small>` : ''}
            </td>
            <td>${item.servico}<br><small>${item.profissional_nome || 'Equipe'}</small></td>
            <td><span class="status-badge ${badge}">${item.status}</span></td>
            <td>
                ${item.status === 'Agendado' ? `
                <button class="btn btn-green" style="padding:5px; width:auto; display:inline;" onclick="marcarStatus('${item.id}', '${item.cliente_id}', 'Compareceu')"><i class="fa-solid fa-check"></i></button>
                <button class="btn btn-red" style="padding:5px; width:auto; display:inline;" onclick="marcarStatus('${item.id}', '${item.cliente_id}', 'Faltou')"><i class="fa-solid fa-xmark"></i></button>
                ` : '-'}
            </td>
        </tr>`;
    });
    div.innerHTML = html + "</tbody></table>";
};

window.marcarStatus = async function(id, clienteId, status) {
    if (!confirm(`Marcar como ${status}?`)) return;
    
    await supabaseClient.from('agendamentos').update({ status: status }).eq('id', id);
    
    if (status === 'Compareceu') {
        const { data } = await supabaseClient.from('clientes').select('saldo_fidelidade').eq('id', clienteId).single();
        await supabaseClient.from('clientes').update({ saldo_fidelidade: (data.saldo_fidelidade || 0) + 1 }).eq('id', clienteId);
        window.showToast("Presença confirmada (+1 fidelidade)", 'success');
    }
    
    window.carregarAgendaAdmin();
    window.carregarIndicadoresAdmin();
};

window.carregarIndicadoresAdmin = async function() {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();
    
    const { data } = await supabaseClient.from('agendamentos').select('*').gte('data_agendada', firstDay).lte('data_agendada', lastDay);
    if (!data) return;
    
    let fat = 0, tot = data.length, canc = 0, comp = 0;
    const servs = {};
    
    data.forEach(item => {
        if (item.status === 'Cancelado') canc++;
        if (item.status === 'Compareceu') { 
            comp++; 
            if (!item.eh_gratis) fat += parseFloat(item.valor_servico || 0); 
        }
        if (item.status !== 'Cancelado') servs[item.servico] = (servs[item.servico] || 0) + 1;
    });

    const elFat = document.getElementById('kpiFaturamento');
    if (elFat) elFat.innerText = fat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const elTot = document.getElementById('kpiTotal');
    if (elTot) elTot.innerText = tot;
    
    const elCanc = document.getElementById('kpiCancelados');
    if (elCanc) elCanc.innerText = canc;
    
    const elComp = document.getElementById('kpiComparecimento');
    if (elComp) elComp.innerText = tot > 0 ? ((comp / (tot - canc)) * 100).toFixed(0) + '%' : '0%';
    
    const tbody = document.querySelector('#tabelaTopServicos tbody');
    if (tbody) {
        tbody.innerHTML = "";
        Object.entries(servs).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
             tbody.innerHTML += `<tr><td>${k}</td><td>${v}</td><td>-</td></tr>`;
        });
    }
};

window.deletarItem = async function(tabela, id) {
    if (!confirm("Excluir item permanentemente?")) return;
    
    const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
    
    if (error) window.showToast("Erro: " + error.message, 'error');
    else {
        window.showToast("Excluído com sucesso!", 'success');
        if (tabela === 'servicos') window.carregarServicosAdmin();
        if (tabela === 'profissionais') window.carregarProfissionaisAdmin();
        if (tabela === 'clientes') window.carregarClientesAdmin();
    }
};

window.cancelarAgendamento = async function(id) {
    if (!confirm("Cancelar agendamento?")) return;
    
    const { error } = await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    if (error) window.showToast("Erro: " + error.message, 'error');
    else {
        window.showToast("Cancelado com sucesso!", 'success');
        if (document.getElementById('btnBuscarAgendamentos')) document.getElementById('btnBuscarAgendamentos').click();
    }
};

// --- NOVO: ATENDIMENTO RÁPIDO (LÓGICA) ---
window.carregarDadosAtendimentoRapido = async function() {
    const selServico = document.getElementById('rapidoServico');
    const selProf = document.getElementById('rapidoProfissional');
    
    if(selServico && selProf) {
        const { data: servicos } = await supabaseClient.from('servicos').select('*');
        const { data: profs } = await supabaseClient.from('profissionais').select('*');
        
        selServico.innerHTML = '<option value="">Selecione...</option>';
        if(servicos) servicos.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.nome; // Nome do serviço
            opt.setAttribute('data-valor', s.valor);
            opt.textContent = `${s.nome} (R$ ${s.valor})`;
            selServico.appendChild(opt);
        });

        selProf.innerHTML = '<option value="">Selecione...</option>';
        if(profs) profs.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.nome;
            opt.textContent = p.nome;
            selProf.appendChild(opt);
        });
    }
};

window.salvarAtendimentoRapido = async function() {
    const nomeCliente = document.getElementById('rapidoNomeCliente').value || "Cliente Balcão";
    const servicoSelect = document.getElementById('rapidoServico');
    const profNome = document.getElementById('rapidoProfissional').value;
    
    if(!servicoSelect.value || !profNome) return window.showToast("Selecione Serviço e Profissional", 'error');

    const servicoNome = servicoSelect.value;
    const valor = parseFloat(servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-valor'));
    
    // Dados para salvar (data de hoje, hora de agora)
    const hoje = new Date();
    const dataStr = hoje.toISOString().split('T')[0];
    const horaStr = hoje.toTimeString().slice(0,5);

    // 1. Cria cliente rápido (oculto/anônimo)
    const codRandom = 'R-' + Math.floor(Math.random()*100000);
    const { data: cliente, error: errCli } = await supabaseClient.from('clientes').insert([{
        nome_responsavel: nomeCliente,
        nome_crianca: nomeCliente,
        telefone: '0000000000',
        data_nascimento: dataStr,
        codigo_cliente: codRandom,
        origem: 'Balcão'
    }]).select().single();

    if(errCli) return window.showToast("Erro ao criar cliente: " + errCli.message, 'error');

    // 2. Cria agendamento já como "Compareceu"
    const { error } = await supabaseClient.from('agendamentos').insert([{
        cliente_id: cliente.id,
        servico: servicoNome,
        valor_servico: valor,
        profissional_nome: profNome,
        data_agendada: dataStr,
        horario_inicio: horaStr,
        horario_fim: horaStr,
        status: 'Compareceu',
        eh_gratis: false
    }]);

    if(error) window.showToast("Erro ao salvar: " + error.message, 'error');
    else {
        window.showToast("Atendimento Registrado!", 'success');
        // Limpar campos
        document.getElementById('rapidoNomeCliente').value = "";
        servicoSelect.value = "";
        document.getElementById('rapidoProfissional').value = "";
        
        // Atualiza indicadores
        window.carregarIndicadoresAdmin();
    }
};

// ============================================================
// 4. EVENT LISTENERS DE PÁGINA (CARREGAMENTO)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- CADASTRO ---
    const formCad = document.getElementById('formCadastro');
    if (formCad) {
        const telInput = document.getElementById('telefone');
        if (telInput) {
            telInput.addEventListener('input', e => {
                let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
                e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
            });
        }

        formCad.addEventListener('submit', async (e) => {
            e.preventDefault();
            window.setLoading('btnSalvar', true, "Salvando...");
            
            const codigo = new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000);
            
            const dados = {
                nome_responsavel: document.getElementById('responsavel').value,
                telefone: document.getElementById('telefone').value,
                email: document.getElementById('email').value,
                instagram: document.getElementById('instagram').value,
                nome_crianca: document.getElementById('crianca').value,
                data_nascimento: document.getElementById('nascimento').value,
                observacoes: document.getElementById('obs').value,
                origem: document.getElementById('origem').value,
                autoriza_foto: document.getElementById('foto').value,
                codigo_cliente: codigo
            };

            const { error } = await supabaseClient.from('clientes').insert([dados]);
            window.setLoading('btnSalvar', false, "Salvar Cadastro");

            if (error) {
                window.showToast("Erro ao salvar: " + error.message, 'error');
            } else {
                document.getElementById('formBox').classList.add('hidden');
                document.getElementById('formBox').style.display = 'none';
                
                document.getElementById('sucessoBox').classList.remove('hidden');
                document.getElementById('sucessoBox').style.display = 'block';
                
                document.getElementById('codigoGerado').innerText = codigo;
            }
        });
    }

    // --- AGENDAR ---
    const btnBuscar = document.getElementById('btnBuscarCliente');
    if (btnBuscar) {
        let clienteAtual = null;
        let horarioEscolhido = null;
        let duracaoEscolhida = 0;
        let profissionalEscolhido = null;

        // Carregar Serviços
        (async () => {
            const select = document.getElementById('servicoSelect');
            if (select) {
                const { data } = await supabaseClient.from('servicos').select('*');
                if (data) {
                    select.innerHTML = '<option value="">Selecione...</option>';
                    data.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.nome;
                        opt.text = `${s.nome} - R$ ${s.valor}`;
                        opt.setAttribute('data-tempo', s.duracao_minutos);
                        opt.setAttribute('data-valor', s.valor);
                        select.appendChild(opt);
                    });
                }
            }
        })();

        // 1. Buscar Cliente
        btnBuscar.addEventListener('click', async () => {
            const codigo = document.getElementById('idClienteInput').value.trim();
            if (!codigo) return window.showToast("Digite o código", 'error');

            window.setLoading('btnBuscarCliente', true, "Buscando...");
            const { data } = await supabaseClient.from('clientes').select('*').eq('codigo_cliente', codigo).single();
            window.setLoading('btnBuscarCliente', false, "Acessar");

            if (!data) return window.showToast("Cliente não encontrado", 'error');

            clienteAtual = data;
            
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step1').style.display = 'none';
            
            document.getElementById('step2').classList.remove('hidden'); 
            document.getElementById('step2').classList.add('active');
            document.getElementById('step2').style.display = 'block';

            document.getElementById('infoCliente').innerHTML = `
                <div style="text-align:center;">
                    <strong>${data.nome_crianca}</strong><br>
                    <small>Resp: ${data.nome_responsavel}</small>
                </div>`;

            // Fidelidade
            const cortes = data.saldo_fidelidade || 0;
            const cortesNoCiclo = cortes % 11;
            const areaFid = document.getElementById('fidelidadeArea');
            if (areaFid) {
                areaFid.style.display = 'block';
                areaFid.classList.remove('hidden');
                if (cortesNoCiclo === 10) {
                    clienteAtual.isGratisAgora = true;
                    areaFid.innerHTML = '🎁 <b>PARABÉNS!</b> Este corte será GRÁTIS!';
                } else {
                    clienteAtual.isGratisAgora = false;
                    areaFid.innerHTML = `Fidelidade: ${cortesNoCiclo}/10 cortes.`;
                }
            }
        });

        // 2. Carregar Horários
        const dataInput = document.getElementById('dataInput');
        const servicoSelect = document.getElementById('servicoSelect');

        if (dataInput) {
            dataInput.min = new Date().toISOString().split('T')[0];
            
            const carregarHorarios = async () => {
                const dataStr = dataInput.value;
                const servico = servicoSelect.value;
                if (!dataStr || !servico) return;

                const lista = document.getElementById('listaHorarios');
                lista.innerHTML = '<div class="loading-spinner"></div> Buscando...';
                document.getElementById('infoSelecao').style.display = 'none';

                const duracao = parseInt(servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-tempo'));
                
                // Validação de Data/Hora
                const agora = new Date();
                const dataHojeStr = agora.toLocaleDateString('pt-BR').split('/').reverse().join('-'); 
                const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
                const isHoje = (dataStr === dataHojeStr);
                const partesData = dataStr.split('-'); 
                const diaSemanaNum = new Date(partesData[0], partesData[1]-1, partesData[2]).getDay();
                const diasMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
                const diaTexto = diasMap[diaSemanaNum];

                // Profissionais
                const { data: todosProfs } = await supabaseClient.from('profissionais').select('*');
                const prosDoDia = todosProfs.filter(p => !p.dias_trabalho || p.dias_trabalho.includes(diaTexto));

                if (prosDoDia.length === 0) {
                    lista.innerHTML = `<div style="padding:15px">Sem atendimento na ${diaTexto}.</div>`;
                    return;
                }

                // Ocupados
                const { data: ocupados } = await supabaseClient
                    .from('agendamentos')
                    .select('horario_inicio, horario_fim, profissional_nome')
                    .eq('data_agendada', dataStr)
                    .neq('status', 'Cancelado');

                let menorInicio = 24 * 60;
                let maiorFim = 0;
                prosDoDia.forEach(p => {
                    const [hI, mI] = p.horario_inicio.split(':').map(Number);
                    const [hF, mF] = p.horario_fim.split(':').map(Number);
                    const minI = hI*60+mI;
                    const minF = hF*60+mF;
                    if(minI < menorInicio) menorInicio = minI;
                    if(minF > maiorFim) maiorFim = minF;
                });

                lista.innerHTML = "";
                let mapSlots = {};
                let temHorario = false;

                for (let m = menorInicio; m <= maiorFim - duracao; m += 30) {
                    if (isHoje && m < (minutosAgora + 30)) continue;

                    const hAtual = Math.floor(m / 60);
                    const mAtual = m % 60;
                    const horarioFormatado = `${hAtual.toString().padStart(2,'0')}:${mAtual.toString().padStart(2,'0')}`;
                    const inicioSlot = m;
                    const fimSlot = m + duracao;
                    const livres = [];

                    prosDoDia.forEach(p => {
                        const [phI, pmI] = p.horario_inicio.split(':').map(Number);
                        const [phF, pmF] = p.horario_fim.split(':').map(Number);
                        const pIni = phI*60 + pmI;
                        const pFim = phF*60 + pmF;

                        if (pIni <= inicioSlot && pFim >= fimSlot) {
                            const colide = ocupados.some(ag => {
                                if (ag.profissional_nome !== p.nome) return false;
                                const [ahI, amI] = ag.horario_inicio.split(':').map(Number);
                                const [ahF, amF] = ag.horario_fim.split(':').map(Number);
                                const aIni = ahI*60+amI;
                                const aFim = ahF*60+amF;
                                return (aIni < fimSlot && inicioSlot < aFim);
                            });
                            if (!colide) livres.push(p);
                        }
                    });

                    if (livres.length > 0) {
                        // Salva no escopo global para acesso
                        if(!window.disponibilidadePorSlot) window.disponibilidadePorSlot = {};
                        window.disponibilidadePorSlot[horarioFormatado] = livres;
                        
                        const btn = document.createElement('span');
                        btn.className = 'slot-btn';
                        btn.textContent = horarioFormatado;
                        btn.onclick = () => {
                            document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            horarioEscolhido = horarioFormatado;
                            duracaoEscolhida = duracao;
                            
                            if (livres.length === 1) {
                                definirProfissional(livres[0].nome);
                            } else {
                                mostrarModalProfissionais(livres);
                            }
                        };
                        lista.appendChild(btn);
                        temHorario = true;
                    }
                }
                if (!temHorario) lista.innerHTML = '<div style="padding:15px">Dia lotado.</div>';
            };

            dataInput.addEventListener('change', carregarHorarios);
            servicoSelect.addEventListener('change', carregarHorarios);
        }

        function mostrarModalProfissionais(lista) {
            const modal = document.getElementById('modalProfissionais');
            const divLista = document.getElementById('listaProfissionaisModal');
            divLista.innerHTML = "";
            lista.forEach(p => {
                const btn = document.createElement('div');
                btn.className = 'prof-btn';
                btn.style.cssText = "background:#f3f4f6; border:1px solid #ddd; padding:10px; margin-bottom:5px; cursor:pointer; border-radius:5px;";
                btn.innerHTML = `<i class="fa-solid fa-user"></i> ${p.nome}`;
                btn.onclick = () => { 
                    definirProfissional(p.nome); 
                    modal.style.display = 'none'; 
                };
                divLista.appendChild(btn);
            });
            modal.style.display = 'flex';
        }

        function definirProfissional(nome) {
            profissionalEscolhido = nome;
            const info = document.getElementById('infoSelecao');
            if(info) {
                info.style.display = 'block';
                info.classList.remove('hidden');
                info.innerHTML = `Profissional: <strong>${nome}</strong>`;
            }
            document.getElementById('btnConfirmarAgendamento').disabled = false;
        }

        // 3. Confirmar Agendamento
        document.getElementById('btnConfirmarAgendamento').addEventListener('click', async () => {
            if(!clienteAtual || !horarioEscolhido || !profissionalEscolhido) return;
            
            window.setLoading('btnConfirmarAgendamento', true, "Confirmando...");

            const [h, m] = horarioEscolhido.split(':').map(Number);
            const fimMinutos = (h * 60) + m + duracaoEscolhida;
            const hF = Math.floor(fimMinutos / 60).toString().padStart(2, '0');
            const mF = (fimMinutos % 60).toString().padStart(2, '0');
            const horarioFim = `${hF}:${mF}`;

            const valor = parseFloat(servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-valor'));
            const servicoNome = servicoSelect.options[servicoSelect.selectedIndex].text;

            const { error } = await supabaseClient.from('agendamentos').insert([{
                cliente_id: clienteAtual.id,
                servico: servicoNome,
                data_agendada: dataInput.value,
                horario_inicio: horarioEscolhido,
                horario_fim: horarioFim,
                profissional_nome: profissionalEscolhido,
                valor_servico: valor,
                eh_gratis: clienteAtual.isGratisAgora || false,
                status: 'Agendado'
            }]);

            if (error) {
                window.showToast("Erro: " + error.message, 'error');
                window.setLoading('btnConfirmarAgendamento', false);
            } else {
                document.getElementById('step2').classList.remove('active');
                document.getElementById('step2').style.display = 'none';
                document.getElementById('step3').classList.remove('hidden');
                document.getElementById('step3').classList.add('active');
                document.getElementById('step3').style.display = 'block';
                
                const btnZap = document.getElementById('btnZap');
                if(btnZap) {
                    btnZap.onclick = () => {
                        window.enviarComprovanteZap(clienteAtual, dataInput.value, horarioEscolhido, profissionalEscolhido, servicoNome);
                    };
                }
            }
        });
    }

    // --- LÓGICA DE GERENCIAR (gerenciar.html) ---
    const btnBuscaAgend = document.getElementById('btnBuscarAgendamentos');
    if (btnBuscaAgend) {
        btnBuscaAgend.addEventListener('click', async () => {
            const codigo = document.getElementById('idClienteBusca').value.trim();
            const div = document.getElementById('listaResultados');
            window.setLoading('btnBuscarAgendamentos', true, "Buscando...");

            const { data: cliente } = await supabaseClient.from('clientes').select('id').eq('codigo_cliente', codigo).single();
            if(!cliente) {
                window.setLoading('btnBuscarAgendamentos', false, "Buscar");
                window.showToast("Código não encontrado", 'error');
                return;
            }

            const hoje = new Date().toISOString().split('T')[0];
            const { data: agendamentos } = await supabaseClient.from('agendamentos').select('*').eq('cliente_id', cliente.id).gte('data_agendada', hoje).neq('status', 'Cancelado').order('data_agendada', { ascending: true });

            window.setLoading('btnBuscarAgendamentos', false, "Buscar");
            div.innerHTML = "";
            if(!agendamentos || agendamentos.length === 0) { 
                div.innerHTML = "<p style='text-align:center; color:#777;'>Nenhum agendamento futuro.</p>"; 
                return; 
            }

            agendamentos.forEach(ag => {
                const card = document.createElement('div'); card.className = 'card';
                const dataBR = ag.data_agendada.split('-').reverse().join('/');
                card.innerHTML = `
                    <div class="card-header"><i class="fa-regular fa-calendar card-icon"></i> ${dataBR} às ${ag.horario_inicio.slice(0,5)}</div>
                    <div style="font-size:14px; color:#666;">${ag.servico}</div>
                    <button class="btn-cancelar" onclick="window.cancelarPeloCliente('${ag.id}')">Cancelar</button>
                `;
                div.appendChild(card);
            });
        });
    }

}); // FIM DO DOMContentLoaded

// --- FUNÇÕES EXTERNAS ---
window.enviarComprovanteZap = function(cliente, data, hora, prof, servico) {
    const dataBR = data.split('-').reverse().join('/');
    const msg = `Olá! Agendamento Confirmado!\n` +
                `Cliente: *${cliente.nome_crianca}*\n` +
                `Serviço: *${servico}*\n` +
                `Dia: *${dataBR}*\n` +
                `Horário: *${hora}*\n` +
                `Profissional: *${prof}*`;
    window.open(`https://wa.me/554896304505?text=${encodeURIComponent(msg)}`, '_blank');
};

window.cancelarPeloCliente = async function(id) {
    if(!confirm("Tem certeza que deseja cancelar?")) return;
    const { error } = await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    if(error) window.showToast("Erro: " + error.message, 'error');
    else {
        window.showToast("Cancelado!", 'success');
        document.getElementById('btnBuscarAgendamentos').click();
    }
};
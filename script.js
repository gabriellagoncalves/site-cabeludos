// ============================================================
// 1. CONFIGURAÇÃO (SUPABASE)
// ============================================================
// ⚠️ SUBSTITUA PELAS SUAS CHAVES AQUI
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

// Inicializa Supabase com verificação
let supabaseClient;
if (typeof supabase === 'undefined') {
    console.error("Biblioteca Supabase não carregou.");
    alert("Erro crítico: A biblioteca do Supabase não foi carregada. Verifique sua conexão.");
} else {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// --- UTILITÁRIOS ---
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
    
    // Ícone seguro
    const iconHtml = `<i class="fa-solid fa-${icon}"></i>`;
    
    toast.innerHTML = `${iconHtml} <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function setLoading(btnId, isLoading, text = "Aguarde...") {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<div class="loading-spinner"></div> ${text}`;
        btn.disabled = true;
    } else {
        if(btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }
}

// ============================================================
// 2. ADMINISTRAÇÃO (CORRIGIDO PARA EVITAR TELA BRANCA)
// ============================================================
window.logarAdmin = function() {
    const senhaInput = document.getElementById('senhaAdmin');
    if(!senhaInput) return;
    
    const senha = senhaInput.value;
    
    // Senha simples (Pode alterar aqui)
    if (senha === "admin123") {
        const loginArea = document.getElementById('loginArea');
        const painelAdmin = document.getElementById('painelAdmin');

        // CORREÇÃO DA TELA BRANCA: Remove a classe hidden explicitamente
        if(loginArea) {
            loginArea.classList.add('hidden'); 
            loginArea.style.display = 'none'; // Força o display none
        }
        
        if(painelAdmin) {
            painelAdmin.classList.remove('hidden'); 
            painelAdmin.style.display = 'block'; // Força o display block
        }
        
        window.initAdmin();
    } else {
        showToast("Senha incorreta!", 'error');
    }
};

window.initAdmin = function() {
    const hoje = new Date().toISOString().split('T')[0];
    const input = document.getElementById('dataAgendaAdmin');
    if (input) input.value = hoje;
    
    // Carrega todas as seções
    if(typeof window.carregarAgendaAdmin === 'function') window.carregarAgendaAdmin();
    if(typeof window.carregarServicosAdmin === 'function') window.carregarServicosAdmin();
    if(typeof window.carregarProfissionaisAdmin === 'function') window.carregarProfissionaisAdmin();
    if(typeof window.carregarIndicadoresAdmin === 'function') window.carregarIndicadoresAdmin();
    if(typeof window.carregarFiltroProfissionais === 'function') window.carregarFiltroProfissionais();
    if(typeof window.carregarClientesAdmin === 'function') window.carregarClientesAdmin();
};

window.abrirTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    const tab = document.getElementById(tabName);
    if(tab) tab.style.display = 'block';
    
    if (event && event.target) event.target.classList.add('active');
};

// --- SERVIÇOS ---
window.salvarServico = async function() {
    const nome = document.getElementById('nomeServico').value;
    const valor = document.getElementById('valorServico').value;
    const tempo = document.getElementById('tempoServico').value;

    if (!nome || !valor || !tempo) return showToast("Preencha tudo!", 'error');

    setLoading('btnSalvarServico', true); // Adicione id="btnSalvarServico" no botão do HTML se quiser loading
    const { error } = await supabaseClient.from('servicos').insert([{ nome, valor, duracao_minutos: tempo }]);
    // setLoading('btnSalvarServico', false);

    if (error) showToast(error.message, 'error');
    else { 
        showToast("Salvo!", 'success'); 
        window.carregarServicosAdmin(); 
        document.getElementById('nomeServico').value="";
        document.getElementById('valorServico').value="";
    }
};

window.carregarServicosAdmin = async function() {
    const tbody = document.querySelector('#tabelaServicos tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';
    
    const { data, error } = await supabaseClient.from('servicos').select('*');
    if(error) return console.error(error);
    
    tbody.innerHTML = "";
    if (data) data.forEach(s => {
        tbody.innerHTML += `<tr><td>${s.nome}</td><td>R$ ${s.valor}</td><td>${s.duracao_minutos} min</td><td><button class="btn btn-red" style="padding:5px; margin:0;" onclick="deletarItem('servicos', '${s.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
    });
};

// --- PROFISSIONAIS ---
window.salvarProfissional = async function() {
    const nome = document.getElementById('nomeProf').value;
    const inicio = document.getElementById('inicioProf').value;
    const fim = document.getElementById('fimProf').value;
    
    // Captura checkboxes
    const checkboxes = document.querySelectorAll('input[name="diaTrabalho"]:checked');
    const diasString = Array.from(checkboxes).map(cb => cb.value).join(',');

    if (!nome || !inicio || !fim || !diasString) return showToast("Preencha tudo e selecione os dias!", 'error');

    const { error } = await supabaseClient.from('profissionais').insert([{ nome, dias_trabalho: diasString, horario_inicio: inicio, horario_fim: fim }]);
    
    if (error) showToast(error.message, 'error');
    else { 
        showToast("Salvo!", 'success'); 
        window.carregarProfissionaisAdmin(); 
        window.carregarFiltroProfissionais();
        document.getElementById('nomeProf').value="";
    }
};

window.carregarProfissionaisAdmin = async function() {
    const tbody = document.querySelector('#tabelaProfissionais tbody');
    if (!tbody) return;
    
    const { data } = await supabaseClient.from('profissionais').select('*');
    tbody.innerHTML = "";
    if (data) data.forEach(p => {
        const inicio = p.horario_inicio ? p.horario_inicio.slice(0,5) : "--:--";
        const fim = p.horario_fim ? p.horario_fim.slice(0,5) : "--:--";
        tbody.innerHTML += `<tr><td>${p.nome}</td><td>${inicio} - ${fim}</td><td>${p.dias_trabalho}</td><td><button class="btn btn-red" style="padding:5px; margin:0;" onclick="deletarItem('profissionais', '${p.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
    });
};

window.carregarFiltroProfissionais = async function() {
    const select = document.getElementById('filtroProfissionalAgenda');
    if (!select) return;
    const { data } = await supabaseClient.from('profissionais').select('nome');
    select.innerHTML = '<option value="">Todos os Profissionais</option>';
    if (data) data.forEach(p => select.innerHTML += `<option value="${p.nome}">${p.nome}</option>`);
};

// --- CLIENTES ---
window.carregarClientesAdmin = async function() {
    const termoResp = document.getElementById('buscaResponsavel')?.value.toLowerCase() || "";
    const termoCrianca = document.getElementById('buscaCrianca')?.value.toLowerCase() || "";
    const tbody = document.querySelector('#tabelaClientes tbody');
    if (!tbody) return;

    if(!termoResp && !termoCrianca && tbody.innerHTML === "") {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando...</td></tr>';
    }

    let { data: clientes, error } = await supabaseClient.from('clientes').select('*').order('created_at', { ascending: false });
    
    if (error) return showToast("Erro ao carregar: " + error.message, 'error');

    // Atualiza KPIs de Clientes
    if(clientes && !termoResp && !termoCrianca) {
        const elTotal = document.getElementById('kpiTotalClientes');
        if(elTotal) elTotal.innerText = clientes.length;

        const origensCount = {};
        clientes.forEach(c => {
            const o = c.origem || 'Não informado';
            origensCount[o] = (origensCount[o] || 0) + 1;
        });
        
        let htmlOrigens = '<ul class="origin-list">';
        Object.entries(origensCount).sort((a,b)=>b[1]-a[1]).forEach(([nome, qtd]) => {
            const pct = ((qtd/clientes.length)*100).toFixed(0);
            htmlOrigens += `<li class="origin-item"><span>${nome}</span> <span class="origin-percent">${pct}%</span></li>`;
        });
        htmlOrigens += '</ul>';
        const elLista = document.getElementById('kpiOrigemList');
        if(elLista) elLista.innerHTML = htmlOrigens;
    }
    
    if (clientes) {
        const filtrados = clientes.filter(c => (c.nome_responsavel||"").toLowerCase().includes(termoResp) && (c.nome_crianca||"").toLowerCase().includes(termoCrianca));
        tbody.innerHTML = "";
        if (filtrados.length === 0) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum cliente encontrado.</td></tr>';
        
        filtrados.forEach(c => {
            const nasc = c.data_nascimento ? new Date(c.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "-";
            tbody.innerHTML += `<tr><td><strong>${c.codigo_cliente}</strong></td><td>${c.nome_responsavel}</td><td>${c.nome_crianca}</td><td>${nasc}</td><td>${c.telefone}</td><td><button class="btn btn-red" style="padding:5px; margin:0;" onclick="deletarItem('clientes', '${c.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    }
};

// --- AGENDA & INDICADORES ---
window.carregarAgendaAdmin = async function() {
    const data = document.getElementById('dataAgendaAdmin').value;
    const filtro = document.getElementById('filtroProfissionalAgenda')?.value;
    const div = document.getElementById('listaAgendaAdmin');
    div.innerHTML = '<div style="text-align:center; padding:20px"><div class="loading-spinner"></div> Buscando...</div>';

    let query = supabaseClient.from('agendamentos').select(`*, clientes(nome_crianca, nome_responsavel, observacoes, autoriza_foto)`).eq('data_agendada', data).order('horario_inicio');
    if (filtro) query = query.eq('profissional_nome', filtro);

    const { data: agenda } = await query;
    if (!agenda || agenda.length === 0) { div.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Nenhum agendamento para esta data.</div>'; return; }

    let html = `<table><thead><tr><th>Hora</th><th>Cliente</th><th>Serviço</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;
    agenda.forEach(item => {
        let badge = `status-${item.status.split(' ')[0]}`;
        const horaDisplay = `${item.horario_inicio.slice(0,5)} - ${item.horario_fim.slice(0,5)}`;
        
        html += `<tr>
            <td><strong>${horaDisplay}</strong></td>
            <td>
                ${item.clientes?.nome_crianca} <small>(${item.clientes?.nome_responsavel})</small>
                ${item.clientes?.observacoes ? `<br><span class="obs-tag">Obs: ${item.clientes.observacoes}</span>` : ''}
            </td>
            <td>${item.servico}<br><small>${item.profissional_nome || 'Equipe'}</small></td>
            <td><span class="status-badge ${badge}">${item.status}</span></td>
            <td>${item.status === 'Agendado' ? `<button class="btn btn-green" style="padding:5px; width:auto; display:inline;" onclick="marcarStatus('${item.id}', '${item.cliente_id}', 'Compareceu')" title="Confirmar Presença"><i class="fa-solid fa-check"></i></button> <button class="btn btn-red" style="padding:5px; width:auto; display:inline;" onclick="marcarStatus('${item.id}', '${item.cliente_id}', 'Faltou')" title="Marcar Falta"><i class="fa-solid fa-xmark"></i></button>` : '-'}</td>
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
        showToast("Presença confirmada!", 'success');
    } else {
        showToast("Marcado como falta.", 'info');
    }
    window.carregarAgendaAdmin(); 
    window.carregarIndicadoresAdmin();
};

window.deletarItem = async function(tabela, id) {
    if (!confirm("Excluir item permanentemente?")) return;
    const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
    if(error) showToast("Erro: " + error.message, 'error');
    else {
        showToast("Excluído!", 'success');
        if (tabela === 'servicos') window.carregarServicosAdmin();
        if (tabela === 'profissionais') window.carregarProfissionaisAdmin();
        if (tabela === 'clientes') window.carregarClientesAdmin();
    }
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
    if(elFat) elFat.innerText = fat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const elTot = document.getElementById('kpiTotal');
    if(elTot) elTot.innerText = tot;
    
    const elCanc = document.getElementById('kpiCancelados');
    if(elCanc) elCanc.innerText = canc;
    
    const elComp = document.getElementById('kpiComparecimento');
    if(elComp) elComp.innerText = tot > 0 ? ((comp / (tot - canc)) * 100).toFixed(0) + '%' : '0%';
    
    const tbody = document.querySelector('#tabelaTopServicos tbody');
    if(tbody) {
        tbody.innerHTML = "";
        Object.entries(servs).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => { 
            // Estimativa de valor
            // (Nota: Idealmente pegaria o valor do serviço do banco, mas aqui simplificamos para contagem)
            tbody.innerHTML += `<tr><td>${k}</td><td>${v}</td><td>-</td></tr>`; 
        });
    }
};

// ============================================================
// 3. EVENT LISTENER PRINCIPAL (AGENDAR & CADASTRO)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // --- CADASTRO ---
    const formCad = document.getElementById('formCadastro');
    if (formCad) {
        document.getElementById('telefone').addEventListener('input', e => {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });

        formCad.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoading('btnSalvar', true, "Salvando...");
            
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
            setLoading('btnSalvar', false, "Salvar Cadastro");

            if (error) showToast("Erro: " + error.message, 'error');
            else {
                document.getElementById('formBox').classList.add('hidden'); // CSS class
                if(document.getElementById('formBox')) document.getElementById('formBox').style.display = 'none';
                
                document.getElementById('sucessoBox').classList.remove('hidden');
                if(document.getElementById('sucessoBox')) document.getElementById('sucessoBox').style.display = 'block';
                
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
        let disponibilidadePorSlot = {};

        // Carregar Serviços
        (async () => {
            const select = document.getElementById('servicoSelect');
            const { data } = await supabaseClient.from('servicos').select('*');
            if (data && select) {
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
        })();

        // Buscar Cliente
        btnBuscar.addEventListener('click', async () => {
            const codigo = document.getElementById('idClienteInput').value.trim();
            if (!codigo) return showToast("Digite o código", 'error');
            
            setLoading('btnBuscarCliente', true);
            const { data, error } = await supabaseClient.from('clientes').select('*').eq('codigo_cliente', codigo).single();
            setLoading('btnBuscarCliente', false, "Continuar");

            if (!data) return showToast("Cliente não encontrado", 'error');

            clienteAtual = data;
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            
            document.getElementById('infoCliente').innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div><strong>${data.nome_crianca}</strong><br><small>${data.nome_responsavel}</small></div>
                    <div style="text-align:right;">Fidelidade<br><strong>${(data.saldo_fidelidade||0)%11}/10</strong></div>
                </div>`;
                
            if ((data.saldo_fidelidade || 0) % 11 === 10) {
                clienteAtual.isGratisAgora = true;
                const area = document.getElementById('fidelidadeArea');
                area.style.display = 'block';
                area.innerHTML = '🎁 <b>PARABÉNS!</b> Este corte será GRÁTIS!';
            }
        });

        // Eventos Data/Serviço
        const dataInput = document.getElementById('dataInput');
        const servicoSelect = document.getElementById('servicoSelect');
        
        if (dataInput) dataInput.min = new Date().toISOString().split('T')[0];

        const carregarHorarios = async () => {
            const dataStr = dataInput.value;
            const servico = servicoSelect.value;
            if (!dataStr || !servico) return;

            const lista = document.getElementById('listaHorarios');
            lista.innerHTML = '<div class="loading-spinner"></div> Buscando...';
            document.getElementById('infoSelecao').style.display = 'none';

            const duracao = parseInt(servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-tempo'));
            
            // Tratamento Data
            const agora = new Date();
            const dataHojeStr = agora.toLocaleDateString('pt-BR').split('/').reverse().join('-'); 
            const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
            const isHoje = (dataStr === dataHojeStr);

            const partesData = dataStr.split('-'); 
            const diaSemanaNum = new Date(partesData[0], partesData[1]-1, partesData[2]).getDay();
            const diasMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
            const diaTexto = diasMap[diaSemanaNum];

            // Busca Profissionais
            const { data: todosProfissionais } = await supabaseClient.from('profissionais').select('*');
            const profissionaisDoDia = todosProfissionais.filter(p => !p.dias_trabalho || p.dias_trabalho.includes(diaTexto));

            if (profissionaisDoDia.length === 0) {
                lista.innerHTML = "Não temos atendimento neste dia ("+diaTexto+").";
                return;
            }

            // Busca Ocupados
            const { data: agendamentosOcupados } = await supabaseClient
                .from('agendamentos')
                .select('horario_inicio, horario_fim, profissional_nome')
                .eq('data_agendada', dataStr).neq('status', 'Cancelado');

            let menorInicio = 24 * 60, maiorFim = 0;
            profissionaisDoDia.forEach(p => {
                const [hI, mI] = p.horario_inicio.split(':').map(Number);
                const [hF, mF] = p.horario_fim.split(':').map(Number);
                const minIni = hI*60+mI;
                const minFim = hF*60+mF;
                if (minIni < menorInicio) menorInicio = minIni;
                if (minFim > maiorFim) maiorFim = minFim;
            });

            lista.innerHTML = "";
            disponibilidadePorSlot = {};
            let temHorario = false;

            for (let m = menorInicio; m <= maiorFim - duracao; m += 30) {
                if (isHoje && m < (minutosAgora + 30)) continue;

                const hAtual = Math.floor(m / 60);
                const mAtual = m % 60;
                const horarioFormatado = `${hAtual.toString().padStart(2,'0')}:${mAtual.toString().padStart(2,'0')}`;
                
                const inicioSlot = m;
                const fimSlot = m + duracao;
                const livres = [];

                profissionaisDoDia.forEach(p => {
                    const [phI, pmI] = p.horario_inicio.split(':').map(Number);
                    const [phF, pmF] = p.horario_fim.split(':').map(Number);
                    const pIni = phI*60 + pmI;
                    const pFim = phF*60 + pmF;

                    if (pIni <= inicioSlot && pFim >= fimSlot) {
                        const ocupado = agendamentosOcupados.some(a => {
                            if (a.profissional_nome !== p.nome) return false;
                            const [ahI, amI] = a.horario_inicio.split(':').map(Number);
                            const [ahF, amF] = a.horario_fim.split(':').map(Number);
                            const aIni = ahI*60+amI;
                            const aFim = ahF*60+amF;
                            return (aIni < fimSlot && inicioSlot < aFim);
                        });
                        if (!ocupado) livres.push(p);
                    }
                });

                if (livres.length > 0) {
                    disponibilidadePorSlot[horarioFormatado] = livres;
                    const btn = document.createElement('span');
                    btn.className = 'slot-btn';
                    btn.textContent = horarioFormatado;
                    btn.onclick = () => {
                        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        horarioEscolhido = horarioFormatado;
                        duracaoEscolhida = duracao;
                        
                        if (livres.length === 1) selecionarProfissional(livres[0].nome);
                        else mostrarModalProfissionais(livres);
                    };
                    lista.appendChild(btn);
                    temHorario = true;
                }
            }
            if (!temHorario) lista.innerHTML = "Dia lotado.";
        };

        dataInput.addEventListener('change', carregarHorarios);
        servicoSelect.addEventListener('change', carregarHorarios);
        
        const modal = document.getElementById('modalProfissionais');
        const divLista = document.getElementById('listaProfissionaisModal');
        
        function mostrarModalProfissionais(lista) {
            divLista.innerHTML = "";
            lista.forEach(p => {
                const btn = document.createElement('div');
                btn.className = 'prof-btn';
                btn.innerHTML = `<i class="fa-solid fa-user"></i> ${p.nome}`;
                btn.style.cssText = "background:#f3f4f6; border:1px solid #ddd; padding:10px; margin-bottom:5px; cursor:pointer; border-radius:5px;";
                btn.onclick = () => { selecionarProfissional(p.nome); modal.style.display = 'none'; };
                divLista.appendChild(btn);
            });
            modal.style.display = 'flex';
        }

        function selecionarProfissional(nome) {
            profissionalEscolhido = nome;
            const info = document.getElementById('infoSelecao');
            info.style.display = 'block';
            info.innerHTML = `Profissional: <strong>${nome}</strong>`;
            document.getElementById('btnConfirmarAgendamento').disabled = false;
        }

        document.getElementById('btnConfirmarAgendamento').addEventListener('click', async () => {
            setLoading('btnConfirmarAgendamento', true, "Confirmando...");
            const [h, m] = horarioEscolhido.split(':').map(Number);
            const fim = (h*60) + m + duracaoEscolhida;
            const hF = Math.floor(fim/60).toString().padStart(2,'0');
            const mF = (fim%60).toString().padStart(2,'0');
            const valor = parseFloat(servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-valor'));

            const { error } = await supabaseClient.from('agendamentos').insert([{
                cliente_id: clienteAtual.id,
                servico: servicoSelect.options[servicoSelect.selectedIndex].text,
                data_agendada: dataInput.value,
                horario_inicio: horarioEscolhido,
                horario_fim: `${hF}:${mF}`,
                profissional_nome: profissionalEscolhido,
                valor_servico: valor,
                eh_gratis: clienteAtual.isGratisAgora || false,
                status: 'Agendado'
            }]);

            if (error) {
                showToast(error.message, 'error');
                setLoading('btnConfirmarAgendamento', false, "Confirmar");
            } else {
                document.getElementById('step2').classList.remove('active');
                document.getElementById('step3').classList.add('active');
            }
        });
    }

    // --- GERENCIAR (FRONTEND) ---
    const btnBuscaAgend = document.getElementById('btnBuscarAgendamentos');
    if (btnBuscaAgend) {
        btnBuscaAgend.addEventListener('click', async () => {
            const codigo = document.getElementById('idClienteBusca').value.trim();
            const div = document.getElementById('listaResultados');
            setLoading('btnBuscarAgendamentos', true, "Buscando...");

            const { data: cliente } = await supabaseClient.from('clientes').select('id').eq('codigo_cliente', codigo).single();
            if(!cliente) {
                setLoading('btnBuscarAgendamentos', false, "Buscar");
                showToast("Código não encontrado", 'error');
                return;
            }

            const hoje = new Date().toISOString().split('T')[0];
            const { data: agendamentos } = await supabaseClient.from('agendamentos').select('*').eq('cliente_id', cliente.id).gte('data_agendada', hoje).neq('status', 'Cancelado').order('data_agendada', { ascending: true });

            setLoading('btnBuscarAgendamentos', false, "Buscar");
            div.innerHTML = "";
            if(!agendamentos || agendamentos.length === 0) { div.innerHTML = "<p>Nenhum agendamento futuro.</p>"; return; }

            agendamentos.forEach(ag => {
                const card = document.createElement('div'); card.className = 'card';
                const dataBR = ag.data_agendada.split('-').reverse().join('/');
                card.innerHTML = `<div class="card-header"><i class="fa-regular fa-calendar card-icon"></i> ${dataBR} às ${ag.horario_inicio.slice(0,5)}</div><div style="font-size:14px; color:#666;">${ag.servico}</div><button class="btn-cancelar" onclick="window.cancelarAgendamento('${ag.id}')">Cancelar</button>`;
                div.appendChild(card);
            });
        });
    }
});

// Cancelar Global
window.cancelarAgendamento = async function(id) {
    if(!confirm("Cancelar?")) return;
    const { error } = await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    if(error) showToast(error.message, 'error');
    else { showToast("Cancelado!", 'success'); document.getElementById('btnBuscarAgendamentos').click(); }
};
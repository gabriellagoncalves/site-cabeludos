// ============================================================
// 1. CONFIGURAÇÃO E CONEXÃO COM O SUPABASE
// ============================================================

// ⚠️ SUBSTITUA PELAS SUAS CHAVES AQUI
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// 2. LÓGICA DO ADMIN (admin.html)
// ============================================================
function logarAdmin() {
    const senha = document.getElementById('senhaAdmin').value;
    if(senha === "admin123") {
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('painelAdmin').style.display = 'block';
        
        const hoje = new Date().toISOString().split('T')[0];
        const inputData = document.getElementById('dataAgendaAdmin');
        if(inputData) {
            inputData.value = hoje;
            carregarAgendaAdmin();
            carregarServicosAdmin();
            carregarProfissionaisAdmin();
            carregarIndicadoresAdmin();
        }
    } else {
        alert("Senha incorreta!");
    }
}

function abrirTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName).style.display = 'block';
    if(event) event.target.classList.add('active');
}

// --- ADMIN: SERVIÇOS ---
async function salvarServico() {
    const nome = document.getElementById('nomeServico').value;
    const valor = document.getElementById('valorServico').value;
    const tempo = document.getElementById('tempoServico').value;

    if(!nome || !valor || !tempo) return alert("Preencha tudo!");

    const { error } = await supabaseClient.from('servicos').insert([{ nome, valor, duracao_minutos: tempo }]);
    if(error) alert("Erro: " + error.message);
    else {
        alert("Serviço Salvo!");
        carregarServicosAdmin();
        document.getElementById('nomeServico').value = "";
        document.getElementById('valorServico').value = "";
        document.getElementById('tempoServico').value = "";
    }
}

async function carregarServicosAdmin() {
    const tbody = document.querySelector('#tabelaServicos tbody');
    if(!tbody) return;
    
    const { data } = await supabaseClient.from('servicos').select('*');
    tbody.innerHTML = "";
    
    if(data) {
        data.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.nome}</td>
                <td>R$ ${s.valor}</td>
                <td>${s.duracao_minutos} min</td>
                <td><button class="btn btn-red" onclick="deletarItem('servicos', '${s.id}')">🗑️</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// --- ADMIN: PROFISSIONAIS ---
async function salvarProfissional() {
    const nome = document.getElementById('nomeProf').value;
    const dias = document.getElementById('diasProf').value; 
    const inicio = document.getElementById('inicioProf').value;
    const fim = document.getElementById('fimProf').value;

    if(!nome || !inicio || !fim) return alert("Preencha tudo!");

    const { error } = await supabaseClient.from('profissionais').insert([{ 
        nome, dias_trabalho: dias, horario_inicio: inicio, horario_fim: fim 
    }]);
    
    if(error) alert("Erro: " + error.message);
    else {
        alert("Profissional Salvo!");
        carregarProfissionaisAdmin();
        document.getElementById('nomeProf').value = "";
    }
}

async function carregarProfissionaisAdmin() {
    const tbody = document.querySelector('#tabelaProfissionais tbody');
    if(!tbody) return;

    const { data } = await supabaseClient.from('profissionais').select('*');
    tbody.innerHTML = "";
    
    if(data) {
        data.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.nome}</td>
                <td>${p.horario_inicio.slice(0,5)} - ${p.horario_fim.slice(0,5)}</td>
                <td>${p.dias_trabalho || 'Todos'}</td>
                <td><button class="btn btn-red" onclick="deletarItem('profissionais', '${p.id}')">🗑️</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// --- ADMIN: INDICADORES ---
async function carregarIndicadoresAdmin() {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

    const { data: agendamentos } = await supabaseClient
        .from('agendamentos')
        .select('status, servico, eh_gratis, valor_servico') // Agora pegamos o valor salvo
        .gte('data_agendada', firstDay)
        .lte('data_agendada', lastDay);

    if(!agendamentos) return;

    let totalAgendamentos = agendamentos.length;
    let totalCancelados = 0;
    let totalCompareceram = 0;
    let faturamento = 0;
    const servicosCount = {};

    agendamentos.forEach(ag => {
        if(ag.status === 'Cancelado') {
            totalCancelados++;
        } else {
            if(ag.status === 'Compareceu') totalCompareceram++;
            
            // Faturamento: Usa o valor salvo no agendamento ou 0 se for grátis
            if(!ag.eh_gratis && ag.status === 'Compareceu') {
                faturamento += parseFloat(ag.valor_servico || 0);
            }

            servicosCount[ag.servico] = (servicosCount[ag.servico] || 0) + 1;
        }
    });

    document.getElementById('kpiFaturamento').textContent = faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('kpiTotal').textContent = totalAgendamentos;
    document.getElementById('kpiCancelados').textContent = totalCancelados;
    document.getElementById('kpiComparecimento').textContent = totalAgendamentos > 0 ? ((totalCompareceram / (totalAgendamentos - totalCancelados)) * 100).toFixed(0) + "%" : "0%";
    
    const tbody = document.querySelector('#tabelaTopServicos tbody');
    tbody.innerHTML = "";
    
    const sortedServicos = Object.entries(servicosCount).sort((a,b) => b[1] - a[1]);
    
    sortedServicos.forEach(([nome, qtd]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${nome}</td><td>${qtd}</td><td>-</td>`;
        tbody.appendChild(tr);
    });
}

// --- ADMIN: AGENDA ---
async function carregarAgendaAdmin() {
    const data = document.getElementById('dataAgendaAdmin').value;
    const div = document.getElementById('listaAgendaAdmin');
    div.innerHTML = "Carregando...";

    const { data: agenda } = await supabaseClient
        .from('agendamentos')
        .select(`*, clientes (nome_crianca, nome_responsavel)`)
        .eq('data_agendada', data)
        .order('horario_inicio');

    if(!agenda || agenda.length === 0) {
        div.innerHTML = "<p>Sem agendamentos para hoje.</p>";
        return;
    }

    let html = `<table><thead><tr><th>Hora</th><th>Cliente</th><th>Serviço/Prof.</th><th>Status</th><th>Ação</th></tr></thead><tbody>`;
    
    agenda.forEach(item => {
        let corStatus = "#000";
        if(item.status === 'Agendado') corStatus = "#d69e2e";
        if(item.status === 'Compareceu') corStatus = "green";
        if(item.status === 'Faltou') corStatus = "red";

        // Exibe o profissional responsável
        const profInfo = item.profissional_nome ? `<br><small>Prof: ${item.profissional_nome}</small>` : '';

        html += `
            <tr>
                <td>${item.horario_inicio.slice(0,5)}</td>
                <td>${item.clientes?.nome_crianca} <small>(${item.clientes?.nome_responsavel})</small></td>
                <td>${item.servico} ${profInfo}</td>
                <td style="color:${corStatus}; font-weight:bold;">${item.status}</td>
                <td>
                    ${item.status === 'Agendado' ? `
                    <button class="btn btn-green" onclick="marcarComparecimento('${item.id}', '${item.cliente_id}')">✅</button>
                    <button class="btn btn-red" onclick="marcarFalta('${item.id}')">❌</button>
                    ` : '-'}
                </td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    div.innerHTML = html;
}

// Funções Globais Admin
window.marcarComparecimento = async function(idAgendamento, idCliente) {
    if(!confirm("Confirmar presença? (Adiciona ponto de fidelidade)")) return;

    const { error: err1 } = await supabaseClient.from('agendamentos').update({ status: 'Compareceu' }).eq('id', idAgendamento);
    if(err1) return alert("Erro: " + err1.message);

    const { data: cliente } = await supabaseClient.from('clientes').select('saldo_fidelidade').eq('id', idCliente).single();
    const novoSaldo = (cliente.saldo_fidelidade || 0) + 1;
    await supabaseClient.from('clientes').update({ saldo_fidelidade: novoSaldo }).eq('id', idCliente);

    alert("Confirmado!");
    carregarAgendaAdmin();
    carregarIndicadoresAdmin();
};

window.marcarFalta = async function(idAgendamento) {
    if(!confirm("Marcar falta?")) return;
    await supabaseClient.from('agendamentos').update({ status: 'Faltou' }).eq('id', idAgendamento);
    carregarAgendaAdmin();
    carregarIndicadoresAdmin();
};

window.deletarItem = async function(tabela, id) {
    if(!confirm("Excluir?")) return;
    await supabaseClient.from(tabela).delete().eq('id', id);
    if(tabela === 'servicos') carregarServicosAdmin();
    if(tabela === 'profissionais') carregarProfissionaisAdmin();
};


// ============================================================
// 3. LÓGICA DE CADASTRO
// ============================================================
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    const telInput = document.getElementById('telefone');
    if(telInput) {
        telInput.addEventListener('input', (e) => {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    }

    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSalvar');
        btn.textContent = "Salvando...";
        btn.disabled = true;

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

        if (error) {
            alert('Erro ao salvar: ' + error.message);
            btn.textContent = "Salvar Cadastro";
            btn.disabled = false;
        } else {
            document.getElementById('formBox').style.display = 'none';
            document.getElementById('sucessoBox').style.display = 'block';
            document.getElementById('codigoGerado').textContent = codigo;
        }
    });
}

// ============================================================
// 4. LÓGICA DE AGENDAMENTO
// ============================================================
const btnBuscarCliente = document.getElementById('btnBuscarCliente');
let clienteAtual = null;

if (btnBuscarCliente) {
    
    // --- Carregar Serviços com Preço ---
    window.addEventListener('load', async () => {
        const select = document.getElementById('servicoSelect');
        if(!select) return;

        const { data: servicos } = await supabaseClient.from('servicos').select('*');
        if(servicos && servicos.length > 0) {
            select.innerHTML = '<option value="">Selecione...</option>';
            servicos.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.nome; 
                opt.textContent = `${s.nome} - R$ ${s.valor} (${s.duracao_minutos} min)`;
                opt.setAttribute('data-tempo', s.duracao_minutos);
                opt.setAttribute('data-valor', s.valor); // Guardamos o valor aqui
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="">Nenhum serviço disponível.</option>';
        }
    });

    btnBuscarCliente.addEventListener('click', async () => {
        const codigo = document.getElementById('idClienteInput').value.trim();
        if(!codigo) return alert("Digite o código.");
        
        const btn = btnBuscarCliente;
        btn.textContent = "Buscando...";
        btn.disabled = true;

        const { data, error } = await supabaseClient.from('clientes').select('*').eq('codigo_cliente', codigo).single();

        if (error || !data) {
            alert("Cliente não encontrado!");
            btn.textContent = "Buscar Cadastro";
            btn.disabled = false;
        } else {
            clienteAtual = data;
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            
            document.getElementById('infoCliente').innerHTML = `
                <strong>Responsável:</strong> ${data.nome_responsavel}<br>
                <strong>Criança:</strong> ${data.nome_crianca}
            `;
            
            const cortes = data.saldo_fidelidade || 0;
            const cortesNoCiclo = cortes % 11;
            const isGratis = (cortesNoCiclo === 10);
            
            const areaFid = document.getElementById('fidelidadeArea');
            if(areaFid) {
                areaFid.style.display = 'block';
                if(isGratis) {
                    areaFid.innerHTML = "🎉 SEU PRÓXIMO CORTE É GRÁTIS! 🎉";
                    clienteAtual.isGratisAgora = true;
                } else {
                    areaFid.innerHTML = `Fidelidade: ${cortesNoCiclo}/10 cortes.`;
                    clienteAtual.isGratisAgora = false;
                }
            }
        }
    });

    // --- Carregar Horários com Validação de Passado ---
    const dataInput = document.getElementById('dataInput');
    const servicoSelect = document.getElementById('servicoSelect');
    if(dataInput) dataInput.min = new Date().toISOString().split('T')[0];

    async function carregarHorarios() {
        const dataStr = dataInput.value;
        const servico = servicoSelect.value;
        if(!dataStr || !servico) return;

        const lista = document.getElementById('listaHorarios');
        lista.innerHTML = "Verificando agenda da equipe...";

        const duracao = parseInt(servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-tempo'));

        // Validação de Data Passada (Hora)
        // Pega a data atual do navegador
        const agora = new Date();
        const dataHojeStr = agora.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD local
        const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
        const isHoje = (dataStr === dataHojeStr);

        // Descobre dia da semana
        const partesData = dataStr.split('-'); 
        const diaSemanaNum = new Date(partesData[0], partesData[1]-1, partesData[2]).getDay();
        const diasSemanaMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
        const diaSemanaTexto = diasSemanaMap[diaSemanaNum];

        // Busca Profissionais do dia
        const { data: todosProfissionais } = await supabaseClient.from('profissionais').select('*');
        const profissionaisDoDia = todosProfissionais.filter(p => {
            if(!p.dias_trabalho) return true; 
            return p.dias_trabalho.includes(diaSemanaTexto);
        });

        if(profissionaisDoDia.length === 0) {
            lista.innerHTML = "Não temos atendimento neste dia da semana ("+diaSemanaTexto+").";
            return;
        }

        // Busca ocupados
        const { data: agendamentosOcupados } = await supabaseClient
            .from('agendamentos')
            .select('horario_inicio, horario_fim')
            .eq('data_agendada', dataStr)
            .neq('status', 'Cancelado');

        let menorInicio = 24 * 60;
        let maiorFim = 0;

        profissionaisDoDia.forEach(p => {
            const [hI, mI] = p.horario_inicio.split(':').map(Number);
            const minInicio = hI * 60 + mI;
            if(minInicio < menorInicio) menorInicio = minInicio;

            const [hF, mF] = p.horario_fim.split(':').map(Number);
            const minFim = hF * 60 + mF;
            if(minFim > maiorFim) maiorFim = minFim;
        });

        lista.innerHTML = "";
        let temHorario = false;

        for (let m = menorInicio; m <= maiorFim - duracao; m += 30) {
            
            // BLOQUEIO DE HORÁRIO PASSADO
            // Se for hoje e o horário do slot for menor que agora + 30min de margem
            if (isHoje && m < (minutosAgora + 30)) {
                continue; 
            }

            const hAtual = Math.floor(m / 60);
            const mAtual = m % 60;
            const inicioSlotMinutos = m;
            const fimSlotMinutos = m + duracao;
            
            // Capacidade do Slot
            let capacidadeTotalSlot = 0;
            profissionaisDoDia.forEach(p => {
                const [phI, pmI] = p.horario_inicio.split(':').map(Number);
                const [phF, pmF] = p.horario_fim.split(':').map(Number);
                const pInicio = phI * 60 + pmI;
                const pFim = phF * 60 + pmF;

                if (pInicio <= inicioSlotMinutos && pFim >= fimSlotMinutos) {
                    capacidadeTotalSlot++;
                }
            });

            // Ocupação do Slot
            let agendamentosColidindo = 0;
            agendamentosOcupados.forEach(a => {
                const [ahI, amI] = a.horario_inicio.split(':').map(Number);
                const [ahF, amF] = a.horario_fim.split(':').map(Number);
                const aInicio = ahI * 60 + amI;
                const aFim = ahF * 60 + amF;

                if (aInicio < fimSlotMinutos && inicioSlotMinutos < aFim) {
                    agendamentosColidindo++;
                }
            });

            if (capacidadeTotalSlot > agendamentosColidindo) {
                const hFormatado = hAtual.toString().padStart(2, '0');
                const mFormatado = mAtual.toString().padStart(2, '0');
                const textoHorario = `${hFormatado}:${mFormatado}`;

                const btn = document.createElement('span');
                btn.className = 'slot-btn';
                btn.textContent = textoHorario;
                btn.onclick = () => selecionarHorario(btn, textoHorario, duracao);
                lista.appendChild(btn);
                temHorario = true;
            }
        }

        if(!temHorario) lista.innerHTML = "Sem horários disponíveis.";
    }

    if(dataInput && servicoSelect) {
        dataInput.addEventListener('change', carregarHorarios);
        servicoSelect.addEventListener('change', carregarHorarios);
    }
    
    let horarioEscolhido = null;
    let duracaoEscolhida = 0;

    function selecionarHorario(elemento, horario, duracao) {
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        elemento.classList.add('selected');
        horarioEscolhido = horario;
        duracaoEscolhida = duracao;
        document.getElementById('btnConfirmarAgendamento').disabled = false;
    }

    // --- Confirmar Agendamento e Salvar Profissional ---
    const btnConfirma = document.getElementById('btnConfirmarAgendamento');
    if(btnConfirma) {
        btnConfirma.addEventListener('click', async () => {
            if(!clienteAtual || !horarioEscolhido) return;
            
            btnConfirma.textContent = "Confirmando...";
            btnConfirma.disabled = true;

            const [h, m] = horarioEscolhido.split(':').map(Number);
            const fimMinutos = (h * 60) + m + duracaoEscolhida;
            const hFim = Math.floor(fimMinutos / 60).toString().padStart(2, '0');
            const mFim = (fimMinutos % 60).toString().padStart(2, '0');
            const horarioFim = `${hFim}:${mFim}`;

            // Pega o valor do serviço selecionado
            const valorServico = parseFloat(servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-valor'));

            // Lógica para encontrar QUAL profissional pegar
            // (Reexecuta a lógica simplificada para pegar o primeiro livre)
            const dataStr = dataInput.value;
            const partesData = dataStr.split('-'); 
            const diaSemanaNum = new Date(partesData[0], partesData[1]-1, partesData[2]).getDay();
            const diasSemanaMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
            const diaTexto = diasSemanaMap[diaSemanaNum];

            // Busca profissionais
            const { data: pros } = await supabaseClient.from('profissionais').select('*');
            const prosDoDia = pros.filter(p => !p.dias_trabalho || p.dias_trabalho.includes(diaTexto));

            // Busca ocupados naquele horário exato
            const { data: ocupados } = await supabaseClient
                .from('agendamentos')
                .select('profissional_nome') // Assumindo que salvaremos o nome
                .eq('data_agendada', dataStr)
                .eq('horario_inicio', horarioEscolhido)
                .neq('status', 'Cancelado');
            
            const nomesOcupados = ocupados.map(o => o.profissional_nome);

            // Encontra o primeiro profissional que não está na lista de ocupados
            let profissionalEscolhido = "Equipe";
            for (let p of prosDoDia) {
                // Verifica se o horário do profissional comporta o agendamento
                const [phI, pmI] = p.horario_inicio.split(':').map(Number);
                const [phF, pmF] = p.horario_fim.split(':').map(Number);
                const pInicio = phI * 60 + pmI;
                const pFim = phF * 60 + pmF;
                
                const slotInicio = h * 60 + m;
                const slotFim = fimMinutos;

                if (pInicio <= slotInicio && pFim >= slotFim) {
                    // Verifica se ele já está ocupado
                    if (!nomesOcupados.includes(p.nome)) {
                        profissionalEscolhido = p.nome;
                        break;
                    }
                }
            }

            const { error } = await supabaseClient.from('agendamentos').insert([{
                cliente_id: clienteAtual.id,
                servico: servicoSelect.options[servicoSelect.selectedIndex].text,
                data_agendada: dataInput.value,
                horario_inicio: horarioEscolhido,
                horario_fim: horarioFim,
                eh_gratis: clienteAtual.isGratisAgora,
                status: 'Agendado',
                valor_servico: valorServico,       // Salva Valor
                profissional_nome: profissionalEscolhido // Salva Profissional
            }]);

            if(error) {
                alert("Erro: " + error.message);
                btnConfirma.disabled = false;
            } else {
                document.getElementById('step2').classList.remove('active');
                document.getElementById('step3').classList.add('active');
                
                const btnZap = document.getElementById('btnZap');
                if(btnZap) {
                    btnZap.onclick = () => {
                        const msg = `Agendado! ${clienteAtual.nome_crianca} - Dia ${dataInput.value} às ${horarioEscolhido} com ${profissionalEscolhido}`;
                        window.open(`https://wa.me/554896304505?text=${encodeURIComponent(msg)}`, '_blank');
                    };
                }
            }
        });
    }
}

// ============================================================
// 5. LÓGICA DE GERENCIAR
// ============================================================
const btnBuscarAgendamentos = document.getElementById('btnBuscarAgendamentos');
if (btnBuscarAgendamentos) {
    btnBuscarAgendamentos.addEventListener('click', async () => {
        const codigo = document.getElementById('idClienteBusca').value.trim();
        const div = document.getElementById('listaResultados');
        div.innerHTML = "Buscando...";

        const { data: cliente } = await supabaseClient.from('clientes').select('id').eq('codigo_cliente', codigo).single();
        
        if(!cliente) {
            div.innerHTML = "<p>Código não encontrado.</p>";
            return;
        }

        const hoje = new Date().toISOString().split('T')[0];
        const { data: agendamentos } = await supabaseClient
            .from('agendamentos')
            .select('*')
            .eq('cliente_id', cliente.id)
            .gte('data_agendada', hoje)
            .neq('status', 'Cancelado')
            .order('data_agendada', { ascending: true });

        div.innerHTML = "";
        if(!agendamentos || agendamentos.length === 0) {
            div.innerHTML = "<p>Nenhum agendamento futuro.</p>";
            return;
        }

        agendamentos.forEach(ag => {
            const card = document.createElement('div');
            card.className = 'card';
            const horaSimples = ag.horario_inicio.slice(0,5);
            const partesData = ag.data_agendada.split('-');
            const dataBR = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

            card.innerHTML = `
                <strong>${dataBR} às ${horaSimples}</strong><br>
                ${ag.servico}<br>
                <button class="btn-cancelar" onclick="cancelarAgendamento('${ag.id}')">Cancelar Agendamento</button>
            `;
            div.appendChild(card);
        });
    });
}

window.cancelarAgendamento = async function(id) {
    if(!confirm("Cancelar?")) return;
    const { error } = await supabaseClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
    if(error) alert("Erro: " + error.message);
    else {
        alert("Cancelado!");
        if(document.getElementById('btnBuscarAgendamentos')) {
            document.getElementById('btnBuscarAgendamentos').click();
        } else {
            location.reload();
        }
    }
};
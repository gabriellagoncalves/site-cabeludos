// ============================================================
// 1. CONFIGURAÇÃO E CONEXÃO COM O SUPABASE
// ============================================================

// ⚠️ SUBSTITUA PELAS SUAS CHAVES AQUI
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

// Verifica se o Supabase foi carregado corretamente
if (typeof supabase === 'undefined') {
    console.error('A biblioteca do Supabase não foi carregada. Verifique o HTML.');
} else {
    const { createClient } = supabase;
    var supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ============================================================
// 2. LÓGICA DO ADMIN (admin.html)
// ============================================================
function logarAdmin() {
    const senha = document.getElementById('senhaAdmin').value;
    // Senha simples fixa (você pode alterar "admin123" para o que quiser)
    if(senha === "admin123") {
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('painelAdmin').style.display = 'block';
        
        // Carrega dados iniciais se estivermos na página de admin
        const hoje = new Date().toISOString().split('T')[0];
        const inputData = document.getElementById('dataAgendaAdmin');
        if(inputData) {
            inputData.value = hoje;
            carregarAgendaAdmin();
            carregarServicosAdmin();
            carregarProfissionaisAdmin();
        }
    } else {
        alert("Senha incorreta!");
    }
}

function abrirTab(tabName) {
    // Esconde todas as abas
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Mostra a aba clicada
    document.getElementById(tabName).style.display = 'block';
    
    // Adiciona classe active na aba clicada
    if(event) event.target.classList.add('active');
}

// --- ADMIN: SERVIÇOS ---
async function salvarServico() {
    const nome = document.getElementById('nomeServico').value;
    const valor = document.getElementById('valorServico').value;
    const tempo = document.getElementById('tempoServico').value;

    if(!nome || !valor || !tempo) return alert("Preencha todos os campos!");

    const { error } = await supabaseClient.from('servicos').insert([{ nome, valor, duracao_minutos: tempo }]);
    if(error) {
        alert("Erro ao salvar serviço: " + error.message);
    } else {
        alert("Serviço Salvo com Sucesso!");
        carregarServicosAdmin();
        // Limpar campos
        document.getElementById('nomeServico').value = "";
        document.getElementById('valorServico').value = "";
        document.getElementById('tempoServico').value = "";
    }
}

async function carregarServicosAdmin() {
    const tbody = document.querySelector('#tabelaServicos tbody');
    if(!tbody) return;
    
    const { data, error } = await supabaseClient.from('servicos').select('*');
    if(error) return console.error(error);

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

    if(!nome || !inicio || !fim) return alert("Preencha todos os campos!");

    const { error } = await supabaseClient.from('profissionais').insert([{ 
        nome, dias_trabalho: dias, horario_inicio: inicio, horario_fim: fim 
    }]);
    
    if(error) {
        alert("Erro ao salvar profissional: " + error.message);
    } else {
        alert("Profissional Salvo com Sucesso!");
        carregarProfissionaisAdmin();
        document.getElementById('nomeProf').value = "";
    }
}

async function carregarProfissionaisAdmin() {
    const tbody = document.querySelector('#tabelaProfissionais tbody');
    if(!tbody) return;

    const { data, error } = await supabaseClient.from('profissionais').select('*');
    if(error) return console.error(error);

    tbody.innerHTML = "";
    
    if(data) {
        data.forEach(p => {
            const tr = document.createElement('tr');
            // Formata hora (corta os segundos se vier HH:MM:SS)
            const inicio = p.horario_inicio ? p.horario_inicio.slice(0,5) : "--:--";
            const fim = p.horario_fim ? p.horario_fim.slice(0,5) : "--:--";

            tr.innerHTML = `
                <td>${p.nome}</td>
                <td>${inicio} - ${fim}</td>
                <td>${p.dias_trabalho || 'Todos'}</td>
                <td><button class="btn btn-red" onclick="deletarItem('profissionais', '${p.id}')">🗑️</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// --- ADMIN: AGENDA & FIDELIDADE ---
async function carregarAgendaAdmin() {
    const data = document.getElementById('dataAgendaAdmin').value;
    const div = document.getElementById('listaAgendaAdmin');
    div.innerHTML = "Carregando...";

    // Busca agendamentos e junta com dados do cliente
    const { data: agenda, error } = await supabaseClient
        .from('agendamentos')
        .select(`
            *,
            clientes (nome_crianca, nome_responsavel)
        `)
        .eq('data_agendada', data)
        .order('horario_inicio');

    if(error) {
        div.innerHTML = "<p style='color:red'>Erro ao carregar agenda.</p>";
        return console.error(error);
    }

    if(!agenda || agenda.length === 0) {
        div.innerHTML = "<p>Sem agendamentos para esta data.</p>";
        return;
    }

    let html = `<table><thead><tr><th>Hora</th><th>Cliente</th><th>Serviço</th><th>Status</th><th>Ação</th></tr></thead><tbody>`;
    
    agenda.forEach(item => {
        let corStatus = "#000";
        if(item.status === 'Agendado') corStatus = "#d69e2e"; // Amarelo
        if(item.status === 'Compareceu') corStatus = "green";
        if(item.status === 'Faltou') corStatus = "red";

        // Nome do cliente seguro (caso tenha sido deletado)
        const nomeCrianca = item.clientes ? item.clientes.nome_crianca : "(Cliente removido)";
        const nomeResp = item.clientes ? item.clientes.nome_responsavel : "";

        html += `
            <tr>
                <td>${item.horario_inicio.slice(0,5)}</td>
                <td>${nomeCrianca} <small>(${nomeResp})</small></td>
                <td>${item.servico}</td>
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

// Funções Globais do Admin (disponíveis no window para o onclick funcionar no HTML gerado)
window.marcarComparecimento = async function(idAgendamento, idCliente) {
    if(!confirm("Confirmar que o cliente veio? Isso adicionará 1 ponto de fidelidade.")) return;

    // 1. Atualizar status do agendamento
    const { error: err1 } = await supabaseClient
        .from('agendamentos')
        .update({ status: 'Compareceu' })
        .eq('id', idAgendamento);

    if(err1) return alert("Erro ao atualizar status: " + err1.message);

    // 2. Buscar saldo atual do cliente
    const { data: cliente } = await supabaseClient
        .from('clientes')
        .select('saldo_fidelidade')
        .eq('id', idCliente)
        .single();

    if(cliente) {
        // 3. Somar +1 no saldo
        const novoSaldo = (cliente.saldo_fidelidade || 0) + 1;
        await supabaseClient
            .from('clientes')
            .update({ saldo_fidelidade: novoSaldo })
            .eq('id', idCliente);
        
        alert("Presença confirmada e ponto de fidelidade computado!");
    } else {
        alert("Presença confirmada, mas cliente não encontrado para fidelidade.");
    }

    carregarAgendaAdmin();
};

window.marcarFalta = async function(idAgendamento) {
    if(!confirm("Marcar como falta?")) return;
    await supabaseClient.from('agendamentos').update({ status: 'Faltou' }).eq('id', idAgendamento);
    carregarAgendaAdmin();
};

window.deletarItem = async function(tabela, id) {
    if(!confirm("Tem certeza que deseja excluir este item?")) return;
    const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
    
    if(error) alert("Erro ao excluir: " + error.message);
    else {
        alert("Excluído com sucesso!");
        if(tabela === 'servicos') carregarServicosAdmin();
        if(tabela === 'profissionais') carregarProfissionaisAdmin();
    }
};


// ============================================================
// 3. LÓGICA DE CADASTRO (cadastro.html)
// ============================================================
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    const telInput = document.getElementById('telefone');
    if(telInput) {
        // Máscara simples de telefone
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

        // Gera código: Ano + Número aleatório
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
// 4. LÓGICA DE AGENDAMENTO (agendar.html)
// ============================================================
const btnBuscarCliente = document.getElementById('btnBuscarCliente');
let clienteAtual = null;

if (btnBuscarCliente) {
    
    // --- Carregar Serviços do Banco ao abrir a página ---
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
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="">Nenhum serviço disponível.</option>';
        }
    });

    // --- Buscar Cliente ---
    btnBuscarCliente.addEventListener('click', async () => {
        const codigo = document.getElementById('idClienteInput').value.trim();
        const btn = btnBuscarCliente;
        
        if(!codigo) return alert("Digite o código.");
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
            
            // Fidelidade
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

    // --- Carregar Horários ---
    const dataInput = document.getElementById('dataInput');
    const servicoSelect = document.getElementById('servicoSelect');
    
    // Data mínima hoje
    if(dataInput) dataInput.min = new Date().toISOString().split('T')[0];

    async function carregarHorarios() {
        const data = dataInput.value;
        const servico = servicoSelect.value;
        if(!data || !servico) return;

        const lista = document.getElementById('listaHorarios');
        lista.innerHTML = "Verificando disponibilidade...";

        // Pega a duração do serviço escolhido
        const tempoAttr = servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-tempo');
        const duracao = parseInt(tempoAttr);

        // Busca horários já ocupados
        const { data: agendamentosOcupados } = await supabaseClient
            .from('agendamentos')
            .select('horario_inicio')
            .eq('data_agendada', data)
            .neq('status', 'Cancelado');

        const horariosOcupados = agendamentosOcupados ? agendamentosOcupados.map(a => a.horario_inicio.slice(0,5)) : [];

        // Horário Fixo Loja (Exemplo: 09:30 - 18:30)
        // Isso poderia vir do banco "profissionais" também, mas aqui simplificamos
        const inicioExp = 9 * 60 + 30; // 09:30 em minutos
        const fimExp = 18 * 60 + 30;   // 18:30 em minutos
        
        lista.innerHTML = "";
        let temHorario = false;
        
        // Loop a cada 30 min
        for (let m = inicioExp; m <= fimExp - duracao; m += 30) {
            const h = Math.floor(m / 60).toString().padStart(2, '0');
            const min = (m % 60).toString().padStart(2, '0');
            const horarioFormatado = `${h}:${min}`;
            
            if (!horariosOcupados.includes(horarioFormatado)) {
                const btn = document.createElement('span');
                btn.className = 'slot-btn';
                btn.textContent = horarioFormatado;
                btn.onclick = () => selecionarHorario(btn, horarioFormatado, duracao);
                lista.appendChild(btn);
                temHorario = true;
            }
        }
        
        if(!temHorario) lista.innerHTML = "Dia lotado ou fechado.";
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

    // --- Confirmar Agendamento ---
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

            // Salva agendamento
            const { error } = await supabaseClient.from('agendamentos').insert([{
                cliente_id: clienteAtual.id,
                servico: servicoSelect.options[servicoSelect.selectedIndex].text,
                data_agendada: dataInput.value,
                horario_inicio: horarioEscolhido,
                horario_fim: horarioFim,
                eh_gratis: clienteAtual.isGratisAgora,
                status: 'Agendado'
            }]);

            if(error) {
                alert("Erro ao agendar: " + error.message);
                btnConfirma.textContent = "Confirmar Agendamento";
                btnConfirma.disabled = false;
            } else {
                // Sucesso
                document.getElementById('step2').classList.remove('active');
                document.getElementById('step3').classList.add('active');
                
                const btnZap = document.getElementById('btnZap');
                if(btnZap) {
                    btnZap.onclick = () => {
                        const msg = `Olá! Agendei um horário.\nCliente: ${clienteAtual.nome_crianca}\nDia: ${dataInput.value} às ${horarioEscolhido}`;
                        window.open(`https://wa.me/554896304505?text=${encodeURIComponent(msg)}`, '_blank');
                    };
                }
            }
        });
    }
}

// ============================================================
// 5. LÓGICA DE GERENCIAR (gerenciar.html)
// ============================================================
const btnBuscarAgendamentos = document.getElementById('btnBuscarAgendamentos');
if (btnBuscarAgendamentos) {
    btnBuscarAgendamentos.addEventListener('click', async () => {
        const codigo = document.getElementById('idClienteBusca').value.trim();
        const div = document.getElementById('listaResultados');
        div.innerHTML = "Buscando...";

        // 1. Busca cliente
        const { data: cliente } = await supabaseClient.from('clientes').select('id').eq('codigo_cliente', codigo).single();
        
        if(!cliente) {
            div.innerHTML = "<p>Código não encontrado.</p>";
            return;
        }

        // 2. Busca agendamentos futuros
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
            div.innerHTML = "<p>Nenhum agendamento futuro encontrado.</p>";
            return;
        }

        agendamentos.forEach(ag => {
            const card = document.createElement('div');
            card.className = 'card';
            const horaSimples = ag.horario_inicio.slice(0,5);
            // Formata data BR
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

// Função Global de Cancelar (precisa estar no window)
window.cancelarAgendamento = async function(id) {
    if(!confirm("Tem certeza que deseja cancelar?")) return;
    
    const { error } = await supabaseClient
        .from('agendamentos')
        .update({ status: 'Cancelado' })
        .eq('id', id);

    if(error) alert("Erro: " + error.message);
    else {
        alert("Cancelado com sucesso!");
        // Simula nova busca para atualizar a lista
        if(document.getElementById('btnBuscarAgendamentos')) {
            document.getElementById('btnBuscarAgendamentos').click();
        } else {
            location.reload();
        }
    }
};
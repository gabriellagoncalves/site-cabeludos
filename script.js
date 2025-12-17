// ============================================================
// 1. CONFIGURAÇÃO E CONEXÃO COM O SUPABASE
// ============================================================

// ⚠️ SUBSTITUA PELAS SUAS CHAVES (Veja as instruções abaixo)
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

// Inicializa a conexão
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// 2. LÓGICA DA PÁGINA DE CADASTRO (cadastro.html)
// ============================================================
const formCadastro = document.getElementById('formCadastro');

if (formCadastro) {
    // Máscara de Telefone (Para ficar bonitinho: (XX) XXXXX-XXXX)
    const telInput = document.getElementById('telefone');
    telInput.addEventListener('input', (e) => {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });

    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSalvar');
        const originalText = btn.textContent;
        
        btn.textContent = "Salvando...";
        btn.disabled = true;

        // Gera um código simples: Ano + Número aleatório (Ex: 2025-4821)
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

        // Envia para a tabela 'clientes' no Supabase
        const { data, error } = await supabaseClient
            .from('clientes')
            .insert([dados])
            .select();

        if (error) {
            alert('Erro ao salvar: ' + error.message);
            btn.textContent = originalText;
            btn.disabled = false;
        } else {
            // Sucesso
            document.getElementById('formBox').style.display = 'none';
            document.getElementById('sucessoBox').style.display = 'block';
            document.getElementById('codigoGerado').textContent = codigo;
        }
    });
}

// ============================================================
// 3. LÓGICA DA PÁGINA DE AGENDAMENTO (agendar.html)
// ============================================================
const btnBuscarCliente = document.getElementById('btnBuscarCliente');
let clienteAtual = null; // Guarda os dados do cliente logado

if (btnBuscarCliente) {
    
    // --- Passo 1: Buscar Cliente pelo Código ---
    btnBuscarCliente.addEventListener('click', async () => {
        const codigo = document.getElementById('idClienteInput').value.trim();
        const btn = btnBuscarCliente;
        
        btn.textContent = "Buscando...";
        btn.disabled = true;
        
        // Consulta no Supabase
        const { data, error } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('codigo_cliente', codigo)
            .single(); // Traz apenas 1 resultado

        if (error || !data) {
            alert("Cliente não encontrado! Verifique o código digitado.");
            btn.textContent = "Buscar Cadastro";
            btn.disabled = false;
        } else {
            clienteAtual = data;
            
            // Muda para a tela de agendamento
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            
            // Preenche info do cliente
            document.getElementById('infoCliente').innerHTML = `
                <strong>Responsável:</strong> ${data.nome_responsavel}<br>
                <strong>Criança:</strong> ${data.nome_crianca}
            `;
            
            // Lógica de Fidelidade (10 cortes = 11º grátis)
            const cortes = data.saldo_fidelidade || 0;
            const cortesNoCiclo = cortes % 11;
            const isGratis = (cortesNoCiclo === 10);
            
            const areaFid = document.getElementById('fidelidadeArea');
            areaFid.style.display = 'block';
            
            if(isGratis) {
                areaFid.innerHTML = "🎉 PARABÉNS! ESTE CORTE É GRÁTIS! 🎉";
                clienteAtual.isGratisAgora = true;
            } else {
                areaFid.innerHTML = `Fidelidade: ${cortesNoCiclo}/10 cortes.`;
                clienteAtual.isGratisAgora = false;
            }
        }
    });

    // --- Passo 2: Carregar Horários Livres ---
    const dataInput = document.getElementById('dataInput');
    const servicoSelect = document.getElementById('servicoSelect');
    
    // Impede datas passadas
    dataInput.min = new Date().toISOString().split('T')[0];

    async function carregarHorarios() {
        const data = dataInput.value;
        const servico = servicoSelect.value;
        
        if(!data || !servico) return; // Só carrega se tiver data e serviço

        const lista = document.getElementById('listaHorarios');
        lista.innerHTML = "Verificando disponibilidade...";

        // Pega a duração do serviço selecionado (atributo data-tempo no HTML)
        const duracao = parseInt(servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-tempo'));

        // Busca agendamentos OCUPADOS nessa data no Supabase
        const { data: agendamentosOcupados } = await supabaseClient
            .from('agendamentos')
            .select('horario_inicio')
            .eq('data_agendada', data)
            .neq('status', 'Cancelado'); // Ignora os cancelados

        // Cria uma lista simples dos horários ocupados (Ex: ["14:00", "14:30"])
        const horariosOcupados = agendamentosOcupados ? agendamentosOcupados.map(a => a.horario_inicio.slice(0,5)) : [];

        // Definição do Expediente (em minutos do dia)
        // 09:30 = 570 min | 18:30 = 1110 min
        const inicioExp = 9 * 60 + 30; 
        const fimExp = 18 * 60 + 30;   
        
        lista.innerHTML = "";
        let temHorario = false;
        
        // Gera slots a cada 30 min
        for (let m = inicioExp; m <= fimExp - duracao; m += 30) {
            // Converte minutos para HH:MM
            const h = Math.floor(m / 60).toString().padStart(2, '0');
            const min = (m % 60).toString().padStart(2, '0');
            const horarioFormatado = `${h}:${min}`;
            
            // Se NÃO estiver na lista de ocupados, cria o botão
            if (!horariosOcupados.includes(horarioFormatado)) {
                const btn = document.createElement('span');
                btn.className = 'slot-btn';
                btn.textContent = horarioFormatado;
                
                // Ao clicar no horário
                btn.onclick = () => {
                    // Remove seleção dos outros
                    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    
                    // Salva escolha
                    horarioEscolhido = horarioFormatado;
                    duracaoEscolhida = duracao;
                    
                    document.getElementById('btnConfirmarAgendamento').disabled = false;
                };
                
                lista.appendChild(btn);
                temHorario = true;
            }
        }
        
        if(!temHorario) lista.innerHTML = "Dia lotado ou fechado.";
    }

    // Recarrega horários se mudar data ou serviço
    dataInput.addEventListener('change', carregarHorarios);
    servicoSelect.addEventListener('change', carregarHorarios);
    
    let horarioEscolhido = null;
    let duracaoEscolhida = 0;

    // --- Passo 3: Confirmar e Salvar no Banco ---
    document.getElementById('btnConfirmarAgendamento').addEventListener('click', async () => {
        if(!clienteAtual || !horarioEscolhido) return;
        
        const btn = document.getElementById('btnConfirmarAgendamento');
        btn.textContent = "Confirmando...";
        btn.disabled = true;

        // Calcula Horário de Fim (Inicio + Duração)
        const [h, m] = horarioEscolhido.split(':').map(Number);
        const fimMinutos = (h * 60) + m + duracaoEscolhida;
        const hFim = Math.floor(fimMinutos / 60).toString().padStart(2, '0');
        const mFim = (fimMinutos % 60).toString().padStart(2, '0');
        const horarioFim = `${hFim}:${mFim}`;

        // Insere na tabela 'agendamentos'
        const { error } = await supabaseClient.from('agendamentos').insert([{
            cliente_id: clienteAtual.id,
            servico: servicoSelect.options[servicoSelect.selectedIndex].text,
            data_agendada: dataInput.value,
            horario_inicio: horarioEscolhido,
            horario_fim: horarioFim,
            eh_gratis: clienteAtual.isGratisAgora
        }]);

        if(error) {
            alert("Erro ao agendar: " + error.message);
            btn.textContent = "Confirmar Agendamento";
            btn.disabled = false;
        } else {
            // Incrementa pontos de Fidelidade (+1)
            const novoSaldo = (clienteAtual.saldo_fidelidade || 0) + 1;
            await supabaseClient
                .from('clientes')
                .update({ saldo_fidelidade: novoSaldo })
                .eq('id', clienteAtual.id);

            // Sucesso!
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');
            
            // Configura botão do WhatsApp
            const btnZap = document.getElementById('btnZap');
            btnZap.onclick = () => {
                const msg = `Olá! Agendei um horário.\nCliente: ${clienteAtual.nome_crianca}\nDia: ${dataInput.value} às ${horarioEscolhido}`;
                window.open(`https://wa.me/554896304505?text=${encodeURIComponent(msg)}`, '_blank');
            };
        }
    });
}

// ============================================================
// 4. LÓGICA DA PÁGINA DE GERENCIAR (gerenciar.html)
// ============================================================
const btnBuscarAgendamentos = document.getElementById('btnBuscarAgendamentos');

if (btnBuscarAgendamentos) {
    btnBuscarAgendamentos.addEventListener('click', async () => {
        const codigo = document.getElementById('idClienteBusca').value.trim();
        const div = document.getElementById('listaResultados');
        const btn = btnBuscarAgendamentos;
        
        div.innerHTML = "Buscando...";
        btn.disabled = true;

        // 1. Achar ID do cliente pelo código
        const { data: cliente } = await supabaseClient
            .from('clientes')
            .select('id')
            .eq('codigo_cliente', codigo)
            .single();
        
        if(!cliente) {
            div.innerHTML = "<p style='color:red'>Código não encontrado.</p>";
            btn.disabled = false;
            return;
        }

        // 2. Buscar agendamentos futuros
        const hoje = new Date().toISOString().split('T')[0];
        
        const { data: agendamentos, error } = await supabaseClient
            .from('agendamentos')
            .select('*')
            .eq('cliente_id', cliente.id)
            .gte('data_agendada', hoje) // Data maior ou igual a hoje
            .neq('status', 'Cancelado') // Diferente de Cancelado
            .order('data_agendada', { ascending: true }); // Ordem crescente

        btn.disabled = false;
        div.innerHTML = "";

        if(!agendamentos || agendamentos.length === 0) {
            div.innerHTML = "<p>Nenhum agendamento futuro encontrado.</p>";
            return;
        }

        // 3. Monta a lista visual
        agendamentos.forEach(ag => {
            const card = document.createElement('div');
            card.className = 'card';
            
            // Tira os segundos do horário (14:30:00 -> 14:30)
            const horaSimples = ag.horario_inicio.slice(0,5);
            
            // Formata a data (YYYY-MM-DD -> DD/MM/YYYY)
            const dataParte = ag.data_agendada.split('-');
            const dataBR = `${dataParte[2]}/${dataParte[1]}/${dataParte[0]}`;

            card.innerHTML = `
                <strong>${dataBR} às ${horaSimples}</strong><br>
                ${ag.servico}<br>
                <button class="btn-cancelar" onclick="cancelarAgendamento('${ag.id}')">Cancelar Agendamento</button>
            `;
            div.appendChild(card);
        });
    });
}

// Função Global para Cancelar (precisa estar no window para o onclick funcionar)
window.cancelarAgendamento = async function(idAgendamento) {
    if(!confirm("Tem certeza que deseja cancelar este horário?")) return;
    
    // Atualiza status no banco
    const { error } = await supabaseClient
        .from('agendamentos')
        .update({ status: 'Cancelado' })
        .eq('id', idAgendamento);

    if(error) {
        alert("Erro ao cancelar: " + error.message);
    } else {
        alert("Cancelado com sucesso!");
        // Recarrega a busca para atualizar a lista
        document.getElementById('btnBuscarAgendamentos').click();
    }
};
// ============================================================
// 1. CONFIGURAÇÃO (SUPABASE)
// ============================================================

// ⚠️ ATENÇÃO: COLE SUAS CHAVES DENTRO DAS ASPAS ABAIXO!
// Se deixar como está, o site NÃO VAI FUNCIONAR.
const SUPABASE_URL = 'https://ifmpoykspipfiynhquqj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXBveWtzcGlwZml5bmhxdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzNDAsImV4cCI6MjA4MTU1MDM0MH0.stD6XieSLW2Dvugqe_pG4NuS1fF1DHJRkQUzi7yKYQA';

// Verificação de Segurança (Avisa se esqueceu as chaves)
if (SUPABASE_URL.includes('seu-projeto') || SUPABASE_KEY.includes('sua-chave')) {
    alert("ERRO: Você esqueceu de colocar as chaves do Supabase no arquivo script.js! O site não vai funcionar sem elas.");
}

// Inicializa o Supabase
let supabaseClient;
try {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase conectado.");
} catch (error) {
    console.error("Erro ao iniciar Supabase:", error);
    alert("Erro crítico: Biblioteca do Supabase não carregou. Verifique sua internet.");
}

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
    
    // Fallback simples se o ícone falhar
    toast.innerHTML = `<span>${message}</span>`; 
    // Tenta usar FontAwesome se disponível
    try { toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`; } catch(e){}

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = "Aguarde...";
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalText || "Continuar";
        btn.disabled = false;
    }
}

// ============================================================
// 2. AGENDAMENTO (agendar.html)
// ============================================================
const btnBuscarCliente = document.getElementById('btnBuscarCliente');
let clienteAtual = null;

if (btnBuscarCliente) {
    console.log("Página de Agendamento detectada.");

    // Carregar Serviços
    window.addEventListener('load', async () => {
        const select = document.getElementById('servicoSelect');
        if (!select) return;
        
        const { data, error } = await supabaseClient.from('servicos').select('*');
        if (data && data.length > 0) {
            select.innerHTML = '<option value="">Selecione...</option>';
            data.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.nome; // Usa o nome como valor
                opt.text = `${s.nome} - R$ ${s.valor} (${s.duracao_minutos} min)`;
                opt.setAttribute('data-tempo', s.duracao_minutos);
                opt.setAttribute('data-valor', s.valor);
                select.appendChild(opt);
            });
        } else {
            console.warn("Nenhum serviço encontrado ou erro:", error);
            select.innerHTML = '<option value="">Sem serviços cadastrados</option>';
        }
    });

    // Botão Buscar Cliente
    btnBuscarCliente.addEventListener('click', async () => {
        const codigoInput = document.getElementById('idClienteInput');
        const codigo = codigoInput.value.trim();
        
        if (!codigo) {
            alert("Por favor, digite o código do cliente.");
            return;
        }

        setLoading('btnBuscarCliente', true);

        // Busca no banco
        const { data, error } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('codigo_cliente', codigo)
            .single();

        setLoading('btnBuscarCliente', false);

        if (error || !data) {
            console.error("Erro busca:", error);
            alert("Cliente não encontrado! Verifique se o código está correto.");
        } else {
            // Sucesso!
            clienteAtual = data;
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            
            document.getElementById('infoCliente').innerHTML = `
                <div style="text-align:center;">
                    <strong>Olá, ${data.nome_responsavel}!</strong><br>
                    Atendimento para: <strong>${data.nome_crianca}</strong>
                </div>`;
            
            // Fidelidade
            const cortes = data.saldo_fidelidade || 0;
            const cortesNoCiclo = cortes % 11;
            const areaFid = document.getElementById('fidelidadeArea');
            
            if (areaFid) {
                areaFid.style.display = 'block';
                if (cortesNoCiclo === 10) {
                    areaFid.innerHTML = "🎉 <b>PARABÉNS!</b> Este corte será GRÁTIS!";
                    clienteAtual.isGratisAgora = true;
                } else {
                    areaFid.innerHTML = `Fidelidade: ${cortesNoCiclo}/10 cortes.`;
                    clienteAtual.isGratisAgora = false;
                }
            }
        }
    });

    // Lógica de Horários
    const dataInput = document.getElementById('dataInput');
    const servicoSelect = document.getElementById('servicoSelect');
    
    if(dataInput) dataInput.min = new Date().toISOString().split('T')[0];

    async function carregarHorarios() {
        const dataStr = dataInput.value;
        const servico = servicoSelect.value;
        if (!dataStr || !servico) return;

        const lista = document.getElementById('listaHorarios');
        lista.innerHTML = "Carregando...";
        document.getElementById('infoSelecao').style.display = 'none';

        const tempoAttr = servicoSelect.options[servicoSelect.selectedIndex].getAttribute('data-tempo');
        if(!tempoAttr) return; // Proteção contra seleção inválida
        const duracao = parseInt(tempoAttr);

        // Busca agendamentos do dia
        const { data: ocupados } = await supabaseClient
            .from('agendamentos')
            .select('horario_inicio, profissional_nome')
            .eq('data_agendada', dataStr)
            .neq('status', 'Cancelado');

        // Busca Profissionais
        const { data: profissionais } = await supabaseClient.from('profissionais').select('*');
        
        // Descobre dia da semana
        const partes = dataStr.split('-');
        const diaSemana = new Date(partes[0], partes[1]-1, partes[2]).getDay();
        const diasMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
        const diaTexto = diasMap[diaSemana];

        // Filtra quem trabalha nesse dia
        const prosDoDia = profissionais.filter(p => !p.dias_trabalho || p.dias_trabalho.includes(diaTexto));

        if (prosDoDia.length === 0) {
            lista.innerHTML = `Sem atendimento na ${diaTexto}.`;
            return;
        }

        // Gera Horários (09:30 as 18:30 padrão)
        let inicioExp = 9 * 60 + 30; 
        let fimExp = 18 * 60 + 30;
        
        lista.innerHTML = "";
        let temHorario = false;
        disponibilidadePorSlot = {}; // Reset global

        for (let m = inicioExp; m <= fimExp - duracao; m += 30) {
            const h = Math.floor(m / 60).toString().padStart(2, '0');
            const min = (m % 60).toString().padStart(2, '0');
            const horarioTxt = `${h}:${min}`;
            
            // Verifica quem está livre neste horário
            const livres = [];
            prosDoDia.forEach(p => {
                // Checa se horário do profissional bate
                const [piH, piM] = p.horario_inicio.split(':').map(Number);
                const [pfH, pfM] = p.horario_fim.split(':').map(Number);
                const pIni = piH*60 + piM;
                const pFim = pfH*60 + pfM;
                
                if (m >= pIni && (m + duracao) <= pFim) {
                    // Checa se ele já tem agendamento
                    const conflito = ocupados.some(ag => 
                        ag.profissional_nome === p.nome && 
                        ag.horario_inicio.slice(0,5) === horarioTxt
                    );
                    if (!conflito) livres.push(p);
                }
            });

            if (livres.length > 0) {
                disponibilidadePorSlot[horarioTxt] = livres; // Salva para o clique
                
                const btn = document.createElement('span');
                btn.className = 'slot-btn';
                btn.textContent = horarioTxt;
                btn.onclick = () => selecionarHorario(btn, horarioTxt, duracao);
                lista.appendChild(btn);
                temHorario = true;
            }
        }
        
        if (!temHorario) lista.innerHTML = "Dia lotado.";
    }

    if(dataInput && servicoSelect) {
        dataInput.addEventListener('change', carregarHorarios);
        servicoSelect.addEventListener('change', carregarHorarios);
    }
}

// Variáveis Globais para seleção
let horarioEscolhido = null;
let duracaoEscolhida = 0;
let profissionalEscolhido = null;
let disponibilidadePorSlot = {};

function selecionarHorario(el, horario, duracao) {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    horarioEscolhido = horario;
    duracaoEscolhida = duracao;
    
    // Lógica de Profissional
    const livres = disponibilidadePorSlot[horario];
    if (livres.length === 1) {
        definirProfissional(livres[0].nome);
    } else {
        mostrarModalProfissionais(livres);
    }
}

function mostrarModalProfissionais(lista) {
    const modal = document.getElementById('modalProfissionais');
    const divLista = document.getElementById('listaProfissionaisModal');
    divLista.innerHTML = "";
    
    lista.forEach(p => {
        const btn = document.createElement('div');
        btn.innerHTML = `<b>${p.nome}</b>`;
        btn.style.cssText = "padding:10px; border:1px solid #ddd; border-radius:8px; cursor:pointer; margin-bottom:5px;";
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
    info.style.display = 'block';
    info.innerHTML = `Profissional: <strong>${nome}</strong>`;
    document.getElementById('btnConfirmarAgendamento').disabled = false;
}

// Confirmar Agendamento
const btnConfirma = document.getElementById('btnConfirmarAgendamento');
if(btnConfirma) {
    btnConfirma.addEventListener('click', async () => {
        setLoading('btnConfirmarAgendamento', true);
        
        // Calcula fim
        const [h, m] = horarioEscolhido.split(':').map(Number);
        const fimMin = h*60 + m + duracaoEscolhida;
        const hF = Math.floor(fimMin/60).toString().padStart(2,'0');
        const mF = (fimMin%60).toString().padStart(2,'0');
        
        const valor = parseFloat(document.getElementById('servicoSelect').options[document.getElementById('servicoSelect').selectedIndex].getAttribute('data-valor'));

        const { error } = await supabaseClient.from('agendamentos').insert([{
            cliente_id: clienteAtual.id,
            servico: document.getElementById('servicoSelect').value,
            data_agendada: document.getElementById('dataInput').value,
            horario_inicio: horarioEscolhido,
            horario_fim: `${hF}:${mF}`,
            profissional_nome: profissionalEscolhido,
            valor_servico: valor,
            eh_gratis: clienteAtual.isGratisAgora || false,
            status: 'Agendado'
        }]);

        if (error) {
            alert("Erro ao agendar: " + error.message);
            setLoading('btnConfirmarAgendamento', false);
        } else {
            // Se for gratis, reseta saldo? Ou apenas não cobra? Normalmente fidelidade zera ou desconta.
            // Aqui vamos apenas seguir o fluxo.
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');
        }
    });
}

// ============================================================
// 3. LÓGICA DE CADASTRO
// ============================================================
const formCad = document.getElementById('formCadastro');
if(formCad) {
    // Máscara Telefone
    const tel = document.getElementById('telefone');
    if(tel) {
        tel.addEventListener('input', e => {
            let v = e.target.value.replace(/\D/g,'');
            v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
            v = v.replace(/(\d)(\d{4})$/, '$1-$2');
            e.target.value = v;
        });
    }

    formCad.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading('btnSalvar', true);
        
        const codigo = new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000);
        
        const { error } = await supabaseClient.from('clientes').insert([{
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
        }]);

        setLoading('btnSalvar', false);

        if(error) alert("Erro: " + error.message);
        else {
            document.getElementById('formBox').classList.add('hidden');
            document.getElementById('sucessoBox').classList.remove('hidden');
            document.getElementById('codigoGerado').innerText = codigo;
        }
    });
}

// ============================================================
// 4. ADMIN & GERENCIAR
// ============================================================
// ... (O código de admin é o mesmo que enviei antes, pode manter se já colou, 
// ou copie das respostas anteriores se precisar. Focamos no agendamento aqui)
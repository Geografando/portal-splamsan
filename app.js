const CONFIG = {
  supabaseUrl: "https://imavrrhsnvcjoevbloek.supabase.co",
  publishableKey: "sb_publishable_VxvS6gs7783wsHLcM2bzmQ_d72lSVvW",
  tooljetUrl: "https://app.tooljet.ai/julio-1782328547703/apps/fbba4863-2e87-4fcb-a58a-ff1c4c966014/page-1"
};

const endpoint = (view) => `${CONFIG.supabaseUrl}/rest/v1/${view}?select=*`;
const headers = { apikey: CONFIG.publishableKey };
let municipios = [];
let checkpoints = [];
let mapa = null;
let limitesMapa = null;

const $ = (id) => document.getElementById(id);
const numero = (valor) => Number(valor || 0);
const percentual = (valor, casas = 1) => `${numero(valor).toFixed(casas).replace(".", ",")}%`;
const dataPtBr = (valor) => {
  if (!valor) return "Sem atualização pública";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(valor));
};
const statusAmigavel = (status) => ({
  nao_iniciado: "Não iniciado",
  em_planejamento: "Em planejamento",
  em_execucao: "Em execução",
  parcialmente_cumprido: "Parcialmente cumprido",
  cumprido: "Cumprido",
  cumprido_com_ressalvas: "Cumprido com ressalvas",
  atrasado: "Atrasado",
  sem_evidencia_suficiente: "Sem evidência suficiente",
  cancelado: "Cancelado"
}[status] || status || "Não informado");

async function consultar(view) {
  const response = await fetch(endpoint(view), { headers });
  if (!response.ok) {
    const detalhe = await response.text();
    throw new Error(`Falha ao consultar ${view}. HTTP ${response.status}. ${detalhe}`);
  }
  return response.json();
}

function configurarLinksToolJet() {
  ["link-tooljet-topo", "link-tooljet-hero", "link-tooljet-rodape"].forEach((id) => {
    $(id).href = CONFIG.tooljetUrl;
  });
}

function renderizarIndicadores() {
  const totalMunicipios = municipios.length;
  const totalCheckpoints = municipios.reduce((soma, item) => soma + numero(item.total_checkpoints), 0);
  const totalPublicos = municipios.reduce((soma, item) => soma + numero(item.checkpoints_publicos), 0);
  const pesoTotal = municipios.reduce((soma, item) => soma + numero(item.peso_total_checkpoints), 0);
  const progressoGeral = pesoTotal
    ? municipios.reduce((soma, item) => soma + numero(item.progresso_municipio) * numero(item.peso_total_checkpoints), 0) / pesoTotal
    : 0;

  $("total-municipios").textContent = totalMunicipios;
  $("total-checkpoints").textContent = totalCheckpoints;
  $("total-publicos").textContent = totalPublicos;
  $("progresso-geral").textContent = percentual(progressoGeral);
  $("hero-progresso").textContent = `${totalMunicipios} município(s) com ${percentual(progressoGeral)} de progresso geral`;

  const atualizacoes = municipios.map((m) => m.ultima_atualizacao_publica).filter(Boolean).sort();
  $("hero-atualizacao").textContent = atualizacoes.length
    ? `Última atualização pública: ${dataPtBr(atualizacoes.at(-1))}`
    : "Ainda não há atualização pública registrada";
}

function corProgresso(valor) { const p=numero(valor); if(p<=20)return "#7b8790"; if(p<=40)return "#c75b50"; if(p<=60)return "#d99731"; if(p<=80)return "#2f82ad"; return "#347657"; }
function fecharPopupEAbrirDetalhes(municipioId){if(mapa)mapa.closePopup();abrirDetalhes(municipioId);}
function renderizarMapa(){
  if(typeof L==="undefined") throw new Error("A biblioteca Leaflet não foi carregada.");
  const validos=municipios.filter(m=>Number.isFinite(Number(m.latitude))&&Number.isFinite(Number(m.longitude)));
  if(!validos.length)return;
  mapa=L.map("mapa-municipios",{scrollWheelZoom:false,minZoom:7});
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(mapa);
  const grupo=L.featureGroup().addTo(mapa);
  validos.forEach(m=>{
    const progresso=Math.min(100,Math.max(0,numero(m.progresso_municipio))); const publicos=numero(m.checkpoints_publicos);
    const marcador=L.circleMarker([Number(m.latitude),Number(m.longitude)],{radius:12,fillColor:corProgresso(progresso),color:"#fff",weight:3,opacity:1,fillOpacity:.95});
    marcador.bindTooltip(`${m.municipio}: ${percentual(progresso)}`,{direction:"top",offset:[0,-9]});
    marcador.bindPopup(`<div class="portal-popup"><h3>${m.municipio}</h3><span class="popup-ibge">Código IBGE ${m.codigo_ibge||"não informado"}</span><div class="popup-progress">${percentual(progresso)}</div><p>${publicos?`${publicos} checkpoint(s) público(s)`:"Nenhum checkpoint público disponível"}</p><button type="button" onclick="fecharPopupEAbrirDetalhes('${m.municipio_id}')">Ver detalhes</button></div>`);
    marcador.addTo(grupo);
  });
  limitesMapa=grupo.getBounds().pad(.35); mapa.fitBounds(limitesMapa,{maxZoom:11}); setTimeout(()=>mapa.invalidateSize(),100);
}

function renderizarMunicipios() {
  const lista = $("lista-municipios");
  lista.innerHTML = municipios.map((m) => {
    const progresso = Math.min(100, Math.max(0, numero(m.progresso_municipio)));
    const textoPublicos = numero(m.checkpoints_publicos) === 1 ? "1 checkpoint público" : `${numero(m.checkpoints_publicos)} checkpoints públicos`;
    return `
      <article class="municipio-card">
        <div class="municipio-top">
          <div>
            <h3>${m.municipio}</h3>
            <span class="ibge">Código IBGE ${m.codigo_ibge || "não informado"}</span>
          </div>
          <span class="percent-badge">${percentual(progresso)}</span>
        </div>
        <div class="progress-track" aria-label="Progresso de ${m.municipio}: ${percentual(progresso)}">
          <div class="progress-fill" style="width:${progresso}%"></div>
        </div>
        <div class="municipio-meta">
          <span>${numero(m.checkpoints_totalmente_concluidos)} de ${numero(m.total_checkpoints)} checkpoints concluídos</span>
          <span>${textoPublicos}</span>
        </div>
        <button class="card-link" type="button" data-municipio-id="${m.municipio_id}">Ver informações públicas →</button>
      </article>`;
  }).join("");

  lista.querySelectorAll("[data-municipio-id]").forEach((botao) => {
    botao.addEventListener("click", () => abrirDetalhes(botao.dataset.municipioId));
  });
}

function abrirDetalhes(municipioId) {
  const municipio = municipios.find((item) => item.municipio_id === municipioId);
  const itens = checkpoints.filter((item) => item.municipio_id === municipioId);
  if (!municipio) return;

  const progresso = Math.min(100, Math.max(0, numero(municipio.progresso_municipio)));
  $("titulo-detalhes").textContent = municipio.municipio;
  $("subtitulo-detalhes").textContent = `Código IBGE ${municipio.codigo_ibge} · ${numero(municipio.total_checkpoints)} checkpoints monitorados`;
  $("percentual-detalhes").textContent = percentual(progresso);
  $("circulo-progresso").style.background = `conic-gradient(var(--blue) ${progresso * 3.6}deg, #e7eef2 0deg)`;

  $("lista-checkpoints").innerHTML = itens.length
    ? itens.map((item) => `
        <article class="checkpoint-card">
          <p class="eyebrow">${item.eixo || "Eixo não informado"}</p>
          <h3>${item.checkpoint}</h3>
          <p>${item.resumo_publico?.trim() || "Resumo público ainda não disponibilizado."}</p>
          <div class="checkpoint-meta">
            <span class="tag">${statusAmigavel(item.status_validado)}</span>
            <span class="tag">${percentual(item.percentual_validado)} validado</span>
            <span class="tag">Prazo: ${item.prazo ? dataPtBr(`${item.prazo}T12:00:00`) : "não informado"}</span>
          </div>
        </article>`).join("")
    : `<div class="empty-state">Este município participa do monitoramento, mas ainda não possui checkpoints liberados para consulta pública.</div>`;

  $("detalhes").hidden = false;
  $("detalhes").scrollIntoView({ behavior: "smooth", block: "start" });
}

function mostrarErro(erro) {
  console.error(erro);
  $("status-api").textContent = "Não foi possível carregar os dados";
  $("status-api").className = "api-status error";
  $("mensagem-erro").hidden = false;
  $("mensagem-erro").textContent = "O portal não conseguiu consultar os indicadores. Tente atualizar a página em alguns instantes.";
  $("lista-municipios").innerHTML = "";
}

async function iniciar() {
  configurarLinksToolJet();
  window.fecharPopupEAbrirDetalhes=fecharPopupEAbrirDetalhes;
  $("recentralizar-mapa").addEventListener("click",()=>{if(mapa&&limitesMapa)mapa.fitBounds(limitesMapa,{maxZoom:11});});
  $("fechar-detalhes").addEventListener("click", () => {
    $("detalhes").hidden = true;
    $("municipios").scrollIntoView({ behavior: "smooth" });
  });

  try {
    [municipios, checkpoints] = await Promise.all([
      consultar("vw_portal_municipios"),
      consultar("vw_portal_checkpoints")
    ]);
    renderizarIndicadores();
    renderizarMapa();
    renderizarMunicipios();
    $("status-api").textContent = "Dados públicos atualizados";
    $("status-api").className = "api-status success";
  } catch (erro) {
    mostrarErro(erro);
  }
}

document.addEventListener("DOMContentLoaded", iniciar);

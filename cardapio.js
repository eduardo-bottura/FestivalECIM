(async () => {
  const core = window.FestivalCore;
  await core.inicializar();
  const grupos = {
    rapidos: document.getElementById("alimentos"),
    bebidas: document.getElementById("bebidas"),
    pratos: document.getElementById("extras")
  };
  let avisos = [];

  function render() {
    Object.values(grupos).forEach(grupo => grupo.innerHTML = "");
    core.produtosFestival.forEach(produto => {
      const card = document.createElement("article");
      card.className = "produto-card bg-white rounded-xl shadow p-4 flex items-center gap-4 border border-gray-200";
      card.innerHTML = `
        <img src="${core.escaparHtml(produto.img)}" alt="${core.escaparHtml(produto.nome)}" class="w-24 h-24 object-cover rounded-xl bg-gray-100">
        <div class="flex-1">
          <h3 class="text-2xl font-black leading-tight">${core.escaparHtml(core.nomeProdutoExibicao(produto.nome))}</h3>
          ${produto.descricao ? `<p class="text-base md:text-lg text-gray-800 font-bold mt-1">${core.escaparHtml(produto.descricao)}</p>` : ""}
          <p class="text-3xl font-black text-green-700 mt-2">R$ ${core.formatarValor(produto.preco)}</p>
        </div>`;
      grupos[produto.categoriaTela].appendChild(card);
    });
  }

  async function carregarAvisos() {
    try {
      const dados = await core.obterJson("config/avisosCardapio");
      avisos = Array.isArray(dados) ? dados : Object.values(dados || {});
    } catch (erro) {
      console.warn("Não foi possível atualizar os avisos do cardápio.", erro);
    }
  }

  function renderAvisos() {
    const ativos = avisos.filter(aviso => aviso && aviso.ativo !== false && aviso.titulo && aviso.mensagem);
    const secao = document.getElementById("secaoAvisos");
    if (!ativos.length) {
      secao.classList.add("hidden");
      document.getElementById("avisosCardapio").innerHTML = "";
      return;
    }
    document.getElementById("avisosCardapio").innerHTML = ativos.map(aviso => `
      <div class="bg-white border border-red-300 rounded-lg p-3 text-lg md:text-xl">
        <strong class="text-red-800">${core.escaparHtml(aviso.titulo)}</strong>
        <span class="font-bold"> — ${core.escaparHtml(aviso.mensagem)}</span>
      </div>`).join("");
    secao.classList.remove("hidden");
  }

  await carregarAvisos();
  render();
  renderAvisos();
  let assinaturaProdutos = JSON.stringify(core.produtosFestival);
  let assinaturaAvisos = JSON.stringify(avisos);
  setInterval(async () => {
    await Promise.all([core.carregarProdutos(true), carregarAvisos()]);
    const novaAssinaturaProdutos = JSON.stringify(core.produtosFestival);
    const novaAssinaturaAvisos = JSON.stringify(avisos);
    if (novaAssinaturaProdutos !== assinaturaProdutos) {
      assinaturaProdutos = novaAssinaturaProdutos;
      render();
    }
    if (novaAssinaturaAvisos !== assinaturaAvisos) {
      assinaturaAvisos = novaAssinaturaAvisos;
      renderAvisos();
    }
  }, 12000);
})();

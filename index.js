(async () => {
  const core = window.FestivalCore;
  await core.inicializar();
  const paginasFixas = {
    Espetos: "espetos.html",
    Salgados: "salgados.html",
    Doces: "doces.html",
    Lanches: "lanches.html",
    Bebidas: "bebidas.html",
    Massas: "massas.html",
    Mesas: "mesas.html"
  };

  function render() {
    document.getElementById("listaCarrinhos").innerHTML = core.carrinhosFestival.map(nome => {
      const destino = paginasFixas[nome] || `carrinho.html?nome=${encodeURIComponent(nome)}`;
      return `<a href="${destino}" class="bg-white rounded-xl shadow p-4 border border-gray-200 font-black text-center hover:shadow-lg transition">
        ${core.escaparHtml(nome)}
      </a>`;
    }).join("");
  }

  render();
  let assinatura = JSON.stringify(core.carrinhosFestival);
  setInterval(async () => {
    await core.carregarCarrinhos(true);
    const novaAssinatura = JSON.stringify(core.carrinhosFestival);
    if (novaAssinatura !== assinatura) {
      assinatura = novaAssinatura;
      render();
    }
  }, 12000);
})();

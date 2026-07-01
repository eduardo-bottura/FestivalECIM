(async () => {
  await window.FESTIVAL_AUTH_READY;
  const core = window.FestivalCore;
  await core.inicializar();
  const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  let vendasPix = {};
  let vendasCartao = {};
  let vendasDinheiro = {};

  function total(vendas) {
    return Object.values(vendas || {}).reduce((soma, item) => soma + Number(item?.qtd || 0) * Number(item?.valor || 0), 0);
  }

  function quantidade(vendas, nome) {
    return Number(vendas?.[nome]?.qtd || 0);
  }

  function render() {
    const totalPix = total(vendasPix);
    const totalCartao = total(vendasCartao);
    const totalDinheiro = total(vendasDinheiro);
    document.getElementById("totalPix").textContent = moeda(totalPix);
    document.getElementById("totalCartao").textContent = moeda(totalCartao);
    document.getElementById("totalDinheiro").textContent = moeda(totalDinheiro);
    document.getElementById("totalGeral").textContent = moeda(totalPix + totalCartao + totalDinheiro);

    const nomes = [
      ...core.produtosFestival.map(produto => produto.nome),
      ...Object.keys(vendasPix), ...Object.keys(vendasCartao), ...Object.keys(vendasDinheiro)
    ].filter((nome, indice, lista) => lista.indexOf(nome) === indice);

    document.getElementById("tabelaProdutos").innerHTML = nomes.map(nome => {
      const pix = quantidade(vendasPix, nome);
      const cartao = quantidade(vendasCartao, nome);
      const dinheiro = quantidade(vendasDinheiro, nome);
      return `<tr>
        <td class="border p-2 text-left">${core.escaparHtml(core.nomeProdutoExibicao(nome))}</td>
        <td class="border p-2">${pix}</td><td class="border p-2">${cartao}</td>
        <td class="border p-2">${dinheiro}</td><td class="border p-2 font-bold">${pix + cartao + dinheiro}</td>
      </tr>`;
    }).join("");
  }

  async function atualizar() {
    try {
      [vendasPix, vendasCartao, vendasDinheiro] = await Promise.all([
        core.obterJson("vendas_pix").then(valor => valor || {}),
        core.obterJson("vendas_cartao").then(valor => valor || {}),
        core.obterJson("vendas_dinheiro").then(valor => valor || {})
      ]);
      await core.carregarProdutos(true);
      document.getElementById("dataHoraRelatorio").textContent =
        `Atualizado em ${new Date().toLocaleString("pt-BR")}`;
      document.getElementById("avisoRelatorio").classList.add("hidden");
      render();
    } catch {
      const aviso = document.getElementById("avisoRelatorio");
      aviso.textContent = "Não foi possível atualizar os dados. Confira a internet.";
      aviso.classList.remove("hidden");
    }
  }

  document.getElementById("imprimirRelatorio").addEventListener("click", () => window.print());
  await atualizar();
  setInterval(atualizar, 12000);
})();

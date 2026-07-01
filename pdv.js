(async () => {
  await window.FESTIVAL_AUTH_READY;
  const core = window.FestivalCore;
  await core.inicializar();
  const caixa = window.CAIXA_CONFIG;
  const produtos = core.produtosFestival;
  let carrinho = {};
  let vendas = {};

  const produtosDivs = {
    rapidos: document.getElementById("produtos-rapidos"),
    bebidas: document.getElementById("produtos-bebidas"),
    pratos: document.getElementById("produtos-pratos")
  };
  const carrinhoDiv = document.getElementById("carrinho");
  const totalSpan = document.getElementById("total");
  const trocoSpan = document.getElementById("troco");
  const recebidoInput = document.getElementById("recebido");

  function mostrarMensagemPedido(numeroPedido) {
    const existente = document.getElementById("modalPedido");
    if (existente) existente.remove();

    const modal = document.createElement("div");
    modal.id = "modalPedido";
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4";
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div class="px-6 py-4 text-lg font-semibold border-b">Esta página diz</div>
        <div class="p-6">
          <div class="bg-yellow-300 border-4 border-yellow-500 rounded-xl px-6 py-7 text-center text-6xl font-black text-black">
            PEDIDO ${numeroPedido}
          </div>
        </div>
        <div class="px-6 pb-5 flex justify-end">
          <button id="fecharModalPedido" class="bg-black text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("fecharModalPedido").focus();
    document.getElementById("fecharModalPedido").onclick = () => modal.remove();
  }

  function vendasZeradas() {
    const base = {};
    produtos.forEach(produto => {
      base[produto.nome] = { qtd: 0, valor: produto.preco };
    });
    return base;
  }

  function normalizarVendas(dados) {
    const base = vendasZeradas();
    Object.entries(dados || {}).forEach(([nome, item]) => {
      if (base[nome]) {
        base[nome].qtd = Number(item?.qtd || 0);
        base[nome].valor = Number(item?.valor || base[nome].valor);
      }
    });
    return base;
  }

  async function carregarVendasFirebase() {
    const dadosFirebase = await core.obterJson(caixa.firebasePath);
    vendas = normalizarVendas(dadosFirebase);
    localStorage.setItem(caixa.localStorageKey, JSON.stringify(vendas));
    return vendas;
  }

  function renderProdutos() {
    Object.values(produtosDivs).forEach(grupo => grupo.innerHTML = "");
    produtos.forEach(produto => {
      const card = document.createElement("div");
      card.className = "border rounded-xl p-4 flex items-center gap-4 shadow hover:shadow-md transition transform hover:scale-105";
      card.innerHTML = `
        <img src="${produto.img}" alt="${produto.nome}" class="w-16 h-16 object-cover rounded-lg">
        <div class="flex-1">
          <h3 class="text-lg font-bold">${core.nomeProdutoExibicao(produto.nome)}</h3>
          <p class="text-gray-700">R$ ${core.formatarValor(produto.preco)}</p>
        </div>
        <button onclick="adicionar(${produto.id})" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition">+</button>
      `;
      produtosDivs[produto.categoriaTela].appendChild(card);
    });
  }

  function totalCarrinho() {
    return Object.values(carrinho).reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  }

  window.adicionar = id => {
    const produto = produtos.find(item => item.id === id);
    if (!carrinho[id]) carrinho[id] = { ...produto, quantidade: 0 };
    carrinho[id].quantidade++;
    renderCarrinho();
  };

  window.remover = id => {
    if (!carrinho[id]) return;
    carrinho[id].quantidade--;
    if (carrinho[id].quantidade <= 0) delete carrinho[id];
    renderCarrinho();
  };

  window.calcularTroco = () => {
    const recebido = parseFloat(recebidoInput.value) || 0;
    const troco = recebido - totalCarrinho();
    trocoSpan.textContent = "R$ " + core.formatarValor(troco > 0 ? troco : 0);
  };

  function renderCarrinho() {
    carrinhoDiv.innerHTML = "";
    Object.values(carrinho).forEach(item => {
      const linha = document.createElement("div");
      linha.className = "flex justify-between items-center border-b pb-2";
      linha.innerHTML = `
        <span class="w-1/2 font-medium">${core.nomeProdutoExibicao(item.nome)}</span>
        <div class="flex items-center gap-2">
          <button onclick="remover(${item.id})" class="bg-red-500 text-white px-2 rounded">-</button>
          <span class="font-bold">${item.quantidade}</span>
          <button onclick="adicionar(${item.id})" class="bg-green-500 text-white px-2 rounded">+</button>
        </div>
        <span class="w-1/4 text-right">R$ ${core.formatarValor(item.preco * item.quantidade)}</span>
      `;
      carrinhoDiv.appendChild(linha);
    });
    totalSpan.textContent = "R$ " + core.formatarValor(totalCarrinho());
    window.calcularTroco();
  }

  async function atualizarFirebase() {
    localStorage.setItem(caixa.localStorageKey, JSON.stringify(vendas));
    await core.salvarJson(caixa.firebasePath, vendas);
  }

  window.finalizarVenda = async () => {
    if (Object.keys(carrinho).length === 0) return;
    if (!confirm("Tem certeza que deseja finalizar a venda?")) return;

    const carrinhoPedido = JSON.parse(JSON.stringify(carrinho));
    await carregarVendasFirebase();

    Object.values(carrinho).forEach(item => {
      if (!vendas[item.nome]) vendas[item.nome] = { qtd: 0, valor: item.preco };
      vendas[item.nome].qtd += item.quantidade;
    });

    try {
      await atualizarFirebase();
      const numeroPedido = await core.registrarPedido(carrinhoPedido, caixa.nomeExibicao);
      carrinho = {};
      renderCarrinho();
      recebidoInput.value = "";
      trocoSpan.textContent = "R$ 0,00";
      renderTabelaVendas();
      mostrarMensagemPedido(numeroPedido);
    } catch (erro) {
      alert("Não foi possível finalizar a venda. Confira a internet e tente novamente.");
      console.error(erro);
    }
  };

  window.mostrarRelatorio = () => {
    let texto = "Relatório de Vendas:\n\n";
    let arrecadadoTotal = 0;
    Object.entries(vendas).forEach(([nome, item]) => {
      const totalItem = item.qtd * item.valor;
      texto += `${core.nomeProdutoExibicao(nome)}: ${item.qtd} vendidos - R$ ${core.formatarValor(totalItem)}\n`;
      arrecadadoTotal += totalItem;
    });
    texto += `\nTotal arrecadado: R$ ${core.formatarValor(arrecadadoTotal)}`;
    alert(texto);
  };

  window.imprimirRelatorio = () => {
    let relatorio = `<html><head><title>Relatório de Vendas</title><style>
      body { font-family: Arial, sans-serif; font-size: 18px; padding: 20px; }
      h1 { text-align: center; color: #4B5563; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: center; }
      th, td { border: 1px solid #374151; padding: 10px; }
      th { background-color: #6B7280; color: white; }
      .total { font-weight: bold; font-size: 20px; background-color: #F3F4F6; }
    </style></head><body>
    <h1>Relatório de Vendas - Festival ECIM 2026 - ${caixa.nomeExibicao}</h1>
    <table><tr><th>Produto</th><th>Quantidade</th><th>Valor Unitário</th><th>Valor Total</th></tr>`;

    let totalGeral = 0;
    Object.entries(vendas).forEach(([nome, item]) => {
      const totalItem = item.qtd * item.valor;
      totalGeral += totalItem;
      relatorio += `<tr><td>${core.nomeProdutoExibicao(nome)}</td><td>${item.qtd}</td><td>R$ ${core.formatarValor(item.valor)}</td><td>R$ ${core.formatarValor(totalItem)}</td></tr>`;
    });

    relatorio += `<tr class="total"><td colspan="3">Total Geral</td><td>R$ ${core.formatarValor(totalGeral)}</td></tr></table></body></html>`;
    const novaJanela = window.open("", "", "width=1000,height=800");
    novaJanela.document.write(relatorio);
    novaJanela.document.close();
    novaJanela.print();
  };

  function renderTabelaVendas() {
    const tbody = document.querySelector("#tabelaVendas tbody");
    tbody.innerHTML = "";
    produtos.forEach(produto => {
      const item = vendas[produto.nome] || { qtd: 0, valor: produto.preco };
      const totalItem = item.qtd * item.valor;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="border p-2">${core.nomeProdutoExibicao(produto.nome)}</td>
        <td class="border p-2">
          <button onclick="alterarQtd('${produto.nome}', -1)" class="bg-red-500 text-white px-2 rounded">-</button>
          <span class="mx-2 font-bold">${item.qtd}</span>
          <button onclick="alterarQtd('${produto.nome}', 1)" class="bg-green-500 text-white px-2 rounded">+</button>
        </td>
        <td class="border p-2">R$ ${core.formatarValor(item.valor)}</td>
        <td class="border p-2">R$ ${core.formatarValor(totalItem)}</td>
        <td class="border p-2">
          <button onclick="apagarItem('${produto.nome}')" class="bg-red-500 text-white px-2 py-1 rounded">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    });
    atualizarTotalArrecadado();
  }

  window.alterarQtd = async (nome, delta) => {
    const produto = core.produtoPorNome(nome);
    if (!vendas[nome]) vendas[nome] = { qtd: 0, valor: produto.preco };
    vendas[nome].qtd += delta;
    if (vendas[nome].qtd < 0) vendas[nome].qtd = 0;
    await atualizarFirebase();
    renderTabelaVendas();
  };

  window.apagarItem = async nome => {
    if (!confirm(`Deseja zerar as vendas de "${core.nomeProdutoExibicao(nome)}"?`)) return;
    if (!vendas[nome]) return;
    vendas[nome].qtd = 0;
    await atualizarFirebase();
    renderTabelaVendas();
  };

  function atualizarTotalArrecadado() {
    const totalGeral = Object.values(vendas).reduce((sum, item) => sum + item.qtd * item.valor, 0);
    document.getElementById("totalArrecadado").textContent = "R$ " + core.formatarValor(totalGeral);
  }

  renderProdutos();
  carregarVendasFirebase()
    .catch(() => {
      vendas = normalizarVendas(JSON.parse(localStorage.getItem(caixa.localStorageKey)) || {});
    })
    .finally(renderTabelaVendas);

  let assinaturaProdutos = JSON.stringify(produtos);
  setInterval(async () => {
    const assinaturaAnterior = assinaturaProdutos;
    await core.carregarProdutos(true);
    assinaturaProdutos = JSON.stringify(produtos);
    if (assinaturaAnterior !== assinaturaProdutos) {
      renderProdutos();
      vendas = normalizarVendas(vendas);
      renderTabelaVendas();
    }
  }, 12000);
})();

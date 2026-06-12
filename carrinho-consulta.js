(() => {
  const core = window.FestivalCore;
  const carrinhoAtual = document.body.dataset.carrinho;
  const resultado = document.getElementById("resultado");
  let pedidoAtual = null;

  function itensDoCarrinho(pedido) {
    return (pedido?.itens || []).filter(item => item.carrinho === carrinhoAtual && Number(item.quantidade) > 0);
  }

  window.consultarPedido = async () => {
    const numero = core.formatarPedido(document.getElementById("numeroPedido").value);
    resultado.innerHTML = "";
    pedidoAtual = null;

    if (!numero || numero === "00") return;

    const pedido = await core.obterJson(`pedidos/${numero}`);
    if (!pedido) {
      resultado.innerHTML = `<div class="bg-white p-6 rounded-xl shadow font-bold text-xl">Pedido nao encontrado.</div>`;
      return;
    }

    pedidoAtual = pedido;
    renderPedido();
  };

  function renderPedido() {
    const itens = itensDoCarrinho(pedidoAtual);
    if (itens.length === 0) {
      resultado.innerHTML = `<div class="bg-white p-6 rounded-xl shadow font-bold text-xl">Pedido nao realizado neste carrinho.</div>`;
      return;
    }

    const todosEntregues = itens.every(item => item.statusEntrega === "ENTREGUE");
    const linhas = itens.map((item, indexOriginal) => {
      const indice = pedidoAtual.itens.findIndex(pedidoItem => pedidoItem.nome === item.nome && pedidoItem.carrinho === item.carrinho);
      const entregue = item.statusEntrega === "ENTREGUE";
      return `<div class="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p class="text-xl font-bold">${item.quantidade} ${item.nome}</p>
          <p class="text-sm text-gray-600">${entregue ? `Entregue em: ${item.dataEntrega} - ${item.horaEntrega}` : "Entrega pendente"}</p>
        </div>
        <button onclick="confirmarEntrega(${indice})" ${entregue ? "disabled" : ""}
          class="${entregue ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"} text-white font-bold px-5 py-3 rounded-xl">
          ${entregue ? "ENTREGUE" : "ENTREGUE"}
        </button>
      </div>`;
    }).join("");

    resultado.innerHTML = `<div class="bg-white p-6 rounded-xl shadow">
      <h2 class="text-3xl font-black mb-2">${todosEntregues ? "PEDIDO JA ENTREGUE" : `Pedido ${pedidoAtual.numero}`}</h2>
      <p class="mb-4 text-gray-700">Carrinho: ${carrinhoAtual}</p>
      <div class="space-y-3">${linhas}</div>
    </div>`;
  }

  window.confirmarEntrega = async indice => {
    if (!confirm("Confirma a entrega do pedido?")) return;
    const momento = core.agoraPedido();
    pedidoAtual.itens[indice].statusEntrega = "ENTREGUE";
    pedidoAtual.itens[indice].dataEntrega = momento.data;
    pedidoAtual.itens[indice].horaEntrega = momento.horario;
    await core.salvarJson(`pedidos/${pedidoAtual.numero}/itens/${indice}`, pedidoAtual.itens[indice]);
    renderPedido();
  };
})();

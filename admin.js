(async () => {
  await window.FESTIVAL_AUTH_READY;
  const core = window.FestivalCore;
  await core.inicializar();
  let pedidos = {};
  let avisos = [];
  let imagemEmBase64 = "";

  const $ = id => document.getElementById(id);
  const escapar = core.escaparHtml;

  function mensagem(elemento, texto, sucesso = true) {
    elemento.textContent = texto;
    elemento.className = `mt-4 font-bold ${sucesso ? "text-green-700" : "text-red-700"}`;
  }

  function ativarAba(nome) {
    document.querySelectorAll(".aba-conteudo").forEach(secao => secao.classList.add("hidden"));
    document.querySelectorAll(".aba-btn").forEach(botao => {
      botao.classList.remove("bg-black", "text-white");
      botao.classList.add("bg-gray-200");
    });
    $(`aba-${nome}`).classList.remove("hidden");
    const botao = document.querySelector(`[data-aba="${nome}"]`);
    botao.classList.remove("bg-gray-200");
    botao.classList.add("bg-black", "text-white");
  }

  document.querySelectorAll(".aba-btn").forEach(botao => {
    botao.addEventListener("click", () => ativarAba(botao.dataset.aba));
  });

  function opcoesProdutos() {
    return core.produtosFestival.map(produto =>
      `<option value="${produto.id}">${escapar(core.nomeProdutoExibicao(produto.nome))}</option>`
    ).join("");
  }

  async function carregarPedidos() {
    try {
      pedidos = await core.obterJson("pedidos") || {};
      renderPedidos();
    } catch (erro) {
      $("listaPedidos").innerHTML = `<div class="bg-red-50 border border-red-300 rounded-xl p-5 font-bold text-red-700">Não foi possível carregar os pedidos.</div>`;
    }
  }

  function renderPedidos() {
    const filtroDigitado = $("filtroPedido").value.replace(/\D/g, "");
    const filtro = filtroDigitado ? core.formatarPedido(filtroDigitado) : "";
    const numeros = Object.keys(pedidos).sort((a, b) => Number(a) - Number(b));
    const visiveis = filtro ? numeros.filter(numero => numero === filtro) : numeros;

    if (!visiveis.length) {
      $("listaPedidos").innerHTML = `<div class="bg-white rounded-xl shadow p-6 font-bold text-xl">Nenhum pedido encontrado.</div>`;
      return;
    }

    $("listaPedidos").innerHTML = visiveis.map(numero => {
      const pedido = pedidos[numero];
      const itens = pedido.itens || [];
      const linhas = itens.map((item, indice) => `
        <tr>
          <td class="border p-2">${escapar(core.nomeProdutoExibicao(item.nome))}</td>
          <td class="border p-2">${escapar(item.carrinho || "")}</td>
          <td class="border p-2 whitespace-nowrap">
            <button data-acao="quantidade" data-numero="${numero}" data-indice="${indice}" data-delta="-1" class="bg-red-500 text-white px-2 rounded">−</button>
            <span class="mx-2 font-bold">${Number(item.quantidade || 0)}</span>
            <button data-acao="quantidade" data-numero="${numero}" data-indice="${indice}" data-delta="1" class="bg-green-600 text-white px-2 rounded">+</button>
          </td>
          <td class="border p-2">${escapar(item.statusEntrega || "PENDENTE")}</td>
          <td class="border p-2">${escapar(`${item.dataEntrega || ""} ${item.horaEntrega || ""}`)}</td>
          <td class="border p-2"><button data-acao="excluir-item" data-numero="${numero}" data-indice="${indice}" class="bg-red-600 text-white px-3 py-1 rounded">Excluir</button></td>
        </tr>`).join("");

      return `<section class="bg-white rounded-xl shadow p-5">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 class="text-3xl font-black">Pedido ${escapar(pedido.numero || numero)}</h2>
            <p><strong>Origem:</strong> ${escapar(pedido.origem || "")}</p>
            <p><strong>Data:</strong> ${escapar(pedido.dataVenda || "")} <strong>Horário:</strong> ${escapar(pedido.horarioVenda || "")}</p>
          </div>
          <button data-acao="excluir-pedido" data-numero="${numero}" class="bg-red-700 text-white font-bold rounded-lg px-4 py-3">Excluir pedido completo</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-center">
            <thead><tr class="bg-gray-200"><th class="border p-2">Produto</th><th class="border p-2">Carrinho</th><th class="border p-2">Quantidade</th><th class="border p-2">Status</th><th class="border p-2">Entrega</th><th class="border p-2">Ações</th></tr></thead>
            <tbody>${linhas || `<tr><td colspan="6" class="border p-3">Pedido sem itens.</td></tr>`}</tbody>
          </table>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <select id="produto-pedido-${numero}" class="border rounded-lg p-3 md:col-span-2">${opcoesProdutos()}</select>
          <button data-acao="adicionar-item" data-numero="${numero}" class="bg-blue-600 text-white font-bold rounded-lg p-3">Adicionar produto</button>
        </div>
      </section>`;
    }).join("");
  }

  async function salvarPedido(numero) {
    await core.salvarJson(`pedidos/${numero}`, pedidos[numero]);
    renderPedidos();
  }

  $("listaPedidos").addEventListener("click", async evento => {
    const botao = evento.target.closest("[data-acao]");
    if (!botao) return;
    const numero = botao.dataset.numero;
    const indice = Number(botao.dataset.indice);
    botao.disabled = true;
    try {
      if (botao.dataset.acao === "quantidade") {
        const item = pedidos[numero].itens[indice];
        item.quantidade = Math.max(0, Number(item.quantidade || 0) + Number(botao.dataset.delta));
        if (!item.quantidade) pedidos[numero].itens.splice(indice, 1);
        await salvarPedido(numero);
      }
      if (botao.dataset.acao === "excluir-item" && confirm("Deseja excluir este produto do pedido?")) {
        pedidos[numero].itens.splice(indice, 1);
        await salvarPedido(numero);
      }
      if (botao.dataset.acao === "excluir-pedido" && confirm("Deseja excluir o pedido completo?")) {
        await core.excluirJson(`pedidos/${numero}`);
        delete pedidos[numero];
        renderPedidos();
      }
      if (botao.dataset.acao === "adicionar-item") {
        const id = Number($(`produto-pedido-${numero}`).value);
        const produto = core.produtosFestival.find(item => item.id === id);
        if (!produto) return;
        const existente = pedidos[numero].itens.find(item => item.id === id || item.nome === produto.nome);
        if (existente) {
          existente.quantidade = Number(existente.quantidade || 0) + 1;
        } else {
          pedidos[numero].itens.push({
            id: produto.id, nome: produto.nome, preco: produto.preco, quantidade: 1,
            carrinho: produto.carrinho, statusEntrega: "PENDENTE", dataEntrega: "", horaEntrega: ""
          });
        }
        await salvarPedido(numero);
      }
    } catch (erro) {
      alert("Não foi possível salvar a alteração. Confira a internet e tente novamente.");
      botao.disabled = false;
    }
  });

  async function zerarPedidos() {
    if (!confirm("Esta ação apagará todos os pedidos e fará o próximo voltar para 01. Deseja continuar?")) return;
    if (!confirm("Confirmação final: apagar todos os pedidos de teste?")) return;
    try {
      await core.excluirJson("pedidos");
      await core.salvarJson("controle/ultimoPedido", 0);
      pedidos = {};
      renderPedidos();
      alert("Pedidos apagados. O próximo número será PEDIDO 01.");
    } catch {
      alert("Não foi possível zerar os pedidos.");
    }
  }

  function renderProdutos() {
    const categorias = { rapidos: "Alimentos", bebidas: "Bebidas", pratos: "Extras" };
    $("listaProdutos").innerHTML = core.produtosFestival.map(produto => `
      <article class="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <img src="${escapar(produto.img)}" alt="${escapar(produto.nome)}" class="w-full sm:w-24 h-24 object-cover rounded-lg bg-gray-100">
        <div class="flex-1">
          <h3 class="text-xl font-black">${escapar(core.nomeProdutoExibicao(produto.nome))}</h3>
          <p class="font-bold text-green-700">R$ ${core.formatarValor(produto.preco)}</p>
          <p class="text-sm text-gray-600">${categorias[produto.categoriaTela]} · Carrinho: ${escapar(produto.carrinho)}</p>
          ${produto.descricao ? `<p class="text-sm mt-1">${escapar(produto.descricao)}</p>` : ""}
        </div>
        <div class="flex sm:flex-col gap-2">
          <button data-editar-produto="${produto.id}" class="bg-blue-600 text-white font-bold rounded-lg px-4 py-2">Editar</button>
          <button data-excluir-produto="${produto.id}" class="bg-red-600 text-white font-bold rounded-lg px-4 py-2">Excluir</button>
        </div>
      </article>`).join("");

    const carrinhos = core.carrinhosFestival;
    const valorAtual = $("produtoCarrinho").value;
    $("produtoCarrinho").innerHTML = carrinhos.map(nome => `<option value="${escapar(nome)}">${escapar(nome)}</option>`).join("");
    if (carrinhos.includes(valorAtual)) $("produtoCarrinho").value = valorAtual;
    renderCarrinhos();
  }

  function renderCarrinhos() {
    $("listaCarrinhosAdmin").innerHTML = core.carrinhosFestival.map((nome, indice) => {
      const quantidadeProdutos = core.produtosFestival.filter(produto => produto.carrinho === nome).length;
      return `<div class="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex-1">
          <p class="font-black">${escapar(nome)}</p>
          <p class="text-sm text-gray-600">${quantidadeProdutos} produto(s) vinculado(s)</p>
        </div>
        <div class="flex gap-2">
          <button data-editar-carrinho="${indice}" class="bg-blue-600 text-white font-bold rounded-lg px-3 py-2">Editar</button>
          <button data-excluir-carrinho="${indice}" class="bg-red-600 text-white font-bold rounded-lg px-3 py-2">Excluir</button>
        </div>
      </div>`;
    }).join("");
  }

  function limparFormProduto() {
    $("formProduto").reset();
    $("produtoId").value = "";
    $("tituloFormProduto").textContent = "Adicionar produto";
    $("produtoImagemPreview").classList.add("hidden");
    $("produtoImagemPreview").removeAttribute("src");
    $("mensagemProduto").className = "hidden";
    imagemEmBase64 = "";
  }

  function editarProduto(id) {
    const produto = core.produtosFestival.find(item => item.id === id);
    if (!produto) return;
    $("produtoId").value = produto.id;
    $("produtoNome").value = produto.nome;
    $("produtoPreco").value = produto.preco;
    $("produtoDescricao").value = produto.descricao || "";
    $("produtoCategoria").value = produto.categoriaTela;
    $("produtoCarrinho").value = produto.carrinho;
    $("produtoImagemUrl").value = produto.img.startsWith("data:") ? "" : produto.img;
    imagemEmBase64 = produto.img.startsWith("data:") ? produto.img : "";
    $("produtoImagemPreview").src = produto.img;
    $("produtoImagemPreview").classList.remove("hidden");
    $("tituloFormProduto").textContent = "Editar produto";
    $("formProduto").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function lerImagemReduzida(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = reject;
      leitor.onload = () => {
        const imagem = new Image();
        imagem.onerror = reject;
        imagem.onload = () => {
          const maximo = 900;
          const escala = Math.min(1, maximo / Math.max(imagem.width, imagem.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(imagem.width * escala);
          canvas.height = Math.round(imagem.height * escala);
          canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        imagem.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  $("produtoImagemArquivo").addEventListener("change", async evento => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    if (arquivo.size > 8 * 1024 * 1024) {
      mensagem($("mensagemProduto"), "Escolha uma imagem menor que 8 MB.", false);
      evento.target.value = "";
      return;
    }
    imagemEmBase64 = await lerImagemReduzida(arquivo);
    $("produtoImagemPreview").src = imagemEmBase64;
    $("produtoImagemPreview").classList.remove("hidden");
  });

  $("produtoImagemUrl").addEventListener("input", evento => {
    if (!evento.target.value) return;
    imagemEmBase64 = "";
    $("produtoImagemPreview").src = evento.target.value;
    $("produtoImagemPreview").classList.remove("hidden");
  });

  async function adicionarCarrinho() {
    const nome = $("novoCarrinho").value.trim();
    if (!nome) {
      mensagem($("mensagemCarrinho"), "Digite o nome do novo carrinho.", false);
      return;
    }
    const existente = core.carrinhosFestival.find(carrinho => carrinho.toLowerCase() === nome.toLowerCase());
    if (existente) {
      $("produtoCarrinho").value = existente;
      mensagem($("mensagemCarrinho"), "Esse carrinho já existe e foi selecionado.", false);
      return;
    }
    const botao = $("adicionarCarrinho");
    botao.disabled = true;
    try {
      await core.salvarCarrinhos([...core.carrinhosFestival, nome]);
      renderProdutos();
      $("produtoCarrinho").value = nome;
      $("novoCarrinho").value = "";
      mensagem($("mensagemCarrinho"), `Carrinho "${nome}" adicionado e sincronizado.`);
    } catch {
      mensagem($("mensagemCarrinho"), "Não foi possível adicionar o carrinho. Confira a internet.", false);
    } finally {
      botao.disabled = false;
    }
  }

  async function renomearCarrinho(indice) {
    const nomeAntigo = core.carrinhosFestival[indice];
    if (!nomeAntigo) return;
    const nomeNovo = prompt("Digite o novo nome do carrinho:", nomeAntigo)?.trim();
    if (!nomeNovo || nomeNovo === nomeAntigo) return;
    const duplicado = core.carrinhosFestival.some((nome, posicao) =>
      posicao !== indice && nome.toLowerCase() === nomeNovo.toLowerCase()
    );
    if (duplicado) {
      alert("Já existe um carrinho com esse nome.");
      return;
    }
    try {
      const produtosAtualizados = core.produtosFestival.map(produto =>
        produto.carrinho === nomeAntigo ? { ...produto, carrinho: nomeNovo } : produto
      );
      const pedidosAtualizados = await core.obterJson("pedidos") || {};
      let alterouPedidos = false;
      Object.values(pedidosAtualizados).forEach(pedido => {
        (pedido.itens || []).forEach(item => {
          if (item.carrinho === nomeAntigo) {
            item.carrinho = nomeNovo;
            alterouPedidos = true;
          }
        });
      });
      const carrinhosAtualizados = core.carrinhosFestival.map((nome, posicao) =>
        posicao === indice ? nomeNovo : nome
      );
      const gravacoes = [
        core.salvarCarrinhos(carrinhosAtualizados),
        core.salvarProdutos(produtosAtualizados)
      ];
      if (alterouPedidos) gravacoes.push(core.salvarJson("pedidos", pedidosAtualizados));
      await Promise.all(gravacoes);
      pedidos = pedidosAtualizados;
      renderProdutos();
      renderPedidos();
      $("produtoCarrinho").value = nomeNovo;
      alert(`Carrinho renomeado para "${nomeNovo}". Produtos e pedidos foram atualizados.`);
    } catch (erro) {
      alert("Não foi possível renomear o carrinho. Confira a internet.");
      console.error(erro);
    }
  }

  async function excluirCarrinho(indice) {
    const nome = core.carrinhosFestival[indice];
    if (!nome) return;
    const produtosVinculados = core.produtosFestival.filter(produto => produto.carrinho === nome);
    if (produtosVinculados.length) {
      alert(`Não é possível excluir "${nome}" porque há ${produtosVinculados.length} produto(s) vinculado(s). Edite esses produtos e escolha outro carrinho primeiro.`);
      return;
    }
    try {
      const pedidosAtuais = await core.obterJson("pedidos") || {};
      const pedidosPendentes = Object.values(pedidosAtuais).some(pedido =>
        (pedido.itens || []).some(item => item.carrinho === nome && item.statusEntrega !== "ENTREGUE")
      );
      if (pedidosPendentes) {
        alert(`Não é possível excluir "${nome}" enquanto houver pedidos pendentes nesse carrinho.`);
        return;
      }
      if (!confirm(`Excluir o carrinho "${nome}"?`)) return;
      await core.salvarCarrinhos(core.carrinhosFestival.filter((_, posicao) => posicao !== indice));
      renderProdutos();
    } catch {
      alert("Não foi possível excluir o carrinho. Confira a internet.");
    }
  }

  $("listaCarrinhosAdmin").addEventListener("click", evento => {
    const editar = evento.target.closest("[data-editar-carrinho]");
    const excluir = evento.target.closest("[data-excluir-carrinho]");
    if (editar) renomearCarrinho(Number(editar.dataset.editarCarrinho));
    if (excluir) excluirCarrinho(Number(excluir.dataset.excluirCarrinho));
  });

  async function migrarNomeProduto(nomeAntigo, produtoNovo) {
    if (!nomeAntigo || nomeAntigo === produtoNovo.nome) return;
    for (const caminho of ["vendas_pix", "vendas_cartao", "vendas_dinheiro"]) {
      const vendas = await core.obterJson(caminho) || {};
      if (vendas[nomeAntigo]) {
        const antiga = vendas[nomeAntigo];
        const atual = vendas[produtoNovo.nome] || { qtd: 0, valor: produtoNovo.preco };
        atual.qtd = Number(atual.qtd || 0) + Number(antiga.qtd || 0);
        atual.valor = produtoNovo.preco;
        vendas[produtoNovo.nome] = atual;
        delete vendas[nomeAntigo];
        await core.salvarJson(caminho, vendas);
      }
    }
    const todosPedidos = await core.obterJson("pedidos") || {};
    let alterou = false;
    Object.values(todosPedidos).forEach(pedido => {
      (pedido.itens || []).forEach(item => {
        if (item.nome === nomeAntigo) {
          Object.assign(item, { id: produtoNovo.id, nome: produtoNovo.nome, preco: produtoNovo.preco, carrinho: produtoNovo.carrinho });
          alterou = true;
        }
      });
    });
    if (alterou) await core.salvarJson("pedidos", todosPedidos);
  }

  $("formProduto").addEventListener("submit", async evento => {
    evento.preventDefault();
    const idAtual = Number($("produtoId").value || 0);
    const existente = core.produtosFestival.find(item => item.id === idAtual);
    const imagem = imagemEmBase64 || $("produtoImagemUrl").value.trim() || existente?.img || "";
    if (!imagem) {
      mensagem($("mensagemProduto"), "Adicione uma imagem ou informe o nome/endereço de uma imagem.", false);
      return;
    }
    const produto = {
      id: idAtual || Math.max(0, ...core.produtosFestival.map(item => item.id)) + 1,
      nome: $("produtoNome").value.trim(),
      preco: Number($("produtoPreco").value),
      descricao: $("produtoDescricao").value.trim(),
      categoriaTela: $("produtoCategoria").value,
      carrinho: $("produtoCarrinho").value.trim(),
      img: imagem
    };
    const duplicado = core.produtosFestival.find(item => item.nome.toLowerCase() === produto.nome.toLowerCase() && item.id !== produto.id);
    if (duplicado) {
      mensagem($("mensagemProduto"), "Já existe um produto com esse nome.", false);
      return;
    }
    const botao = evento.submitter;
    botao.disabled = true;
    try {
      const lista = core.produtosFestival.map(item => item.id === produto.id ? produto : item);
      if (!existente) lista.push(produto);
      await core.salvarProdutos(lista);
      await migrarNomeProduto(existente?.nome, produto);
      renderProdutos();
      limparFormProduto();
      mensagem($("mensagemProduto"), "Produto salvo e sincronizado.");
    } catch (erro) {
      mensagem($("mensagemProduto"), "Não foi possível salvar o produto. Confira a internet.", false);
      console.error(erro);
    } finally {
      botao.disabled = false;
    }
  });

  $("listaProdutos").addEventListener("click", async evento => {
    const editar = evento.target.closest("[data-editar-produto]");
    const excluir = evento.target.closest("[data-excluir-produto]");
    if (editar) editarProduto(Number(editar.dataset.editarProduto));
    if (excluir) {
      const id = Number(excluir.dataset.excluirProduto);
      const produto = core.produtosFestival.find(item => item.id === id);
      if (!produto || !confirm(`Excluir "${core.nomeProdutoExibicao(produto.nome)}" do catálogo? As vendas antigas serão preservadas.`)) return;
      excluir.disabled = true;
      try {
        await core.salvarProdutos(core.produtosFestival.filter(item => item.id !== id));
        renderProdutos();
        limparFormProduto();
      } catch {
        alert("Não foi possível excluir o produto.");
        excluir.disabled = false;
      }
    }
  });

  async function carregarAvisos() {
    try {
      const dados = await core.obterJson("config/avisosCardapio");
      avisos = Array.isArray(dados) ? dados : Object.values(dados || {});
      renderAvisos();
    } catch {
      $("listaAvisos").innerHTML = `<div class="bg-red-50 border border-red-300 rounded-xl p-4 font-bold text-red-700">Não foi possível carregar os avisos.</div>`;
    }
  }

  async function salvarAvisos() {
    await core.salvarJson("config/avisosCardapio", avisos);
    renderAvisos();
  }

  function renderAvisos() {
    if (!avisos.length) {
      $("listaAvisos").innerHTML = `<div class="bg-white rounded-xl shadow p-5 font-bold">Nenhum aviso cadastrado.</div>`;
      return;
    }
    $("listaAvisos").innerHTML = avisos.map((aviso, indice) => `
      <article class="bg-white rounded-xl shadow p-4 border-l-8 ${aviso.ativo ? "border-red-500" : "border-gray-400"}">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-xl font-black">${escapar(aviso.titulo)}</h3>
              <span class="${aviso.ativo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"} text-xs font-black rounded-full px-2 py-1">
                ${aviso.ativo ? "ATIVO" : "PAUSADO"}
              </span>
            </div>
            <p class="text-lg">${escapar(aviso.mensagem)}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button data-alternar-aviso="${indice}" class="bg-yellow-500 text-black font-bold rounded-lg px-3 py-2">${aviso.ativo ? "Pausar" : "Ativar"}</button>
            <button data-editar-aviso="${indice}" class="bg-blue-600 text-white font-bold rounded-lg px-3 py-2">Editar</button>
            <button data-excluir-aviso="${indice}" class="bg-red-600 text-white font-bold rounded-lg px-3 py-2">Excluir</button>
          </div>
        </div>
      </article>`).join("");
  }

  function limparFormAviso() {
    $("formAviso").reset();
    $("avisoId").value = "";
    $("avisoAtivo").checked = true;
    $("tituloFormAviso").textContent = "Novo aviso";
    $("mensagemAviso").className = "hidden";
  }

  function editarAviso(indice) {
    const aviso = avisos[indice];
    if (!aviso) return;
    $("avisoId").value = aviso.id;
    $("avisoTitulo").value = aviso.titulo;
    $("avisoMensagem").value = aviso.mensagem;
    $("avisoAtivo").checked = aviso.ativo !== false;
    $("tituloFormAviso").textContent = "Editar aviso";
    $("formAviso").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("formAviso").addEventListener("submit", async evento => {
    evento.preventDefault();
    const id = Number($("avisoId").value || Date.now());
    const aviso = {
      id,
      titulo: $("avisoTitulo").value.trim(),
      mensagem: $("avisoMensagem").value.trim(),
      ativo: $("avisoAtivo").checked
    };
    const indice = avisos.findIndex(item => Number(item.id) === id);
    if (indice >= 0) avisos[indice] = aviso;
    else avisos.unshift(aviso);
    const botao = evento.submitter;
    botao.disabled = true;
    try {
      await salvarAvisos();
      limparFormAviso();
      mensagem($("mensagemAviso"), "Aviso salvo e sincronizado com o cardápio.");
    } catch {
      mensagem($("mensagemAviso"), "Não foi possível salvar o aviso.", false);
    } finally {
      botao.disabled = false;
    }
  });

  $("listaAvisos").addEventListener("click", async evento => {
    const editar = evento.target.closest("[data-editar-aviso]");
    const excluir = evento.target.closest("[data-excluir-aviso]");
    const alternar = evento.target.closest("[data-alternar-aviso]");
    if (editar) editarAviso(Number(editar.dataset.editarAviso));
    if (excluir) {
      const indice = Number(excluir.dataset.excluirAviso);
      if (!confirm(`Excluir o aviso "${avisos[indice]?.titulo || ""}"?`)) return;
      avisos.splice(indice, 1);
      try {
        await salvarAvisos();
        limparFormAviso();
      } catch {
        alert("Não foi possível excluir o aviso.");
      }
    }
    if (alternar) {
      const indice = Number(alternar.dataset.alternarAviso);
      avisos[indice].ativo = !avisos[indice].ativo;
      try {
        await salvarAvisos();
      } catch {
        avisos[indice].ativo = !avisos[indice].ativo;
        alert("Não foi possível alterar o aviso.");
      }
    }
  });

  async function carregarSenhas() {
    const senhas = await core.obterSenhas();
    $("senhaCaixa").value = senhas.caixa;
    $("senhaRelatorio").value = senhas.relatorio;
    $("senhaAdministrador").value = senhas.administrador;
    $("confirmarSenhaAdministrador").value = senhas.administrador;
  }

  $("formSenhas").addEventListener("submit", async evento => {
    evento.preventDefault();
    if ($("senhaAdministrador").value !== $("confirmarSenhaAdministrador").value) {
      mensagem($("mensagemSenhas"), "A confirmação da senha do administrador não confere.", false);
      return;
    }
    const botao = evento.submitter;
    botao.disabled = true;
    try {
      await core.salvarSenhas({
        caixa: $("senhaCaixa").value,
        relatorio: $("senhaRelatorio").value,
        administrador: $("senhaAdministrador").value
      });
      sessionStorage.removeItem("festival-auth-caixa");
      sessionStorage.removeItem("festival-auth-relatorio");
      sessionStorage.removeItem("festival-auth-administrador");
      mensagem($("mensagemSenhas"), "Senhas atualizadas. A nova senha do administrador será solicitada no próximo acesso.");
    } catch {
      mensagem($("mensagemSenhas"), "Não foi possível salvar as senhas.", false);
    } finally {
      botao.disabled = false;
    }
  });

  $("filtroPedido").addEventListener("input", renderPedidos);
  $("atualizarPedidos").addEventListener("click", carregarPedidos);
  $("zerarPedidos").addEventListener("click", zerarPedidos);
  $("cancelarProduto").addEventListener("click", limparFormProduto);
  $("adicionarCarrinho").addEventListener("click", adicionarCarrinho);
  $("novoCarrinho").addEventListener("keydown", evento => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      adicionarCarrinho();
    }
  });
  $("cancelarAviso").addEventListener("click", limparFormAviso);
  renderProdutos();
  await Promise.all([carregarPedidos(), carregarAvisos(), carregarSenhas()]);
})();

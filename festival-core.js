const FIREBASE_BASE_URL = "https://festival-ecim-2026-default-rtdb.firebaseio.com";

const PRODUTOS_PADRAO = [
  { id: 1, nome: "Espeto", preco: 10, img: "OIP.webp", categoriaTela: "rapidos", carrinho: "Espetos", descricao: "Carne, frango ou kafta" },
  { id: 2, nome: "Salgado", preco: 8, img: "istockphoto-1092130320-170667a.jpg", categoriaTela: "rapidos", carrinho: "Salgados", descricao: "" },
  { id: 3, nome: "Lanche", preco: 25, img: "ham.jpg", categoriaTela: "rapidos", carrinho: "Lanches", descricao: "" },
  { id: 4, nome: "Caldo", preco: 20, img: "caldo.jpg", categoriaTela: "rapidos", carrinho: "Salgados", descricao: "" },
  { id: 5, nome: "Massa", preco: 30, img: "358841.jpg", categoriaTela: "rapidos", carrinho: "Massas", descricao: "" },
  { id: 6, nome: "Doce", preco: 8, img: "OIP (1).webp", categoriaTela: "rapidos", carrinho: "Doces", descricao: "" },
  { id: 7, nome: "Cerveja lata", preco: 7, img: "cerveja-lata.png", categoriaTela: "bebidas", carrinho: "Bebidas", descricao: "Skol, Brahma, Sub-Zero" },
  { id: 8, nome: "Refrigerante lata", preco: 6, img: "refrigerante-lata.png", categoriaTela: "bebidas", carrinho: "Bebidas", descricao: "Coca-Cola, Coca-Cola Zero, Fanta, Guaraná Antarctica" },
  { id: 9, nome: "Agua garrafa 350ml", preco: 5, img: "Garrafa-Agua-Mineral-500-ml-pacote-12-unidades-600x600.jpg", categoriaTela: "bebidas", carrinho: "Bebidas", descricao: "Água com gás, água sem gás" },
  { id: 10, nome: "Mesa", preco: 35, img: "OIP.jpg", categoriaTela: "pratos", carrinho: "Mesas", descricao: "" }
];

const SENHAS_PADRAO = {
  caixa: "ecim",
  relatorio: "relatorioecim",
  administrador: "adminecim"
};

const CARRINHOS_PADRAO = ["Espetos", "Salgados", "Doces", "Lanches", "Bebidas", "Massas", "Mesas"];
const produtosFestival = [];
const carrinhosFestival = [];
let produtosCarregados = false;
let carrinhosCarregados = false;

function firebaseUrl(path) {
  return `${FIREBASE_BASE_URL}/${path}.json`;
}

function clonar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function normalizarProdutos(produtos) {
  const lista = Array.isArray(produtos) ? produtos : Object.values(produtos || {});
  return lista
    .filter(produto => produto && produto.nome)
    .map((produto, indice) => ({
      id: Number(produto.id || indice + 1),
      nome: String(produto.nome).trim(),
      preco: Number(produto.preco || 0),
      img: String(produto.img || ""),
      categoriaTela: ["rapidos", "bebidas", "pratos"].includes(produto.categoriaTela) ? produto.categoriaTela : "rapidos",
      carrinho: String(produto.carrinho || "Geral").trim(),
      descricao: String(produto.descricao || "").trim()
    }))
    .sort((a, b) => a.id - b.id);
}

function substituirProdutos(novosProdutos) {
  produtosFestival.splice(0, produtosFestival.length, ...normalizarProdutos(novosProdutos));
}

function normalizarCarrinhos(carrinhos) {
  const lista = Array.isArray(carrinhos) ? carrinhos : Object.values(carrinhos || {});
  return [...new Set(lista.map(nome => String(nome || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function substituirCarrinhos(novosCarrinhos) {
  carrinhosFestival.splice(0, carrinhosFestival.length, ...normalizarCarrinhos(novosCarrinhos));
}

function formatarValor(valor) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function formatarPedido(numero) {
  return String(numero || "").replace(/\D/g, "").padStart(2, "0");
}

function nomeProdutoExibicao(nome) {
  return nome === "Agua garrafa 350ml" ? "Água garrafa 350ml" : nome;
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function agoraPedido() {
  const agora = new Date();
  return {
    data: agora.toLocaleDateString("pt-BR"),
    horario: agora.toLocaleTimeString("pt-BR"),
    dataHora: agora.toLocaleString("pt-BR")
  };
}

async function obterJson(path) {
  const resposta = await fetch(firebaseUrl(path));
  if (!resposta.ok) throw new Error(`Falha ao consultar ${path}.`);
  return await resposta.json();
}

async function salvarJson(path, dados, metodo = "PUT") {
  const resposta = await fetch(firebaseUrl(path), {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error(`Falha ao salvar ${path}.`);
}

async function excluirJson(path) {
  const resposta = await fetch(firebaseUrl(path), { method: "DELETE" });
  if (!resposta.ok) throw new Error(`Falha ao excluir ${path}.`);
}

async function carregarProdutos(forcar = false) {
  if (produtosCarregados && !forcar) return produtosFestival;
  try {
    const produtosRemotos = await obterJson("config/produtos");
    substituirProdutos(produtosRemotos || PRODUTOS_PADRAO);
  } catch (erro) {
    if (!produtosFestival.length) substituirProdutos(PRODUTOS_PADRAO);
    console.warn("Usando catálogo local porque não foi possível sincronizar.", erro);
  }
  produtosCarregados = true;
  return produtosFestival;
}

async function salvarProdutos(produtos) {
  const normalizados = normalizarProdutos(produtos);
  await salvarJson("config/produtos", normalizados);
  substituirProdutos(normalizados);
  produtosCarregados = true;
  return produtosFestival;
}

async function carregarCarrinhos(forcar = false) {
  if (carrinhosCarregados && !forcar) return carrinhosFestival;
  const carrinhosDosProdutos = produtosFestival.map(produto => produto.carrinho);
  try {
    const carrinhosRemotos = await obterJson("config/carrinhos");
    substituirCarrinhos(carrinhosRemotos || [...CARRINHOS_PADRAO, ...carrinhosDosProdutos]);
  } catch (erro) {
    if (!carrinhosFestival.length) substituirCarrinhos([...CARRINHOS_PADRAO, ...carrinhosDosProdutos]);
    console.warn("Usando carrinhos locais porque não foi possível sincronizar.", erro);
  }
  carrinhosCarregados = true;
  return carrinhosFestival;
}

async function salvarCarrinhos(carrinhos) {
  const normalizados = normalizarCarrinhos(carrinhos);
  await salvarJson("config/carrinhos", normalizados);
  substituirCarrinhos(normalizados);
  carrinhosCarregados = true;
  return carrinhosFestival;
}

async function obterSenhas() {
  try {
    const remotas = await obterJson("config/senhas");
    return { ...SENHAS_PADRAO, ...(remotas || {}) };
  } catch {
    return { ...SENHAS_PADRAO };
  }
}

async function salvarSenhas(senhas) {
  const novas = { ...SENHAS_PADRAO, ...(senhas || {}) };
  await salvarJson("config/senhas", novas);
  return novas;
}

async function inicializar() {
  await carregarProdutos();
  await carregarCarrinhos();
  return window.FestivalCore;
}

async function proximoNumeroPedido() {
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const resposta = await fetch(firebaseUrl("controle/ultimoPedido"), {
      headers: { "X-Firebase-ETag": "true" }
    });
    const etag = resposta.headers.get("ETag");
    const atual = await resposta.json() || 0;
    const proximo = Number(atual) + 1;
    const gravacao = await fetch(firebaseUrl("controle/ultimoPedido"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": etag },
      body: JSON.stringify(proximo)
    });
    if (gravacao.ok) return formatarPedido(proximo);
    await new Promise(resolve => setTimeout(resolve, 150 + tentativa * 80));
  }
  throw new Error("Não foi possível gerar um número único de pedido.");
}

async function registrarPedido(carrinho, origem) {
  const numero = await proximoNumeroPedido();
  const momento = agoraPedido();
  const itens = Object.values(carrinho).map(item => ({
    id: item.id,
    nome: item.nome,
    preco: item.preco,
    quantidade: item.quantidade,
    carrinho: item.carrinho,
    statusEntrega: "PENDENTE",
    dataEntrega: "",
    horaEntrega: ""
  }));
  await salvarJson(`pedidos/${numero}`, {
    numero,
    origem,
    dataVenda: momento.data,
    horarioVenda: momento.horario,
    dataHoraVenda: momento.dataHora,
    itens,
    status: "ABERTO"
  });
  return numero;
}

function produtoPorNome(nome) {
  return produtosFestival.find(produto => produto.nome === nome);
}

window.FestivalCore = {
  FIREBASE_BASE_URL,
  PRODUTOS_PADRAO: clonar(PRODUTOS_PADRAO),
  CARRINHOS_PADRAO: [...CARRINHOS_PADRAO],
  SENHAS_PADRAO: { ...SENHAS_PADRAO },
  produtosFestival,
  carrinhosFestival,
  firebaseUrl,
  formatarValor,
  formatarPedido,
  nomeProdutoExibicao,
  escaparHtml,
  agoraPedido,
  obterJson,
  salvarJson,
  excluirJson,
  carregarProdutos,
  salvarProdutos,
  carregarCarrinhos,
  salvarCarrinhos,
  obterSenhas,
  salvarSenhas,
  inicializar,
  registrarPedido,
  produtoPorNome
};

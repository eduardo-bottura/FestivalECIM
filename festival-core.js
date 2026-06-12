const FIREBASE_BASE_URL = "https://festival-ecim-2026-default-rtdb.firebaseio.com";

const produtosFestival = [
  { id: 1, nome: "Espeto", preco: 10.00, img: "OIP.webp", categoriaTela: "rapidos", carrinho: "Espetos" },
  { id: 2, nome: "Salgado", preco: 8.00, img: "istockphoto-1092130320-170667a.jpg", categoriaTela: "rapidos", carrinho: "Salgados" },
  { id: 3, nome: "Lanche", preco: 25.00, img: "ham.jpg", categoriaTela: "rapidos", carrinho: "Lanches" },
  { id: 4, nome: "Caldo", preco: 20.00, img: "caldo.jpg", categoriaTela: "rapidos", carrinho: "Salgados" },
  { id: 5, nome: "Massa", preco: 30.00, img: "358841.jpg", categoriaTela: "rapidos", carrinho: "Massas" },
  { id: 6, nome: "Doce", preco: 8.00, img: "OIP (1).webp", categoriaTela: "rapidos", carrinho: "Doces" },
  { id: 7, nome: "Cerveja lata", preco: 7.00, img: "cervejas-lata.png", categoriaTela: "bebidas", carrinho: "Bebidas" },
  { id: 8, nome: "Refrigerante lata", preco: 6.00, img: "refri_latas.jpg", categoriaTela: "bebidas", carrinho: "Bebidas" },
  { id: 9, nome: "Agua garrafa 350ml", preco: 5.00, img: "Garrafa-Agua-Mineral-500-ml-pacote-12-unidades-600x600.jpg", categoriaTela: "bebidas", carrinho: "Bebidas" },
  { id: 10, nome: "Mesa", preco: 35.00, img: "OIP.jpg", categoriaTela: "pratos", carrinho: "Mesas" }
];

function firebaseUrl(path) {
  return `${FIREBASE_BASE_URL}/${path}.json`;
}

function formatarValor(valor) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function formatarPedido(numero) {
  return String(numero || "").replace(/\D/g, "").padStart(2, "0");
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
  return await resposta.json();
}

async function salvarJson(path, dados, metodo = "PUT") {
  await fetch(firebaseUrl(path), {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
}

async function excluirJson(path) {
  await fetch(firebaseUrl(path), { method: "DELETE" });
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
      headers: {
        "Content-Type": "application/json",
        "If-Match": etag
      },
      body: JSON.stringify(proximo)
    });

    if (gravacao.ok) return formatarPedido(proximo);
    await new Promise(resolve => setTimeout(resolve, 150 + tentativa * 80));
  }
  throw new Error("Nao foi possivel gerar um numero unico de pedido.");
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
  produtosFestival,
  firebaseUrl,
  formatarValor,
  formatarPedido,
  agoraPedido,
  obterJson,
  salvarJson,
  excluirJson,
  registrarPedido,
  produtoPorNome
};

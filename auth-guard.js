(function () {
  const config = window.FESTIVAL_AUTH || {};
  const escopo = config.scope || "pagina";
  const chaveSessao = `festival-auth-${escopo}`;
  const firebaseBase = "https://festival-ecim-2026-default-rtdb.firebaseio.com";

  document.documentElement.style.visibility = "hidden";

  window.FESTIVAL_AUTH_READY = new Promise(resolve => {
    function tokenSenha(senha) {
      let hash = 2166136261;
      for (const caractere of String(senha)) {
        hash ^= caractere.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      return `v1-${(hash >>> 0).toString(16)}`;
    }

    async function senhaEsperada() {
      try {
        const resposta = await fetch(`${firebaseBase}/config/senhas/${escopo}.json`);
        const senha = await resposta.json();
        return senha || config.password || "";
      } catch {
        return config.password || "";
      }
    }

    function liberar() {
      window.FESTIVAL_AUTH_OK = true;
      document.documentElement.style.visibility = "visible";
      resolve(true);
    }

    async function iniciar() {
      if (!config.password && !config.scope) {
        liberar();
        return;
      }
      const senhaCorreta = await senhaEsperada();
      if (sessionStorage.getItem(chaveSessao) === tokenSenha(senhaCorreta)) {
        liberar();
        return;
      }

      document.documentElement.style.visibility = "visible";
      document.body.innerHTML = `
        <main class="fixed inset-0 z-[100] bg-gray-100 flex items-center justify-center p-4 font-sans">
          <form id="festivalLogin" class="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-8">
            <h1 class="text-3xl font-black mb-2">Acesso protegido</h1>
            <p class="text-gray-600 font-semibold mb-5">${config.message || "Digite a senha de acesso:"}</p>
            <input id="festivalSenha" type="password" autocomplete="current-password" required
              class="w-full border-2 rounded-xl p-3 text-lg" placeholder="Senha">
            <p id="festivalErro" class="hidden text-red-700 font-bold mt-3">Senha incorreta. Tente novamente.</p>
            <button class="w-full bg-black text-white font-black rounded-xl p-3 mt-5">Entrar</button>
          </form>
        </main>`;

      const campo = document.getElementById("festivalSenha");
      campo.focus();
      document.getElementById("festivalLogin").addEventListener("submit", evento => {
        evento.preventDefault();
        if (campo.value === senhaCorreta) {
          sessionStorage.setItem(chaveSessao, tokenSenha(senhaCorreta));
          window.location.reload();
          return;
        }
        document.getElementById("festivalErro").classList.remove("hidden");
        campo.select();
      });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
      iniciar();
    }
  });
})();

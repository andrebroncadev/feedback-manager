(() => {
  "use strict";
  const SUPABASE_URL = "https://vqenzubwfzwwndgjucim.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_s4o-wW-rdUbEesSKe6NhNg_u7gzYeCf";
  const AUTHORIZED_EMAIL = "andrebronca60@gmail.com";
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const status = document.getElementById("feedbackAuthStatus");
  const form = document.getElementById("feedbackLoginForm");
  const loginButton = document.getElementById("feedbackLoginButton");
  let resolveAuth;
  window.feedbackAuthReady = new Promise(resolve => { resolveAuth = resolve; });
  window.feedbackSession = null;

  function message(text, type = "") {
    if (!status) return;
    status.textContent = text;
    status.className = "auth-feedback" + (type ? " " + type : "");
  }
  function acceptSession(session) {
    if (!session?.user || String(session.user.email || "").toLowerCase() !== AUTHORIZED_EMAIL) return false;
    window.feedbackSession = session;
    document.body.classList.add("authenticated");
    const authScreen = document.getElementById("feedbackAuthScreen");
    if (authScreen) {
      authScreen.style.display = "none";
      authScreen.setAttribute("aria-hidden", "true");
    }
    message("");
    resolveAuth(session);
    return true;
  }
  if (!client) {
    message("Não foi possível carregar o serviço de login. Atualize a página.");
    return;
  }

  client.auth.getSession().then(async ({ data, error }) => {
    if (error) message("Não foi possível verificar a sessão. Atualize a página.", "error");
    if (data?.session && !acceptSession(data.session)) {
      await client.auth.signOut();
      message("Esta conta não tem permissão para acessar o Feedback Maker.", "error");
    }
  });
  client.auth.onAuthStateChange((event, session) => {
    if (session && acceptSession(session)) return;
    const wasAuthenticated = document.body.classList.contains("authenticated");
    window.feedbackSession = null;
    document.body.classList.remove("authenticated");
    if (event === "SIGNED_OUT" && wasAuthenticated) window.location.reload();
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const email = document.getElementById("feedbackLoginEmail").value.trim();
    const password = document.getElementById("feedbackLoginPassword").value;
    if (!email || !password) return message("Informe o e-mail e a senha.", "error");
    loginButton.disabled = true;
    loginButton.textContent = "Entrando…";
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        const reason = error.message || error.code || "erro desconhecido";
        message("Falha no login: " + reason, "error");
      } else if (!data?.session?.user) {
        message("O Supabase aceitou a solicitação, mas não retornou uma sessão. Tente atualizar a página.", "error");
      } else if (!acceptSession(data.session)) {
        const accountEmail = data.session.user.email || "(e-mail não retornado)";
        await client.auth.signOut();
        message("Login válido, mas sem autorização para este app. Conta autenticada: " + accountEmail, "error");
      }
    } catch (err) {
      message("Erro ao tentar entrar: " + (err?.message || String(err)), "error");
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Entrar <span aria-hidden="true">→</span>';
    }
  });

  document.getElementById("feedbackForgotPassword")?.addEventListener("click", async () => {
    const email = document.getElementById("feedbackLoginEmail").value.trim();
    if (!email) return message("Digite seu e-mail acima primeiro.", "error");
    const button = document.getElementById("feedbackForgotPassword");
    button.disabled = true;
    message("Enviando instruções de recuperação…");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    button.disabled = false;
    message(error ? "Não foi possível enviar a recuperação. Confira o e-mail e tente novamente." : "Se houver uma conta para esse e-mail, você receberá instruções para redefinir a senha.", error ? "error" : "success");
  });

  document.getElementById("feedbackLogout")?.addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) message("Não foi possível encerrar a sessão. Tente novamente.", "error");
  });
})();
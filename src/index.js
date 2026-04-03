export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/login-test") {
      return new Response(
        "CLIENT_ID=" + env.GITHUB_CLIENT_ID,
        {
          headers: {
            "Content-Type": "text/plain; charset=UTF-8"
          }
        }
      );
    }

    if (url.pathname === "/login") {
      const loginUrl =
        "https://github.com/login/oauth/authorize?client_id=" +
        encodeURIComponent(env.GITHUB_CLIENT_ID) +
        "&scope=repo";

      return Response.redirect(loginUrl, 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response("Missing code", { status: 400 });
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code
        })
      });

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return new Response(
          "GitHub token exchange failed: " + JSON.stringify(tokenData, null, 2),
          {
            status: 401,
            headers: {
              "Content-Type": "text/plain; charset=UTF-8"
            }
          }
      );
    }

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "pkxd-auth-worker",
          "Accept": "application/vnd.github+json"
        }
      });

      const user = await userRes.json();

      if (user.login !== env.ALLOWED_GITHUB_LOGIN) {
        return new Response("Нет доступа", { status: 403 });
      }

      return new Response(
        `
        <!doctype html>
        <html lang="ru">
          <head>
            <meta charset="UTF-8" />
            <title>Авторизация...</title>
          </head>
          <body>
            <script>
              localStorage.setItem("gh_token", ${JSON.stringify(accessToken)});
              localStorage.setItem("gh_login", ${JSON.stringify(user.login || "")});
              window.location.href = "https://pkxdportal.github.io/pkxd-portal-posts/";
            </script>
          </body>
        </html>
        `,
        {
          headers: {
            "Content-Type": "text/html; charset=UTF-8"
          }
        }
      );
    }

    return new Response("Auth worker работает");
  }
};

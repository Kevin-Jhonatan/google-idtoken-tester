(() => {
  "use strict";

  const origin = window.location.origin;
  const isFile = window.location.protocol === "file:";

  const elements = {
    form: document.getElementById("client-form"),
    input: document.getElementById("client-id"),
    error: document.getElementById("client-error"),
    signin: document.getElementById("signin-card"),
    audience: document.getElementById("aud-pill"),
    googleButton: document.getElementById("gsi-button"),
    status: document.getElementById("status"),
    reset: document.getElementById("reset"),
    tokenCard: document.getElementById("token-card"),
    token: document.getElementById("token"),
    expiry: document.getElementById("expiry"),
    copyToken: document.getElementById("copy-token"),
    downloadToken: document.getElementById("download-token"),
    claimsCard: document.getElementById("claims-card"),
    claims: document.getElementById("claims"),
    rawClaims: document.getElementById("raw-claims"),
    origin: document.getElementById("origin"),
    originSecondary: document.getElementById("origin-2"),
    copyOrigin: document.getElementById("copy-origin"),
    copyOriginSecondary: document.getElementById("copy-origin-2"),
    fileWarning: document.getElementById("file-warning"),
  };

  let currentClientId = "";

  const setOrigin = () => {
    const text = isFile ? "file:// (no permitido por Google)" : origin;

    elements.origin.textContent = text;
    elements.originSecondary.textContent = text;
  };

  const setStatus = (message, type = "info") => {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
  };

  const setClientError = (message) => {
    elements.error.textContent = message;
    elements.error.hidden = !message;
  };

  const isValidClientId = (value) =>
    /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value);

  const decodeJwt = (token) => {
    const encodedPayload = token
      .split(".")[1]
      ?.replace(/-/g, "+")
      .replace(/_/g, "/");

    if (!encodedPayload) {
      throw new Error("Token inválido");
    }

    const paddedPayload = encodedPayload.padEnd(
      Math.ceil(encodedPayload.length / 4) * 4,
      "=",
    );

    const bytes = Uint8Array.from(atob(paddedPayload), (character) =>
      character.charCodeAt(0),
    );

    return JSON.parse(new TextDecoder().decode(bytes));
  };

  const formatDate = (unixSeconds) =>
    new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(unixSeconds * 1000));

  const renderClaims = (payload) => {
    const rows = [
      ["Email", payload.email],
      ["Nombre", payload.name ?? payload.given_name],
      ["Subject", payload.sub],
      ["Audience", payload.aud],
      ["Issuer", payload.iss],
      ["Expira", payload.exp ? formatDate(payload.exp) : "—"],
    ];

    elements.claims.replaceChildren(
      ...rows.map(([label, value]) => {
        const item = document.createElement("div");
        item.className = "claim";

        const labelElement = document.createElement("span");
        labelElement.className = "claim-label";
        labelElement.textContent = label;

        const valueElement = document.createElement("span");
        valueElement.className = "claim-value";
        valueElement.textContent = value || "—";

        item.append(labelElement, valueElement);

        return item;
      }),
    );

    elements.rawClaims.textContent = JSON.stringify(payload, null, 2);
    elements.claimsCard.hidden = false;
  };

  const setExpiry = (payload) => {
    if (!payload.exp) {
      elements.expiry.textContent = "Sin exp";
      elements.expiry.className = "pill";
      return;
    }

    const remainingMs = payload.exp * 1000 - Date.now();
    const minutes = Math.max(0, Math.round(remainingMs / 60000));

    elements.expiry.textContent =
      remainingMs <= 0 ? "Expirado" : `Expira en ${minutes} min`;

    elements.expiry.className = remainingMs <= 0 ? "pill bad" : "pill ok";
  };

  const onCredential = (response) => {
    const token = response?.credential;

    if (!token) {
      setStatus("Google no devolvió un idToken.", "bad");
      return;
    }

    elements.token.value = token;
    elements.tokenCard.hidden = false;

    try {
      const payload = decodeJwt(token);

      renderClaims(payload);
      setExpiry(payload);

      const audienceMatches = payload.aud === currentClientId;

      setStatus(
        audienceMatches
          ? "Token generado correctamente. El audience coincide."
          : "El audience del token no coincide con el Client ID.",
        audienceMatches ? "ok" : "bad",
      );
    } catch {
      setStatus("El token se generó, pero no se pudo decodificar.", "bad");
    }
  };

  const renderGoogleButton = (clientId) => {
    elements.googleButton.replaceChildren();
    elements.signin.hidden = false;

    elements.audience.textContent = "Client ID cargado";
    elements.audience.className = "pill ok";

    if (!window.google?.accounts?.id) {
      setStatus(
        "No se pudo cargar Google Identity Services. Revisa tu conexión o un bloqueador.",
        "bad",
      );
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: onCredential,
      });

      window.google.accounts.id.renderButton(elements.googleButton, {
        type: "standard",
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "filled_black"
          : "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        logo_alignment: "left",
        locale: "es",
      });

      setStatus("Elige una cuenta de Google para generar el token.", "info");
    } catch {
      setStatus(
        "El Client ID no es válido o no está configurado para este origen.",
        "bad",
      );
    }
  };

  const loadClientId = (value) => {
    const clientId = value.trim();

    if (!isValidClientId(clientId)) {
      setClientError(
        "Ingresa un Client ID válido de Google OAuth para aplicaciones web.",
      );
      return;
    }

    setClientError("");
    currentClientId = clientId;

    renderGoogleButton(clientId);
  };

  const copyText = async (value, successMessage) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(successMessage, "ok");
    } catch {
      setStatus(
        "No se pudo copiar. Selecciona el texto y cópialo manualmente.",
        "bad",
      );
    }
  };

  const downloadToken = () => {
    if (!elements.token.value) return;

    const blob = new Blob([elements.token.value], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "google-id-token.txt";
    link.click();

    URL.revokeObjectURL(url);
  };

  const reset = () => {
    currentClientId = "";

    elements.input.value = "";
    elements.token.value = "";
    elements.expiry.textContent = "";
    elements.claims.replaceChildren();
    elements.rawClaims.textContent = "";

    elements.signin.hidden = true;
    elements.tokenCard.hidden = true;
    elements.claimsCard.hidden = true;

    elements.googleButton.replaceChildren();

    elements.audience.textContent = "";
    elements.audience.className = "pill";

    setClientError("");
    setStatus("", "info");
  };

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadClientId(elements.input.value);
  });

  elements.reset.addEventListener("click", reset);

  elements.copyToken.addEventListener("click", () =>
    copyText(elements.token.value, "idToken copiado."),
  );

  elements.downloadToken.addEventListener("click", downloadToken);

  elements.copyOrigin.addEventListener("click", () =>
    copyText(elements.origin.textContent, "Origen copiado."),
  );

  elements.copyOriginSecondary.addEventListener("click", () =>
    copyText(elements.originSecondary.textContent, "Origen copiado."),
  );

  setOrigin();
  elements.fileWarning.hidden = !isFile;
})();

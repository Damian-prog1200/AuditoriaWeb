// JS/procesodatos.js
function setSubmitButtonDisabled(disabled) {
  try {
    const submitBtn = document.getElementById("btnEnviar");
    if (submitBtn) submitBtn.disabled = disabled;
  } catch (e) { /* noop */ }
}confirm
function mostrarCargando() {
  const o = document.getElementById("overlayCargando");
  if (o) o.style.display = "flex";
}

function ocultarCargando() {
  const o = document.getElementById("overlayCargando");
  if (o) o.style.display = "none";
}

// Mostrar aviso (solo Aceptar)
function mostrarAviso(mensaje) {
  return new Promise(resolve => {
    const overlay = document.getElementById("modalConfirmacion");
    const mensajeEl = document.getElementById("modalMensaje");
    const titulo = document.getElementById("tituloModal");
    const btnAceptar = document.getElementById("btnAceptarModal");
    const btnCancelar = document.getElementById("btnCancelarModal");

    titulo.textContent = "Aviso";
    mensajeEl.textContent = mensaje;

    // ocultar cancelar
    btnCancelar.style.display = "none";

    // bloquear el botón enviar por seguridad
    setSubmitButtonDisabled(true);

    // Key handler que captura Enter y Escape
    const keyHandler = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        ev.stopPropagation();
        aceptarHandler();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        // en avisos Escape equivale a aceptar
        aceptarHandler();
      }
    };

    const cerrar = () => {
      overlay.style.display = "none";
      btnAceptar.removeEventListener("click", aceptarHandler);
      document.removeEventListener("keydown", keyHandler, true);
      setSubmitButtonDisabled(false);
      resolve(true);
    };

    const aceptarHandler = () => cerrar();

    btnAceptar.addEventListener("click", aceptarHandler);
    document.addEventListener("keydown", keyHandler, true);

    // mostrar y foco en aceptar
    overlay.style.display = "flex";
    setTimeout(() => { try { btnAceptar.focus(); } catch (e) { } }, 10);
  });
}

// Mostrar confirmación (Aceptar + Cancelar)
function mostrarConfirmacion(mensaje) {
  return new Promise(resolve => {
    const overlay = document.getElementById("modalConfirmacion");
    const mensajeEl = document.getElementById("modalMensaje");
    const titulo = document.getElementById("tituloModal");
    const btnAceptar = document.getElementById("btnAceptarModal");
    const btnCancelar = document.getElementById("btnCancelarModal");

    titulo.textContent = "Confirmación";
    mensajeEl.textContent = mensaje;

    btnCancelar.style.display = "inline-block";

    // bloquear el botón enviar por seguridad
    setSubmitButtonDisabled(true);

    // Key handler: Enter -> aceptar, Escape -> cancelar
    const keyHandler = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        ev.stopPropagation();
        aceptarHandler();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        cancelarHandler();
      }
    };

    const cerrar = (valor) => {
      overlay.style.display = "none";
      btnAceptar.removeEventListener("click", aceptarHandler);
      btnCancelar.removeEventListener("click", cancelarHandler);
      document.removeEventListener("keydown", keyHandler, true);
      setSubmitButtonDisabled(false);
      resolve(valor);
    };

    const aceptarHandler = () => cerrar(true);
    const cancelarHandler = () => cerrar(false);

    btnAceptar.addEventListener("click", aceptarHandler);
    btnCancelar.addEventListener("click", cancelarHandler);
    document.addEventListener("keydown", keyHandler, true);

    overlay.style.display = "flex";
    setTimeout(() => { try { btnAceptar.focus(); } catch (e) { } }, 10);
  });
}
function setSubmitButtonDisabled(disabled) {
  try {
    const submitBtn = document.getElementById("btnEnviar");
    if (submitBtn) submitBtn.disabled = disabled;
  } catch (e) { /* noop */ }
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  let idSolicitud = params.get("idSolicitud") || params.get("id");

  if (!idSolicitud) {
    //const idGuardado = localStorage.getItem("solicitudEnProceso");
    if (idGuardado) {
      idSolicitud = idGuardado;
      console.log("🧩 Recuperando solicitud en proceso desde localStorage:", idSolicitud);
    }
  }

  if (!idSolicitud) {
    mostrarAviso("⚠️ No hay ninguna solicitud en proceso o pausada. Redirigiendo...");
    window.location.href = "aprobadas.html";
    return;
  }

  console.log("🧩 ID de solicitud detectado:", idSolicitud);
  localStorage.setItem("solicitudEnProceso", String(idSolicitud));

  // === BOTONES ===
  const btnTerminar = document.querySelector(".accept");
  const btnPausar = document.querySelector(".reject");
  const btnTrabajar = document.querySelector(".start"); // 🆕 botón "Trabajar"
  const inputObs = document.getElementById("observaciones"); // 🆕 campo observaciones opcional

  mostrarPDF();

  // === Mostrar el PDF asociado a la solicitud ===
  async function mostrarPDF() {
    try {
      console.log("🧩 Solicitando PDF para id:", idSolicitud);

      const res = await fetch(`PHP/Solicitud/obtenerSolicitud.php?id=${encodeURIComponent(idSolicitud)}`, {
        credentials: "include",
        cache: "no-store"
      });

      if (!res.ok) throw new Error("Error HTTP al obtener solicitud");

      const data = await res.json();
      if (!data || !data.success || !data.solicitud) {
        console.error("Respuesta JSON inválida:", data);
        mostrarAviso("No se pudo cargar el PDF de la solicitud.");
        return;
      }

      const s = data.solicitud;
      console.log("📄 Nombre del PDF:", s.nombrePDF);

      const pdfData = extractPdfBase64Field(s.archivo || s.archivoPDF || s.pdfBase64 || "");
      if (!pdfData) {
        console.warn("⚠️ No se pudo extraer el PDF correctamente");
        mostrarAviso("El archivo PDF no es válido o está vacío.");
        return;
      }

      const blobUrl = createPdfBlobUrlFromExtracted(pdfData);
      if (!blobUrl) {
        console.error("❌ No se pudo crear blob URL del PDF");
        mostrarAviso("Error al procesar el archivo PDF.");
        return;
      }

      const visor = document.getElementById("visorPDF");
      if (visor) visor.src = blobUrl;
      else window.open(blobUrl, "_blank");

      window.addEventListener("unload", () => {
        try { URL.revokeObjectURL(blobUrl); } catch (_) { }
      });

    } catch (err) {
      console.error("Error mostrando el PDF:", err);
      mostrarAviso("Error al cargar el PDF de la solicitud.");
    }
  }

  // === Funciones auxiliares ===
  function extractPdfBase64Field(value) {
    if (!value) return null;

    if (value.includes("data:application/pdf;base64,")) {
      const payload = value.split("data:application/pdf;base64,")[1];
      try {
        const decoded = atob(payload);
        if (decoded.startsWith("data:application/pdf;base64,")) {
          return { type: "base64payload", payload: decoded.split("data:application/pdf;base64,")[1] };
        }
      } catch { }
      return { type: "base64payload", payload };
    }

    try {
      const decoded = atob(value);
      if (decoded.startsWith("data:application/pdf;base64,")) {
        return { type: "base64payload", payload: decoded.split("data:application/pdf;base64,")[1] };
      }
      if (decoded.startsWith("%PDF")) {
        return { type: "rawBinary", binaryString: decoded };
      }
    } catch { }
    if (/^[A-Za-z0-9+/=\s]+$/.test(value)) {
      return { type: "base64payload", payload: value };
    }
    return null;
  }

  function createPdfBlobUrlFromExtracted(info) {
    if (!info) return null;
    try {
      if (info.type === "rawBinary") {
        const bin = info.binaryString;
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return URL.createObjectURL(new Blob([arr], { type: "application/pdf" }));
      }
      if (info.type === "base64payload") {
        const bytes = atob(info.payload.replace(/\s/g, ""));
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        return URL.createObjectURL(new Blob([arr], { type: "application/pdf" }));
      }
    } catch (err) {
      console.error("createPdfBlobUrlFromExtracted error:", err);
    }
    return null;
  }

  // === Actualiza estado en la tabla Solicitud (ya existente) ===
  async function actualizarEstado(estado) {
    try {
      mostrarCargando();
      const res = await fetch("PHP/Solicitud/actualizarEstado.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idSolicitud, estado }),
      });

      const data = await res.json();

      if (data.success) {
        ocultarCargando();
        mostrarAviso(`✅ Solicitud marcada como "${estado}".`);

        if (estado === "Entregada" || estado === "Pausada") {
          localStorage.removeItem("solicitudEnProceso");
        }

        window.location.href = "panel-auditor.html";
      } else {
        mostrarAviso("❌ Error al actualizar estado: " + (data.message || "Desconocido"));
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      mostrarAviso("Error de conexión con el servidor.");
    }
  }

  // === 🆕 Crear registro de proceso de producción ===
  async function crearProcesoProduccion() {
    const overlay = document.getElementById("overlayCargando");
    try {
      if (overlay) overlay.style.display = "flex";
      console.log("➡️ Enviando a crearProceso.php ID:", idSolicitud);
      const res = await fetch("PHP/Produccion/crearProceso.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `idSolicitud=${encodeURIComponent(idSolicitud)}`
      });

      const data = await res.json();

      if (data.success) {
        console.log("✅ Proceso de producción creado.");
        localStorage.setItem("solicitudEnProceso", String(idSolicitud));
      } else {
        console.warn("⚠️ No se pudo crear proceso:", data.message);
      }
    } catch (err) {
      console.error("Error creando proceso:", err);
    }
  }




  // === 🆕 Actualizar estado del proceso (pausar o entregar) ===
  // === Actualizar estado del proceso (JSON) ===
  async function actualizarEstadoProceso(idSolicitud, estado) {
    try {
      mostrarCargando();
      const res = await fetch("PHP/Produccion/actualizarEstado.php", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idSolicitud: idSolicitud,
          estado: estado
        })
      });

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("❌ Respuesta no válida del servidor:", text);
        mostrarAviso("Error: Respuesta inválida del servidor al actualizar estado del proceso.");
        return;
      }

      if (data.success) {
        ocultarCargando();
        console.log(`🔄 Estado del proceso actualizado a '${estado}'`);
      } else {
        console.error("❌ Error al actualizar proceso:", data.message);
        mostrarAviso("No se pudo actualizar el estado del proceso.");
      }

    } catch (err) {
      console.error("❌ Error en actualizarEstadoProceso:", err);
      mostrarAviso("Error de conexión con el servidor.");
    }
  }

  if (btnTerminar) {
    btnTerminar.addEventListener("click", async () => {
      await actualizarEstadoProceso(idSolicitud, "Terminada"); // Sincroniza tabla procesos_produccion
    });
  }

  if (btnPausar) {
    btnPausar.addEventListener("click", async () => {
      await actualizarEstadoProceso(idSolicitud, "Pausada");
    });
  }

  if (btnTrabajar) {
    btnTrabajar.addEventListener("click", async () => {
      await crearProcesoProduccion();             // crea proceso_produccion
      await actualizarEstadoProceso(idSolicitud, "En proceso");
      await actualizarEstado("En proceso");       // actualiza la solicitud
    });
  }

});

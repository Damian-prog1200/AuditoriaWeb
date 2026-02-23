// JS/AnalisisSolicitud/listarSolicitudes.js
// Helpers: deshabilitar/rehabilitar botón enviar principal (si existe)
function mostrarCargando() {
  const o = document.getElementById("overlayCargando");
  if (o) o.style.display = "flex";
}

function ocultarCargando() {
  const o = document.getElementById("overlayCargando");
  if (o) o.style.display = "none";
}

function setSubmitButtonDisabled(disabled) {
  try {
    const submitBtn = document.getElementById("btnEnviar");
    if (submitBtn) submitBtn.disabled = disabled;
  } catch (e) { /* noop */ }
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
    setTimeout(() => { try { btnAceptar.focus(); } catch (e) {} }, 10);
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
    setTimeout(() => { try { btnAceptar.focus(); } catch (e) {} }, 10);
  });
}



// === Overlay de carga (envío/cancelación) ===
let overlayTimer = null;
function ensureLoadingOverlay() {
  let el = document.getElementById('overlayCargando');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'overlayCargando';
  el.innerHTML = `
    <div class="box">
      <div class="spinner" aria-hidden="true"></div>
      <div class="text">Procesando...</div>
    </div>`;
  document.body.appendChild(el);
  return el;
}

function showLoading(message = "Procesando...") {
  const el = ensureLoadingOverlay();
  el.querySelector(".text").textContent = message;
  el.style.display = "flex";
}

function hideLoading() {
  const el = document.getElementById("overlayCargando");
  if (el) el.style.display = "none";
  if (overlayTimer) {
    clearInterval(overlayTimer);
    overlayTimer = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tablaCliente");

  const accionesOriginales = new Map();

  // contenedor overlay reutilizable
  let overlay = document.getElementById("overlayMessage");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "overlayMessage";
    overlay.style.display = "none";
    document.body.appendChild(overlay);
  }

  async function cargarSolicitudesCliente() {
    try {
      const res = await fetch("PHP/Solicitud/consultarSolicitudes.php", { credentials: "include" });
      if (!res.ok) throw new Error("Error en la petición");
      const data = await res.json();
      if (!data.success) {
        console.warn("No pudo obtener solicitudes:", data.msg);
        tabla.innerHTML = "<tr><td colspan='4'>No se encontraron solicitudes</td></tr>";
        return;
      }

      const solicitudes = data.solicitudes || [];
      tabla.innerHTML = "";

      solicitudes.forEach(solicitud => {
        const tr = document.createElement("tr");
        tr.dataset.id = solicitud.idSolicitud;

        tr.innerHTML = `
          <td>${escapeHtml(solicitud.idSolicitud)}</td>
          <td>${escapeHtml(solicitud.tipoServicio || "")}</td>
          <td>${escapeHtml(solicitud.estado || "")}</td>
          <td class="acciones-td">
            ${getAccionesHtml(solicitud)}
          </td>
        `;

        tabla.appendChild(tr);
        accionesOriginales.set(String(solicitud.idSolicitud), tr.querySelector(".acciones-td").innerHTML);
        attachHandlersToRow(tr, solicitud);
      });
    } catch (err) {
      console.error("Error al listar solicitudes del cliente:", err);
      tabla.innerHTML = "<tr><td colspan='4'>Error al cargar solicitudes (ver consola)</td></tr>";
    }
  }

  // === Helpers overlay Cargando ===
  function ensureLoadingOverlay() {
    let el = document.getElementById('overlayCargando');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'overlayCargando';
    el.innerHTML = `
    <div class="box">
      <div class="spinner" aria-hidden="true"></div>
      <div class="text">Enviando solicitud…</div>
    </div>
  `;
    document.body.appendChild(el);
    return el;
  }

  function showLoading(message = 'Enviando solicitud…') {
    const el = ensureLoadingOverlay();
    const text = el.querySelector('.text');
    if (text) text.textContent = message;
    el.style.display = 'flex';
  }

  function hideLoading() {
    const el = document.getElementById('overlayCargando');
    if (el) el.style.display = 'none';
  }


  function getAccionesHtml(solicitud) {
    const estado = (solicitud.estado || "").toLowerCase();

    // helper id compat
    const id = String(solicitud.idSolicitud ?? solicitud.id ?? "");

    // Aprobada: ver detalles + punto de notificación si no visto
    if (estado === "aprobada") {
      const seenKey = `notif_seen_${id}`;
      const seen = localStorage.getItem(seenKey) === "1";
      const dotHtml = seen ? "" : `<span class="notif-dot" style="display:inline-block;width:10px;height:10px;background:green;border-radius:50%;margin-right:6px;"></span>`;
      return `<div style="display:flex;gap:6px;justify-content:center;"><button class="accion ver-detalles" data-id="${escapeHtml(id)}">${dotHtml}Ver detalles</button></div>`;
    }

    // En proceso: mensaje informativo + Ver detalles
    if (estado === "en proceso") {
      const seenKey = `notif_seen_${id}_${estado}`;
      const seen = localStorage.getItem(seenKey) === "1";
      const dotHtml = seen ? "" : `<span class="notif-dot" style="display:inline-block;width:10px;height:10px;background:green;border-radius:50%;margin-right:6px;"></span>`;
      return `
  <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
    <div><button class="accion ver-detalles" data-id="${escapeHtml(id)}">${dotHtml}Ver detalles</button></div>
  </div>`;
    }

    if (estado === "terminada") {
      const seenKey = `notif_seen_${id}_${estado}`;
      const seen = localStorage.getItem(seenKey) === "1";
      const dotHtml = seen ? "" : `<span class="notif-dot" style="display:inline-block;width:10px;height:10px;background:green;border-radius:50%;margin-right:6px;"></span>`;
      return `
  <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
    <div><button class="accion ver-detalles" data-id="${escapeHtml(id)}">${dotHtml}Ver detalles</button></div>
  </div>`;
    }


    // Pausada: mensaje informativo + Ver detalles
    if (estado === "pausada") {
      const seenKey = `notif_seen_${id}_${estado}`;
      const seen = localStorage.getItem(seenKey) === "1";
      const dotHtml = seen ? "" : `<span class="notif-dot" style="display:inline-block;width:10px;height:10px;background:green;border-radius:50%;margin-right:6px;"></span>`;
      return `
      <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
        <div><button class="accion ver-detalles" data-id="${escapeHtml(id)}">Ver detalles</button></div>
      </div>`;
    }
    

    // Entregada: mensaje informativo + Ver detalles
    if (estado === "entregada" || estado === "entregada") {
      const seenKey = `notif_seen_${id}_${estado}`;
      const seen = localStorage.getItem(seenKey) === "1";
      const dotHtml = seen ? "" : `<span class="notif-dot" style="display:inline-block;width:10px;height:10px;background:green;border-radius:50%;margin-right:6px;"></span>`;
      return `
      <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
        <div><button class="accion ver-detalles" data-id="${escapeHtml(id)}">Ver detalles</button></div>
      </div>`;
    }

    // Pendiente
    if (estado === "pendiente") {
      return `<div style="display:flex;justify-content:center;"><button class="accion2 cancelar-envio" data-id="${escapeHtml(id)}">Cancelar envío</button></div>`;
    }

    // Rechazada
    if (estado === "rechazada") {
      const seenKey = `notif_seen_${id}_${estado}`;
      const seen = localStorage.getItem(seenKey) === "1";
      const dotHtml = seen ? "" : `<span class="notif-dot" style="display:inline-block;width:10px;height:10px;background:green;border-radius:50%;margin-right:6px;"></span>`;
      return `
      <div style="display:flex;gap:6px;justify-content:center;">
        <button class="accion ver-detalles" data-id="${escapeHtml(id)}">Ver detalles</button>
        <button class="accion1 eliminar" data-id="${escapeHtml(id)}">Eliminar</button>
      </div>`;
    }

    // Default (borrador u otros) -> Editar / Eliminar / Enviar
    return `
    <div style="display:flex;gap:6px;justify-content:center;">
      <button class="accion editar" data-id="${escapeHtml(id)}">Editar</button>
      <button class="accion1 eliminar" data-id="${escapeHtml(id)}">Eliminar</button>
      <button class="accion2 enviar" data-id="${escapeHtml(id)}">Enviar</button>
    </div>`;
  }


  function attachHandlersToRow(tr, solicitud) {
    const id = solicitud.idSolicitud;
    const td = tr.querySelector(".acciones-td");

    td.addEventListener("click", async (ev) => {
      const target = ev.target;
      // comprobar botones por clases y data-id
      if (target.matches(".editar")) {
        // redirección corregida a editarSolicitud.html
        window.location.href = `editarSolicitud.html?id=${encodeURIComponent(id)}`;
      } else if (target.matches(".eliminar")) {

        const confirmar = await mostrarConfirmacion("¿Eliminar esta solicitud?");
        if (!confirmar) return;

        try {
          const res = await fetch("PHP/Solicitud/eliminarSolicitud.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idSolicitud: id }),
            credentials: "include"
          });
          const d = await res.json();
          if (d.success) {
            tr.remove();
          } else {
            await mostrarAviso("No se pudo eliminar: " + (d.msg || d.message || "error"));
          }
        } catch (e) {
          console.error(e);
          await mostrarAviso("Error al eliminar (ver consola)");
        }
      } else if (target.matches(".enviar")) {
        const confirmar = await mostrarConfirmacion(
          "¿Deseas enviar esta solicitud para revisión? (se notificará al auditor)"
        );
        if (!confirmar) return;

        showLoading("Enviando solicitud...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000); // 20s máximo

        try {
          const res = await fetch("PHP/Solicitud/enviarSolicitud.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idSolicitud: id }),
            credentials: "include",
            signal: controller.signal
          });

          clearTimeout(timeout);
          if (!res.ok) throw new Error("Error al enviar solicitud");

          const data = await res.json();
          if (data.success) {
            // esperar sincronizado con actualización automática
            overlayTimer = setInterval(async () => {
              await cargarSolicitudesCliente();
              hideLoading();
              clearInterval(overlayTimer);
            }, 3000);
          } else {
            hideLoading();
            await mostrarAviso("No se pudo enviar: " + (data.msg || data.message || "error"));
          }
        } catch (err) {
          hideLoading();
          await mostrarAviso("Error al enviar la solicitud.");
          console.error(err);
        }
      } else if (target.matches(".cancelar-envio")) {
        const confirmar = await mostrarConfirmacion("¿Cancelar el envío de esta solicitud?");
        if (!confirmar) return;

        showLoading("Cancelando envío...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        try {
          const res = await fetch("PHP/Solicitud/cancelarEnvio.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idSolicitud: id }),
            credentials: "include",
            signal: controller.signal
          });

          clearTimeout(timeout);
          if (!res.ok) throw new Error("Error al cancelar envío");

          const data = await res.json();
          if (data.success) {
            overlayTimer = setInterval(async () => {
              await cargarSolicitudesCliente();
              hideLoading();
              clearInterval(overlayTimer);
            }, 3000);
          } else {
            hideLoading();
            await mostrarAviso("No se pudo cancelar el envío: " + (data.msg || data.message || "error"));
          }
        } catch (err) {
          hideLoading();
          await mostrarAviso("Error al cancelar el envío (ver consola).");
          console.error(err);
        }
      }

      else if (target.matches(".ver-detalles") || target.matches(".accion") || target.closest(".ver-detalles")) {
        // mostrar overlay/alert según estado actual -> obtener datos frescos
        verDetalles(id, tr);
      }
    });
  }

  async function verDetalles(id, tr = null) {
    try {
      const res = await fetch(`PHP/Solicitud/obtenerSolicitud.php?id=${encodeURIComponent(id)}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Error al solicitar datos");
      const data = await res.json();
      if (!data.success) {
        await mostrarAviso("No se pueden obtener detalles.");
        return;
      }

      const s = data.solicitud || {};

      // 1) Determinar estado actual
      let estado = "";
      if (s.estado) estado = s.estado;
      else if (s.estadoSolicitud) estado = s.estadoSolicitud;
      else {
        const row = tr || document.querySelector(`tr[data-id="${CSS.escape(String(id))}"]`);
        if (row) {
          const cell = row.cells[2];
          if (cell) estado = cell.textContent.trim();
        }
      }
      estado = String(estado || "").toLowerCase();

      // 2) Manejar según estado
      if (estado === "aprobada") {
        const seenKey = `notif_seen_${id}`;
        if (!localStorage.getItem(seenKey)) localStorage.setItem(seenKey, "1");
        try {
          const btn = tr
            ? tr.querySelector(`button.ver-detalles`)
            : document.querySelector(`button.ver-detalles[data-id="${CSS.escape(String(id))}"]`);
          if (btn) {
            const dot = btn.querySelector(".notif-dot");
            if (dot) dot.remove();
          }
        } catch (e) { }
        showTransientOverlay("aprobada", "La solicitud fue aceptada... esperando para ser trabajada.", 3000);
        return;
      }

      // 3) Si está rechazada -> overlay rechazo
      if (estado === "rechazada") {
        showTransientOverlay("rechazada", "La solicitud fue rechazada, por favor revisa tu correo para más detalles.", 3000);
        return;
      }

      // 4) Si está en proceso / pausada / entregada -> eliminar puntito y mostrar overlay
      if (["en proceso", "pausada", "entregada", "terminada"].includes(estado)) {
        const seenKey = `notif_seen_${id}_${estado}`;
        if (!localStorage.getItem(seenKey)) {
          localStorage.setItem(seenKey, "1");
        }
        const btn = tr?.querySelector(`button.ver-detalles`) || document.querySelector(`button.ver-detalles[data-id="${CSS.escape(String(id))}"]`);
        if (btn) {
          const dot = btn.querySelector(".notif-dot");
          if (dot) dot.remove();
        }

        // Mensajes según estado
        let mensaje = "";
        if (estado === "en proceso") mensaje = "La auditoría está siendo trabajada por el auditor.";
        if (estado === "pausada") mensaje = "El proceso de auditoría está en pausa, revisa tu correo por cualquier duda.";
        if (estado === "entregada") mensaje = "La auditoría fue entrgada, revisa tu correo para ver tu reporte.";
        if (estado === "terminada") mensaje = "La auditoría fue terminada, espera a que se envie tu reporte.";

        showTransientOverlay("aprobada", mensaje, 3000);
        return;
      }


      // 3) Fallback para otros estados
      const tipo = s.tipo || s.tipoServicio || "Desconocido";
      const detalle = s.detalle || "Sin detalle";
      const nombrePDF = s.nombrePDF || s.nombre || "Sin archivo";
      await mostrarAviso(`Solicitud #${id}\n\nTipo: ${tipo}\nDetalle: ${detalle}\nArchivo: ${nombrePDF}`);
    } catch (err) {
      console.error("Error verDetalles:", err);
      await mostrarAviso("Error al obtener detalles.");
    }
  }

  // ---------------- Overlay helpers ----------------
  function showTransientOverlay(tipo, mensaje, duracion = 3000) {
    let overlay = document.getElementById("overlayMessage");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "overlayMessage";
      document.body.appendChild(overlay);
    }

    // Limpia clases anteriores y asigna la del tipo actual
    overlay.className = tipo === "rechazada" ? "rechazada" : "aprobada";

    overlay.innerHTML = `
    <div class="overlay-box" role="dialog" aria-modal="true">
      <p>${mensaje}</p>
    </div>
  `;

    overlay.style.display = "flex";

    const cerrar = () => {
      overlay.style.display = "none";
      overlay.innerHTML = "";
    };

    // Cerrar al hacer clic fuera o tras 3s
    overlay.addEventListener("click", (e) => {
      if (e.target.id === "overlayMessage") cerrar();
    });

    setTimeout(cerrar, duracion);
  }

  // Helper para escapar HTML (evita inyección)
  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  cargarSolicitudesCliente();
  setInterval(cargarSolicitudesCliente, 3000);
});

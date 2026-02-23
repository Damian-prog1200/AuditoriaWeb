// JS/AnalisisSolicitud/analisissolicitud.js

// Helpers: deshabilitar/rehabilitar botón enviar principal (si existe)
function setSubmitButtonDisabled(disabled) {
  try {
    const submitBtn = document.getElementById("btnEnviar");
    if (submitBtn) submitBtn.disabled = disabled;
  } catch (e) { /* noop */ }
}
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

document.addEventListener("DOMContentLoaded", () => {
  const tablaPendientes = document.getElementById("tablaPendientes");

  cargarSolicitudesPendientes();

  async function cargarSolicitudesPendientes() {
    try {
      const res = await fetch("PHP/Solicitud/listarPendientes.php", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();

      if (!data.success) {
        tablaPendientes.innerHTML = `<tr><td colspan="6">No se pudieron cargar las solicitudes: ${data.message || ''}</td></tr>`;
        return;
      }

      const solicitudes = data.solicitudes || [];
      if (solicitudes.length === 0) {
        tablaPendientes.innerHTML = `<tr><td colspan="6">No hay solicitudes pendientes.</td></tr>`;
        return;
      }

      tablaPendientes.innerHTML = solicitudes.map(s => {
        const id = s.id ?? s.idSolicitud ?? "Sin ID";
        const cliente = s.nombreCliente ?? "Cliente desconocido";
        const tipo = s.tipo ?? s.tipoServicio ?? "Sin tipo";
        const fecha = s.fecha_creacion
          ? new Date(s.fecha_creacion).toLocaleDateString("es-MX")
          : "";
        const estado = s.estado ?? "";

        return `
          <tr data-id="${id}">
            <td>${id}</td>
            <td>${cliente}</td>
            <td>${tipo}</td>
            <td>${fecha}</td>
            <td>${estado}</td>
            <td style="text-align:center;">
              <button class="accion ver" data-id="${id}">Ver</button>
              <button class="accion2 aceptar" data-id="${id}">Aceptar</button>
              <button class="accion1 rechazar" data-id="${id}">Rechazar</button>
            </td>
          </tr>`;
      }).join("");

      tablaPendientes.querySelectorAll("button").forEach(btn => {
        btn.removeEventListener("click", handleClick);
        btn.addEventListener("click", handleClick);
      });

    } catch (err) {
      console.error("Error cargando pendientes:", err);
      tablaPendientes.innerHTML = `<tr><td colspan="6">Error al conectar con el servidor.</td></tr>`;
    }
  }

  function handleClick(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    if (!id) return alert("No se pudo obtener el ID de la solicitud.");
    if (btn.classList.contains("ver")) verDetalles(id);
    if (btn.classList.contains("aceptar")) aceptarSolicitud(id);
    if (btn.classList.contains("rechazar")) rechazarSolicitud(id);
  }

  async function verDetalles(id) {
    window.location.href = `detalleSolicitud.html?id=${id}`;
  }


  async function aceptarSolicitud(id) {
    const confirmar = await mostrarConfirmacion("Seguro que deseas aceptar esta solicitud?");
    if (!confirmar) return;
    mostrarCargando();
    try {
      const form = new FormData();
      form.append("id", id);
      form.append("estado", "Aprobada");

      const res = await fetch("PHP/Solicitud/actualizarEstado.php", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        ocultarCargando();
        await mostrarAviso("Solicitud aceptada ✅");
        const tr = tablaPendientes.querySelector(`tr[data-id="${id}"]`);
        if (tr) tr.remove();
      } else {
        await mostrarAviso("No se pudo aceptar la solicitud: " + (data.message || data.msg || ""));
      }
    } catch (err) {
      console.error("Error aceptarSolicitud:", err);
      await mostrarAviso("Error al aceptar la solicitud.");
    }
  }

  async function rechazarSolicitud(id) {
    // Llamamos al overlay y recibimos el motivo desde ahí
    mostrarOverlayMotivoRechazo(id, async (motivo) => {
      if (motivo === null) return; // usuario presionó cancelar

      const confirmacion = await mostrarConfirmacion("¿Confirmas el rechazo de la solicitud?");
      if (!confirmacion) return;

      // 🟦 Mostrar overlay de carga
      mostrarCargando();

      try {
        const form = new FormData();
        form.append("id", id);
        form.append("estado", "Rechazada");
        form.append("motivo", motivo);

        const res = await fetch("PHP/Solicitud/actualizarEstado.php", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const data = await res.json();

        if (data.success) {
          ocultarCargando();
          await mostrarAviso("Solicitud rechazada.");
          cargarSolicitudesPendientes();
        }
        else {
          await mostrarAviso("No se pudo rechazar la solicitud: " + (data.message || data.msg || ""));
        }
      } catch (err) {
        console.error("Error rechazarSolicitud:", err);
        await mostrarAviso("Error al rechazar la solicitud.");
      }
    });
  }


  // ===== Overlay para motivo de rechazo =====
  function mostrarOverlayMotivoRechazo(idSolicitud, callback) {

    // Mostrar overlay de carga si existe
    const overlaycarga = document.getElementById("overlayCargando");
    if (overlaycarga) overlaycarga.style.display = "flex";

    // Crear overlay si no existe
    let overlay = document.getElementById("overlayMotivoRechazo");
    if (overlay) overlay.remove(); // evitar duplicados

    overlay = document.createElement("div");
    overlay.id = "overlayMotivoRechazo";
    overlay.classList.add("overlay-rechazo");
    overlay.innerHTML = `
    <div class="overlay-content">
      <h3>Motivo del rechazo</h3>
      <textarea id="motivoRechazoInput" rows="4" placeholder="Escribe el motivo del rechazo..."></textarea>
      <div class="overlay-buttons">
        <button id="cancelarRechazoBtn" class="btn-cancelar">Cancelar</button>
        <button id="enviarRechazoBtn" class="btn-enviar">Enviar</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);
    overlay.style.display = "flex";

    // Ocultar overlay de carga cuando aparece este modal
    if (overlaycarga) overlaycarga.style.display = "none";

    // botón cancelar
    document.getElementById("cancelarRechazoBtn").addEventListener("click", () => {
      overlay.remove();
      if (callback) callback(null);
    });

    // botón enviar
    document.getElementById("enviarRechazoBtn").addEventListener("click", () => {
      const motivo = document.getElementById("motivoRechazoInput").value.trim();

      if (!motivo) {
        mostrarAviso("Por favor, escribe el motivo del rechazo.");
        return;
      }

      overlay.remove();
      if (callback) callback(motivo);
    });
  }


});

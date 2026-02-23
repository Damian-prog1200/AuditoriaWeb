function setSubmitButtonDisabled(disabled) {
  const btn = document.querySelector("button[type='submit']");
  if (btn) btn.disabled = disabled;
}

function mostrarCargando() {
  const o = document.getElementById("overlayCargando");
  if (o) o.style.display = "flex";
}

function ocultarCargando() {
  const o = document.getElementById("overlayCargando");
  if (o) o.style.display = "none";
}
const API_URL = "PHP/Entrega/obtenerprocesosfinalizados.php";

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

    // bloquear botón enviar
    setSubmitButtonDisabled(true);

    // Key handler
    const keyHandler = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        ev.stopPropagation();
        aceptarHandler();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
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

    overlay.style.display = "flex";

    setTimeout(() => {
      try { btnAceptar.focus(); } catch (e) { }
    }, 10);
  });
}
// ================================
// HELPER PARA MENSAJES
// ================================
function mostrarMensajeForm(idContenedor, mensaje, tipo = "error") {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) {
    console.warn("mostrarMensajeForm: no existe el contenedor", idContenedor);
    return;
  }

  // Evitar repetir el mismo mensaje
  if (
    contenedor.textContent === mensaje &&
    !contenedor.classList.contains("oculto")
  )
    return;

  contenedor.textContent = mensaje;

  // Resetear clases y volver a aplicar estilo
  contenedor.className = "mensaje-form " + tipo;
  contenedor.classList.remove("oculto");
}

// ================================
// CARGA INICIAL
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  // 🟡 Configurar menú superior
  inicializarMenuUsuario();

  await cargarProcesos();
});

// ================================
// CARGAR PROCESOS
// ================================
async function cargarProcesos() {
  const cont = document.getElementById("listaProcesos");
  cont.innerHTML = `<div class="cargando">Cargando procesos...</div>`;

  try {
    const res = await fetch(API_URL);
    const json = await res.json();

    if (!json.success) {
      mostrarMensajeForm(
        "msgProcesos",
        "No se pudieron cargar los procesos.",
        "error"
      );
      cont.innerHTML = "";
      return;
    }

    if (!Array.isArray(json.procesos) || json.procesos.length === 0) {
      mostrarMensajeForm("msgProcesos", "No hay procesos finalizados.", "info");
      cont.innerHTML = "";
      return;
    }

    // limpiar mensaje
    mostrarMensajeForm("msgProcesos", "", "info");
    document.getElementById("msgProcesos").classList.add("oculto");

    // Generar tarjetas
    cont.innerHTML = "";
    json.procesos.forEach((p) => {
      const tarjeta = document.createElement("section");
      tarjeta.className = "card proceso-card";

      tarjeta.innerHTML = `
    <div class="badges">
      <span class="badge badge-solicitud">Solicitud #${p.idSolicitud ?? "N/A"
        }</span>
    </div>

    <h4>Cliente: ${escapeHtml(p.cliente || "No especificado")}</h4>

    <p><strong>Observaciones:</strong> ${escapeHtml(
          p.observaciones || "Sin observaciones"
        )}</p>

    <p class="muted small">
      Fecha terminado: ${p.fecha ? escapeHtml(p.fecha) : "Sin fecha"}
    </p>

    ${p.archivoGenerado
          ? `
      <a class="btn-verpdf" href="http://localhost/Chamba/reportes/${p.archivoGenerado}" target="_blank">
        Ver PDF
      </a>
    `
          : ""
        }

    <hr>

    <div class="acciones-proceso">
      <button class="btn primario"
        onclick="accionEntregar(${p.idProceso}, ${p.idReporte ? p.idReporte : "null"
        },'${(p.archivoGenerado || "").replace(/'/g, "\\'")}',
        '${p.correoCliente}')">
        Entregar reporte
      </button>
    </div>
  `;

      cont.appendChild(tarjeta);
    });
  } catch (e) {
    mostrarMensajeForm(
      "msgProcesos",
      "Error de conexión con el servidor.",
      "error"
    );
    console.error(e);
  }
}

// ================================
// LOCALSTORAGE HELPERS
// ================================
function guardarEnLocalStorageParaEntrega(idProceso) {
  try {
    localStorage.setItem("procesoEntrega", idProceso);
    localStorage.setItem("idProcesoSeleccionado", idProceso);
    localStorage.setItem("procesoSeleccionado", idProceso);
  } catch (e) {
    console.warn("localStorage no disponible", e);
  }
}

// ================================
// ACCIONES
// ================================
function accionEntregar(idProceso, idReporte, archivoPDF, correoCliente) {
  mostrarCargando();
  if (!archivoPDF) {
    mostrarAviso("No hay PDF generado para enviar.");
    return;
  }

  let formData = new FormData();
  formData.append("idProceso", idProceso);
  formData.append("idReporte", idReporte ?? "");
  formData.append("archivo", archivoPDF);
  formData.append("correo", correoCliente);

  fetch("PHP/Entrega/enviarcorreo.php", {
    method: "POST",
    body: formData,
  })
    .then((r) => r.json())
    .then(async (d) => {
      if (d.success) {
        ocultarCargando();
        // 📧 CORREO ENVIADO
        mostrarAviso("Correo enviado exitosamente.");

        // ===============================
        // 🟢 ACTUALIZAR ESTADO EN LA BD
        // ===============================

        try {
          const updateRes = await fetch("PHP/Entrega/actualizarestado.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idProceso: idProceso,
              nuevoEstado: "Entregada",
            }),
          });

          const updateJson = await updateRes.json();

          if (updateJson.success) {
            console.log("Estado actualizado correctamente.");

            // 🔄 Volver a cargar la lista para que desaparezca
            await cargarProcesos();
          } else {
            mostrarAviso("El correo se envió, pero no se pudo actualizar el estado.");
          }
        } catch (e) {
          console.error("Error al actualizar estado", e);
        }
      } else {
        mostrarAviso("Error al enviar correo: " + d.message);
      }
    })
    .catch((err) => {
      mostrarAviso("Error: " + err);
    });
}

// ================================
// UTILS
// ================================
function escapeHtml(text) {
  if (!text && text !== 0) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inicializarMenuUsuario() {
  const menuBtn = document.getElementById("menuBtn");
  const menuContent = document.getElementById("menuContent");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!menuBtn || !menuContent || !logoutBtn) return;

  // 🟢 Mostrar / ocultar el menú
  menuBtn.addEventListener("click", () => {
    const isVisible = menuContent.style.display === "block";
    document.querySelectorAll(".dropdown-content").forEach((menu) => {
      menu.style.display = "none"; // cierra otros menús si hay
    });
    menuContent.style.display = isVisible ? "none" : "block";
  });

  // ⚪ Ocultar si se hace clic fuera del menú
  document.addEventListener("click", (e) => {
    if (!menuBtn.contains(e.target) && !menuContent.contains(e.target)) {
      menuContent.style.display = "none";
    }
  });

  // 🔴 Cerrar sesión
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("PHP/desconexion.php", { method: "POST" });
      if (response.ok) {
        window.location.href = "index.html";
      } else {
        mostrarAviso("⚠️ Error al cerrar sesión. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  });
}

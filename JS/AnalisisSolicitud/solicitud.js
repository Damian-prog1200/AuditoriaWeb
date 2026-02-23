// ======================
// Clase Solicitud
// ======================
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
    setTimeout(() => { try { btnAceptar.focus(); } catch (e) { } }, 10);
  });
}

class Solicitud {
  constructor(
    idSolicitud = null,
    idCliente = null,
    estado = "Borrador",
    tipoServicio = "",
    detalle = "",
    fechaAprobacion = null,
    fechaRechazo = null,
    archivoPDF = null
  ) {
    this.idSolicitud = idSolicitud;
    this.idCliente = idCliente;
    this.estado = estado;
    this.tipoServicio = tipoServicio;
    this.detalle = detalle;
    this.fechaAprobacion = fechaAprobacion;
    this.fechaRechazo = fechaRechazo;
    this.archivoPDF = archivoPDF;
  }

  // 🟩 Crear o editar solicitud (según si hay idSolicitud)
  async guardar(formData, idSolicitud = null) {
    try {
      const url = idSolicitud
        ? "PHP/Solicitud/editarSolicitud.php"
        : "PHP/Solicitud/guardarSolicitud.php";

      if (idSolicitud) formData.append("idSolicitud", idSolicitud);
      console.log("archivoPDF en formData:", formData.get("archivoPDF"));

      // 🟨 Validar archivo PDF
      const archivo = formData.get("archivoPDF");

      // Si no hay archivo seleccionado
      if (!archivo || !archivo.name) {
        await mostrarAviso("⚠️ Debes seleccionar un archivo PDF.");
        return;
      }

      // Verificar extensión
      const extension = archivo.name.split(".").pop().toLowerCase();
      if (extension !== "pdf") {
        await mostrarAviso("❌ Solo se permiten archivos PDF.");
        return;
      }

      // Si sí es PDF, agrega el nombre
      formData.append("nombrePDF", archivo.name);


      console.log("📤 Enviando datos:", [...formData.entries()]);

      const res = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("⚠️ Respuesta no JSON:", text);
        throw new Error("El servidor no devolvió JSON válido.");
      }

      const data = await res.json();
      console.log("📦 Respuesta del servidor:", data);

      if (data.msg && data.msg.includes("No hay sesión activa")) {
        await mostrarAviso("⚠️ Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        window.location.href = "index.html";
        return;
      }

      if (data.success) {
        await mostrarAviso(idSolicitud
          ? "✅ Solicitud actualizada correctamente."
          : "✅ Solicitud guardada correctamente."
        );
        window.location.href = "panel-cliente.html";
      } else {
        await mostrarAviso("⚠️ " + data.msg);
      }
    } catch (error) {
      console.error("🚨 Error al guardar la solicitud:", error);
      await mostrarAviso("❌ No se pudo guardar la solicitud.");
    }
  }
}

// ==========================
// MANEJO DEL FORMULARIO HTML
// ==========================
const form = document.getElementById("formSolicitud");
const btn = document.getElementById("btnEnviar");
const titulo = document.getElementById("titulo-formulario");

const params = new URLSearchParams(window.location.search);
const idSolicitud = params.get("id");

document.addEventListener("DOMContentLoaded", async () => {
  if (idSolicitud) {
    titulo.textContent = "✏️ Editar Solicitud";
    btn.textContent = "Guardar Cambios";
  }
});

// Guardar o editar solicitud
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const nuevaSolicitud = new Solicitud();
  await nuevaSolicitud.guardar(formData, idSolicitud);
});

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

    titulo.textContent = "Adivina que...";
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

document.addEventListener("DOMContentLoaded", async () => {
  // Obtener elementos del DOM
  const form = document.getElementById("formSolicitud");
  const tipoSelect = document.getElementById("tipo");
  const detalleInput = document.getElementById("detalle");
  const archivoInput = document.getElementById("archivoPDF");
  const archivoNombre = document.getElementById("archivoNombre"); // muestra nombre actual

  // Obtener id desde querystring
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    await mostrarAviso("No se especificó ninguna solicitud para editar.");
    // evitar redirect automático si prefieres revisar — aquí redirigimos
    window.location.href = "panel-cliente.html";
    return;
  }

  // Variables para conservar datos existentes recibidos del servidor
  let archivoBase64Existente = ""; // puede venir como data:application/pdf;base64,...
  let nombrePDFExistente = "";

  // --- 1) Cargar datos de la solicitud desde el servidor ---
  try {
    // Ruta relativa (sin / al inicio) para que funcione según tu estructura actual
    const res = await fetch(`PHP/Solicitud/obtenerSolicitud.php?id=${encodeURIComponent(id)}`, {
      credentials: "include"
    });

    // Si el fetch falla status 404/500, mostrar texto para depuración
    if (!res.ok) {
      const txt = await res.text();
      console.error("Respuesta no OK al obtener solicitud:", res.status, txt);
      await mostrarAviso("Error al cargar la solicitud (ver consola).");
      return;
    }

    const data = await res.json();

    if (!data.success || !data.solicitud) {
      console.error("API devolvería success=false:", data);
      await mostrarAviso("Solicitud no encontrada o error en servidor.");
      window.location.href = "panel-cliente.html";
      return;
    }

    const s = data.solicitud;

    // Rellenar campos (usar los nombres que devuelve tu PHP)
    // Aquí asumimos que tu obtenerSolicitud.php devuelve:
    // { success: true, solicitud: { id, tipo, detalle, archivo (base64|null), nombrePDF } }
    tipoSelect.value = s.tipo || "";
    detalleInput.value = s.detalle || "";

    // Guardar datos existentes para reenviarlos si el usuario NO sube nuevo archivo
    archivoBase64Existente = s.archivo || "";       // data:application/pdf;base64,....
    nombrePDFExistente = s.nombrePDF || "Nombre sin definir";

    // Mostrar nombre actual en la UI (aunque sea "Nombre sin definir")
    archivoNombre.textContent = nombrePDFExistente;

  } catch (err) {
    console.error("Error cargando solicitud:", err);
    await mostrarAviso("Error al cargar los datos de la solicitud (ver consola).");
    window.location.href = "panel-cliente.html";
    return;
  }

  // --- 2) Actualizar nombre mostrado si el usuario selecciona un archivo nuevo ---
  archivoInput.addEventListener("change", () => {
    const f = archivoInput.files && archivoInput.files[0];
    archivoNombre.textContent = f ? f.name : (nombrePDFExistente || "Nombre sin definir");
  });
  // --- VERIFICACIÓN DEL PDF ---  
  function verificarPDF(file) {
    if (!file) return true; // no subió nada, se mantiene el existente

    // 1) Validar tipo MIME
    if (file.type !== "application/pdf") {
      mostrarAviso("El archivo debe ser un PDF válido.");
      archivoInput.value = "";
      archivoNombre.textContent = nombrePDFExistente || "Nombre sin definir";
      return false;
    }

    // 2) Validar tamaño (máx 50 MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      mostrarAviso("El archivo PDF no debe exceder los 50 MB.");
      archivoInput.value = "";
      archivoNombre.textContent = nombrePDFExistente || "Nombre sin definir";
      return false;
    }

    return true;
  }


  // --- 3) Manejar submit: enviar id, tipo, detalle y archivo (nuevo o conservar existente) ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Validar PDF si se subió uno nuevo
    const archivoNuevo = archivoInput.files && archivoInput.files[0];
    if (archivoNuevo) {
      const ok = verificarPDF(archivoNuevo);
      if (!ok) return; // detener submit
    }

    const tipo = (tipoSelect.value || "").trim();
    const detalle = (detalleInput.value || "").trim();

    if (!tipo || !detalle) {
      await mostrarAviso("Por favor completa tipo y detalle antes de guardar.");
      return;
    }

    const formData = new FormData();
    formData.append("id", id);               // id obligatorio
    formData.append("tipo", tipo);
    formData.append("detalle", detalle);

    // Si usuario sube archivo nuevo, lo adjuntamos; si no, mandamos el base64 existente y nombre existente
    if (archivoInput.files && archivoInput.files.length > 0) {
      formData.append("archivoPDF", archivoInput.files[0]);      // archivo binario nuevo
      // también añadir nombrePDF para que PHP lo guarde
      formData.append("nombrePDF", archivoInput.files[0].name);
    } else {
      // no subió archivo nuevo -> enviar los valores existentes para que el PHP los mantenga
      // (tu editar PHP espera $_POST['archivo'] con base64 si quieres mantenerlo)
      if (archivoBase64Existente) {
        formData.append("archivoPDF", archivoBase64Existente);   // base64 existente
      } else {
        formData.append("archivoPDF", "");
      }
      formData.append("nombrePDF", nombrePDFExistente || "Nombre sin definir");
    }

    try {
      const resEdit = await fetch("PHP/Solicitud/editarSolicitud.php", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      // Depuración si falla retorno no-JSON
      const ct = resEdit.headers.get("content-type") || "";
      if (!resEdit.ok) {
        const txt = await resEdit.text();
        console.error("editarSolicitud.php respondió error HTTP", resEdit.status, txt);
        await mostrarAviso("Error del servidor al guardar (ver consola).");
        return;
      }
      if (!ct.includes("application/json")) {
        const txt = await resEdit.text();
        console.error("editarSolicitud.php respondió no-JSON:", txt);
        await mostrarAviso("Respuesta inválida del servidor (ver consola).");
        return;
      }

      const result = await resEdit.json();

      if (result.success) {
        await mostrarAviso("✅ Solicitud actualizada correctamente.");
        window.location.href = "panel-cliente.html";
      } else {
        console.error("editarSolicitud.php devolvió success=false:", result);
        await mostrarAviso("Error al actualizar: " + (result.message || result.msg || "ver consola"));
      }
    } catch (err) {
      console.error("Error al enviar edición:", err);
      await mostrarAviso("Error al guardar la solicitud (ver consola).");
    }
  });
});


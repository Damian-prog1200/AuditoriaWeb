// JS/AnalisisSolicitud/detalleSolicitud.js
document.addEventListener("DOMContentLoaded", async () => {
  // Obtener ID de la URL
  const params = new URLSearchParams(window.location.search);
  const idSolicitud = params.get("id");

  if (!idSolicitud) {
    alert("No se ha proporcionado un ID de solicitud válido.");
    return;
  }

  // Elementos donde se mostrará la información
  const idSpan = document.getElementById("solicitudId");
  const clienteSpan = document.getElementById("solicitudCliente");
  const tipoSpan = document.getElementById("solicitudTipo");
  const fechaSpan = document.getElementById("solicitudFecha");
  const pdfViewer = document.getElementById("pdfViewer");
  const detalleSpan = document.getElementById("solicitudDetalle");

  function debugLog(...args) {
    // Consola con prefijo para encontrar facilmente
    console.log("[detalleSolicitud] ", ...args);
  }

  // Helper: extraer base64 real del campo 'archivo' (maneja dataURL, solo base64, y doble-encode)
  // reemplaza solo la función extractPdfBase64Field por esta versión
function extractPdfBase64Field(value) {
  if (!value) return null;

  // Si es data URL completo: data:application/pdf;base64,XXXXX
  if (typeof value === "string" && value.includes("data:application/pdf;base64,")) {
    const payload = value.split("data:application/pdf;base64,")[1] || "";

    // Intentar detectar si el payload al decodificar contiene otra data URL (doble-encode)
    try {
      const decodedPayload = atob(payload);
      if (typeof decodedPayload === "string" && decodedPayload.startsWith("data:application/pdf;base64,")) {
        // payload decodificado es otra data URL -> extraer la parte real
        const inner = decodedPayload.split("data:application/pdf;base64,")[1] || "";
        return { type: "base64payload", payload: inner, doubleDecoded: true };
      }
    } catch (e) {
      // no se pudo atob(payload) -> tal vez payload es el base64 final; seguir abajo
    }

    // si no es doble-encode, asumimos que payload es la base64 del PDF
    return { type: "base64payload", payload: payload };
  }

  // Si contiene una coma pero sin header estándar -> intentar extraer después de la coma
  if (typeof value === "string" && value.includes(",") && value.indexOf(",") < 100) {
    const after = value.split(",")[1];
    if (after && /^[A-Za-z0-9+/=\s]+$/.test(after)) {
      // comprobar si after decodificado produce otra dataURL (doble-encode)
      try {
        const dec = atob(after);
        if (dec.startsWith("data:application/pdf;base64,")) {
          return { type: "base64payload", payload: dec.split("data:application/pdf;base64,")[1] };
        }
      } catch (e) {}
      return { type: "base64payload", payload: after };
    }
  }

  // Intentar decodificar la cadena completa: puede ser base64 simple o doble-encoded
  try {
    const decodedOnce = atob(value);

    // si decodedOnce comienza con 'data:application/pdf;base64,' -> doble encoded
    if (decodedOnce.startsWith("data:application/pdf;base64,")) {
      const inner = decodedOnce.split("data:application/pdf;base64,")[1] || "";
      return { type: "base64payload", payload: inner, doubleDecoded: true };
    }

    // si decodedOnce comienza con %PDF -> ya es binario PDF (raw)
    if (decodedOnce.startsWith("%PDF")) {
      return { type: "rawBinary", binaryString: decodedOnce };
    }

    // si decodedOnce contiene la dataURL -> buscarla
    if (decodedOnce.includes("data:application/pdf;base64,")) {
      const inner = decodedOnce.split("data:application/pdf;base64,")[1] || "";
      return { type: "base64payload", payload: inner };
    }
  } catch (e) {
    // no es base64 decodificable por atob
  }

  // si value parece contener solo caracteres base64, asumir payload directo
  if (/^[A-Za-z0-9+/=\s]+$/.test(value)) {
    return { type: "base64payload", payload: value };
  }

  return null;
}


  // Construir blobURL desde base64 payload o desde raw binary string
  function createPdfBlobUrlFromExtracted(info) {
    if (!info) return null;
    try {
      if (info.type === "rawBinary") {
        const bin = info.binaryString;
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: "application/pdf" });
        return URL.createObjectURL(blob);
      }

      if (info.type === "base64payload") {
        // decodificar payload a bytes
        const b64 = info.payload.replace(/\s/g, ""); // quitar saltos de línea si existen
        const byteCharacters = atob(b64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      debugLog("createPdfBlobUrlFromExtracted error:", err);
      return null;
    }
    return null;
  }

  try {
    const res = await fetch(`PHP/Solicitud/obtenerSolicitud.php?id=${encodeURIComponent(idSolicitud)}`, {
      credentials: "include",
      cache: "no-store"
    });

    if (!res.ok) {
      debugLog("Respuesta HTTP no ok:", res.status, res.statusText);
      throw new Error("Error HTTP al obtener solicitud");
    }

    const data = await res.json();
    if (!data || !data.success || !data.solicitud) {
      debugLog("Respuesta JSON inválida:", data);
      alert("No se pudo cargar la información de la solicitud.");
      return;
    }

    const s = data.solicitud;

    // Mostrar datos básicos (usando varias claves por compatibilidad)
    idSpan.textContent = s.id ?? s.idSolicitud ?? "Desconocido";
    clienteSpan.textContent = s.nombreCliente ?? s.nombreUsuario ?? s.nombre ?? "Sin nombre";
    tipoSpan.textContent = s.tipo ?? s.tipoServicio ?? "No especificado";
    detalleSpan.textContent = s.detalle ?? "Sin detalles";
    fechaSpan.textContent = s.fecha_creacion ? new Date(s.fecha_creacion).toLocaleDateString("es-MX") : (s.fecha || s.fecha_creacion || "Sin fecha");

    // DEBUG: muestra primeras 200 chars del campo archivo para inspección
    debugLog("Campo 'archivo' (preview 200):", (s.archivo || "").substring(0, 200));
    debugLog("Campo 'nombrePDF':", s.nombrePDF);

    // Intentar extraer base64 / binario
    const extracted = extractPdfBase64Field(s.archivo || s.pdfBase64 || s.archivoPDF || s.archivo || "");
    if (!extracted) {
      debugLog("No se pudo extraer PDF desde el campo 'archivo'.");
      pdfViewer.outerHTML = `<p style="text-align:center;width:100%;color:#777;">No se encontró el archivo PDF.</p>`;
      return;
    }

    const blobUrl = createPdfBlobUrlFromExtracted(extracted);
    if (!blobUrl) {
      debugLog("No se pudo crear blob URL del PDF extraído.");
      pdfViewer.outerHTML = `<p style="text-align:center;width:100%;color:#777;">Error al procesar el archivo PDF.</p>`;
      return;
    }

    // Asignar al iframe
    pdfViewer.src = blobUrl;

    // Liberar el objectURL al salir para no acumular memoria
    window.addEventListener("unload", () => {
      try { URL.revokeObjectURL(blobUrl); } catch (e) {}
    });

  } catch (err) {
    console.error("Error al cargar detalle:", err);
    alert("Error de conexión con el servidor.");
  }
});

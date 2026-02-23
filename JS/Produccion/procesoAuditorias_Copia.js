
// === FUNCIONES DE CÁLCULO Y GENERACIÓN DE REPORTE ===

// Calcula el impuesto y muestra el resultado automáticamente
function calcularAuditoria() {
  const ingresos = parseFloat(document.getElementById("ingresos").value) || 0;
  const gastos = parseFloat(document.getElementById("gastos").value) || 0;
  const tasa = parseFloat(document.getElementById("impuesto").value) || 0;

  if (ingresos > gastos || ingresos === gastos) {
    const baseImponible = ingresos - gastos;
    const impuestoCalculado = baseImponible * (tasa / 100);
    document.getElementById(
      "resultado"
    ).value = `Impuesto a pagar: $${impuestoCalculado.toFixed(2)}`;
  } else {
    const baseImponible = ingresos - gastos;
    const impuestoCalculado = baseImponible * (tasa / 100);
    document.getElementById("resultado").value = `Saldo a favor: $${(
      impuestoCalculado * -1
    ).toFixed(2)}`;
  }
}

// === VALIDAR CAMPOS ===
function validarCamposAuditoria() {
  const ingresos = document.getElementById("ingresos");
  const gastos = document.getElementById("gastos");
  const tasa = document.getElementById("impuesto");
  const comentarios = document.getElementById("comentarios");
  const resultado = document.getElementById("resultado");

  let valido = true;
  const campos = [ingresos, gastos, tasa, comentarios];

  // Reinicia estilos previos
  campos.forEach((c) => (c.style.border = ""));

  // Revisa campos vacíos
  campos.forEach((campo) => {
    if (!campo.value.trim()) {
      campo.style.border = "2px solid red";
      valido = false;
    }
  });

  // Verifica que el resultado esté calculado
  if (!resultado.value.trim()) {
    alert("⚠️ Debes calcular el resultado antes de finalizar la auditoría.");
    valido = false;
  }

  if (!valido) {
    alert(
      "Por favor completa todos los campos antes de terminar la auditoría."
    );
  }

  return valido;
}

// === EVENTOS PARA LOS BOTONES ===
document
  .querySelector(".accept")
  .addEventListener("click", () => finalizarAuditoria());
document
  .querySelector(".reject")
  .addEventListener("click", () => {
    pausarAuditoria();
    window.location.href = "panel-auditor.html";
  }
);

// === FUNCIÓN PARA GUARDAR OBSERVACIONES Y GENERAR REPORTE ===
async function finalizarAuditoria() {
  // ⛔ Validar antes de continuar
  if (!validarCamposAuditoria()) return;

  const comentarios = document.getElementById("comentarios").value.trim();
  const ingresos = document.getElementById("ingresos").value;
  const gastos = document.getElementById("gastos").value;
  const tasa = document.getElementById("impuesto").value;
  const resultado = document.getElementById("resultado").value;

  // Simula obtener el id del proceso (por ejemplo, desde la URL)
  const urlParams = new URLSearchParams(window.location.search);
  const idSolicitud = urlParams.get("idSolicitud");

  if (!idSolicitud) {
    alert("No se pudo identificar el proceso actual.");
    return;
  }
  
  try {
    // === 1️⃣ Actualizar observaciones ===
    const resp1 = await fetch("PHP/Produccion/actualizarObservaciones.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idSolicitud, observaciones: comentarios }),
    });

    const data1 = await resp1.json();

    if (!data1.success) {
      alert("Error al actualizar observaciones: " + data1.message);
      return;
    }

    console.log("=== DEBUG ===");
    console.log("ingresos:", document.getElementById("ingresos").value);
    console.log("gastos:", document.getElementById("gastos").value);
    console.log("impuesto:", document.getElementById("impuesto").value);
    console.log("comentarios:", document.getElementById("comentarios").value);

    // === Generar y guardar reporte ===
    const resp2 = await fetch("PHP/Produccion/generarReporte.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idSolicitud,
        ingresos,
        gastos,
        impuesto: tasa, // <-- corregido
        observaciones: comentarios, // <-- corregido
      }),
    });

    const rawResponse = await resp2.clone().text();
    console.log("Respuesta del servidor:", rawResponse);

    const data2 = await resp2.json();
    console.log(data2);
    if (data2.success) {
      alert("✅ Auditoría finalizada y reporte generado correctamente.");
      document.getElementById("visorPDF").src = data2.pdfRuta;
    } else {
      alert("❌ Error al generar el reporte: " + data2.message);
    }
  } catch (error) {
    console.error("Error al finalizar auditoría:", error);
    alert("Error en la conexión al finalizar la auditoría.");
  }
}

// === FUNCIÓN PARA GUARDAR OBSERVACIONES AL PAUSAR ===
async function pausarAuditoria() {
  const comentarios = document.getElementById("comentarios").value.trim();
  const urlParams = new URLSearchParams(window.location.search);
  const idProceso = urlParams.get("idSolicitud");

  if (!idProceso) {
    alert("No se pudo identificar el proceso actual.");
    return;
  }

  try {
    const resp = await fetch("PHP/Produccion/actualizarObservaciones.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idProceso, observaciones: comentarios }),
    });

    const rawResponse = await resp.clone().text();
    console.log("Respuesta del servidor:", rawResponse);

    const data = await resp.json();

    if (data.success) {
      alert("⏸️ Auditoría pausada. Observaciones guardadas correctamente.");
    } else {
      alert("Error al guardar observaciones: " + data.message);
    }
  } catch (error) {
    console.error("Error al pausar auditoría:" + error);
    alert("Error al guardar observaciones.");
  }
}

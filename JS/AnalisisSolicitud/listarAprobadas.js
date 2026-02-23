// JS/AnalisisSolicitud/listarAprobadas.js

async function cargarAprobadas() {
  const tbody = document.getElementById("tablaAprobadas");

  try {
    const res = await fetch("PHP/Solicitud/listarAprobadas.php", { credentials: "include" });
    const data = await res.json();

    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="6">Error: ${data.message || "no data"}</td></tr>`;
      return;
    }

    const rows = data.solicitudes || [];
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No hay solicitudes aprobadas o pausadas.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    const activeId = localStorage.getItem("solicitudEnProceso");

    for (const r of rows) {
      const tr = document.createElement("tr");
      const estado = r.estado || "Aprobada";
      const textoBoton = estado === "Pausada" ? "Reanudar" :
        (estado.toLowerCase() === "en proceso" ? "Seguir" : "Trabajar");

      tr.innerHTML = `
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.cliente || r.nombreCliente || "Desconocido")}</td>
        <td>${escapeHtml(r.tipo || r.tipoServicio || "Desconocido")}</td>
        <td>${escapeHtml(r.fecha_aprobacion || r.fecha_creacion || "-")}</td>
        <td>
          <span style="color:${estado === "Pausada" ? "orange" : estado.toLowerCase() === "en proceso" ? "blue" : "green"};font-weight:600;">
            ${escapeHtml(estado)}
          </span>
        </td>
        <td style="text-align:center;">
          <button class="accion ver" data-id="${escapeHtml(r.id)}">Ver Detalles</button>
          <button class="accion2 accion-trabajar" data-id="${escapeHtml(r.id)}" data-estado="${escapeHtml(estado)}">${textoBoton}</button>
        </td>
      `;

      tbody.appendChild(tr);
    }

    tbody.querySelectorAll("button").forEach(b => {
      b.removeEventListener("click", handleAprobadasClick);
      b.addEventListener("click", handleAprobadasClick);
    });

    applyProcesoLock();
  } catch (err) {
    console.error("Error cargarAprobadas:", err);
    tbody.innerHTML = `<tr><td colspan="6">Error al cargar (ver consola)</td></tr>`;
  }
}

function handleAprobadasClick(e) {
  const btn = e.currentTarget;
  const id = btn.getAttribute("data-id");
  const estado = btn.getAttribute("data-estado") || "";
  const activeId = localStorage.getItem("solicitudEnProceso");

  if (btn.classList.contains("ver")) {
    verAprobada(id);
    return;
  }

  if (activeId && String(id) !== String(activeId)) {
    alert("Solo puedes continuar con la solicitud que está en proceso. Finalízala o paúsala primero.");
    return;
  }

  if (estado.toLowerCase() === "pausada") {
    reanudarSolicitud(id);
  } else if (estado.toLowerCase() === "en proceso") {
    window.location.href = `procesodatos.html?idSolicitud=${encodeURIComponent(id)}`;
  } else {
    trabajarSolicitud(id);
  }
}

function verAprobada(id) {
  window.location.href = `detalleSolicitud.html?id=${encodeURIComponent(id)}`;
}

// ✅ Trabajar: crea registro en Procesos_Produccion y cambia estado
async function trabajarSolicitud(id) {
  const overlay = document.getElementById("overlayCargando");
  try {
    if (overlay) overlay.style.display = "flex";

    // 1️⃣ Actualizar estado de la solicitud
    const resEstado = await fetch("PHP/Solicitud/actualizarEstado.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: id,
        estado: "En proceso"
      })
    });

    const text1 = await resEstado.text();
    let dataEstado;
    try {
      dataEstado = JSON.parse(text1);
    } catch {
      console.error("❌ Respuesta inválida al actualizar estado:", text1);
      alert("Error al actualizar la solicitud (respuesta inválida del servidor).");
      if (overlay) overlay.style.display = "none";
      return;
    }

    if (!dataEstado.success) {
      alert("❌ Error al actualizar estado: " + (dataEstado.message || "Desconocido"));
      if (overlay) overlay.style.display = "none";
      return;
    }

    console.log("✅ Estado de solicitud actualizado a 'En proceso'.");

    // 2️⃣ Crear registro en Procesos_Produccion
    const resProceso = await fetch("PHP/Produccion/crearProceso.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idSolicitud: id })
    });

    const text2 = await resProceso.text();
    let dataProceso;
    try {
      dataProceso = JSON.parse(text2);
    } catch {
      console.error("❌ Respuesta inválida al crear proceso:", text2);
      alert("Error al crear proceso (respuesta inválida del servidor).");
      if (overlay) overlay.style.display = "none";
      return;
    }

    if (!dataProceso.success) {
      alert("❌ Error al crear proceso: " + (dataProceso.message || "Desconocido"));
      if (overlay) overlay.style.display = "none";
      return;
    }

    console.log("✅ Proceso de producción creado correctamente.");

    // 3️⃣ Guardar id y redirigir
    localStorage.setItem("solicitudEnProceso", String(id));
    applyProcesoLock();

    if (overlay) overlay.style.display = "none";
    window.location.href = `procesodatos.html?idSolicitud=${encodeURIComponent(id)}`;

  } catch (error) {
    console.error("Error en trabajarSolicitud:", error);
    if (overlay) overlay.style.display = "none";
    alert("⚠️ Error general al procesar la solicitud.");
  }
}


// ✅ Reanudar (desde Pausada)
async function reanudarSolicitud(id) {
  const overlay = document.getElementById("overlayCargando");
  try {
    if (overlay) overlay.style.display = "flex";
    const res = await fetch("PHP/Produccion/actualizarEstado.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idSolicitud: id, estado: "En proceso" })
    });
    const data = await res.json();

    if (!data.success) {
      alert("❌ Error al reanudar la solicitud: " + (data.message || "Desconocido"));
      return;
    }

    localStorage.setItem("solicitudEnProceso", String(id));
    applyProcesoLock();
    window.location.href = `procesodatos.html?idSolicitud=${encodeURIComponent(id)}`;
  } catch (err) {
    console.error("Error en reanudarSolicitud:", err);
    alert("Error al reanudar la solicitud.");
  }
}

function applyProcesoLock() {
  const activeId = localStorage.getItem("solicitudEnProceso");
  document.querySelectorAll(".accion2.accion-trabajar").forEach(btn => {
    const id = btn.getAttribute("data-id");
    if (activeId) {
      if (String(id) === String(activeId)) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.textContent = "Seguir";
      } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
      }
    } else {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      const estado = btn.getAttribute("data-estado") || "";
      const texto = estado.toLowerCase() === "pausada" ? "Reanudar" :
        (estado.toLowerCase() === "en proceso" ? "Seguir" : "Trabajar");
      btn.textContent = texto;
    }
  });
}

function liberarSolicitudEnProceso() {
  localStorage.removeItem("solicitudEnProceso");
  applyProcesoLock();
}

window.liberarSolicitudEnProceso = liberarSolicitudEnProceso;

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", cargarAprobadas);

// JS/AnalisisSolicitud/panelauditor.js
document.addEventListener("DOMContentLoaded", () => {
  // Handler para el botón "Procesar información" del panel auditor
  window.handleProcesarClick = async function (ev) {
    ev && ev.preventDefault && ev.preventDefault();

    try {
      const res = await fetch("PHP/Solicitud/listarAprobadas.php", { credentials: "include" });
      if (!res.ok) {
        console.error("panelauditor: listarAprobadas.php respondió mal:", res.status);
        // En caso de error de red, dejar que vaya a aceptadas para no bloquear al usuario
        window.location.href = "aceptadas.html";
        return;
      }
      const data = await res.json();
      if (!data.success || !Array.isArray(data.solicitudes)) {
        window.location.href = "aceptadas.html";
        return;
      }

      // Buscar si hay alguna solicitud "En proceso" (prioridad)
      const enProceso = data.solicitudes.find(s => String(s.estado || "").toLowerCase() === "en proceso");

      if (enProceso && enProceso.id) {
        // Solo guardamos el ID (string) de la solicitud en proceso — no redirigimos automáticamente
        // Redirigimos al módulo de proceso porque el auditor hizo click en el botón Procesar
        window.location.href = `procesodatos.html?idSolicitud=${encodeURIComponent(enProceso.id)}`;
        return;
      }

      // Si no hay "En proceso", vamos a la lista de aprobadas (el auditor elegirá)
      window.location.href = "aceptadas.html";
    } catch (err) {
      console.error("panelauditor: error verificando aprobadas/En proceso:", err);
      window.location.href = "aceptadas.html";
    }
  };
});

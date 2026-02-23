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

/* ===========================
   Mostrar aviso (solo Aceptar)
   =========================== */
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

/* ====================================
   Mostrar confirmación (Aceptar + Cancelar)
   ==================================== */
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

        setSubmitButtonDisabled(true);

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

        setTimeout(() => {
            try { btnAceptar.focus(); } catch (e) { }
        }, 10);
    });
}

/* =========================================================
   IIFE principal que gestiona la lógica de la auditoría
   ========================================================= */
(function () {

    if (!window._auditProcessing)
        window._auditProcessing = false;

    /* ========================
       Cálculo de auditoría
       ======================== */
    function calcularAuditoria() {

        const ingresosEl = document.getElementById("ingresos");
        const gastosEl = document.getElementById("gastos");
        const tasaEl = document.getElementById("impuesto");
        const resultadoEl = document.getElementById("resultado");

        if (!ingresosEl || !gastosEl || !tasaEl || !resultadoEl) {
            mostrarAviso("Error interno: elementos no encontrados.");
            return;
        }

        if (
            ingresosEl.value.trim() === "" ||
            gastosEl.value.trim() === "" ||
            tasaEl.value.trim() === ""
        ) {
            mostrarAviso("Por favor completa todos los campos antes de calcular los impuestos.");
            resultadoEl.value = "";
            return;
        }

        const ingresos = parseFloat(ingresosEl.value) || 0;
        const gastos = parseFloat(gastosEl.value) || 0;
        const tasa = parseFloat(tasaEl.value) || 0;

        const baseImponible = ingresos - gastos;
        const impuestoCalculado = baseImponible * (tasa / 100);

        if (ingresos >= gastos) {
            resultadoEl.value = `Impuesto a pagar: $${impuestoCalculado.toFixed(2)}`;
        } else {
            resultadoEl.value = `Saldo a favor: $${(impuestoCalculado * -1).toFixed(2)}`;
        }
    }

    window.calcularAuditoria = calcularAuditoria;

    /* ==============================
       Validar campos antes de finalizar
       ============================== */
    function validarCamposAntesDeFinalizar() {

        const ingresosEl = document.getElementById("ingresos");
        const gastosEl = document.getElementById("gastos");
        const tasaEl = document.getElementById("impuesto");
        const comentariosEl = document.getElementById("comentarios");
        const resultadoEl = document.getElementById("resultado");

        const required = [ingresosEl, gastosEl, tasaEl];

        required.forEach(r => { if (r) r.style.border = ""; });
        if (comentariosEl) comentariosEl.style.border = "";

        for (const el of required) {
            if (!el || el.value.trim() === "" || comentariosEl.value.trim() === "") {
                if (el) el.style.border = "2px solid red";
                return { ok: false, reason: "faltan_campos" };
            }
        }

        if (!resultadoEl || resultadoEl.value.trim() === "") {
            return { ok: false, reason: "sin_resultado" };
        }

        return { ok: true };
    }

    function setButtonsDisabled(disabled) {
        const btnTerminar = document.querySelector(".accept");
        const btnPausar = document.querySelector(".reject");

        if (btnTerminar) btnTerminar.disabled = disabled;
        if (btnPausar) btnPausar.disabled = disabled;
    }

    /* ==============================
       Finalizar auditoría
       ============================== */
    async function finalizarAuditoria() {

        if (window._auditProcessing) {
            console.log("Proceso ya en ejecución. Ignorando nuevo click.");
            return;
        }

        const valid = validarCamposAntesDeFinalizar();

        if (!valid.ok) {
            if (valid.reason === "faltan_campos") {
                await mostrarAviso("Por favor completa todos los campos antes de terminar la auditoría.");
            } else if (valid.reason === "sin_resultado") {
                await mostrarAviso("Primero debes calcular los impuestos antes de finalizar la auditoría.");
            } else {
                await mostrarAviso("Campos incompletos.");
            }
            return;
        }

        const confirmar = await mostrarConfirmacion("¿Seguro que deseas terminar la auditoría?");
        if (!confirmar) {
            await mostrarAviso("Operación cancelada. La auditoría no se guardó.");
            return;
        }

        mostrarCargando();
        window._auditProcessing = true;
        setButtonsDisabled(true);

        try {

            const comentarios = document.getElementById("comentarios").value.trim();
            const ingresos = document.getElementById("ingresos").value;
            const gastos = document.getElementById("gastos").value;
            const tasa = document.getElementById("impuesto").value;
            const resultado = document.getElementById("resultado").value;

            const urlParams = new URLSearchParams(window.location.search);
            const idSolicitud = urlParams.get("idSolicitud") || urlParams.get("id");

            if (!idSolicitud) {
                await mostrarAviso("No se pudo identificar la solicitud/proceso actual.");
                return;
            }

            /* 3.1 Actualizar observaciones */
            const respObs = await fetch("PHP/Produccion/actualizarObservaciones.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idProceso: idSolicitud,
                    observaciones: comentarios
                })
            });

            let dataObs;

            try {
                dataObs = await respObs.json();

                if (dataObs.success) {
                    ocultarCargando();
                } else {
                    ocultarCargando();
                    await mostrarAviso("No sucess del dataObs");
                }

            } catch (e) {
                const txt = await respObs.text();
                console.error("Respuesta no-JSON actualizarObservaciones:", txt);
                throw new Error("Respuesta inválida del servidor (observaciones).");
            }

            if (!dataObs.success) {
                throw new Error("Error al actualizar observaciones: " + (dataObs.message || "desconocido"));
            }

            /* 3.2 Generar reporte PDF */
            mostrarCargando();

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
                await mostrarAviso("✅ Auditoría finalizada y reporte generado correctamente.");
                ocultarCargando();
            } else {
                await mostrarCargando("❌ Error al generar el reporte: " + data2.message);
                ocultarCargando();
            }

            /* 3.3 Registrar fecha_fin */
            mostrarCargando();

            const respFecha = await fetch("PHP/Produccion/finalizarProceso.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    idSolicitud: idSolicitud,
                    observaciones: comentarios
                })
            });

            let dataFecha;

            try {
                dataFecha = await respFecha.json();
            } catch (e) {
                const txt = await respFecha.text();
                console.error("Respuesta no-JSON finalizarProceso:", txt);
                throw new Error("Respuesta no válida del servidor (finalizarProceso).");
            }

            if (!dataFecha.success) {
                ocultarCargando();
                throw new Error("Error al registrar fecha_fin: " + (dataFecha.message || "desconocido"));
            }

            /* 3.3 Actualizar estado de solicitud */
            mostrarCargando();

            const respAct = await fetch("PHP/Solicitud/actualizarEstado.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: idSolicitud,
                    estado: "Terminada"
                })
            });

            let dataAct;

            try {
                dataAct = await respAct.json();
            } catch (e) {
                const txt = await respAct.text();
                console.error("Respuesta no-JSON actualizarEstado:", txt);
                throw new Error("Respuesta inválida del servidor (actualizarEstado).");
            }

            if (!dataAct.success) {
                ocultarCargando();
                throw new Error("Error al actualizar estado de solicitud: " + (dataAct.message || "desconocido"));
            }

            try {
                localStorage.removeItem("solicitudEnProceso");
            } catch (e) { }

            await mostrarAviso("✅ Auditoría finalizada y reporte generado correctamente.");

            window.location.href = "panel-auditor.html";

        } catch (err) {

            console.error("Error en finalizarAuditoria:", err);
            await mostrarAviso("Ocurrió un error: " + (err.message || err));

        } finally {

            window._auditProcessing = false;
            setButtonsDisabled(false);

        }
    }

    window.finalizarAuditoria = finalizarAuditoria;

    /* =========================
       Pausar auditoría
       ========================= */
    async function pausarAuditoria() {

        if (window._auditProcessing) {
            console.log("Otro proceso en ejecución. Ignorando pausa.");
            return;
        }

        const confirmar = await mostrarConfirmacion("¿Seguro que deseas pausar la auditoría?");
        if (!confirmar) {
            await mostrarAviso("Operación cancelada. La auditoría no se pausó.");
            return;
        }

        try {

            mostrarCargando();
            window._auditProcessing = true;
            setButtonsDisabled(true);

            const comentarios = document.getElementById("comentarios").value.trim();

            const params = new URLSearchParams(window.location.search);
            const idSolicitud = params.get("idSolicitud") || params.get("id");

            const resp = await fetch("PHP/Produccion/actualizarObservaciones.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idProceso: idSolicitud,
                    observaciones: comentarios
                })
            });

            const data = await resp.json();

            if (!data.success) {
                throw new Error(data.message || "Error guardando observaciones");
            }

            const respEstado = await fetch("PHP/Solicitud/actualizarEstado.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: idSolicitud,
                    estado: "Pausada"
                })
            });

            const dataEstado = await respEstado.json();

            if (!dataEstado.success) {
                throw new Error("No se pudo pausar la solicitud: " + (dataEstado.message || ""));
            }

            try {
                localStorage.removeItem("solicitudEnProceso");
            } catch (e) { }

            if (dataEstado.success) {
                ocultarCargando();
                await mostrarAviso("⏸️ Auditoría pausada. Observaciones guardadas correctamente.");
                window.location.href = "panel-auditor.html";
            }

        } catch (e) {
            console.error("Error pausarAuditoria:", e);
            await mostrarAviso("Error al pausar la auditoría: " + (e.message || ""));

        } finally {

            window._auditProcessing = false;
            setButtonsDisabled(false);

        }
    }

    window.pausarAuditoria = pausarAuditoria;

    /* =========================
       Conexión de eventos
       ========================= */
    document.addEventListener("DOMContentLoaded", () => {

        const btnTerminar = document.querySelector(".accept");
        const btnPausar = document.querySelector(".reject");

        if (btnTerminar) btnTerminar.addEventListener("click", finalizarAuditoria);
        if (btnPausar) btnPausar.addEventListener("click", pausarAuditoria);

    });

})();

/* ===================================================
   Código para procesodatos.js
   =================================================== */

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

function mostrarAviso(mensaje) {
    return new Promise(resolve => {

        const overlay = document.getElementById("modalConfirmacion");
        const mensajeEl = document.getElementById("modalMensaje");
        const titulo = document.getElementById("tituloModal");
        const btnAceptar = document.getElementById("btnAceptarModal");
        const btnCancelar = document.getElementById("btnCancelarModal");

        titulo.textContent = "Aviso";
        mensajeEl.textContent = mensaje;

        btnCancelar.style.display = "none";

        setSubmitButtonDisabled(true);

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

        setSubmitButtonDisabled(true);

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

        setTimeout(() => {
            try { btnAceptar.focus(); } catch (e) { }
        }, 10);
    });
}

document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);
    let idSolicitud = params.get("idSolicitud") || params.get("id");

    if (!idSolicitud) {
        const idGuardado = localStorage.getItem("solicitudEnProceso");
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

    const btnTerminar = document.querySelector(".accept");
    const btnPausar = document.querySelector(".reject");
    const btnTrabajar = document.querySelector(".start");
    const inputObs = document.getElementById("observaciones");

    mostrarPDF();

    /* ============================
       Mostrar PDF asociado
       ============================ */
    async function mostrarPDF() {
        try {

            console.log("🧩 Solicitando PDF para id:", idSolicitud);

            const res = await fetch(
                `PHP/Solicitud/obtenerSolicitud.php?id=${encodeURIComponent(idSolicitud)}`,
                { credentials: "include", cache: "no-store" }
            );

            if (!res.ok) throw new Error("Error HTTP al obtener solicitud");

            const data = await res.json();

            if (!data || !data.success || !data.solicitud) {
                console.error("Respuesta JSON inválida:", data);
                mostrarAviso("No se pudo cargar el PDF de la solicitud.");
                return;
            }

            const s = data.solicitud;

            console.log("📄 Nombre del PDF:", s.nombrePDF);

            const pdfData = extractPdfBase64Field(
                s.archivo || s.archivoPDF || s.pdfBase64 || ""
            );

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

    /* ============================
       Auxiliar: Extraer Base64 PDF
       ============================ */
    function extractPdfBase64Field(value) {

        if (!value) return null;

        if (value.includes("data:application/pdf;base64,")) {
            const payload = value.split("data:application/pdf;base64,")[1];

            try {
                const decoded = atob(payload);

                if (decoded.startsWith("data:application/pdf;base64,")) {
                    return {
                        type: "base64payload",
                        payload: decoded.split("data:application/pdf;base64,")[1]
                    };
                }
            } catch { }

            return { type: "base64payload", payload };
        }

        try {
            const decoded = atob(value);

            if (decoded.startsWith("data:application/pdf;base64,")) {
                return {
                    type: "base64payload",
                    payload: decoded.split("data:application/pdf;base64,")[1]
                };
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

    /* =====================================
       Auxiliar: Crear Blob URL de base64 PDF
       ===================================== */
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

    /* ===============================
       Actualizar estado de solicitud
       =============================== */
    async function actualizarEstado(estado) {
        try {

            mostrarCargando();

            const res = await fetch("PHP/Solicitud/actualizarEstado.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: idSolicitud, estado })
            });

            const data = await res.json();

            if (data.success) {
                ocultarCargando();
                mostrarAviso(`✅ Solicitud marcada como "${estado}".`);

                if (estado === "Entregada" || estado === "Pausada") {
                    localStorage.removeItem("solicitudEnProceso");
                }
            }

        } catch (err) {

            console.error("Error actualizarEstado:", err);
            await mostrarAviso("Error al actualizar estado de solicitud.");

        }
    }

});
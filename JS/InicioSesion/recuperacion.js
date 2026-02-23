class Recuperacion {
  constructor() {
    this.apiEnviarToken = "PHP/enviar_token.php";
    this.apiProcesar = "PHP/procesarcontra.php";
  }

  // 🟢 Generar token y enviar correo
  async generarTokenRecuperacion(email) {
    if (!email || typeof email !== "string") {
      mostrarMensajeForm("mensajeRecupera", "Por favor, ingresa tu correo electrónico.", "error");
      return;
    }

    email = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      mostrarMensajeForm("mensajeRecupera", "Introduce un correo válido.", "error");
      return;
    }

    try {
      const res = await fetch(this.apiEnviarToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      console.log("HTTP:", res.status);
      const text = await res.text();
      console.log("Respuesta cruda:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("❌ Error JSON:", err);
        mostrarMensajeForm("mensajeRecupera", "Error del servidor: respuesta no válida.", "error");
        return;
      }

      if (data.success) {
        mostrarMensajeForm("mensajeRecupera", "✅ Se ha enviado un enlace de recuperación a tu correo.", "exito");
        const input = document.getElementById("emailrecupera");
        if (input) input.value = "";
      } else {
        mostrarMensajeForm("mensajeRecupera", "⚠️ " + (data.msg || "Ocurrió un error al enviar el correo."), "error");
      }
    } catch (error) {
      console.error("🚨 Error de red:", error);
      mostrarMensajeForm("mensajeRecupera", "No se pudo conectar con el servidor.", "error");
    }
  }

  // 🔵 Restablecer contraseña
  async restablecerContraseña(token, nuevaPass) {
    if (!token || !nuevaPass) {
      mostrarMensajeForm("mensajeReset", "Por favor, completa todos los campos.", "error");
      return;
    }

    try {
      const res = await fetch(this.apiProcesar, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: nuevaPass }),
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("❌ Error parseando JSON:", err);
        mostrarMensajeForm("mensajeReset", "Respuesta del servidor no válida.", "error");
        return;
      }

      if (data.success) {
        mostrarMensajeForm("mensajeReset", "🔐 Contraseña restablecida correctamente.", "exito");
        setTimeout(() => (window.location.href = "index.html"), 2000);
      } else {
        mostrarMensajeForm("mensajeReset", "⚠️ " + (data.msg || "No se pudo restablecer la contraseña."), "error");
      }
    } catch (error) {
      console.error("🚨 Error de red:", error);
      mostrarMensajeForm("mensajeReset", "No se pudo conectar con el servidor.", "error");
    }
  }
}

/********** FUNCION PARA MOSTRAR MENSAJES (dentro del HTML) **********/
function mostrarMensajeForm(idContenedor, mensaje, tipo = "error") {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) {
    console.warn("mostrarMensajeForm: no existe el contenedor", idContenedor);
    return;
  }

  // Evitar repetir el mismo mensaje
  if (contenedor.textContent === mensaje) return;

  contenedor.className = "mensaje-form " + tipo;
  contenedor.textContent = mensaje;
  contenedor.classList.remove("oculto");
}

// =====================
// MANEJO DE FORMULARIOS
// =====================
document.addEventListener("DOMContentLoaded", () => {
  const rec = new Recuperacion();

  const recoverForm = document.getElementById("recoverForm");
  if (recoverForm) {
    recoverForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("emailrecupera").value.trim();
      await rec.generarTokenRecuperacion(email);
    });
  }

  const resetForm = document.getElementById("resetForm");
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = document.getElementById("token").value.trim();
      const nuevaPass = document.getElementById("nuevaPass").value.trim();
      await rec.restablecerContraseña(token, nuevaPass);
    });
  }
});

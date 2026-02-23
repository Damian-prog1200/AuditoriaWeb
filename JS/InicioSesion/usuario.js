// =====================
// CLASE USUARIO
// =====================
class Usuario {
  constructor(
    idUsuario = null,
    nombre = "",
    email = "",
    password = "",
    rfc = "",
    rol = "Cliente"
  ) {
    this.idUsuario = idUsuario;
    this.nombre = nombre;
    this.email = email;
    this.password = password;
    this.rfc = (rfc || "").toUpperCase();
    this.rol = rol;
  }

  // 🟢 Registro
  async registrar() {
    if (!this.nombre || !this.email || !this.password || !this.rfc) {
      mostrarMensajeForm(
        "mensajeForm",
        "⚠️ Por favor, llena todos los campos.",
        "advertencia"
      );
      console.warn("🚫 Faltan datos obligatorios.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      mostrarMensajeForm(
        "mensajeForm",
        "⚠️ El correo electrónico no tiene un formato válido.",
        "advertencia"
      );
      console.warn("🚫 Correo no válido:", this.email);
      return;
    }

    const existe = await this.verificarRegistro(this.email);
    if (existe) {
      mostrarMensajeForm(
        "mensajeForm",
        "⚠️ Ya existe una cuenta con ese correo electrónico.",
        "advertencia"
      );
      return;
    }

    // RFC persona física: 4 letras, 6 números fecha, 3 homoclave
    const rfcRegex = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i;
    if (!rfcRegex.test(this.rfc)) {
      mostrarMensajeForm(
        "mensajeForm",
        "⚠️ El RFC no cumple con el formato oficial.",
        "advertencia"
      );
      console.warn("🚫 RFC no válido:");
      return;
    }

    try {
      const res = await fetch("PHP/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: this.nombre,
          email: this.email,
          password: this.password,
          rfc: this.rfc,
          rol: this.rol,
        }),
        credentials: "include",
      });

      // Verificar respuesta HTTP
      if (!res.ok) {
        mostrarMensajeForm(
          "mensajeForm",
          "❌ Error al conectar con el servidor.",
          "error"
        );
        return;
      }

      // Intentar parsear JSON
      let data;
      try {
        data = await res.json();
      } catch (err) {
        console.error("❌ Error parseando JSON:", err);
        mostrarMensajeForm(
          "mensajeForm",
          "❌ Respuesta no válida del servidor.",
          "error"
        );
        return;
      }

      // --- Manejo de respuestas ---
      if (data.success) {
        mostrarMensajeForm("mensajeForm", "✅ " + data.msg, "exito");
        console.log("🎉 Registro exitoso, redirigiendo...");

        // Espera 2 segundos antes de redirigir, para que el usuario vea el mensaje
        setTimeout(() => {
          window.location.href = data.redirect || "index.html";
        }, 2000);

        return; // Termina la función aquí
      }

      // ❌ Si no fue exitoso
      switch (data.error) {
        case "faltan_datos":
          mostrarMensajeForm(
            "mensajeForm",
            "⚠️ Faltan datos obligatorios.",
            "advertencia"
          );
          break;
        case "rfc_invalido":
          mostrarMensajeForm(
            "mensajeForm",
            "⚠️ El RFC no es válido (formato incorrecto).",
            "advertencia"
          );
          break;
        case "servidor":
          mostrarMensajeForm(
            "mensajeForm",
            "❌ Error interno del servidor.",
            "error"
          );
          break;
        default:
          mostrarMensajeForm(
            "mensajeForm",
            "❌ " + (data.msg || "Error desconocido al registrar."),
            "error"
          );
      }

      // 🔁 Redirección si el servidor lo indica
      if (data.redirect) {
        console.log("🔁 Redirigiendo según el servidor...");
        setTimeout(() => (window.location.href = data.redirect), 1500);
      }
    } catch (error) {
      console.error("🚨 Error al registrar:", error);
      mostrarMensajeForm(
        "mensajeForm",
        "❌ No se pudo conectar con el servidor.",
        "error"
      );
    }
  }

  // 🔵 Inicio de sesión
  async iniciarSesion(email, password) {
    // Validaciones iniciales
    if (!email || !password) {
      mostrarMensajeForm(
        "mensajeLogin",
        "⚠️ Por favor, llena todos los campos.",
        "advertencia"
      );
      return;
    }

    try {
      // Petición al servidor
      const res = await fetch("PHP/iniciosesion.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      // Verificar respuesta HTTP
      if (!res.ok) {
        mostrarMensajeForm(
          "mensajeLogin",
          "❌ Error de conexión con el servidor.",
          "error"
        );
        return;
      }

      // Intentar parsear el JSON
      let data;
      try {
        data = await res.json();
      } catch (err) {
        console.error("❌ Error parseando JSON:", err);
        mostrarMensajeForm(
          "mensajeLogin",
          "❌ Respuesta no válida del servidor.",
          "error"
        );
        return;
      }

      // --- Manejo de respuestas ---
      if (data.success) {
        mostrarMensajeForm("mensajeLogin", "✅ " + data.msg, "exito");
        console.log("🎉 Inicio de sesión exitoso");

        setTimeout(() => {
          switch (data.rol) {
            case "Cliente":
              window.location.href = "panel-cliente.html";
              break;
            case "Auditor":
              window.location.href = "panel-auditor.html";
              break;
            default:
              window.location.href = "index.html";
          }
        }, 1000);

        return;
      }

      // ❌ Solo entra aquí si no fue exitoso
      switch (data.error) {
        case "correo":
          mostrarMensajeForm(
            "mensajeLogin",
            "📧 El correo no existe en el sistema.",
            "error"
          );
          break;
        case "password":
          mostrarMensajeForm(
            "mensajeLogin",
            "🔒 La contraseña es incorrecta.",
            "error"
          );
          break;
        case "faltan_datos":
          mostrarMensajeForm(
            "mensajeLogin",
            "⚠️ Ingresa ambos campos: correo y contraseña.",
            "advertencia"
          );
          break;
        default:
          mostrarMensajeForm(
            "mensajeLogin",
            "❌ " + (data.msg || "Credenciales inválidas."),
            "error"
          );
      }
    } catch (error) {
      console.error("🚨 Error en iniciarSesion:", error);
      mostrarMensajeForm(
        "mensajeLogin",
        "❌ No se pudo conectar con el servidor.",
        "error"
      );
    }
  }

  async verificarRegistro(email) {
    if (!email) {
      mostrarMensajeForm(
        "mensajeLogin",
        "Por favor, ingresa un correo electrónico.",
        "advertencia"
      );
      return false;
    }

    try {
      const res = await fetch("PHP/verificar_usuario.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      return data.existe === true;
    } catch (error) {
      console.error("🚨 Error verificando existencia:", error);
      mostrarMensajeForm(
        "mensajeLogin",
        "No se pudo verificar el usuario.",
        "error"
      );
      return false;
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

// =====================
// MANEJO AUTOMÁTICO DE FORMULARIOS
// =====================
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nombre = document.getElementById("nombre").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const rfc = document.getElementById("rfc").value.trim();

      const nUsuario = new Usuario(null, nombre, email, password, rfc);
      await nUsuario.registrar();
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      const usuario = new Usuario();
      await usuario.iniciarSesion(email, password);
    });
  }
});

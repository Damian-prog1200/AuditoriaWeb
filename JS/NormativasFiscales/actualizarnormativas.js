const API_URL = "PHP/Normativas/obtenernormativa.php";

document.addEventListener("DOMContentLoaded", async () => {
  // Recuperar datos desde localStorage
  const normativaGuardada = localStorage.getItem("normativaEditar");
  if (!normativaGuardada) {
    mostrarMensajeForm(
      "mensajeForm",
      "⚠️ No se seleccionó ninguna normativa para editar.",
      "error"
    );
    return;
  }

  const normativa = JSON.parse(normativaGuardada);
  const { idNorma, nombre, descripcion } = normativa;

  // Intentar obtener info actualizada desde el servidor
  try {
    const resp = await fetch(`${API_URL}?id=${encodeURIComponent(idNorma)}`);
    const data = await resp.json();

    if (data.success && data.normativa) {
      llenarFormulario(data.normativa);
    } else {
      // Si no hay respuesta, usamos la info guardada
      llenarFormulario(normativa);
      mostrarMensajeForm(
        "mensajeForm",
        "⚠️ No se pudo obtener información actualizada, mostrando datos locales.",
        "aviso"
      );
    }
  } catch (error) {
    console.warn(
      "⚠️ No se pudo conectar con el servidor. Usando datos locales."
    );
    llenarFormulario(normativa);
    mostrarMensajeForm(
      "mensajeForm",
      "⚠️ Conexión fallida, se usan datos locales.",
      "aviso"
    );
  }

  // Enviar cambios
  document
    .getElementById("formEditar")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      await actualizarNormativa();
    });
});

function llenarFormulario(normativa) {
  document.getElementById("idNorma").value = normativa.idNorma || "";
  document.getElementById("nombreNorma").value = normativa.nombre || "";
  document.getElementById("descripcion").value = normativa.descripcion || "";
}

async function actualizarNormativa() {
  const idNorma = document.getElementById("idNorma").value;
  const nombre = document.getElementById("nombreNorma").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const archivo = document.getElementById("archivo").files[0];

  if (!nombre || !descripcion) {
    mostrarMensajeForm(
      "mensajeForm",
      "⚠️ Por favor, completa todos los campos obligatorios.",
      "error"
    );
    return;
  }

  if (archivo) {
    const extension = archivo.name.split(".").pop().toLowerCase();
    if (extension !== "pdf") {
      mostrarMensajeForm(
        "mensajeForm",
        "❌ Solo se permiten archivos en formato PDF.",
        "error"
      );
      return;
    }
  }
  const formData = new FormData();
  formData.append("idNorma", idNorma);
  formData.append("nombre", nombre);
  formData.append("descripcion", descripcion);
  if (archivo) formData.append("archivo", archivo);

  try {
    const respuesta = await fetch("PHP/Normativas/actualizarnormativas.php", {
      method: "POST",
      body: formData,
    });

    const data = await respuesta.json();

    if (data.success) {
      mostrarMensajeForm(
        "mensajeForm",
        "✅ Normativa actualizada correctamente.",
        "exito"
      );
      setTimeout(() => {
        localStorage.removeItem("normativaEditar");
        window.location.href = "vernormativas.html";
      }, 1500);
    } else {
      mostrarMensajeForm(
        "mensajeForm",
        "❌ " + (data.msg || "Error al actualizar."),
        "error"
      );
    }
  } catch (error) {
    console.error("Error al actualizar:", error);
    mostrarMensajeForm(
      "mensajeForm",
      "❌ Error en la conexión con el servidor.",
      "error"
    );
  }
}

// 📣 Nueva función unificada para mostrar mensajes
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

// URL base de tu backend PHP
const API_URL = "PHP/Normativas/listarnormativas.php";

// ===========================================================
// 🔹 EVENTO PRINCIPAL - CARGA DE PÁGINA
// ===========================================================
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  // 🟡 Configurar menú superior
  inicializarMenuUsuario();

  // 🟢 Página: vernormativas.html
  if (path.includes("vernormativas.html")) {
    cargarNormativas();
    const btnAgregar = document.getElementById("btnAgregar");
    if (btnAgregar) btnAgregar.addEventListener("click", irACargaNormativas);
  }

  // 🟣 Página: carganormativas.html
  if (path.includes("carganormativas.html")) {
    const form = document.getElementById("formSubida");
    if (form) form.addEventListener("submit", guardarNormativa);
  }

  // 🟣 Botón para ir a la página de actualización
  const btnActualizar = document.getElementById("btnModificar");
  if (btnActualizar)
    btnActualizar.addEventListener("click", irAActualizarNormativas);
});

// ===========================================================
// 🔹 MENÚ DE USUARIO (Opciones y Cerrar sesión)
// ===========================================================
function inicializarMenuUsuario() {
  const menuBtn = document.getElementById("menuBtn");
  const menuContent = document.getElementById("menuContent");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!menuBtn || !menuContent || !logoutBtn) return;

  // 🟢 Mostrar / ocultar el menú
  menuBtn.addEventListener("click", () => {
    const isVisible = menuContent.style.display === "block";
    document.querySelectorAll(".dropdown-content").forEach((menu) => {
      menu.style.display = "none"; // cierra otros menús si hay
    });
    menuContent.style.display = isVisible ? "none" : "block";
  });

  // ⚪ Ocultar si se hace clic fuera del menú
  document.addEventListener("click", (e) => {
    if (!menuBtn.contains(e.target) && !menuContent.contains(e.target)) {
      menuContent.style.display = "none";
    }
  });

  // 🔴 Cerrar sesión
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("PHP/desconexion.php", { method: "POST" });
      if (response.ok) {
        window.location.href = "index.html";
      } else {
        alert("⚠️ Error al cerrar sesión. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  });
}

// ===========================================================
// 🔹 Cargar listado de normativas desde la base de datos
// ===========================================================
async function cargarNormativas() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    const lista = document.getElementById("listaNormas");
    lista.innerHTML = "";

    if (data.success && data.normativas.length > 0) {
      data.normativas.forEach((norma) => {
        const li = document.createElement("li");
        li.innerHTML = `
    <strong>${norma.nombre}</strong><br>
    <em>${norma.descripcion || "Sin descripción"}</em><br>
    <button id="btnVerPDF_${norma.idNorma}" class="btn-ver-pdf"
      onclick="verPDF('${norma.archivo}', 'btnVerPDF_${norma.idNorma}')">
      📄 Ver PDF
    </button>
    <button class="btn-modificar"
      onclick="modificarNormativa(
        '${norma.idNorma}',
        decodeURIComponent('${encodeURIComponent(norma.nombre)}'),
        decodeURIComponent('${encodeURIComponent(norma.descripcion || "")}'),
        decodeURIComponent('${encodeURIComponent(norma.archivo)}')
      )">
      ✏️ Modificar
    </button>
  `;
        lista.appendChild(li);
      });
    } else {
      lista.innerHTML = "<li>No hay normativas registradas.</li>";
    }
  } catch (error) {
    console.error("Error al cargar normativas:", error);
  }
}

// ===========================================================
// 🔹 Redirigir a la página de carga de normativas
// ===========================================================
function irACargaNormativas() {
  window.location.href = "carganormativas.html";
}

// ===========================================================
// 🔹 Redirigir a la página de actualización de normativas
// ===========================================================
function irAActualizarNormativas() {
  window.location.href = "actualizarnormativas.html";
}

// ===========================================================
// 🔹 Ver PDF en el iframe del visor
// ===========================================================
let pdfVisible = false;
let pdfActual = null;
let ultimoBotonId = null;

async function verPDF(nombreArchivo, botonId) {
  const visorContainer = document.getElementById("visorContainer");
  const visor = document.getElementById("visor");
  const boton = document.getElementById(botonId);

  if (!visorContainer || !visor) {
    console.error("No se encontró visorContainer o iframe#visor en el DOM.");
    alert("Error interno: visor no encontrado.");
    return;
  }
  if (!boton) {
    console.error("No se encontró el botón con id:", botonId);
    return;
  }
  if (!nombreArchivo) {
    alert("⚠️ No se indicó nombre de archivo PDF.");
    return;
  }

  // 1) Toggle rápido: si ya está visible el MISMO PDF -> ocultar y restaurar texto
  if (pdfVisible && pdfActual === nombreArchivo) {
    visorContainer.classList.remove("visible");
    visorContainer.style.display = "none";
    visor.src = "";
    pdfVisible = false;
    pdfActual = null;

    boton.textContent = "📄 Ver PDF";
    ultimoBotonId = null;
    return;
  }

  // 2) Si había otro PDF abierto -> restaurar texto del botón anterior
  if (ultimoBotonId && ultimoBotonId !== botonId) {
    const btnPrev = document.getElementById(ultimoBotonId);
    if (btnPrev) btnPrev.textContent = "📄 Ver PDF";
  }

  // 3) Intentaremos varias rutas posibles hasta que una responda OK
  const candidates = [
    `PHP/uploads/${nombreArchivo}`,
    `./PHP/uploads/${nombreArchivo}`,
    `../PHP/uploads/${nombreArchivo}`,
    `/PHP/uploads/${nombreArchivo}`, // raíz del servidor
    `${window.location.origin}/PHP/uploads/${nombreArchivo}`,
    // ruta relativa a la carpeta actual del HTML (por si el HTML está en subcarpeta)
    `${window.location.origin}${window.location.pathname.replace(
      /\/[^\/]*$/,
      ""
    )}/PHP/uploads/${nombreArchivo}`,
  ];

  let found = null;
  for (const path of candidates) {
    try {
      // hacemos HEAD para no descargar el PDF entero, solo comprobar existencia
      const res = await fetch(path, { method: "HEAD" });
      if (res.ok) {
        found = path;
        break;
      }
    } catch (err) {
      // ignora errores de red y prueba siguiente candidato
    }
  }

  if (!found) {
    console.error(
      "No se encontró el archivo en ninguna ruta probada. Intentadas:",
      candidates
    );
    alert(
      "No se pudo localizar el PDF en el servidor. Revisa la ruta/ubicación de uploads."
    );
    // restaurar texto del botón por seguridad
    boton.textContent = "📄 Ver PDF";
    return;
  }

  // 4) Asignar src al iframe y mostrar visor
  visor.src = found;
  visorContainer.style.display = "block";
  // opcional: añadir clase visible para animaciones CSS
  visorContainer.classList.add("visible");

  // marcar estado
  pdfVisible = true;
  pdfActual = nombreArchivo;
  ultimoBotonId = botonId;

  // feedback en botón mientras carga
  boton.textContent = "⏳ Cargando...";
  boton.disabled = true;

  // 5) eventos de carga / error
  const onLoad = () => {
    boton.textContent = "Ocultar PDF";
    boton.disabled = false;
    // limpiar handlers para evitar duplicados si se llama varias veces
    visor.removeEventListener("load", onLoad);
    visor.removeEventListener("error", onError);
  };
  const onError = () => {
    console.error("Error cargando PDF desde:", found);
    visorContainer.classList.remove("visible");
    visorContainer.style.display = "none";
    visor.src = "";
    pdfVisible = false;
    pdfActual = null;
    boton.textContent = "📄 Ver PDF";
    boton.disabled = false;
    ultimoBotonId = null;
    alert(
      "Error al cargar el PDF desde el servidor. Revisa permisos o existencia del archivo."
    );
    visor.removeEventListener("load", onLoad);
    visor.removeEventListener("error", onError);
  };

  visor.addEventListener("load", onLoad);
  visor.addEventListener("error", onError);
}

// ===========================================================
// 🔹 Guardar nueva normativa en la base de datos
// ===========================================================
async function guardarNormativa(e) {
  e.preventDefault();

  const nombre = document.getElementById("nombreNorma").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const archivo = document.getElementById("archivo").files[0];

  if (!nombre || !descripcion || !archivo) {
    mostrarMensajeForm(
      "msgForm",
      "⚠️ Todos los campos son obligatorios.",
      "error"
    );
    return;
  }

  const extension = archivo.name.split(".").pop().toLowerCase();
  if (extension !== "pdf") {
    mostrarMensajeForm(
      "msgForm",
      "❌ Solo se permiten archivos en formato PDF.",
      "error"
    );
    return;
  }

  const formData = new FormData();
  formData.append("nombre", nombre);
  formData.append("descripcion", descripcion);
  formData.append("archivo", archivo);

  try {
    // 🔧 IMPORTANTE: usa la URL exacta de tu script PHP
    const response = await fetch("PHP/Normativas/enviarnormativas.php", {
      method: "POST",
      body: formData,
    });

    const texto = await response.text();
    console.log("📩 Respuesta cruda del servidor:", texto);

    let data;
    try {
      data = JSON.parse(texto);
    } catch {
      data = null;
    }

    if (!data) {
      console.error("Respuesta no válida del servidor.");
      mostrarMensajeForm(
        "msgForm",
        "❌ Error: respuesta no válida del servidor.",
        "error"
      );
      return;
    }

    if (data.success) {
      mostrarMensajeForm(
        "msgForm",
        "✅ Normativa guardada correctamente.",
        "exito"
      );
      setTimeout(() => (window.location.href = "vernormativas.html"), 1500);
    } else {
      mostrarMensajeForm(
        "msgForm",
        "❌ Error al guardar: " + data.msg,
        "error"
      );
    }
  } catch (error) {
    console.error("Error al guardar normativa:", error);
    mostrarMensajeForm(
      "msgForm",
      "❌ Error de conexión con el servidor.",
      "error"
    );
  }
}

// ===========================================================
// 🔹 Redirigir a la página de edición con los datos cargados
// ===========================================================
function modificarNormativa(id, nombre, descripcion, archivo) {
  // Guarda los datos en localStorage
  localStorage.setItem(
    "normativaEditar",
    JSON.stringify({ id, nombre, descripcion, archivo })
  );

  // Redirige a la página de actualización
  window.location.href = "actualizarnormativas.html";
}

// ===========================================================
// 🔹 FUNCIÓN GLOBAL PARA MOSTRAR MENSAJES EN FORMULARIOS
// ===========================================================
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

function modificarNormativa(idNorma, nombre, descripcion, archivo) {
  // Guardamos los datos en localStorage
  const normativa = {
    idNorma,
    nombre,
    descripcion,
    archivo,
  };

  localStorage.setItem("normativaEditar", JSON.stringify(normativa));

  // Redirigimos a la página de edición
  window.location.href = "actualizarnormativas.html";
}

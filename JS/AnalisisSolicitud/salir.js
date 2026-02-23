document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const menuContent = document.getElementById("menuContent");
  const logoutBtn = document.getElementById("logoutBtn");

  // 🟢 Mostrar / ocultar el menú
  menuBtn.addEventListener("click", () => {
    const isVisible = menuContent.style.display === "block";
    document.querySelectorAll(".dropdown-content").forEach(menu => {
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
});
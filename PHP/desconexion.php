<?php
session_start();

// Destruir todas las variables de sesión
$_SESSION = [];

// Destruir la sesión
session_destroy();

// Enviar respuesta JSON (para fetch)
header("Content-Type: application/json");
echo json_encode(["success" => true, "msg" => "Sesión cerrada correctamente."]);
exit;
?>

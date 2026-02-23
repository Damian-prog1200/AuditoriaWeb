<?php
header("Content-Type: application/json");
require_once "conexion.php";

$data = json_decode(file_get_contents("php://input"), true);
$token = $data["token"] ?? "";
$nuevaPass = $data["password"] ?? "";

if (!$token || !$nuevaPass) {
  echo json_encode(["success" => false, "msg" => "Faltan datos."]);
  exit;
}

// Buscar el token
$stmt = $conexion->prepare("SELECT email, expira FROM recuperaciones WHERE token = ?");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
  echo json_encode(["success" => false, "msg" => "Token inválido o inexistente."]);
  exit;
}

$row = $result->fetch_assoc();
$email = $row["email"];
$expira = strtotime($row["expira"]);

// Verificar expiración
if ($expira < time()) {
  $conexion->query("DELETE FROM recuperaciones WHERE token = '$token'");
  echo json_encode(["success" => false, "msg" => "El enlace ha expirado."]);
  exit;
}

// Hashear la nueva contraseña
$hash = password_hash($nuevaPass, PASSWORD_DEFAULT);

// Actualizar contraseña
$stmt = $conexion->prepare("UPDATE usuario SET contraseña = ? WHERE email = ?");
$stmt->bind_param("ss", $hash, $email);
$stmt->execute();

// Eliminar token usado
$stmt = $conexion->prepare("DELETE FROM recuperaciones WHERE token = ?");
$stmt->bind_param("s", $token);
$stmt->execute();

echo json_encode(["success" => true, "msg" => "Contraseña restablecida correctamente."]);
?>

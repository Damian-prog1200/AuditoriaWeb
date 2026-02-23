<?php
session_start();
include("../conexion.php");

$data = json_decode(file_get_contents("php://input"), true);
$idSolicitud = $data['idSolicitud'] ?? null;

if (!$idSolicitud) {
  echo json_encode(["success" => false, "msg" => "Falta el ID de la solicitud."]);
  exit;
}

$query = "UPDATE Solicitud SET estado = 'Cancelada' WHERE idSolicitud = ?";
$stmt = $conexion->prepare($query);
$stmt->bind_param("i", $idSolicitud);

if ($stmt->execute()) {
  echo json_encode(["success" => true, "msg" => "Solicitud cancelada correctamente."]);
} else {
  echo json_encode(["success" => false, "msg" => "Error al cancelar."]);
}
?>

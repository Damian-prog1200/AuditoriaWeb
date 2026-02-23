<?php
session_start();
include("../conexion.php");

$data = json_decode(file_get_contents("php://input"), true);
$idSolicitud = $data['idSolicitud'] ?? null;

if (!$idSolicitud) {
  echo json_encode(["success" => false, "msg" => "No se recibió el ID."]);
  exit;
}

$query = "DELETE FROM Solicitud WHERE idSolicitud = ?";
$stmt = $conexion->prepare($query);
$stmt->bind_param("i", $idSolicitud);

if ($stmt->execute()) {
  echo json_encode(["success" => true, "msg" => "Solicitud eliminada."]);
} else {
  echo json_encode(["success" => false, "msg" => "Error al eliminar solicitud."]);
}
?>

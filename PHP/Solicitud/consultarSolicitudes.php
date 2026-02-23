<?php
header('Content-Type: application/json');
session_start();
include_once("../conexion.php");

if (!isset($_SESSION['idUsuario'])) {
    echo json_encode(["success" => false, "msg" => "No hay sesión activa"]);
    exit;
}

$idUsuario = intval($_SESSION['idUsuario']);

$stmt = $conexion->prepare("SELECT idCliente FROM Cliente WHERE isUsuario = ?");
$stmt->bind_param("i", $idUsuario);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "msg" => "Cliente no encontrado."]);
    exit;
}
$idCliente = $res->fetch_assoc()['idCliente'];

$query = $conexion->prepare("SELECT idSolicitud, tipoServicio, estado FROM Solicitud WHERE idCliente = ?");
$query->bind_param("i", $idCliente);
$query->execute();
$result = $query->get_result();

$solicitudes = [];
while ($row = $result->fetch_assoc()) {
    $solicitudes[] = $row;
}

echo json_encode(["success" => true, "solicitudes" => $solicitudes]);
?>

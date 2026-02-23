<?php
session_start();
header('Content-Type: application/json');
include("../conexion.php");

// Validar sesión
if (!isset($_SESSION['idUsuario'])) {
    echo json_encode(["success" => false, "msg" => "No hay sesión activa."]);
    exit;
}

$body = json_decode(file_get_contents("php://input"), true);
$idSolicitud = $body['idSolicitud'] ?? null;
if (!$idSolicitud) {
    echo json_encode(["success" => false, "msg" => "Falta idSolicitud."]);
    exit;
}

$idUsuario = $_SESSION['idUsuario'];

// Obtener idCliente asociado al usuario
$stmt = $conexion->prepare("SELECT idCliente FROM Cliente WHERE isUsuario = ?");
$stmt->bind_param("i", $idUsuario);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "msg" => "Cliente no encontrado."]);
    exit;
}
$idCliente = $res->fetch_assoc()['idCliente'];
$stmt->close();

// Verificar que la solicitud pertenece a ese cliente
$stmt = $conexion->prepare("SELECT idSolicitud FROM Solicitud WHERE idSolicitud = ? AND idCliente = ?");
$stmt->bind_param("ii", $idSolicitud, $idCliente);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "msg" => "No tienes permiso para esta solicitud o no existe."]);
    exit;
}
$stmt->close();

// Actualizar estado a 'pendiente'
$stmt = $conexion->prepare("UPDATE Solicitud SET estado = 'pendiente' WHERE idSolicitud = ?");
$stmt->bind_param("i", $idSolicitud);
$ok = $stmt->execute();
$stmt->close();

if ($ok) {
    echo json_encode(["success" => true, "msg" => "Solicitud enviada."]);
} else {
    echo json_encode(["success" => false, "msg" => "Error al enviar solicitud."]);
}
$conexion->close();
?>

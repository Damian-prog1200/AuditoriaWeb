<?php
header('Content-Type: application/json');
include("../conexion.php");

$data = json_decode(file_get_contents("php://input"), true);

$idProceso = $data["idProceso"] ?? null;

if (!$idProceso) {
    echo json_encode(["success" => false, "msg" => "ID de proceso no recibido"]);
    exit;
}

// ===============================
// 1️⃣ OBTENER la solicitud asociada
// ===============================
$sql = $conexion->prepare("
    SELECT idSolicitud 
    FROM Procesos_Produccion 
    WHERE idProceso = ?
");
$sql->bind_param("i", $idProceso);
$sql->execute();
$result = $sql->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "msg" => "Proceso no encontrado"]);
    exit;
}

$row = $result->fetch_assoc();
$idSolicitud = $row["idSolicitud"];

// ===============================
// 2️⃣ ACTUALIZAR proceso → Finalizado
// ===============================
$u1 = $conexion->prepare("
    UPDATE Procesos_Produccion 
    SET estado = 'Entregada',
        fecha_fin = CURDATE()
    WHERE idProceso = ?
");
$u1->bind_param("i", $idProceso);
$u1->execute();

// ===============================
// 3️⃣ ACTUALIZAR solicitud → Aprobada
// ===============================
$u2 = $conexion->prepare("
    UPDATE Solicitud
    SET estado = 'Entregada',
        fecha_aprobacion = CURDATE()
    WHERE idSolicitud = ?
");
$u2->bind_param("i", $idSolicitud);
$u2->execute();

echo json_encode([
    "success" => true,
    "msg" => "Proceso finalizado y solicitud aprobada."
]);

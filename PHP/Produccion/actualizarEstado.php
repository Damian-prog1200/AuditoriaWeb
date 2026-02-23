<?php
// PHP/Solicitud/actualizarEstado.php
header('Content-Type: application/json; charset=utf-8');
include("../conexion.php");

// Leer cuerpo JSON o form-data
$raw = file_get_contents("php://input");
$input = json_decode($raw, true);
if (!is_array($input)) {
    $input = $_POST;
}

$idSolicitud = $input['idSolicitud'] ?? $input['id'] ?? null;
$estado = $input['estado'] ?? null;

if (!$idSolicitud || !$estado) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

try {
    // Iniciar transacción
    $conexion->begin_transaction();

    // 1️⃣ Actualizar tabla Solicitud
    $sql1 = "UPDATE Solicitud SET estado = ? WHERE idSolicitud = ?";
    $stmt1 = $conexion->prepare($sql1);
    if (!$stmt1) throw new Exception("Error prepare Solicitud: " . $conexion->error);
    $stmt1->bind_param("si", $estado, $idSolicitud);
    if (!$stmt1->execute()) throw new Exception("Error execute Solicitud: " . $stmt1->error);
    $stmt1->close();

    // 2️⃣ Actualizar tabla Procesos_Produccion
    $sql2 = "UPDATE Procesos_Produccion SET estado = ? WHERE idSolicitud = ?";
    $stmt2 = $conexion->prepare($sql2);
    if (!$stmt2) throw new Exception("Error prepare Procesos_Produccion: " . $conexion->error);
    $stmt2->bind_param("si", $estado, $idSolicitud);
    if (!$stmt2->execute()) throw new Exception("Error execute Procesos_Produccion: " . $stmt2->error);
    $stmt2->close();

    // 3️⃣ Confirmar cambios
    $conexion->commit();
    echo json_encode(["success" => true, "message" => "Estado actualizado correctamente en ambas tablas"]);

} catch (Exception $e) {
    $conexion->rollback();
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>

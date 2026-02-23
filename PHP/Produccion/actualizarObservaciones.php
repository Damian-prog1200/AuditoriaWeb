<?php
include("../conexion.php");
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$idSolicitud = $data["idSolicitud"] ?? $data["idProceso"]; // viene en realidad como idSolicitud
$observaciones = $data["observaciones"] ?? "";
if (!$idSolicitud) {
    echo json_encode(["success" => false, "message" => "Falta ID de la solicitud"]);
    exit;
}

// === 1️⃣ Buscar el idProceso relacionado con esa solicitud ===
$queryBuscar = "SELECT idProceso FROM Procesos_Produccion WHERE idSolicitud = ?";
$stmtBuscar = $conexion->prepare($queryBuscar);
$stmtBuscar->bind_param("i", $idSolicitud);
$stmtBuscar->execute();
$result = $stmtBuscar->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "No existe un proceso asociado a esa solicitud"]);
    $stmtBuscar->close();
    $conexion->close();
    exit;
}

$row = $result->fetch_assoc();
$idProceso = $row["idProceso"];
$stmtBuscar->close();

// === 2️⃣ Actualizar observaciones usando el idProceso encontrado ===
$queryUpdate = "UPDATE Procesos_Produccion SET observaciones = ? WHERE idProceso = ?";
$stmtUpdate = $conexion->prepare($queryUpdate);
$stmtUpdate->bind_param("si", $observaciones, $idProceso);

if ($stmtUpdate->execute()) {
    echo json_encode(["success" => true, "message" => "Observaciones actualizadas correctamente"]);
} else {
    echo json_encode(["success" => false, "message" => "Error al actualizar: " . $conexion->error]);
}

$stmtUpdate->close();
$conexion->close();
?>

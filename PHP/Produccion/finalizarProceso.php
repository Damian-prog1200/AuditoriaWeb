<?php
// PHP/Produccion/finalizarProceso.php
header('Content-Type: application/json; charset=utf-8');
session_start();
include("../conexion.php");

// Leer body JSON o form-data
$raw = file_get_contents("php://input");
$input = json_decode($raw, true);
if (!is_array($input)) {
    $input = $_POST;
}

$idSolicitud = $input['idSolicitud'] ?? $input['id'] ?? null;
$observaciones = trim($input['observaciones'] ?? '');

if (!$idSolicitud) {
    echo json_encode(["success" => false, "message" => "Falta ID de solicitud"]);
    exit;
}
if (!isset($_SESSION['idUsuario'])) {
    echo json_encode(["success" => false, "message" => "No hay sesión activa"]);
    exit;
}

$idUsuario = intval($_SESSION['idUsuario']);
if ($observaciones === '') $observaciones = "N/A";

try {
    $conexion->begin_transaction();

    // 1️⃣ Obtener idAuditor
    $sqlAud = "SELECT idAuditor FROM Auditor WHERE isUsuario = ? LIMIT 1";
    $stmtAud = $conexion->prepare($sqlAud);
    $stmtAud->bind_param("i", $idUsuario);
    $stmtAud->execute();
    $resAud = $stmtAud->get_result();
    if ($resAud->num_rows === 0) {
        throw new Exception("No se encontró auditor asociado");
    }
    $idAuditor = intval($resAud->fetch_assoc()['idAuditor']);
    $stmtAud->close();

    // 2️⃣ Actualizar estado de la solicitud
    $nuevoEstado = "Terminada";
    $sqlUpdSol = "UPDATE Solicitud SET estado = ? WHERE idSolicitud = ?";
    $stmtUpd = $conexion->prepare($sqlUpdSol);
    $stmtUpd->bind_param("si", $nuevoEstado, $idSolicitud);
    $stmtUpd->execute();
    $stmtUpd->close();

    // 3️⃣ Actualizar proceso
    $sqlUpdProc = "UPDATE Procesos_Produccion
                   SET fecha_fin = NOW(), estado = 'Terminada', observaciones = ?
                   WHERE idSolicitud = ? AND idAuditor = ?";
    $stmtProc = $conexion->prepare($sqlUpdProc);
    $stmtProc->bind_param("sii", $observaciones, $idSolicitud, $idAuditor);
    $stmtProc->execute();
    $stmtProc->close();

    $conexion->commit();
    echo json_encode(["success" => true, "message" => "Proceso finalizado correctamente"]);
} catch (Exception $e) {
    $conexion->rollback();
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>

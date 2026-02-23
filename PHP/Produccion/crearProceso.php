<?php
// PHP/Produccion/crearProceso.php
header('Content-Type: application/json; charset=utf-8');
session_start();
include("../conexion.php");

// Leer JSON body (compatible con form-data fallback)
$raw = file_get_contents("php://input");
$input = json_decode($raw, true);
if (!is_array($input)) {
    // intentar fallback a POST/FormData
    $input = $_POST;
}

$idSolicitud = $input['idSolicitud'] ?? $input['id'] ?? null;

if (!$idSolicitud) {
    echo json_encode(["success" => false, "message" => "Falta ID de solicitud"]);
    exit;
}

// Verificar sesión y obtener idUsuario
if (!isset($_SESSION['idUsuario'])) {
    echo json_encode(["success" => false, "message" => "No hay sesión activa"]);
    exit;
}
$idUsuario = intval($_SESSION['idUsuario']);

// 1) Obtener idAuditor a partir de idUsuario
$sqlAud = "SELECT idAuditor FROM Auditor WHERE isUsuario = ? LIMIT 1";
if (!$stmtAud = $conexion->prepare($sqlAud)) {
    echo json_encode(["success" => false, "message" => "Error en prepare (auditor): " . $conexion->error]);
    exit;
}
$stmtAud->bind_param("i", $idUsuario);
$stmtAud->execute();
$resAud = $stmtAud->get_result();
if ($resAud->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "No se encontró el auditor asociado a la sesión"]);
    exit;
}
$idAuditor = intval($resAud->fetch_assoc()['idAuditor']);
$stmtAud->close();

try {
    // Iniciar transacción
    $conexion->begin_transaction();

    // 2) Actualizar estado en tabla Solicitud
    $nuevoEstado = "En proceso";
    $sqlUpd = "UPDATE solicitud SET estado = ? WHERE idSolicitud = ?";
    if (!$stmtUpd = $conexion->prepare($sqlUpd)) {
        throw new Exception("Error prepare update solicitud: " . $conexion->error);
    }
    $stmtUpd->bind_param("si", $nuevoEstado, $idSolicitud);
    if (!$stmtUpd->execute()) {
        throw new Exception("Error execute update solicitud: " . $stmtUpd->error);
    }
    // Comprobación: si no afectó filas, tal vez el id no existe
    if ($stmtUpd->affected_rows === 0) {
        // puede que ya esté en el mismo estado o id inválido; verificamos existencia
        $checkSql = "SELECT estado FROM solicitud WHERE idSolicitud = ?";
        $chk = $conexion->prepare($checkSql);
        $chk->bind_param("i", $idSolicitud);
        $chk->execute();
        $r = $chk->get_result()->fetch_assoc();
        $chk->close();
        if (!$r) {
            throw new Exception("Solicitud no encontrada");
        }
        // si existe pero no se actualizó por ser mismo estado, seguimos (no es error)
    }
    $stmtUpd->close();

    // 3) Comprobar si ya existe un proceso 'En proceso' para esta solicitud
    $sqlCheck = "SELECT idProceso FROM Procesos_Produccion WHERE idSolicitud = ? AND estado = 'En proceso' LIMIT 1";
    $stmtCheck = $conexion->prepare($sqlCheck);
    $stmtCheck->bind_param("i", $idSolicitud);
    $stmtCheck->execute();
    $resCheck = $stmtCheck->get_result();
    if ($resCheck && $resCheck->num_rows > 0) {
        // Ya existe proceso en proceso -> commit y devolver info
        $existing = $resCheck->fetch_assoc();
        $stmtCheck->close();
        $conexion->commit();
        echo json_encode(["success" => true, "message" => "Proceso ya existe", "idProceso" => $existing['idProceso']]);
        exit;
    }
    $stmtCheck->close();

    // 4) Insertar nuevo registro en Procesos_Produccion
    $sqlIns = "INSERT INTO Procesos_Produccion (idAuditor, idSolicitud, fecha_inicio, estado, observaciones) VALUES (?, ?, NOW(), 'En proceso', 'N/A')";
    if (!$stmtIns = $conexion->prepare($sqlIns)) {
        throw new Exception("Error prepare insert proceso: " . $conexion->error);
    }
    $stmtIns->bind_param("ii", $idAuditor, $idSolicitud);
    if (!$stmtIns->execute()) {
        throw new Exception("Error execute insert proceso: " . $stmtIns->error);
    }
    $idProceso = $stmtIns->insert_id;
    $stmtIns->close();

    // 5) Commit
    $conexion->commit();

    echo json_encode(["success" => true, "message" => "Estado actualizado y proceso creado", "idProceso" => $idProceso]);
    exit;

} catch (Exception $e) {
    error_log("crearProceso.php error: " . $e->getMessage());
    // Rollback segura
    if ($conexion->errno === 0) {
        // nothing
    }
    $conexion->rollback();
    echo json_encode(["success" => false, "message" => "Error interno: " . $e->getMessage()]);
    exit;
}
?>

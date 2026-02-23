<?php
header('Content-Type: application/json; charset=utf-8');
include("../conexion.php");
session_start();

// === DEPURACIÓN (mantén activo en pruebas) ===
$raw = file_get_contents("php://input");
error_log("RAW INPUT: " . $raw);
error_log("POST: " . json_encode($_POST));
error_log("GET: " . json_encode($_GET));

// === Lectura flexible de parámetros (JSON o form-data) ===
$input = [];

// 1️⃣ Intentar JSON
if ($raw) {
    $maybe = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($maybe)) {
        $input = $maybe;
    }
}

// 2️⃣ Si viene por form-data
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}

// === Normalizar campos ===
$id = isset($input['id']) ? intval($input['id']) : (isset($input['idSolicitud']) ? intval($input['idSolicitud']) : 0);
$estado = $input['estado'] ?? '';
$motivo = $input['motivo'] ?? null;

// === Validar parámetros ===
if (!$id || !$estado) {
    echo json_encode(["success" => false, "message" => "Faltan parámetros. Revisar 'id' y 'estado'."]);
    exit;
}

try {
    // === Lógica según el estado recibido ===
    switch ($estado) {
        case "Aprobada":
            $sql = "UPDATE solicitud SET estado = ?, fecha_aprobacion = NOW(), motivoRechazo = NULL WHERE idSolicitud = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("si", $estado, $id);
            break;

        case "Rechazada":
            $sql = "UPDATE solicitud SET estado = ?, fecha_rechazo = NOW(), motivoRechazo = ? WHERE idSolicitud = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("ssi", $estado, $motivo, $id);
            break;

        case "En proceso":
        case "Pausada":
        case "Entregada":
        case "Reanudar": // ✅ nuevo alias para cuando se reanuda
            // Si viene "Reanudar", lo normalizamos a "En proceso"
            if ($estado === "Reanudar") {
                $estado = "En proceso";
            }
            $sql = "UPDATE solicitud SET estado = ? WHERE idSolicitud = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("si", $estado, $id);
            break;

        default:
            $sql = "UPDATE solicitud SET estado = ? WHERE idSolicitud = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("si", $estado, $id);
            break;
    }

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    // === Intentar envío de correo ===
    try {
        require_once __DIR__ . '/enviarCorreo_func.php';
        $mailRes = enviarCorreoSolicitud($conexion, $id, $estado, $motivo ?? '');
        if (isset($mailRes['success']) && !$mailRes['success']) {
            error_log("actualizarEstado.php: fallo al enviar correo para solicitud {$id}: " . ($mailRes['msg'] ?? ''));
        } else {
            error_log("actualizarEstado.php: correo enviado para solicitud {$id}");
        }
    } catch (Exception $e) {
        error_log("actualizarEstado.php: excepción al intentar enviar correo: " . $e->getMessage());
    }

    echo json_encode([
        "success" => true,
        "message" => "Estado actualizado correctamente.",
        "estadoFinal" => $estado,
        "idSolicitud" => $id
    ]);

    $stmt->close();
} catch (Exception $e) {
    error_log("actualizarEstado.php error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error interno."]);
}

$conexion->close();

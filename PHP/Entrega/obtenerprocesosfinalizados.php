<?php
header('Content-Type: application/json');

// incluir conexion (ajusta la ruta si hace falta)
$conexion_path = __DIR__ . "/../conexion.php";
if (!file_exists($conexion_path)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "No se encontró conexion.php en: $conexion_path"
    ]);
    exit;
}
include $conexion_path;
session_start();

// Determinar objeto/variable de conexión disponible
$db = null;
if (isset($conexion) && $conexion instanceof mysqli) {
    $db = $conexion;
} elseif (isset($conn) && $conn instanceof mysqli) {
    $db = $conn;
} elseif (isset($mysqli) && $mysqli instanceof mysqli) {
    $db = $mysqli;
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "No se detectó una conexión MySQL válida. Revisa conexion.php (debe definir \$conexion o \$conn)."
    ]);
    exit;
}

// id del auditor en sesión (opcional)
$idAuditorSession = $_SESSION['idAuditor'] ?? null;

try {
    // Consulta: trae idProceso, idSolicitud, cliente (nombre), observaciones, fecha_fin, idReporte, archivoGenerado
    $sql = "SELECT 
    p.idProceso,
    p.idSolicitud,
    p.observaciones,
    p.fecha_fin AS fecha,
    r.idReporte,
    r.archivoGenerado,
    u.nombre AS nombreCliente,
    u.email AS correoCliente
FROM procesos_produccion p
INNER JOIN solicitud s ON p.idSolicitud = s.idSolicitud
INNER JOIN cliente c ON s.idCliente = c.idCliente
INNER JOIN usuario u ON c.isUsuario = u.idUsuario
LEFT JOIN reporte r ON p.idProceso = r.idProceso
WHERE p.estado = 'Terminada';";

    if ($idAuditorSession) {
        $sql .= " AND pp.idAuditor = ?";
        $stmt = $db->prepare($sql);
        if (!$stmt) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error al preparar consulta (prepare failed)",
                "error" => $db->error
            ]);
            exit;
        }
        $stmt->bind_param("i", $idAuditorSession);
    } else {
        $stmt = $db->prepare($sql);
        if (!$stmt) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error al preparar consulta (prepare failed)",
                "error" => $db->error
            ]);
            exit;
        }
    }

    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Error al ejecutar la consulta",
            "error" => $stmt->error
        ]);
        exit;
    }

    $res = $stmt->get_result();
    $procesos = [];

    while ($row = $res->fetch_assoc()) {
        $procesos[] = [
            'idProceso' => $row['idProceso'],
            'idSolicitud' => $row['idSolicitud'],
            'cliente' => $row['nombreCliente'],
            'correoCliente' => $row['correoCliente'],
            'observaciones' => $row['observaciones'],
            'fecha' => $row['fecha'],
            'idReporte' => $row['idReporte'],
            'archivoGenerado' => $row['archivoGenerado']
        ];

    }

    echo json_encode([
        "success" => true,
        "procesos" => $procesos
    ]);
    exit;
} catch (Throwable $t) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Excepción en el servidor",
        "error" => $t->getMessage()
    ]);
    exit;
}

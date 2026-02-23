<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
include("../conexion.php");

$id = $_GET['id'] ?? '';

if (!$id) {
    echo json_encode(["success" => false, "message" => "Falta el ID"]);
    exit;
}

// ✅ Traemos también nombre del cliente y fecha de creación
$sql = "
    SELECT 
        s.idSolicitud, 
        s.tipoServicio, 
        s.detalle, 
        s.archivoPDF, 
        s.nombrePDF, 
        s.fecha_creacion,
        u.nombre AS nombreCliente
    FROM solicitud s
    INNER JOIN cliente c ON s.idCliente = c.idCliente
    INNER JOIN usuario u ON c.isUsuario = u.idUsuario
    WHERE s.idSolicitud = ?
";

$stmt = $conexion->prepare($sql);
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $solicitud = $result->fetch_assoc();

    // ✅ Normalizamos el PDF (evita duplicar el encabezado base64)
    $archivoPDF = $solicitud['archivoPDF'] ?? '';

    // Si ya tiene el encabezado data:application/pdf;base64, lo dejamos igual
    if (strpos($archivoPDF, 'data:application/pdf;base64,') === 0) {
        $archivoFinal = $archivoPDF;
    } else {
        // Si solo tiene el contenido base64 o binario, agregamos el encabezado
        $archivoFinal = 'data:application/pdf;base64,' . base64_encode($archivoPDF);
    }

    // ✅ Determinar nombre del archivo
    $nombreArchivo = !empty($solicitud['nombrePDF'])
        ? $solicitud['nombrePDF']
        : "Nombre sin definir";

    echo json_encode([
        "success" => true,
        "solicitud" => [
            "id" => $solicitud['idSolicitud'],
            "tipo" => $solicitud['tipoServicio'],
            "detalle" => $solicitud['detalle'],
            "archivo" => $archivoFinal, // ✅ Ya limpio y compatible
            "nombrePDF" => $nombreArchivo,
            "nombreCliente" => $solicitud['nombreCliente'] ?? "Desconocido",
            "fecha_creacion" => $solicitud['fecha_creacion']
        ]
    ]);
} else {
    echo json_encode(["success" => false, "message" => "No encontrada"]);
}
?>

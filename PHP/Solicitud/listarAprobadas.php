<?php
header('Content-Type: application/json; charset=utf-8');
include("../conexion.php");

try {
    $sql = "SELECT 
                s.idSolicitud AS id,
                s.tipoServicio AS tipo,
                s.detalle,
                s.estado,
                s.nombrePDF,
                s.archivoPDF,
                s.motivoRechazo,
                s.fecha_creacion,
                s.fecha_aprobacion,
                s.fecha_rechazo,
                u.nombre AS nombreCliente
            FROM Solicitud s
            INNER JOIN Cliente c ON s.idCliente = c.idCliente
            INNER JOIN Usuario u ON c.isUsuario = u.idUsuario
            WHERE s.estado = 'Aprobada' or s.estado = 'Pausada' or s.estado = 'En Proceso'
            ORDER BY s.fecha_aprobacion DESC";

    $res = $conexion->query($sql);
    $solicitudes = [];

    while ($row = $res->fetch_assoc()) {
        $archivoBase64 = null;
        if (!is_null($row['archivoPDF']) && $row['archivoPDF'] !== "") {
            $maybe = $row['archivoPDF'];
            if (strpos($maybe, 'data:application/pdf;base64,') === 0) {
                $archivoBase64 = $maybe;
            } else {
                $archivoBase64 = 'data:application/pdf;base64,' . base64_encode($maybe);
            }
        }

        $solicitudes[] = [
            "id" => $row['id'],
            "tipo" => $row['tipo'],
            "detalle" => $row['detalle'],
            "estado" => $row['estado'],
            "nombrePDF" => $row['nombrePDF'] ?? null,
            "archivoPDF" => $archivoBase64,
            "motivoRechazo" => $row['motivoRechazo'] ?? null,
            "fecha_creacion" => $row['fecha_creacion'],
            "fecha_aprobacion" => $row['fecha_aprobacion'],
            "fecha_rechazo" => $row['fecha_rechazo'],
            "nombreCliente" => $row['nombreCliente'] ?? null
        ];
    }

    echo json_encode(["success" => true, "solicitudes" => $solicitudes]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>

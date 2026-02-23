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
            WHERE s.estado = 'Pendiente'
            ORDER BY s.fecha_creacion DESC";

    $res = $conexion->query($sql);
    $solicitudes = [];

    while ($row = $res->fetch_assoc()) {
        // Archivo (blob) -> base64 (si existe)
        $archivoBase64 = null;
        if (!is_null($row['archivoPDF']) && $row['archivoPDF'] !== "") {
            // Si ya está guardado como data:... (base64) lo devolvemos tal cual; si es binario, lo convertimos.
            $maybe = $row['archivoPDF'];
            // Heurística simple: si contiene 'data:application/pdf;base64,' lo dejamos
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

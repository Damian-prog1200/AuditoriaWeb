<?php
header('Content-Type: application/json');
include("../conexion.php");

$id = $_POST['id'] ?? '';
$tipo = $_POST['tipo'] ?? '';
$detalle = $_POST['detalle'] ?? '';
$archivo_existente = $_POST['archivoPDF'] ?? '';
$nombre_existente = $_POST['nombrePDF'] ?? ''; 

if (!$id || !$tipo || !$detalle) {
    echo json_encode(["success" => false, "message" => "Faltan datos requeridos"]);
    exit;
}

$archivoPDF = null;

// Si no sube nuevo archivo, conservar el PDF existente pero normalizado
if (!empty($archivo_existente)) {
    // Si viene con encabezado data:application/pdf;base64, quítalo
    if (strpos($archivo_existente, 'data:application/pdf;base64,') === 0) {
        $archivoPDF = $archivo_existente; // ya tiene formato correcto
    } else {
        // Si viene sólo en base64, añadir encabezado
        $archivoPDF = 'data:application/pdf;base64,' . $archivo_existente;
    }
}

$nombrePDF = !empty($nombre_existente) ? $nombre_existente : null;

// ✅ Si se sube un nuevo archivo PDF
if (isset($_FILES['archivoPDF']) && $_FILES['archivoPDF']['error'] == 0) {
    $nombreArchivo = $_FILES['archivoPDF']['name'];
    $rutaTemporal = $_FILES['archivoPDF']['tmp_name'];
    $contenidoPDF = file_get_contents($rutaTemporal);
    $archivoPDF = "data:application/pdf;base64," . base64_encode($contenidoPDF);
    $nombrePDF = $nombreArchivo; // 👈 guardar nombre original
}

// ✅ Asegurar que nombrePDF nunca esté vacío
if (empty($nombrePDF)) {
    $nombrePDF = "Nombre sin definir";
}

try {
    $sql = "UPDATE solicitud 
            SET tipoServicio = ?, detalle = ?, archivoPDF = ?, nombrePDF = ?
            WHERE idSolicitud = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("ssssi", $tipo, $detalle, $archivoPDF, $nombrePDF, $id);
    $stmt->execute();

    if ($stmt->affected_rows >= 0) {
        echo json_encode(["success" => true, "message" => "Solicitud actualizada correctamente"]);
    } else {
        echo json_encode(["success" => false, "message" => "No se modificó ningún registro"]);
    }

    $stmt->close();
    $conexion->close();
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>

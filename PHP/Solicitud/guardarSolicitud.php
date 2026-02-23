<?php
session_start();
header('Content-Type: application/json');
include("../conexion.php");

// ✅ Configurar zona horaria local (México)
date_default_timezone_set('America/Mexico_City');

// ✅ Verificar sesión activa
if (!isset($_SESSION['idUsuario'])) {
    echo json_encode(["success" => false, "msg" => "No hay sesión activa. Inicia sesión para continuar."]);
    exit;
}
// ✅ Usamos el idUsuario como idCliente
$idCliente = $_SESSION['idUsuario'];

// ✅ Recibir datos del formulario
$tipoServicio = $_POST['servicio'] ?? '';
$detalle = $_POST['detalle'] ?? '';
$nombrePDF = $_POST['nombrePDF'] ?? ''; // 👈 nuevo campo

// ✅ Validar campos obligatorios
if (empty($tipoServicio) || empty($detalle)) {
    echo json_encode(["success" => false, "msg" => "Faltan datos del formulario."]);
    exit;
}

// ✅ Procesar archivo PDF (opcional)
$archivoPDF = null;
if (isset($_FILES['archivoPDF']) && $_FILES['archivoPDF']['error'] === UPLOAD_ERR_OK) {
    $archivoPDF = 'data:application/pdf;base64,' . base64_encode(file_get_contents($_FILES['archivoPDF']['tmp_name']));
    $nombrePDF = $_FILES['archivoPDF']['name'];
}

if (!$archivoPDF) {
    echo json_encode([
        "success" => false,
        "msg" => "Debes subir un archivo PDF para crear la solicitud."
    ]);
    exit;
}


// ✅ Asegurar que nombrePDF nunca esté vacío
if (empty($nombrePDF)) {
    $nombrePDF = "Nombre sin definir";
}

// ✅ Generar fecha local exacta
$fechaCreacion = date('Y-m-d H:i:s');

// ✅ Insertar la solicitud
$stmt = $conexion->prepare("
    INSERT INTO solicitud (idCliente, tipoServicio, detalle, estado, archivoPDF, nombrePDF, fecha_creacion)
    VALUES (?, ?, ?, 'Borrador', ?, ?, ?)
");

if (!$stmt) {
    echo json_encode(["success" => false, "msg" => "Error en la preparación de la consulta: " . $conexion->error]);
    exit;
}

$stmt->bind_param("isssss", $idCliente, $tipoServicio, $detalle, $archivoPDF, $nombrePDF, $fechaCreacion);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "msg" => "Solicitud guardada correctamente."]);
} else {
    echo json_encode(["success" => false, "msg" => "Error al guardar la solicitud: " . $stmt->error]);
}

$stmt->close();
$conexion->close();
?>

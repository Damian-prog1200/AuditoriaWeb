<?php
header('Content-Type: application/json');
include("../conexion.php"); // ⚙️ Ajusta si tu conexión tiene otro nombre o ruta
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Verificar que el archivo fue recibido correctamente
if (!isset($_FILES['archivo']) ||!isset($_POST['nombre']) ||!isset($_POST['descripcion'])) {
    echo json_encode(["success" => false, "msg" => "Faltan datos."]);
    exit;
}

$nombre = trim($_POST['nombre']);
$descripcion = trim($_POST['descripcion']);
$archivo = $_FILES['archivo'];

// Validar campos
if ($nombre === "" || $descripcion === "") {
    echo json_encode(["success" => false, "msg" => "Campos vacíos."]);
    exit;
}

// Verificar errores del archivo
if ($archivo['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(["success" => false, "msg" => "Error al subir el archivo."]);
    exit;
}

// Crear carpeta de destino
$directorio = "../uploads/";
if (!file_exists($directorio)) {
    mkdir($directorio, 0777, true);
}

// Asignar nombre único al archivo
$nombreArchivo = uniqid("norma_") . "_" . basename($archivo["name"]);
$rutaArchivo = $directorio . $nombreArchivo;

// Mover archivo
if (!move_uploaded_file($archivo["tmp_name"], $rutaArchivo)) {
    echo json_encode(["success" => false, "msg" => "No se pudo guardar el archivo."]);
    exit;
}

// Guardar en la base de datos
try {
    $stmt = $conexion->prepare("INSERT INTO normativas (nombre, descripcion, archivo, fecha_subida) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("sss", $nombre, $descripcion, $nombreArchivo);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "msg" => "Normativa guardada correctamente."]);
    } else {
        echo json_encode(["success" => false, "msg" => "Error al insertar en la base de datos."]);
    }
    $stmt->close();
} catch (Exception $e) {
    echo json_encode(["success" => false, "msg" => "Error interno: " . $e->getMessage()]);
}

$conexion->close();

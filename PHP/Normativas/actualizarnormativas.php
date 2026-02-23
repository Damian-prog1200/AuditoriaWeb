<?php
header('Content-Type: application/json');
include("../conexion.php");
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_POST['idNorma'])) {
    echo json_encode(["success" => false, "msg" => "Falta el ID de la normativa."]);
    exit;
}

$idNorma = intval($_POST['idNorma']);
$nombre = trim($_POST['nombre'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '');
$tieneArchivo = isset($_FILES['archivo']) && $_FILES['archivo']['error'] === UPLOAD_ERR_OK;

// Consultar archivo actual
$consulta = $conexion->prepare("SELECT archivo FROM normativas WHERE idNorma = ?");
$consulta->bind_param("i", $idNorma);
$consulta->execute();
$res = $consulta->get_result();
$norma = $res->fetch_assoc();
$consulta->close();

if (!$norma) {
    echo json_encode(["success" => false, "msg" => "Normativa no encontrada."]);
    exit;
}

$nuevoArchivo = $norma['archivo']; // conserva el actual por defecto

// Si se sube un nuevo archivo
if ($tieneArchivo) {
    $directorio = "../uploads/";
    if (!file_exists($directorio)) {
        mkdir($directorio, 0777, true);
    }

    $nombreArchivo = uniqid("norma_") . "_" . basename($_FILES["archivo"]["name"]);
    $rutaArchivo = $directorio . $nombreArchivo;

    if (!move_uploaded_file($_FILES["archivo"]["tmp_name"], $rutaArchivo)) {
        echo json_encode(["success" => false, "msg" => "Error al guardar el nuevo archivo."]);
        exit;
    }

    // Eliminar el anterior si existe
    $antiguo = $directorio . $norma['archivo'];
    if (file_exists($antiguo)) unlink($antiguo);

    $nuevoArchivo = $nombreArchivo;
}

// Actualización en BD
try {
    if ($tieneArchivo) {
        $stmt = $conexion->prepare("
            UPDATE normativas
            SET nombre = IF(? != '', ?, nombre),
                descripcion = IF(? != '', ?, descripcion),
                archivo = ?,
                fecha_subida = NOW()
            WHERE idNorma = ?
        ");
        $stmt->bind_param("sssssi", $nombre, $nombre, $descripcion, $descripcion, $nuevoArchivo, $idNorma);
    } else {
        $stmt = $conexion->prepare("
            UPDATE normativas
            SET nombre = IF(? != '', ?, nombre),
                descripcion = IF(? != '', ?, descripcion),
                fecha_subida = NOW()
            WHERE idNorma = ?
        ");
        $stmt->bind_param("ssssi", $nombre, $nombre, $descripcion, $descripcion, $idNorma);
    }

    $ok = $stmt->execute();

    if ($ok) {
        echo json_encode(["success" => true, "msg" => "Normativa actualizada correctamente."]);
    } else {
        echo json_encode(["success" => false, "msg" => "Error al actualizar la normativa."]);
    }

    $stmt->close();
} catch (Exception $e) {
    echo json_encode(["success" => false, "msg" => "Error interno: " . $e->getMessage()]);
}

$conexion->close();

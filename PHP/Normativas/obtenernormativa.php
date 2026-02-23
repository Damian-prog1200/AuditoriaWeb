<?php
header('Content-Type: application/json');
include("../conexion.php");
error_reporting(E_ALL);
ini_set('display_errors', 1);

$id = $_GET['id'] ?? '';

if (!$id || !is_numeric($id)) {
    echo json_encode(["success" => false, "msg" => "ID de normativa no válido."]);
    exit;
}

$stmt = $conexion->prepare("SELECT idNorma, nombre, descripcion, archivo FROM normativas WHERE idNorma = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$resultado = $stmt->get_result();

if ($fila = $resultado->fetch_assoc()) {
    echo json_encode([
        "success" => true,
        "normativa" => [
            "idNorma" => $fila["idNorma"],
            "nombre" => $fila["nombre"],
            "descripcion" => $fila["descripcion"],
            "archivo" => $fila["archivo"]
        ]
    ]);
} else {
    echo json_encode(["success" => false, "msg" => "Normativa no encontrada."]);
}

$stmt->close();
$conexion->close();
?>

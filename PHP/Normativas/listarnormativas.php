<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0); // evita que warnings rompan el JSON

include("../conexion.php"); // Ajusta la ruta si es necesario

try {
    // ✅ Consulta con el nombre de columna correcto
    $sql = "SELECT idNorma, nombre, descripcion, archivo, fecha_subida 
            FROM normativas 
            ORDER BY idNorma DESC";

    $result = $conexion->query($sql);

    $normativas = [];

    if ($result && $result->num_rows > 0) {
        while ($fila = $result->fetch_assoc()) {
            $normativas[] = $fila;
        }
    }

    echo json_encode([
        "success" => true,
        "normativas" => $normativas
    ]);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "msg" => "Error al listar normativas: " . $e->getMessage()
    ]);
}

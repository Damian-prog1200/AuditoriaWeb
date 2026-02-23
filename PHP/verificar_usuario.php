<?php
header('Content-Type: application/json');
include("conexion.php");

// Recibir los datos desde fetch
$data = json_decode(file_get_contents("php://input"), true);

$email = $data['email'] ?? '';
$rfc = $data['rfc'] ?? ''; // opcional, por si en el futuro también lo usas

// Validar entrada
if (empty($email) && empty($rfc)) {
    echo json_encode([
        "existe" => false,
        "msg" => "No se recibió información para verificar."
    ]);
    exit;
}

try {
    // 🔍 Buscar si existe usuario con ese correo o RFC
    if (!empty($email) && !empty($rfc)) {
        $stmt = $conexion->prepare("SELECT idUsuario FROM Usuario WHERE email = ? OR RFC = ?");
        $stmt->bind_param("ss", $email, $rfc);
    } elseif (!empty($email)) {
        $stmt = $conexion->prepare("SELECT idUsuario FROM Usuario WHERE email = ?");
        $stmt->bind_param("s", $email);
    } else {
        $stmt = $conexion->prepare("SELECT idUsuario FROM Usuario WHERE RFC = ?");
        $stmt->bind_param("s", $rfc);
    }

    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        echo json_encode([
            "existe" => true,
            "msg" => "Usuario encontrado en la base de datos."
        ]);
    } else {
        echo json_encode([
            "existe" => false,
            "msg" => "No se encontró ningún usuario con esos datos."
        ]);
    }

    $stmt->close();
    $conexion->close();
} catch (Exception $e) {
    echo json_encode([
        "existe" => false,
        "msg" => "Error al verificar el usuario: " . $e->getMessage()
    ]);
}
?>

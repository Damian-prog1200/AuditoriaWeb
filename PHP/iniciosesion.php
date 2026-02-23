<?php
session_start();
header('Content-Type: application/json');
include("conexion.php");

// Si ya hay sesión activa
if (isset($_SESSION['idUsuario'])) {
    echo json_encode([
        "success" => true,
        "msg" => "Sesión ya iniciada.",
        "rol" => $_SESSION['rol']
    ]);
    exit;
}

// Recibir datos del frontend
$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "msg" => "Faltan datos."]);
    exit;
}

// Buscar usuario
$stmt = $conexion->prepare("SELECT idUsuario, nombre, email, contraseña, rol FROM Usuario WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();

    if (password_verify($password, $user['contraseña'])) {
        // Crear sesión
        $_SESSION['idUsuario'] = $user['idUsuario'];
        $_SESSION['nombre'] = $user['nombre'];
        $_SESSION['rol'] = $user['rol'];
        $_SESSION['autenticado'] = true;
        $_SESSION['ultima_actividad'] = time();

        echo json_encode([
            "success" => true,
            "msg" => "Inicio de sesión exitoso.",
            "rol" => $user['rol']
        ]);
    } else {
        echo json_encode(["success" => false, "msg" => "Contraseña incorrecta."]);
    }
} else {
    // 🚨 Usuario no encontrado: devolvemos un campo especial para redirigir
    echo json_encode([
        "success" => false,
        "msg" => "La cuenta no existe. Redirigiendo al registro...",
        "redirect" => "registro.php" // Cambia por tu página de registro
    ]);
}

$stmt->close();
$conexion->close();
?>

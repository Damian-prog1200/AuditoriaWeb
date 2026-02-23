<?php
header('Content-Type: application/json');
include("conexion.php");

// =============================
// 🔹 1️⃣ Recibir datos del fetch
// =============================
$data = json_decode(file_get_contents("php://input"), true);

$nombre = $data['nombre'] ?? '';
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
$rfc = $data['rfc'] ?? '';
$rol = $data['rol'] ?? 'Cliente';

error_log(print_r($data, true)); // (Solo para depuración)

// =======================================
// 🔸 2️⃣ Validar campos vacíos obligatorios
// =======================================
if (empty($nombre) || empty($email) || empty($password) || empty($rfc)) {
    echo json_encode(["success" => false, "msg" => "Faltan datos."]);
    exit;
}

// ===========================================
// 🔸 3️⃣ Verificar si ya existe un usuario igual
// ===========================================
$check = $conexion->prepare("
    SELECT idUsuario 
    FROM Usuario 
    WHERE email = ? OR RFC = ? OR (nombre = ? AND RFC = ?)
");
$check->bind_param("ssss", $email, $rfc, $nombre, $rfc);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "msg" => "Ya existe un usuario registrado con estos datos.",
        "redirect" => "index.html"
    ]);
    $check->close();
    $conexion->close();
    exit;
}
$check->close();

// =============================
// 🔹 4️⃣ Encriptar la contraseña
// =============================
$pass_hash = password_hash($password, PASSWORD_DEFAULT);

// ============================================
// 🔸 5️⃣ Insertar usuario en la tabla `Usuario`
// ============================================
$stmt = $conexion->prepare("
    INSERT INTO Usuario (nombre, email, contraseña, RFC, rol)
    VALUES (?, ?, ?, ?, ?)
");
$stmt->bind_param("sssss", $nombre, $email, $pass_hash, $rfc, $rol);

if ($stmt->execute()) {

    // 🔹 6️⃣ Obtener el ID del nuevo usuario
    $idUsuario = $conexion->insert_id;

    // =============================================
    // 🔹 7️⃣ Insertar en la tabla `Cliente` si aplica
    // =============================================
    if ($rol === 'Cliente') {
        $stmtCliente = $conexion->prepare("
            INSERT INTO Cliente (isUsuario)
            VALUES (?)
        ");
        $stmtCliente->bind_param("i", $idUsuario);

        if ($stmtCliente->execute()) {
            echo json_encode([
                "success" => true,
                "msg" => "✅ Usuario y cliente registrados correctamente."
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "msg" => "⚠️ Usuario registrado, pero error al registrar cliente: " . $stmtCliente->error
            ]);
        }

        $stmtCliente->close();
    } else {
        // Si es auditor u otro rol
        echo json_encode([
            "success" => true,
            "msg" => "✅ Usuario registrado correctamente (rol diferente a Cliente)."
        ]);
    }

} else {
    echo json_encode([
        "success" => false,
        "msg" => "❌ Error al registrar usuario: " . $stmt->error
    ]);
}

$stmt->close();
$conexion->close();
?>

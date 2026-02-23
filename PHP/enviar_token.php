<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require "c:/xampp/htdocs/Chamba/vendor/autoload.php";
require_once "conexion.php";
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';

if (empty($email)) {
    echo json_encode(["success" => false, "msg" => "Falta el correo electrónico"]);
    exit;
}

$stmt = $conexion->prepare("SELECT idUsuario FROM usuario WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "msg" => "El correo no está registrado."]);
    exit;
}

$token = bin2hex(random_bytes(32));
$expira = date("Y-m-d H:i:s", strtotime("+1 hour"));

$conexion->query("DELETE FROM recuperaciones WHERE email = '$email'");
$stmt = $conexion->prepare("INSERT INTO recuperaciones (email, token, expira) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $email, $token, $expira);
$stmt->execute();

$enlace = "http://localhost/Chamba/reestablecercontra.html?token=$token";

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'portalcontablegvc.lad@gmail.com';
    $mail->Password = 'kwog dcxs ayrw eqmf';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom('portalcontablegvc.lad@gmail.com', 'Portal Contable');
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = 'Recuperación de contraseña';
    $mail->Body = "
        <h3>Solicitud de recuperación de contraseña</h3>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <p><a href='$enlace'>$enlace</a></p>
        <p>Este enlace expirará en 1 hora.</p>
    ";

    $mail->send();
    echo json_encode(["success" => true, "msg" => "Se ha enviado un enlace de recuperación a tu correo."]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "msg" => "Error al enviar el correo: " . $mail->ErrorInfo]);
}
?>

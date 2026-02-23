<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
session_start();

// Cargar Composer Autoload (PHPMailer incluído)
require __DIR__ . "/../../vendor/autoload.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Verifica si llegan parámetros
$idProceso = $_POST['idProceso'] ?? null;
$archivo = $_POST['archivo'] ?? null;
$correoCliente = $_POST['correo'] ?? null;

if (!$idProceso || !$archivo || !$correoCliente) {
    echo json_encode([
        "success" => false,
        "message" => "Faltan datos para enviar el correo."
    ]);
    exit;
}

// Ruta REAL del PDF
$rutaPDF = __DIR__ . "/../../reportes/" . $archivo;

if (!file_exists($rutaPDF)) {
    echo json_encode([
        "success" => false,
        "message" => "No se encontró el archivo PDF."
    ]);
    exit;
}

// ----------------------------------------
//  ENVÍO DE CORREO
// ----------------------------------------
try {
    $mail = new PHPMailer(true);

    // Config SMTP (Gmail como ejemplo)
    $mail->isSMTP();
    $mail->Host = "smtp.gmail.com";
    $mail->SMTPAuth = true;
    $mail->Username = 'portalcontablegvc.lad@gmail.com'; // CAMBIA si corresponde
    $mail->Password = 'kwog dcxs ayrw eqmf';   
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    // Remitente
    $mail->setFrom("TU_CORREO@gmail.com", "Auditoría");

    // Destinatario
    $mail->addAddress($correoCliente);

    // Adjuntar PDF
    $mail->addAttachment($rutaPDF);

    // Mensaje
    $mail->isHTML(true);
    $mail->Subject = "Entrega de reporte del proceso #$idProceso";
    $mail->Body = "
        <h3>Reporte Entregado</h3>
        <p>Se adjunta el reporte generado correspondiente al proceso <strong>$idProceso</strong>.</p>
    ";

    $mail->send();

    echo json_encode([
        "success" => true,
        "message" => "Correo enviado correctamente."
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Error al enviar el correo: " . $mail->ErrorInfo
    ]);
}

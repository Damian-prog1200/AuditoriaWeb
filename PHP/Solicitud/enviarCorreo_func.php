<?php
// PHP/Solicitud/enviarCorreo_func.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php'; // ajusta si tu vendor está en otra ruta
// NOTA: no se incluye conexion.php aquí porque se le pasará $conexion desde el caller

/**
 * enviarCorreoSolicitud
 * - Recupera email del usuario que envió la solicitud (JOIN Cliente -> Usuario)
 * - Envía correo según $nuevoEstado ('Aprobada' o 'Rechazada' u otros)
 *
 * @param mysqli $conexion
 * @param int $idSolicitud
 * @param string $nuevoEstado
 * @param string|null $motivo (opcional, usado para rechazos)
 * @return array ['success' => bool, 'msg' => string]
 */
function enviarCorreoSolicitud($conexion, $idSolicitud, $nuevoEstado, $motivo = null) {
    try {
        // 1) Recuperar datos de la solicitud + email del usuario
        $sql = "SELECT s.idSolicitud, s.tipoServicio, s.detalle, s.nombrePDF, s.archivoPDF,
                       c.idCliente, c.isUsuario, u.email, u.nombre as nombreUsuario
                FROM solicitud s
                LEFT JOIN Cliente c ON s.idCliente = c.idCliente
                LEFT JOIN Usuario u ON c.isUsuario = u.idUsuario
                WHERE s.idSolicitud = ?";
        $st = $conexion->prepare($sql);
        if (!$st) return ['success' => false, 'msg' => 'Error en prepare: ' . $conexion->error];
        $st->bind_param("i", $idSolicitud);
        $st->execute();
        $res = $st->get_result();
        if ($res->num_rows === 0) {
            return ['success' => false, 'msg' => 'Solicitud no encontrada'];
        }
        $row = $res->fetch_assoc();
        $email = $row['email'] ?? null;
        $nombreUsuario = $row['nombreUsuario'] ?? '';

        if (!$email) {
            return ['success' => false, 'msg' => 'Email del cliente no disponible'];
        }

        // 2) Preparar el correo
        $mail = new PHPMailer(true);
        // --- SMTP config: revisa y ajusta estas credenciales ---
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'portalcontablegvc.lad@gmail.com'; // CAMBIA si corresponde
        $mail->Password = 'kwog dcxs ayrw eqmf';            // CAMBIA por tu pass/app-password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->setFrom('portalcontablegvc.lad@gmail.com', 'Portal Contable');
        $mail->addAddress($email, $nombreUsuario ?: $email);
        $mail->isHTML(true);

        // 3) Construir asunto y cuerpo según estado
        $estadoNorm = strtolower(trim($nuevoEstado));
        if ($estadoNorm === 'aprobada' || $estadoNorm === 'aceptada') {
            $mail->Subject = "Tu solicitud #{$idSolicitud} ha sido Aprobada";
            $mail->Body = "
                <h3>Solicitud aprobada</h3>
                <p>Hola " . htmlspecialchars($nombreUsuario) . ",</p>
                <p>Tu solicitud <strong>#{$idSolicitud}</strong> ha sido <strong>Aprobada</strong>. 
                Pronto un auditor la trabajará y se pondrá en contacto contigo.</p>
                <p>Tipo: " . htmlspecialchars($row['tipoServicio'] ?? 'N/D') . "</p>
                <p>Si necesitas más información, revisa tu panel en el sistema.</p>
                <hr>
                <small>Portal Contable</small>
            ";
        } else if ($estadoNorm === 'rechazada') {
            $mail->Subject = "Tu solicitud #{$idSolicitud} ha sido Rechazada";
            $bodyMotivo = $motivo ? nl2br(htmlspecialchars($motivo)) : "No se proporcionó un motivo.";
            $mail->Body = "
                <h3>Solicitud rechazada</h3>
                <p>Hola " . htmlspecialchars($nombreUsuario) . ",</p>
                <p>Tu solicitud <strong>#{$idSolicitud}</strong> ha sido <strong>Rechazada</strong>.</p>
                <p><strong>Motivo:</strong><br>{$bodyMotivo}</p>
                <p>Revisa tu correo para más detalles o contacta al auditor si crees que hubo un error.</p>
                <hr>
                <small>Portal Contable</small>
            ";
        } else {
            // estados genéricos
            $mail->Subject = "Actualización de estado - Solicitud #{$idSolicitud}";
            $mail->Body = "
                <p>Hola " . htmlspecialchars($nombreUsuario) . ",</p>
                <p>El estado de tu solicitud <strong>#{$idSolicitud}</strong> ha cambiado a <strong>" . htmlspecialchars($nuevoEstado) . "</strong>.</p>
                <hr>
                <small>Portal Contable</small>
            ";
        }

        // 4) (Opcional) Adjuntar el PDF si quieres — no lo adjunto por defecto porque archivaste base64 en BD
        // Si quisieras adjuntar el archivo guardado en archivoPDF (base64), puedes
        // decodificar y usar $mail->addStringAttachment($pdf_bin, $filename);
        if (!empty($row['archivoPDF']) && strpos($row['archivoPDF'], 'data:application/pdf;base64,') === 0) {
            $b64 = substr($row['archivoPDF'], strpos($row['archivoPDF'], ',') + 1);
            $pdf_bin = base64_decode($b64);
            if ($pdf_bin !== false) {
                $filename = $row['nombrePDF'] ?? "Solicitud_{$idSolicitud}.pdf";
                $mail->addStringAttachment($pdf_bin, $filename, 'base64', 'application/pdf');
            }
        }

        // 5) Enviar
        $mail->send();
        return ['success' => true, 'msg' => 'Correo enviado'];
    } catch (Exception $e) {
        error_log("enviarCorreoSolicitud error: " . $e->getMessage());
        return ['success' => false, 'msg' => $e->getMessage()];
    }
}

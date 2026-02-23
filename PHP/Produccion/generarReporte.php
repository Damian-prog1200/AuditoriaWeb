  <?php
include("../conexion.php");
require_once(__DIR__ . '/../../vendor/autoload.php');

use Dompdf\Dompdf;
use Dompdf\Options;

header("Content-Type: application/json");

// === 0️⃣ Recibir datos ===
$data = json_decode(file_get_contents("php://input"), true);

$idSolicitud = $data["idSolicitud"] ?? null;  // idSolicitud
$ingresos = floatval($data["ingresos"] ?? 0);
$gastos = floatval($data["gastos"] ?? 0);
$impuesto = floatval($data["impuesto"] ?? 16);
$observaciones = $data["observaciones"] ?? "Sin observaciones";

if (!$idSolicitud) {
    echo json_encode(["success" => false, "message" => "Falta ID de la solicitud"]);
    exit;
}

// === 1️⃣ Buscar idProceso ===
$queryProceso = "SELECT idProceso, idAuditor, idSolicitud 
                 FROM Procesos_Produccion 
                 WHERE idSolicitud = ?";
$stmt = $conexion->prepare($queryProceso);
$stmt->bind_param("i", $idSolicitud);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "No se encontró proceso asociado"]);
    exit;
}

$row = $res->fetch_assoc();
$idProceso = $row["idProceso"];
$idAuditor = $row["idAuditor"];
$stmt->close();

// === 2️⃣ Obtener nombre del auditor ===
$queryAuditor = "SELECT u.nombre 
                 FROM Usuario u
                 INNER JOIN Auditor a ON u.idUsuario = a.isUsuario
                 WHERE a.idAuditor = ?";
$stmtAud = $conexion->prepare($queryAuditor);
$stmtAud->bind_param("i", $idAuditor);
$stmtAud->execute();
$stmtAud->bind_result($nombreAuditor);
$stmtAud->fetch();
$stmtAud->close();

// === 3️⃣ Obtener nombre del cliente ===
$queryCliente = "SELECT u.nombre 
                 FROM Usuario u
                 INNER JOIN Cliente c ON u.idUsuario = c.isUsuario
                 INNER JOIN Solicitud s ON c.idCliente = s.idCliente
                 WHERE s.idSolicitud = ?";
$stmtCl = $conexion->prepare($queryCliente);
$stmtCl->bind_param("i", $idSolicitud);
$stmtCl->execute();
$stmtCl->bind_result($nombreCliente);
$stmtCl->fetch();
$stmtCl->close();

// === 4️⃣ Calcular impuestos ===
$baseImponible = $ingresos - $gastos;
$impuestoDecimal = $impuesto / 100;
$impuestoCalculado = $baseImponible * $impuestoDecimal;
$resultado = $baseImponible - $impuestoCalculado;

// === 5️⃣ HTML profesional para el PDF ===
$html = "
<html>
<head>
<style>
body {
    font-family: 'DejaVu Sans', sans-serif;
    margin: 40px;
    color: #2B2B2B;
}
.header {
    font-size: 30px;
    text-align: center;
    font-weight: bold;
    margin-bottom: 35px;
    letter-spacing: 5px;
    color: #111;
}
.section-title {
    font-size: 18px;
    margin-top: 30px;
    margin-bottom: 12px;
    font-weight: bold;
    color: #444;
}
.table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}
.table th {
    background: #EAEAEA;
    padding: 10px;
    text-align: left;
}
.table td {
    padding: 9px;
    border-bottom: 1px solid #CCC;
}
.footer {
    margin-top: 45px;
    font-size: 12px;
    color: #777;
    text-align: center;
}
</style>
</head>
<body>

<div class='header'>A. U. D. I. T.</div>

<p><b>Auditor Responsable:</b> $nombreAuditor</p>
<p><b>Cliente:</b> $nombreCliente</p>

<div class='section-title'>Resumen Contable</div>

<table class='table'>
<tr><th>Concepto</th><th>Valor</th></tr>
<tr><td>Ingresos declarados</td><td>\$" . number_format($ingresos, 2) . "</td></tr>
<tr><td>Gastos deducibles</td><td>\$" . number_format($gastos, 2) . "</td></tr>
<tr><td>Tasa de impuesto</td><td>$impuesto%</td></tr>
<tr><td>Impuesto calculado</td><td>\$" . number_format($impuestoCalculado, 2) . "</td></tr>
<tr><td>Resultado final</td><td>\$" . number_format($resultado, 2) . "</td></tr>
</table>

<div class='section-title'>Observaciones del Auditor</div>
<p>$observaciones</p>

<div class='footer'>
Reporte generado automáticamente por A.U.D.I.T. | Proceso #$idProceso
</div>

</body>
</html>
";

// === 6️⃣ Generar PDF ===
$options = new Options();
$options->set('isRemoteEnabled', true);
$dompdf = new Dompdf($options);

$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();

// === 7️⃣ Guardar PDF ===
$pdfFileName = "reporte_proceso_" . $idProceso . "_" . time() . ".pdf";
$rutaCarpeta = __DIR__ . "/../../reportes/";

if (!file_exists($rutaCarpeta)) {
    mkdir($rutaCarpeta, 0777, true);
}

file_put_contents($rutaCarpeta . $pdfFileName, $dompdf->output());

// === 8️⃣ Registrar reporte ===
$fecha = date("Y-m-d");

$queryInsert = "INSERT INTO Reporte (idProceso, datosGenerados, archivoGenerado, fechaCreacion)
                VALUES (?, ?, ?, ?)";

$stmtInsert = $conexion->prepare($queryInsert);
$stmtInsert->bind_param("isss", $idProceso, $html, $pdfFileName, $fecha);
$stmtInsert->execute();

echo json_encode([
    "success" => true,
    "pdf" => "../../reportes/" . $pdfFileName
]);

$conexion->close();
?>

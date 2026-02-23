<?php
// conexion.php
$host = "localhost";
$usuario = "root";  
$clave = "DENON1200Xx*"; 
$bd = "auditorias";

$conexion = new mysqli($host, $usuario, $clave, $bd);

if ($conexion->connect_error) {
    die("Error de conexión: " . $conexion->connect_error);
}
?>
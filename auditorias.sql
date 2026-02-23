create database Auditorias;
use auditorias;

CREATE TABLE Usuario (
  idUsuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  contraseña VARCHAR(100) NOT NULL,
  RFC VARCHAR(13) NOT NULL,
  rol ENUM('Auditor', 'Cliente') NOT NULL
);

CREATE TABLE Cliente (
  idCliente INT AUTO_INCREMENT PRIMARY KEY,
  isUsuario INT NOT NULL,
  FOREIGN KEY (isUsuario) REFERENCES Usuario(idUsuario)
);

CREATE TABLE Auditor (
  idAuditor INT AUTO_INCREMENT PRIMARY KEY,
  isUsuario INT NOT NULL,
  FOREIGN KEY (isUsuario) REFERENCES Usuario(idUsuario)
);

CREATE TABLE Solicitud (
  idSolicitud INT AUTO_INCREMENT PRIMARY KEY,
  idCliente INT NOT NULL,
  fecha_creacion DATE,
  estado ENUM('Pendiente', 'Aprobada', 'Rechazada'),
  tipoServicio VARCHAR(100),
  detalle TEXT,
  fecha_aprobacion DATE,
  fecha_rechazo DATE,
  FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente)
);

CREATE TABLE Procesos_Produccion (
  idProceso INT AUTO_INCREMENT PRIMARY KEY,
  idAuditor INT NOT NULL,
  idSolicitud INT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado ENUM('En proceso', 'Finalizado'),
  observaciones TEXT,
  FOREIGN KEY (idAuditor) REFERENCES Auditor(idAuditor),
  FOREIGN KEY (idSolicitud) REFERENCES Solicitud(idSolicitud)
);

CREATE TABLE Reporte (
  idReporte INT AUTO_INCREMENT PRIMARY KEY,
  idProceso INT NOT NULL,
  datosGenerados TEXT,
  archivoGenerado VARCHAR(255),
  fechaCreacion DATE,
  FOREIGN KEY (idProceso) REFERENCES Procesos_Produccion(idProceso)
);

CREATE TABLE Entrega_Servicio (
  idEntrega INT AUTO_INCREMENT PRIMARY KEY,
  idReporte INT NOT NULL,
  idCliente INT NOT NULL,
  fechaEnvio DATE,
  confirmacion BOOLEAN DEFAULT 0,
  FOREIGN KEY (idReporte) REFERENCES Reporte(idReporte),
  FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente)
);

CREATE TABLE Archivos_Postventa (
  idArchivo INT AUTO_INCREMENT PRIMARY KEY,
  idEntrega INT NOT NULL,
  tipoArchivo VARCHAR(50),
  rutaArchivo VARCHAR(255),
  fechaActualizacion DATE,
  FOREIGN KEY (idEntrega) REFERENCES Entrega_Servicio(idEntrega)
);

CREATE TABLE Normativas (
  idNorma INT AUTO_INCREMENT PRIMARY KEY,
  archivo VARCHAR(255),
  fechaActualizacion DATE
);

CREATE TABLE Consulta (
  idAuditor INT NOT NULL,
  idNorma INT NOT NULL,
  PRIMARY KEY (idAuditor, idNorma),
  FOREIGN KEY (idAuditor) REFERENCES Auditor(idAuditor),
  FOREIGN KEY (idNorma) REFERENCES Normativas(idNorma)
);

CREATE TABLE recuperaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expira DATETIME NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (email)
);

use auditorias;
select * from usuario;
delete from usuario where idUsuario = 5;
update usuario set rol = 'Auditor' where idUsuario = 2;

drop database auditorias;
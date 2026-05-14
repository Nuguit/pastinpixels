

CREATE DATABASE IF NOT EXISTS pastinpixels
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pastinpixels;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario     INT          NOT NULL AUTO_INCREMENT,
  nombre_usuario VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password       VARCHAR(255) NOT NULL,          
  fecha_registro DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS recorridos (
  id_recorrido   INT          NOT NULL AUTO_INCREMENT,
  id_usuario     INT          NOT NULL,
  nombre         VARCHAR(255) NOT NULL,
  descripcion    TEXT,
  fecha_creacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_recorrido),
  CONSTRAINT fk_recorridos_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE IF NOT EXISTS obras_recorridos (
  id             INT          NOT NULL AUTO_INCREMENT,
  id_recorrido   INT          NOT NULL,
  id_obra_api    VARCHAR(255) NOT NULL,           
  fuente_api     ENUM('wikidata','met','europeana','chicago') NOT NULL,
  titulo         VARCHAR(500),                    
  artista        VARCHAR(255),
  anio           VARCHAR(50),
  imagen_url     TEXT,
  url_externo    TEXT,
  orden          INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_obras_recorrido
    FOREIGN KEY (id_recorrido) REFERENCES recorridos (id_recorrido)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE IF NOT EXISTS ubicaciones_recorridos (
  id_ubicacion   INT           NOT NULL AUTO_INCREMENT,
  id_recorrido   INT           NOT NULL,
  nombre_lugar   VARCHAR(255)  NOT NULL,
  latitud        DECIMAL(10,7) NOT NULL,
  longitud       DECIMAL(10,7) NOT NULL,
  orden          INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (id_ubicacion),
  CONSTRAINT fk_ubicaciones_recorrido
    FOREIGN KEY (id_recorrido) REFERENCES recorridos (id_recorrido)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS notas (
  id_nota        INT      NOT NULL AUTO_INCREMENT,
  id_usuario     INT      NOT NULL,
  id_recorrido   INT      NOT NULL,
  texto          TEXT     NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_nota),
  CONSTRAINT fk_notas_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_notas_recorrido
    FOREIGN KEY (id_recorrido) REFERENCES recorridos (id_recorrido)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;




INSERT INTO usuarios (nombre_usuario, email, password) VALUES
  ('Nuria', 'nuria@pastinpixels.com', '$2b$10$placeholder_hash_aqui');

INSERT INTO recorridos (id_usuario, nombre, descripcion) VALUES
  (1, 'La pintura en la Guerra Civil Española', 'Recorrido por las obras más significativas del conflicto español de 1936-1939.'),
  (1, 'El Barroco europeo', 'Las grandes obras del periodo barroco en España, Flandes e Italia.');

INSERT INTO obras_recorridos (id_recorrido, id_obra_api, fuente_api, titulo, artista, anio, orden) VALUES
  (1, 'Q432069',  'wikidata', 'Guernica',      'Pablo Picasso',      '1937', 1),
  (1, 'Q210725',  'wikidata', 'El tres de mayo','Francisco de Goya', '1814', 2),
  (2, 'Q2045331', 'wikidata', 'Las Meninas',   'Diego Velázquez',    '1656', 1);

INSERT INTO ubicaciones_recorridos (id_recorrido, nombre_lugar, latitud, longitud, orden) VALUES
  (1, 'Museo Reina Sofía, Madrid',  40.4085, -3.6942, 1),
  (2, 'Museo del Prado, Madrid',    40.4138, -3.6921, 1);

INSERT INTO notas (id_usuario, id_recorrido, texto) VALUES
  (1, 1, 'El Guernica es la obra más representativa del sufrimiento civil durante la guerra.'),
  (1, 2, 'El Barroco español alcanza su cima con Velázquez en la corte de Felipe IV.');

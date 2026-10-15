const RUTAS_DATOS = {
  productos: "data/productos.json",
  envios: "data/envios.json"
};

async function pedirJson(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${ruta} (código ${respuesta.status}).`);
  }
  return respuesta.json();
}

export async function obtenerDatos() {
  try {
    const [productos, opcionesEnvio] = await Promise.all([
      pedirJson(RUTAS_DATOS.productos),
      pedirJson(RUTAS_DATOS.envios)
    ]);
    return { productos, opcionesEnvio };
  } catch (error) {
    throw new Error(error.message || "Error de conexión al cargar los datos.");
  }
}

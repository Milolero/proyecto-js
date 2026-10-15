const CLAVES = {
  carrito: "tecnomarket_carrito",
  cliente: "tecnomarket_cliente",
  ultimoPedido: "tecnomarket_ultimo_pedido"
};

function leerJson(clave, valorPorDefecto) {
  try {
    return JSON.parse(localStorage.getItem(clave)) || valorPorDefecto;
  } catch {
    return valorPorDefecto;
  }
}

export const obtenerCarrito = () => leerJson(CLAVES.carrito, []);

export function guardarCarrito(carrito) {
  localStorage.setItem(CLAVES.carrito, JSON.stringify(carrito));
  return carrito;
}

export function agregarAlCarrito(idProducto) {
  const carrito = obtenerCarrito();
  const existe = carrito.some(({ id }) => id === idProducto);
  const carritoActualizado = existe
    ? carrito.map((item) => (item.id === idProducto ? { ...item, cantidad: item.cantidad + 1 } : item))
    : [...carrito, { id: idProducto, cantidad: 1 }];
  return guardarCarrito(carritoActualizado);
}

export function modificarCantidad(idProducto, nuevaCantidad) {
  const carritoActualizado = obtenerCarrito().map((item) =>
    item.id === idProducto ? { ...item, cantidad: nuevaCantidad } : item
  );
  return guardarCarrito(carritoActualizado);
}

export function eliminarDelCarrito(idProducto) {
  const carritoActualizado = obtenerCarrito().filter(({ id }) => id !== idProducto);
  return guardarCarrito(carritoActualizado);
}

export function vaciarCarrito() {
  localStorage.removeItem(CLAVES.carrito);
  return [];
}

export const obtenerDatosCliente = () => leerJson(CLAVES.cliente, {});

export function guardarDatosCliente(datosCliente) {
  localStorage.setItem(CLAVES.cliente, JSON.stringify(datosCliente));
}

export const obtenerUltimoPedido = () => leerJson(CLAVES.ultimoPedido, null);

export function guardarUltimoPedido(pedido) {
  localStorage.setItem(CLAVES.ultimoPedido, JSON.stringify(pedido));
}

export function vaciarAlmacenamiento() {
  localStorage.clear();
}

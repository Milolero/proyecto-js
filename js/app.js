import { obtenerDatos } from "./api.js";
import * as almacenamiento from "./storage.js";

const UMBRAL_ENVIO_GRATIS = 500000;
const COLORES_AVISO = {
  exito: "#2e9e5b",
  advertencia: "#d98a00",
  error: "#d64545",
  info: "#2f6fb5"
};

const estado = {
  productos: [],
  opcionesEnvio: [],
  carrito: [],
  envioSeleccionado: null,
  filtros: { texto: "", categoria: "todas", orden: "relevancia" }
};

const elementos = {
  cargando: document.getElementById("cargando"),
  bloqueError: document.getElementById("bloqueError"),
  mensajeError: document.getElementById("mensajeError"),
  botonReintentar: document.getElementById("botonReintentar"),
  filtroTexto: document.getElementById("filtroTexto"),
  filtroCategoria: document.getElementById("filtroCategoria"),
  filtroOrden: document.getElementById("filtroOrden"),
  botonLimpiarFiltros: document.getElementById("botonLimpiarFiltros"),
  catalogo: document.getElementById("catalogo"),
  contadorCarrito: document.getElementById("contadorCarrito"),
  listaCarrito: document.getElementById("listaCarrito"),
  bloqueEnvio: document.getElementById("bloqueEnvio"),
  selectorEnvio: document.getElementById("selectorEnvio"),
  detalleEnvio: document.getElementById("detalleEnvio"),
  resumenCompra: document.getElementById("resumenCompra"),
  valorSubtotal: document.getElementById("valorSubtotal"),
  valorEnvio: document.getElementById("valorEnvio"),
  valorTotal: document.getElementById("valorTotal"),
  accionesCarrito: document.getElementById("accionesCarrito"),
  botonContinuar: document.getElementById("botonContinuar"),
  botonVaciarCarrito: document.getElementById("botonVaciarCarrito"),
  formularioCompra: document.getElementById("formularioCompra"),
  grupoDireccion: document.getElementById("grupoDireccion"),
  botonCancelarCompra: document.getElementById("botonCancelarCompra"),
  botonUltimoPedido: document.getElementById("botonUltimoPedido"),
  botonBorrarDatos: document.getElementById("botonBorrarDatos")
};

const formatearPrecio = (valor) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(valor);

const escaparHtml = (texto) => {
  const nodo = document.createElement("div");
  nodo.textContent = texto;
  return nodo.innerHTML;
};

function mostrarAviso(mensaje, tipo = "exito") {
  Toastify({
    text: mensaje,
    duration: 2500,
    gravity: "bottom",
    position: "right",
    style: { background: COLORES_AVISO[tipo] || COLORES_AVISO.info }
  }).showToast();
}

async function pedirConfirmacion({ titulo, texto, textoConfirmar }) {
  const { isConfirmed } = await Swal.fire({
    title: titulo,
    text: texto,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#ff6b35"
  });
  return isConfirmed;
}

/* ---------- Carga de datos ---------- */

async function cargarDatos() {
  elementos.cargando.hidden = false;
  elementos.bloqueError.hidden = true;

  try {
    const { productos, opcionesEnvio } = await obtenerDatos();
    estado.productos = productos;
    estado.opcionesEnvio = opcionesEnvio;
    estado.envioSeleccionado = opcionesEnvio[0]?.id || null;

    depurarCarrito();
    renderizarCategorias();
    renderizarOpcionesEnvio();
    precargarDatosCliente();
    renderizarCatalogo();
    renderizarCarrito();
  } catch (error) {
    elementos.mensajeError.textContent = error.message || "No se pudieron cargar los productos.";
    elementos.bloqueError.hidden = false;
  } finally {
    elementos.cargando.hidden = true;
  }
}

function depurarCarrito() {
  const carritoValido = estado.carrito
    .filter(({ id }) => estado.productos.some((producto) => producto.id === id))
    .map((item) => {
      const { stock } = estado.productos.find(({ id }) => id === item.id);
      return { ...item, cantidad: Math.min(item.cantidad, stock) };
    });
  estado.carrito = almacenamiento.guardarCarrito(carritoValido);
}

/* ---------- Catálogo ---------- */

function renderizarCategorias() {
  const categorias = [...new Set(estado.productos.map(({ categoria }) => categoria))];
  const opciones = categorias.map((categoria) => `<option value="${escaparHtml(categoria)}">${escaparHtml(categoria)}</option>`);
  elementos.filtroCategoria.innerHTML = `<option value="todas">Todas las categorías</option>${opciones.join("")}`;
}

function obtenerProductosFiltrados() {
  const { texto, categoria, orden } = estado.filtros;
  const textoNormalizado = texto.trim().toLowerCase();

  const filtrados = estado.productos.filter((producto) => {
    const coincideTexto = producto.nombre.toLowerCase().includes(textoNormalizado);
    const coincideCategoria = categoria === "todas" || producto.categoria === categoria;
    return coincideTexto && coincideCategoria;
  });

  const criteriosOrden = {
    menor: (productoA, productoB) => productoA.precio - productoB.precio,
    mayor: (productoA, productoB) => productoB.precio - productoA.precio,
    nombre: (productoA, productoB) => productoA.nombre.localeCompare(productoB.nombre)
  };

  return criteriosOrden[orden] ? [...filtrados].sort(criteriosOrden[orden]) : filtrados;
}

function renderizarCatalogo() {
  const productos = obtenerProductosFiltrados();

  if (productos.length === 0) {
    elementos.catalogo.innerHTML = `<p class="text-muted">No encontramos productos con esos filtros. Probá con otra búsqueda.</p>`;
    return;
  }

  elementos.catalogo.innerHTML = productos
    .map(({ id, nombre, categoria, descripcion, precio, stock, imagen }) => {
      const enCarrito = estado.carrito.find((item) => item.id === id)?.cantidad || 0;
      const sinStock = enCarrito >= stock;
      return `
        <div class="col-sm-6 col-xl-4">
          <article class="tarjeta-producto">
            <img src="${imagen}" alt="${escaparHtml(nombre)}">
            <div class="cuerpo">
              <span class="badge text-bg-light align-self-start">${escaparHtml(categoria)}</span>
              <h3 class="h6 mb-0">${escaparHtml(nombre)}</h3>
              <p class="small text-muted mb-1">${escaparHtml(descripcion)}</p>
              <p class="precio mb-0 mt-auto">${formatearPrecio(precio)}</p>
              <p class="small mb-2">${stock - enCarrito > 0 ? `Stock disponible: ${stock - enCarrito}` : "Sin stock disponible"}</p>
              <button class="btn btn-primary" type="button" data-agregar="${id}" ${sinStock ? "disabled" : ""}>
                ${sinStock ? "Máximo en carrito" : "Agregar al carrito"}
              </button>
            </div>
          </article>
        </div>`;
    })
    .join("");
}

/* ---------- Carrito ---------- */

function obtenerDetalleCarrito() {
  return estado.carrito.map(({ id, cantidad }) => {
    const producto = estado.productos.find((item) => item.id === id);
    return { ...producto, cantidad, subtotalProducto: producto.precio * cantidad };
  });
}

function calcularTotales() {
  const detalle = obtenerDetalleCarrito();
  const subtotal = detalle.reduce((acumulado, { subtotalProducto }) => acumulado + subtotalProducto, 0);
  const cantidadTotal = detalle.reduce((acumulado, { cantidad }) => acumulado + cantidad, 0);
  const opcionEnvio = estado.opcionesEnvio.find(({ id }) => id === estado.envioSeleccionado);
  const envioGratis = subtotal >= UMBRAL_ENVIO_GRATIS;
  const costoEnvio = detalle.length === 0 || envioGratis ? 0 : opcionEnvio?.costo || 0;

  return { detalle, subtotal, cantidadTotal, opcionEnvio, envioGratis, costoEnvio, total: subtotal + costoEnvio };
}

function renderizarCarrito() {
  const { detalle, subtotal, cantidadTotal, opcionEnvio, envioGratis, costoEnvio, total } = calcularTotales();
  const hayProductos = detalle.length > 0;

  elementos.contadorCarrito.textContent = cantidadTotal;
  elementos.bloqueEnvio.hidden = !hayProductos;
  elementos.resumenCompra.hidden = !hayProductos;
  elementos.accionesCarrito.hidden = !hayProductos;

  if (!hayProductos) {
    elementos.listaCarrito.innerHTML = `<p class="text-muted mb-0">Todavía no agregaste productos. Elegí alguno del catálogo para empezar.</p>`;
    elementos.formularioCompra.hidden = true;
    renderizarCatalogo();
    return;
  }

  elementos.listaCarrito.innerHTML = detalle
    .map(({ id, nombre, cantidad, stock, subtotalProducto }) => `
      <div class="fila-carrito">
        <div>
          <p class="mb-1 fw-semibold">${escaparHtml(nombre)}</p>
          <div class="control-cantidad">
            <button class="btn btn-outline-secondary btn-sm" type="button" data-restar="${id}" aria-label="Quitar una unidad">&minus;</button>
            <span>${cantidad}</span>
            <button class="btn btn-outline-secondary btn-sm" type="button" data-sumar="${id}" aria-label="Agregar una unidad" ${cantidad >= stock ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="text-end">
          <p class="mb-1 fw-semibold">${formatearPrecio(subtotalProducto)}</p>
          <button class="btn btn-link btn-sm text-danger p-0" type="button" data-quitar="${id}">Quitar</button>
        </div>
      </div>`)
    .join("");

  elementos.detalleEnvio.textContent = envioGratis
    ? "Envío gratis por superar $500.000."
    : `${opcionEnvio?.plazo || ""}. Envío gratis desde ${formatearPrecio(UMBRAL_ENVIO_GRATIS)}.`;
  elementos.valorSubtotal.textContent = formatearPrecio(subtotal);
  elementos.valorEnvio.textContent = costoEnvio === 0 ? "Gratis" : formatearPrecio(costoEnvio);
  elementos.valorTotal.textContent = formatearPrecio(total);
  actualizarCampoDireccion();
  renderizarCatalogo();
}

function agregarProducto(idProducto) {
  const producto = estado.productos.find(({ id }) => id === idProducto);
  const cantidadActual = estado.carrito.find(({ id }) => id === idProducto)?.cantidad || 0;

  if (!producto || cantidadActual >= producto.stock) {
    mostrarAviso("No hay más unidades disponibles de este producto.", "advertencia");
    return;
  }

  estado.carrito = almacenamiento.agregarAlCarrito(idProducto);
  renderizarCarrito();
  mostrarAviso(`${producto.nombre} agregado al carrito.`);
}

function cambiarCantidad(idProducto, variacion) {
  const producto = estado.productos.find(({ id }) => id === idProducto);
  const cantidadActual = estado.carrito.find(({ id }) => id === idProducto)?.cantidad || 0;
  const nuevaCantidad = cantidadActual + variacion;

  if (nuevaCantidad <= 0) {
    quitarProducto(idProducto);
    return;
  }
  if (nuevaCantidad > producto.stock) {
    mostrarAviso("Alcanzaste el stock máximo.", "advertencia");
    return;
  }

  estado.carrito = almacenamiento.modificarCantidad(idProducto, nuevaCantidad);
  renderizarCarrito();
}

function quitarProducto(idProducto) {
  const { nombre } = estado.productos.find(({ id }) => id === idProducto);
  estado.carrito = almacenamiento.eliminarDelCarrito(idProducto);
  renderizarCarrito();
  mostrarAviso(`${nombre} eliminado del carrito.`, "info");
}

async function vaciarCarrito() {
  const confirmado = await pedirConfirmacion({
    titulo: "¿Vaciar el carrito?",
    texto: "Se eliminarán todos los productos seleccionados.",
    textoConfirmar: "Sí, vaciar"
  });
  if (!confirmado) return;

  estado.carrito = almacenamiento.vaciarCarrito();
  renderizarCarrito();
  mostrarAviso("Carrito vacío.", "info");
}

/* ---------- Formulario de compra ---------- */

function renderizarOpcionesEnvio() {
  elementos.selectorEnvio.innerHTML = estado.opcionesEnvio
    .map(({ id, nombre, costo }) => `<option value="${id}">${escaparHtml(nombre)} (${costo === 0 ? "sin costo" : formatearPrecio(costo)})</option>`)
    .join("");
  elementos.selectorEnvio.value = estado.envioSeleccionado;
}

function actualizarCampoDireccion() {
  const { opcionEnvio } = calcularTotales();
  elementos.grupoDireccion.hidden = !opcionEnvio?.requiereDireccion;
}

function precargarDatosCliente() {
  const { nombre = "", email = "", direccion = "", medioPago } = almacenamiento.obtenerDatosCliente();
  const formulario = elementos.formularioCompra;
  formulario.elements.nombre.value = nombre;
  formulario.elements.email.value = email;
  formulario.elements.direccion.value = direccion;
  formulario.elements.medioPago.value = medioPago || formulario.elements.medioPago.options[0].value;
}

function validarFormulario({ nombre, email, direccion }, requiereDireccion) {
  const errores = {};
  if (nombre.trim().length < 3) errores.nombre = "Ingresá tu nombre completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errores.email = "Ingresá un email válido.";
  if (requiereDireccion && direccion.trim().length < 5) errores.direccion = "Ingresá la dirección de entrega.";
  return errores;
}

function mostrarErroresFormulario(errores) {
  ["nombre", "email", "direccion"].forEach((campo) => {
    const entrada = elementos.formularioCompra.elements[campo];
    const mensaje = document.getElementById(`error-${campo}`);
    entrada.classList.toggle("is-invalid", Boolean(errores[campo]));
    mensaje.textContent = errores[campo] || "";
  });
}

function construirResumenHtml({ nombre, email, direccion, medioPago }, totales) {
  const lineas = totales.detalle
    .map(({ nombre: producto, cantidad, subtotalProducto }) => `<li>${cantidad} x ${escaparHtml(producto)} &mdash; ${formatearPrecio(subtotalProducto)}</li>`)
    .join("");
  const entrega = totales.opcionEnvio?.requiereDireccion ? escaparHtml(direccion) : "Retiro en sucursal";

  return `
    <div class="text-start">
      <p class="mb-1"><strong>${escaparHtml(nombre)}</strong> (${escaparHtml(email)})</p>
      <ul class="ps-3">${lineas}</ul>
      <p class="mb-1">Entrega: ${entrega}</p>
      <p class="mb-1">Pago: ${escaparHtml(medioPago)}</p>
      <p class="mb-1">Envío: ${totales.costoEnvio === 0 ? "Gratis" : formatearPrecio(totales.costoEnvio)}</p>
      <p class="fs-5 fw-bold mb-0">Total: ${formatearPrecio(totales.total)}</p>
    </div>`;
}

async function procesarCompra(evento) {
  evento.preventDefault();
  const datosCliente = Object.fromEntries(new FormData(elementos.formularioCompra));
  const totales = calcularTotales();
  const errores = validarFormulario(datosCliente, totales.opcionEnvio?.requiereDireccion);

  mostrarErroresFormulario(errores);
  if (Object.keys(errores).length > 0) {
    mostrarAviso("Revisá los datos marcados en el formulario.", "error");
    return;
  }

  const { isConfirmed } = await Swal.fire({
    title: "Revisá tu pedido",
    html: construirResumenHtml(datosCliente, totales),
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Confirmar compra",
    cancelButtonText: "Seguir editando",
    confirmButtonColor: "#2e9e5b"
  });
  if (!isConfirmed) return;

  finalizarCompra(datosCliente, totales);
}

function finalizarCompra(datosCliente, totales) {
  const { detalle, subtotal, costoEnvio, total, opcionEnvio } = totales;
  const pedido = {
    numero: `TM-${Date.now().toString().slice(-8)}`,
    fecha: new Date().toLocaleString("es-AR"),
    cliente: datosCliente,
    productos: detalle.map(({ nombre, cantidad, subtotalProducto }) => ({ nombre, cantidad, subtotalProducto })),
    entrega: opcionEnvio?.nombre || "Sin definir",
    subtotal,
    costoEnvio,
    total
  };

  almacenamiento.guardarDatosCliente(datosCliente);
  almacenamiento.guardarUltimoPedido(pedido);
  estado.carrito = almacenamiento.vaciarCarrito();
  elementos.formularioCompra.hidden = true;
  renderizarCarrito();

  Swal.fire({
    title: "¡Compra confirmada!",
    html: `<p class="mb-1">Tu número de pedido es <strong>${pedido.numero}</strong>.</p>
           <p class="mb-0">Total abonado: <strong>${formatearPrecio(pedido.total)}</strong></p>`,
    icon: "success",
    confirmButtonColor: "#ff6b35"
  });
}

/* ---------- Último pedido y datos guardados ---------- */

function mostrarUltimoPedido() {
  const pedido = almacenamiento.obtenerUltimoPedido();
  if (!pedido) {
    mostrarAviso("Todavía no realizaste ningún pedido.", "info");
    return;
  }

  const lineas = pedido.productos
    .map(({ nombre, cantidad, subtotalProducto }) => `<li>${cantidad} x ${escaparHtml(nombre)} &mdash; ${formatearPrecio(subtotalProducto)}</li>`)
    .join("");

  Swal.fire({
    title: `Pedido ${pedido.numero}`,
    html: `<div class="text-start"><p class="mb-1">${pedido.fecha}</p><ul class="ps-3">${lineas}</ul>
           <p class="mb-1">Entrega: ${escaparHtml(pedido.entrega)}</p>
           <p class="fw-bold mb-0">Total: ${formatearPrecio(pedido.total)}</p></div>`,
    confirmButtonColor: "#ff6b35"
  });
}

async function borrarDatosGuardados() {
  const confirmado = await pedirConfirmacion({
    titulo: "¿Borrar todos los datos guardados?",
    texto: "Se eliminarán el carrito, tus datos y el último pedido de este navegador.",
    textoConfirmar: "Sí, borrar todo"
  });
  if (!confirmado) return;

  almacenamiento.vaciarAlmacenamiento();
  estado.carrito = [];
  elementos.formularioCompra.reset();
  mostrarErroresFormulario({});
  elementos.formularioCompra.hidden = true;
  renderizarCarrito();
  mostrarAviso("Datos guardados eliminados.", "info");
}

/* ---------- Eventos ---------- */

elementos.catalogo.addEventListener("click", ({ target }) => {
  const botonAgregar = target.closest("[data-agregar]");
  if (botonAgregar) agregarProducto(Number(botonAgregar.dataset.agregar));
});

elementos.listaCarrito.addEventListener("click", ({ target }) => {
  const botonSumar = target.closest("[data-sumar]");
  const botonRestar = target.closest("[data-restar]");
  const botonQuitar = target.closest("[data-quitar]");

  if (botonSumar) cambiarCantidad(Number(botonSumar.dataset.sumar), 1);
  if (botonRestar) cambiarCantidad(Number(botonRestar.dataset.restar), -1);
  if (botonQuitar) quitarProducto(Number(botonQuitar.dataset.quitar));
});

elementos.filtroTexto.addEventListener("input", ({ target }) => {
  estado.filtros.texto = target.value;
  renderizarCatalogo();
});

elementos.filtroCategoria.addEventListener("change", ({ target }) => {
  estado.filtros.categoria = target.value;
  renderizarCatalogo();
});

elementos.filtroOrden.addEventListener("change", ({ target }) => {
  estado.filtros.orden = target.value;
  renderizarCatalogo();
});

elementos.botonLimpiarFiltros.addEventListener("click", () => {
  estado.filtros = { texto: "", categoria: "todas", orden: "relevancia" };
  elementos.filtroTexto.value = "";
  elementos.filtroCategoria.value = "todas";
  elementos.filtroOrden.value = "relevancia";
  renderizarCatalogo();
});

elementos.selectorEnvio.addEventListener("change", ({ target }) => {
  estado.envioSeleccionado = target.value;
  renderizarCarrito();
});

elementos.botonContinuar.addEventListener("click", () => {
  elementos.formularioCompra.hidden = false;
  actualizarCampoDireccion();
  elementos.formularioCompra.scrollIntoView({ behavior: "smooth", block: "nearest" });
  elementos.formularioCompra.elements.nombre.focus();
});

elementos.botonCancelarCompra.addEventListener("click", () => {
  elementos.formularioCompra.hidden = true;
});

elementos.botonVaciarCarrito.addEventListener("click", vaciarCarrito);
elementos.formularioCompra.addEventListener("submit", procesarCompra);
elementos.botonUltimoPedido.addEventListener("click", mostrarUltimoPedido);
elementos.botonBorrarDatos.addEventListener("click", borrarDatosGuardados);
elementos.botonReintentar.addEventListener("click", cargarDatos);

estado.carrito = almacenamiento.obtenerCarrito();
cargarDatos();

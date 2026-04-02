'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Importa el componente Image

export default function VentasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [itemActual, setItemActual] = useState({
    tipo_cerveza: '',
    cantidad_vaso: '',
    cantidad: 1,
    precio_unitario: 0
  });

  const [totalCarrito, setTotalCarrito] = useState(0);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    };
    checkAuth();
  }, [router]);

  // Calcular total del carrito
  useEffect(() => {
    const nuevoTotal = carrito.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);
    setTotalCarrito(nuevoTotal);
  }, [carrito]);

  // Tipos de cerveza
  const tiposCerveza = [
    { id: 'Negra', nombre: 'Cerveza Negra', color: '#270f00' },
    { id: 'Rubia', nombre: 'Cerveza Rubia', color: '#F4A460' },
    { id: 'Roja', nombre: 'Cerveza Roja', color: '#CD5C5C' }
  ];

  // Opciones de cantidad de vaso y precios
  const opcionesVaso = [
    { ml: 350, precio: 2.50, label: '350 ml - $2.50' },
    { ml: 500, precio: 3.50, label: '500 ml - $3.50' },
    { ml: 1000, precio: 7.00, label: '1000 ml - $7.00' }
  ];

  // Métodos de pago
  const metodosPago = [
    { id: 'efectivo', nombre: 'Efectivo', icon: '💰' },
    { id: 'transferencia', nombre: 'Transferencia', icon: '🏦' }
  ];

  // Actualizar precio unitario basado en cantidad de vaso
  const handleVasoChange = (ml, precio) => {
    setItemActual({
      ...itemActual,
      cantidad_vaso: ml,
      precio_unitario: precio
    });
  };

  // Aumentar cantidad del item actual
  const aumentarCantidad = () => {
    setItemActual({
      ...itemActual,
      cantidad: itemActual.cantidad + 1
    });
  };

  // Disminuir cantidad del item actual
  const disminuirCantidad = () => {
    if (itemActual.cantidad > 1) {
      setItemActual({
        ...itemActual,
        cantidad: itemActual.cantidad - 1
      });
    }
  };

  // Agregar item al carrito
  const agregarAlCarrito = () => {
    if (!itemActual.tipo_cerveza) {
      setMensaje({ tipo: 'error', texto: '❌ Por favor selecciona un tipo de cerveza' });
      return;
    }

    if (!itemActual.cantidad_vaso) {
      setMensaje({ tipo: 'error', texto: '❌ Por favor selecciona el tamaño del vaso' });
      return;
    }

    const nuevoItem = {
      id: Date.now(),
      tipo_cerveza: itemActual.tipo_cerveza,
      tipo_nombre: tiposCerveza.find(t => t.id === itemActual.tipo_cerveza)?.nombre,
      cantidad_vaso: itemActual.cantidad_vaso,
      cantidad: itemActual.cantidad,
      precio_unitario: itemActual.precio_unitario,
      subtotal: itemActual.precio_unitario * itemActual.cantidad
    };

    setCarrito([...carrito, nuevoItem]);
    setMensaje({ tipo: 'exito', texto: '✅ Producto agregado al carrito' });

    // Limpiar selección actual pero mantener el tamaño por defecto
    setItemActual({
      tipo_cerveza: '',
      cantidad_vaso: '',
      cantidad: 1,
      precio_unitario: 0
    });

    // Limpiar mensaje después de 2 segundos
    setTimeout(() => {
      if (mensaje.tipo === 'exito') setMensaje({ tipo: '', texto: '' });
    }, 2000);
  };

  // Eliminar item del carrito
  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
    setMensaje({ tipo: 'exito', texto: '🗑️ Producto eliminado del carrito' });
    setTimeout(() => {
      if (mensaje.tipo === 'exito') setMensaje({ tipo: '', texto: '' });
    }, 1500);
  };

  // Vaciar carrito completo
  const vaciarCarrito = () => {
    if (carrito.length === 0) return;
    if (confirm('¿Estás seguro de que deseas vaciar todo el carrito?')) {
      setCarrito([]);
      setMensaje({ tipo: 'exito', texto: '🗑️ Carrito vaciado' });
      setTimeout(() => {
        if (mensaje.tipo === 'exito') setMensaje({ tipo: '', texto: '' });
      }, 1500);
    }
  };

  // Registrar venta completa
  const registrarVenta = async () => {
    if (!user) {
      setMensaje({ tipo: 'error', texto: '❌ Debes iniciar sesión' });
      return;
    }

    if (carrito.length === 0) {
      setMensaje({ tipo: 'error', texto: '❌ El carrito está vacío. Agrega productos primero.' });
      return;
    }

    if (!metodoPago) {
      setMensaje({ tipo: 'error', texto: '❌ Por favor selecciona un método de pago' });
      return;
    }

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    const getFechaEcuador = () => {
      const ahora = new Date();
      const offsetEcuador = -5 * 60;
      const fechaUTC = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
      const fechaEcuador = new Date(fechaUTC + (offsetEcuador * 60000));
      return fechaEcuador.toISOString();
    };

    try {
      // Crear un registro por cada producto en el carrito
      const ventasData = carrito.map(item => ({
        user_id: user.id,
        tipo_cerveza: item.tipo_cerveza,
        cantidad_vaso: item.cantidad_vaso,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        metodo_pago: metodoPago,
        fecha: getFechaEcuador(),
        cantidad_total_negra: item.tipo_cerveza === 'Negra' ? item.cantidad : 0,
        cantidad_total_rubia: item.tipo_cerveza === 'Rubia' ? item.cantidad : 0,
        cantidad_total_roja: item.tipo_cerveza === 'Roja' ? item.cantidad : 0
      }));

      const { error } = await supabase
        .from('ventas')
        .insert(ventasData);

      if (error) throw error;

      setMensaje({
        tipo: 'exito',
        texto: `✅ Venta registrada exitosamente! Total: $${totalCarrito.toFixed(2)} USD`
      });

      // Limpiar carrito
      setCarrito([]);
      setMetodoPago('efectivo');

    } catch (error) {
      console.error('Error:', error);
      setMensaje({
        tipo: 'error',
        texto: `❌ Error al registrar venta: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (


    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header con logo */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Image
              src="/logo5.png"
              alt="Logo Cervecería"
              width={750}
              height={150}
              style={styles.logo}
              priority
              loading="eager"
              suppressHydrationWarning
            />
          </div>
        </div>

        {user && (
          <div style={styles.userInfo}>
            👤 Usuario: {user.email}
          </div>
        )}

        {mensaje.texto && (
          <div style={{
            ...styles.mensaje,
            backgroundColor: mensaje.tipo === 'exito' ? '#d4edda' : '#f8d7da',
            color: mensaje.tipo === 'exito' ? '#155724' : '#721c24',
            borderColor: mensaje.tipo === 'exito' ? '#c3e6cb' : '#f5c6cb'
          }}>
            {mensaje.texto}
          </div>
        )}

        {/* Sección para agregar productos */}
        <div style={styles.seccionAgregar}>
          <h3 style={styles.seccionTitulo}>➕ Seleciona tu cerveza</h3>

          <div style={styles.formGroup}>
            <label style={styles.label}>🍺 Tipo de Cerveza</label>
            <div style={styles.buttonGroup}>
              {tiposCerveza.map((tipo) => (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => setItemActual({ ...itemActual, tipo_cerveza: tipo.id })}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: itemActual.tipo_cerveza === tipo.id ? tipo.color : '#f0f0f0',
                    color: itemActual.tipo_cerveza === tipo.id ? 'white' : '#333',
                    borderColor: tipo.color
                  }}
                >
                  {tipo.nombre}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>🥤 Tamaño del Vaso</label>
            <div style={styles.buttonGroup}>
              {opcionesVaso.map((opcion) => (
                <button
                  key={opcion.ml}
                  type="button"
                  onClick={() => handleVasoChange(opcion.ml, opcion.precio)}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: itemActual.cantidad_vaso === opcion.ml ? '#4CAF50' : '#f0f0f0',
                    color: itemActual.cantidad_vaso === opcion.ml ? 'white' : '#333'
                  }}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>
          {/* Método de Pago */}
          <div style={styles.formGroup}>
            <label style={styles.label}>💳 Método de Pago</label>
            <div style={styles.buttonGroup}>
              {metodosPago.map((metodo) => (
                <button
                  key={metodo.id}
                  type="button"
                  onClick={() => setMetodoPago(metodo.id)}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: metodoPago === metodo.id ? '#2196F3' : '#f0f0f0',
                    color: metodoPago === metodo.id ? 'white' : '#333'
                  }}
                >
                  {metodo.icon} {metodo.nombre}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>🔢 Cantidad</label>
            <div style={styles.cantidadContainer}>
              <button
                type="button"
                onClick={disminuirCantidad}
                style={styles.cantidadButton}
                disabled={itemActual.cantidad <= 1}
              >
                ➖
              </button>
              <div style={styles.cantidadDisplay}>
                <span style={styles.cantidadNumero}>{itemActual.cantidad}</span>
                <span style={styles.cantidadTexto}>unidades</span>
              </div>
              <button
                type="button"
                onClick={aumentarCantidad}
                style={styles.cantidadButton}
              >
                ➕
              </button>
            </div>
          </div>

          {itemActual.precio_unitario > 0 && (
            <div style={styles.precioItemBoxMinimal}>
              <div style={styles.precioItemCard}>
                <div style={styles.precioItemCardHeader}>
                  <span style={styles.precioItemCardTitle}>📋 Resumen del producto</span>
                </div>
                <div style={styles.precioItemCardBody}>
                  <div style={styles.precioItemRow}>
                    <div style={styles.precioItemRowLeft}>
                      <span style={styles.precioItemRowLabel}>Precio unitario</span>
                      <span style={styles.precioItemRowValue}>${itemActual.precio_unitario.toFixed(2)}</span>
                    </div>
                    <div style={styles.precioItemRowCenter}>
                      <span style={styles.precioItemRowLabel}>Cantidad</span>
                      <span style={styles.precioItemRowValue}>{itemActual.cantidad}</span>
                    </div>
                    <div style={styles.precioItemRowRight}>
                      <span style={styles.precioItemRowLabel}>Subtotal</span>
                      <span style={styles.precioItemRowTotal}>${(itemActual.precio_unitario * itemActual.cantidad).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={agregarAlCarrito}
            style={styles.agregarButton}
          >
            ➕ Agregar 🍺
          </button>
        </div>

        {/* Carrito de compras */}
        <div style={styles.seccionCarrito}>
          <div style={styles.carritoHeader}>
            <h3 style={styles.seccionTitulo}>🛒 Carrito Cervecero 🍺</h3>
            {carrito.length > 0 && (
              <button onClick={vaciarCarrito} style={styles.vaciarButton}>
                🗑️ Vaciar
              </button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div style={styles.carritoVacio}>
              🍺 El carrito está vacío. Agrega cerveza.
            </div>
          ) : (
            <>
              <div style={styles.tableContainer}>
                <table style={styles.carritoTable}>
                  <thead>
                    <tr>
                      <th style={styles.thProducto}>Producto</th>
                      <th style={styles.thTamanio}>Tamaño</th>
                      <th style={styles.thCantidad}>Cantidad</th>
                      <th style={styles.thPrecio}>Precio Unit.</th>
                      <th style={styles.thSubtotal}>Subtotal</th>
                      <th style={styles.thAcciones}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrito.map((item) => (
                      <tr key={item.id} style={styles.trBody}>
                        <td style={styles.tdProducto}>{item.tipo_nombre}</td>
                        <td style={styles.tdTamanio}>{item.cantidad_vaso} ml</td>
                        <td style={styles.tdCantidad}>{item.cantidad}</td>
                        <td style={styles.tdPrecio}>${item.precio_unitario.toFixed(2)}</td>
                        <td style={styles.tdSubtotal}>${item.subtotal.toFixed(2)}</td>
                        <td style={styles.tdAcciones}>
                          <button
                            onClick={() => eliminarDelCarrito(item.id)}
                            style={styles.eliminarItemButton}
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.totalCarrito}>
                <span style={styles.totalLabel}>Total del pedido:</span>
                <span style={styles.totalValor}>${totalCarrito.toFixed(2)} USD</span>
              </div>
            </>
          )}
        </div>
        {/* Botón registrar venta */}
        <button
          onClick={registrarVenta}
          style={styles.registrarButton}
          disabled={loading || carrito.length === 0}
        >
          {loading ? 'Registrando...' : `✅ Registrar Venta - Total: $${totalCarrito.toFixed(2)}`}
        </button>
        <div style={styles.headerButtons}>
          <button
            onClick={() => router.push('/detalles')}
            style={styles.detallesButton}
          >
            📊 Ver Detalles
          </button>
        </div>
      </div>
    </div>


  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ece5e5de',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    maxWidth: '800px',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // 95% opaco
    border: '1px solid rgba(255, 193, 7, 0.3)', // dorado sutil
    borderRadius: '20px',
    padding: '35px',
    color: '#f5e6c8', // tono crema tipo espuma
    boxShadow: '0 10px 25px rgba(0,0,0,0.6)',

    // efecto tipo vidrio / premium
    backdropFilter: 'blur(8px)',

    // detalle llamativo
    position: 'relative',
    overflow: 'hidden',

    // efecto glow sutil dorado
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(255,193,7,0.15), transparent 70%)',
      transform: 'rotate(25deg)',
    }
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 0,
    fontSize: '28px'
  },
  userInfo: {
    backgroundColor: '#e3f2fd',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#1976d2'
  },
  seccionAgregar: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '25px',
    border: '1px solid #e0e0e0'
  },
  seccionCarrito: {
    marginBottom: '25px'
  },
  seccionTitulo: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px'
  },
  carritoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: 'bold',
    color: '#555',
    fontSize: '16px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  optionButton: {
    flex: 1,
    padding: '12px 20px',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontWeight: '500'
  },
  cantidadContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0'
  },
  cantidadButton: {
    width: '48px',
    height: '48px',
    fontSize: '24px',
    fontWeight: 'bold',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cantidadDisplay: {
    textAlign: 'center',
    minWidth: '100px'
  },
  cantidadNumero: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#0f0f0f',
    display: 'block'
  },
  cantidadTexto: {
    fontSize: '14px',
    color: '#0a0a0a'
  },
  precioItemBox: {
    backgroundColor: '#fafafa',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  subtotalItem: {
    fontWeight: 'bold',
    color: '#2e7d32'
  },
  agregarButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  vaciarButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  carritoVacio: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    backgroundColor: '#fafafa',
    borderRadius: '8px'
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '15px'
  },
  carritoTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  subtotalCell: {
    fontWeight: 'bold',
    color: '#2e7d32'
  },
  eliminarItemButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '5px',
    borderRadius: '5px',
    transition: 'background-color 0.3s'
  },
  totalCarrito: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#e8f5e9',
    borderRadius: '8px',
    marginTop: '10px',
    border: '1px solid #4CAF50'
  },
  totalLabel: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2e7d32',
    letterSpacing: '1px'
  },
  totalValor: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#0c0c0b',
    letterSpacing: '1px',
    padding: '5px 15px',
    borderRadius: '8px'
  },
  registrarButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    marginTop: '10px'
  },
  detallesButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    marginTop: '10px'
  },
  mensaje: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid'
  },
  carritoTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },

  // Estilos para los encabezados (th)
  thProducto: {
    backgroundColor: '#4CAF50', // Marrón
    color: '#ffffff', // Blanco
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '2px solid #4CAF50'
  },

  thTamanio: {
    backgroundColor: '#4CAF50',
    color: '#ffffff',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '2px solid #4CAF50'
  },

  thCantidad: {
    backgroundColor: '#4CAF50',
    color: '#ffffff',
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '2px solid #4CAF50'
  },

  thPrecio: {
    backgroundColor: '#4CAF50',
    color: '#ffffff',
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '2px solid #4CAF50'
  },

  thSubtotal: {
    backgroundColor: '#4CAF50',
    color: '#ffffff',
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '2px solid #4CAF50'
  },

  thAcciones: {
    backgroundColor: '#4CAF50',
    color: '#ffffff',
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '2px solid #4CAF50',
    width: '60px'
  },

  // Estilos para las filas del cuerpo (td)
  trBody: {
    borderBottom: '1px solid #e0e0e0',
    transition: 'background-color 0.3s'
  },

  // Producto - Color marrón
  tdProducto: {
    padding: '12px',
    color: '#2e2d2d', // Marrón
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '1px solid #e0e0e0'
  },

  // Tamaño - Color gris
  tdTamanio: {
    padding: '12px',
    color: '#2e2d2d', // Gris
    fontStyle: 'italic',
    fontSize: '14px',
    borderBottom: '1px solid #e0e0e0'
  },

  // Cantidad - Color azul
  tdCantidad: {
    padding: '12px',
    color: '#2196F3', // Azul
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '14px',
    borderBottom: '1px solid #e0e0e0'
  },

  // Precio Unitario - Color verde
  tdPrecio: {
    padding: '12px',
    color: '#4CAF50', // Verde
    fontWeight: '500',
    textAlign: 'center',
    fontSize: '14px',
    borderBottom: '1px solid #e0e0e0'
  },

  // Subtotal - Color naranja con fondo
  tdSubtotal: {
    padding: '12px',
    color: '#2e2d2d', // Naranja
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '16px',
    borderBottom: '1px solid #e0e0e0'
  },

  // Acciones - Botón eliminar
  tdAcciones: {
    padding: '12px',
    textAlign: 'center',
    borderBottom: '1px solid #e0e0e0'
  },

  eliminarItemButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '5px 8px',
    borderRadius: '5px',
    transition: 'all 0.3s',
    color: '#dc3545' // Rojo
  },
  precioItemBoxMinimal: {
    marginBottom: '20px'
  },

  precioItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },

  precioItemCardHeader: {
    backgroundColor: '#4CAF50',
    padding: '10px 15px',
    textAlign: 'center'
  },

  precioItemCardTitle: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '1px'
  },

  precioItemCardBody: {
    padding: '15px'
  },

  precioItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px'
  },

  precioItemRowLeft: {
    flex: 1,
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },

  precioItemRowCenter: {
    flex: 1,
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },

  precioItemRowRight: {
    flex: 1,
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#e8f5e9',
    borderRadius: '8px',
    border: '1px solid #0a0a0a'
  },

  precioItemRowLabel: {
    fontSize: '11px',
    color: '#666',
    display: 'block',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },

  precioItemRowValue: {
    fontSize: '18px',
    color: '#333',
    fontWeight: 'bold',
    display: 'block'
  },

  precioItemRowTotal: {
    fontSize: '22px',
    color: '#0f0f0f',
    fontWeight: 'bold',
    display: 'block'
  },

  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    //boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  logo: {
    borderRadius: '10px',
    objectFit: 'contain'
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 0,
    fontSize: '28px'
  },

};

// Agregar estilos globales para la tabla
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    .carritoTable th {
      background-color: #030507;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #dee2e6;
    }
    .carritoTable td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .carritoTable tr:hover {
      background-color: #0b0d0f;
    }
    .eliminarItemButton:hover {
      background-color: #ffebee;
    }
    .agregarButton:hover, .registrarButton:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(styleSheet);
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function VentasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userNombre, setUserNombre] = useState('');
  const [userRol, setUserRol] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [itemActual, setItemActual] = useState({
    tipo_cerveza: '',
    presentacion: '',
    cantidad: 1,
    precio_unitario: 0
  });

  const [totalCarrito, setTotalCarrito] = useState(0);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [comentarioGeneral, setComentarioGeneral] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Verificar autenticación y obtener datos del usuario
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUser(user);

        const { data: perfil, error } = await supabase
          .from('perfiles')
          .select('nombre, rol')
          .eq('id', user.id)
          .single();

        if (perfil) {
          setUserNombre(perfil.nombre || 'Usuario');
          setUserRol(perfil.rol || 'vendedor');
          console.log('✅ Perfil cargado:', perfil);
        }
        else if (error?.code === 'PGRST116') {
          console.log('Perfil no existe, creando...');
          const nombreDefault = user.user_metadata?.nombre
            || user.user_metadata?.full_name
            || user.email?.split('@')[0]
            || 'Vendedor';

          const { error: insertError } = await supabase
            .from('perfiles')
            .insert({
              id: user.id,
              nombre: nombreDefault,
              rol: 'vendedor'
            });

          if (insertError) {
            console.error('Error al crear perfil:', insertError);
            setUserNombre(nombreDefault);
            setUserRol('vendedor');
          } else {
            const { data: nuevoPerfil } = await supabase
              .from('perfiles')
              .select('nombre, rol')
              .eq('id', user.id)
              .single();

            if (nuevoPerfil) {
              setUserNombre(nuevoPerfil.nombre);
              setUserRol(nuevoPerfil.rol);
            }
          }
        }
        else {
          console.error('Error al obtener perfil:', error);
          const nombreFallback = user.user_metadata?.nombre
            || user.email?.split('@')[0]
            || 'Usuario';
          setUserNombre(nombreFallback);
          setUserRol('vendedor');
        }
      } catch (err) {
        console.error('Error en checkAuth:', err);
        setUserNombre('Usuario');
        setUserRol('vendedor');
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  useEffect(() => {
    const nuevoTotal = carrito.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);
    setTotalCarrito(nuevoTotal);
  }, [carrito]);

  // Tipos de cerveza para el select
  const tiposCerveza = [
    { id: 'Negra', nombre: 'Cerveza Negra', color: '#270f00' },
    { id: 'Rubia', nombre: 'Cerveza Rubia', color: '#F4A460' },
    { id: 'Hidromiel', nombre: 'Hidromiel', color: '#ecddd1' },
    { id: 'Michelada', nombre: 'Michelada', color: '#ecddd1' },
    { id: 'Roja', nombre: 'Cerveza Roja', color: '#CD5C5C' }
  ];

  // Opciones de presentación: Vaso 500ml - $4.00, Botella 420ml - $5.00
  const opcionesPresentacion = [
    { id: 'Vaso 500 ml', precio: 4.00, label: '🍺 Vaso 500 ml - $4.00' },
    { id: 'Botella 420 ml', precio: 5.00, label: '🍾 Botella 420 ml - $5.00' }
  ];

  const metodosPago = [
    { id: 'efectivo', nombre: 'Efectivo', icon: '💰' },
    { id: 'transferencia', nombre: 'Transferencia', icon: '🏦' }
  ];

  const handlePresentacionChange = (id, precio) => {
    setItemActual({
      ...itemActual,
      presentacion: id,
      precio_unitario: precio
    });
  };

  const aumentarCantidad = () => {
    setItemActual({
      ...itemActual,
      cantidad: itemActual.cantidad + 1
    });
  };

  const disminuirCantidad = () => {
    if (itemActual.cantidad > 1) {
      setItemActual({
        ...itemActual,
        cantidad: itemActual.cantidad - 1
      });
    }
  };

  const agregarAlCarrito = () => {
    if (!itemActual.tipo_cerveza) {
      setMensaje({ tipo: 'error', texto: '❌ Por favor selecciona un tipo de cerveza' });
      return;
    }

    if (!itemActual.presentacion) {
      setMensaje({ tipo: 'error', texto: '❌ Por favor selecciona la presentación' });
      return;
    }

    const nuevoItem = {
      id: Date.now(),
      tipo_cerveza: itemActual.tipo_cerveza,
      tipo_nombre: tiposCerveza.find(t => t.id === itemActual.tipo_cerveza)?.nombre,
      presentacion: itemActual.presentacion,
      cantidad: itemActual.cantidad,
      precio_unitario: itemActual.precio_unitario,
      subtotal: itemActual.precio_unitario * itemActual.cantidad
    };

    setCarrito([...carrito, nuevoItem]);
    setMensaje({ tipo: 'exito', texto: '✅ Producto agregado al carrito' });

    setItemActual({
      tipo_cerveza: '',
      presentacion: '',
      cantidad: 1,
      precio_unitario: 0
    });

    setTimeout(() => {
      if (mensaje.tipo === 'exito') setMensaje({ tipo: '', texto: '' });
    }, 2000);
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
    setMensaje({ tipo: 'exito', texto: '🗑️ Producto eliminado del carrito' });
    setTimeout(() => {
      if (mensaje.tipo === 'exito') setMensaje({ tipo: '', texto: '' });
    }, 1500);
  };

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
      const ventasData = carrito.map(item => ({
        user_id: user.id,
        vendedor_nombre: userNombre,
        tipo_cerveza: item.tipo_cerveza,
        presentacion: item.presentacion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        metodo_pago: metodoPago,
        fecha: getFechaEcuador(),
        comentario: comentarioGeneral.trim() || null
      }));

      console.log('📝 Datos a insertar:', JSON.stringify(ventasData, null, 2));

      const { data, error } = await supabase
        .from('ventas')
        .insert(ventasData)
        .select();

      if (error) {
        console.error('❌ Error de Supabase:', error);
        throw error;
      }

      console.log('✅ Venta insertada:', data);

      setMensaje({
        tipo: 'exito',
        texto: `✅ Venta registrada exitosamente! Vendedor: ${userNombre} - Total: $${totalCarrito.toFixed(2)} USD`
      });

      setCarrito([]);
      setMetodoPago('efectivo');
      setComentarioGeneral('');

    } catch (error) {
      console.error('❌ Error completo:', error);
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
        <div style={styles.headerUsuario}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {userNombre ? userNombre.charAt(0).toUpperCase() : '?'}
            </div>
            <div style={styles.userDetails}>
              <span style={styles.userName}>{userNombre || 'Cargando...'}</span>
              <span style={styles.userRole}>
                {userRol === 'admin' ? 'Administrador' :
                  userRol === 'supervisor' ? 'Supervisor' : 'Vendedor'}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton} title="Cerrar sesión">
            🚪 Cerrar Sesión
          </button>
        </div>

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

        <div style={styles.contenedorUnico}>
          <h3 style={styles.seccionTitulo}>🍺 SHITAKE`N BEER🍺</h3>

          {/* Tipo de Cerveza como menú desplegable */}
          <div style={styles.formGroup}>
            <label style={styles.label}>🍺 Tipo de Cerveza</label>
            <div style={styles.selectWrapper}>
              <select
                value={itemActual.tipo_cerveza}
                onChange={(e) => {
                  setItemActual({ 
                    ...itemActual, 
                    tipo_cerveza: e.target.value 
                  });
                }}
                style={styles.selectInput}
                required
              >
                <option value="" disabled>Selecciona un tipo de cerveza</option>
                {tiposCerveza.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
              <div style={styles.selectArrow}>▼</div>
            </div>
          </div>

          {/* Presentación - Vaso o Botella */}
          <div style={styles.formGroup}>
            <label style={styles.label}>🍾 Presentación</label>
            <div style={styles.buttonGroup}>
              {opcionesPresentacion.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => handlePresentacionChange(opcion.id, opcion.precio)}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: itemActual.presentacion === opcion.id ? '#4CAF50' : '#f0f0f0',
                    color: itemActual.presentacion === opcion.id ? 'white' : '#333'
                  }}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>

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

          <div style={styles.formGroup}>
            <label style={styles.label}>💬 Comentario (Opcional)</label>
            <textarea
              value={comentarioGeneral}
              onChange={(e) => setComentarioGeneral(e.target.value)}
              placeholder="Ej: Cliente especial, entrega a domicilio, nota importante, etc."
              style={styles.comentarioInput}
              rows="3"
            />
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

          <button onClick={agregarAlCarrito} style={styles.agregarButton}>
            ➕ Agregar 🍺
          </button>

          <div style={styles.carritoWrapper}>
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
                        <th style={styles.thPresentacion}>Presentación</th>
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
                          <td style={styles.tdPresentacion}>{item.presentacion}</td>
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

                {comentarioGeneral && (
                  <div style={styles.comentarioPreview}>
                    <strong>💬 Comentario del pedido:</strong> {comentarioGeneral}
                  </div>
                )}
              </>
            )}
          </div>

          <button
            onClick={registrarVenta}
            style={styles.registrarButton}
            disabled={loading || carrito.length === 0}
          >
            {loading ? 'Registrando...' : `✅ Registrar Venta - Total: $${totalCarrito.toFixed(2)}`}
          </button>

          <button onClick={() => router.push('/detalles')} style={styles.detallesButton}>
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
    backgroundImage: 'url("/logo1.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    maxWidth: '800px',
    width: '100%',
    backgroundColor: 'rgba(236, 228, 228, 0.65)',
    border: '1px solid rgba(255, 193, 7, 0.3)',
    borderRadius: '20px',
    padding: '35px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(5px)',
    position: 'relative',
    overflow: 'hidden'
  },
  headerUsuario: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(0,0,0,0.1)'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userAvatar: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: '#8B4513',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  userName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333'
  },
  userEmail: {
    fontSize: '11px',
    color: '#888',
    marginTop: '2px'
  },
  userRole: {
    fontSize: '15px',
    color: '#020202',
    marginTop: '2px',
    fontWeight: '500'
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s'
  },
  contenedorUnico: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    width: '100%'
  },
  seccionTitulo: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#080808',
    marginBottom: '5px',
    textAlign: 'center'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: 'bold',
    color: '#0a0a0a',
    fontSize: '20px'
  },
  selectWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px'
  },
  selectInput: {
    width: '100%',
    padding: '14px 20px',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    backgroundColor: 'white',
    color: '#333',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit'
  },
  selectArrow: {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    color: '#4CAF50',
    pointerEvents: 'none'
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
    gap: '10px',
    backgroundColor: 'white',
    padding: '5px',
    borderRadius: '12px',
    border: '1px solid #cac5c5'
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
  comentarioInput: {
    width: '50%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    backgroundColor: 'white'
  },
  comentarioPreview: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#fff3e0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#e65100',
    borderLeft: '4px solid #ff9800'
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
    transition: 'background-color 0.3s',
    marginBottom: '20px'
  },
  carritoWrapper: {
    width: '100%'
  },
  carritoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
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
    marginBottom: '20px',
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
    marginBottom: '10px'
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
    transition: 'background-color 0.3s'
  },
  mensaje: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid'
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
  thProducto: {
    backgroundColor: '#4CAF50',
    color: '#ffffff',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '2px solid #4CAF50'
  },
  thPresentacion: {
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
  trBody: {
    borderBottom: '1px solid #e0e0e0',
    transition: 'background-color 0.3s'
  },
  tdProducto: {
    padding: '12px',
    color: '#2e2d2d',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '1px solid #e0e0e0'
  },
  tdPresentacion: {
    padding: '12px',
    color: '#2e2d2d',
    fontStyle: 'italic',
    fontSize: '14px',
    borderBottom: '1px solid #e0e0e0'
  },
  tdCantidad: {
    padding: '12px',
    color: '#2196F3',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '14px',
    borderBottom: '1px solid #e0e0e0'
  },
  tdPrecio: {
    padding: '12px',
    color: '#4CAF50',
    fontWeight: '500',
    textAlign: 'center',
    fontSize: '14px',
    borderBottom: '1px solid #e0e0e0'
  },
  tdSubtotal: {
    padding: '12px',
    color: '#2e2d2d',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '16px',
    borderBottom: '1px solid #e0e0e0'
  },
  tdAcciones: {
    padding: '12px',
    textAlign: 'center',
    borderBottom: '1px solid #e0e0e0'
  }
};

// Agregar estilos globales
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
    .logoutButton:hover {
      background-color: #c82333;
      transform: translateY(-1px);
    }
    textarea:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
    }
    .selectInput:focus {
      outline: none;
      border-color: #2196F3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
    }
    .selectInput:hover {
      border-color: #2196F3;
    }
    .selectWrapper {
      position: relative;
    }
  `;
  document.head.appendChild(styleSheet);
}

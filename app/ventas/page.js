'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function VentasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    tipo_cerveza: '',
    cantidad_vaso: '',
    cantidad: 0,
    metodo_pago: ''
  });
  
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Verificar autenticación y usuario
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

  // Tipos de cerveza
  const tiposCerveza = [
    { id: 'Negra', nombre: 'Cerveza Negra', color: '#8B4513' },
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
    setPrecioUnitario(precio);
    setFormData({ ...formData, cantidad_vaso: ml });
    const nuevoTotal = precio * formData.cantidad;
    setTotal(nuevoTotal);
  };

  // Aumentar cantidad
  const aumentarCantidad = () => {
    const nuevaCantidad = formData.cantidad + 1;
    setFormData({ ...formData, cantidad: nuevaCantidad });
    const nuevoTotal = precioUnitario * nuevaCantidad;
    setTotal(nuevoTotal);
  };

  // Disminuir cantidad (mínimo 1)
  const disminuirCantidad = () => {
    if (formData.cantidad > 1) {
      const nuevaCantidad = formData.cantidad - 1;
      setFormData({ ...formData, cantidad: nuevaCantidad });
      const nuevoTotal = precioUnitario * nuevaCantidad;
      setTotal(nuevoTotal);
    }
  };

  // Limpiar todo el formulario
  const limpiarFormulario = () => {
    if (confirm('¿Estás seguro de que deseas limpiar todo el formulario? Se perderán los datos no guardados.')) {
      setFormData({
        tipo_cerveza: '',
        cantidad_vaso: '',
        cantidad: 0,
        metodo_pago: ''
      });
      setPrecioUnitario(0);
      setTotal(0);
      setMensaje({ tipo: '', texto: '' });
    }
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setMensaje({ tipo: 'error', texto: '❌ Debes iniciar sesión' });
      return;
    }

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    if (!formData.tipo_cerveza) {
      setMensaje({ tipo: 'error', texto: '❌ Por favor selecciona un tipo de cerveza' });
      setLoading(false);
      return;
    }

    if (!formData.cantidad_vaso) {
      setMensaje({ tipo: 'error', texto: '❌ Por favor selecciona el tamaño del vaso' });
      setLoading(false);
      return;
    }

    const getFechaEcuador = () => {
      const ahora = new Date();
      const offsetEcuador = -5 * 60;
      const fechaUTC = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
      const fechaEcuador = new Date(fechaUTC + (offsetEcuador * 60000));
      return fechaEcuador.toISOString();
    };

    try {
      const ventaData = {
        user_id: user.id,
        tipo_cerveza: formData.tipo_cerveza,
        cantidad_vaso: formData.cantidad_vaso,
        cantidad: formData.cantidad,
        precio_unitario: precioUnitario,
        metodo_pago: formData.metodo_pago,
        fecha: getFechaEcuador(),
        cantidad_total_negra: formData.tipo_cerveza === 'Negra' ? formData.cantidad : 0,
        cantidad_total_rubia: formData.tipo_cerveza === 'Rubia' ? formData.cantidad : 0,
        cantidad_total_roja: formData.tipo_cerveza === 'Roja' ? formData.cantidad : 0
      };

      const { error } = await supabase
        .from('ventas')
        .insert([ventaData]);

      if (error) throw error;

      setMensaje({ 
        tipo: 'exito', 
        texto: `✅ Venta registrada exitosamente! Total: $${total.toFixed(2)} USD` 
      });
      
      setFormData({
        tipo_cerveza: '',
        cantidad_vaso: '',
        cantidad: 0,
        metodo_pago: ''
      });
      setPrecioUnitario(0);
      setTotal(0);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={styles.title}>🍺 BEER 🍺</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={limpiarFormulario} 
              style={styles.limpiarButton}
              title="Limpiar todo el formulario"
            >
              🗑️ Limpiar
            </button>
            <button 
              onClick={() => router.push('/detalles')} 
              style={styles.detallesButton}
            >
              📊 Ver Detalles
            </button>
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

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>🍺 Tipo de Cerveza</label>
            <div style={styles.buttonGroup}>
              {tiposCerveza.map((tipo) => (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo_cerveza: tipo.id })}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: formData.tipo_cerveza === tipo.id ? tipo.color : '#f0f0f0',
                    color: formData.tipo_cerveza === tipo.id ? 'white' : '#333',
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
                    backgroundColor: formData.cantidad_vaso === opcion.ml ? '#4CAF50' : '#f0f0f0',
                    color: formData.cantidad_vaso === opcion.ml ? 'white' : '#333'
                  }}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>🔢 Cantidad de unidades</label>
            <div style={styles.cantidadContainer}>
              <button
                type="button"
                onClick={disminuirCantidad}
                style={styles.cantidadButton}
                disabled={formData.cantidad <= 1}
              >
                ➖
              </button>
              <div style={styles.cantidadDisplay}>
                <span style={styles.cantidadNumero}>{formData.cantidad}</span>
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

          {precioUnitario > 0 && (
            <div style={styles.precioBox}>
              <div>
                <span style={styles.precioLabel}>💰 Precio unitario:</span>
                <span style={styles.precioValor}>${precioUnitario.toFixed(2)} USD</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <span style={styles.precioLabel}>💵 Total a pagar:</span>
                <span style={styles.totalValor}>${total.toFixed(2)} USD</span>
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>💳 Método de Pago</label>
            <div style={styles.buttonGroup}>
              {metodosPago.map((metodo) => (
                <button
                  key={metodo.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, metodo_pago: metodo.id })}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: formData.metodo_pago === metodo.id ? '#2196F3' : '#f0f0f0',
                    color: formData.metodo_pago === metodo.id ? 'white' : '#333'
                  }}
                >
                  {metodo.icon} {metodo.nombre}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.botonesContainer}>
            <button 
              type="submit" 
              style={styles.submitButton}
              disabled={loading || !user}
            >
              {loading ? 'Registrando...' : '✅ Registrar Venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
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
  formGroup: {
    marginBottom: '25px'
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
    backgroundColor: '#f8f9fa',
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
    color: '#333',
    display: 'block'
  },
  cantidadTexto: {
    fontSize: '14px',
    color: '#666'
  },
  precioBox: {
    backgroundColor: '#e8f5e9',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '25px',
    border: '1px solid #c8e6c9'
  },
  precioLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2e7d32'
  },
  precioValor: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2e7d32',
    marginLeft: '10px'
  },
  totalValor: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1b5e20',
    marginLeft: '10px'
  },
  botonesContainer: {
    display: 'flex',
    gap: '10px'
  },
  submitButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  detallesButton: {
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  limpiarButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  mensaje: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid'
  }
};

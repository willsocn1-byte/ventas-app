'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function VentasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    tipo_cerveza: '',
    cantidad_vaso: 350,
    cantidad: 1,
    metodo_pago: 'efectivo'
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

  // Actualizar cantidad y recalcular total
  const handleCantidadChange = (cantidad) => {
    setFormData({ ...formData, cantidad });
    const nuevoTotal = precioUnitario * cantidad;
    setTotal(nuevoTotal);
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
    // Convertir a UTC-5 (Ecuador)
    const offsetEcuador = -5 * 60; // -5 horas en minutos
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
        cantidad_vaso: 350,
        cantidad: 1,
        metodo_pago: 'efectivo'
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
         <h1 style={styles.title}>🍺 Sistema de Ventas</h1>
          <button 
            onClick={() => router.push('/detalles')} 
            style={styles.detallesButton}
          >
           📊 Ver Detalles
          </button>
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
            <input
              type="number"
              min="1"
              value={formData.cantidad}
              onChange={(e) => handleCantidadChange(parseInt(e.target.value) || 1)}
              style={styles.input}
              required
            />
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

          <button 
            type="submit" 
            style={styles.submitButton}
            disabled={loading || !user}
          >
            {loading ? 'Registrando...' : '✅ Registrar Venta'}
          </button>
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
    marginBottom: '20px',
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
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box'
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
  submitButton: {
    width: '100%',
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
  mensaje: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid'
  }
  };